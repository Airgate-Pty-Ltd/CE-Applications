'use strict';
const test = require('node:test'), assert = require('node:assert');
const Data = require('../src/synthetic-data.js');
const RIL = Data.RIL, PACK = Data.LIB;
const P = require('../src/planner-core.js'), G = require('../src/program-core.js'), SC = require('../src/scar-core.js'), CP = require('../src/competency-core.js');
const TD = require('../src/toolkit-data.js');
const clone = o => JSON.parse(JSON.stringify(o));

function basePlan(over) {
  return P.createPlan(Object.assign({ id: 'PLAN-2026-01', title: 'Calibration and traceability', org: { name: 'Meridian', site: 'Plant 2', activities: ['manufacture', 'distribute'] }, standard: { id: 'AS9100D', edition: 'Rev D (2016)' }, criteria: { certifications: ['AS9100D'] },
    auditType: 'Internal', objectives: ['Determine whether calibration control and traceability are effective'], scope: 'Line 3 and Inspection', processes: ['Calibration & Measurement', 'Production Control'], obligationIds: ['OB-7.1.5.2-a', 'OB-8.5.2'],
    dates: { start: '2026-11-03', days: null }, team: [{ auditorId: 'AU-01', name: 'A. Reyes', role: 'Lead' }, { auditorId: 'AU-03', name: 'M. Lindqvist', role: 'Auditor' }], author: 'Planner' }, over || {}));
}

/* ---------------- Library consumption ---------------- */
test('the Toolkit consumes the library pack: verified on load, no private copy of the content', () => {
  assert.ok(RIL.verifyPack(PACK, Data.MANIFEST).ok);
  assert.strictEqual(Data.OBLIGATIONS.length, PACK.obligations.length);
  Data.OBLIGATIONS.forEach(o => assert.strictEqual(o.record, PACK.obligations.find(r => r.obligationId === o.id)));
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'synthetic-data.js'), 'utf8');
  assert.ok(!/const OBLIGATIONS = \[/.test(src), 'no literal obligation list in the Toolkit');
});
test('a tampered pack is refused (verification failure stops the Toolkit)', () => {
  const t = clone(PACK); t.obligations[0].auditQuestions[0] += ' tampered';
  assert.strictEqual(RIL.verifyPack(t, Data.MANIFEST).ok, false);
});

/* ---------------- Audit planner ---------------- */
test('planner: checklist carries every canonical field per obligation, separately, with interactions and related-requirement flags', () => {
  const plan = basePlan(); const cl = P.buildChecklist(plan, PACK);
  assert.strictEqual(cl.length, 2);
  cl.forEach(c => { assert.ok(c.auditQuestions.length >= 4 && c.interviewQuestions.length >= 2 && c.expectedEvidence.length >= 3 && c.alternativeValidImplementations.length >= 1 && c.riskConsiderations.length >= 1); assert.match(c.citation, /^AS9100D Rev D \(2016\) /); });
  const cal = cl.find(c => c.obligationId === 'OB-7.1.5.2-a');
  assert.ok(cal.related.some(r => r.obligationId === 'OB-8.5.2' && r.inPlan === true));
  assert.ok(cal.processInteractions.some(p => p.process === 'Production and inspection'));
});
test('planner: applicability and process selection use the resolver with reasons; excluded obligations cannot be planned', () => {
  const sel = P.selectable(PACK, { activities: ['distribute'], certifications: ['AS9100D'] }, null);
  const comp = sel.find(s => s.obligationId === 'OB-7.2-c'); assert.strictEqual(comp.applies, false); assert.match(comp.reason, /required activities/);
  const plan = basePlan({ org: { name: 'x', site: 'y', activities: ['distribute'] }, obligationIds: ['OB-7.2-c'], processes: ['Competence & Training'] });
  assert.ok(P.planIssues(plan, PACK, TD.AUDITORS).some(i => i.level === 'block' && /not applicable/.test(i.msg)));
});
test('planner: duration and agenda are deterministic and labelled as planning estimates', () => {
  const plan = basePlan(); const d1 = P.estimateDuration(plan, PACK), d2 = P.estimateDuration(clone(plan), PACK);
  assert.deepStrictEqual(d1, d2); assert.match(d1.note, /Planning estimate/); assert.ok(d1.days >= 1);
  const ag = P.buildAgenda(plan, PACK); assert.strictEqual(ag[0].activity, 'Opening meeting'); assert.strictEqual(ag[ag.length - 1].activity, 'Closing meeting');
  assert.ok(ag.some(r => /Calibration/.test(r.activity)) && ag.some(r => /Production Control/.test(r.activity)));
});
test('planner: competence, lead qualification, expiry and independence block approval', () => {
  const p1 = basePlan({ team: [{ auditorId: 'AU-04', name: 'T. Haddad', role: 'Lead' }] });
  assert.ok(P.teamCheck(p1, TD.AUDITORS).some(i => i.code === 'no-competence'));
  const p2 = basePlan({ team: [{ auditorId: 'AU-02', name: 'J. Okafor', role: 'Lead' }] });
  const codes = P.teamCheck(p2, TD.AUDITORS).map(i => i.code); assert.ok(codes.includes('not-lead-qualified') && codes.includes('independence'));
  const p3 = basePlan({ dates: { start: '2027-01-15' }, team: [{ auditorId: 'AU-03', name: 'M. Lindqvist', role: 'Lead' }] });
  assert.ok(P.teamCheck(p3, TD.AUDITORS).some(i => i.code === 'competence-expired'));
  assert.ok(P.teamCheck(basePlan({ team: [] }), TD.AUDITORS).some(i => i.code === 'no-lead'));
  assert.strictEqual(P.approvePlan(p2, PACK, TD.AUDITORS, { name: 'Q', role: 'QM' }).ok, false);
});
test('planner: approval needs an accountable approver; plan is pinned to content hashes; demonstration content is marked', () => {
  const plan = basePlan();
  assert.strictEqual(P.approvePlan(plan, PACK, TD.AUDITORS, {}).ok, false);
  assert.ok(P.approvePlan(plan, PACK, TD.AUDITORS, { name: 'B. Approver', role: 'Quality manager', date: '2026-10-20' }).ok);
  assert.strictEqual(plan.status, 'Approved'); assert.strictEqual(plan.stamps.packHash, Data.MANIFEST.packHash); assert.strictEqual(plan.stamps.contentStatus, 'DEMONSTRATION-CONTENT');
  assert.match(P.exportPlanHtml(plan, PACK, TD.AUDITORS), /DEMONSTRATION CONTENT/);
  const csv = P.exportChecklistCsv(plan, PACK); assert.match(csv, /^"Citation"/); assert.ok(csv.split('\r\n').length > 20);
});
test('planner: a library update never alters an approved plan; it reports drift', () => {
  const plan = basePlan(); P.approvePlan(plan, PACK, TD.AUDITORS, { name: 'B', role: 'QM' });
  const before = JSON.stringify(plan);
  const upd = clone(PACK); upd.contentVersion = '0.3.1'; upd.obligations.find(o => o.obligationId === 'OB-8.5.2').auditQuestions[0] += ' (revised)';
  const d = P.planDrift(plan, RIL.buildManifest(upd)); assert.deepStrictEqual(d.changed, ['OB-8.5.2']); assert.strictEqual(d.drifted, true);
  assert.strictEqual(JSON.stringify(plan), before, 'plan untouched');
  assert.strictEqual(P.planDrift(plan, Data.MANIFEST).drifted, false);
});

/* ---------------- Audit program and coverage matrix ---------------- */
test('program: seven distinct coverage categories are computed from obligation identifiers', () => {
  const prg = TD.sampleProgram(PACK); const c = G.coverage(prg, PACK);
  assert.deepStrictEqual(c.counts, { total: 5, applicable: 4, justifiedNA: 1, assigned: 3, assessed: 2, notCovered: 1, reeval: 1 });
  assert.deepStrictEqual(c.notCovered, ['OB-7.2-c']);
  assert.ok(c.justified['OB-8.5.1.2'] && c.justified['OB-8.5.1.2'].basis === 'justified');
  assert.deepStrictEqual(c.reeval, ['OB-8.4.2-d']);
  assert.strictEqual(c.packComplete, false);
});
test('program: coverage is not inflated by question counts, parent headings or extra audits of the same obligation', () => {
  const prg = TD.sampleProgram(PACK); const before = G.coverage(prg, PACK).counts;
  G.addAudit(prg, { obligationIds: ['OB-7.1.5.2-a'] }); G.addAudit(prg, { obligationIds: ['7.2'] });
  const after = G.coverage(prg, PACK).counts; assert.deepStrictEqual(after, before);
});
test('program: justified non-applicability needs a real justification; scope exclusions carry the resolver reason', () => {
  const prg = TD.sampleProgram(PACK);
  assert.strictEqual(G.justifyNA(prg, 'OB-7.2-c', 'n/a', 'X', '2026-10-11').ok, false);
  assert.ok(G.justifyNA(prg, 'OB-7.2-c', 'Competence actions are not taken in this scope during the period; confirmed with HR.', 'QM', '2026-10-11').ok);
  assert.strictEqual(G.coverage(prg, PACK).counts.notCovered, 0);
  prg.org.activities = ['distribute'];
  const c = G.coverage(prg, PACK); assert.strictEqual(c.justified['OB-7.2-c'].basis, 'scope'); assert.match(c.justified['OB-7.2-c'].reason, /required activities/);
});
test('program: a library change flags assessed obligations for re-evaluation without altering results', () => {
  const prg = TD.sampleProgram(PACK); const saved = JSON.stringify(prg.audits);
  const upd = clone(PACK); upd.obligations.find(o => o.obligationId === 'OB-8.5.2').sampling.guidance += ' revised';
  const c = G.coverage(prg, upd); assert.ok(c.reeval.includes('OB-8.5.2')); assert.match(c.reevalWhy['OB-8.5.2'], /library content changed/);
  assert.strictEqual(JSON.stringify(prg.audits), saved);
});
test('program: unverified coverage policy never yields a scheme-compliance statement; incomplete pack caveat is shown', () => {
  const prg = TD.sampleProgram(PACK); const r = G.policyCheck(prg, PACK);
  assert.strictEqual(r.verified, false); assert.match(r.status, /UNVERIFIED-POLICY/); assert.match(r.note, /not a statement of scheme compliance/); assert.match(r.caveat, /not complete/);
});
test('program: overdue audits, repeat findings, risk schedule and effectiveness report', () => {
  const prg = TD.sampleProgram(PACK);
  assert.deepStrictEqual(G.overdue(prg, '2026-10-11').map(a => a.id), ['AUD-P02']);
  assert.deepStrictEqual(G.repeatFindings(prg), []);
  G.addAudit(prg, { id: 'AUD-P09', status: 'Completed', plannedDate: '2026-06-01', obligationIds: ['OB-8.4.2-d'], results: { 'OB-8.4.2-d': { outcome: 'nc', date: '2026-06-01' } } });
  assert.strictEqual(G.repeatFindings(prg)[0].obligationId, 'OB-8.4.2-d'); assert.ok(G.repeatFindings(prg)[0].sources.length >= 2);
  const rs = G.riskSchedule(prg, '2026-10-11'); assert.strictEqual(rs.find(r => r.processId === 'Purchasing & Receiving').intervalMonths, 6);
  const e = G.effectiveness(prg, PACK, '2026-10-11'); assert.ok(e.overdue === 1 && e.nonconformities >= 2 && e.coverageAssessedPct <= e.coveragePlannedPct);
});
test('program: revisions require a reason and are retained', () => {
  const prg = TD.sampleProgram(PACK); assert.strictEqual(G.revise(prg, 'add audit', '', 'x', '2026-10-11').ok, false);
  assert.ok(G.revise(prg, 'Added AUD-P03 for competence', 'Coverage gap found', 'QM', '2026-10-11').ok); assert.strictEqual(prg.version, 2); assert.strictEqual(prg.revisions.length, 1);
});

/* ---------------- SCAR builder ---------------- */
function goodScar() {
  const s = SC.importScar(TD.SAMPLE_SCAR_SOURCE);
  s.evidence = [{ id: 'E1', ref: 'CAL-TW-0417 register', description: 'TW-0417 due 2026-08-31', date: '2026-10-07' }, { id: 'E2', ref: 'WO-88213 op 40 tool log', description: 'Used 2026-09-17', date: '2026-10-07' }, { id: 'E3', ref: 'Usage search Sept', description: 'TW-0417 used on 3 September work orders', date: '2026-10-08' }, { id: 'E4', ref: 'Quarantine record', description: 'Lots held 2026-10-08', date: '2026-10-08' }];
  s.criteria = s.criteria.filter(c => c.source !== 'customer-assertion');
  s.allegationAssessment = { verdict: 'partially-valid', basis: 'Use outside interval confirmed for lot 0431; the claim that all lots are affected is not supported by the usage search.', evidenceRefs: ['E1', 'E2', 'E3'], addresses: ['AL-1', 'AL-2', 'AL-3'] };
  s.containment = [{ id: 'C1', action: 'Quarantine and re-verify torque on lots produced with TW-0417 since 2026-08-31', owner: 'Quality manager', status: 'completed', completedOn: '2026-10-08', evidenceRef: 'E4', addresses: ['AL-1', 'AL-2'] }];
  s.correction = [{ id: 'R1', action: 'Recalibrate TW-0417 and review as-found results', owner: 'Calibration coordinator', due: '2026-10-20', status: 'planned', addresses: ['AL-1'] }];
  s.rootCause = { method: '5-Why with fault-tree check', analyses: [{ type: 'occurrence', cause: 'Reminder queue backlog meant the due date alert did not generate', whys: ['why 1', 'why 2'], evidenceRefs: ['E1'], status: 'verified', addresses: ['AL-1'] }, { type: 'escape', cause: 'No usage-time check of calibration status at the point of use', whys: ['why'], evidenceRefs: [], status: 'hypothesis', addresses: ['AL-1'] }], notApplicable: [{ type: 'systemic', reason: 'Systemic review not complete; to be determined after the reminder system analysis' }] };
  s.correctiveActions = [{ id: 'A1', causeRef: 'occurrence', action: 'Add independent overdue report to the weekly quality review', owner: 'Quality manager', due: '2026-11-15', status: 'planned' }, { id: 'A2', causeRef: 'escape', action: 'Block tool issue from the cage when calibration is past due', owner: 'Production manager', due: '2026-11-30', status: 'planned' }];
  s.effectiveness = { criteria: [{ id: 'EF1', metric: 'Overdue equipment in use found by weekly review', threshold: 'zero for 90 consecutive days', method: 'Weekly report review and usage-log sample', verifyOn: '2027-03-01', owner: 'Quality manager' }], results: [] };
  return s;
}
test('SCAR: import separates customer assertions from stated requirements and never invents analysis', () => {
  const s = SC.importScar(TD.SAMPLE_SCAR_SOURCE);
  assert.strictEqual(s.criteria.filter(c => c.source === 'customer-assertion').length, 2); assert.ok(s.criteria.some(c => c.source === 'contract') && s.criteria.some(c => c.source === 'standard'));
  assert.deepStrictEqual([s.containment, s.correction, s.correctiveActions, s.evidence].map(x => x.length), [0, 0, 0, 0]);
  const r = SC.reviewScar(s); assert.strictEqual(r.ready, false); assert.ok(r.blockers.some(b => /customer assertion/.test(b)));
});
test('SCAR: a complete, honest response is ready, and states only evidenced work as done', () => {
  const s = goodScar(); const r = SC.reviewScar(s); assert.deepStrictEqual(r.blockers, []); assert.ok(r.ready);
  const html = SC.responseDocument(s); assert.match(html, /probable cause, not yet verified/); assert.match(html, /<b>Planned<\/b>/); assert.match(html, /Completed on 2026-10-08 \(evidence E4\)/); assert.match(html, /not yet verified<\/b>/);
  assert.match(SC.render8D(s).map(x => x.join(' ')).join('\n'), /D8 Closure Not claimed/);
});
test('SCAR: invented completion, unverified causes, unlinked actions, vague effectiveness and unaddressed allegation items are blocked', () => {
  let s = goodScar(); s.containment[0].evidenceRef = null; assert.ok(SC.reviewScar(s).blockers.some(b => /completed without a completion date and evidence/.test(b)));
  s = goodScar(); s.rootCause.analyses[1].status = 'verified'; assert.ok(SC.reviewScar(s).blockers.some(b => /marked verified without valid evidence/.test(b)));
  s = goodScar(); s.correctiveActions[0].causeRef = 'nonsense'; assert.ok(SC.reviewScar(s).blockers.some(b => /not linked to an analysed cause/.test(b)));
  s = goodScar(); s.effectiveness.criteria[0].threshold = ''; assert.ok(SC.reviewScar(s).blockers.some(b => /measurable metric, a threshold/.test(b)));
  s = goodScar(); s.effectiveness.results = [{ criteriaId: 'EF1', result: 'effective', date: '2027-03-01', evidenceRef: null }]; assert.ok(SC.reviewScar(s).blockers.some(b => /result is recorded without date and valid evidence/.test(b)));
  s = goodScar(); s.allegationAssessment.addresses = ['AL-1']; s.containment[0].addresses = ['AL-1']; assert.ok(SC.reviewScar(s).blockers.some(b => /Allegation item .* not addressed/.test(b)));
  s = goodScar(); s.rootCause.notApplicable = []; assert.ok(SC.reviewScar(s).blockers.some(b => /systemic cause is neither analysed nor justified/.test(b)));
  s = goodScar(); s.allegationAssessment.verdict = null; assert.ok(SC.reviewScar(s).blockers.some(b => /not been assessed/.test(b)));
  s = goodScar(); s.containment = []; assert.ok(SC.reviewScar(s).blockers.some(b => /No immediate containment/.test(b)));
});

/* ---------------- Competency assessment ---------------- */
test('competency: items are derived from library records, cover all nine capabilities, and are practice-only until expert-reviewed', () => {
  const set = CP.buildSet(PACK, 0); assert.strictEqual(set.items.length, 9);
  assert.deepStrictEqual(Array.from(new Set(set.items.map(i => i.dimension))).sort(), CP.DIMENSIONS.map(d => d[0]).sort());
  set.items.forEach(i => { assert.strictEqual(i.expertReview.status, 'PENDING'); if (!i.free) { assert.ok(i.options.length >= 3); i.correct.forEach(c => assert.ok(i.options.includes(c))); } });
  const allRight = {}; set.items.filter(i => !i.free).forEach(i => { allRight[i.id] = i.multi ? i.correct : i.correct[0]; });
  const r = CP.score(set, allRight, TD.ncrScenarioEval); assert.strictEqual(r.mode, 'PRACTICE-ONLY'); assert.match(r.statement, /not a determination of auditor competence/);
});
test('competency: deterministic, and the citation item contains the exact reference plus parent, sibling and invented distractors', () => {
  assert.deepStrictEqual(CP.buildSet(PACK, 0), CP.buildSet(clone(PACK), 0));
  const it = CP.buildSet(PACK, 0).items.find(i => i.dimension === 'citation');
  assert.ok(it.options.includes('7.1.5.2(a)') && it.options.includes('7.1.5.2') && it.options.includes('7.1.5.2(b)') && it.options.includes('7.1.5.2(g)'));
  assert.strictEqual(RIL.validateCitation(PACK, '7.1.5.2(g)').ok, false); assert.strictEqual(RIL.validateCitation(PACK, '7.1.5.2').ok, false);
  assert.deepStrictEqual(it.correct, ['7.1.5.2(a)']);
});
test('competency: insufficient-vs-NC item is answered by the product’s own evidence logic (one interview statement ⇒ insufficient evidence)', () => {
  const it = CP.buildSet(PACK, 0).items.find(i => i.dimension === 'sufficiency'); assert.match(it.correct[0], /Insufficient evidence/);
});
test('competency: wrong answers score low; the free-text NCR is scored by the real issuance gates', () => {
  const set = CP.buildSet(PACK, 0); const wrong = {}; set.items.filter(i => !i.free).forEach(i => { wrong[i.id] = i.multi ? [i.options.find(o => !i.correct.includes(o))] : i.options.find(o => !i.correct.includes(o)); });
  assert.ok(CP.score(set, wrong, TD.ncrScenarioEval).pct < 20);
  const ncrId = set.items.find(i => i.free).id;
  const poor = CP.score(set, Object.assign({}, wrong, { [ncrId]: { citation: '7.1.5.2', shouldBe: 'Calibrate things.', asFound: 'Tool was bad.', statement: 'Not good.' } }), TD.ncrScenarioEval).detail.find(d => d.id === ncrId);
  assert.ok(poor.points < 0.5 && /Gates not met/.test(poor.note));
  const good = CP.score(set, { [ncrId]: { citation: '7.1.5.2(a)', shouldBe: 'Measuring equipment used to verify product conformity is calibrated or verified at specified intervals, or before use, against measurement standards traceable to international or national standards.', asFound: 'On 2026-09-17 torque wrench TW-0417 was used on WO-88213 operation 40 (EV-WO-88213-OP40), 17 days after its calibration due date of 2026-08-31 (EV-CAL-TW-0417); no extension existed (EV-DEV-LOG).', statement: 'The requirement is calibration within the interval before use; TW-0417 was used outside its interval, so the requirement was not met for that operation.' } }, TD.ncrScenarioEval).detail.find(d => d.id === ncrId);
  assert.strictEqual(good.points, 1);
});

/* ---------------- NCR across schemes; imported results; preset library ---------------- */
test('NCR builder: classification must belong to the selected scheme; not aerospace-specific', () => {
  const S = TD.importedAudit(); const ncr = S.audit.ncrs[0]; assert.strictEqual(ncr.status, 'In auditor review');
  ncr.schemeClasses = ['Critical', 'Major', 'Minor']; ncr.class = 'Major'; assert.ok(S.gates(ncr).find(g => g.n === 9).ok);
  ncr.schemeClasses = ['Nonconformity', 'Observation']; assert.strictEqual(S.gates(ncr).find(g => g.n === 9).ok, false); ncr.class = 'Nonconformity'; assert.ok(S.gates(ncr).find(g => g.n === 9).ok);
  assert.strictEqual(TD.NCR_SCHEMES.length, 3);
});
test('imported audit results feed the NCR builder through the same gates (reuse of the verified NCR architecture)', () => {
  const S = TD.importedAudit(); const ncr = S.audit.ncrs[0];
  assert.ok(S.approveNCR(ncr).ok); assert.strictEqual(S.audit.evidence['EV-WO-88213-OP40'].type, 'record');
});
test('preset library: ten intended packs listed, none releasable, only the AS9100 demonstration has any content; method references are not packs', () => {
  assert.strictEqual(TD.PRESET_LIBRARY.length, 10); TD.PRESET_LIBRARY.forEach(s => { assert.strictEqual(s.releaseStatus, 'NOT-RELEASABLE'); assert.strictEqual(s.licenceStatus, 'Not cleared'); });
  assert.strictEqual(TD.PRESET_LIBRARY.filter(s => /Demonstration/.test(s.contentStatus)).length, 1);
  assert.ok(TD.METHOD_REFERENCES.every(m => !TD.PRESET_LIBRARY.some(s => s.id === m.id.replace(/\W/g, ''))));
});
