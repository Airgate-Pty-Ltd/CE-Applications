import { z } from 'zod'
import { answer, narrative } from './common.ts'

/**
 * The PAH Project Initiation Plan, modelled on AC 21-55 Appendix A as published
 * (dated 08/01/2016, effective 10/01/2016 — original issue, no revision letter).
 *
 * Field names carry their Appendix A section and item number, because the FAA
 * reads the document by that numbering and any drift between this model and the
 * printed template becomes a rejected submission. Do not reorder, rename or
 * "improve" these. If a future revision of the AC changes the template, the AC
 * wins and this file changes to match it.
 *
 * Nested object fields use `.prefault({})` rather than `.default({})`: a default
 * in Zod 4 is an OUTPUT value and would have to restate every inner field, while
 * a prefault is an INPUT value that then flows through each inner default. The
 * distinction matters here because every field in this file has a default, so
 * `emptyPlan()` must be constructible from `{}`.
 */

/** Section 1 item 3 — "Names and model numbers of products or articles." */
export const article = z.object({
  /** The article's name, as it appears in the design data. */
  name: z.string().default(''),
  /**
   * Appendix A asks for the MODEL NUMBER here, not a part number and not a
   * drawing number. Additional identifiers can go in the project description.
   */
  modelNumber: z.string().default(''),
})
export type Article = z.infer<typeof article>

/**
 * Elicitation aid for Section 2 item 2.
 *
 * AC 21-55 §7.2.2 asks "Whether the PAH identifies the products, articles, or
 * processes as high-risk in the design data" — the determination is the PAH's
 * own, made from their design data. The AC does not supply a checklist.
 *
 * These triggers are therefore an AID, not the rule. They produce a suggested
 * answer and a rationale naming which conditions fired; the PAH's recorded
 * answer remains authoritative. Answering "No" while triggers have fired is
 * allowed but raises a warning, because an FAA reviewer will see the same
 * design data and ask about it.
 */
export const highRiskTriggers = z.object({
  keyOrCriticalCharacteristics: z.boolean().default(false),
  hundredPercentVerification: z.boolean().default(false),
  functionalAcceptanceTest: z.boolean().default(false),
  esdSensitiveElectronicsOrPcba: z.boolean().default(false),
  specialProcess: z.boolean().default(false),
  controlledInterfaceTorqueOrMaterial: z.boolean().default(false),
})
export type HighRiskTriggers = z.infer<typeof highRiskTriggers>

export const HIGH_RISK_TRIGGER_LABELS: Record<keyof HighRiskTriggers, string> = {
  keyOrCriticalCharacteristics: 'the drawing identifies key or critical characteristics',
  hundredPercentVerification: '100% verification is required for at least one parameter',
  functionalAcceptanceTest: 'a functional acceptance test is required for release',
  esdSensitiveElectronicsOrPcba: 'the article contains ESD-sensitive electronics or a PCBA',
  specialProcess:
    'a special process is required (heat treat, plating, shot peen, weld, solder, conformal coat or NDT)',
  controlledInterfaceTorqueOrMaterial:
    'controlled interface, torque or material requirements affect fit or function',
}

/** Section 1 — Project Information. */
export const sectionOne = z.object({
  /** 1.1 — "Name and location, including country, of the proposed manufacturing facility." */
  facilityName: z.string().default(''),
  facilityAddress: z.string().default(''),
  /** Called out separately because the country drives the bilateral question. */
  facilityCountry: z.string().default(''),

  /** 1.2 — project/PC number comes from the Organization Profile. */

  /** 1.3 — "Names and model numbers of products or articles." */
  articles: z.array(article).default([]),

  /** 1.4 — "Project description." */
  projectDescription: narrative.default({ text: '', evidence: 'MISSING' }),
  /** AC §7.1.5.1 — where the articles are assembled into the next higher assembly. */
  nextHigherAssembly: narrative.default({ text: '', evidence: 'MISSING' }),
  /** AC §7.1.5.2 — proposed start date, and short- or long-term use. */
  proposedStartDate: z.string().default(''),
  shortOrLongTermUse: z.enum(['SHORT_TERM', 'LONG_TERM', 'UNSTATED']).default('UNSTATED'),

  /** 1.5 — "Is the manufacturing facility located in a bilateral country?" */
  bilateralCountry: answer.default('UNANSWERED'),

  /** 1.6 — CAA production approval held by the facility for these articles. */
  caaProductionApprovalHeld: answer.default('UNANSWERED'),
  caaProductionApprovalDescription: narrative.default({ text: '', evidence: 'MISSING' }),
})

/** Section 2 — Risk Determination. */
export const sectionTwo = z.object({
  /**
   * 2.1 — "Are the products, articles, or processes listed on the CPL?"
   *
   * The application does not assert CPL status. The CPL is a live FAA document;
   * a cached copy would go stale and a wrong answer here routes the whole plan
   * incorrectly. The user answers, and states the basis for their answer.
   */
  cplListed: answer.default('UNANSWERED'),
  cplBasis: narrative.default({ text: '', evidence: 'MISSING' }),

  /** 2.2 — "Has the PAH identified the products, articles, or processes as high-risk?" */
  pahIdentifiedHighRisk: answer.default('UNANSWERED'),
  highRiskTriggers: highRiskTriggers.prefault({}),

  /** 2.3 — critical characteristics, required when 2.1 or 2.2 is Yes. */
  criticalCharacteristics: narrative.default({ text: '', evidence: 'MISSING' }),

  /** 2.4 — "Identify whether the products or articles are fully inspectable upon receipt." */
  fullyInspectableOnReceipt: answer.default('UNANSWERED'),

  /**
   * 2.5 — required when 2.4 is No. AC §7.2.3: "identify those critical
   * characteristics that cannot be inspected once received by the PAH or
   * operator." This is the justification for source inspection and FAA
   * reviewers look for it specifically.
   */
  uninspectableCharacteristics: narrative.default({ text: '', evidence: 'MISSING' }),

  /** 2.6 — facility capabilities and experience, including special processes. */
  facilityCapabilitiesAndExperience: narrative.default({ text: '', evidence: 'MISSING' }),
})

/** Section 3 — PAH Control of the Manufacturing Facility. Seven narratives. */
export const sectionThree = z.object({
  /** 3.1 — reporting nonconforming products/articles or quality escapes. */
  nonconformanceReporting: narrative.default({ text: '', evidence: 'MISSING' }),
  /** 3.2 — use and control of subtier suppliers on high-risk work. */
  subtierControl: narrative.default({ text: '', evidence: 'MISSING' }),
  /** 3.3 — notifying the FAA of changes that may impact the facility's risk level. */
  faaChangeNotification: narrative.default({ text: '', evidence: 'MISSING' }),
  /** 3.4 — control of process changes affecting conformity and airworthiness. */
  processChangeControl: narrative.default({ text: '', evidence: 'MISSING' }),
  /** 3.5 — control and implementation of major and minor design changes. */
  designChangeControl: narrative.default({ text: '', evidence: 'MISSING' }),
  /** 3.6 — quality flowdown requirements. */
  qualityFlowdown: narrative.default({ text: '', evidence: 'MISSING' }),
  /** 3.7 — the specific audit process the PAH performs for the facility. */
  auditProcess: narrative.default({ text: '', evidence: 'MISSING' }),
})

/** Section 4 — Approval of the Manufacturing Facility. Eight items. */
export const sectionFour = z.object({
  /** 4.1 — results of the PAH's facility approval process. */
  approvalResults: narrative.default({ text: '', evidence: 'MISSING' }),
  /** 4.2 — personnel competence, qualifications, education, training, skills, experience. */
  personnelCompetence: narrative.default({ text: '', evidence: 'MISSING' }),
  /** 4.3 — all types of specialized training required. */
  specializedTraining: narrative.default({ text: '', evidence: 'MISSING' }),
  /** 4.4 — personnel qualifications for inspections or special processes. */
  inspectionQualifications: narrative.default({ text: '', evidence: 'MISSING' }),
  /** 4.5 — fully integrated into the PAH's quality system, or approved by the PAH? */
  qmsIntegration: z.enum(['FULLY_INTEGRATED', 'PAH_APPROVED', 'UNSTATED']).default('UNSTATED'),
  qmsIntegrationDescription: narrative.default({ text: '', evidence: 'MISSING' }),
  /** 4.6 — approval process for subtier suppliers doing high-risk work. */
  subtierApprovalProcess: narrative.default({ text: '', evidence: 'MISSING' }),
  /**
   * 4.7 — English-language availability. Appendix A asks two things in one item:
   * whether the documents would be available, AND whether a listing of them has
   * been attached to the plan. Both are tracked; the attachment is a real gap.
   */
  englishLanguageAvailability: answer.default('UNANSWERED'),
  englishLanguageDescription: narrative.default({ text: '', evidence: 'MISSING' }),
  englishDocumentListingAttached: answer.default('UNANSWERED'),
  /** 4.8 — non-bilateral FAA-access mitigation. Only applicable when 1.5 is No. */
  nonBilateralAccessMitigation: narrative.default({ text: '', evidence: 'MISSING' }),
})

/** AC §8.3.2 lists nine inspection types the PAH should address. */
export const inspectionTypes = z.object({
  firstArticle: z.boolean().default(false),
  mandatoryByTypeDesign: z.boolean().default(false),
  statisticalQualityControl: z.boolean().default(false),
  source: z.boolean().default(false),
  finalInspectionOrTest: z.boolean().default(false),
  tooling: z.boolean().default(false),
  authorizedReleaseDocuments: z.boolean().default(false),
  inProcess: z.boolean().default(false),
  selfOrOperatorInspection: z.boolean().default(false),
})
export type InspectionTypes = z.infer<typeof inspectionTypes>

export const INSPECTION_TYPE_LABELS: Record<keyof InspectionTypes, string> = {
  firstArticle: 'First article inspections',
  mandatoryByTypeDesign: 'Mandatory inspections required by type design',
  statisticalQualityControl: 'Statistical quality control methods',
  source: 'Source inspection',
  finalInspectionOrTest: 'Final inspection and/or testing',
  tooling: 'Tooling inspection',
  authorizedReleaseDocuments: 'Use of authorized personnel to issue authorized release documents',
  inProcess: 'In-process inspections',
  selfOrOperatorInspection: 'Self-inspection or operator inspection for non-critical characteristics',
}

/** Section 5 — Delegations & Inspections. Four items. */
export const sectionFive = z.object({
  /** 5.1 — what is delegated, how controlled, and whether the listing is attached. */
  delegatedAuthorities: narrative.default({ text: '', evidence: 'MISSING' }),
  delegationListingAttached: answer.default('UNANSWERED'),
  /** 5.2 — specific procedures and minimum inspection/test requirements. */
  inspectionProcedures: narrative.default({ text: '', evidence: 'MISSING' }),
  /** Tracked so the gap report can name types selected but never described. */
  inspectionTypes: inspectionTypes.prefault({}),
  /** 5.3 — justification and function codes to be used by designees. */
  designeesUsed: answer.default('UNANSWERED'),
  designeeJustification: narrative.default({ text: '', evidence: 'MISSING' }),
  designeeFunctionCodes: z.string().default(''),
  /** 5.4 — has the PAH agreed to pay designee travel back to the United States? */
  designeeTravelAgreed: answer.default('UNANSWERED'),
})

export const projectPlan = z.object({
  /** Appendix A header — "Date:". Supplied by the caller; never generated. */
  planDate: z.string().default(''),
  sectionOne: sectionOne.prefault({}),
  sectionTwo: sectionTwo.prefault({}),
  sectionThree: sectionThree.prefault({}),
  sectionFour: sectionFour.prefault({}),
  sectionFive: sectionFive.prefault({}),
})

export type SectionOne = z.infer<typeof sectionOne>
export type SectionTwo = z.infer<typeof sectionTwo>
export type SectionThree = z.infer<typeof sectionThree>
export type SectionFour = z.infer<typeof sectionFour>
export type SectionFive = z.infer<typeof sectionFive>
export type ProjectPlan = z.infer<typeof projectPlan>

export function emptyPlan(): ProjectPlan {
  return projectPlan.parse({})
}
