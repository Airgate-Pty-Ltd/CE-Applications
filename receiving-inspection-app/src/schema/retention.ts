import { z } from 'zod';

/**
 * The operating basis the customer works under. It determines the regulatory
 * retention floor, which is a legal minimum, NOT a product default.
 *
 * These are two different numbers and conflating them is a real defect: a
 * product that enforces a 10-year "regulatory floor" refuses configurations
 * that are lawful, and tells the customer the regulator requires something the
 * regulator does not.
 */
export const operatingBasis = z.enum([
  'faa-part-145',
  'faa-part-21',
  'as9100',
  'as9120',
  'customer-defined',
]);
export type OperatingBasis = z.infer<typeof operatingBasis>;

export const retentionFloor = z.object({
  basis: operatingBasis,
  years: z.number().int().nonnegative(),
  /** The rule or clause the floor comes from. */
  citation: z.string().min(1),
  /**
   * False until checked against a controlled copy. Every floor ships false:
   * verification of regulatory citations is the owner's action, not the
   * build's, and a floor asserted as verified when it is not is worse than one
   * openly marked unverified.
   */
  verified: z.boolean(),
});
export type RetentionFloor = z.infer<typeof retentionFloor>;

export const retentionVerdict = z.object({
  acceptable: z.boolean(),
  configuredYears: z.number().int().nonnegative(),
  floorYears: z.number().int().nonnegative(),
  basis: operatingBasis,
  citation: z.string().min(1),
  floorVerified: z.boolean(),
  message: z.string().min(1),
});
export type RetentionVerdict = z.infer<typeof retentionVerdict>;
