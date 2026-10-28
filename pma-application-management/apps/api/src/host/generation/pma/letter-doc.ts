import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle,
} from 'docx';
import { loadGolden, render, type Ctx, letterVariantKey } from './templates';

// PMA Application Letter generator.
//
// One skeleton, four variants selected by approval source x single/multiple, exactly
// as the submission checklist prescribes. The golden template holds the skeleton and
// the per-variant basis paragraph and enclosures; the tenant profile supplies the FAA
// office block, applicant identity, address and footer.

const FONT = 'Times New Roman';
const SIZE = 24;

function p(text: string, opts: { bold?: boolean; spaceAfter?: number } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: opts.spaceAfter ?? 160 },
    children: [new TextRun({ text, bold: opts.bold, font: FONT, size: SIZE })],
  });
}

export type LetterSource = 'TC_HOLDER' | 'STC';
export type LetterCount = 'SINGLE' | 'MULTIPLE';

export interface LetterInput {
  tenant: Ctx;
  case: Ctx;
  source: LetterSource;
  count: LetterCount;
}

export function selectVariant(g: any, source: LetterSource, count: LetterCount) {
  const key = letterVariantKey(source, count);
  const v = g.variants[key];
  if (!v) throw new Error(`No letter variant for ${key}`);
  return { key, variant: v };
}

export async function buildApplicationLetter(input: LetterInput): Promise<{ buffer: Buffer; variantKey: string }> {
  const g = loadGolden('application-letter');
  const ctx: Ctx = { tenant: input.tenant, case: input.case };
  const { key, variant } = selectVariant(g, input.source, input.count);

  const children: (Paragraph | Table)[] = [];

  // FAA office block — tenant-specific, never defaulted from another organization.
  for (const line of (input.tenant.faaOffice as any).lines as string[]) {
    children.push(p(line, { spaceAfter: 0 }));
  }
  children.push(p(''));
  children.push(p(render('{{case.letterDate}}', ctx)));
  children.push(p('Subject: Request for PMA', { bold: true }));
  children.push(p(''));

  // Paragraph 1 — a variant may override it (the multiple-STC letter refers to a table).
  const skeletonP1 = g.skeleton.find((b: any) => b.block === 'paragraph_1').text;
  children.push(p(render(variant.paragraph_1_override ?? skeletonP1, ctx)));

  // Paragraph 2 — the approval basis, variant specific.
  children.push(p(render(variant.paragraph_2_basis, ctx)));

  // Optional multi-approval table (multiple-source STC variant).
  if (variant.multi_stc_table) {
    const cols: string[] = variant.multi_stc_table.columns;
    const rowsData = (input.case.stcTableRows as string[][]) ?? [];
    const border = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: cols.map(
              (c) =>
                new TableCell({
                  borders: { top: border, bottom: border, left: border, right: border },
                  shading: { fill: 'F2F2F2' },
                  children: [p(c, { bold: true, spaceAfter: 0 })],
                }),
            ),
          }),
          ...rowsData.map(
            (r) =>
              new TableRow({
                children: r.map(
                  (c) =>
                    new TableCell({
                      borders: { top: border, bottom: border, left: border, right: border },
                      children: [p(c, { spaceAfter: 0 })],
                    }),
                ),
              }),
          ),
        ],
      }),
    );
    children.push(p(''));
  }

  // Paragraph 3 (manufacturing) and 4 (closing) come straight from the skeleton.
  children.push(p(render(g.skeleton.find((b: any) => b.block === 'paragraph_3_manufacturing').text, ctx)));
  children.push(p(g.skeleton.find((b: any) => b.block === 'paragraph_4_closing').text));

  for (const line of g.skeleton.find((b: any) => b.block === 'signature').lines as string[]) {
    children.push(p(render(line, ctx), { spaceAfter: 0 }));
  }
  children.push(p(''));

  children.push(p('Enclosures:', { bold: true, spaceAfter: 0 }));
  for (const e of variant.enclosures as string[]) {
    children.push(p(render(e, ctx), { spaceAfter: 0 }));
  }
  children.push(p(''));

  for (const line of g.skeleton.find((b: any) => b.block === 'footer').lines as string[]) {
    children.push(p(render(line, ctx), { spaceAfter: 0 }));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    sections: [{ children }],
  });
  return { buffer: await Packer.toBuffer(doc), variantKey: key };
}
