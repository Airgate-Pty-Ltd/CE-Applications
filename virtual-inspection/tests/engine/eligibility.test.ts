import { describe, expect, it } from 'vitest'
import {
  COMPLETE_PRODUCT_CLASSES,
  eligibilityRuleCatalogue,
  evaluateEligibility,
} from '../../src/engine/eligibility.ts'
import {
  INSPECTOR_ID,
  PRESENTER_ID,
  makeArticle,
  makeConfig,
  makeEligibilityInput,
  makeLocationRoster,
  makePersonnelRoster,
  makeProvenance,
  makeTools,
} from '../../src/fixtures/factory.ts'

const fired = (result: ReturnType<typeof evaluateEligibility>, ruleId: string): boolean =>
  result.evaluated.find((r) => r.ruleId === ruleId)?.fired ?? false

describe('eligibility gate', () => {
  it('clears a well-formed session', () => {
    const result = evaluateEligibility(makeEligibilityInput())
    expect(result.decision).toBe('CLEAR')
    expect(result.blocks).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('returns every rule whether or not it fired, so the evaluation can be shown in full', () => {
    const result = evaluateEligibility(makeEligibilityInput())
    expect(result.evaluated.length).toBe(eligibilityRuleCatalogue().length)
    expect(result.evaluated.every((r) => r.detail.length > 0)).toBe(true)
  })

  it('marks which rules came from the specification and which the build added', () => {
    const catalogue = eligibilityRuleCatalogue()
    expect(catalogue.filter((r) => r.source === 'SPEC').length).toBeGreaterThan(0)
    expect(catalogue.filter((r) => r.source === 'BUILD').map((r) => r.ruleId).sort()).toEqual([
      'inspector-not-authorised-for-critical-article',
      'presenter-not-on-personnel-roster',
    ])
  })
})

describe('hard blocks', () => {
  for (const classification of COMPLETE_PRODUCT_CLASSES) {
    it(`blocks a ${classification}`, () => {
      const result = evaluateEligibility(
        makeEligibilityInput({ article: makeArticle({ classification }) }),
      )
      expect(result.decision).toBe('BLOCKED')
      expect(fired(result, 'article-is-complete-type-certificated-product')).toBe(true)
    })
  }

  for (const classification of ['COMPONENT_PART', 'APPLIANCE', 'AIRFRAME'] as const) {
    it(`does not block a ${classification}`, () => {
      const result = evaluateEligibility(
        makeEligibilityInput({ article: makeArticle({ classification }) }),
      )
      expect(fired(result, 'article-is-complete-type-certificated-product')).toBe(false)
    })
  }

  it('states the complete-product block without asserting what a regulation permits', () => {
    const result = evaluateEligibility(
      makeEligibilityInput({ article: makeArticle({ classification: 'COMPLETE_AIRCRAFT' }) }),
    )
    const rule = result.blocks.find((r) => r.ruleId === 'article-is-complete-type-certificated-product')
    expect(rule?.rationale).toContain('draws no conclusion')
    expect(rule?.rationale).not.toMatch(/prohibit|not permitted|illegal/i)
  })

  it('blocks an inspector who is absent from the roster', () => {
    const result = evaluateEligibility(makeEligibilityInput({ inspectorPersonId: 'PER-9999' }))
    expect(fired(result, 'inspector-not-on-personnel-roster')).toBe(true)
    expect(result.decision).toBe('BLOCKED')
  })

  it('blocks a roster member who does not hold the inspector role', () => {
    const result = evaluateEligibility(makeEligibilityInput({ inspectorPersonId: PRESENTER_ID }))
    expect(fired(result, 'inspector-not-on-personnel-roster')).toBe(true)
  })

  it('does not evaluate training currency for someone absent from the roster', () => {
    const result = evaluateEligibility(makeEligibilityInput({ inspectorPersonId: 'PER-9999' }))
    expect(fired(result, 'inspector-training-currency-lapsed')).toBe(false)
  })

  it('blocks lapsed training currency, and treats the last day as still current', () => {
    const roster = makePersonnelRoster()
    const withDate = (date: string) => ({
      ...roster,
      entries: roster.entries.map((e) =>
        e.personId === INSPECTOR_ID ? { ...e, trainingCurrentUntil: date } : e,
      ),
    })

    // Session date is 2026-07-24.
    expect(
      fired(evaluateEligibility(makeEligibilityInput({ personnelRoster: withDate('2026-07-24') })), 'inspector-training-currency-lapsed'),
    ).toBe(false)
    expect(
      fired(evaluateEligibility(makeEligibilityInput({ personnelRoster: withDate('2026-07-23') })), 'inspector-training-currency-lapsed'),
    ).toBe(true)
  })

  it('blocks a presenter absent from the roster, and one without the presenter role', () => {
    expect(
      fired(evaluateEligibility(makeEligibilityInput({ presenterPersonId: 'PER-9999' })), 'presenter-not-on-personnel-roster'),
    ).toBe(true)
    expect(
      fired(evaluateEligibility(makeEligibilityInput({ presenterPersonId: INSPECTOR_ID })), 'presenter-not-on-personnel-roster'),
    ).toBe(true)
  })

  it('blocks an unlisted location and a location whose authorisation was withdrawn', () => {
    expect(
      fired(evaluateEligibility(makeEligibilityInput({ locationId: 'SITE-Z' })), 'location-not-on-authorised-locations-roster'),
    ).toBe(true)
    expect(
      fired(
        evaluateEligibility(makeEligibilityInput({ locationId: 'SITE-B', locationRoster: makeLocationRoster() })),
        'location-not-on-authorised-locations-roster',
      ),
    ).toBe(true)
  })

  it('blocks a critical article with no recorded authority concurrence', () => {
    const result = evaluateEligibility(
      makeEligibilityInput({ article: makeArticle({ criticality: 'CRITICAL' }) }),
    )
    expect(fired(result, 'critical-article-without-recorded-authority-concurrence')).toBe(true)
  })

  it('clears a critical article once a concurrence is recorded and the inspector is authorised', () => {
    const result = evaluateEligibility(
      makeEligibilityInput({
        article: makeArticle({ criticality: 'CRITICAL' }),
        config: makeConfig({
          criticalArticleAuthorityConcurrence: { recorded: true, reference: 'CUST-REF-01' },
        }),
      }),
    )
    expect(result.decision).toBe('CLEAR')
  })

  it('blocks a critical article when the inspector is not individually authorised for it', () => {
    const roster = makePersonnelRoster()
    const result = evaluateEligibility(
      makeEligibilityInput({
        article: makeArticle({ criticality: 'CRITICAL' }),
        config: makeConfig({ criticalArticleAuthorityConcurrence: { recorded: true } }),
        personnelRoster: {
          ...roster,
          entries: roster.entries.map((e) =>
            e.personId === INSPECTOR_ID ? { ...e, authorisedForCriticalArticles: false } : e,
          ),
        },
      }),
    )
    expect(fired(result, 'inspector-not-authorised-for-critical-article')).toBe(true)
  })

  it('does not evaluate the critical-article rules for a non-critical article', () => {
    const result = evaluateEligibility(makeEligibilityInput())
    expect(fired(result, 'critical-article-without-recorded-authority-concurrence')).toBe(false)
    expect(fired(result, 'inspector-not-authorised-for-critical-article')).toBe(false)
  })

  it('blocks a tool past its calibration due date, and treats the due date itself as current', () => {
    expect(
      fired(evaluateEligibility(makeEligibilityInput({ tools: makeTools([{ calibrationDueDate: '2026-07-24' }]) })), 'calibrated-tool-past-due'),
    ).toBe(false)
    expect(
      fired(evaluateEligibility(makeEligibilityInput({ tools: makeTools([{ calibrationDueDate: '2026-07-23' }]) })), 'calibrated-tool-past-due'),
    ).toBe(true)
  })

  it('reports every past-due tool, not only the first', () => {
    const result = evaluateEligibility(
      makeEligibilityInput({
        tools: makeTools([{ calibrationDueDate: '2026-01-01' }, { calibrationDueDate: '2026-02-01' }]),
      }),
    )
    const rule = result.blocks.find((r) => r.ruleId === 'calibrated-tool-past-due')
    expect(rule?.detail).toContain('TOOL-0001')
    expect(rule?.detail).toContain('TOOL-0002')
  })
})

describe('warnings', () => {
  it('warns on the approval-only boundary and proceeds', () => {
    const result = evaluateEligibility(
      makeEligibilityInput({
        provenance: makeProvenance({
          performedBySeparateCertificateHolder: true,
          inspectingOrganisationInvolvement: 'RELEASE_ONLY',
        }),
      }),
    )
    expect(result.decision).toBe('PROCEED_WITH_WARNINGS')
    const warning = result.warnings.find((r) => r.ruleId === 'approval-only-boundary')
    expect(warning).toBeDefined()
    // It must name the exposure, name the evidence that answers it, and stop short
    // of telling the user where they stand.
    expect(warning!.rationale).toContain('scrutinise')
    expect(warning!.rationale).toContain('withheld')
    expect(warning!.rationale).toContain('not something this product determines')
  })

  it('does not warn when a separate certificate holder did the work but involvement went further than release', () => {
    const result = evaluateEligibility(
      makeEligibilityInput({
        provenance: makeProvenance({
          performedBySeparateCertificateHolder: true,
          inspectingOrganisationInvolvement: 'PERFORMED_OR_DIRECTED_WORK',
        }),
      }),
    )
    expect(result.decision).toBe('CLEAR')
  })

  it('warns on a first session at a facility and with a presenter', () => {
    const result = evaluateEligibility(
      makeEligibilityInput({
        history: {
          priorCompletedSessionsAtLocation: 0,
          priorCompletedSessionsWithPresenter: 0,
          articleConfigurationVersionAtLastSession: null,
        },
      }),
    )
    expect(fired(result, 'first-session-at-this-facility')).toBe(true)
    expect(fired(result, 'first-session-with-this-presenter')).toBe(true)
    expect(fired(result, 'article-configuration-changed-since-last-session')).toBe(false)
  })

  it('warns when the article configuration changed since the last session', () => {
    const result = evaluateEligibility(
      makeEligibilityInput({
        history: {
          priorCompletedSessionsAtLocation: 4,
          priorCompletedSessionsWithPresenter: 4,
          articleConfigurationVersionAtLastSession: 'CFG-PRIOR',
        },
      }),
    )
    expect(fired(result, 'article-configuration-changed-since-last-session')).toBe(true)
  })

  it('a block outranks a warning in the overall decision', () => {
    const result = evaluateEligibility(
      makeEligibilityInput({
        article: makeArticle({ classification: 'COMPLETE_AIRCRAFT' }),
        provenance: makeProvenance({
          performedBySeparateCertificateHolder: true,
          inspectingOrganisationInvolvement: 'RELEASE_ONLY',
        }),
      }),
    )
    expect(result.decision).toBe('BLOCKED')
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})

describe('determinism', () => {
  it('produces byte-identical output for identical input', () => {
    const input = makeEligibilityInput()
    const first = JSON.stringify(evaluateEligibility(input))
    for (let i = 0; i < 100; i++) {
      expect(JSON.stringify(evaluateEligibility(input))).toBe(first)
    }
  })
})
