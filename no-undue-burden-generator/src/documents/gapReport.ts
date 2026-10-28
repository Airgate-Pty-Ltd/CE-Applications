import {
  AlignmentType,
  Document,
  Header,
  Paragraph,
  Table,
  TableRow,
  WidthType,
} from 'docx'
import type { Determination } from '../engine/determine.ts'
import type { OrganizationProfile } from '../schema/profile.ts'
import { labelCell, responseCell, sectionHeading, SMALL_SIZE, text } from './style.ts'

/**
 * Gap report — the companion document to the plan.
 *
 * This is the honest half of the deliverable: it states the routing outcome and
 * why, lists every gap in blocking → warning → info order, and reports the
 * consistency checks. It exists so that "the plan generated" is never mistaken
 * for "the plan is complete".
 */
export function buildGapReport(
  determination: Determination,
  profile: OrganizationProfile,
  planDate: string,
): Document {
  const children: (Paragraph | Table)[] = []

  children.push(
    new Paragraph({
      children: [text('Gap Report', { bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [
        text('PAH Project Initiation Plan — FAA AC 21-55', { size: SMALL_SIZE, italics: true }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),
  )

  // ---- Summary -----------------------------------------------------------
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            labelCell('PAH', 30, { shaded: true }),
            responseCell([new Paragraph({ children: [text(profile.pahName || '—')] })], 70),
          ],
        }),
        new TableRow({
          children: [
            labelCell('Project/PC number', 30, { shaded: true }),
            responseCell([new Paragraph({ children: [text(profile.projectOrPcNumber || '—')] })], 70),
          ],
        }),
        new TableRow({
          children: [
            labelCell('Plan date', 30, { shaded: true }),
            responseCell([new Paragraph({ children: [text(planDate || '—')] })], 70),
          ],
        }),
        new TableRow({
          children: [
            labelCell('Status', 30, { shaded: true }),
            responseCell(
              [
                new Paragraph({ children: [text(determination.banner, { bold: true })] }),
                new Paragraph({ children: [text(determination.bannerRationale, { size: SMALL_SIZE })] }),
              ],
              70,
            ),
          ],
        }),
        new TableRow({
          children: [
            labelCell('Routing', 30, { shaded: true }),
            responseCell(
              [
                new Paragraph({
                  children: [
                    text(
                      determination.risk.routing === 'FULL_PROJECT_PLAN'
                        ? 'Full project plan (Sections 1–5)'
                        : determination.risk.routing === 'INITIAL_NOTIFICATION'
                          ? 'Initial notification (Sections 1–2)'
                          : 'Indeterminate',
                      { bold: true },
                    ),
                  ],
                }),
                new Paragraph({
                  children: [text(determination.risk.routingRationale, { size: SMALL_SIZE })],
                }),
              ],
              70,
            ),
          ],
        }),
      ],
    }),
  )

  // ---- Risk determination -------------------------------------------------
  children.push(sectionHeading('Risk determination'))
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        riskRow('Listed on the CPL', determination.risk.cplListed, determination.risk.cplRationale),
        riskRow('Identified as high-risk', determination.risk.highRisk, determination.risk.highRiskRationale),
        riskRow(
          'Fully inspectable upon receipt',
          determination.risk.fullyInspectable,
          determination.risk.inspectabilityRationale,
        ),
      ],
    }),
  )

  // ---- Gaps ---------------------------------------------------------------
  const groups = [
    { title: 'Blocking — generation is refused until these are resolved', items: determination.gaps.blocking },
    { title: 'Warnings — the document generates, stamped DRAFTED WITH GAPS', items: determination.gaps.warnings },
    { title: 'Informational', items: determination.gaps.info },
  ]

  for (const group of groups) {
    children.push(sectionHeading(group.title))
    if (group.items.length === 0) {
      children.push(new Paragraph({ children: [text('None.', { italics: true, size: SMALL_SIZE })] }))
      continue
    }
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              labelCell('Location', 20, { shaded: true }),
              labelCell('Finding', 45, { shaded: true }),
              labelCell('What to do', 35, { shaded: true }),
            ],
          }),
          ...group.items.map(
            (g) =>
              new TableRow({
                children: [
                  responseCell(
                    [
                      new Paragraph({ children: [text(g.location, { size: SMALL_SIZE })] }),
                      new Paragraph({
                        children: [text(g.citation ?? '', { size: SMALL_SIZE, italics: true })],
                      }),
                    ],
                    20,
                  ),
                  responseCell(
                    [
                      new Paragraph({ children: [text(g.title, { bold: true, size: SMALL_SIZE })] }),
                      new Paragraph({ children: [text(g.detail, { size: SMALL_SIZE })] }),
                    ],
                    45,
                  ),
                  responseCell([new Paragraph({ children: [text(g.remedy, { size: SMALL_SIZE })] })], 35),
                ],
              }),
          ),
        ],
      }),
    )
  }

  // ---- Consistency checks --------------------------------------------------
  children.push(sectionHeading('Consistency checks'))
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            labelCell('Result', 12, { shaded: true }),
            labelCell('Check', 43, { shaded: true }),
            labelCell('Detail', 45, { shaded: true }),
          ],
        }),
        ...determination.validation.checks.map(
          (c) =>
            new TableRow({
              children: [
                responseCell(
                  [
                    new Paragraph({
                      children: [
                        text(!c.applicable ? 'n/a' : c.passed ? 'PASS' : 'FAIL', {
                          bold: true,
                          size: SMALL_SIZE,
                        }),
                      ],
                    }),
                  ],
                  12,
                ),
                responseCell(
                  [
                    new Paragraph({ children: [text(c.description, { size: SMALL_SIZE })] }),
                    new Paragraph({ children: [text(c.citation, { size: SMALL_SIZE, italics: true })] }),
                  ],
                  43,
                ),
                responseCell([new Paragraph({ children: [text(c.detail, { size: SMALL_SIZE })] })], 45),
              ],
            }),
        ),
      ],
    }),
  )

  children.push(
    new Paragraph({
      spacing: { before: 240 },
      children: [
        text(
          'This report describes the completeness and internal consistency of the plan against AC 21-55. ' +
            'Whether the plan supports a finding of no undue burden is a determination for the FAA managing ' +
            'office.',
          { size: SMALL_SIZE, italics: true },
        ),
      ],
    }),
  )

  return new Document({
    creator: profile.pahName.trim().length > 0 ? profile.pahName.trim() : 'PAH',
    title: 'Gap Report — PAH Project Initiation Plan',
    sections: [
      {
        properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [text(determination.banner, { bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children,
      },
    ],
  })
}

function riskRow(label: string, answer: string, rationale: string): TableRow {
  return new TableRow({
    children: [
      labelCell(label, 30, { shaded: true }),
      responseCell(
        [
          new Paragraph({
            children: [text(answer === 'UNANSWERED' ? 'Not answered' : answer === 'YES' ? 'Yes' : 'No', { bold: true })],
          }),
          new Paragraph({ children: [text(rationale, { size: SMALL_SIZE })] }),
        ],
        70,
      ),
    ],
  })
}
