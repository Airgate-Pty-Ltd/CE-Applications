import { z } from 'zod';

export const checkGroup = z.enum(['physical-verification', 'documentation-verification']);
export type CheckGroup = z.infer<typeof checkGroup>;

export const checkResultValue = z.enum(['pass', 'fail', 'not-applicable']);
export type CheckResultValue = z.infer<typeof checkResultValue>;

/**
 * Applicability is a declarative predicate over the receipt, evaluated by the
 * engine. It is deliberately NOT an expression string that gets evaluated at
 * runtime: content packs are customer-editable data, and a pack that can
 * execute code is a pack that can do anything.
 */
export type ApplicabilityExpression =
  | { readonly kind: 'always' }
  | { readonly kind: 'all'; readonly of: readonly ApplicabilityExpression[] }
  | { readonly kind: 'any'; readonly of: readonly ApplicabilityExpression[] }
  | { readonly kind: 'not'; readonly of: ApplicabilityExpression }
  | { readonly kind: 'equals'; readonly field: string; readonly value: string }
  | { readonly kind: 'in'; readonly field: string; readonly value: readonly string[] }
  | { readonly kind: 'isTrue'; readonly field: string };

export const applicabilityExpression: z.ZodType<ApplicabilityExpression> = z.lazy(() =>
  z.union([
    z.object({ kind: z.literal('always') }),
    z.object({ kind: z.literal('all'), of: z.array(applicabilityExpression) }),
    z.object({ kind: z.literal('any'), of: z.array(applicabilityExpression) }),
    z.object({ kind: z.literal('not'), of: applicabilityExpression }),
    z.object({ kind: z.literal('equals'), field: z.string().min(1), value: z.string() }),
    z.object({ kind: z.literal('in'), field: z.string().min(1), value: z.array(z.string()) }),
    z.object({ kind: z.literal('isTrue'), field: z.string().min(1) }),
  ])
);

export const checkDefinition = z.object({
  id: z.string().min(1),
  group: checkGroup,
  /** Shown to the inspector. Written as an instruction, not a question. */
  prompt: z.string().min(1),
  applicableWhen: applicabilityExpression,
  /** Photograph or attachment required before the check can be answered. */
  evidenceRequired: z.boolean(),
  /** True where answering requires a measurement, which engages the tool gate. */
  requiresMeasurement: z.boolean(),
  /**
   * The regulation or standard clause the check exists to satisfy. Carried on
   * the record so an auditor can trace a check to its basis rather than take
   * the vendor's word for why it is there.
   */
  regulatoryHook: z.string().min(1),
});
export type CheckDefinition = z.infer<typeof checkDefinition>;

/**
 * A pack is versioned separately from the application so a customer can add
 * their own checks, and so standard packs can ship without a release.
 */
export const checkPack = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  title: z.string().min(1),
  checks: z.array(checkDefinition),
});
export type CheckPack = z.infer<typeof checkPack>;

export const checkResult = z.object({
  checkId: z.string().min(1),
  value: checkResultValue,
  /** Evidence references. Attached to a decision, never a substitute for one. */
  evidenceRefs: z.array(z.string().min(1)).default([]),
  toolId: z.string().min(1).nullable(),
  note: z.string().nullable(),
});
export type CheckResult = z.infer<typeof checkResult>;
