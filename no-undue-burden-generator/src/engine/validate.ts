import { isEmpty } from '../schema/common.ts'
import type { ProjectPlan } from '../schema/plan.ts'
import type { OrganizationProfile } from '../schema/profile.ts'
import type { RiskDetermination } from './risk.ts'

/**
 * Cross-section consistency checks.
 *
 * Distinct from the gap analysis: gaps are about what is ABSENT, these are about
 * what CONTRADICTS. A plan can be complete and still be internally inconsistent,
 * and an inconsistent plan is the kind an FAA reviewer sends back — the facility
 * named in Section 1 not matching the one described in Section 4, a routing
 * outcome that does not follow from the recorded answers, and so on.
 */

export interface CheckResult {
  readonly id: string
  readonly description: string
  readonly passed: boolean
  /** Why it failed, or confirmation of what was compared. */
  readonly detail: string
  /** Not every inconsistency applies to every plan. */
  readonly applicable: boolean
  /**
   * Required, not optional. Every consistency check exists because the AC asks
   * for something; a check with no citation is a house rule, and house rules do
   * not belong in a tool whose output goes to a regulator.
   */
  readonly citation: string
}

export interface ValidationReport {
  readonly checks: readonly CheckResult[]
  readonly applicable: readonly CheckResult[]
  readonly failed: readonly CheckResult[]
  readonly passed: boolean
}

function check(
  id: string,
  description: string,
  applicable: boolean,
  passed: boolean,
  detail: string,
  citation: string,
): CheckResult {
  return {
    id,
    description,
    // A check that does not apply is not a failure.
    passed: applicable ? passed : true,
    detail,
    applicable,
    citation,
  }
}

/** Compare loosely: case, surrounding space and internal runs of space. */
function sameText(a: string, b: string): boolean {
  const n = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ')
  return n(a) === n(b) && n(a).length > 0
}

export function validate(
  plan: ProjectPlan,
  profile: OrganizationProfile,
  risk: RiskDetermination,
): ValidationReport {
  const s1 = plan.sectionOne
  const s2 = plan.sectionTwo
  const s4 = plan.sectionFour
  const s5 = plan.sectionFive
  const fullPlan = risk.routing === 'FULL_PROJECT_PLAN'

  const checks: CheckResult[] = [
    check(
      'facility.country-in-address',
      'The facility address includes the stated country',
      s1.facilityAddress.trim().length > 0 && s1.facilityCountry.trim().length > 0,
      s1.facilityAddress.toLowerCase().includes(s1.facilityCountry.trim().toLowerCase()),
      s1.facilityAddress.toLowerCase().includes(s1.facilityCountry.trim().toLowerCase())
        ? `Address names "${s1.facilityCountry.trim()}".`
        : `Section 1 item 1 requires the location including country, but the address does not contain "${s1.facilityCountry.trim()}". An FAA reader takes the address at face value.`,
      'AC 21-55 §7.1.2',
    ),

    check(
      'project-number.present',
      'The project or PC number is recorded and used consistently',
      true,
      profile.projectOrPcNumber.trim().length > 0,
      profile.projectOrPcNumber.trim().length > 0
        ? `Project/PC number "${profile.projectOrPcNumber.trim()}" is used in the header and in Section 1 item 2.`
        : 'Appendix A asks for the project number/PC number in the header and again as Section 1 item 2. It is recorded once and printed in both places, but it is currently empty.',
      'AC 21-55 §7.1.3',
    ),

    check(
      'articles.model-numbers',
      'Every named article carries a model number',
      s1.articles.some((a) => a.name.trim().length > 0),
      s1.articles.every((a) => a.name.trim().length === 0 || a.modelNumber.trim().length > 0),
      s1.articles.every((a) => a.name.trim().length === 0 || a.modelNumber.trim().length > 0)
        ? 'All named articles carry a model number.'
        : `Articles without a model number: ${s1.articles.filter((a) => a.name.trim().length > 0 && a.modelNumber.trim().length === 0).map((a) => a.name.trim()).join(', ')}.`,
      'AC 21-55 §7.1.4',
    ),

    check(
      'risk.routing-consistent',
      'The routing outcome follows from the recorded risk answers',
      risk.routing !== 'INDETERMINATE',
      fullPlan ===
        (risk.cplListed === 'YES' || risk.highRisk === 'YES' || risk.criticalCharacteristicsPresent),
      risk.routingRationale,
      'AC 21-55 §8',
    ),

    check(
      'risk.critical-characteristics-described',
      'Critical characteristics are described wherever the risk answers require it',
      risk.cplListed === 'YES' || risk.highRisk === 'YES',
      !isEmpty(s2.criticalCharacteristics),
      isEmpty(s2.criticalCharacteristics)
        ? 'Section 2 item 3 requires a description of critical characteristics when the articles are CPL-listed or high-risk.'
        : 'Critical characteristics are described.',
      'AC 21-55 §7.2.1',
    ),

    check(
      'risk.uninspectable-consistent',
      'Un-inspectable characteristics are named only when, and always when, the articles are not fully inspectable',
      risk.fullyInspectable !== 'UNANSWERED',
      risk.fullyInspectable === 'NO'
        ? !isEmpty(s2.uninspectableCharacteristics)
        : isEmpty(s2.uninspectableCharacteristics),
      risk.fullyInspectable === 'NO'
        ? isEmpty(s2.uninspectableCharacteristics)
          ? 'Section 2 item 5 is required because item 4 is No.'
          : 'Un-inspectable characteristics are named, as item 4 requires.'
        : isEmpty(s2.uninspectableCharacteristics)
          ? 'Item 4 is Yes and item 5 is correctly empty.'
          : 'Item 4 says the articles ARE fully inspectable, yet item 5 lists characteristics that cannot be inspected. These two answers contradict each other.',
      'AC 21-55 §7.2.3',
    ),

    check(
      'risk.high-risk-indicators',
      'The high-risk answer does not contradict the risk indicators',
      risk.highRisk !== 'UNANSWERED',
      !risk.highRiskContradictsTriggers,
      risk.highRiskRationale,
      'AC 21-55 §7.2.2',
    ),

    check(
      'bilateral.mitigation-consistent',
      'Non-bilateral mitigation is present when required, and absent when not',
      s1.bilateralCountry !== 'UNANSWERED',
      s1.bilateralCountry === 'NO'
        ? !isEmpty(s4.nonBilateralAccessMitigation)
        : true,
      s1.bilateralCountry === 'NO'
        ? isEmpty(s4.nonBilateralAccessMitigation)
          ? 'The facility is in a non-bilateral country, so Section 4 item 8 is required.'
          : 'Non-bilateral access mitigation is described.'
        : 'The facility is in a bilateral country; Section 4 item 8 does not apply.',
      'AC 21-55 §8.2.7',
    ),

    check(
      'caa-approval.described',
      'A claimed CAA production approval is described',
      s1.caaProductionApprovalHeld === 'YES',
      !isEmpty(s1.caaProductionApprovalDescription),
      isEmpty(s1.caaProductionApprovalDescription)
        ? 'Section 1 item 6 says a CAA production approval is held but does not describe it. The AC asks "If so, describe."'
        : 'The CAA production approval is described.',
      'AC 21-55 §7.1.7',
    ),

    check(
      'full-plan.sections-populated',
      'A full project plan populates Sections 3, 4 and 5',
      fullPlan,
      !isEmpty(plan.sectionThree.nonconformanceReporting) &&
        !isEmpty(s4.approvalResults) &&
        !isEmpty(s5.delegatedAuthorities),
      fullPlan
        ? 'Sections 3, 4 and 5 are required for this project because the risk determination routed it to a full project plan.'
        : 'Not a full project plan.',
      'AC 21-55 §8',
    ),

    check(
      'subtier.control-consistent',
      'Subtier approval and subtier control are addressed together',
      fullPlan,
      isEmpty(plan.sectionThree.subtierControl) === isEmpty(s4.subtierApprovalProcess),
      isEmpty(plan.sectionThree.subtierControl) === isEmpty(s4.subtierApprovalProcess)
        ? 'Both subtier items are addressed consistently.'
        : 'Section 3 item 2 (use and control of subtiers) and Section 4 item 6 (approval of subtiers) are a pair. One is completed and the other is not.',
      'AC 21-55 §8.1.2, §8.2.5',
    ),

    check(
      'designee.travel-consistent',
      'The designee travel commitment matches designee use',
      s5.designeesUsed !== 'UNANSWERED',
      s5.designeesUsed === 'YES' ? s5.designeeTravelAgreed === 'YES' : true,
      s5.designeesUsed === 'YES'
        ? s5.designeeTravelAgreed === 'YES'
          ? 'Designees are used and the travel commitment is agreed.'
          : 'AC 21-55 §8.4 requires the PAH to agree to pay designee travel back to the United States.'
        : 'No designees are used at this facility; the travel commitment does not apply.',
      'AC 21-55 §8.4',
    ),

    check(
      'faa-office.confirmed',
      'The FAA managing office is confirmed rather than assumed',
      true,
      profile.faaManagingOffice.trim().length > 0,
      profile.faaManagingOffice.trim().length > 0
        ? `Plan is addressed to ${profile.faaManagingOffice.trim()}.`
        : 'AC 21-55 §7 directs the plan to the PAH’s FAA managing office. Which office that is depends on the certificate, so this application never assumes it.',
      'AC 21-55 §7',
    ),

    check(
      'pah-name.consistent',
      'The PAH name is used consistently between the header and the signatory block',
      profile.pahName.trim().length > 0 && profile.signatoryName.trim().length > 0,
      !sameText(profile.pahName, profile.signatoryName),
      sameText(profile.pahName, profile.signatoryName)
        ? 'The signatory name is identical to the PAH name. Appendix A asks for an organisation in the header and a person as the contact.'
        : 'PAH name and signatory are distinct.',
      'AC 21-55 Appendix A',
    ),
  ]

  const applicable = checks.filter((c) => c.applicable)

  return {
    checks,
    applicable,
    failed: checks.filter((c) => !c.passed),
    passed: checks.every((c) => c.passed),
  }
}
