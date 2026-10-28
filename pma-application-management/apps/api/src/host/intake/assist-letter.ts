// Production Assist Letter parser.
//
// The assist letter (issued by the STC holder / ODA) is the source of truth for the
// Unnumbered PMA Supplement. Its 4-column table maps onto the supplement's 6 columns:
//
//   Manufacturer Part Name and Part No. -> Article Name + Article Number   (splits)
//   Approved Replacement For            -> Approved Replacement for Article Number
//   TC/STC/TSOA Approval and Design Data-> Approval Basis and Approved Design Data
//   Model Eligibility                   -> Make/TCH Eligibility + Model/Series (splits)
//
// Deterministic text parsing only — no inference, no LLM. Any row that does not match
// the expected shape is reported as unparsed rather than guessed at.
//
// Verified against: Northwest Aerospace Technologies ODA assist letter, 10 Apr 2026,
// STC ST12351SE (102 article rows).

export interface AssistArticle {
  articleName: string;
  articleNumber: string;
  replacementFor: string;
  approvalRef: string; // e.g. "ST12351SE"
  approvalKind: 'STC' | 'TC' | 'TSOA';
  drawingNumber: string;
  drawingRev: string;
  drawingDate: string;
  makeTcHolder: string;
  modelSeries: string;
}

export interface AssistLetterData {
  issuer: string | null; // e.g. "Northwest Aerospace Technologies, Inc."
  stcNumber: string | null;
  stcIssuedDate: string | null;
  articles: AssistArticle[];
  unparsedBlocks: string[];
}

// The extracted table uses TWO row shapes, depending on how the PDF laid the cell out:
//   (a) combined — "827000520-001 STC:  ST12351SE"   (replacement-for + approval on one line)
//   (b) split    — "827PS07-101-024"                 (replacement-for on its own line)
//                  "STC: ST12351SE"
// Both are real and appear in the same letter. Handle both or articles are silently lost.
const ANCHOR_COMBINED = /^(\S+)\s+(STC|TC|TSOA)\s*(?:No\.?)?\s*:\s*(\S+)\s*$/i;
const ANCHOR_BARE = /^(STC|TC|TSOA)\s*(?:No\.?)?\s*:\s*(\S+)\s*$/i;
const ANCHOR = new RegExp(
  `(?:${ANCHOR_COMBINED.source})|(?:${ANCHOR_BARE.source})`,
  'i',
);
const DWG = /^(?:Dwg|DWG)\s*(?:No)?\.?\s*:\s*(\S+)/i;
const REV = /^Rev\.?\s*:?\s*(\S+)/i;
const DATE = /^Date\s*:\s*(.+?)\s*$/i;
const ISSUED = /^(.*?)\s+ODA has issued\s+(?:STC\s+)?(\S+)\s+on\s+([A-Z][a-z]+\.?\s+\d{1,2},\s*\d{4})/i;

// A part number in this package: no spaces, contains a digit AND a hyphen
// (e.g. 827000520-001, 827CM133-04, 827PSC001-101). This deliberately excludes
// all-alpha name fragments such as "INSTALLATION" or "KIT".
const PART_NUMBER = /^(?=[^\s]*\d)(?=[^\s]*-)[A-Za-z0-9][A-Za-z0-9._\-/]{4,}$/;

// Page furniture repeated on every page of the assist letter: page numbers, the
// issuer letterhead, and the repeated column headers. These interleave with table
// rows at page boundaries and must be removed before parsing, or a row straddling a
// page break is mis-read. Exact-match only — nothing content-bearing is discarded.
const NOISE: RegExp[] = [
  /^Page \d+ of \d+$/i,
  /^Manufacturer Part$/i,
  /^Name and Part No\.?$/i,
  /^Approved$/i,
  /^Replacement For$/i,
  /^TC\/STC\/TSOA Approval$/i,
  /^and Design Data$/i,
  /^Model Eligibility$/i,
];

function clean(lines: string[], extraNoise: RegExp[] = []): string[] {
  const noise = [...NOISE, ...extraNoise];
  return lines
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0)
    .filter((l) => !noise.some((re) => re.test(l)));
}

export function parseAssistLetter(rawText: string): AssistLetterData {
  const raw = rawText.split('\n');
  // Letterhead lines repeat verbatim on every page; derive them from page 1 so the
  // filter adapts to whichever ODA issued the letter rather than being hardcoded.
  const letterhead: RegExp[] = [];
  const firstPage = clean(raw.slice(0, 12));
  for (const l of firstPage) {
    if (/Tel\.?:|^\d+ .+ Road|^[A-Z][A-Z\s&,.'-]{12,}$/.test(l)) {
      letterhead.push(new RegExp(`^${l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
    }
  }
  const lines = clean(raw, letterhead);
  const out: AssistLetterData = {
    issuer: null,
    stcNumber: null,
    stcIssuedDate: null,
    articles: [],
    unparsedBlocks: [],
  };

  // Header: "<Issuer> ODA has issued STC <number> on <date>."
  for (const l of lines) {
    const m = l.match(ISSUED);
    if (m) {
      out.issuer = m[1].trim();
      out.stcNumber = m[2].trim();
      out.stcIssuedDate = m[3].trim();
      break;
    }
  }

  // Walk the table. An anchor line ends the article-name block and starts the basis block.
  let nameBuf: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const combined = lines[i].match(ANCHOR_COMBINED);
    const bare = combined ? null : lines[i].match(ANCHOR_BARE);
    if (!combined && !bare) {
      nameBuf.push(lines[i]);
      if (nameBuf.length > 40) nameBuf.shift(); // bound the buffer on prose sections
      i += 1;
      continue;
    }

    let replacementFor: string;
    let approvalKind: AssistArticle['approvalKind'];
    let approvalRef: string;
    if (combined) {
      replacementFor = combined[1];
      approvalKind = combined[2].toUpperCase() as AssistArticle['approvalKind'];
      approvalRef = combined[3];
    } else {
      // Split shape: the replacement-for is the line immediately above.
      replacementFor = nameBuf.pop() ?? '';
      approvalKind = bare![1].toUpperCase() as AssistArticle['approvalKind'];
      approvalRef = bare![2];
    }

    // Basis block follows the anchor.
    let drawingNumber = '';
    let drawingRev = '';
    let drawingDate = '';
    let j = i + 1;
    for (; j < lines.length && j <= i + 4; j += 1) {
      const d = lines[j].match(DWG);
      if (d) { drawingNumber = d[1]; continue; }
      const r = lines[j].match(REV);
      if (r) { drawingRev = r[1]; continue; }
      const dt = lines[j].match(DATE);
      if (dt) { drawingDate = dt[1]; continue; }
      break;
    }
    // Then Make (TCH) and Model/Series — but never consume the next row's anchor.
    const makeTcHolder = lines[j] && !ANCHOR.test(lines[j]) ? lines[j] : '';
    const modelSeries =
      makeTcHolder && lines[j + 1] && !ANCHOR.test(lines[j + 1]) ? lines[j + 1] : '';

    // Recover article number + name from the buffered lines.
    // Shape: [<page/table header noise>…] <articleNumber> <NAME LINE…>
    // Take the LAST strict part number that still has name text after it, so leading
    // page-header noise is discarded and multi-line names stay intact.
    const block = [...nameBuf];
    let articleNumber = '';
    let articleName = '';
    for (let k = block.length - 1; k >= 0; k -= 1) {
      if (PART_NUMBER.test(block[k]) && k + 1 < block.length) {
        articleNumber = block[k];
        articleName = block.slice(k + 1).join(' ');
        break;
      }
    }

    if (articleNumber && articleName) {
      out.articles.push({
        articleName: articleName.trim(),
        articleNumber: articleNumber.trim(),
        replacementFor,
        approvalRef,
        approvalKind,
        drawingNumber,
        drawingRev,
        drawingDate,
        makeTcHolder: makeTcHolder.trim(),
        modelSeries: modelSeries.trim(),
      });
    } else {
      out.unparsedBlocks.push(block.join(' | '));
    }

    nameBuf = [];
    // Advance past only what was actually consumed.
    i = j + (makeTcHolder ? 1 : 0) + (modelSeries ? 1 : 0);
  }

  return out;
}

// Canonical "Approval Basis and Approved Design Data" cell.
//
// Wording is fixed by SOP-851-12 Rev C "Filling Instructions" §8, which prescribes
// "STC No:" and "DWG No:" — NOT "STC:"/"Dwg:" — and warns: "Do not use wording that is
// different than that contained in the FAA Orders and sample supplement."
// AC 21.303-4 App. C likewise uses "DWG No:".
//
// NOTE: in the issued ST12351SE supplement only row 1 follows this form; rows 2-103 use
// the shortened "STC:"/"Dwg:". Normalizing here restores the SOP-prescribed wording.
export function basisCell(a: AssistArticle): string[] {
  const dateText = /or later/i.test(a.drawingDate)
    ? a.drawingDate
    : `${a.drawingDate} or later FAA approved revisions.`;
  return [
    `${a.approvalKind} No: ${a.approvalRef}`,
    `DWG No: ${a.drawingNumber}`,
    `Rev: ${a.drawingRev}`,
    `Date: ${dateText}`,
  ];
}

// SOP-851-12 Filling Instructions §5: "Be sure not to use dot '.' in the model
// eligibility column unless part of the model number."
export function modelEligibilityViolatesDotRule(model: string): boolean {
  // A dot is permitted only when it sits between digits (part of a model number).
  return /\.(?!\d)|(?<!\d)\./.test(model);
}
