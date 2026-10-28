'use strict';
// TEST-ONLY helper: fills a source-verification record as if a named human reviewer had completed every state.
// No real review is implied; it exists to prove the gates accept a complete record and reject incomplete ones.
const done = (extra) => Object.assign({ result: 'VERIFIED', reviewer: 'R. Reviewer (test fixture)', reviewDate: '2026-10-11', evidenceRef: 'TEST-FIXTURE-EVIDENCE', notes: '' }, extra || {});
function verifyRecord(rec) {
  return rec.map(r => Object.assign({}, JSON.parse(JSON.stringify(r)), {
    source: { identity: 'SAE AS9100D (test)', edition: 'Rev D (2016)', controlledCopyId: 'TEST-COPY-001' },
    clauseHierarchy: done(), interpretation: done(), intendedOutcome: done(), applicability: done({ conditions: r.applicability && r.applicability.conditions }),
    finalApproval: { status: 'APPROVED', approver: 'F. Approver (test fixture)', date: '2026-10-11', evidenceRef: 'TEST-APPROVAL' }
  }));
}
module.exports = { verifyRecord, done };
