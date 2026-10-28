import { BILLING_ENABLED } from '../config.ts'

/**
 * Subscription layer — built now, flagged off.
 *
 * The point of building this before it is needed is that turning revenue on
 * later must not mean rearchitecting. Every gate the paid product would need
 * already exists and is already called; with `VITE_FEATURE_BILLING` unset they
 * all return "allowed", so the product runs fully unlocked and the test
 * dashboard is unaffected.
 *
 * NO PRICES ARE SET. Tier boundaries are structural; the numbers are read from
 * configuration and are deliberately null until they are decided.
 */

export type TierId = 'single-user' | 'multi-user-org' | 'consultant-multi-client'

export interface Tier {
  readonly id: TierId
  readonly name: string
  readonly description: string
  /** Null until pricing is set. Never hardcode a number here. */
  readonly priceMinorUnits: number | null
  readonly currency: string | null
  readonly limits: {
    /** Null means unlimited. */
    readonly maxOrganizations: number | null
    readonly maxSeats: number | null
    readonly maxActivePlans: number | null
  }
  readonly features: readonly FeatureId[]
}

export type FeatureId =
  | 'generate-plan'
  | 'generate-gap-report'
  | 'organization-profile'
  | 'multiple-organizations'
  | 'team-seats'
  | 'cloud-sync'

export const TIERS: readonly Tier[] = [
  {
    id: 'single-user',
    name: 'Single user',
    description: 'One quality professional preparing plans for one PAH.',
    priceMinorUnits: null,
    currency: null,
    limits: { maxOrganizations: 1, maxSeats: 1, maxActivePlans: null },
    features: ['generate-plan', 'generate-gap-report', 'organization-profile'],
  },
  {
    id: 'multi-user-org',
    name: 'Multi-user organisation',
    description: 'A quality department sharing one organisation profile across several people.',
    priceMinorUnits: null,
    currency: null,
    limits: { maxOrganizations: 1, maxSeats: null, maxActivePlans: null },
    features: ['generate-plan', 'generate-gap-report', 'organization-profile', 'team-seats', 'cloud-sync'],
  },
  {
    id: 'consultant-multi-client',
    name: 'Consultant, multiple clients',
    description: 'A consultant preparing plans for several PAHs, each with its own profile.',
    priceMinorUnits: null,
    currency: null,
    limits: { maxOrganizations: null, maxSeats: null, maxActivePlans: null },
    features: [
      'generate-plan',
      'generate-gap-report',
      'organization-profile',
      'multiple-organizations',
      'team-seats',
      'cloud-sync',
    ],
  },
]

export interface Entitlement {
  readonly tier: TierId | null
  readonly active: boolean
}

/** No billing configured: everything is allowed. */
export const UNLOCKED: Entitlement = { tier: null, active: false }

export interface AccessDecision {
  readonly allowed: boolean
  readonly reason: string
}

export function canUse(feature: FeatureId, entitlement: Entitlement = UNLOCKED): AccessDecision {
  if (!BILLING_ENABLED) {
    return { allowed: true, reason: 'Billing is disabled for this build; all features are available.' }
  }

  if (!entitlement.active || entitlement.tier === null) {
    return { allowed: false, reason: 'No active subscription.' }
  }

  const tier = TIERS.find((t) => t.id === entitlement.tier)
  if (tier === undefined) {
    return { allowed: false, reason: `Unknown tier "${entitlement.tier}".` }
  }

  return tier.features.includes(feature)
    ? { allowed: true, reason: `Included in ${tier.name}.` }
    : { allowed: false, reason: `${tier.name} does not include this feature.` }
}

export function withinLimit(
  limit: keyof Tier['limits'],
  current: number,
  entitlement: Entitlement = UNLOCKED,
): AccessDecision {
  if (!BILLING_ENABLED) return { allowed: true, reason: 'Billing is disabled for this build.' }

  const tier = TIERS.find((t) => t.id === entitlement.tier)
  if (tier === undefined || !entitlement.active) {
    return { allowed: false, reason: 'No active subscription.' }
  }

  const max = tier.limits[limit]
  if (max === null) return { allowed: true, reason: `${tier.name} has no limit on ${limit}.` }

  return current < max
    ? { allowed: true, reason: `${current} of ${max} used.` }
    : { allowed: false, reason: `${tier.name} allows ${max}; ${current} in use.` }
}

/** True when a price has been configured. Nothing should display a price before this. */
export function hasPricing(tier: Tier): boolean {
  return tier.priceMinorUnits !== null && tier.currency !== null
}
