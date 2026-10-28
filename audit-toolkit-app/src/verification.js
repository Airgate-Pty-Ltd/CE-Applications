/**
 * Source-verification record rules (shared by the NCR gate and the release validator).
 * Separate verification states: clause structure, substantive interpretation, intended outcome, applicability.
 * Technical authority is human: reviewers and the final approver must be named people, never the authoring AI,
 * and nobody may approve content they authored. Unresolved content can never read as release-verified.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Verification = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const STATES = ['clauseHierarchy', 'interpretation', 'intendedOutcome', 'applicability'];
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const AI_RE = /\b(claude|anthropic|ai|llm|gpt|model|assistant|bot|automated|auto)\b/i;

  /** @returns {{ok:boolean, reasons:string[]}} */
  function check(entry, expect) {
    const reasons = [];
    if (!entry) return { ok: false, reasons: ['no verification record entry'] };
    const id = entry.obligationId || '?';
    if (expect && expect.packVersion && entry.packVersion !== expect.packVersion) reasons.push(`${id}: record is for pack version "${entry.packVersion}", pack is "${expect.packVersion}"`);
    if (expect && expect.sourceEdition && String(entry.sourceEdition || '') !== expect.sourceEdition) reasons.push(`${id}: record source edition "${entry.sourceEdition}" does not match "${expect.sourceEdition}"`);
    if (expect && expect.clauseRef && entry.clauseRef !== expect.clauseRef) reasons.push(`${id}: record clauseRef "${entry.clauseRef}" does not match obligation paragraph "${expect.clauseRef}"`);
    if (!entry.source || !entry.source.identity || !entry.source.edition || !entry.source.controlledCopyId) reasons.push(`${id}: source identity, edition and controlled-copy identifier are required`);
    STATES.forEach(k => {
      const v = entry[k];
      if (!v || v.result !== 'VERIFIED') return reasons.push(`${id}: ${k} is not VERIFIED (${v ? v.result : 'missing'})`);
      if (!v.reviewer || !DATE_RE.test(v.reviewDate || '') || !v.evidenceRef) reasons.push(`${id}: ${k} VERIFIED requires reviewer, reviewDate and evidenceRef`);
      if (v.reviewer && AI_RE.test(v.reviewer)) reasons.push(`${id}: ${k} reviewer "${v.reviewer}" is not an accountable human reviewer`);
      if (v.reviewer && entry.authoredBy && String(v.reviewer).toLowerCase() === String(entry.authoredBy).toLowerCase()) reasons.push(`${id}: ${k} reviewer is the author (no self-approval)`);
    });
    const f = entry.finalApproval;
    if (!f || f.status !== 'APPROVED') reasons.push(`${id}: final technical approval is not APPROVED (${f ? f.status : 'missing'})`);
    else {
      if (!f.approver || !DATE_RE.test(f.date || '')) reasons.push(`${id}: final approval requires approver and date`);
      if (f.approver && AI_RE.test(f.approver)) reasons.push(`${id}: final approver "${f.approver}" is not an accountable human`);
      if (f.approver && entry.authoredBy && String(f.approver).toLowerCase() === String(entry.authoredBy).toLowerCase()) reasons.push(`${id}: final approver is the author (no self-approval)`);
    }
    return { ok: reasons.length === 0, reasons };
  }
  return { check, STATES };
});
