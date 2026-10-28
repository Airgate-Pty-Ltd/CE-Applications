import type { Answer } from '../schema/common.ts'
import { isEmpty } from '../schema/common.ts'
import {
  HIGH_RISK_TRIGGER_LABELS,
  type HighRiskTriggers,
  type ProjectPlan,
} from '../schema/plan.ts'
import { TraceLog, type RuleTrace } from './trace.ts'

/**
 * AC 21-55 Section 2 risk determination and the routing that follows from it.
 *
 * Deterministic and pure: identical input produces byte-identical output,
 * including the trace and the rationale strings. No clock, no randomness, no
 * network, no LLM.
 */

export type Routing = 'FULL_PROJECT_PLAN' | 'INITIAL_NOTIFICATION' | 'INDETERMINATE'

export interface RiskDetermination {
  /** Section 2 item 1 — the PAH's answer, never the application's. */
  readonly cplListed: Answer
  readonly cplRationale: string

  /** Section 2 item 2 — the PAH's recorded answer. Authoritative. */
  readonly highRisk: Answer
  readonly highRiskRationale: string
  /** What the elicitation triggers suggest. Advisory only. */
  readonly highRiskSuggested: Answer
  /** Which triggers fired, in declaration order. */
  readonly firedTriggers: readonly (keyof HighRiskTriggers)[]
  /** True when the recorded answer contradicts the triggers. */
  readonly highRiskContradictsTriggers: boolean

  /** Section 2 item 4. */
  readonly fullyInspectable: Answer
  readonly inspectabilityRationale: string

  /** AC §8 — critical characteristics needing close control force a full plan. */
  readonly criticalCharacteristicsPresent: boolean

  readonly routing: Routing
  readonly routingRationale: string

  readonly trace: readonly RuleTrace[]
}

/**
 * Fixed evaluation order. Object key order would work in practice but is not a
 * guarantee worth resting determinism on, and the dashboard displays these in
 * the order they are listed here.
 */
const TRIGGER_ORDER = [
  'keyOrCriticalCharacteristics',
  'hundredPercentVerification',
  'functionalAcceptanceTest',
  'esdSensitiveElectronicsOrPcba',
  'specialProcess',
  'controlledInterfaceTorqueOrMaterial',
] as const satisfies readonly (keyof HighRiskTriggers)[]

/**
 * Join reasons into a readable clause. Exported so it can be tested directly:
 * it feeds every rationale string the FAA reader sees, and its edge cases are
 * not all reachable through the rule paths that call it.
 *
 * Written without indexed access so there are no unreachable defensive branches
 * to leave permanently uncovered.
 */
export function joinWithAnd(items: readonly string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join('; ')}; and ${items.slice(-1).join('')}`
}

export function determineRisk(plan: ProjectPlan): RiskDetermination {
  const log = new TraceLog()
  const s2 = plan.sectionTwo

  // ---- Section 2 item 1: Certified Products List ------------------------
  //
  // The application never asserts CPL status. The CPL is a live FAA document;
  // a copy embedded here would go stale silently, and a wrong answer routes the
  // entire plan incorrectly. The PAH answers, and states the basis.
  const cplListed = s2.cplListed
  log.test(
    'cpl.answered',
    'The PAH has answered whether the articles or processes are listed on the CPL',
    { cplListed },
    cplListed !== 'UNANSWERED',
    'AC 21-55 §7.2.1',
  )
  const cplBasisGiven = log.test(
    'cpl.basis-stated',
    'The PAH has stated the basis for their CPL answer',
    { cplBasis: s2.cplBasis.text },
    !isEmpty(s2.cplBasis),
    'AC 21-55 §7.2.1',
  )

  const cplRationale =
    cplListed === 'UNANSWERED'
      ? 'Not yet answered. The PAH must check the current FAA Category Parts List and record the result.'
      : `The PAH answered "${cplListed === 'YES' ? 'Yes' : 'No'}" against the FAA Category Parts List. ` +
        (cplBasisGiven
          ? `Stated basis: ${s2.cplBasis.text.trim()}`
          : 'No basis for this answer has been stated.')

  // ---- Section 2 item 2: high risk --------------------------------------
  //
  // AC §7.2.2 asks whether the PAH identifies the articles as high-risk "in the
  // design data". The determination belongs to the PAH; the AC supplies no
  // checklist. The triggers below are an elicitation aid that produces a
  // SUGGESTION and a rationale. The PAH's recorded answer stays authoritative,
  // and a contradiction is surfaced rather than overridden — an FAA reviewer
  // reads the same design data and will ask about it.
  const firedTriggers: (keyof HighRiskTriggers)[] = []
  for (const key of TRIGGER_ORDER) {
    const fired = log.test(
      `high-risk.trigger.${key}`,
      `Risk indicator: ${HIGH_RISK_TRIGGER_LABELS[key]}`,
      { [key]: s2.highRiskTriggers[key] },
      s2.highRiskTriggers[key],
      'AC 21-55 §7.2.2',
    )
    if (fired) firedTriggers.push(key)
  }

  const highRiskSuggested: Answer = firedTriggers.length > 0 ? 'YES' : 'NO'
  log.record({
    id: 'high-risk.suggested',
    description: 'Suggested high-risk answer, from the risk indicators above',
    inputs: { firedTriggerCount: firedTriggers.length },
    output: highRiskSuggested,
    fired: highRiskSuggested === 'YES',
    citation: 'AC 21-55 §7.2.2',
  })

  const highRisk = s2.pahIdentifiedHighRisk
  const highRiskContradictsTriggers = log.test(
    'high-risk.contradiction',
    'The recorded high-risk answer contradicts the risk indicators that fired',
    { recorded: highRisk, suggested: highRiskSuggested },
    highRisk === 'NO' && highRiskSuggested === 'YES',
    'AC 21-55 §7.2.2',
  )

  const triggerPhrases = firedTriggers.map((k) => HIGH_RISK_TRIGGER_LABELS[k])
  let highRiskRationale: string
  if (highRisk === 'UNANSWERED') {
    highRiskRationale =
      firedTriggers.length > 0
        ? `Not yet answered. ${firedTriggers.length} risk indicator${firedTriggers.length === 1 ? '' : 's'} ` +
          `suggest the answer is Yes: ${joinWithAnd(triggerPhrases)}.`
        : 'Not yet answered. No risk indicators have been selected.'
  } else if (highRisk === 'YES') {
    highRiskRationale =
      firedTriggers.length > 0
        ? `The PAH identified the articles as high-risk in the design data, consistent with ${firedTriggers.length} ` +
          `risk indicator${firedTriggers.length === 1 ? '' : 's'}: ${joinWithAnd(triggerPhrases)}.`
        : 'The PAH identified the articles as high-risk in the design data. No risk indicators were selected, ' +
          'so the rationale rests on the design data alone and should be stated explicitly in Section 2 item 3.'
  } else {
    highRiskRationale = highRiskContradictsTriggers
      ? `The PAH answered "No", but ${firedTriggers.length} risk indicator${firedTriggers.length === 1 ? '' : 's'} ` +
        `fired: ${joinWithAnd(triggerPhrases)}. An FAA reviewer reads the same design data. ` +
        'Either the answer or the indicators should be revisited before submission.'
      : 'The PAH did not identify the articles as high-risk in the design data, and no risk indicators fired.'
  }

  // ---- AC §8: critical characteristics force a full plan ------------------
  const criticalCharacteristicsPresent = log.test(
    'critical-characteristics.present',
    'The PAH has identified critical characteristics that must be closely controlled',
    { keyOrCriticalCharacteristics: s2.highRiskTriggers.keyOrCriticalCharacteristics },
    s2.highRiskTriggers.keyOrCriticalCharacteristics,
    'AC 21-55 §8',
  )

  // ---- Section 2 item 4: inspectable upon receipt -------------------------
  //
  // AC §7.2.3: inspectable means conformity to type design can be determined
  // without disassembly, and "any completed assembly is generally not considered
  // inspectable upon receipt."
  const fullyInspectable = s2.fullyInspectableOnReceipt
  const uninspectableNamed = log.test(
    'inspectability.characteristics-named',
    'Where not fully inspectable, the un-inspectable critical characteristics are named',
    { uninspectableCharacteristics: s2.uninspectableCharacteristics.text },
    !isEmpty(s2.uninspectableCharacteristics),
    'AC 21-55 §7.2.3',
  )

  let inspectabilityRationale: string
  if (fullyInspectable === 'UNANSWERED') {
    inspectabilityRationale =
      'Not yet answered. Conformity to type design must be determinable without disassembly for the ' +
      'answer to be Yes; a completed assembly is generally not fully inspectable upon receipt.'
  } else if (fullyInspectable === 'YES') {
    inspectabilityRationale =
      'The PAH states conformity to type design can be determined on receipt without disassembly.'
  } else {
    inspectabilityRationale = uninspectableNamed
      ? 'The articles are not fully inspectable upon receipt. The characteristics that cannot be verified ' +
        'after receipt are named, which is the justification the FAA looks for when assessing source inspection.'
      : 'The articles are not fully inspectable upon receipt, but the characteristics that cannot be verified ' +
        'after receipt have not been named. AC 21-55 §7.2.3 requires them to be identified.'
  }

  // ---- Routing (AC §7 and §8) --------------------------------------------
  const risksAnswered = log.test(
    'routing.inputs-answered',
    'Both routing inputs (CPL listing and high-risk) have been answered',
    { cplListed, highRisk },
    cplListed !== 'UNANSWERED' && highRisk !== 'UNANSWERED',
    'AC 21-55 §8',
  )

  const forcesFullPlan = log.test(
    'routing.forces-full-plan',
    'CPL listing, high-risk, or critical characteristics require a full project plan',
    { cplListed, highRisk, criticalCharacteristicsPresent },
    cplListed === 'YES' || highRisk === 'YES' || criticalCharacteristicsPresent,
    'AC 21-55 §8',
  )

  let routing: Routing
  let routingRationale: string

  if (forcesFullPlan) {
    routing = 'FULL_PROJECT_PLAN'
    const reasons: string[] = []
    if (cplListed === 'YES') reasons.push('the articles or processes are listed on the CPL')
    if (highRisk === 'YES') reasons.push('the PAH identified the articles as high-risk')
    if (criticalCharacteristicsPresent)
      reasons.push('the PAH identified critical characteristics requiring close control')
    routingRationale =
      `A full project plan is required because ${joinWithAnd(reasons)} (AC 21-55 §8). ` +
      'Sections 1 through 5 must be completed.'
  } else if (risksAnswered) {
    routing = 'INITIAL_NOTIFICATION'
    routingRationale =
      'The articles are not on the CPL, were not identified as high-risk, and no critical characteristics ' +
      'requiring close control were identified. An initial notification of Sections 1 and 2 may therefore ' +
      'suffice (AC 21-55 §7). The FAA managing office reviews Sections 1 and 2 and decides whether a full ' +
      'project plan is required — that decision is theirs, not this document’s.'
  } else {
    routing = 'INDETERMINATE'
    const unanswered: string[] = []
    if (cplListed === 'UNANSWERED') unanswered.push('CPL listing (Section 2 item 1)')
    if (highRisk === 'UNANSWERED') unanswered.push('high-risk identification (Section 2 item 2)')
    routingRationale = `Routing cannot be determined until ${joinWithAnd(unanswered)} ${
      unanswered.length === 1 ? 'is' : 'are'
    } answered.`
  }

  log.record({
    id: 'routing.outcome',
    description: 'Routing outcome',
    inputs: { cplListed, highRisk, criticalCharacteristicsPresent },
    output: routing,
    fired: true,
    citation: 'AC 21-55 §7, §8',
  })

  return {
    cplListed,
    cplRationale,
    highRisk,
    highRiskRationale,
    highRiskSuggested,
    firedTriggers,
    highRiskContradictsTriggers,
    fullyInspectable,
    inspectabilityRationale,
    criticalCharacteristicsPresent,
    routing,
    routingRationale,
    trace: log.toArray(),
  }
}
