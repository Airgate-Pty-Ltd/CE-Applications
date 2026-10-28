import path from 'path';
import { hashSnapshot } from '../mai/kernel/hash';
import { evaluateRule, EvaluationError } from '../mai/kernel/evaluator';
import { RuleRegistry, RegistryValidationError } from '../mai/kernel/registry';
import { loadDim } from '../mai/dims-loader';
import type { Condition, MaiAdapter } from '../mai/kernel/types';

// Pure kernel unit tests — no database. Cover the deterministic core (hash,
// operator grammar, data_confidence, registry validation) and a few DIM rules.

const noLinks: Pick<MaiAdapter, 'listLinkedRecords'> = {
  listLinkedRecords: async () => [],
};
const ctx = (data: Record<string, unknown>) => ({
  data,
  recordType: 'pma_case',
  recordId: 'r1',
  tenantId: 't1',
  adapter: noLinks,
});

describe('hashSnapshot', () => {
  it('is invariant to object key order', () => {
    expect(hashSnapshot({ a: 1, b: 2 })).toBe(hashSnapshot({ b: 2, a: 1 }));
  });
  it('changes when data changes', () => {
    expect(hashSnapshot({ a: 1 })).not.toBe(hashSnapshot({ a: 2 }));
  });
  it('is a 64-char hex digest', () => {
    expect(hashSnapshot({ x: 'y' })).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('evaluator operator grammar', () => {
  const cases: { name: string; cond: Condition; data: Record<string, unknown>; expect: boolean }[] = [
    { name: 'is_null true', cond: { field: 'f', op: 'is_null' }, data: { f: null }, expect: true },
    { name: 'is_null false', cond: { field: 'f', op: 'is_null' }, data: { f: 'x' }, expect: false },
    { name: 'not_empty trims', cond: { field: 'f', op: 'not_empty' }, data: { f: '  ' }, expect: false },
    { name: 'eq true', cond: { field: 'f', op: 'eq', value: true }, data: { f: true }, expect: true },
    { name: 'ne', cond: { field: 'f', op: 'ne', value: 1 }, data: { f: 2 }, expect: true },
    { name: 'in', cond: { field: 'f', op: 'in', value: ['a', 'b'] }, data: { f: 'b' }, expect: true },
    { name: 'length_gte array', cond: { field: 'f', op: 'length_gte', value: 2 }, data: { f: [1, 2] }, expect: true },
    { name: 'length_lt string', cond: { field: 'f', op: 'length_lt', value: 3 }, data: { f: 'ab' }, expect: true },
    { name: 'all', cond: { all: [{ field: 'a', op: 'not_empty' }, { field: 'b', op: 'eq', value: 1 }] }, data: { a: 'x', b: 1 }, expect: true },
    { name: 'any', cond: { any: [{ field: 'a', op: 'is_null' }, { field: 'b', op: 'not_empty' }] }, data: { a: 'x', b: 'y' }, expect: true },
    { name: 'not', cond: { not: { field: 'a', op: 'is_null' } }, data: { a: 'x' }, expect: true },
  ];
  for (const c of cases) {
    it(c.name, async () => {
      const r = await evaluateRule(c.cond, ctx(c.data));
      expect(r.result).toBe(c.expect);
    });
  }

  it('data_confidence is high when every referenced field is present', async () => {
    const r = await evaluateRule({ field: 'f', op: 'is_null' }, ctx({ f: null }));
    expect(r.dataConfidence).toBe('high');
  });
  it('data_confidence is medium when a referenced field is absent from the snapshot', async () => {
    const r = await evaluateRule({ field: 'missing', op: 'is_null' }, ctx({ other: 1 }));
    expect(r.dataConfidence).toBe('medium');
  });
  it('throws EvaluationError on an unknown operator', async () => {
    await expect(
      evaluateRule({ field: 'f', op: 'bogus' as never }, ctx({ f: 1 })),
    ).rejects.toBeInstanceOf(EvaluationError);
  });
});

describe('RuleRegistry validation', () => {
  const manifest = {
    dimId: 'x',
    description: 'd',
    subscribesTo: ['pma_case.created'],
    readsFields: { pma_case: ['f'] },
    version: '1.0',
    publishedAt: '2026-07-24',
  };
  const goodRule = {
    ruleId: 'X-1',
    dimId: 'x',
    revision: 1,
    effectiveDate: '2026-07-24',
    approvedBy: 'Brian R. Olea',
    severity: 'minor' as const,
    gapClass: 'INFO' as const,
    category: 'completeness' as const,
    riskClass: 'C' as const,
    basisType: 'deterministic-record-completeness',
    description: 'd',
    requiredFields: ['f'],
    findingText: 't',
    resolutionHint: 'h',
    clauseRefs: ['c'],
    condition: { field: 'f', op: 'is_null' as const },
  };

  it('accepts a well-formed DIM', () => {
    expect(() => new RuleRegistry([{ manifest, rules: [goodRule] }])).not.toThrow();
  });
  it('rejects a rule missing approvedBy', () => {
    const bad = { ...goodRule, approvedBy: '' };
    expect(() => new RuleRegistry([{ manifest, rules: [bad] }])).toThrow(RegistryValidationError);
  });
  it('dispatches by subscribesTo, not by name', () => {
    const reg = new RuleRegistry([{ manifest, rules: [goodRule] }]);
    expect(reg.rulesForEvent('pma_case.created')).toHaveLength(1);
    expect(reg.rulesForEvent('pma_case.closure_submitted')).toHaveLength(0);
  });
});

describe('pma-application-assessment DIM rules (representative pos/neg/missing)', () => {
  const dim = loadDim(path.resolve(__dirname, '..', '..', 'dims', 'pma-application-assessment'));
  const rule = (id: string) => {
    const r = dim.rules.find((x) => x.ruleId === id);
    if (!r) throw new Error(`rule ${id} not found`);
    return r;
  };
  const evalRule = (id: string, data: Record<string, unknown>) =>
    evaluateRule(rule(id).condition, ctx(data));

  it('PMA-COMPLETE-008 fires when any QMS identifier is missing', async () => {
    expect((await evalRule('PMA-COMPLETE-008', { qms_manual_number: null, qms_manual_revision: 'C', qms_manual_date: '2026-01-01' })).result).toBe(true);
    expect((await evalRule('PMA-COMPLETE-008', { qms_manual_number: 'QM1', qms_manual_revision: 'C', qms_manual_date: '2026-01-01' })).result).toBe(false);
  });

  it('PMA-LINK-001 fires on an STC letter/supplement mismatch', async () => {
    expect((await evalRule('PMA-LINK-001', { stc_letter_supplement_mismatch: true })).result).toBe(true);
    expect((await evalRule('PMA-LINK-001', { stc_letter_supplement_mismatch: false })).result).toBe(false);
  });

  it('PMA-BASIS-CONFLICT-001 fires when both STC and TC numbers are present', async () => {
    expect((await evalRule('PMA-BASIS-CONFLICT-001', { stc_number: 'STC1', tc_number: 'TC1' })).result).toBe(true);
    expect((await evalRule('PMA-BASIS-CONFLICT-001', { stc_number: 'STC1', tc_number: '' })).result).toBe(false);
  });

  it('every rule carries clause references (no uncited requirement)', () => {
    for (const r of dim.rules) {
      expect(r.clauseRefs.length).toBeGreaterThan(0);
    }
  });
});
