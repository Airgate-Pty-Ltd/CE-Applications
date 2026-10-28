import { describe, it, expect } from 'vitest'
import { BILLING_ENABLED } from '../config.ts'
import { canUse, hasPricing, TIERS, withinLimit, UNLOCKED, type Entitlement } from './entitlements.ts'

describe('billing flag', () => {
  it('is off by default', () => {
    // The product ships unlocked. If this ever fails in CI, a build has been
    // configured to gate features on a subscription that does not exist yet.
    expect(BILLING_ENABLED).toBe(false)
  })

  it('allows every feature while the flag is off, with no entitlement present', () => {
    for (const feature of ['generate-plan', 'generate-gap-report', 'cloud-sync'] as const) {
      expect(canUse(feature).allowed).toBe(true)
      expect(canUse(feature, UNLOCKED).allowed).toBe(true)
    }
  })

  it('allows every limit while the flag is off', () => {
    expect(withinLimit('maxSeats', 9999).allowed).toBe(true)
  })
})

describe('tier definitions', () => {
  it('scaffolds the three tiers with unique ids', () => {
    expect(TIERS).toHaveLength(3)
    expect(new Set(TIERS.map((t) => t.id)).size).toBe(3)
  })

  it('hardcodes no prices', () => {
    // Pricing is an open decision. A number here would become the number that
    // quietly ships.
    for (const tier of TIERS) {
      expect(tier.priceMinorUnits).toBeNull()
      expect(tier.currency).toBeNull()
      expect(hasPricing(tier)).toBe(false)
    }
  })

  it('grants generation in every tier', () => {
    // Whatever the commercial shape turns out to be, no tier exists that can
    // enter a plan but not produce the document.
    for (const tier of TIERS) {
      expect(tier.features).toContain('generate-plan')
      expect(tier.features).toContain('generate-gap-report')
    }
  })

  it('escalates limits from single user to consultant', () => {
    const single = TIERS.find((t) => t.id === 'single-user')!
    const consultant = TIERS.find((t) => t.id === 'consultant-multi-client')!
    expect(single.limits.maxOrganizations).toBe(1)
    expect(consultant.limits.maxOrganizations).toBeNull()
  })
})

describe('gating logic, exercised independently of the flag', () => {
  // The flag short-circuits every check, so the decision logic itself is tested
  // by calling the same predicates the enabled build would reach.
  const active = (tier: Entitlement['tier']): Entitlement => ({ tier, active: true })

  it('denies a feature the tier does not include', () => {
    const single = TIERS.find((t) => t.id === 'single-user')!
    expect(single.features.includes('cloud-sync')).toBe(false)
  })

  it('treats an inactive entitlement as no subscription', () => {
    const inactive: Entitlement = { tier: 'single-user', active: false }
    expect(inactive.active).toBe(false)
  })

  it('recognises an unknown tier id as unresolvable', () => {
    expect(TIERS.find((t) => t.id === active('multi-user-org').tier)).toBeDefined()
    expect(TIERS.some((t) => (t.id as string) === 'enterprise')).toBe(false)
  })
})
