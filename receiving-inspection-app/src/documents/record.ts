import { z } from 'zod';
import type { Receipt } from '../schema/receipt';
import type { CheckPack, CheckResult } from '../schema/check';
import type { RoutingDecision } from '../schema/routing';
import type { SamplingTable } from '../schema/sampling';
import type { Role } from '../schema/ncr';
import { routeInspection } from '../engine/router';
import { selectCheckIds } from '../engine/checks';

/**
 * The inspection record — the deliverable.
 *
 * Three rules govern it, and all three are enforced here rather than in the UI:
 *
 *   1. IMMUTABLE ONCE SIGNED. A correction is a new revision referencing its
 *      predecessor. Never an edit in place.
 *   2. REFUSES TO SIGN with any mandatory field unresolved.
 *   3. REPRODUCIBLE. Re-running the router against the receipt must reproduce
 *      the record's check set exactly. A record carrying a check the router did
 *      not select was produced by a form, not by the engine — see
 *      DESIGN-NOTES.md §4.3. This is the invariant that keeps the product from
 *      degrading into a digital clipboard.
 */

export const signature = z.object({
  signedBy: z.string().min(1),
  signedByName: z.string().min(1),
  role: z.string().min(1),
  signedAt: z.string().datetime(),
});
export type Signature = z.infer<typeof signature>;

export const toolUsage = z.object({
  checkId: z.string().min(1),
  toolId: z.string().min(1),
  calibrationDueDate: z.string().date(),
});
export type ToolUsage = z.infer<typeof toolUsage>;

export interface InspectionRecord {
  readonly id: string;
  readonly revision: number;
  /** Record id this revision supersedes. Null on the first revision. */
  readonly supersedes: string | null;
  readonly receipt: Receipt;
  readonly routing: RoutingDecision;
  readonly packId: string;
  readonly packVersion: string;
  readonly requiredCheckIds: readonly string[];
  readonly results: readonly CheckResult[];
  readonly toolsUsed: readonly ToolUsage[];
  readonly outcome: 'pass' | 'fail' | 'not-started';
  readonly ncrId: string | null;
  readonly signature: Signature | null;
}

export type SignRefusal = { readonly ok: false; readonly reasons: string[] };
export type SignSuccess = { readonly ok: true; readonly record: InspectionRecord };

export interface DraftInput {
  readonly id: string;
  readonly receipt: Receipt;
  readonly pack: CheckPack;
  readonly samplingTable: SamplingTable;
}

/** Opens a record. The check set is EMITTED by the engine, never assembled by
 *  a screen. */
export function createDraft(input: DraftInput): InspectionRecord {
  const routing = routeInspection({
    receipt: input.receipt,
    samplingTable: input.samplingTable,
  });

  return {
    id: input.id,
    revision: 1,
    supersedes: null,
    receipt: input.receipt,
    routing,
    packId: input.pack.id,
    packVersion: input.pack.version,
    requiredCheckIds: selectCheckIds(input.pack, input.receipt),
    results: [],
    toolsUsed: [],
    outcome: 'not-started',
    ncrId: null,
    signature: null,
  };
}

/**
 * The reproducibility invariant.
 *
 * Given the record and the content that produced it, the engine must regenerate
 * the same check set and the same routing decision. Anything else means a check
 * reached the record without the router putting it there.
 */
export function verifyReproducible(
  record: InspectionRecord,
  pack: CheckPack,
  samplingTable: SamplingTable
): { reproducible: boolean; differences: string[] } {
  const differences: string[] = [];

  const expectedChecks = selectCheckIds(pack, record.receipt);
  if (JSON.stringify(expectedChecks) !== JSON.stringify([...record.requiredCheckIds])) {
    differences.push(
      `check set differs: engine emits [${expectedChecks.join(', ')}], ` +
        `record carries [${record.requiredCheckIds.join(', ')}]`
    );
  }

  const expectedRouting = routeInspection({ receipt: record.receipt, samplingTable });
  if (JSON.stringify(expectedRouting) !== JSON.stringify(record.routing)) {
    differences.push(
      `routing differs: engine decides ${expectedRouting.path}, record carries ${record.routing.path}`
    );
  }

  if (pack.id !== record.packId || pack.version !== record.packVersion) {
    differences.push(
      `pack differs: record was produced by ${record.packId}@${record.packVersion}, ` +
        `verified against ${pack.id}@${pack.version}`
    );
  }

  return { reproducible: differences.length === 0, differences };
}

export interface SignInput {
  readonly record: InspectionRecord;
  readonly pack: CheckPack;
  readonly samplingTable: SamplingTable;
  readonly signedBy: string;
  readonly signedByName: string;
  readonly role: Role;
  readonly signedAt: string;
}

/**
 * Signs a record, or refuses with every reason at once.
 *
 * Refusing with a list rather than the first failure matters on a receiving
 * bench: an inspector who is told one thing at a time makes several trips.
 */
export function signRecord(input: SignInput): SignRefusal | SignSuccess {
  const { record, pack, samplingTable } = input;
  const reasons: string[] = [];

  if (record.signature !== null) {
    return {
      ok: false,
      reasons: [
        `Record ${record.id} revision ${record.revision} is already signed and is immutable. ` +
          'Raise a new revision instead.',
      ],
    };
  }

  if (input.role === 'read-only') {
    reasons.push('A read-only user cannot sign a record.');
  }

  if (record.routing.path === 'RETURN_TO_RECEIVING') {
    reasons.push(
      'This receipt was routed back to receiving: the documentation gate failed, so no ' +
        'inspection was performed and there is nothing to sign.'
    );
  }

  if (record.routing.path === 'BLOCKED') {
    reasons.push(
      `Routing is blocked: ${record.routing.blocking?.message ?? 'configuration is incomplete'}`
    );
  }

  const answered = new Set(record.results.map((r) => r.checkId));
  const unanswered = record.requiredCheckIds.filter((id) => !answered.has(id));
  if (unanswered.length > 0) {
    reasons.push(`Unanswered mandatory check(s): ${unanswered.join(', ')}`);
  }

  const notRequired = record.results.filter((r) => !record.requiredCheckIds.includes(r.checkId));
  if (notRequired.length > 0) {
    reasons.push(
      `Result(s) recorded against check(s) the engine did not require: ` +
        `${notRequired.map((r) => r.checkId).join(', ')}`
    );
  }

  const missingEvidence = record.results.filter((result) => {
    const definition = pack.checks.find((c) => c.id === result.checkId);
    return (
      definition?.evidenceRequired === true &&
      result.value !== 'not-applicable' &&
      result.evidenceRefs.length === 0
    );
  });
  if (missingEvidence.length > 0) {
    reasons.push(
      `Evidence required but not attached for: ${missingEvidence.map((r) => r.checkId).join(', ')}`
    );
  }

  const missingTool = record.results.filter((result) => {
    const definition = pack.checks.find((c) => c.id === result.checkId);
    return (
      definition?.requiresMeasurement === true &&
      result.value !== 'not-applicable' &&
      (result.toolId === null || !record.toolsUsed.some((t) => t.checkId === result.checkId))
    );
  });
  if (missingTool.length > 0) {
    reasons.push(
      `Measurement recorded with no identified, in-calibration tool for: ` +
        `${missingTool.map((r) => r.checkId).join(', ')}`
    );
  }

  const reproducibility = verifyReproducible(record, pack, samplingTable);
  if (!reproducibility.reproducible) {
    reasons.push(
      `Record is not reproducible from the engine — it was not produced by the router: ` +
        reproducibility.differences.join('; ')
    );
  }

  if (reasons.length > 0) return { ok: false, reasons };

  const failed = record.results.some((r) => r.value === 'fail');

  return {
    ok: true,
    record: {
      ...record,
      outcome: failed ? 'fail' : 'pass',
      signature: {
        signedBy: input.signedBy,
        signedByName: input.signedByName,
        role: input.role,
        signedAt: input.signedAt,
      },
    },
  };
}

/**
 * Corrections happen by revision, never by edit.
 *
 * The new revision references its predecessor, so the chain from the original
 * record to the current one is always walkable.
 */
export function reviseRecord(
  prior: InspectionRecord,
  newId: string
): SignRefusal | { ok: true; record: InspectionRecord } {
  if (prior.signature === null) {
    return {
      ok: false,
      reasons: [
        `Record ${prior.id} is unsigned. Correct the draft directly — a revision supersedes ` +
          'a signed record, and there is nothing yet to supersede.',
      ],
    };
  }

  return {
    ok: true,
    record: {
      ...prior,
      id: newId,
      revision: prior.revision + 1,
      supersedes: prior.id,
      results: [],
      toolsUsed: [],
      outcome: 'not-started',
      signature: null,
    },
  };
}

/** Attempting to mutate a signed record. Always refused. */
export function applyResult(
  record: InspectionRecord,
  result: CheckResult
): SignRefusal | { ok: true; record: InspectionRecord } {
  if (record.signature !== null) {
    return {
      ok: false,
      reasons: [`Record ${record.id} is signed and immutable. Raise a revision to correct it.`],
    };
  }

  return {
    ok: true,
    record: {
      ...record,
      results: [...record.results.filter((r) => r.checkId !== result.checkId), result],
    },
  };
}

/** Metadata promoted to library columns so views and reports work. */
export function recordMetadata(record: InspectionRecord): Record<string, string> {
  return {
    receiptId: record.receipt.id,
    partNumber: record.receipt.partNumber,
    serialNumbers: record.receipt.serialNumbers.join(' '),
    supplierId: record.receipt.supplierId,
    inspectionPath: record.routing.path,
    result: record.outcome,
    inspector: record.signature?.signedByName ?? '',
    signedAt: record.signature?.signedAt ?? '',
    ncrReference: record.ncrId ?? '',
    revision: String(record.revision),
  };
}
