import type { Narrative } from '../schema/common.ts'
import { emptyPlan, type ProjectPlan } from '../schema/plan.ts'
import { emptyProfile, type OrganizationProfile } from '../schema/profile.ts'

/**
 * Fictional test scenarios.
 *
 * EVERY VALUE HERE IS INVENTED. No company, facility, person, article, PMA
 * number or contact detail in this file corresponds to anything real. Contact
 * details use ranges that public standards reserve for fiction — the NANP
 * 555-0100..0199 block and RFC 2606's example.invalid — so they cannot reach a
 * real person even by accident. Addresses carry the "Example" documentation
 * marker for the same reason.
 *
 * Article and model numbers deliberately avoid the PREFIX-999-99 shape, which
 * the scrub gate treats as an internal controlled-document number.
 *
 * The eight scenarios exist to exercise every path through the engine: each of
 * the routing outcomes, each class of high-risk trigger, and each banner value.
 */

function n(text: string): Narrative {
  return { text, evidence: 'CONFIRMED' }
}

export function baseProfile(): OrganizationProfile {
  return {
    ...emptyProfile(),
    pahName: 'Northvale Aerostructures, Inc.',
    projectOrPcNumber: 'PC-4471',
    pahUsAddress: '1200 Example Parkway, Wichita, KS 67209, United States',
    phoneNumber: '555-555-0142',
    projectContactPerson: 'A. Reyes, Director of Quality',
    signatoryName: 'A. Reyes',
    signatoryTitle: 'Director of Quality',
    faaManagingOffice: 'Wichita Manufacturing Inspection District Office',
    faaAddressee: 'Manager, Wichita MIDO',
    submissionMethod: 'Email to the managing office, with the plan as a PDF enclosure',
    qmsManualNumber: 'NAI-QM-1',
    qmsManualRevision: 'Rev H',
    qmsManualDate: '2026-03-02',
    procedureNonconformance: 'NAI-QP-8.7 Control of Nonconforming Output',
    procedureSubtierControl: 'NAI-QP-8.4 Externally Provided Processes',
    procedureChangeControl: 'NAI-QP-8.5 Production Change Control',
    procedureDesignChange: 'NAI-QP-8.3 Design and Development Change',
    procedureQualityFlowdown: 'NAI-QP-8.4.3 Purchasing Requirements',
    procedureAuditProgramme: 'NAI-QP-9.2 Internal and Supplier Audit',
    procedureTrainingQualification: 'NAI-QP-7.2 Competence and Training',
    designeePolicy:
      'Designee appointments are proposed by the Director of Quality and approved by the FAA managing office. ' +
      'Northvale funds designee travel to the United States for training and oversight.',
  }
}

/** A fully completed plan. Individual scenarios degrade it from here. */
function basePlan(): ProjectPlan {
  const p = emptyPlan()
  return {
    ...p,
    planDate: '2026-07-24',
    sectionOne: {
      ...p.sectionOne,
      facilityName: 'Meridian Precision Components Sdn Bhd',
      facilityAddress: 'Lot 14, Kawasan Perindustrian Senai, 81400 Johor, Malaysia',
      facilityCountry: 'Malaysia',
      articles: [{ name: 'Aileron actuator bracket', modelNumber: 'ACT-4410' }],
      projectDescription: n(
        'Machining and finishing of the aileron actuator bracket from Northvale-supplied forgings. ' +
          'Meridian performs milling, drilling and surface finishing. Northvale retains all design and ' +
          'configuration authority; Meridian holds no design responsibility and may not deviate from the ' +
          'released drawing without a Northvale-approved deviation.',
      ),
      nextHigherAssembly: n(
        'Brackets ship to Northvale Wichita and are installed into the aileron control assembly during ' +
          'wing final assembly.',
      ),
      proposedStartDate: '2026-11-01',
      shortOrLongTermUse: 'LONG_TERM',
      bilateralCountry: 'YES',
      caaProductionApprovalHeld: 'NO',
      caaProductionApprovalDescription: n(
        'Meridian holds no production approval from the Civil Aviation Authority of Malaysia for this article. ' +
          'It holds AS9100D certification issued by an IAQG-recognised certification body.',
      ),
    },
    sectionTwo: {
      ...p.sectionTwo,
      cplListed: 'NO',
      cplBasis: n(
        'The AIR Category Parts List published on faa.gov was reviewed on 2026-07-20 by the Director of ' +
          'Quality. Neither the bracket nor the machining processes performed at Meridian appear on it.',
      ),
      pahIdentifiedHighRisk: 'NO',
      highRiskTriggers: { ...p.sectionTwo.highRiskTriggers },
      criticalCharacteristics: n(''),
      fullyInspectableOnReceipt: 'YES',
      uninspectableCharacteristics: n(''),
      facilityCapabilitiesAndExperience: n(
        'Meridian has machined aluminium and titanium structural details for commercial aerospace since 2009 ' +
          'and has produced this bracket family for Northvale under a domestic-content arrangement since 2021. ' +
          'It operates eleven 5-axis machining centres and a CMM laboratory accredited to ISO/IEC 17025. ' +
          'No special processes are performed at this facility; anodising is subcontracted.',
      ),
    },
    sectionThree: {
      nonconformanceReporting: n(
        'Meridian raises a nonconformance report in Northvale’s supplier portal within 24 hours of detection ' +
          'and may not disposition any nonconformance affecting a drawing requirement. Disposition authority ' +
          'rests solely with Northvale Material Review under NAI-QP-8.7. Escapes discovered after shipment are ' +
          'reported within 8 hours and trigger a containment sweep of all stock at both sites.',
      ),
      subtierControl: n(
        'Meridian may use only subtiers on Northvale’s approved supplier list. The anodising subtier is audited ' +
          'annually by Northvale supplier quality under NAI-QP-8.4. Meridian may not add or change a subtier for ' +
          'any drawing-affecting process without prior written Northvale approval.',
      ),
      faaChangeNotification: n(
        'Northvale notifies the Wichita MIDO in writing before implementing any change that alters the risk ' +
          'level of the facility, including adding an article, adding a special process, or changing the ' +
          'subtier performing a drawing-affecting process. The Director of Quality owns this notification.',
      ),
      processChangeControl: n(
        'Meridian submits a change request for any change to a qualified process, including tooling, fixturing, ' +
          'machine substitution and subtier change. Northvale manufacturing engineering evaluates the change ' +
          'and determines whether requalification or a new first article inspection is required under NAI-QP-8.5. ' +
          'The same requirement flows to subtiers by contract.',
      ),
      designChangeControl: n(
        'All design authority rests with Northvale. Major and minor changes are classified by Northvale ' +
          'engineering under NAI-QP-8.3. Meridian receives released drawings through the Northvale portal only; ' +
          'superseded revisions are withdrawn automatically and cannot be downloaded.',
      ),
      qualityFlowdown: n(
        'The purchase order flows down the drawing revision, key characteristic list, NAI-QP-8.4.3 quality ' +
          'requirements, right of access for Northvale and the FAA, record retention of 10 years, and the ' +
          'prohibition on unapproved subtier substitution.',
      ),
      auditProcess: n(
        'Northvale supplier quality audits Meridian annually to a 92-question AS9100D-based checklist under ' +
          'NAI-QP-9.2, with a process audit of each qualified process on a two-year cycle. Findings are tracked ' +
          'to closure in the supplier portal; an overdue major finding suspends shipping authority.',
      ),
    },
    sectionFour: {
      ...p.sectionFour,
      approvalResults: n(
        'Meridian was approved as a Northvale production source on 2026-02-11 following an on-site audit ' +
          'conducted 2026-01-20 to 2026-01-22. Two minor findings were raised and closed on 2026-03-04. ' +
          'First article inspection for ACT-4410 was accepted on 2026-05-19.',
      ),
      personnelCompetence: n(
        'CNC machinists hold internal certification against Meridian work instructions with practical ' +
          'assessment by a certified trainer. Inspectors hold a minimum of four years dimensional inspection ' +
          'experience and are qualified against NAI-QP-7.2. Competence records are held at the facility and ' +
          'are available to Northvale and the FAA on request.',
      ),
      specializedTraining: n(
        'CMM programming and operation, GD&T to ASME Y14.5, FOD prevention, and counterfeit parts awareness. ' +
          'GD&T and FOD training recur every two years; CMM qualification is reassessed annually.',
      ),
      inspectionQualifications: n(
        'Final inspection is performed only by inspectors on the Meridian qualified inspector list, which ' +
          'Northvale reviews at each annual audit. CMM operators hold a separate programming qualification. ' +
          'No special-process qualifications are required because no special processes are performed here.',
      ),
      qmsIntegration: 'PAH_APPROVED',
      qmsIntegrationDescription: n(
        'Meridian operates its own AS9100D-certified quality system, which Northvale assessed and approved ' +
          'rather than replacing. Northvale requirements flow down by contract and are verified at audit.',
      ),
      subtierApprovalProcess: n(
        'Subtiers performing drawing-affecting processes are approved by Northvale supplier quality following ' +
          'an on-site audit, and are listed on the Northvale approved supplier list. Meridian cannot approve a ' +
          'subtier on its own authority.',
      ),
      englishLanguageAvailability: 'YES',
      englishLanguageDescription: n(
        'Drawings, purchase orders, inspection records and certificates of conformity are issued and retained ' +
          'in English. Meridian work instructions are maintained bilingually in English and Malay, with the ' +
          'English text controlling. A listing of these documents is attached as Enclosure 2.',
      ),
      englishDocumentListingAttached: 'YES',
      nonBilateralAccessMitigation: n(''),
    },
    sectionFive: {
      ...p.sectionFive,
      delegatedAuthorities: n(
        'No inspection or airworthiness authority is delegated to Meridian. All articles are subject to ' +
          'Northvale receiving inspection before use. A listing confirming no delegation is attached as ' +
          'Enclosure 3.',
      ),
      delegationListingAttached: 'YES',
      inspectionProcedures: n(
        'First article inspection to AS9102 on initial production and after any qualifying change. 100% ' +
          'dimensional inspection of the first five units of each lot, reverting to sampling per ANSI/ASQ Z1.4 ' +
          'level II once three consecutive lots are accepted. Final dimensional verification on the CMM against ' +
          'the released drawing revision. Records accompany each shipment.',
      ),
      inspectionTypes: {
        ...p.sectionFive.inspectionTypes,
        firstArticle: true,
        finalInspectionOrTest: true,
        inProcess: true,
      },
      designeesUsed: 'NO',
      designeeJustification: n(''),
      designeeFunctionCodes: '',
      designeeTravelAgreed: 'UNANSWERED',
    },
  }
}

export interface Scenario {
  readonly id: string
  readonly title: string
  /** What this scenario is meant to demonstrate. */
  readonly proves: string
  readonly expectedRouting: 'FULL_PROJECT_PLAN' | 'INITIAL_NOTIFICATION' | 'INDETERMINATE'
  readonly expectedBanner: 'DRAFT — INTERNAL REVIEW ONLY' | 'DRAFTED WITH GAPS' | 'BLOCKED'
  readonly profile: OrganizationProfile
  readonly plan: ProjectPlan
}

function scenario(
  id: string,
  title: string,
  proves: string,
  expectedRouting: Scenario['expectedRouting'],
  expectedBanner: Scenario['expectedBanner'],
  mutate: (plan: ProjectPlan) => ProjectPlan,
  profile: OrganizationProfile = baseProfile(),
): Scenario {
  return { id, title, proves, expectedRouting, expectedBanner, profile, plan: mutate(basePlan()) }
}

export const SCENARIOS: readonly Scenario[] = [
  scenario(
    'cpl-listed',
    'CPL-listed article routes to a full project plan',
    'AC 21-55 §8 — a CPL listing alone forces a full project plan regardless of the high-risk answer.',
    'FULL_PROJECT_PLAN',
    'DRAFT — INTERNAL REVIEW ONLY',
    (p) => ({
      ...p,
      sectionOne: {
        ...p.sectionOne,
        articles: [{ name: 'Main landing gear side stay', modelNumber: 'MLG-7720' }],
      },
      sectionTwo: {
        ...p.sectionTwo,
        cplListed: 'YES',
        cplBasis: n(
          'The AIR Category Parts List was reviewed on 2026-07-20. Landing gear structural members appear ' +
            'on the list as a category part.',
        ),
        criticalCharacteristics: n(
          'The lug bore diameter and its perpendicularity to the stay axis are critical functional ' +
            'characteristics: the bore carries the full side load path and a perpendicularity error induces ' +
            'an edge-loading condition that the assembly cannot tolerate. Material is 300M steel heat treated ' +
            'to 1900 MPa, where an over-temper is not detectable by dimensional inspection.',
        ),
        fullyInspectableOnReceipt: 'NO',
        uninspectableCharacteristics: n(
          'Core hardness and case depth cannot be verified after receipt without destructive sectioning. ' +
            'Residual stress from shot peening cannot be re-verified once the part is finished. Both are ' +
            'therefore controlled by source inspection at Meridian and by witnessed process qualification.',
        ),
      },
    }),
  ),

  scenario(
    'high-risk-critical-characteristics',
    'Key or critical characteristics on the drawing route to a full project plan',
    'The critical-characteristics trigger independently forces a full plan under AC 21-55 §8, even when ' +
      'the article is not CPL-listed.',
    'FULL_PROJECT_PLAN',
    'DRAFT — INTERNAL REVIEW ONLY',
    (p) => ({
      ...p,
      sectionTwo: {
        ...p.sectionTwo,
        pahIdentifiedHighRisk: 'YES',
        highRiskTriggers: { ...p.sectionTwo.highRiskTriggers, keyOrCriticalCharacteristics: true },
        criticalCharacteristics: n(
          'The bearing bore diameter is a key characteristic controlled to a 0.013 mm tolerance band. It sets ' +
            'the actuator alignment; drift within the band is acceptable but excursion produces a binding ' +
            'condition that is not detectable at assembly.',
        ),
      },
    }),
  ),

  scenario(
    'high-risk-special-process',
    'A special process performed at the facility routes to a full project plan',
    'The special-process trigger — AC 21-55 §7.2 names heat treating, plating and shot peening — drives ' +
      'the high-risk answer without any critical characteristic being present.',
    'FULL_PROJECT_PLAN',
    'DRAFT — INTERNAL REVIEW ONLY',
    (p) => ({
      ...p,
      sectionTwo: {
        ...p.sectionTwo,
        pahIdentifiedHighRisk: 'YES',
        highRiskTriggers: { ...p.sectionTwo.highRiskTriggers, specialProcess: true },
        criticalCharacteristics: n(
          'Chromic acid anodising is performed in-house at this facility. Coating weight and seal quality ' +
            'are process-controlled characteristics: neither can be confirmed by dimensional inspection, and ' +
            'an under-sealed coating passes visual inspection while failing in service.',
        ),
        facilityCapabilitiesAndExperience: n(
          'Meridian has machined aerospace structural details since 2009 and brought an in-house chromic acid ' +
            'anodising line into service in 2024. The line is Nadcap accredited for chemical processing, ' +
            'accreditation current to 2027-04. Two operators hold current process qualification.',
        ),
      },
    }),
  ),

  scenario(
    'high-risk-acceptance-test',
    'A required functional acceptance test routes to a full project plan',
    'The ATP trigger fires on an assembly whose function cannot be confirmed dimensionally.',
    'FULL_PROJECT_PLAN',
    'DRAFT — INTERNAL REVIEW ONLY',
    (p) => ({
      ...p,
      sectionOne: {
        ...p.sectionOne,
        articles: [{ name: 'Cabin lighting power supply', modelNumber: 'LSP-2200' }],
      },
      sectionTwo: {
        ...p.sectionTwo,
        pahIdentifiedHighRisk: 'YES',
        highRiskTriggers: {
          ...p.sectionTwo.highRiskTriggers,
          functionalAcceptanceTest: true,
          esdSensitiveElectronicsOrPcba: true,
        },
        criticalCharacteristics: n(
          'The unit is a populated PCBA in a sealed enclosure. Output regulation under load and inrush ' +
            'current limiting are functional characteristics verified only by the acceptance test procedure; ' +
            'no dimensional inspection reaches them. ESD-sensitive devices are present throughout.',
        ),
        fullyInspectableOnReceipt: 'NO',
        uninspectableCharacteristics: n(
          'Solder joint integrity beneath the BGA devices and conformal coating coverage inside the sealed ' +
            'enclosure cannot be inspected after receipt without destroying the unit. Both are controlled by ' +
            'witnessed in-process inspection and by the acceptance test at Meridian.',
        ),
      },
      sectionFive: {
        ...p.sectionFive,
        inspectionTypes: {
          ...p.sectionFive.inspectionTypes,
          firstArticle: true,
          finalInspectionOrTest: true,
          inProcess: true,
          source: true,
        },
      },
    }),
  ),

  scenario(
    'initial-notification',
    'A low-risk inspectable article may need only an initial notification',
    'AC 21-55 §7 — with no CPL listing, no high-risk identification and no critical characteristics, ' +
      'Sections 1 and 2 alone may suffice. The FAA managing office still decides.',
    'INITIAL_NOTIFICATION',
    'DRAFT — INTERNAL REVIEW ONLY',
    (p) => p,
  ),

  scenario(
    'blocking-uninspectable-not-named',
    'Not fully inspectable, with the characteristics left unnamed, is blocked',
    'AC 21-55 §7.2.3 requires the characteristics that cannot be inspected after receipt to be identified. ' +
      'This is the justification for source inspection and generation is refused without it.',
    'INITIAL_NOTIFICATION',
    'BLOCKED',
    (p) => ({
      ...p,
      sectionTwo: {
        ...p.sectionTwo,
        fullyInspectableOnReceipt: 'NO',
        uninspectableCharacteristics: n(''),
      },
    }),
  ),

  scenario(
    'blocking-non-bilateral',
    'A non-bilateral country with no access mitigation is blocked',
    'AC 21-55 §8.2.7 — FAA access is the core of the undue-burden question. A plan that does not say how ' +
      'access would be assured does not answer it.',
    'FULL_PROJECT_PLAN',
    'BLOCKED',
    (p) => ({
      ...p,
      sectionOne: {
        ...p.sectionOne,
        facilityName: 'Aravind Aero Components Pvt Ltd',
        facilityAddress: 'Plot 22, Hardware Park, Hyderabad 500005, India',
        facilityCountry: 'India',
        bilateralCountry: 'NO',
      },
      sectionTwo: {
        ...p.sectionTwo,
        pahIdentifiedHighRisk: 'YES',
        highRiskTriggers: { ...p.sectionTwo.highRiskTriggers, keyOrCriticalCharacteristics: true },
        criticalCharacteristics: n(
          'The bearing bore diameter is a key characteristic controlled to a 0.013 mm tolerance band, setting ' +
            'actuator alignment.',
        ),
      },
      sectionFour: { ...p.sectionFour, nonBilateralAccessMitigation: n('') },
    }),
  ),

  scenario(
    'warnings-thin-narratives',
    'Placeholder narratives generate, but the document is stamped DRAFTED WITH GAPS',
    'AC 21-55 §6 — the plan "should not be a generic replication of the PAH’s current quality system". ' +
      'Answers under 40 characters are flagged as too thin to be the specific description the AC asks for.',
    'FULL_PROJECT_PLAN',
    'DRAFTED WITH GAPS',
    (p) => ({
      ...p,
      sectionTwo: {
        ...p.sectionTwo,
        pahIdentifiedHighRisk: 'YES',
        highRiskTriggers: { ...p.sectionTwo.highRiskTriggers, hundredPercentVerification: true },
        criticalCharacteristics: n('Bore diameter is 100% verified against the drawing on every unit.'),
      },
      sectionThree: {
        ...p.sectionThree,
        nonconformanceReporting: n('Per our QMS.'),
        qualityFlowdown: n('Flowed down on the PO.'),
        auditProcess: n('Audited annually.'),
      },
    }),
  ),
]

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}
