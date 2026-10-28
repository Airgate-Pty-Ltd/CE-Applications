import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SIGNATURE_STATEMENT,
  RecordIntegrityError,
  currentRevision,
  reviseRecord,
  revisionChain,
  sealRecord,
  verifyRecordIntegrity,
} from '../../src/engine/record.ts'
import { buildUnsealedRecord, makeSealedRecord } from '../../src/fixtures/records.ts'
import { INSPECTOR_ID, NOW, makeSession } from '../../src/fixtures/factory.ts'

describe('sealing a record', () => {
  it('hashes the content and verifies', () => {
    const record = makeSealedRecord()
    expect(record.contentHash).toHaveLength(64)
    expect(verifyRecordIntegrity(record).intact).toBe(true)
  })

  it('hashes identically regardless of the order fields were assembled in', () => {
    const body = buildUnsealedRecord(makeSession())
    const reordered = Object.fromEntries(
      Object.entries(body).reverse(),
    ) as unknown as typeof body
    expect(sealRecord(reordered).contentHash).toBe(sealRecord(body).contentHash)
  })

  it('refuses to seal a withheld approval with no reason', () => {
    const body = buildUnsealedRecord(makeSession({ approvalGranted: false, approvalWithheldReason: undefined }))
    expect(() => sealRecord({ ...body, approval: { granted: false, withheldReason: null } })).toThrow(
      RecordIntegrityError,
    )
    expect(() => sealRecord({ ...body, approval: { granted: false, withheldReason: '   ' } })).toThrow(
      RecordIntegrityError,
    )
  })

  it('refuses to seal without a signature statement', () => {
    const body = buildUnsealedRecord(makeSession())
    expect(() =>
      sealRecord({ ...body, signature: { ...body.signature, statement: '' } }),
    ).toThrow(RecordIntegrityError)
  })

  it('signs words that attest to what was done and assert nothing about a regulation', () => {
    expect(DEFAULT_SIGNATURE_STATEMENT).toContain('I made the determinations recorded above')
    expect(DEFAULT_SIGNATURE_STATEMENT).not.toMatch(/regulation|CFR|authority|requirement/i)
  })
})

describe('immutability', () => {
  it('throws on any attempt to mutate a sealed record', () => {
    const record = makeSealedRecord()
    expect(() => {
      ;(record as { recordId: string }).recordId = 'TAMPERED'
    }).toThrow(TypeError)
  })

  it('freezes the whole object graph, not only the top level', () => {
    const record = makeSealedRecord()
    expect(() => {
      ;(record.session as { sessionId: string }).sessionId = 'TAMPERED'
    }).toThrow(TypeError)
    expect(() => {
      record.session.executedChecks.push(record.session.executedChecks[0]!)
    }).toThrow(TypeError)
    expect(() => {
      ;(record.defensibility.elements[0] as { status: string }).status = 'PRESENT'
    }).toThrow(TypeError)
  })

  it('detects a record reconstructed with different content', () => {
    const record = makeSealedRecord()
    const tampered = { ...record, organisationDisplayName: 'Someone Else' }
    const check = verifyRecordIntegrity(tampered)
    expect(check.intact).toBe(false)
    expect(check.storedHash).not.toBe(check.recomputedHash)
  })
})

describe('revisions', () => {
  it('creates a new revision that names the record it supersedes, leaving the original intact', () => {
    const original = makeSealedRecord()
    const corrected = reviseRecord(original, {
      recordId: 'REC-0002',
      reason: 'Tool identifier transcribed incorrectly against the dimensional check.',
      signature: { personId: INSPECTOR_ID, signedAt: NOW, statement: DEFAULT_SIGNATURE_STATEMENT },
      changes: { organisationDisplayName: 'Example Inspecting Organisation' },
    })

    expect(corrected.revision).toBe(2)
    expect(corrected.supersedes).toBe(original.recordId)
    expect(corrected.supersededReason).toContain('transcribed incorrectly')
    expect(verifyRecordIntegrity(corrected).intact).toBe(true)

    // The original survives, still valid evidence of what was recorded at the time.
    expect(verifyRecordIntegrity(original).intact).toBe(true)
    expect(original.supersedes).toBeNull()
    expect(original.revision).toBe(1)
  })

  it('refuses a revision with no stated reason', () => {
    expect(() =>
      reviseRecord(makeSealedRecord(), {
        recordId: 'REC-0002',
        reason: ' ',
        signature: { personId: INSPECTOR_ID, signedAt: NOW, statement: DEFAULT_SIGNATURE_STATEMENT },
        changes: {},
      }),
    ).toThrow(RecordIntegrityError)
  })

  it('refuses to build a revision on top of a record whose hash does not verify', () => {
    const record = makeSealedRecord()
    const tampered = { ...record, organisationDisplayName: 'Someone Else' }
    expect(() =>
      reviseRecord(tampered, {
        recordId: 'REC-0002',
        reason: 'Correcting the organisation.',
        signature: { personId: INSPECTOR_ID, signedAt: NOW, statement: DEFAULT_SIGNATURE_STATEMENT },
        changes: {},
      }),
    ).toThrow(/content hash does not verify/)
  })

  it('orders a chain oldest-first and identifies the current revision', () => {
    const first = makeSealedRecord()
    const second = reviseRecord(first, {
      recordId: 'REC-0002',
      reason: 'First correction.',
      signature: { personId: INSPECTOR_ID, signedAt: NOW, statement: DEFAULT_SIGNATURE_STATEMENT },
      changes: {},
    })
    const third = reviseRecord(second, {
      recordId: 'REC-0003',
      reason: 'Second correction.',
      signature: { personId: INSPECTOR_ID, signedAt: NOW, statement: DEFAULT_SIGNATURE_STATEMENT },
      changes: {},
    })

    expect(revisionChain([third, first, second]).map((r) => r.recordId)).toEqual([
      'REC-0001',
      'REC-0002',
      'REC-0003',
    ])
    expect(currentRevision([third, first, second])?.recordId).toBe('REC-0003')
    expect(currentRevision([])).toBeNull()
    expect(third.supersedes).toBe('REC-0002')
  })
})
