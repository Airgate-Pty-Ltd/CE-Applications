import type { OperatingBasis, RetentionFloor, RetentionVerdict } from '../schema/retention';

/**
 * Retention floor enforcement.
 *
 * TWO NUMBERS, DELIBERATELY SEPARATED.
 *
 *   - The REGULATORY FLOOR is a legal minimum set by the operating basis.
 *   - The PRODUCT DEFAULT is policy, and is higher.
 *
 * The build prompt cites 14 CFR 145.213 as driving a 10-year floor for repair
 * station records. That does not appear to hold: 145.213 concerns inspection
 * of maintenance performed, and the repair station recordkeeping rule is
 * 145.219, whose minimum is 2 years, not 10. Enforcing 10 years as a
 * *regulatory* floor would make the product refuse lawful configurations and
 * tell customers a regulator requires something it does not.
 *
 * So the floors below are the legal minima, every one marked unverified until
 * checked against a controlled copy (owner's action, not the build's), and the
 * 10-year figure is retained as the product default — a defensible policy
 * position, which is what it always was.
 *
 * Configurable upward, never below the floor.
 */

/** Policy default. Not a regulatory minimum. */
export const PRODUCT_DEFAULT_RETENTION_YEARS = 10;

export const REGULATORY_FLOORS: Readonly<Record<OperatingBasis, RetentionFloor>> = {
  'faa-part-145': {
    basis: 'faa-part-145',
    years: 2,
    citation: '14 CFR 145.219 — repair station recordkeeping (UNVERIFIED)',
    verified: false,
  },
  'faa-part-21': {
    basis: 'faa-part-21',
    years: 5,
    citation: '14 CFR 21.137 — production approval holder quality system (UNVERIFIED)',
    verified: false,
  },
  as9100: {
    basis: 'as9100',
    years: 0,
    citation:
      'AS9100D 7.5.3 — retention period set by the organisation, its customers, and applicable ' +
      'regulation; the standard states no numeric minimum (UNVERIFIED)',
    verified: false,
  },
  as9120: {
    basis: 'as9120',
    years: 0,
    citation:
      'AS9120B 7.5.3 — retention period set by the organisation, its customers, and applicable ' +
      'regulation; the standard states no numeric minimum (UNVERIFIED)',
    verified: false,
  },
  'customer-defined': {
    basis: 'customer-defined',
    years: 0,
    citation: 'No regulatory basis selected; the customer defines the retention period',
    verified: false,
  },
};

export interface RetentionInput {
  readonly configuredYears: number;
  readonly basis: OperatingBasis;
  /**
   * Floor table override. Floors are configuration, not constants: a customer
   * operating under an authority this product does not ship, or one who has
   * verified a floor against a controlled copy, supplies their own table.
   * Defaults to the shipped floors.
   */
  readonly floors?: Readonly<Record<OperatingBasis, RetentionFloor>>;
}

export function evaluateRetention(input: RetentionInput): RetentionVerdict {
  const floor = (input.floors ?? REGULATORY_FLOORS)[input.basis];
  const acceptable = input.configuredYears >= floor.years;

  const verificationNote = floor.verified
    ? ''
    : ' This floor is marked unverified pending confirmation against a controlled copy.';

  return {
    acceptable,
    configuredYears: input.configuredYears,
    floorYears: floor.years,
    basis: input.basis,
    citation: floor.citation,
    floorVerified: floor.verified,
    message: acceptable
      ? `Retention of ${input.configuredYears} year(s) meets the ${floor.years}-year floor for ` +
        `${input.basis} (${floor.citation}).${verificationNote}`
      : `Retention of ${input.configuredYears} year(s) is BELOW the ${floor.years}-year floor for ` +
        `${input.basis} (${floor.citation}). Retention may be raised, never lowered past the ` +
        `floor.${verificationNote}`,
  };
}
