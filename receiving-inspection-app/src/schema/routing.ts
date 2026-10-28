import { z } from 'zod';

export const inspectionPath = z.enum([
  /**
   * Hard stop. Documentation is incomplete or does not match the physical
   * goods. Inspection does not start — this is not a finding recorded against
   * an inspection, it is a refusal to begin one.
   */
  'RETURN_TO_RECEIVING',
  /** 100% inspection. Conformity record required. */
  'FULL_INSPECTION',
  /** Sample inspection per the configured sampling table. */
  'SAMPLE_INSPECTION',
  /**
   * The router reached a decision it cannot complete because configuration is
   * missing. Distinct from a rejection: nothing is wrong with the article.
   */
  'BLOCKED',
]);
export type InspectionPath = z.infer<typeof inspectionPath>;

export const blockingReasonCode = z.enum([
  'SAMPLING_TABLE_NOT_CONFIGURED',
  'SAMPLING_BAND_NOT_FOUND',
]);
export type BlockingReasonCode = z.infer<typeof blockingReasonCode>;

/**
 * One rule evaluation, in the order it was evaluated.
 *
 * The trace is part of the record, not a log. A record that carries answers
 * without the derivation is a form; a record that carries the derivation can
 * be re-checked, and an escalation to 100% can always be explained.
 */
export const ruleFiring = z.object({
  ruleId: z.string().min(1),
  description: z.string().min(1),
  fired: z.boolean(),
  /** Why it fired, or why it did not. Always populated. */
  reason: z.string().min(1),
});
export type RuleFiring = z.infer<typeof ruleFiring>;

export const samplingDecision = z.object({
  kind: z.enum(['none', 'full', 'sample']),
  /** Units to inspect. Equals the lot size on a full inspection. */
  sampleSize: z.number().int().nonnegative(),
  acceptNumber: z.number().int().nonnegative().nullable(),
  /** Identifies the table and band applied, so the record can show its origin. */
  tableId: z.string().min(1).nullable(),
  tableVersion: z.string().min(1).nullable(),
});
export type SamplingDecision = z.infer<typeof samplingDecision>;

export const routingDecision = z.object({
  path: inspectionPath,
  sampling: samplingDecision,
  /**
   * Forms the path requires, as configured identifiers rather than hardcoded
   * document numbers. A conformity record is required on a full inspection.
   */
  requiredForms: z.array(z.string().min(1)),
  /** Every escalation trigger that fired, for direct display. */
  escalationTriggers: z.array(z.string().min(1)),
  blocking: z
    .object({
      code: blockingReasonCode,
      message: z.string().min(1),
    })
    .nullable(),
  trace: z.array(ruleFiring),
});
export type RoutingDecision = z.infer<typeof routingDecision>;
