import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, Header, Footer, PageNumber, BorderStyle, HeadingLevel,
} from 'docx';
import type { AssistArticle } from '../../intake/assist-letter';
import { basisCell } from '../../intake/assist-letter';
import { loadGolden, render, type Ctx } from './templates';

// Unnumbered PMA Supplement generator.
//
// Structure comes from the golden template (AC 21.303-4 App. C as implemented by the
// organization's supplement form). Formatting follows the constraints the golden
// template records: Times New Roman 12pt (bold titles), gridlines not borders, one
// contiguous table with no page breaks, header + page footer on every page, and the
// supplement number/date left blank on submission.

const FONT = 'Times New Roman';
const SIZE = 24; // half-points => 12pt

const GRID = { style: BorderStyle.SINGLE, size: 1, color: 'BFBFBF' };
const GRIDLINES = { top: GRID, bottom: GRID, left: GRID, right: GRID };

function tx(text: string, bold = false): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, bold, font: FONT, size: SIZE })] });
}

function cell(lines: string[], bold = false): TableCell {
  return new TableCell({
    borders: GRIDLINES,
    shading: bold ? { fill: 'F2F2F2' } : undefined,
    children: lines.length ? lines.map((l) => tx(l, bold)) : [tx('', bold)],
  });
}

export interface SupplementInput {
  tenant: Ctx;
  case: Ctx;
  articles: AssistArticle[];
}

export async function buildSupplement(input: SupplementInput): Promise<Buffer> {
  const g = loadGolden('pma-supplement');
  const ctx: Ctx = { tenant: input.tenant, case: input.case };

  // Header block: applicant identity + PMA number, supplement number and date.
  // The golden template records that supplement number and date are left BLANK on
  // submission — render them empty rather than as [CONFIRM: …] placeholders.
  const blankOnSubmission = new Set(['case.supplementNumber', 'case.supplementDate']);
  const headerGrid = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: (g.headerBlock.grid as string[][]).map(
      (row) =>
        new TableRow({
          children: row.map((c) => {
            const token = c.match(/^\{\{([a-zA-Z0-9_.]+)\}\}$/)?.[1];
            const text = token && blankOnSubmission.has(token) ? '' : render(c, ctx);
            return cell([text], /PMA No\.|Supplement No\.|Date/.test(c));
          }),
        }),
    ),
  });

  const columns: string[] = g.columns;
  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true, // repeats the column headers on every page
      children: columns.map((c) => cell([c], true)),
    }),
    ...input.articles.map(
      (a) =>
        new TableRow({
          children: [
            cell([a.articleName]),
            cell([a.articleNumber]),
            cell([a.replacementFor]),
            cell(basisCell(a)), // SOP-prescribed wording, normalized
            cell([a.makeTcHolder]),
            cell([a.modelSeries]),
          ],
        }),
    ),
  ];

  const articleTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });

  const closing: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: g.closing.endMarker, font: FONT, size: SIZE })],
    }),
    tx(''),
    tx(g.closing.proceduresNote),
    tx(''),
    ...(input.tenant.faaOffice as any).signatureBlockLines.map((l: string) => tx(l)),
  ];

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: g.headerBlock.title, bold: true, font: FONT, size: SIZE })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], font: FONT, size: 20 }),
                ],
              }),
            ],
          }),
        },
        children: [headerGrid, tx(''), articleTable, tx(''), ...closing],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

// Rows-per-page is layout dependent; the tool records the article count and lets the
// page count be measured from the rendered file rather than guessed.
export function supplementItemCount(articles: AssistArticle[]): number {
  return articles.length;
}
