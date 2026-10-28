import {
  AlignmentType,
  BorderStyle,
  Paragraph,
  ShadingType,
  TableCell,
  TextRun,
  VerticalAlign,
  WidthType,
  type IBorderOptions,
} from 'docx'
import { confirmToken } from '../schema/common.ts'

/**
 * Shared docx primitives for the AC 21-55 Appendix A form.
 *
 * Appendix A is a FORM, not prose: a header block, then five numbered sections
 * laid out as label/response tables with an "FAA Validation" column the FAA
 * fills in. Reproducing that structure is the point — the FAA rejects
 * submissions in other formats, so none of this is styling preference.
 */

/** US Letter at 0.75" margins leaves 7" of usable width. In DXA, 1" = 1440. */
export const USABLE_WIDTH_DXA = 10080

export const FONT = 'Arial'
export const BODY_SIZE = 20 // half-points, i.e. 10pt
export const SMALL_SIZE = 16 // 8pt

const HAIRLINE: IBorderOptions = { style: BorderStyle.SINGLE, size: 4, color: '808080' }

export const CELL_BORDERS = {
  top: HAIRLINE,
  bottom: HAIRLINE,
  left: HAIRLINE,
  right: HAIRLINE,
}

export function text(value: string, opts: { bold?: boolean; size?: number; italics?: boolean } = {}): TextRun {
  return new TextRun({
    text: value,
    font: FONT,
    size: opts.size ?? BODY_SIZE,
    ...(opts.bold === undefined ? {} : { bold: opts.bold }),
    ...(opts.italics === undefined ? {} : { italics: opts.italics }),
  })
}

/**
 * Render a multi-line answer as separate paragraphs.
 *
 * Never put a newline inside a single text run: Word renders it as a literal
 * character rather than a line break, which is how a clean-looking answer turns
 * into one unreadable run in the FAA's copy.
 */
export function paragraphsFrom(value: string, opts: { size?: number } = {}): Paragraph[] {
  const lines = value.split('\n')
  return lines.map(
    (line, i) =>
      new Paragraph({
        children: [text(line, { size: opts.size ?? BODY_SIZE })],
        spacing: { after: i === lines.length - 1 ? 0 : 60 },
      }),
  )
}

/**
 * An answer cell. An empty answer renders as a visible CONFIRM token rather
 * than a blank, so that what is missing is legible on the page instead of being
 * something the reader has to notice by absence.
 */
export function answerParagraphs(value: string, whatIsNeeded: string): Paragraph[] {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return [
      new Paragraph({
        children: [text(confirmToken(whatIsNeeded), { bold: true })],
      }),
    ]
  }
  return paragraphsFrom(trimmed)
}

export function labelCell(
  content: string,
  widthPercent: number,
  opts: { shaded?: boolean } = {},
): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS,
    verticalAlign: VerticalAlign.TOP,
    ...(opts.shaded === true
      ? { shading: { type: ShadingType.CLEAR, fill: 'F2F2F2', color: 'auto' } }
      : {}),
    children: paragraphsFrom(content),
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
  })
}

export function responseCell(children: Paragraph[], widthPercent: number): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS,
    verticalAlign: VerticalAlign.TOP,
    children,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
  })
}

/**
 * The FAA Validation column. Appendix A prints it empty for the FAA to complete;
 * this application must never fill it in — the finding is theirs to make.
 */
export function faaValidationCell(widthPercent: number, withYesNo = false): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS,
    verticalAlign: VerticalAlign.TOP,
    shading: { type: ShadingType.CLEAR, fill: 'FAFAFA', color: 'auto' },
    children: withYesNo
      ? [
          new Paragraph({
            children: [text('Yes ☐   No ☐', { size: SMALL_SIZE })],
            alignment: AlignmentType.CENTER,
          }),
        ]
      : [new Paragraph({ children: [text('', { size: SMALL_SIZE })] })],
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
  })
}

export function sectionHeading(title: string): Paragraph {
  return new Paragraph({
    children: [text(title, { bold: true })],
    spacing: { before: 240, after: 120 },
  })
}
