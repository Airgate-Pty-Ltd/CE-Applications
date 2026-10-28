import { z } from 'zod';

/**
 * Sampling is DATA, not code. Customers arrive with their own AQL schemes and
 * must be able to replace the table without a release.
 *
 * IMPORTANT — this product ships NO sample sizes.
 *
 * The build prompt asks for a default table; it also forbids inventing an AQL
 * scheme. Both cannot hold, so the structure, loader, validation and routing
 * are built in full and the shipped table is explicitly unconfigured. A receipt
 * routed to sample inspection against an unconfigured table returns a blocking
 * outcome naming what is missing.
 *
 * An invented AQL scheme is worse than a missing one: it looks authoritative,
 * gets used, and produces defective sample sizes on real receipts.
 */
export const samplingBand = z
  .object({
    /** Inclusive lower bound of lot size. */
    lotSizeMin: z.number().int().positive(),
    /** Inclusive upper bound. Null means unbounded. */
    lotSizeMax: z.number().int().positive().nullable(),
    /** Units to inspect for a lot in this band. */
    sampleSize: z.number().int().positive(),
    /** Failures permitted before the lot is rejected. */
    acceptNumber: z.number().int().nonnegative(),
  })
  .refine((b) => b.lotSizeMax === null || b.lotSizeMax >= b.lotSizeMin, {
    message: 'lotSizeMax must be greater than or equal to lotSizeMin',
  })
  .refine((b) => b.lotSizeMax === null || b.sampleSize <= b.lotSizeMax, {
    message: 'sampleSize cannot exceed the largest lot in the band',
  });
export type SamplingBand = z.infer<typeof samplingBand>;

export const samplingTable = z.object({
  id: z.string().min(1),
  /** Version of the table content, independent of the application version. */
  version: z.string().min(1),
  /**
   * False on the shipped table. The customer sets this only once they have
   * supplied their own bands, which is a deliberate act of ownership: the
   * sample sizes are theirs, not the vendor's.
   */
  configured: z.boolean(),
  /** Human-readable provenance, e.g. the customer's own procedure reference. */
  source: z.string().min(1),
  bands: z.array(samplingBand),
});
export type SamplingTable = z.infer<typeof samplingTable>;

/**
 * The table shipped with the product. Deliberately empty.
 */
export const UNCONFIGURED_SAMPLING_TABLE: SamplingTable = {
  id: 'unconfigured',
  version: '0',
  configured: false,
  source: 'No sampling table configured. Supply your own scheme.',
  bands: [],
};
