import { z } from 'zod'
import { IsoDate } from './primitives.ts'

/**
 * Everything the source material treated as fixed is a customer-configured
 * value here. That is what makes the repository clean-room, and it is also what
 * makes the product sellable to more than one operator.
 */

export const RETENTION_FLOOR_YEARS = 10

/**
 * Displayed alongside a retention date. It is a string, not logic, because the
 * basis for the floor is flagged for owner verification - see
 * REGULATORY-SOURCES.md, decision 3. If the basis turns out to be contractual
 * or policy-derived rather than regulatory, this string changes and nothing
 * else does.
 */
export const RETENTION_FLOOR_BASIS = 'Configured floor of 10 years. Basis pending owner verification.'

export const AuthorityConcurrence = z.object({
  /** Whether the customer has recorded an authority concurrence on file. */
  recorded: z.boolean(),
  /** The customer's own reference for that concurrence. Never validated by the app. */
  reference: z.string().optional(),
  recordedOn: IsoDate.optional(),
})
export type AuthorityConcurrence = z.infer<typeof AuthorityConcurrence>

export const CustomerConfig = z.object({
  organisationDisplayName: z.string().min(1),
  productDisplayName: z.string().min(1),

  /** Section 2.2: minimum video resolution. Configurable upward only. */
  minimumVideoHeightPx: z.number().int().min(720),

  /** Section 1.3: retention floor. Configurable upward only. */
  retentionYears: z.number().int().min(RETENTION_FLOOR_YEARS),

  /**
   * Section 2.1 hard block: a critical article may not be scheduled unless the
   * customer has recorded an authority concurrence for critical-article remote
   * inspection. The app records whether one exists. It does not evaluate it.
   */
  criticalArticleAuthorityConcurrence: AuthorityConcurrence,

  /** Section 3: 8100-1 layout, or a configured equivalent. */
  authorityRecordForm: z.enum(['FAA_FORM_8100_1', 'CONFIGURED_EQUIVALENT']),
  authorityRecordFormRef: z.string().optional(),

  /** Section 2.3: whether this customer uses a designated representative. */
  designatedRepresentativeEnabled: z.boolean(),

  /**
   * Section 5: recordings are written to a target the customer controls. There
   * is deliberately no vendor-cloud default.
   */
  recordingStorageTargetRef: z.string().min(1),

  /** Section 3: sample size for the periodic internal-audit sampling pack. */
  auditSampleSize: z.number().int().positive(),

  /** Below this element count a completed session appears in the remediation view. */
  defensibilityReviewThreshold: z.number().int().min(0),
})
export type CustomerConfig = z.infer<typeof CustomerConfig>
