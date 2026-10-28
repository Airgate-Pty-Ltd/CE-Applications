import type { Receipt } from '../schema/receipt';
import type { ApplicabilityExpression, CheckDefinition, CheckPack } from '../schema/check';

/**
 * Check applicability evaluation.
 *
 * The check set is EMITTED by this function from the receipt. It is never a
 * fixed list rendered by a screen — that is the degradation this product has
 * to structurally prevent (DESIGN-NOTES.md §4).
 *
 * Applicability is declarative data, not an expression string that gets
 * evaluated. Content packs are customer-editable, and a pack that can execute
 * code is a pack that can do anything.
 */

/** Resolves a dotted path against the receipt. Unknown paths yield undefined. */
function resolveField(receipt: Receipt, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = receipt;

  for (const segment of segments) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

export function isApplicable(expression: ApplicabilityExpression, receipt: Receipt): boolean {
  switch (expression.kind) {
    case 'always':
      return true;

    case 'all':
      return expression.of.every((child) => isApplicable(child, receipt));

    case 'any':
      return expression.of.some((child) => isApplicable(child, receipt));

    case 'not':
      return !isApplicable(expression.of, receipt);

    case 'equals': {
      const value = resolveField(receipt, expression.field);
      return value === expression.value;
    }

    case 'in': {
      const value = resolveField(receipt, expression.field);
      return typeof value === 'string' && expression.value.includes(value);
    }

    case 'isTrue': {
      const value = resolveField(receipt, expression.field);
      return value === true;
    }
  }
}

/**
 * The required check set for a receipt.
 *
 * Order follows the pack, so the same pack and the same receipt always yield
 * the same sequence. This function is the one the reproducibility invariant
 * re-runs against a signed record: a record carrying a check this did not
 * select is a record produced by a form, not by the engine.
 */
export function selectChecks(pack: CheckPack, receipt: Receipt): CheckDefinition[] {
  return pack.checks.filter((check) => isApplicable(check.applicableWhen, receipt));
}

/** Convenience for the reproducibility assertion and the dashboard. */
export function selectCheckIds(pack: CheckPack, receipt: Receipt): string[] {
  return selectChecks(pack, receipt).map((check) => check.id);
}
