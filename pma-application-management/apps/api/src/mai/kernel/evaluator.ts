import type {
  Condition,
  FieldCondition,
  LinkCondition,
  MaiAdapter,
} from './types';

// Deterministic rule evaluation over an immutable snapshot. No LLM, no network,
// no randomness (design law 1). Unknown operators/fields raise EvaluationError,
// which the kernel catches → logs to mai_error_log → skips that rule only.

export class EvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvaluationError';
  }
}

const KNOWN_FIELD_OPS = new Set([
  'is_null',
  'not_null',
  'is_empty',
  'not_empty',
  'eq',
  'ne',
  'in',
  'length_gte',
  'length_lt',
  'date_before_today',
  'date_after_today',
]);
const KNOWN_LINK_OPS = new Set(['linked_record_exists', 'linked_record_missing']);

export interface EvalContext {
  data: Record<string, unknown>;
  recordType: string;
  recordId: string;
  tenantId: string;
  adapter: Pick<MaiAdapter, 'listLinkedRecords'>;
}

export interface EvalResult {
  result: boolean;
  dataConfidence: 'high' | 'medium' | 'low';
}

// Collect every field a condition tree references — used for data_confidence.
export function collectFields(condition: Condition): string[] {
  const acc: string[] = [];
  walk(condition, acc);
  return acc;
}

function walk(c: Condition, acc: string[]): void {
  if ('all' in c) return void c.all.forEach((x) => walk(x, acc));
  if ('any' in c) return void c.any.forEach((x) => walk(x, acc));
  if ('not' in c) return void walk(c.not, acc);
  if ('field' in c) acc.push(c.field);
}

// Evaluate a whole rule condition, computing result + data_confidence together.
// Throws EvaluationError on unknown operator / structurally invalid condition.
export async function evaluateRule(
  condition: Condition,
  ctx: EvalContext,
): Promise<EvalResult> {
  const referenced = collectFields(condition);
  // 'high' if every referenced field is present as a key in the snapshot schema,
  // else 'medium'. (A present-but-null field is still "present".)
  const allPresent = referenced.every((f) =>
    Object.prototype.hasOwnProperty.call(ctx.data, f),
  );
  const result = await evalCondition(condition, ctx);
  return { result, dataConfidence: allPresent ? 'high' : 'medium' };
}

async function evalCondition(c: Condition, ctx: EvalContext): Promise<boolean> {
  if ('all' in c) {
    for (const sub of c.all) {
      if (!(await evalCondition(sub, ctx))) return false;
    }
    return true;
  }
  if ('any' in c) {
    for (const sub of c.any) {
      if (await evalCondition(sub, ctx)) return true;
    }
    return false;
  }
  if ('not' in c) {
    return !(await evalCondition(c.not, ctx));
  }
  if ('op' in c && KNOWN_LINK_OPS.has((c as LinkCondition).op)) {
    return evalLink(c as LinkCondition, ctx);
  }
  if ('field' in c) {
    return evalField(c as FieldCondition, ctx);
  }
  throw new EvaluationError(`Unrecognized condition node: ${JSON.stringify(c)}`);
}

async function evalLink(c: LinkCondition, ctx: EvalContext): Promise<boolean> {
  const linked = await ctx.adapter.listLinkedRecords(
    ctx.recordType,
    ctx.recordId,
    c.link,
    ctx.tenantId,
  );
  const exists = linked.length > 0;
  return c.op === 'linked_record_exists' ? exists : !exists;
}

function evalField(c: FieldCondition, ctx: EvalContext): boolean {
  if (!KNOWN_FIELD_OPS.has(c.op)) {
    throw new EvaluationError(`Unknown operator: ${c.op}`);
  }
  const raw = ctx.data[c.field];
  switch (c.op) {
    case 'is_null':
      return raw === null || raw === undefined;
    case 'not_null':
      return raw !== null && raw !== undefined;
    case 'is_empty':
      return isEmpty(raw);
    case 'not_empty':
      return !isEmpty(raw);
    case 'eq':
      return raw === c.value;
    case 'ne':
      return raw !== c.value;
    case 'in':
      if (!Array.isArray(c.value)) {
        throw new EvaluationError(`'in' requires an array value for ${c.field}`);
      }
      return (c.value as unknown[]).includes(raw);
    case 'length_gte':
      return lengthOf(raw) >= Number(c.value);
    case 'length_lt':
      return lengthOf(raw) < Number(c.value);
    case 'date_before_today':
      return compareDate(raw) === 'before';
    case 'date_after_today':
      return compareDate(raw) === 'after';
    default:
      throw new EvaluationError(`Unhandled operator: ${c.op}`);
  }
}

function isEmpty(raw: unknown): boolean {
  if (raw === null || raw === undefined) return true;
  if (typeof raw === 'string') return raw.trim().length === 0;
  if (Array.isArray(raw)) return raw.length === 0;
  return false;
}

function lengthOf(raw: unknown): number {
  if (typeof raw === 'string') return raw.trim().length;
  if (Array.isArray(raw)) return raw.length;
  throw new EvaluationError('length_* requires a string or array');
}

// date_before/after_today use server-local midnight as the boundary.
function compareDate(raw: unknown): 'before' | 'after' | 'same' {
  if (typeof raw !== 'string' && !(raw instanceof Date)) {
    throw new EvaluationError('date_* requires a date string');
  }
  const d = new Date(raw as string);
  if (isNaN(d.getTime())) throw new EvaluationError(`Unparseable date: ${String(raw)}`);
  const today = new Date();
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (d.getTime() < midnight.getTime()) return 'before';
  if (d.getTime() >= midnight.getTime() + 86400000) return 'after';
  return 'same';
}
