import type { AssistArticle } from '../../intake/assist-letter';
import { modelEligibilityViolatesDotRule } from '../../intake/assist-letter';

// The six-point cross-document verification from the submission checklist (item 3.A),
// plus the supplement item/page checks (items 2.B / 2.C).
//
// Verifies three documents agree: (1) the source approval (assist letter or STC),
// (2) the application letter, (3) the PMA supplement.
//
// Deterministic comparison only. Where the documents disagree, the finding says so —
// it never decides which document is correct.

export interface SourceApproval {
  systemName: string;
  approvalNumber: string; // STC or TC number
  tcHolder: string;
  modelEligibility: string;
  drawingListNumber: string;
  drawingListRev: string;
  articles: AssistArticle[];
}

export interface LetterFacts {
  systemName: string;
  approvalNumber: string;
  tcHolder: string;
  modelEligibility: string;
  enclosures: string[];
  drawingListNumber: string;
  drawingListRev: string;
}

export interface SupplementFacts {
  articles: AssistArticle[];
  pageCount?: number;
  faaNotifiedOfPageCount?: boolean;
}

export interface CheckResult {
  ruleId: string;
  check: string;
  passed: boolean;
  detail: string;
  values?: Record<string, string>;
}

const norm = (s: string): string => (s ?? '').replace(/\s+/g, ' ').trim().toUpperCase();

// Model eligibility is written differently by design in each document (the letter uses a
// prose list with the make prefix; the supplement splits make and model into two columns).
// Compare on the significant tokens rather than demanding literal equality.
function modelTokens(s: string): string[] {
  return norm(s)
    .replace(/\b(SERIES|MODELS|MODEL|AND)\b/g, ' ')
    .split(/[,;/\s]+/)
    .map((t) => t.replace(/^[AB](?=\d)/, '')) // drop the Boeing/Airbus prefix for comparison
    .filter((t) => /\d/.test(t));
}

function tokensAgree(a: string, b: string): boolean {
  const ta = new Set(modelTokens(a));
  const tb = modelTokens(b);
  if (!ta.size || !tb.length) return false;
  return tb.every((t) => ta.has(t)) || [...ta].every((t) => tb.includes(t));
}

export function runCrossChecks(
  src: SourceApproval,
  letter: LetterFacts,
  supp: SupplementFacts,
): CheckResult[] {
  const out: CheckResult[] = [];
  const suppApproval = supp.articles[0]?.approvalRef ?? '';
  const suppHolder = supp.articles[0]?.makeTcHolder ?? '';
  const suppModel = supp.articles[0]?.modelSeries ?? '';

  // I — System Name
  out.push({
    ruleId: 'PMA-XDOC-001',
    check: 'System Name',
    passed: norm(src.systemName) === norm(letter.systemName),
    detail: 'System Name must agree across the source approval, the application letter, and the supplement.',
    values: { sourceApproval: src.systemName, applicationLetter: letter.systemName },
  });

  // II — Approval Number (STC/TC)
  out.push({
    ruleId: 'PMA-XDOC-002',
    check: 'Approval Number',
    passed: norm(src.approvalNumber) === norm(letter.approvalNumber) && norm(src.approvalNumber) === norm(suppApproval),
    detail: 'Approval number must agree across all three documents.',
    values: { sourceApproval: src.approvalNumber, applicationLetter: letter.approvalNumber, supplement: suppApproval },
  });

  // III — TC Holder
  out.push({
    ruleId: 'PMA-XDOC-003',
    check: 'TC Holder',
    passed: norm(src.tcHolder) === norm(letter.tcHolder) && norm(src.tcHolder) === norm(suppHolder),
    detail: 'TC Holder must agree across all three documents.',
    values: { sourceApproval: src.tcHolder, applicationLetter: letter.tcHolder, supplement: suppHolder },
  });

  // IV — Model Eligibility
  out.push({
    ruleId: 'PMA-XDOC-004',
    check: 'Model Eligibility',
    passed: tokensAgree(letter.modelEligibility, src.modelEligibility) && tokensAgree(letter.modelEligibility, suppModel),
    detail: 'Model eligibility must agree across all three documents, with the make prefix convention applied in the letter.',
    values: { sourceApproval: src.modelEligibility, applicationLetter: letter.modelEligibility, supplement: suppModel },
  });

  // V — Enclosures agree with what the letter body cites
  const encl = letter.enclosures.map(norm).join(' | ');
  const citesApproval = encl.includes(norm(letter.approvalNumber));
  const citesDrawingList = encl.includes(norm(letter.drawingListNumber));
  const citesSupplement = /SUPPLEMENT/.test(encl);
  out.push({
    ruleId: 'PMA-XDOC-005',
    check: 'Enclosures',
    passed: citesApproval && citesDrawingList && citesSupplement,
    detail: 'The enclosures list must match the documents cited in the letter body (supplement, approval, drawing/index list).',
    values: {
      enclosures: letter.enclosures.join(' / '),
      missing: [
        citesSupplement ? '' : 'supplement',
        citesApproval ? '' : `approval ${letter.approvalNumber}`,
        citesDrawingList ? '' : `drawing list ${letter.drawingListNumber}`,
      ].filter(Boolean).join(', ') || 'none',
    },
  });

  // VI — Index/Drawing list matches the one on the source approval
  const srcDwg = src.articles[0]?.drawingNumber ?? src.drawingListNumber;
  const srcRev = src.articles[0]?.drawingRev ?? src.drawingListRev;
  out.push({
    ruleId: 'PMA-XDOC-006',
    check: 'Index / Drawing List',
    passed: norm(letter.drawingListNumber) === norm(srcDwg) && norm(letter.drawingListRev) === norm(srcRev),
    detail: 'The attached index/drawing list must be the one identified on the source approval, at its revision.',
    values: {
      sourceApproval: `${srcDwg} Rev ${srcRev}`,
      applicationLetter: `${letter.drawingListNumber} Rev ${letter.drawingListRev}`,
    },
  });

  // 2.B — every supplement article authorized, and counts reconcile (catches duplicates)
  const srcNums = src.articles.map((a) => a.articleNumber);
  const suppNums = supp.articles.map((a) => a.articleNumber);
  const dupes = suppNums.filter((n, i) => suppNums.indexOf(n) !== i);
  const unauthorized = suppNums.filter((n) => !srcNums.includes(n));
  const omitted = srcNums.filter((n) => !suppNums.includes(n));
  out.push({
    ruleId: 'PMA-SUPP-001',
    check: 'Supplement item reconciliation',
    passed: dupes.length === 0 && unauthorized.length === 0 && omitted.length === 0,
    detail: 'Every supplement article must be authorized by the source approval, with no duplicates or omissions.',
    values: {
      sourceArticles: String(srcNums.length),
      supplementRows: String(suppNums.length),
      duplicated: dupes.length ? [...new Set(dupes)].join(', ') : 'none',
      notAuthorized: unauthorized.length ? unauthorized.join(', ') : 'none',
      omitted: omitted.length ? omitted.join(', ') : 'none',
    },
  });

  // 2.C — page count guidance
  if (supp.pageCount != null) {
    out.push({
      ruleId: 'PMA-SUPP-002',
      check: 'Supplement page count',
      passed: supp.pageCount <= 10 || supp.faaNotifiedOfPageCount === true,
      detail: 'Target is 10 pages; exceeding it is permitted provided the FAA office is notified of the total.',
      values: { pages: String(supp.pageCount), faaNotified: String(!!supp.faaNotifiedOfPageCount) },
    });
  }

  // Supplement formatting: dot rule on model eligibility
  const dotViolations = supp.articles.filter((a) => modelEligibilityViolatesDotRule(a.modelSeries));
  out.push({
    ruleId: 'PMA-SUPP-003',
    check: 'Model eligibility punctuation',
    passed: dotViolations.length === 0,
    detail: "A '.' may appear in the model eligibility column only as part of a model number.",
    values: { offendingRows: dotViolations.length ? dotViolations.map((a) => a.articleNumber).join(', ') : 'none' },
  });

  return out;
}
