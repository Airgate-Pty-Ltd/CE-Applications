import { describe, it, expect } from 'vitest';
import { routeInspection, RULES, FORMS } from './router';
import { UNCONFIGURED_SAMPLING_TABLE } from '../schema/sampling';
import { makeReceipt, TEST_SAMPLING_TABLE, GAPPED_SAMPLING_TABLE } from '../fixtures/receipts';

const route = (receipt: ReturnType<typeof makeReceipt>, samplingTable = TEST_SAMPLING_TABLE) =>
  routeInspection({ receipt, samplingTable });

describe('documentation gate — rule 1', () => {
  it('hard stops when documentation is incomplete', () => {
    const decision = route(makeReceipt({ documentation: { complete: false } }));

    expect(decision.path).toBe('RETURN_TO_RECEIVING');
    expect(decision.sampling.kind).toBe('none');
    expect(decision.requiredForms).toEqual([]);
    expect(decision.trace[0]?.ruleId).toBe(RULES.DOCUMENTATION_GATE);
    expect(decision.trace[0]?.fired).toBe(true);
    expect(decision.trace[0]?.reason).toContain('documentation incomplete');
  });

  it('hard stops when documentation does not match the physical goods', () => {
    const decision = route(makeReceipt({ documentation: { matchesPhysicalGoods: false } }));

    expect(decision.path).toBe('RETURN_TO_RECEIVING');
    expect(decision.trace[0]?.reason).toContain('does not match the physical goods');
  });

  it('hard stops when no release document is presented', () => {
    const decision = route(makeReceipt({ documentation: { releaseDocument: 'none' } }));

    expect(decision.path).toBe('RETURN_TO_RECEIVING');
    expect(decision.trace[0]?.reason).toContain('no release document presented');
  });

  it('reports every cause when all three fail together', () => {
    const decision = route(
      makeReceipt({
        documentation: { complete: false, matchesPhysicalGoods: false, releaseDocument: 'none' },
      })
    );

    expect(decision.trace[0]?.reason).toContain('documentation incomplete');
    expect(decision.trace[0]?.reason).toContain('does not match the physical goods');
    expect(decision.trace[0]?.reason).toContain('no release document presented');
  });

  it('stops before evaluating anything else — the gate is not a finding', () => {
    const decision = route(
      makeReceipt({
        documentation: { complete: false },
        escalation: { keyOrCriticalCharacteristics: true },
      })
    );

    expect(decision.trace).toHaveLength(1);
    expect(decision.escalationTriggers).toEqual([]);
  });

  it('passes the gate when documentation is complete and matching', () => {
    const decision = route(makeReceipt({}));

    expect(decision.path).not.toBe('RETURN_TO_RECEIVING');
    expect(decision.trace[0]?.fired).toBe(false);
  });
});

describe('release document branch — rule 2', () => {
  it('routes an article released on FAA Form 8130-3 to full inspection', () => {
    const decision = route(makeReceipt({ documentation: { releaseDocument: 'faa-8130-3' } }));

    expect(decision.path).toBe('FULL_INSPECTION');
    expect(decision.sampling.kind).toBe('full');
    expect(decision.sampling.sampleSize).toBe(10);
    expect(decision.sampling.acceptNumber).toBeNull();
    expect(decision.requiredForms).toContain(FORMS.CONFORMITY_RECORD);
  });

  it('treats a configured equivalent release the same as an 8130-3', () => {
    const decision = route(
      makeReceipt({ documentation: { releaseDocument: 'configured-equivalent' } })
    );

    expect(decision.path).toBe('FULL_INSPECTION');
    expect(decision.requiredForms).toContain(FORMS.CONFORMITY_RECORD);
  });

  it('routes a certificate-of-conformance-only article to sample inspection', () => {
    const decision = route(
      makeReceipt({ documentation: { releaseDocument: 'certificate-of-conformance' } })
    );

    expect(decision.path).toBe('SAMPLE_INSPECTION');
    expect(decision.sampling.kind).toBe('sample');
    expect(decision.requiredForms).not.toContain(FORMS.CONFORMITY_RECORD);
    expect(decision.requiredForms).toContain(FORMS.INSPECTION_RECORD);
  });
});

describe('escalation to 100% — rule 3', () => {
  const coc = { releaseDocument: 'certificate-of-conformance' as const };

  const escalationCases = [
    ['firstArticleFromSupplier', RULES.ESC_FIRST_ARTICLE],
    ['openCorrectiveAction', RULES.ESC_OPEN_CORRECTIVE_ACTION],
    ['qualityEscapeInLookback', RULES.ESC_QUALITY_ESCAPE],
    ['keyOrCriticalCharacteristics', RULES.ESC_KEY_CHARACTERISTICS],
    ['configurationChangeSinceLastReceipt', RULES.ESC_CONFIGURATION_CHANGE],
  ] as const;

  it.each(escalationCases)(
    'escalates a sample inspection to 100% on %s, and names the trigger',
    (field, ruleId) => {
      const decision = route(makeReceipt({ documentation: coc, escalation: { [field]: true } }));

      expect(decision.path).toBe('FULL_INSPECTION');
      expect(decision.escalationTriggers).toContain(ruleId);
      expect(decision.trace.find((t) => t.ruleId === ruleId)?.fired).toBe(true);
    }
  );

  it.each(['probation', 'newly-approved', 'suspended'] as const)(
    'escalates on supplier standing: %s',
    (status) => {
      const decision = route(makeReceipt({ documentation: coc, supplierStatus: status }));

      expect(decision.path).toBe('FULL_INSPECTION');
      expect(decision.escalationTriggers).toContain(RULES.ESC_SUPPLIER_STANDING);
    }
  );

  it('does not escalate an approved supplier with no triggers', () => {
    const decision = route(makeReceipt({ documentation: coc }));

    expect(decision.path).toBe('SAMPLE_INSPECTION');
    expect(decision.escalationTriggers).toEqual([]);
    expect(decision.trace.filter((t) => t.ruleId.startsWith('R3-')).every((t) => !t.fired)).toBe(
      true
    );
  });

  it('records every trigger when several fire at once', () => {
    const decision = route(
      makeReceipt({
        documentation: coc,
        supplierStatus: 'probation',
        escalation: { firstArticleFromSupplier: true, openCorrectiveAction: true },
      })
    );

    expect(decision.escalationTriggers).toHaveLength(3);
  });

  it('leaves an already-full inspection at 100% and still records the trigger', () => {
    const decision = route(makeReceipt({ escalation: { keyOrCriticalCharacteristics: true } }));

    expect(decision.path).toBe('FULL_INSPECTION');
    expect(decision.escalationTriggers).toContain(RULES.ESC_KEY_CHARACTERISTICS);
  });
});

describe('sampling resolution — rule 4', () => {
  const coc = { releaseDocument: 'certificate-of-conformance' as const };

  it('blocks rather than guessing when no sampling table is configured', () => {
    const decision = route(makeReceipt({ documentation: coc }), UNCONFIGURED_SAMPLING_TABLE);

    expect(decision.path).toBe('BLOCKED');
    expect(decision.blocking?.code).toBe('SAMPLING_TABLE_NOT_CONFIGURED');
    expect(decision.sampling.sampleSize).toBe(0);
  });

  it('blocks when no band covers the lot size', () => {
    const decision = route(
      makeReceipt({ documentation: coc, quantityReceived: 500 }),
      GAPPED_SAMPLING_TABLE
    );

    expect(decision.path).toBe('BLOCKED');
    expect(decision.blocking?.code).toBe('SAMPLING_BAND_NOT_FOUND');
    expect(decision.blocking?.message).toContain('500');
  });

  it('applies the matching band and shows its origin on the record', () => {
    const decision = route(makeReceipt({ documentation: coc, quantityReceived: 10 }));

    expect(decision.path).toBe('SAMPLE_INSPECTION');
    expect(decision.sampling.sampleSize).toBe(5);
    expect(decision.sampling.acceptNumber).toBe(0);
    expect(decision.sampling.tableId).toBe('TEST-TABLE');
    expect(decision.sampling.tableVersion).toBe('1');
  });

  it('matches an unbounded band', () => {
    const decision = route(makeReceipt({ documentation: coc, quantityReceived: 5000 }));

    expect(decision.sampling.sampleSize).toBe(20);
    expect(decision.sampling.acceptNumber).toBe(1);
  });

  it('matches the lower boundary of a band inclusively', () => {
    const decision = route(makeReceipt({ documentation: coc, quantityReceived: 9 }));

    expect(decision.sampling.sampleSize).toBe(5);
  });

  it('matches the upper boundary of a band inclusively', () => {
    const decision = route(makeReceipt({ documentation: coc, quantityReceived: 8 }));

    expect(decision.sampling.sampleSize).toBe(2);
  });
});

describe('determinism', () => {
  it('produces a byte-identical decision for the same input, 100 times', () => {
    const receipt = makeReceipt({
      documentation: { releaseDocument: 'certificate-of-conformance' },
      escalation: { openCorrectiveAction: true },
    });

    const first = JSON.stringify(route(receipt));
    for (let i = 0; i < 100; i += 1) {
      expect(JSON.stringify(route(receipt))).toBe(first);
    }
  });

  it('traces every rule it evaluated, fired or not', () => {
    const decision = route(makeReceipt({}));
    const traced = decision.trace.map((t) => t.ruleId);

    expect(traced).toContain(RULES.DOCUMENTATION_GATE);
    expect(traced).toContain(RULES.RELEASE_DOCUMENT_BRANCH);
    expect(traced).toContain(RULES.SAMPLING_RESOLUTION);
    expect(decision.trace.every((t) => t.reason.length > 0)).toBe(true);
  });
});
