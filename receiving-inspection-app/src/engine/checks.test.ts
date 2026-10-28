import { describe, it, expect } from 'vitest';
import { isApplicable, selectChecks, selectCheckIds } from './checks';
import type { ApplicabilityExpression, CheckPack } from '../schema/check';
import { makeReceipt } from '../fixtures/receipts';

const receipt = makeReceipt({
  articleClass: 'pma',
  supplierStatus: 'probation',
  escalation: { keyOrCriticalCharacteristics: true },
});

const check = (id: string, applicableWhen: ApplicabilityExpression) => ({
  id,
  group: 'documentation-verification' as const,
  prompt: `Perform ${id}`,
  applicableWhen,
  evidenceRequired: false,
  requiresMeasurement: false,
  regulatoryHook: 'Test hook',
});

describe('applicability expressions', () => {
  it('always applies', () => {
    expect(isApplicable({ kind: 'always' }, receipt)).toBe(true);
  });

  it('matches a top-level field with equals', () => {
    expect(isApplicable({ kind: 'equals', field: 'articleClass', value: 'pma' }, receipt)).toBe(
      true
    );
    expect(
      isApplicable({ kind: 'equals', field: 'articleClass', value: 'standard' }, receipt)
    ).toBe(false);
  });

  it('matches a nested field through a dotted path', () => {
    expect(
      isApplicable(
        { kind: 'equals', field: 'documentation.releaseDocument', value: 'faa-8130-3' },
        receipt
      )
    ).toBe(true);
  });

  it('matches membership with in', () => {
    expect(
      isApplicable(
        { kind: 'in', field: 'supplierStatus', value: ['probation', 'suspended'] },
        receipt
      )
    ).toBe(true);
    expect(
      isApplicable({ kind: 'in', field: 'supplierStatus', value: ['approved'] }, receipt)
    ).toBe(false);
  });

  it('returns false for in when the field is not a string', () => {
    expect(isApplicable({ kind: 'in', field: 'quantityReceived', value: ['10'] }, receipt)).toBe(
      false
    );
  });

  it('matches a boolean with isTrue', () => {
    expect(
      isApplicable({ kind: 'isTrue', field: 'escalation.keyOrCriticalCharacteristics' }, receipt)
    ).toBe(true);
    expect(
      isApplicable({ kind: 'isTrue', field: 'escalation.openCorrectiveAction' }, receipt)
    ).toBe(false);
  });

  it('yields false for an unknown field rather than throwing', () => {
    expect(isApplicable({ kind: 'isTrue', field: 'nope' }, receipt)).toBe(false);
    expect(isApplicable({ kind: 'equals', field: 'a.b.c', value: 'x' }, receipt)).toBe(false);
  });

  it('yields false when a path traverses through a non-object', () => {
    expect(isApplicable({ kind: 'equals', field: 'partNumber.deeper', value: 'x' }, receipt)).toBe(
      false
    );
  });

  it('combines with all', () => {
    expect(
      isApplicable(
        {
          kind: 'all',
          of: [
            { kind: 'equals', field: 'articleClass', value: 'pma' },
            { kind: 'isTrue', field: 'escalation.keyOrCriticalCharacteristics' },
          ],
        },
        receipt
      )
    ).toBe(true);

    expect(
      isApplicable(
        {
          kind: 'all',
          of: [
            { kind: 'equals', field: 'articleClass', value: 'pma' },
            { kind: 'isTrue', field: 'escalation.openCorrectiveAction' },
          ],
        },
        receipt
      )
    ).toBe(false);
  });

  it('combines with any', () => {
    expect(
      isApplicable(
        {
          kind: 'any',
          of: [
            { kind: 'equals', field: 'articleClass', value: 'standard' },
            { kind: 'equals', field: 'articleClass', value: 'pma' },
          ],
        },
        receipt
      )
    ).toBe(true);

    expect(
      isApplicable(
        { kind: 'any', of: [{ kind: 'equals', field: 'articleClass', value: 'stc' }] },
        receipt
      )
    ).toBe(false);
  });

  it('negates with not', () => {
    expect(
      isApplicable(
        { kind: 'not', of: { kind: 'equals', field: 'articleClass', value: 'stc' } },
        receipt
      )
    ).toBe(true);
  });
});

describe('check selection', () => {
  const pack: CheckPack = {
    id: 'TEST-PACK',
    version: '1',
    title: 'Test pack',
    checks: [
      check('CHK-ALWAYS', { kind: 'always' }),
      check('CHK-PMA', { kind: 'equals', field: 'articleClass', value: 'pma' }),
      check('CHK-SHELF', { kind: 'equals', field: 'articleClass', value: 'shelf-life-limited' }),
    ],
  };

  it('emits only the applicable checks — the set is derived, never fixed', () => {
    expect(selectCheckIds(pack, receipt)).toEqual(['CHK-ALWAYS', 'CHK-PMA']);
  });

  it('preserves pack order so the same receipt yields the same sequence', () => {
    const first = selectChecks(pack, receipt).map((c) => c.id);
    for (let i = 0; i < 25; i += 1) {
      expect(selectChecks(pack, receipt).map((c) => c.id)).toEqual(first);
    }
  });

  it('changes the emitted set when the receipt changes', () => {
    const shelfLife = makeReceipt({ articleClass: 'shelf-life-limited' });

    expect(selectCheckIds(pack, shelfLife)).toEqual(['CHK-ALWAYS', 'CHK-SHELF']);
  });
});
