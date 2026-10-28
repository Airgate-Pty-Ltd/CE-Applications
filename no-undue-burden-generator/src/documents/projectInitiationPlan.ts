import {
  AlignmentType,
  Document,
  Footer,
  Header,
  PageNumber,
  Paragraph,
  Table,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import {
  answerOrConfirm,
  confirmToken,
  type Answer,
  type Narrative,
} from '../schema/common.ts'
import { INSPECTION_TYPE_LABELS, type ProjectPlan } from '../schema/plan.ts'
import type { OrganizationProfile } from '../schema/profile.ts'
import type { Determination } from '../engine/determine.ts'
import {
  answerParagraphs,
  faaValidationCell,
  labelCell,
  paragraphsFrom,
  responseCell,
  sectionHeading,
  FONT,
  SMALL_SIZE,
  text,
} from './style.ts'

/**
 * PAH Project Initiation Plan — AC 21-55 Appendix A.
 *
 * The section order, the section titles and the item numbering are taken from
 * the published Appendix A and must not be changed. The FAA rejects submissions
 * in other formats, so "improving" the layout breaks the product.
 *
 * The application fills the response column. It never fills the FAA Validation
 * column and never completes the Approvals block — those belong to the FAA.
 */

/** Column splits, as percentages of the table width. */
const LABEL = 44
const RESPONSE = 41
const VALIDATION = 15

function row(label: string, response: Paragraph[], withYesNo = false): TableRow {
  return new TableRow({
    children: [
      labelCell(label, LABEL, { shaded: true }),
      responseCell(response, RESPONSE),
      faaValidationCell(VALIDATION, withYesNo),
    ],
  })
}

function table(rows: TableRow[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  })
}

function narrativeRow(label: string, value: Narrative, needed: string): TableRow {
  return row(label, answerParagraphs(value.text, needed))
}

function answerRow(label: string, value: Answer, needed: string, withYesNo = true): TableRow {
  return row(label, [new Paragraph({ children: [text(answerOrConfirm(value, needed))] })], withYesNo)
}

function headerField(label: string, value: string, needed: string): TableRow {
  return new TableRow({
    children: [
      labelCell(label, 30, { shaded: true }),
      responseCell(answerParagraphs(value, needed), 70),
    ],
  })
}

export interface PlanDocumentInput {
  readonly plan: ProjectPlan
  readonly profile: OrganizationProfile
  readonly determination: Determination
}

export function buildProjectInitiationPlan({
  plan,
  profile,
  determination,
}: PlanDocumentInput): Document {
  const s1 = plan.sectionOne
  const s2 = plan.sectionTwo
  const s3 = plan.sectionThree
  const s4 = plan.sectionFour
  const s5 = plan.sectionFive
  const fullPlan = determination.risk.routing === 'FULL_PROJECT_PLAN'

  const children: (Paragraph | Table)[] = []

  // ---- Title ------------------------------------------------------------
  children.push(
    new Paragraph({
      children: [text('PAH Project Initiation Plan', { bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [
        text('FAA Advisory Circular 21-55, Appendix A', { size: SMALL_SIZE, italics: true }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),
  )

  // ---- Header block -----------------------------------------------------
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        headerField('PAH Name:', profile.pahName, 'the legal name of the production approval holder'),
        headerField(
          'Project Number/PC Number:',
          profile.projectOrPcNumber,
          'the project number or production certificate number',
        ),
        headerField('PAH U.S. Address:', profile.pahUsAddress, 'the PAH United States address'),
        headerField('Phone Number:', profile.phoneNumber, 'a contact telephone number'),
        headerField(
          'Project Contact Person:',
          profile.projectContactPerson,
          'the name and title of the project contact',
        ),
        headerField('Date:', plan.planDate, 'the date of this plan'),
      ],
    }),
  )

  // ---- Initial FAA Notification note ------------------------------------
  children.push(
    new Paragraph({
      children: [text('Initial FAA Notification.', { bold: true })],
      spacing: { before: 240, after: 60 },
    }),
    new Paragraph({
      children: [
        text(
          'Complete sections 1 and 2, then forward the information to the appropriate FAA managing office as ' +
            'initial notification of the proposed use of a manufacturing facility outside of the United States. ' +
            'After reviewing this information, the FAA managing office will notify the PAH whether a full project ' +
            'plan will be required. In most cases, the PAH will be required to complete a full project plan if the ' +
            'proposed manufacturing facility would be providing a product or article described on the CPL, or the ' +
            'PAH has identified the products or articles to be produced as high-risk. This also applies to ' +
            'products, articles, or processes for which the PAH has identified critical characteristics that must ' +
            'be closely controlled to ensure the required level of integrity. The FAA managing office will review ' +
            'and validate the information provided in the project plan to determine whether the proposed activity ' +
            'will cause no undue burden.',
          { size: SMALL_SIZE },
        ),
      ],
      spacing: { after: 120 },
    }),
  )

  // ---- Section 1 --------------------------------------------------------
  children.push(sectionHeading('Section 1—Project Information'))
  children.push(
    table([
      row(
        '1. Name and location, including country, of the proposed manufacturing facility.',
        answerParagraphs(
          [s1.facilityName, s1.facilityAddress].map((v) => v.trim()).filter((v) => v.length > 0).join('\n'),
          'the facility name and full address including country',
        ),
      ),
      row('2. Project number/PC number.', answerParagraphs(profile.projectOrPcNumber, 'the project or PC number')),
      row(
        '3. Names and model numbers of products or articles.',
        s1.articles.filter((a) => a.name.trim().length > 0).length === 0
          ? answerParagraphs('', 'at least one article name and model number')
          : paragraphsFrom(
              s1.articles
                .filter((a) => a.name.trim().length > 0)
                .map(
                  (a) =>
                    `${a.name.trim()} — ${
                      a.modelNumber.trim().length > 0
                        ? a.modelNumber.trim()
                        : confirmToken('model number')
                    }`,
                )
                .join('\n'),
            ),
      ),
      row(
        '4. Project description.',
        answerParagraphs(
          [
            s1.projectDescription.text.trim(),
            s1.nextHigherAssembly.text.trim(),
            s1.proposedStartDate.trim().length > 0
              ? `Proposed start date: ${s1.proposedStartDate.trim()}.`
              : '',
            s1.shortOrLongTermUse === 'UNSTATED'
              ? ''
              : `Intended use: ${s1.shortOrLongTermUse === 'SHORT_TERM' ? 'short-term' : 'long-term'}.`,
          ]
            .filter((v) => v.length > 0)
            .join('\n'),
          'a description of the project',
        ),
      ),
      answerRow(
        '5. Is the manufacturing facility located in a bilateral country?',
        s1.bilateralCountry,
        'whether the facility is in a bilateral country',
      ),
      row(
        '6. Does the manufacturing facility hold a production approval issued by its CAA for the products or articles to be produced? If so, describe.',
        answerParagraphs(
          [
            answerOrConfirm(s1.caaProductionApprovalHeld, 'whether a CAA production approval is held'),
            s1.caaProductionApprovalDescription.text.trim(),
          ]
            .filter((v) => v.length > 0)
            .join('\n'),
          'whether a CAA production approval is held',
        ),
      ),
    ]),
  )

  // ---- Section 2 --------------------------------------------------------
  children.push(sectionHeading('Section 2—Risk Determination'))
  children.push(
    table([
      answerRow(
        '1. Are the products, articles, or processes listed on the CPL?',
        s2.cplListed,
        'whether the articles are listed on the CPL',
      ),
      answerRow(
        '2. Has the PAH identified the products, articles, or processes as high-risk?',
        s2.pahIdentifiedHighRisk,
        'whether the PAH has identified the articles as high-risk',
      ),
      narrativeRow(
        '3. If the products or articles are included on the CPL, or identified as high-risk by the PAH, provide a description of their critical characteristics (such as critical functions, interfaces, or use of exotic materials).',
        s2.criticalCharacteristics,
        'a description of the critical characteristics',
      ),
      answerRow(
        '4. Identify whether the products or articles are fully inspectable upon receipt.',
        s2.fullyInspectableOnReceipt,
        'whether the articles are fully inspectable upon receipt',
      ),
      narrativeRow(
        '5. If the products or articles are not fully inspectable, identify those critical characteristics that cannot be inspected once received by the PAH or operator.',
        s2.uninspectableCharacteristics,
        'the characteristics that cannot be inspected after receipt',
      ),
      narrativeRow(
        '6. Describe the manufacturing facility’s manufacturing capabilities and experience in manufacturing the intended products or articles. Include experience in any applicable special processes that will be performed at the manufacturing facility.',
        s2.facilityCapabilitiesAndExperience,
        'the facility’s capabilities and experience',
      ),
    ]),
  )

  // ---- Sections 3 to 5 ---------------------------------------------------
  //
  // AC §7: an initial notification is Sections 1 and 2 only. Printing empty
  // Sections 3 to 5 on a notification would imply the PAH failed to complete
  // them, so they are replaced by a statement of why they are absent.
  if (!fullPlan) {
    children.push(
      sectionHeading('Sections 3 to 5'),
      new Paragraph({
        children: [
          text(
            'Not included. This document is an initial notification under AC 21-55 §7, comprising Sections 1 ' +
              'and 2 only. ' + determination.risk.routingRationale,
            { size: SMALL_SIZE, italics: true },
          ),
        ],
      }),
    )
  } else {
    children.push(sectionHeading('Section 3—PAH Control of the Manufacturing Facility'))
    children.push(
      table([
        narrativeRow(
          '1. Describe the process for reporting nonconforming products/articles or quality escapes.',
          s3.nonconformanceReporting,
          'the nonconformance and quality escape reporting process',
        ),
        narrativeRow(
          '2. Describe the process for the use and control of subtier suppliers producing high-risk products/articles or conducting high-risk manufacturing processes.',
          s3.subtierControl,
          'the subtier supplier control process',
        ),
        narrativeRow(
          '3. Describe the process for notifying the FAA of any changes that may impact the risk level of the manufacturing facility.',
          s3.faaChangeNotification,
          'the FAA change notification process',
        ),
        narrativeRow(
          '4. How would changes to processes that affect conformity and airworthiness of the products or articles be controlled for both the manufacturing facility and subtier suppliers?',
          s3.processChangeControl,
          'the process change control method',
        ),
        narrativeRow(
          '5. Describe how major and minor design changes would be controlled and implemented.',
          s3.designChangeControl,
          'the design change control process',
        ),
        narrativeRow('6. Describe the quality flowdown requirements.', s3.qualityFlowdown, 'the quality flowdown requirements'),
        narrativeRow(
          '7. Describe the specific audit process performed by the PAH for the manufacturing facility.',
          s3.auditProcess,
          'the audit process',
        ),
      ]),
    )

    children.push(sectionHeading('Section 4—Approval of the Manufacturing Facility'))
    children.push(
      table([
        narrativeRow(
          '1. Provide the results of the PAH’s manufacturing facility approval process.',
          s4.approvalResults,
          'the results of the facility approval process',
        ),
        narrativeRow(
          '2. Provide a detailed description of the personnel’s competence, qualifications, education, training, skills, and experience required to produce conforming products and articles.',
          s4.personnelCompetence,
          'the personnel competence description',
        ),
        narrativeRow(
          '3. Provide a detailed description of all types of specialized training required.',
          s4.specializedTraining,
          'the specialized training description',
        ),
        narrativeRow(
          '4. List any personnel qualifications needed to conduct inspections or perform special processes.',
          s4.inspectionQualifications,
          'the inspection and special process qualifications',
        ),
        row(
          '5. Has the proposed manufacturing facility been fully integrated into the PAH’s quality system or has it been approved by the PAH?',
          answerParagraphs(
            [
              s4.qmsIntegration === 'FULLY_INTEGRATED'
                ? 'Fully integrated into the PAH’s quality system.'
                : s4.qmsIntegration === 'PAH_APPROVED'
                  ? 'The facility operates its own quality system, which the PAH has approved.'
                  : '',
              s4.qmsIntegrationDescription.text.trim(),
            ]
              .filter((v) => v.length > 0)
              .join('\n'),
            'which quality system integration model applies',
          ),
        ),
        narrativeRow(
          '6. Describe the approval process for subtier suppliers that might manufacture any high-risk products/articles or conduct any high-risk manufacturing processes.',
          s4.subtierApprovalProcess,
          'the subtier supplier approval process',
        ),
        row(
          '7. Would all manufacturing documents used to determine conformity and airworthiness be made available in the English language, and has a listing of those documents been attached to this plan?',
          answerParagraphs(
            [
              answerOrConfirm(s4.englishLanguageAvailability, 'whether documents are available in English'),
              s4.englishLanguageDescription.text.trim(),
              `Listing attached: ${answerOrConfirm(s4.englishDocumentListingAttached, 'whether the document listing is attached')}`,
            ]
              .filter((v) => v.length > 0)
              .join('\n'),
            'whether documents are available in English',
          ),
        ),
        row(
          '8. If located in a non-bilateral country, describe how the PAH would mitigate the requirement to allow FAA access to the manufacturing facility or subtier suppliers.',
          s1.bilateralCountry === 'NO'
            ? answerParagraphs(
                s4.nonBilateralAccessMitigation.text,
                'how FAA access would be assured in a non-bilateral country',
              )
            : paragraphsFrom(
                s1.bilateralCountry === 'YES'
                  ? 'Not applicable. The manufacturing facility is located in a bilateral country.'
                  : confirmToken('whether the facility is located in a bilateral country'),
              ),
        ),
      ]),
    )

    children.push(sectionHeading('Section 5—Delegations & Inspections'))
    const selectedInspections = (
      Object.keys(INSPECTION_TYPE_LABELS) as (keyof typeof INSPECTION_TYPE_LABELS)[]
    ).filter((k) => s5.inspectionTypes[k])

    children.push(
      table([
        row(
          '1. Describe what inspections or authorities would be delegated to the manufacturing facility and how they will be controlled to ensure each product conforms to its approved design and is in a condition for safe operation. Has this listing been attached to this plan?',
          answerParagraphs(
            [
              s5.delegatedAuthorities.text.trim(),
              `Listing attached: ${answerOrConfirm(s5.delegationListingAttached, 'whether the delegation listing is attached')}`,
            ]
              .filter((v) => v.length > 0)
              .join('\n'),
            'what is delegated and how it is controlled',
          ),
        ),
        row(
          '2. Describe specific procedures and minimum inspection/test requirements that would ensure product and article conformity.',
          answerParagraphs(
            [
              s5.inspectionProcedures.text.trim(),
              selectedInspections.length > 0
                ? `Inspections conducted at the facility: ${selectedInspections
                    .map((k) => INSPECTION_TYPE_LABELS[k])
                    .join('; ')}.`
                : '',
            ]
              .filter((v) => v.length > 0)
              .join('\n'),
            'the inspection procedures and minimum requirements',
          ),
        ),
        row(
          '3. Provide justification and function codes to be used by designees.',
          s5.designeesUsed === 'NO'
            ? paragraphsFrom('No designees would be used at this manufacturing facility.')
            : answerParagraphs(
                [
                  s5.designeeJustification.text.trim(),
                  s5.designeeFunctionCodes.trim().length > 0
                    ? `Function codes: ${s5.designeeFunctionCodes.trim()}`
                    : confirmToken('the designee function codes'),
                ]
                  .filter((v) => v.length > 0)
                  .join('\n'),
                'the justification and function codes for designees',
              ),
        ),
        row(
          '4. Has the PAH agreed to pay travel expenses for designees to travel back to the United States for required training and FAA oversight?',
          s5.designeesUsed === 'NO'
            ? paragraphsFrom('Not applicable. No designees would be used at this manufacturing facility.')
            : answerParagraphs(
                answerOrConfirm(s5.designeeTravelAgreed, 'whether the PAH has agreed to pay designee travel'),
                'whether the PAH has agreed to pay designee travel',
              ),
        ),
      ]),
    )

    // AC §8.3.2 NOTE, printed as Appendix A prints it.
    children.push(
      new Paragraph({
        children: [
          text(
            'NOTE: The FAA must determine that the use of designees at the proposed facility will cause no ' +
              'undue burden.',
            { size: SMALL_SIZE, italics: true },
          ),
        ],
        spacing: { before: 120 },
      }),
    )
  }

  // ---- FAA Action Requests, Comments and Approvals -----------------------
  //
  // Reproduced from Appendix A and left empty. These belong to the FAA; a tool
  // that pre-filled them would be fabricating a federal record.
  children.push(sectionHeading('FAA Action Requests'))
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [labelCell('Action Item', 60, { shaded: true }), labelCell('ASI', 20, { shaded: true }), labelCell('Date', 20, { shaded: true })],
        }),
        ...[0, 1, 2].map(
          () =>
            new TableRow({
              children: [responseCell([new Paragraph({ children: [text('')] })], 60), responseCell([new Paragraph({ children: [text('')] })], 20), responseCell([new Paragraph({ children: [text('[mm/dd/yyyy]', { size: SMALL_SIZE })] })], 20)],
            }),
        ),
      ],
    }),
  )

  children.push(sectionHeading('Comments'))
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: [responseCell([new Paragraph({ children: [text('')] })], 100)] })],
    }),
  )

  children.push(sectionHeading('Approvals'))
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            labelCell('FAA Determination', 50, { shaded: true }),
            responseCell([new Paragraph({ children: [text('Undue Burden ☐        No Undue Burden ☐')] })], 50),
          ],
        }),
        ...['ASI Signature', 'MIDO/CMO Manager Signature', 'MIO Manager Signature', 'Directorate Manager Signature'].map(
          (label) =>
            new TableRow({
              children: [
                labelCell(label, 50, { shaded: true }),
                responseCell([new Paragraph({ children: [text('[mm/dd/yyyy]', { size: SMALL_SIZE })] })], 50),
              ],
            }),
        ),
      ],
    }),
  )

  return new Document({
    creator: profile.pahName.trim().length > 0 ? profile.pahName.trim() : 'PAH',
    title: 'PAH Project Initiation Plan',
    description: 'FAA AC 21-55 Appendix A',
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [text(determination.banner, { bold: true })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
              }),
            ],
          }),
        },
        footers: { default: pageNumberFooter() },
        children,
      },
    ],
  })
}

/**
 * "Page X of Y", footer right.
 *
 * PageNumber tokens are field codes, so they go inside a single TextRun's
 * children array rather than being separate runs.
 */
function pageNumberFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
            font: FONT,
            size: SMALL_SIZE,
          }),
        ],
      }),
    ],
  })
}
