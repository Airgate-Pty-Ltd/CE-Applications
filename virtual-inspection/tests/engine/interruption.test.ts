import { describe, expect, it } from 'vitest'
import {
  assessApprovalAvailability,
  outstandingAffectedChecks,
  recordInterruption,
  recordRecordingFailure,
  resolveInterruption,
} from '../../src/engine/interruption.ts'
import type { Interruption } from '../../src/schema/session.ts'
import { INSPECTOR_ID, NOW, makeExecutedCheck, makeRecording } from '../../src/fixtures/factory.ts'

const interruption = (affectedCheckIds: string[] = ['pc-dimensional']): Interruption => ({
  interruptionId: 'INT-0001',
  detectedAt: NOW,
  category: 'STREAM_FAILURE',
  reason: 'Stream lost.',
  affectedCheckIds,
})

const assess = (overrides: Partial<Parameters<typeof assessApprovalAvailability>[0]> = {}) =>
  assessApprovalAvailability({
    state: 'COMPLETED',
    interruptions: [],
    executedChecks: [],
    recording: makeRecording(),
    ...overrides,
  })

describe('approval availability', () => {
  it('is available for a completed session with a retained recording and no interruption', () => {
    expect(assess().approvalAvailable).toBe(true)
  })

  it('is unavailable while the session is interrupted', () => {
    const result = assess({ state: 'INTERRUPTED', interruptions: [interruption()] })
    expect(result.approvalAvailable).toBe(false)
    expect(result.outstandingCheckIds).toEqual(['pc-dimensional'])
  })

  it('is unavailable when an interruption has no recorded recovery path', () => {
    const result = assess({ interruptions: [interruption()] })
    expect(result.approvalAvailable).toBe(false)
    expect(result.reason).toContain('no recorded recovery path')
  })

  it('is unavailable after resuming until every affected check is re-verified', () => {
    const resolved = resolveInterruption({
      interruption: interruption(['pc-dimensional', 'pc-workmanship']),
      path: 'RESUME_AND_REVERIFY',
      rationale: 'Stream restored.',
      selectedByPersonId: INSPECTOR_ID,
      selectedAt: NOW,
    }).interruption

    const partly = assess({
      interruptions: [resolved],
      executedChecks: [
        { ...makeExecutedCheck('pc-dimensional'), reVerifiedAt: NOW },
        makeExecutedCheck('pc-workmanship'),
      ],
    })
    expect(partly.approvalAvailable).toBe(false)
    expect(partly.outstandingCheckIds).toEqual(['pc-workmanship'])

    const fully = assess({
      interruptions: [resolved],
      executedChecks: [
        { ...makeExecutedCheck('pc-dimensional'), reVerifiedAt: NOW },
        { ...makeExecutedCheck('pc-workmanship'), reVerifiedAt: NOW },
      ],
    })
    expect(fully.approvalAvailable).toBe(true)
  })

  it('treats an affected check that was never executed as outstanding', () => {
    expect(outstandingAffectedChecks([interruption(['pc-dimensional'])], [])).toEqual(['pc-dimensional'])
  })

  it('deduplicates and sorts affected checks across several interruptions', () => {
    expect(
      outstandingAffectedChecks(
        [interruption(['pc-workmanship', 'pc-dimensional']), interruption(['pc-dimensional'])],
        [],
      ),
    ).toEqual(['pc-dimensional', 'pc-workmanship'])
  })

  for (const [path, state] of [
    ['REPERFORM_SESSION', 'TERMINATED_REPERFORM'],
    ['ROUTE_FOR_PHYSICAL_INSPECTION', 'TERMINATED_PHYSICAL_INSPECTION'],
    ['DISPATCH_INSPECTOR', 'TERMINATED_INSPECTOR_DISPATCH'],
  ] as const) {
    it(`is permanently unavailable after recovery ${path}`, () => {
      const resolution = resolveInterruption({
        interruption: interruption(),
        path,
        rationale: 'Not recoverable within the window.',
        selectedByPersonId: INSPECTOR_ID,
        selectedAt: NOW,
      })
      expect(resolution.state).toBe(state)
      expect(resolution.approvalRecoverable).toBe(false)

      // Even with every check re-verified and a retained recording, a terminated
      // session cannot release the article.
      const result = assess({
        state: resolution.state,
        interruptions: [resolution.interruption],
        executedChecks: [{ ...makeExecutedCheck('pc-dimensional'), reVerifiedAt: NOW }],
      })
      expect(result.approvalAvailable).toBe(false)
      expect(result.reason).toContain('cannot be released from this session')
    })
  }

  it('is unavailable when recording failed, and says so before anything else', () => {
    const result = assess({
      state: 'RECORDING_FAILED',
      recording: makeRecording({ status: 'FAILED' }),
      interruptions: [interruption()],
    })
    expect(result.approvalAvailable).toBe(false)
    expect(result.reason).toContain('cannot stand as the sole conformity record')
  })

  it('is unavailable when the recording state is anything other than retained', () => {
    for (const status of ['NOT_STARTED', 'RECORDING'] as const) {
      const result = assess({ recording: makeRecording({ status }) })
      expect(result.approvalAvailable, status).toBe(false)
      expect(result.reason).toContain(status)
    }
  })
})

describe('recording an interruption', () => {
  it('moves the session to INTERRUPTED and invalidates the affected checks', () => {
    const result = recordInterruption({ state: 'ACTIVE', interruption: interruption(['b', 'a']) })
    expect(result.state).toBe('INTERRUPTED')
    expect(result.invalidatedCheckIds).toEqual(['a', 'b'])
  })

  it('does not soften a recording failure that already ended the session', () => {
    const result = recordInterruption({ state: 'RECORDING_FAILED', interruption: interruption() })
    expect(result.state).toBe('RECORDING_FAILED')
    expect(result.invalidatedCheckIds).toEqual([])
  })
})

describe('resolving an interruption', () => {
  it('refuses a recovery path with no rationale', () => {
    expect(() =>
      resolveInterruption({
        interruption: interruption(),
        path: 'REPERFORM_SESSION',
        rationale: '  ',
        selectedByPersonId: INSPECTOR_ID,
        selectedAt: NOW,
      }),
    ).toThrow(/rationale/)
  })

  it('records the path, rationale, who chose it and when', () => {
    const resolved = resolveInterruption({
      interruption: interruption(),
      path: 'RESUME_AND_REVERIFY',
      rationale: 'Stream restored within two minutes.',
      selectedByPersonId: INSPECTOR_ID,
      selectedAt: NOW,
    })
    expect(resolved.state).toBe('ACTIVE')
    expect(resolved.approvalRecoverable).toBe(true)
    expect(resolved.interruption.resolution).toEqual({
      path: 'RESUME_AND_REVERIFY',
      rationale: 'Stream restored within two minutes.',
      selectedByPersonId: INSPECTOR_ID,
      selectedAt: NOW,
    })
    expect(resolved.note).toContain('must be re-verified')
  })

  it('does not mutate the interruption it was given', () => {
    const original = interruption()
    resolveInterruption({
      interruption: original,
      path: 'REPERFORM_SESSION',
      rationale: 'Not recoverable.',
      selectedByPersonId: INSPECTOR_ID,
      selectedAt: NOW,
    })
    expect(original.resolution).toBeUndefined()
  })
})

describe('recording failure', () => {
  it('is terminal and carries the reason', () => {
    const result = recordRecordingFailure(makeRecording({ status: 'RECORDING' }), 'Storage write rejected.')
    expect(result.state).toBe('RECORDING_FAILED')
    expect(result.recording.status).toBe('FAILED')
    expect(result.recording.failureReason).toBe('Storage write rejected.')
  })
})
