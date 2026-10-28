import { isEmpty, isThin, THIN_NARRATIVE_CHARS, type Narrative } from '../schema/common.ts'
import type { ProjectPlan, SectionThree, SectionFour } from '../schema/plan.ts'
import { REQUIRED_PROFILE_FIELDS, type OrganizationProfile } from '../schema/profile.ts'
import type { RiskDetermination } from './risk.ts'
import { TraceLog, type RuleTrace } from './trace.ts'

/**
 * Gap classification.
 *
 * BLOCKING halts generation outright. The application refuses to emit a document
 * and states what is required to proceed — because a plan missing one of these
 * is not an incomplete draft, it is a submission that will be returned.
 *
 * WARNING generates, but stamps the document DRAFTED WITH GAPS.
 * INFO is guidance and does not change the banner.
 */
export type Severity = 'BLOCKING' | 'WARNING' | 'INFO'

export interface Gap {
  readonly id: string
  readonly severity: Severity
  /** Where in Appendix A this belongs, e.g. "Section 2 item 4". */
  readonly location: string
  readonly title: string
  /** What is wrong. */
  readonly detail: string
  /** What the user must do. */
  readonly remedy: string
  readonly citation?: string
}

export interface GapReport {
  readonly gaps: readonly Gap[]
  readonly blocking: readonly Gap[]
  readonly warnings: readonly Gap[]
  readonly info: readonly Gap[]
  readonly canGenerate: boolean
  readonly trace: readonly RuleTrace[]
}

const SEVERITY_ORDER: Record<Severity, number> = { BLOCKING: 0, WARNING: 1, INFO: 2 }

/** Narratives required whenever a full project plan is routed (AC §8.1, §8.2). */
const FULL_PLAN_NARRATIVES: readonly {
  key: keyof SectionThree | keyof SectionFour
  section: 'sectionThree' | 'sectionFour'
  location: string
  title: string
  citation: string
}[] = [
  { key: 'nonconformanceReporting', section: 'sectionThree', location: 'Section 3 item 1', title: 'Nonconformance and quality escape reporting', citation: 'AC 21-55 §8.1.1' },
  { key: 'subtierControl', section: 'sectionThree', location: 'Section 3 item 2', title: 'Use and control of subtier suppliers', citation: 'AC 21-55 §8.1.2' },
  { key: 'faaChangeNotification', section: 'sectionThree', location: 'Section 3 item 3', title: 'Notifying the FAA of changes to the risk level', citation: 'AC 21-55 §8.1.3' },
  { key: 'processChangeControl', section: 'sectionThree', location: 'Section 3 item 4', title: 'Control of process changes affecting conformity', citation: 'AC 21-55 §8.1.4' },
  { key: 'designChangeControl', section: 'sectionThree', location: 'Section 3 item 5', title: 'Control of major and minor design changes', citation: 'AC 21-55 §8.1.5' },
  { key: 'qualityFlowdown', section: 'sectionThree', location: 'Section 3 item 6', title: 'Quality flowdown requirements', citation: 'AC 21-55 §8.1.6' },
  { key: 'auditProcess', section: 'sectionThree', location: 'Section 3 item 7', title: 'PAH audit process for the facility', citation: 'AC 21-55 §8.1.7' },
  { key: 'approvalResults', section: 'sectionFour', location: 'Section 4 item 1', title: 'Results of the facility approval process', citation: 'AC 21-55 §8.2.1' },
  { key: 'personnelCompetence', section: 'sectionFour', location: 'Section 4 item 2', title: 'Personnel competence and qualifications', citation: 'AC 21-55 §8.2.2' },
  { key: 'specializedTraining', section: 'sectionFour', location: 'Section 4 item 3', title: 'Specialized training required', citation: 'AC 21-55 §8.2.2' },
  { key: 'inspectionQualifications', section: 'sectionFour', location: 'Section 4 item 4', title: 'Qualifications for inspection and special processes', citation: 'AC 21-55 §8.2.3' },
  { key: 'subtierApprovalProcess', section: 'sectionFour', location: 'Section 4 item 6', title: 'Approval process for subtier suppliers', citation: 'AC 21-55 §8.2.5' },
]

export function analyseGaps(
  plan: ProjectPlan,
  profile: OrganizationProfile,
  risk: RiskDetermination,
): GapReport {
  const log = new TraceLog()
  const gaps: Gap[] = []
  const add = (g: Gap): void => {
    gaps.push(g)
  }

  const s1 = plan.sectionOne
  const s2 = plan.sectionTwo
  const s4 = plan.sectionFour
  const s5 = plan.sectionFive
  const fullPlan = risk.routing === 'FULL_PROJECT_PLAN'

  // ---- Identity of the applicant and the facility -------------------------
  for (const field of REQUIRED_PROFILE_FIELDS) {
    const missing = log.test(
      `profile.${field}`,
      `Organization Profile field "${field}" is populated`,
      { [field]: profile[field] },
      profile[field].trim().length === 0,
    )
    if (missing) {
      add({
        id: `profile.${field}`,
        severity: 'BLOCKING',
        location: 'Appendix A header',
        title: 'The applicant cannot be identified',
        detail: `The Organization Profile field "${field}" is empty. Appendix A opens with the PAH's identity, and a plan that does not identify its applicant cannot be acted on.`,
        remedy: 'Complete the Organization Profile before generating.',
        citation: 'AC 21-55 Appendix A',
      })
    }
  }

  if (
    log.test('facility.name', 'The facility is named', { facilityName: s1.facilityName }, s1.facilityName.trim().length === 0)
  ) {
    add({
      id: 'facility.name',
      severity: 'BLOCKING',
      location: 'Section 1 item 1',
      title: 'The manufacturing facility is not named',
      detail: 'Section 1 item 1 asks for the name and location of the proposed manufacturing facility.',
      remedy: 'Enter the legal name of the facility.',
      citation: 'AC 21-55 §7.1.1',
    })
  }

  if (
    log.test('facility.country', 'The facility country is stated', { facilityCountry: s1.facilityCountry }, s1.facilityCountry.trim().length === 0)
  ) {
    add({
      id: 'facility.country',
      severity: 'BLOCKING',
      location: 'Section 1 item 1',
      title: 'The facility country is not stated',
      detail:
        'Section 1 item 1 requires the location including country. The country determines whether a bilateral agreement applies, which in turn determines whether Section 4 item 8 is required. Without it the plan cannot be assessed.',
      remedy: 'Enter the country in which the facility is located.',
      citation: 'AC 21-55 §7.1.2',
    })
  }

  if (
    log.test('facility.address', 'The facility address is stated', { facilityAddress: s1.facilityAddress }, s1.facilityAddress.trim().length === 0)
  ) {
    add({
      id: 'facility.address',
      severity: 'WARNING',
      location: 'Section 1 item 1',
      title: 'The facility address is incomplete',
      detail: 'The country is recorded but the street address is not.',
      remedy: 'Enter the full address of the facility.',
      citation: 'AC 21-55 §7.1.2',
    })
  }

  // ---- Articles -----------------------------------------------------------
  const namedArticles = s1.articles.filter((a) => a.name.trim().length > 0)
  if (log.test('articles.present', 'At least one article is identified', { count: namedArticles.length }, namedArticles.length === 0)) {
    add({
      id: 'articles.present',
      severity: 'BLOCKING',
      location: 'Section 1 item 3',
      title: 'No product or article is identified',
      detail:
        'Section 1 item 3 asks for the names and model numbers of the products or articles. The risk determination in Section 2 is made about specific articles; with none identified there is nothing to determine.',
      remedy: 'Add at least one article with its name and model number.',
      citation: 'AC 21-55 §7.1.4',
    })
  }

  s1.articles.forEach((a, i) => {
    if (a.name.trim().length > 0 && a.modelNumber.trim().length === 0) {
      add({
        id: `articles.model-number.${i}`,
        severity: 'WARNING',
        location: 'Section 1 item 3',
        title: `"${a.name.trim()}" has no model number`,
        detail: 'Appendix A asks for names AND model numbers.',
        remedy: 'Enter the model number as it appears in the design data.',
        citation: 'AC 21-55 §7.1.4',
      })
    }
  })

  // ---- Section 2 completeness ---------------------------------------------
  const riskUnanswered =
    risk.cplListed === 'UNANSWERED' ||
    risk.highRisk === 'UNANSWERED' ||
    risk.fullyInspectable === 'UNANSWERED'

  if (log.test('risk.complete', 'All three risk questions are answered', { cpl: risk.cplListed, highRisk: risk.highRisk, inspectable: risk.fullyInspectable }, riskUnanswered)) {
    const missing: string[] = []
    if (risk.cplListed === 'UNANSWERED') missing.push('item 1 (CPL listing)')
    if (risk.highRisk === 'UNANSWERED') missing.push('item 2 (high-risk identification)')
    if (risk.fullyInspectable === 'UNANSWERED') missing.push('item 4 (inspectable upon receipt)')
    add({
      id: 'risk.complete',
      severity: 'BLOCKING',
      location: 'Section 2',
      title: 'The risk determination is incomplete',
      detail: `Unanswered: ${missing.join(', ')}. Section 2 is the whole basis on which the FAA managing office decides whether a full project plan is required.`,
      remedy: 'Answer every question in Section 2.',
      citation: 'AC 21-55 §7.2',
    })
  }

  if (
    log.test(
      'risk.critical-characteristics',
      'Critical characteristics are described where CPL-listed or high-risk',
      { cpl: risk.cplListed, highRisk: risk.highRisk },
      (risk.cplListed === 'YES' || risk.highRisk === 'YES') && isEmpty(s2.criticalCharacteristics),
    )
  ) {
    add({
      id: 'risk.critical-characteristics',
      severity: 'BLOCKING',
      location: 'Section 2 item 3',
      title: 'Critical characteristics are not described',
      detail:
        'Section 2 item 3 requires a description of the critical characteristics — such as critical functions, interfaces, or the use of exotic materials — whenever the articles are on the CPL or identified as high-risk.',
      remedy: 'Describe the critical characteristics specifically. Naming the characteristic and its control is what the FAA reads here.',
      citation: 'AC 21-55 §7.2.1',
    })
  }

  if (
    log.test(
      'risk.uninspectable-named',
      'Un-inspectable characteristics are named where not fully inspectable',
      { fullyInspectable: risk.fullyInspectable },
      risk.fullyInspectable === 'NO' && isEmpty(s2.uninspectableCharacteristics),
    )
  ) {
    add({
      id: 'risk.uninspectable-named',
      severity: 'BLOCKING',
      location: 'Section 2 item 5',
      title: 'Un-inspectable characteristics are not identified',
      detail:
        'The articles are recorded as not fully inspectable upon receipt, but the critical characteristics that cannot be inspected once received have not been identified. AC 21-55 §7.2.3 requires them. This is the justification for source inspection and FAA reviewers look for it specifically.',
      remedy: 'Name the characteristics that cannot be verified after receipt, and say why.',
      citation: 'AC 21-55 §7.2.3',
    })
  }

  if (log.test('risk.high-risk-contradiction', 'The high-risk answer is consistent with the risk indicators', {}, risk.highRiskContradictsTriggers)) {
    add({
      id: 'risk.high-risk-contradiction',
      severity: 'WARNING',
      location: 'Section 2 item 2',
      title: 'The high-risk answer contradicts the risk indicators',
      detail: risk.highRiskRationale,
      remedy: 'Either revise the answer, or state in Section 2 item 3 why these indicators do not make the article high-risk.',
      citation: 'AC 21-55 §7.2.2',
    })
  }

  if (log.test('risk.cpl-basis', 'The CPL answer has a stated basis', {}, risk.cplListed !== 'UNANSWERED' && isEmpty(s2.cplBasis))) {
    add({
      id: 'risk.cpl-basis',
      severity: 'WARNING',
      location: 'Section 2 item 1',
      title: 'No basis stated for the CPL answer',
      detail:
        'The CPL is a live FAA document. Recording which revision was checked, and when, is what makes this answer defensible six months from now.',
      remedy: 'State how the CPL was checked and which revision was consulted.',
      citation: 'AC 21-55 §7.2.1',
    })
  }

  if (log.test('risk.capabilities', 'Facility capabilities and experience are described', {}, isEmpty(s2.facilityCapabilitiesAndExperience))) {
    add({
      id: 'risk.capabilities',
      severity: 'BLOCKING',
      location: 'Section 2 item 6',
      title: 'Facility capabilities and experience are not described',
      detail:
        'Section 2 item 6 asks for the facility’s manufacturing capabilities and experience with the intended articles, including any special processes. It is part of the initial notification, not only the full plan.',
      remedy: 'Describe the facility’s relevant capability and experience, naming the special processes it performs.',
      citation: 'AC 21-55 §7.2.4',
    })
  }

  // ---- Bilateral status and non-bilateral mitigation -----------------------
  if (log.test('bilateral.answered', 'Bilateral status is answered', { bilateral: s1.bilateralCountry }, s1.bilateralCountry === 'UNANSWERED')) {
    add({
      id: 'bilateral.answered',
      severity: 'WARNING',
      location: 'Section 1 item 5',
      title: 'Bilateral agreement status is not answered',
      detail:
        'Whether the facility sits in a country with a bilateral agreement bears directly on the FAA’s ability to conduct oversight, and determines whether Section 4 item 8 applies.',
      remedy: 'Check the FAA bilateral agreements list for the facility’s country and record the answer.',
      citation: 'AC 21-55 §7.1.6',
    })
  }

  if (
    log.test(
      'bilateral.mitigation',
      'Non-bilateral access mitigation is described',
      { bilateral: s1.bilateralCountry },
      s1.bilateralCountry === 'NO' && isEmpty(s4.nonBilateralAccessMitigation),
    )
  ) {
    add({
      id: 'bilateral.mitigation',
      severity: 'BLOCKING',
      location: 'Section 4 item 8',
      title: 'No mitigation stated for a non-bilateral country',
      detail:
        'The facility is in a country without a bilateral agreement. AC 21-55 §8.2.7 requires a description of how the PAH would mitigate the requirement to allow FAA access to the facility or its subtier suppliers. Access is the core of the undue-burden question; without this the plan does not answer it.',
      remedy: 'Describe concretely how FAA access would be assured — contractual right of entry, PAH-conducted oversight on the FAA’s behalf, or CAA assistance.',
      citation: 'AC 21-55 §8.2.7',
    })
  }

  // ---- Full project plan: Sections 3, 4 and 5 -----------------------------
  if (fullPlan) {
    for (const req of FULL_PLAN_NARRATIVES) {
      const value = (
        req.section === 'sectionThree'
          ? plan.sectionThree[req.key as keyof SectionThree]
          : plan.sectionFour[req.key as keyof SectionFour]
      ) as Narrative

      if (log.test(`full-plan.${req.key}`, `${req.location} is completed`, {}, isEmpty(value))) {
        add({
          id: `full-plan.${req.key}`,
          severity: 'BLOCKING',
          location: req.location,
          title: `${req.title} is not described`,
          detail: `A full project plan is required for this project, so ${req.location} must be completed.`,
          remedy: 'Describe your actual process, specific to this facility and these articles.',
          citation: req.citation,
        })
      } else if (log.test(`full-plan.thin.${req.key}`, `${req.location} is more than a placeholder`, { length: value.text.trim().length }, isThin(value))) {
        add({
          id: `full-plan.thin.${req.key}`,
          severity: 'WARNING',
          location: req.location,
          title: `${req.title} is very brief`,
          detail: `This answer is under ${THIN_NARRATIVE_CHARS} characters. AC 21-55 §6 states the plan "should not be a generic replication of the PAH's current quality system" — it must be specific to these articles and this facility.`,
          remedy: 'Name the procedure, the responsible function, and what actually happens.',
          citation: 'AC 21-55 §6',
        })
      }
    }

    if (log.test('full-plan.qms-integration', 'QMS integration model is stated', { qmsIntegration: s4.qmsIntegration }, s4.qmsIntegration === 'UNSTATED')) {
      add({
        id: 'full-plan.qms-integration',
        severity: 'BLOCKING',
        location: 'Section 4 item 5',
        title: 'QMS integration model is not stated',
        detail:
          'Section 4 item 5 asks whether the facility has been fully integrated into the PAH’s quality system, or whether the PAH has approved the facility’s own quality system. These are materially different oversight models.',
        remedy: 'Select which model applies and describe it.',
        citation: 'AC 21-55 §8.2.4',
      })
    }

    if (log.test('full-plan.english', 'English-language availability is answered', { english: s4.englishLanguageAvailability }, s4.englishLanguageAvailability === 'UNANSWERED')) {
      add({
        id: 'full-plan.english',
        severity: 'BLOCKING',
        location: 'Section 4 item 7',
        title: 'English-language document availability is not answered',
        detail:
          'AC 21-55 §8.2.6 requires that design, quality assurance and production records be made available in English when requested for inspection or oversight. An FAA inspector who cannot read the records cannot conduct the oversight, which is the definition of the burden being assessed.',
        remedy: 'Confirm availability and describe how translation and validation are handled.',
        citation: 'AC 21-55 §8.2.6',
      })
    }

    if (log.test('full-plan.english-listing', 'The English document listing is attached', { attached: s4.englishDocumentListingAttached }, s4.englishDocumentListingAttached !== 'YES')) {
      add({
        id: 'full-plan.english-listing',
        severity: 'WARNING',
        location: 'Section 4 item 7',
        title: 'The listing of English-language documents is not attached',
        detail:
          'Appendix A Section 4 item 7 asks two things: whether the documents would be available in English, and whether a listing of those documents has been attached to the plan. The listing is a separate deliverable and is easy to miss.',
        remedy: 'Attach the document listing and mark it as an enclosure.',
        citation: 'AC 21-55 Appendix A, Section 4 item 7',
      })
    }

    if (log.test('full-plan.delegations', 'Delegated authorities are described', {}, isEmpty(s5.delegatedAuthorities))) {
      add({
        id: 'full-plan.delegations',
        severity: 'BLOCKING',
        location: 'Section 5 item 1',
        title: 'Delegated inspections or authorities are not described',
        detail:
          'Section 5 item 1 asks what would be delegated to the facility and how it would be controlled. If nothing is delegated, say so explicitly — a blank reads as an omission.',
        remedy: 'Describe what is delegated and how it is controlled, or state that nothing is delegated.',
        citation: 'AC 21-55 §8.3.1',
      })
    }

    if (log.test('full-plan.inspection-procedures', 'Inspection procedures are described', {}, isEmpty(s5.inspectionProcedures))) {
      add({
        id: 'full-plan.inspection-procedures',
        severity: 'BLOCKING',
        location: 'Section 5 item 2',
        title: 'Inspection procedures and minimum requirements are not described',
        detail: 'Section 5 item 2 asks for the specific procedures and minimum inspection or test requirements that ensure conformity.',
        remedy: 'Describe the procedures and the minimum requirements for each inspection type performed at the facility.',
        citation: 'AC 21-55 §8.3.2',
      })
    }
  }

  // ---- Designees (AC §8.4) -------------------------------------------------
  if (log.test('designee.travel', 'Designee travel commitment is agreed', { used: s5.designeesUsed, travel: s5.designeeTravelAgreed }, s5.designeesUsed === 'YES' && s5.designeeTravelAgreed !== 'YES')) {
    add({
      id: 'designee.travel',
      severity: 'BLOCKING',
      location: 'Section 5 item 4',
      title: 'The designee travel commitment has not been agreed',
      detail:
        'AC 21-55 §8.4 states the PAH must agree to pay for its designees to travel back to the United States for required training and FAA oversight. This is stated as a requirement, not a preference, and the FAA must make a separate no-undue-burden finding before appointing a designee outside the United States.',
      remedy: 'Confirm the travel commitment, or record that no designees will be used at this facility.',
      citation: 'AC 21-55 §8.4',
    })
  }

  if (log.test('designee.function-codes', 'Designee function codes are provided', {}, s5.designeesUsed === 'YES' && s5.designeeFunctionCodes.trim().length === 0)) {
    add({
      id: 'designee.function-codes',
      severity: 'WARNING',
      location: 'Section 5 item 3',
      title: 'Designee function codes are not provided',
      detail: 'Appendix A Section 5 item 3 asks for justification AND the function codes to be used by designees.',
      remedy: 'List the function codes alongside the justification.',
      citation: 'AC 21-55 Appendix A, Section 5 item 3',
    })
  }

  if (log.test('designee.listing', 'The delegation listing is attached', {}, s5.designeesUsed === 'YES' && s5.delegationListingAttached !== 'YES')) {
    add({
      id: 'designee.listing',
      severity: 'WARNING',
      location: 'Section 5 item 1',
      title: 'The delegation listing is not attached',
      detail: 'Appendix A asks whether the listing of delegated inspections and authorities has been attached to the plan.',
      remedy: 'Attach the delegation listing and mark it as an enclosure.',
      citation: 'AC 21-55 Appendix A, Section 5 item 1',
    })
  }

  // ---- Inspection types selected but never described -----------------------
  const selectedInspections = Object.entries(s5.inspectionTypes)
    .filter(([, v]) => v)
    .map(([k]) => k)
  if (log.test('inspection-types.undescribed', 'Selected inspection types are described', { selected: selectedInspections.length }, selectedInspections.length > 0 && isThin(s5.inspectionProcedures))) {
    add({
      id: 'inspection-types.undescribed',
      severity: 'WARNING',
      location: 'Section 5 item 2',
      title: 'Inspection types are selected but not described',
      detail: `${selectedInspections.length} inspection type${selectedInspections.length === 1 ? ' is' : 's are'} marked as performed at the facility, but the procedures description is thin or absent.`,
      remedy: 'Describe the minimum inspection and test requirements for each selected type.',
      citation: 'AC 21-55 §8.3.2',
    })
  }

  // ---- Informational ------------------------------------------------------
  if (risk.routing === 'INITIAL_NOTIFICATION') {
    add({
      id: 'routing.initial-notification',
      severity: 'INFO',
      location: 'Sections 3–5',
      title: 'Sections 3 to 5 are not required for the initial notification',
      detail: risk.routingRationale,
      remedy: 'Submit Sections 1 and 2. The FAA managing office will tell you whether a full project plan is required.',
      citation: 'AC 21-55 §7',
    })
  }

  if (s1.shortOrLongTermUse === 'UNSTATED') {
    add({
      id: 'project.term',
      severity: 'INFO',
      location: 'Section 1 item 4',
      title: 'Short- or long-term use is not stated',
      detail: 'AC 21-55 §7.1.5.2 asks for the proposed start date and whether use would be short- or long-term.',
      remedy: 'State the intended duration in the project description.',
      citation: 'AC 21-55 §7.1.5.2',
    })
  }

  // Stable ordering: blocking first, then by insertion order within severity.
  const ordered = gaps
    .map((g, i) => ({ g, i }))
    .sort((a, b) => SEVERITY_ORDER[a.g.severity] - SEVERITY_ORDER[b.g.severity] || a.i - b.i)
    .map(({ g }) => g)

  const blocking = ordered.filter((g) => g.severity === 'BLOCKING')

  return {
    gaps: ordered,
    blocking,
    warnings: ordered.filter((g) => g.severity === 'WARNING'),
    info: ordered.filter((g) => g.severity === 'INFO'),
    canGenerate: blocking.length === 0,
    trace: log.toArray(),
  }
}
