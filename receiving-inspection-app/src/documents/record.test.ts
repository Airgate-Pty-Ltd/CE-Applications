import { describe, it, expect } from 'vitest';
import {
  createDraft,
  signRecord,
  reviseRecord,
  applyResult,
  verifyReproducible,
  recordMetadata,
  type InspectionRecord,
} from './record';
import { STANDARD_RECEIVING_PACK } from '../content/receiving-pack';
import { makeReceipt, TEST_SAMPLING_TABLE } from '../fixtures/receipts';
import type { CheckResult } from '../schema/check';

const pack = STANDARD_RECEIVING_PACK;
const table = TEST_SAMPLING_TABLE;
const SIGNED_AT = '2026-07-24T10:00:00.000Z';

function draftFor(receipt = makeReceipt({})) {
  return createDraft({ id: 'IR-1', receipt, pack, samplingTable: table });
}

function answerAll(record: InspectionRecord, value: CheckResult['value'] = 'pass') {
  let current = record;
  for (const checkId of record.requiredCheckIds) {
    const definition = pack.checks.find((c) => c.id === checkId);
    const outcome = applyResult(current, {
      checkId,
      value,
      evidenceRefs: definition?.evidenceRequired === true ? ['photo-1'] : [],
      toolId: definition?.requiresMeasurement === true ? 'TOOL-1' : null,
      note: null,
    });
    if (!outcome.ok) throw new Error(outcome.reasons.join('; '));
    current = outcome.record;
  }
  return {
    ...current,
    toolsUsed: current.results
      .filter((r) => r.toolId !== null)
      .map((r) => ({
        checkId: r.checkId,
        toolId: r.toolId as string,
        calibrationDueDate: '2026-12-31',
      })),
  };
}

const sign = (
  record: InspectionRecord,
  role: Parameters<typeof signRecord>[0]['role'] = 'inspector'
) =>
  signRecord({
    record,
    pack,
    samplingTable: table,
    signedBy: 'u1',
    signedByName: 'Inspector One',
    role,
    signedAt: SIGNED_AT,
  });

describe('draft creation', () => {
  it('emits the check set from the engine, not from a screen', () => {
    const draft = draftFor();
    expect(draft.requiredCheckIds.length).toBeGreaterThan(0);
    expect(draft.requiredCheckIds).toContain('PHY-FOD');
    /* PMA marking is not applicable to a standard article. */
    expect(draft.requiredCheckIds).not.toContain('DOC-PMA-MARKING');
  });

  it('emits a different set for a different receipt', () => {
    const pma = draftFor(makeReceipt({ articleClass: 'pma' }));
    expect(pma.requiredCheckIds).toContain('DOC-PMA-MARKING');
  });
});

describe('refusal to sign', () => {
  it('refuses with EVERY reason at once, not the first', () => {
    const result = sign(draftFor());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasons.some((r) => r.includes('Unanswered mandatory check'))).toBe(true);
  });

  it('refuses a read-only signer', () => {
    const result = sign(answerAll(draftFor()), 'read-only');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasons.some((r) => r.includes('read-only'))).toBe(true);
  });

  it('refuses when the documentation gate sent the receipt back', () => {
    const draft = draftFor(makeReceipt({ documentation: { complete: false } }));
    const result = sign(draft);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasons.some((r) => r.includes('routed back to receiving'))).toBe(true);
  });

  it('refuses when routing is blocked on unconfigured sampling', () => {
    const receipt = makeReceipt({
      documentation: { releaseDocument: 'certificate-of-conformance' },
    });
    const draft = createDraft({
      id: 'IR-2',
      receipt,
      pack,
      samplingTable: { ...table, configured: false, bands: [] },
    });
    const result = signRecord({
      record: draft,
      pack,
      samplingTable: { ...table, configured: false, bands: [] },
      signedBy: 'u1',
      signedByName: 'Inspector One',
      role: 'inspector',
      signedAt: SIGNED_AT,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasons.some((r) => r.includes('blocked'))).toBe(true);
  });

  it('refuses when required evidence is missing', () => {
    const draft = draftFor();
    let current = draft;
    for (const checkId of draft.requiredCheckIds) {
      const definition = pack.checks.find((c) => c.id === checkId);
      const outcome = applyResult(current, {
        checkId,
        value: 'pass',
        evidenceRefs: [],
        toolId: definition?.requiresMeasurement === true ? 'TOOL-1' : null,
        note: null,
      });
      if (outcome.ok) current = outcome.record;
    }
    const result = sign(current);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasons.some((r) => r.includes('Evidence required'))).toBe(true);
  });

  it('refuses a result recorded against a check the engine never required', () => {
    const draft = answerAll(draftFor());
    const smuggled: InspectionRecord = {
      ...draft,
      results: [
        ...draft.results,
        { checkId: 'DOC-PMA-MARKING', value: 'pass', evidenceRefs: [], toolId: null, note: null },
      ],
    };
    const result = sign(smuggled);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasons.some((r) => r.includes('did not require'))).toBe(true);
  });

  it('refuses a record whose check set the engine cannot reproduce', () => {
    /* This is the degradation guard: a check reached the record without the
       router putting it there. */
    const draft = answerAll(draftFor());
    const tampered: InspectionRecord = {
      ...draft,
      requiredCheckIds: [...draft.requiredCheckIds, 'INVENTED-CHECK'],
    };
    const result = sign(tampered);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasons.some((r) => r.includes('not reproducible'))).toBe(true);
  });
});

describe('signing and immutability', () => {
  it('signs a complete record and records the outcome', () => {
    const result = sign(answerAll(draftFor()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record.outcome).toBe('pass');
    expect(result.record.signature?.signedAt).toBe(SIGNED_AT);
  });

  it('records a fail outcome when any check failed', () => {
    const result = sign(answerAll(draftFor(), 'fail'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record.outcome).toBe('fail');
  });

  it('refuses to mutate a signed record', () => {
    const signed = sign(answerAll(draftFor()));
    if (!signed.ok) throw new Error('expected a signed record');

    const mutation = applyResult(signed.record, {
      checkId: 'PHY-FOD',
      value: 'fail',
      evidenceRefs: [],
      toolId: null,
      note: 'changed my mind',
    });

    expect(mutation.ok).toBe(false);
    if (mutation.ok) return;
    expect(mutation.reasons[0]).toContain('immutable');
  });

  it('refuses to sign an already-signed record', () => {
    const signed = sign(answerAll(draftFor()));
    if (!signed.ok) throw new Error('expected a signed record');
    const again = sign(signed.record);
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.reasons[0]).toContain('already signed');
  });
});

describe('revision chain', () => {
  it('produces a new revision that references its predecessor', () => {
    const signed = sign(answerAll(draftFor()));
    if (!signed.ok) throw new Error('expected a signed record');

    const revised = reviseRecord(signed.record, 'IR-1-R2');
    expect(revised.ok).toBe(true);
    if (!revised.ok) return;
    expect(revised.record.revision).toBe(2);
    expect(revised.record.supersedes).toBe('IR-1');
    expect(revised.record.signature).toBeNull();
    expect(revised.record.results).toEqual([]);
  });

  it('refuses to revise an unsigned draft — there is nothing to supersede', () => {
    const revised = reviseRecord(draftFor(), 'IR-1-R2');
    expect(revised.ok).toBe(false);
  });
});

describe('reproducibility and metadata', () => {
  it('confirms a clean record reproduces from the engine', () => {
    expect(verifyReproducible(draftFor(), pack, table).reproducible).toBe(true);
  });

  it('detects a pack version mismatch', () => {
    const check = verifyReproducible(draftFor(), { ...pack, version: '9.9.9' }, table);
    expect(check.reproducible).toBe(false);
    expect(check.differences.some((d) => d.includes('pack differs'))).toBe(true);
  });

  it('promotes the columns a quality manager filters and reports on', () => {
    const signed = sign(answerAll(draftFor()));
    if (!signed.ok) throw new Error('expected a signed record');

    const metadata = recordMetadata(signed.record);
    expect(metadata['receiptId']).toBe('RCPT-0001');
    expect(metadata['result']).toBe('pass');
    expect(metadata['inspector']).toBe('Inspector One');
    expect(metadata['inspectionPath']).toBe('FULL_INSPECTION');
  });
});
