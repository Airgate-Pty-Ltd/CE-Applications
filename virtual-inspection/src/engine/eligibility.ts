import type { Article, ArticleClassification, CalibratedTool, MaintenanceProvenance } from '../schema/article.ts'
import type { CustomerConfig } from '../schema/config.ts'
import type { LocationRosterRevision, PersonnelRosterRevision } from '../schema/roster.ts'
import type { IsoDateTime } from '../schema/primitives.ts'

/**
 * The eligibility gate. Runs before a session can be scheduled.
 *
 * This is the feature that protects the customer, so it is written to be read
 * by someone who is not a programmer: every rule states why it exists and what
 * it observed, whether or not it fired, and the whole evaluation is returned
 * rather than only the failures. Test-dashboard panel 2 renders it verbatim.
 *
 * Pure. No I/O, no clock - `now` is an input, which is also what makes the
 * determinism check in panel 4 meaningful.
 */

/**
 * A complete type-certificated product.
 *
 * 14 CFR 21.1 defines a product as an aircraft, aircraft engine, or propeller.
 * The build prompt names aircraft and engines; propellers are included because
 * the restriction being mirrored attaches to a complete **product**. Removing
 * the propeller entry reverses that decision and nothing else moves. See
 * REGULATORY-SOURCES.md, decision 1.
 */
export const COMPLETE_PRODUCT_CLASSES: readonly ArticleClassification[] = [
  'COMPLETE_AIRCRAFT',
  'COMPLETE_AIRCRAFT_ENGINE',
  'COMPLETE_PROPELLER',
]

export interface EligibilityHistory {
  priorCompletedSessionsAtLocation: number
  priorCompletedSessionsWithPresenter: number
  /** Null when this article has never been the subject of a completed session. */
  articleConfigurationVersionAtLastSession: string | null
}

export interface EligibilityInput {
  now: IsoDateTime
  article: Article
  provenance: MaintenanceProvenance
  inspectorPersonId: string
  presenterPersonId: string
  locationId: string
  personnelRoster: PersonnelRosterRevision
  locationRoster: LocationRosterRevision
  tools: CalibratedTool[]
  config: CustomerConfig
  history: EligibilityHistory
}

export type RuleSource = 'SPEC' | 'BUILD'

export interface RuleEvaluation {
  ruleId: string
  severity: 'BLOCK' | 'WARN'
  title: string
  /** Why the rule exists. Constant. */
  rationale: string
  /** What was observed on this input. Varies. */
  detail: string
  fired: boolean
  /**
   * SPEC rules come from build prompt section 2.1 verbatim. BUILD rules were
   * added by the build and are marked so they can be challenged on review
   * rather than mistaken for a stated requirement.
   */
  source: RuleSource
}

export interface EligibilityResult {
  decision: 'CLEAR' | 'PROCEED_WITH_WARNINGS' | 'BLOCKED'
  blocks: RuleEvaluation[]
  warnings: RuleEvaluation[]
  /** Every rule, fired or not, in declaration order. */
  evaluated: RuleEvaluation[]
}

interface Rule {
  ruleId: string
  severity: 'BLOCK' | 'WARN'
  title: string
  rationale: string
  source: RuleSource
  evaluate: (input: EligibilityInput) => { fired: boolean; detail: string }
}

const dayOf = (iso: IsoDateTime): string => iso.slice(0, 10)

const RULES: Rule[] = [
  {
    ruleId: 'article-is-complete-type-certificated-product',
    severity: 'BLOCK',
    title: 'Article classified as a complete type-certificated product',
    rationale:
      'The contract-maintenance restriction in 14 CFR 145.217 attaches to a complete type-certificated product. The configured policy for this article class is to stop before scheduling. The operator classified the article; the app records the stop and draws no conclusion about what any regulation permits.',
    source: 'SPEC',
    evaluate: ({ article }) => ({
      fired: COMPLETE_PRODUCT_CLASSES.includes(article.classification),
      detail: `Article classification is ${article.classification}. Classes treated as complete products: ${COMPLETE_PRODUCT_CLASSES.join(', ')}.`,
    }),
  },
  {
    ruleId: 'inspector-not-on-personnel-roster',
    severity: 'BLOCK',
    title: 'Inspector is not on the authorised personnel roster',
    rationale:
      'Conformity authority is exercised only by personnel the organisation has authorised. A session run by someone absent from the roster produces a record that cannot be traced to an authorisation.',
    source: 'SPEC',
    evaluate: ({ personnelRoster, inspectorPersonId }) => {
      const entry = personnelRoster.entries.find((e) => e.personId === inspectorPersonId)
      if (!entry) {
        return {
          fired: true,
          detail: `Person ${inspectorPersonId} is absent from personnel roster revision ${personnelRoster.revision}.`,
        }
      }
      if (!entry.roles.includes('INSPECTOR')) {
        return {
          fired: true,
          detail: `Person ${inspectorPersonId} is on roster revision ${personnelRoster.revision} but does not hold the INSPECTOR role (holds: ${entry.roles.join(', ')}).`,
        }
      }
      return {
        fired: false,
        detail: `Person ${inspectorPersonId} holds the INSPECTOR role on roster revision ${personnelRoster.revision}.`,
      }
    },
  },
  {
    ruleId: 'inspector-training-currency-lapsed',
    severity: 'BLOCK',
    title: 'Inspector training currency has lapsed',
    rationale:
      'Roster membership without current training is not an authorisation. The roster carries the currency date so a historical record resolves to the currency position as it stood on the day.',
    source: 'SPEC',
    evaluate: ({ personnelRoster, inspectorPersonId, now }) => {
      const entry = personnelRoster.entries.find((e) => e.personId === inspectorPersonId)
      if (!entry) {
        return { fired: false, detail: 'Not evaluated: person is absent from the roster.' }
      }
      const lapsed = dayOf(now) > entry.trainingCurrentUntil
      return {
        fired: lapsed,
        detail: `Training current until ${entry.trainingCurrentUntil}; session date ${dayOf(now)}.`,
      }
    },
  },
  {
    ruleId: 'presenter-not-on-personnel-roster',
    severity: 'BLOCK',
    title: 'Presenter is not on the authorised personnel roster',
    rationale:
      'Added by the build. Section 2.1 names only the inspector, but the record has to resolve who physically handled the article under direction. A presenter absent from the roster leaves that unanswerable, which is the exact question an approval-only challenge turns on.',
    source: 'BUILD',
    evaluate: ({ personnelRoster, presenterPersonId }) => {
      const entry = personnelRoster.entries.find((e) => e.personId === presenterPersonId)
      if (!entry) {
        return {
          fired: true,
          detail: `Person ${presenterPersonId} is absent from personnel roster revision ${personnelRoster.revision}.`,
        }
      }
      if (!entry.roles.includes('PRESENTER')) {
        return {
          fired: true,
          detail: `Person ${presenterPersonId} is on roster revision ${personnelRoster.revision} but does not hold the PRESENTER role (holds: ${entry.roles.join(', ')}).`,
        }
      }
      return {
        fired: false,
        detail: `Person ${presenterPersonId} holds the PRESENTER role on roster revision ${personnelRoster.revision}.`,
      }
    },
  },
  {
    ruleId: 'location-not-on-authorised-locations-roster',
    severity: 'BLOCK',
    title: 'Facility is not on the authorised locations roster',
    rationale:
      'The organisation controls where a remote session may be conducted. An unlisted or withdrawn location has no recorded environmental or access control behind it.',
    source: 'SPEC',
    evaluate: ({ locationRoster, locationId }) => {
      const entry = locationRoster.entries.find((e) => e.locationId === locationId)
      if (!entry) {
        return {
          fired: true,
          detail: `Location ${locationId} is absent from locations roster revision ${locationRoster.revision}.`,
        }
      }
      return {
        fired: !entry.authorised,
        detail: entry.authorised
          ? `Location ${locationId} is authorised on locations roster revision ${locationRoster.revision}.`
          : `Location ${locationId} is present on roster revision ${locationRoster.revision} but its authorisation is withdrawn.`,
      }
    },
  },
  {
    ruleId: 'critical-article-without-recorded-authority-concurrence',
    severity: 'BLOCK',
    title: 'Critical article with no recorded authority concurrence',
    rationale:
      'Where the customer has classed an article critical, the configuration must record that an authority concurrence for critical-article remote inspection exists. The app records whether one is on file. It does not read it, evaluate it, or form a view on its sufficiency.',
    source: 'SPEC',
    evaluate: ({ article, config }) => {
      if (article.criticality !== 'CRITICAL') {
        return { fired: false, detail: 'Article is not classed critical; rule does not apply.' }
      }
      const concurrence = config.criticalArticleAuthorityConcurrence
      return {
        fired: !concurrence.recorded,
        detail: concurrence.recorded
          ? `Authority concurrence recorded under customer reference ${concurrence.reference ?? '(no reference given)'}.`
          : 'Article is classed critical and no authority concurrence is recorded in the customer configuration.',
      }
    },
  },
  {
    ruleId: 'inspector-not-authorised-for-critical-article',
    severity: 'BLOCK',
    title: 'Inspector is not authorised for critical articles',
    rationale:
      'Added by the build. The personnel roster carries a per-person critical-article authorisation; an organisation-level concurrence does not make every inspector individually authorised.',
    source: 'BUILD',
    evaluate: ({ article, personnelRoster, inspectorPersonId }) => {
      if (article.criticality !== 'CRITICAL') {
        return { fired: false, detail: 'Article is not classed critical; rule does not apply.' }
      }
      const entry = personnelRoster.entries.find((e) => e.personId === inspectorPersonId)
      if (!entry) return { fired: false, detail: 'Not evaluated: person is absent from the roster.' }
      return {
        fired: !entry.authorisedForCriticalArticles,
        detail: entry.authorisedForCriticalArticles
          ? `Person ${inspectorPersonId} is authorised for critical articles on roster revision ${personnelRoster.revision}.`
          : `Person ${inspectorPersonId} is not authorised for critical articles on roster revision ${personnelRoster.revision}.`,
      }
    },
  },
  {
    ruleId: 'calibrated-tool-past-due',
    severity: 'BLOCK',
    title: 'A required tool is past its calibration due date',
    rationale:
      'A measurement taken with an out-of-calibration tool is not evidence. The due date is checked at scheduling and the calibration position is snapshotted onto the record at session start, so the record does not depend on today.',
    source: 'SPEC',
    evaluate: ({ tools, now }) => {
      const today = dayOf(now)
      const overdue = tools.filter((t) => t.calibrationDueDate < today)
      return {
        fired: overdue.length > 0,
        detail:
          overdue.length > 0
            ? `Past due on ${today}: ${overdue.map((t) => `${t.toolId} (due ${t.calibrationDueDate})`).join(', ')}.`
            : `All ${tools.length} listed tool(s) are within calibration on ${today}.`,
      }
    },
  },

  // --- warnings -------------------------------------------------------------

  {
    ruleId: 'approval-only-boundary',
    severity: 'WARN',
    title: 'Maintenance performed by a separate certificate holder, involvement limited to release',
    rationale: [
      'This is the exposure the product exists to answer, so it is stated plainly rather than softened.',
      '',
      'The maintenance was performed by a separate certificate holder and this organisation’s recorded involvement is limited to release. A regulator reviewing the arrangement may scrutinise whether it amounts to providing only approval for return to service.',
      '',
      'What answers that reading is evidence, and only evidence: a per-article record of live directed inspection, physical manipulation carried out under the inspector’s direction, documents reviewed on screen, tools used and their calibration position, nonconformances actually raised, and approvals actually withheld where conformity could not be verified.',
      '',
      'This session will capture each of those elements, and the defensibility report will list any it did not capture. Whether the arrangement answers any obligation is not something this product determines.',
    ].join('\n'),
    source: 'SPEC',
    evaluate: ({ provenance }) => ({
      fired:
        provenance.performedBySeparateCertificateHolder &&
        provenance.inspectingOrganisationInvolvement === 'RELEASE_ONLY',
      detail: `Separate certificate holder: ${provenance.performedBySeparateCertificateHolder ? 'yes' : 'no'}. Recorded involvement: ${provenance.inspectingOrganisationInvolvement}.`,
    }),
  },
  {
    ruleId: 'first-session-at-this-facility',
    severity: 'WARN',
    title: 'First remote session at this facility',
    rationale:
      'A facility with no session history has no demonstrated environment, connection quality, or presenter competence. The risk is recorded on the record so a later reviewer can see it was known at the time.',
    source: 'SPEC',
    evaluate: ({ history, locationId }) => ({
      fired: history.priorCompletedSessionsAtLocation === 0,
      detail: `${history.priorCompletedSessionsAtLocation} prior completed session(s) at location ${locationId}.`,
    }),
  },
  {
    ruleId: 'first-session-with-this-presenter',
    severity: 'WARN',
    title: 'First remote session with this presenter',
    rationale:
      'Directed manipulation depends on the presenter following direction precisely. An untested presenter is a recorded risk, not a blocker.',
    source: 'SPEC',
    evaluate: ({ history, presenterPersonId }) => ({
      fired: history.priorCompletedSessionsWithPresenter === 0,
      detail: `${history.priorCompletedSessionsWithPresenter} prior completed session(s) with presenter ${presenterPersonId}.`,
    }),
  },
  {
    ruleId: 'article-configuration-changed-since-last-session',
    severity: 'WARN',
    title: 'Article configuration changed since the last session',
    rationale:
      'A changed configuration means the previous session’s checks may no longer describe this article. The warning exists so the check pack is reconsidered rather than repeated out of habit.',
    source: 'SPEC',
    evaluate: ({ article, history }) => {
      const previous = history.articleConfigurationVersionAtLastSession
      if (previous === null) {
        return { fired: false, detail: 'No previous completed session for this article.' }
      }
      return {
        fired: previous !== article.configurationVersion,
        detail: `Previous session configuration ${previous}; current configuration ${article.configurationVersion}.`,
      }
    },
  },
]

export function evaluateEligibility(input: EligibilityInput): EligibilityResult {
  const evaluated: RuleEvaluation[] = RULES.map((rule) => {
    const { fired, detail } = rule.evaluate(input)
    return {
      ruleId: rule.ruleId,
      severity: rule.severity,
      title: rule.title,
      rationale: rule.rationale,
      source: rule.source,
      detail,
      fired,
    }
  })

  const blocks = evaluated.filter((r) => r.fired && r.severity === 'BLOCK')
  const warnings = evaluated.filter((r) => r.fired && r.severity === 'WARN')

  return {
    decision: blocks.length > 0 ? 'BLOCKED' : warnings.length > 0 ? 'PROCEED_WITH_WARNINGS' : 'CLEAR',
    blocks,
    warnings,
    evaluated,
  }
}

/** Rule metadata without evaluating anything. Used by test-dashboard panel 2. */
export function eligibilityRuleCatalogue(): Array<Omit<RuleEvaluation, 'fired' | 'detail'>> {
  return RULES.map(({ ruleId, severity, title, rationale, source }) => ({
    ruleId,
    severity,
    title,
    rationale,
    source,
  }))
}
