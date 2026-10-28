import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import type { GapSummary } from './gaps';

// Mirrors @pma-autopilot/shared DRAFT_WATERMARK (kept local so the API compiles
// without pulling the shared package outside its rootDir). Must stay in sync.
const DRAFT_WATERMARK = 'DRAFT FOR INTERNAL REVIEW ONLY — NOT FOR FAA SUBMISSION';

// The four PMA documents. Mandatory paragraph content is reproduced from the
// faa-pma-supplement-generator skill, not paraphrased (spec §7). Every file carries
// the DRAFT watermark and a submission-status stamp; missing data becomes a
// [CONFIRM: …] placeholder — never invented.

export type DocType = 'APPLICATION_LETTER' | 'PMA_SUPPLEMENT' | 'SUBMISSION_CHECKLIST' | 'MANAGEMENT_REVIEW_PACK';

interface Stamp {
  submissionStatus: string;
  snapshotHash: string;
  regulatorySourceRevision: string;
}

function confirm(label: string): string {
  return `[CONFIRM: ${label}]`;
}
function val(v: unknown, label: string): string {
  return v == null || String(v).trim() === '' ? confirm(label) : String(v);
}

function watermarkHeader(): Header {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: DRAFT_WATERMARK, bold: true, color: 'B00000', size: 18 })],
      }),
    ],
  });
}

function stampFooter(stamp: Stamp): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `Submission Status: ${stamp.submissionStatus}  |  Data snapshot: ${stamp.snapshotHash.slice(0, 12)}…  |  Regulatory revision: ${stamp.regulatorySourceRevision}  |  `,
            size: 14,
            color: '666666',
          }),
          new TextRun({ children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], size: 14, color: '666666' }),
        ],
      }),
    ],
  });
}

function para(text: string, opts: { bold?: boolean; heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel] } = {}): Paragraph {
  return new Paragraph({ heading: opts.heading, children: [new TextRun({ text, bold: opts.bold })] });
}

function basisParagraph(c: any): string {
  switch (c.approvalBasis) {
    case 'STC_IDENTICALITY':
      return `Approval is requested based on identicality to the approved design data of STC ${val(c.stcNumber, 'STC number')} and is evidenced by the STC Authorizations under 14 CFR 21.303(a)(4).`;
    case 'TC_LICENSED':
      return `Approval is requested based on identicality to the approved design data under TC ${val(c.tcNumber, 'TC number')} per license agreement with ${val(c.tcHolder, 'TC holder')}, authorized under 14 CFR 21.303(a)(2).`;
    case 'IDENTICALITY_NO_LICENSE':
      return `Approval is requested based on identicality to the type design of TC ${val(c.tcNumber, 'TC number')} without a license agreement, per 14 CFR 21.303(a)(2). Identicality evidence demonstrating that the article design is identical in every respect including dimensions, tolerances, materials, and processes is enclosed.`;
    case 'TEST_AND_COMPUTATION':
      return `Approval is requested based on test reports and computations per 14 CFR 21.303(a)(1). A compliance listing, safety assessment, and supporting test reports are enclosed.`;
    default:
      return `Approval is requested based on ${confirm('approval basis — confirm before drafting')}.`;
  }
}

function commonSections(doc: { children: Paragraph[] }, c: any): void {
  doc.children.push(
    para('Quality System (AC 21.303-4 §8; 14 CFR 21.137, 21.307)', { bold: true }),
    para(`The applicant's quality system is documented in QMS Manual ${val(c.qmsManualNumber, 'QMS manual number')}, Revision ${val(c.qmsManualRevision, 'QMS manual revision')}, dated ${val(c.qmsManualDate, 'QMS manual date')}, meeting the requirements of 14 CFR 21.137 per 14 CFR 21.307.`),
    para('Article Identification and Marking (AC 21.303-4 §29; 14 CFR 45.15)', { bold: true }),
    para(`All PMA articles are permanently and legibly marked in accordance with ${val(c.markingSchemeRef, 'marking scheme reference')}, bearing the manufacturer's identification, the part number, and "FAA-PMA".`),
    para('Instructions for Continued Airworthiness (AC 21.303-4 §28; 14 CFR 21.50)', { bold: true }),
    para(c.icaDispositionStated ? 'The ICA disposition for each PMA article has been determined and is stated for this application.' : confirm('ICA disposition — state whether original ICA is valid or supplemental ICA is provided')),
    para('Airworthiness Directives (AC 21.303-4 §22)', { bold: true }),
    para(c.adImpactAddressed ? 'Airworthiness Directive impact has been reviewed; the design does not reproduce the unsafe condition of any AD affecting the original article.' : confirm('AD impact — review ADs affecting the original article')),
  );
}

async function pack(doc: Document): Promise<Buffer> {
  return Packer.toBuffer(doc);
}

export async function buildApplicationLetter(c: any, org: any, stamp: Stamp): Promise<Buffer> {
  const children: Paragraph[] = [
    para('Application for Parts Manufacturer Approval', { heading: HeadingLevel.HEADING_1 }),
    para(`FAA Submission Office: ${val(c.faaSubmissionOffice || org?.submissionOfficeName, 'FAA submission office (never assumed)')}`),
    para(''),
    para(`Applicant: ${val(c.applicantLegalName, 'applicant legal name')}`),
    para(`Manufacturing Facility: ${val(c.manufacturingAddress, 'manufacturing facility address')}`),
    para(`Article: ${val(c.articleName, 'article name')}`),
    para(''),
    para('Approval Basis (AC 21.303-4 §8)', { bold: true }),
    para(basisParagraph(c)),
  ];
  const wrapper = { children };
  commonSections(wrapper, c);
  children.push(
    para('Signatory', { bold: true }),
    para(`${val(c.signatoryName, 'signatory name')}, ${val(c.signatoryTitle, 'signatory title')}`),
    para(org?.legalName || org?.name || confirm('applicant organization')),
    para(''),
    para('Enclosures', { bold: true }),
    para('• Unnumbered PMA Supplement'),
    para('• Approval-basis evidence (STC/TC/assist letter or compliance data, per basis)'),
    para('• Master Drawing List / index document as referenced'),
  );

  const doc = new Document({
    sections: [{ headers: { default: watermarkHeader() }, footers: { default: stampFooter(stamp) }, children }],
  });
  return pack(doc);
}

export async function buildSupplement(c: any, stamp: Stamp): Promise<Buffer> {
  const border = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
  const headers = ['Article Name', 'Article Number', 'Approved Replacement For', 'Approval Basis and Approved Design Data', 'TC Holder / Make', 'Model/Series Eligibility'];
  const basisCell = [
    c.approvalBasis === 'STC_IDENTICALITY' ? `STC: ${val(c.stcNumber, 'STC number')}` : `${c.approvalBasis === 'TC_LICENSED' || c.approvalBasis === 'IDENTICALITY_NO_LICENSE' ? `TC: ${val(c.tcNumber, 'TC number')}` : confirm('approval basis')}`,
    'or later FAA approved revisions',
  ].join('\n');
  const pmaPn = (c.pmaPartNumbers && c.pmaPartNumbers.length ? c.pmaPartNumbers.join(', ') : confirm('PMA part number(s)'));
  const rowData = [val(c.articleName, 'article name'), pmaPn, (c.oemPartNumbers && c.oemPartNumbers.length ? c.oemPartNumbers.join(', ') : confirm('replaced OEM part number(s)')), basisCell, val(c.tcHolder, 'TC holder / make'), val(c.supplementModelEligibility, 'model/series eligibility')];

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h) => new TableCell({ shading: { fill: 'D0D0D0' }, borders: { top: border, bottom: border, left: border, right: border }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: 16 })] })] })),
      }),
      new TableRow({
        children: rowData.map((d) => new TableCell({ borders: { top: border, bottom: border, left: border, right: border }, children: String(d).split('\n').map((line) => new Paragraph({ children: [new TextRun({ text: line, size: 16 })] })) })),
      }),
    ],
  });

  const doc = new Document({
    sections: [{
      headers: { default: watermarkHeader() },
      footers: { default: stampFooter(stamp) },
      children: [
        para('Parts Manufacturer Approval (PMA) — Unnumbered Supplement', { heading: HeadingLevel.HEADING_1 }),
        para('Per AC 21.303-4 Appendix C', { bold: true }),
        para(''),
        table,
      ],
    }],
  });
  return pack(doc);
}

export async function buildSubmissionChecklist(c: any, gaps: GapSummary, stamp: Stamp): Promise<Buffer> {
  const items = [
    'Application letter (AC 21.303-4 §8)',
    'Unnumbered PMA Supplement (Appendix C)',
    'Approval-basis evidence for the confirmed basis',
    'Master Drawing List / index document',
    'QMS manual identification (number, revision, date)',
    'Article marking scheme (14 CFR 45.15)',
    'ICA disposition statement',
    'Airworthiness Directive review',
  ];
  const children: Paragraph[] = [
    para('PMA Submission Checklist', { heading: HeadingLevel.HEADING_1 }),
    para('Based on F-851-45 and AC 21.303-4 Appendix B', { bold: true }),
    para(`Submission Status: ${gaps.submissionStatus}`, { bold: true }),
    para(''),
    ...items.map((i) => para(`☐  ${i}`)),
    para(''),
    para('Open System-Detected Conditions', { bold: true }),
  ];
  if (gaps.blocking.length === 0 && gaps.warning.length === 0) {
    children.push(para('None open.'));
  } else {
    for (const g of [...gaps.blocking, ...gaps.warning]) {
      children.push(para(`[${g.severity.toUpperCase()}] ${g.ruleId}: ${g.findingText} (${g.clauseRefs.join('; ')})`));
    }
  }
  const doc = new Document({ sections: [{ headers: { default: watermarkHeader() }, footers: { default: stampFooter(stamp) }, children }] });
  return pack(doc);
}

export async function buildManagementReviewPack(c: any, gaps: GapSummary, stamp: Stamp): Promise<Buffer> {
  const children: Paragraph[] = [
    para('PMA Case — Management Review Pack', { heading: HeadingLevel.HEADING_1 }),
    para(`Article: ${val(c.articleName, 'article name')}`),
    para(`Approval Basis: ${c.approvalBasis ?? confirm('approval basis')}`),
    para(`Case Status: ${c.status}`),
    para(`Submission Status: ${gaps.submissionStatus}`, { bold: true }),
    para(''),
    para(`Blocking conditions: ${gaps.blocking.length}`, { bold: true }),
    ...gaps.blocking.map((g) => para(`• ${g.ruleId}: ${g.findingText}`)),
    para(`Warning conditions: ${gaps.warning.length}`, { bold: true }),
    ...gaps.warning.map((g) => para(`• ${g.ruleId}: ${g.findingText}`)),
    para(''),
    para('This pack summarizes System-Detected Conditions for management review. It is advisory; human authority makes all decisions and no package is submission-ready until a human certifies and submits it.'),
  ];
  const doc = new Document({ sections: [{ headers: { default: watermarkHeader() }, footers: { default: stampFooter(stamp) }, children }] });
  return pack(doc);
}
