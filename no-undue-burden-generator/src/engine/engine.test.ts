import { describe, it, expect } from 'vitest'
import { determineRisk, joinWithAnd } from './risk.ts'
import { analyseGaps } from './gaps.ts'
import { validate } from './validate.ts'
import { determine } from './determine.ts'
import { ALLOWED_STATUS_BANNERS, isAllowedBanner } from './banner.ts'
import { emptyPlan, type ProjectPlan } from '../schema/plan.ts'
import { emptyProfile, type OrganizationProfile } from '../schema/profile.ts'
import { SCENARIOS, baseProfile } from '../fixtures/scenarios.ts'
import type { Narrative } from '../schema/common.ts'

const n = (text: string): Narrative => ({ text, evidence: 'CONFIRMED' })

/** A minimal plan that answers the three risk questions cleanly. */
function answeredPlan(): ProjectPlan {
  const p = emptyPlan()
  return {
    ...p,
    sectionOne: {
      ...p.sectionOne,
      facilityName: 'Meridian Precision Components Sdn Bhd',
      facilityAddress: 'Lot 14, Senai, Johor, Malaysia',
      facilityCountry: 'Malaysia',
      articles: [{ name: 'Bracket', modelNumber: 'ACT-4410' }],
      bilateralCountry: 'YES',
    },
    sectionTwo: {
      ...p.sectionTwo,
      cplListed: 'NO',
      cplBasis: n('CPL reviewed 2026-07-20; the article does not appear.'),
      pahIdentifiedHighRisk: 'NO',
      fullyInspectableOnReceipt: 'YES',
      facilityCapabilitiesAndExperience: n(
        'Meridian has machined aerospace structural details since 2009 and holds AS9100D certification.',
      ),
    },
  }
}

describe('banner', () => {
  it('permits exactly the three declared values', () => {
    expect(ALLOWED_STATUS_BANNERS).toHaveLength(3)
    expect(isAllowedBanner('DRAFTED WITH GAPS')).toBe(true)
    expect(isAllowedBanner('READY')).toBe(false)
  })
})

describe('joinWithAnd', () => {
  it('handles none, one, and many', () => {
    expect(joinWithAnd([])).toBe('')
    expect(joinWithAnd(['alpha'])).toBe('alpha')
    expect(joinWithAnd(['alpha', 'beta'])).toBe('alpha; and beta')
    expect(joinWithAnd(['alpha', 'beta', 'gamma'])).toBe('alpha; beta; and gamma')
  })
})

describe('risk: CPL', () => {
  it('reports not-yet-answered without inventing an answer', () => {
    const r = determineRisk(emptyPlan())
    expect(r.cplListed).toBe('UNANSWERED')
    expect(r.cplRationale).toContain('Not yet answered')
  })

  it('records the stated basis when one is given', () => {
    const p = answeredPlan()
    const r = determineRisk(p)
    expect(r.cplRationale).toContain('Stated basis')
    expect(r.cplRationale).toContain('2026-07-20')
  })

  it('says so when no basis is stated', () => {
    const p = answeredPlan()
    p.sectionTwo.cplBasis = n('')
    expect(determineRisk(p).cplRationale).toContain('No basis for this answer has been stated')
  })

  it('reflects a Yes answer', () => {
    const p = answeredPlan()
    p.sectionTwo.cplListed = 'YES'
    expect(determineRisk(p).cplRationale).toContain('"Yes"')
  })
})

describe('risk: high-risk triggers', () => {
  it('suggests No when nothing fires', () => {
    const r = determineRisk(answeredPlan())
    expect(r.highRiskSuggested).toBe('NO')
    expect(r.firedTriggers).toEqual([])
    expect(r.highRiskRationale).toContain('no risk indicators fired')
  })

  it('names the single trigger that fired', () => {
    const p = answeredPlan()
    p.sectionTwo.highRiskTriggers.specialProcess = true
    p.sectionTwo.pahIdentifiedHighRisk = 'YES'
    const r = determineRisk(p)
    expect(r.firedTriggers).toEqual(['specialProcess'])
    expect(r.highRiskRationale).toContain('1 risk indicator:')
    expect(r.highRiskRationale).toContain('special process')
  })

  it('joins two triggers with "and"', () => {
    const p = answeredPlan()
    p.sectionTwo.highRiskTriggers.specialProcess = true
    p.sectionTwo.highRiskTriggers.functionalAcceptanceTest = true
    p.sectionTwo.pahIdentifiedHighRisk = 'YES'
    const r = determineRisk(p)
    expect(r.firedTriggers).toEqual(['functionalAcceptanceTest', 'specialProcess'])
    expect(r.highRiskRationale).toContain('2 risk indicators')
    expect(r.highRiskRationale).toContain('; and ')
  })

  it('reports triggers in declaration order regardless of assignment order', () => {
    const p = answeredPlan()
    p.sectionTwo.highRiskTriggers.controlledInterfaceTorqueOrMaterial = true
    p.sectionTwo.highRiskTriggers.keyOrCriticalCharacteristics = true
    p.sectionTwo.pahIdentifiedHighRisk = 'YES'
    expect(determineRisk(p).firedTriggers).toEqual([
      'keyOrCriticalCharacteristics',
      'controlledInterfaceTorqueOrMaterial',
    ])
  })

  it('accepts a Yes resting on design data alone, and says the rationale must be stated', () => {
    const p = answeredPlan()
    p.sectionTwo.pahIdentifiedHighRisk = 'YES'
    expect(determineRisk(p).highRiskRationale).toContain('rests on the design data alone')
  })

  it('surfaces a contradiction rather than overriding the PAH answer', () => {
    const p = answeredPlan()
    p.sectionTwo.highRiskTriggers.esdSensitiveElectronicsOrPcba = true
    p.sectionTwo.pahIdentifiedHighRisk = 'NO'
    const r = determineRisk(p)
    // The PAH's answer is authoritative; the engine does not silently flip it.
    expect(r.highRisk).toBe('NO')
    expect(r.highRiskContradictsTriggers).toBe(true)
    expect(r.highRiskRationale).toContain('An FAA reviewer reads the same design data')
  })

  it('describes unanswered high-risk both with and without triggers', () => {
    const bare = emptyPlan()
    expect(determineRisk(bare).highRiskRationale).toContain('No risk indicators have been selected')

    const withTrigger = emptyPlan()
    withTrigger.sectionTwo.highRiskTriggers.hundredPercentVerification = true
    expect(determineRisk(withTrigger).highRiskRationale).toContain('1 risk indicator suggest')

    const withTwo = emptyPlan()
    withTwo.sectionTwo.highRiskTriggers.hundredPercentVerification = true
    withTwo.sectionTwo.highRiskTriggers.specialProcess = true
    expect(determineRisk(withTwo).highRiskRationale).toContain('2 risk indicators suggest')
  })

  it('pluralises the contradiction message when several indicators fire', () => {
    const p = answeredPlan()
    p.sectionTwo.highRiskTriggers.esdSensitiveElectronicsOrPcba = true
    p.sectionTwo.highRiskTriggers.functionalAcceptanceTest = true
    p.sectionTwo.pahIdentifiedHighRisk = 'NO'
    expect(determineRisk(p).highRiskRationale).toContain('2 risk indicators')
  })
})

describe('risk: inspectability', () => {
  it('describes each of the four states', () => {
    const bare = emptyPlan()
    expect(determineRisk(bare).inspectabilityRationale).toContain('Not yet answered')

    const yes = answeredPlan()
    expect(determineRisk(yes).inspectabilityRationale).toContain('without disassembly')

    const noNamed = answeredPlan()
    noNamed.sectionTwo.fullyInspectableOnReceipt = 'NO'
    noNamed.sectionTwo.uninspectableCharacteristics = n('Core hardness cannot be verified after receipt.')
    expect(determineRisk(noNamed).inspectabilityRationale).toContain('justification the FAA looks for')

    const noUnnamed = answeredPlan()
    noUnnamed.sectionTwo.fullyInspectableOnReceipt = 'NO'
    expect(determineRisk(noUnnamed).inspectabilityRationale).toContain('§7.2.3 requires them')
  })
})

describe('risk: routing', () => {
  it('routes a CPL listing to a full project plan', () => {
    const p = answeredPlan()
    p.sectionTwo.cplListed = 'YES'
    const r = determineRisk(p)
    expect(r.routing).toBe('FULL_PROJECT_PLAN')
    expect(r.routingRationale).toContain('listed on the CPL')
  })

  it('routes a high-risk identification to a full project plan', () => {
    const p = answeredPlan()
    p.sectionTwo.pahIdentifiedHighRisk = 'YES'
    expect(determineRisk(p).routingRationale).toContain('identified the articles as high-risk')
  })

  it('routes critical characteristics to a full project plan even when high-risk is No', () => {
    const p = answeredPlan()
    p.sectionTwo.highRiskTriggers.keyOrCriticalCharacteristics = true
    const r = determineRisk(p)
    expect(r.criticalCharacteristicsPresent).toBe(true)
    expect(r.routing).toBe('FULL_PROJECT_PLAN')
    expect(r.routingRationale).toContain('critical characteristics requiring close control')
  })

  it('joins three concurrent reasons', () => {
    const p = answeredPlan()
    p.sectionTwo.cplListed = 'YES'
    p.sectionTwo.pahIdentifiedHighRisk = 'YES'
    p.sectionTwo.highRiskTriggers.keyOrCriticalCharacteristics = true
    expect(determineRisk(p).routingRationale).toContain('; and ')
  })

  it('routes a clean low-risk article to an initial notification, and defers to the managing office', () => {
    const r = determineRisk(answeredPlan())
    expect(r.routing).toBe('INITIAL_NOTIFICATION')
    expect(r.routingRationale).toContain('FAA managing office')
  })

  it('is indeterminate while a routing input is unanswered', () => {
    const one = answeredPlan()
    one.sectionTwo.cplListed = 'UNANSWERED'
    const r1 = determineRisk(one)
    expect(r1.routing).toBe('INDETERMINATE')
    expect(r1.routingRationale).toContain('is answered')

    const both = emptyPlan()
    const r2 = determineRisk(both)
    expect(r2.routingRationale).toContain('are answered')
    expect(r2.routingRationale).toContain('; and ')
  })
})

describe('risk: trace', () => {
  it('records every rule with its inputs and output', () => {
    const trace = determineRisk(answeredPlan()).trace
    expect(trace.length).toBeGreaterThan(10)
    expect(trace.map((t) => t.id)).toContain('routing.outcome')
    for (const entry of trace) {
      expect(entry.description.length).toBeGreaterThan(0)
      expect(entry).toHaveProperty('inputs')
      expect(entry).toHaveProperty('output')
    }
  })

  it('lets a reviewer see exactly which triggers caused a high-risk Yes', () => {
    const p = answeredPlan()
    p.sectionTwo.highRiskTriggers.specialProcess = true
    p.sectionTwo.pahIdentifiedHighRisk = 'YES'
    const fired = determineRisk(p)
      .trace.filter((t) => t.id.startsWith('high-risk.trigger.') && t.fired)
      .map((t) => t.id)
    expect(fired).toEqual(['high-risk.trigger.specialProcess'])
  })
})

describe('gaps', () => {
  const run = (plan: ProjectPlan, profile: OrganizationProfile = baseProfile()) =>
    analyseGaps(plan, profile, determineRisk(plan))

  it('blocks an entirely empty plan and names what is required', () => {
    const g = analyseGaps(emptyPlan(), emptyProfile(), determineRisk(emptyPlan()))
    expect(g.canGenerate).toBe(false)
    const ids = g.blocking.map((x) => x.id)
    expect(ids).toContain('profile.pahName')
    expect(ids).toContain('facility.name')
    expect(ids).toContain('articles.present')
    expect(ids).toContain('risk.complete')
  })

  it('orders blocking gaps before warnings before info', () => {
    const g = analyseGaps(emptyPlan(), emptyProfile(), determineRisk(emptyPlan()))
    const severities = g.gaps.map((x) => x.severity)
    const firstWarning = severities.indexOf('WARNING')
    const lastBlocking = severities.lastIndexOf('BLOCKING')
    if (firstWarning !== -1) expect(lastBlocking).toBeLessThan(firstWarning)
  })

  it('warns on a missing facility address but does not block', () => {
    const p = answeredPlan()
    p.sectionOne.facilityAddress = ''
    const g = run(p)
    expect(g.warnings.map((x) => x.id)).toContain('facility.address')
    expect(g.blocking.map((x) => x.id)).not.toContain('facility.address')
  })

  it('blocks a missing facility country because it drives the bilateral question', () => {
    const p = answeredPlan()
    p.sectionOne.facilityCountry = ''
    expect(run(p).blocking.map((x) => x.id)).toContain('facility.country')
  })

  it('warns per article when a model number is missing', () => {
    const p = answeredPlan()
    p.sectionOne.articles = [
      { name: 'Bracket', modelNumber: '' },
      { name: 'Fitting', modelNumber: 'FTG-2020' },
    ]
    const ids = run(p).warnings.map((x) => x.id)
    expect(ids).toContain('articles.model-number.0')
    expect(ids).not.toContain('articles.model-number.1')
  })

  it('ignores an article row with no name at all', () => {
    const p = answeredPlan()
    p.sectionOne.articles = [{ name: '', modelNumber: '' }]
    expect(run(p).blocking.map((x) => x.id)).toContain('articles.present')
  })

  it('blocks when critical characteristics are undescribed on a CPL-listed article', () => {
    const p = answeredPlan()
    p.sectionTwo.cplListed = 'YES'
    expect(run(p).blocking.map((x) => x.id)).toContain('risk.critical-characteristics')
  })

  it('blocks when un-inspectable characteristics are not named', () => {
    const p = answeredPlan()
    p.sectionTwo.fullyInspectableOnReceipt = 'NO'
    expect(run(p).blocking.map((x) => x.id)).toContain('risk.uninspectable-named')
  })

  it('blocks when facility capabilities are not described', () => {
    const p = answeredPlan()
    p.sectionTwo.facilityCapabilitiesAndExperience = n('')
    expect(run(p).blocking.map((x) => x.id)).toContain('risk.capabilities')
  })

  it('warns when the CPL answer has no basis', () => {
    const p = answeredPlan()
    p.sectionTwo.cplBasis = n('')
    expect(run(p).warnings.map((x) => x.id)).toContain('risk.cpl-basis')
  })

  it('warns when the high-risk answer contradicts the indicators', () => {
    const p = answeredPlan()
    p.sectionTwo.highRiskTriggers.hundredPercentVerification = true
    expect(run(p).warnings.map((x) => x.id)).toContain('risk.high-risk-contradiction')
  })

  it('warns when bilateral status is unanswered', () => {
    const p = answeredPlan()
    p.sectionOne.bilateralCountry = 'UNANSWERED'
    expect(run(p).warnings.map((x) => x.id)).toContain('bilateral.answered')
  })

  it('blocks a non-bilateral facility with no access mitigation', () => {
    const p = answeredPlan()
    p.sectionOne.bilateralCountry = 'NO'
    expect(run(p).blocking.map((x) => x.id)).toContain('bilateral.mitigation')
  })

  it('accepts a non-bilateral facility once mitigation is described', () => {
    const p = answeredPlan()
    p.sectionOne.bilateralCountry = 'NO'
    p.sectionFour.nonBilateralAccessMitigation = n(
      'The supply agreement grants Northvale and the FAA an unconditional right of entry, and Northvale ' +
        'conducts oversight on the FAA’s behalf under a witnessed audit protocol.',
    )
    expect(run(p).blocking.map((x) => x.id)).not.toContain('bilateral.mitigation')
  })

  it('reports Sections 3 to 5 as informational for an initial notification', () => {
    expect(run(answeredPlan()).info.map((x) => x.id)).toContain('routing.initial-notification')
  })

  it('notes an unstated project term', () => {
    expect(run(answeredPlan()).info.map((x) => x.id)).toContain('project.term')
  })

  it('requires Sections 3 to 5 once a full plan is routed', () => {
    const p = answeredPlan()
    p.sectionTwo.cplListed = 'YES'
    p.sectionTwo.criticalCharacteristics = n('The lug bore diameter carries the full side load path.')
    const ids = run(p).blocking.map((x) => x.id)
    expect(ids).toContain('full-plan.nonconformanceReporting')
    expect(ids).toContain('full-plan.approvalResults')
    expect(ids).toContain('full-plan.qms-integration')
    expect(ids).toContain('full-plan.english')
    expect(ids).toContain('full-plan.delegations')
    expect(ids).toContain('full-plan.inspection-procedures')
  })

  it('warns rather than blocks when a full-plan narrative is present but thin', () => {
    const s = SCENARIOS.find((x) => x.id === 'warnings-thin-narratives')!
    const g = analyseGaps(s.plan, s.profile, determineRisk(s.plan))
    expect(g.canGenerate).toBe(true)
    expect(g.warnings.map((x) => x.id)).toContain('full-plan.thin.nonconformanceReporting')
  })

  it('warns when the English document listing is not attached', () => {
    const s = SCENARIOS.find((x) => x.id === 'high-risk-critical-characteristics')!
    const plan = { ...s.plan, sectionFour: { ...s.plan.sectionFour, englishDocumentListingAttached: 'NO' as const } }
    expect(analyseGaps(plan, s.profile, determineRisk(plan)).warnings.map((x) => x.id)).toContain(
      'full-plan.english-listing',
    )
  })

  it('blocks when designees are used without the travel commitment', () => {
    const p = answeredPlan()
    p.sectionFive.designeesUsed = 'YES'
    expect(run(p).blocking.map((x) => x.id)).toContain('designee.travel')
  })

  it('warns on missing designee function codes and delegation listing', () => {
    const p = answeredPlan()
    p.sectionFive.designeesUsed = 'YES'
    p.sectionFive.designeeTravelAgreed = 'YES'
    const ids = run(p).warnings.map((x) => x.id)
    expect(ids).toContain('designee.function-codes')
    expect(ids).toContain('designee.listing')
  })

  it('warns when inspection types are selected but the procedures are thin', () => {
    const one = answeredPlan()
    one.sectionFive.inspectionTypes.source = true
    const single = run(one).warnings.find((x) => x.id === 'inspection-types.undescribed')!
    expect(single.detail).toContain('1 inspection type is')

    const two = answeredPlan()
    two.sectionFive.inspectionTypes.source = true
    two.sectionFive.inspectionTypes.tooling = true
    const plural = run(two).warnings.find((x) => x.id === 'inspection-types.undescribed')!
    expect(plural.detail).toContain('2 inspection types are')
  })
})

describe('validation', () => {
  const run = (plan: ProjectPlan, profile: OrganizationProfile = baseProfile()) =>
    validate(plan, profile, determineRisk(plan))

  it('fails when the address omits the stated country', () => {
    const p = answeredPlan()
    p.sectionOne.facilityAddress = 'Lot 14, Senai, Johor'
    const c = run(p).checks.find((x) => x.id === 'facility.country-in-address')!
    expect(c.passed).toBe(false)
    expect(c.detail).toContain('Malaysia')
  })

  it('passes when the address names the country', () => {
    expect(run(answeredPlan()).checks.find((x) => x.id === 'facility.country-in-address')!.passed).toBe(true)
  })

  it('catches the contradiction of fully-inspectable Yes with named un-inspectable characteristics', () => {
    const p = answeredPlan()
    p.sectionTwo.uninspectableCharacteristics = n('Core hardness cannot be verified.')
    const c = run(p).checks.find((x) => x.id === 'risk.uninspectable-consistent')!
    expect(c.passed).toBe(false)
    expect(c.detail).toContain('contradict each other')
  })

  it('treats an inapplicable check as passing, not failing', () => {
    const c = run(answeredPlan()).checks.find((x) => x.id === 'bilateral.mitigation-consistent')!
    expect(c.applicable).toBe(true)
    expect(c.detail).toContain('does not apply')
  })

  it('passes the bilateral check once mitigation is described', () => {
    const p = answeredPlan()
    p.sectionOne.bilateralCountry = 'NO'
    p.sectionFour.nonBilateralAccessMitigation = n(
      'The supply agreement grants Northvale and the FAA an unconditional right of entry.',
    )
    const c = run(p).checks.find((x) => x.id === 'bilateral.mitigation-consistent')!
    expect(c.passed).toBe(true)
    expect(c.detail).toContain('mitigation is described')
  })

  it('fails the bilateral check when mitigation is absent', () => {
    const p = answeredPlan()
    p.sectionOne.bilateralCountry = 'NO'
    const c = run(p).checks.find((x) => x.id === 'bilateral.mitigation-consistent')!
    expect(c.passed).toBe(false)
    expect(c.detail).toContain('Section 4 item 8 is required')
  })

  it('fails when a claimed CAA approval is not described', () => {
    const p = answeredPlan()
    p.sectionOne.caaProductionApprovalHeld = 'YES'
    expect(run(p).checks.find((x) => x.id === 'caa-approval.described')!.passed).toBe(false)
  })

  it('fails when the subtier pair is half-completed', () => {
    const s = SCENARIOS.find((x) => x.id === 'high-risk-critical-characteristics')!
    const plan = { ...s.plan, sectionFour: { ...s.plan.sectionFour, subtierApprovalProcess: n('') } }
    expect(
      validate(plan, s.profile, determineRisk(plan)).checks.find((x) => x.id === 'subtier.control-consistent')!.passed,
    ).toBe(false)
  })

  it('fails when the FAA managing office is not confirmed', () => {
    const profile = { ...baseProfile(), faaManagingOffice: '' }
    const c = validate(answeredPlan(), profile, determineRisk(answeredPlan())).checks.find(
      (x) => x.id === 'faa-office.confirmed',
    )!
    expect(c.passed).toBe(false)
    expect(c.detail).toContain('never assumes it')
  })

  it('fails when the project or PC number is empty', () => {
    const profile = { ...baseProfile(), projectOrPcNumber: '' }
    expect(
      validate(answeredPlan(), profile, determineRisk(answeredPlan())).checks.find(
        (x) => x.id === 'project-number.present',
      )!.passed,
    ).toBe(false)
  })

  it('fails when the signatory is the organisation rather than a person', () => {
    const profile = { ...baseProfile(), signatoryName: 'Northvale Aerostructures, Inc.' }
    expect(
      validate(answeredPlan(), profile, determineRisk(answeredPlan())).checks.find(
        (x) => x.id === 'pah-name.consistent',
      )!.passed,
    ).toBe(false)
  })

  it('reports missing model numbers by name', () => {
    const p = answeredPlan()
    p.sectionOne.articles = [{ name: 'Bracket', modelNumber: '' }]
    const c = run(p).checks.find((x) => x.id === 'articles.model-numbers')!
    expect(c.passed).toBe(false)
    expect(c.detail).toContain('Bracket')
  })

  it('reports a full plan with unpopulated sections', () => {
    const p = answeredPlan()
    p.sectionTwo.cplListed = 'YES'
    const c = run(p).checks.find((x) => x.id === 'full-plan.sections-populated')!
    expect(c.passed).toBe(false)
  })

  it('confirms the designee travel commitment when designees are used', () => {
    const p = answeredPlan()
    p.sectionFive.designeesUsed = 'YES'
    p.sectionFive.designeeTravelAgreed = 'YES'
    expect(run(p).checks.find((x) => x.id === 'designee.travel-consistent')!.passed).toBe(true)
  })

  it('fails the designee travel check when the commitment is absent', () => {
    const p = answeredPlan()
    p.sectionFive.designeesUsed = 'YES'
    expect(run(p).checks.find((x) => x.id === 'designee.travel-consistent')!.passed).toBe(false)
  })
})

describe('determination and banner selection', () => {
  it('BLOCKS when a blocking gap exists and refuses to generate', () => {
    const d = determine(emptyPlan(), emptyProfile())
    expect(d.banner).toBe('BLOCKED')
    expect(d.canGenerate).toBe(false)
    expect(d.bannerRationale).toContain('blocking gaps')
  })

  it('uses the singular when exactly one blocking gap exists', () => {
    const p = answeredPlan()
    p.sectionTwo.facilityCapabilitiesAndExperience = n('')
    const d = determine(p, baseProfile())
    expect(d.gaps.blocking).toHaveLength(1)
    expect(d.bannerRationale).toContain('1 blocking gap prevent')
  })

  it('stamps DRAFTED WITH GAPS when only warnings exist', () => {
    const s = SCENARIOS.find((x) => x.id === 'warnings-thin-narratives')!
    const d = determine(s.plan, s.profile)
    expect(d.banner).toBe('DRAFTED WITH GAPS')
    expect(d.canGenerate).toBe(true)
  })

  it('stamps DRAFTED WITH GAPS when a consistency check fails with no warnings', () => {
    const s = SCENARIOS.find((x) => x.id === 'high-risk-critical-characteristics')!
    const plan = {
      ...s.plan,
      sectionOne: { ...s.plan.sectionOne, facilityAddress: 'Lot 14, Senai, Johor' },
    }
    const d = determine(plan, s.profile)
    expect(d.validation.passed).toBe(false)
    expect(d.banner).toBe('DRAFTED WITH GAPS')
    expect(d.bannerRationale).toContain('consistency check')
  })

  it('stamps DRAFT — INTERNAL REVIEW ONLY on a clean plan, and still defers to the FAA', () => {
    const s = SCENARIOS.find((x) => x.id === 'high-risk-critical-characteristics')!
    const d = determine(s.plan, s.profile)
    expect(d.banner).toBe('DRAFT — INTERNAL REVIEW ONLY')
    expect(d.bannerRationale).toContain('determination for the FAA managing office')
  })

  it('uses the singular for exactly one warning and one failed check', () => {
    const p = answeredPlan()
    // One warning: the CPL answer has no stated basis.
    p.sectionTwo.cplBasis = n('')
    // One failed check: the address omits the stated country.
    p.sectionOne.facilityAddress = 'Lot 14, Senai, Johor'
    const d = determine(p, baseProfile())
    expect(d.gaps.warnings).toHaveLength(1)
    expect(d.validation.failed).toHaveLength(1)
    expect(d.bannerRationale).toContain('1 warning and 1 failed consistency check.')
  })

  it('uses the plural for several warnings and several failed checks', () => {
    const p = answeredPlan()
    p.sectionTwo.cplBasis = n('')
    p.sectionOne.facilityAddress = 'Lot 14, Senai, Johor'
    p.sectionOne.bilateralCountry = 'UNANSWERED'
    // Claimed but undescribed — a second failed consistency check, not a gap.
    p.sectionOne.caaProductionApprovalHeld = 'YES'
    const d = determine(p, baseProfile())
    expect(d.gaps.warnings.length).toBeGreaterThan(1)
    expect(d.validation.failed.length).toBeGreaterThan(1)
    expect(d.bannerRationale).toContain('warnings and')
    expect(d.bannerRationale).toContain('consistency checks.')
  })

  it('never produces a banner outside the permitted set', () => {
    for (const s of SCENARIOS) {
      expect(isAllowedBanner(determine(s.plan, s.profile).banner)).toBe(true)
    }
  })
})

describe('fixtures behave as documented', () => {
  it('covers all eight scenarios with unique ids', () => {
    expect(SCENARIOS).toHaveLength(8)
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(8)
  })

  for (const s of SCENARIOS) {
    it(`${s.id}: routes ${s.expectedRouting} and banners ${s.expectedBanner}`, () => {
      const d = determine(s.plan, s.profile)
      expect(d.risk.routing).toBe(s.expectedRouting)
      expect(d.banner).toBe(s.expectedBanner)
    })
  }

  it('covers every routing outcome that can be reached with complete answers', () => {
    const routings = new Set(SCENARIOS.map((s) => s.expectedRouting))
    expect(routings).toContain('FULL_PROJECT_PLAN')
    expect(routings).toContain('INITIAL_NOTIFICATION')
  })

  it('covers all three banner values', () => {
    expect(new Set(SCENARIOS.map((s) => s.expectedBanner)).size).toBe(3)
  })
})

describe('determinism', () => {
  it('produces identical output across repeated runs of every scenario', () => {
    for (const s of SCENARIOS) {
      const first = JSON.stringify(determine(s.plan, s.profile))
      for (let i = 0; i < 25; i++) {
        expect(JSON.stringify(determine(s.plan, s.profile))).toBe(first)
      }
    }
  })

  it('produces identical output from separately constructed but equal inputs', () => {
    // Guards against any hidden dependence on object identity or insertion order.
    const a = determine(answeredPlan(), baseProfile())
    const b = determine(answeredPlan(), baseProfile())
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
