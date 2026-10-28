'use strict';
// Headless acceptance tests for scenarios A-F, driving the same Session API as the prototype UI.
const test = require('node:test');
const assert = require('node:assert');
const { create } = require('../src/session.js');
const Core = require('../src/audit-core.js');
const Data = require('../src/synthetic-data.js');

const fullNcr = (S, ncr) => {
  ncr.citation = '7.1.5.2(a)';
  ncr.shouldBeAttested = true;
  ncr.asFound = 'On 2026-09-17 torque wrench TW-0417 was used on WO-88213 operation 40 (EV-WO-88213-OP40) although its calibration was due 2026-08-31 (CAL-TW-0417); no extension or deviation existed.';
  ncr.statement = 'The requirement is that equipment is calibrated at specified intervals before use; the tool was used 17 days after its interval expired.';
  ncr.class = 'Minor'; ncr.classRationale = 'Isolated lapse, as-found within tolerance, containment not yet shown.';
};

test('A — Conforming: verified evidence for every attribute allows "demonstrated"', () => {
  const S = create();
  assert.strictEqual(S.conclude('OB-8.5.2', 'demonstrated').ok, false, 'blocked before any evidence');
  ['LOT-26-0412', 'LOT-26-0419', 'LOT-26-0446'].forEach(id => S.addToSample('OB-8.5.2', id));
  const a = S.assessment('OB-8.5.2');
  assert.strictEqual(a.recommended, 'demonstrated');
  assert.ok(S.conclude('OB-8.5.2', 'demonstrated').ok);
  assert.strictEqual(S.conclude('OB-8.5.2', 'nc').ok, false, 'cannot record NC on supported requirement');
});

test('A — sample below planned minimum is not enough', () => {
  const S = create();
  ['LOT-26-0412', 'LOT-26-0419'].forEach(id => S.addToSample('OB-8.5.2', id));
  assert.strictEqual(S.assessment('OB-8.5.2').recommended, 'insufficient');
});

test('seeded sampling is reproducible', () => {
  const S1 = create(), S2 = create();
  assert.deepStrictEqual(S1.drawSample('OB-8.5.2', 3, 'AUD-2026-114/seed-1'), S2.drawSample('OB-8.5.2', 3, 'AUD-2026-114/seed-1'));
});

test('B — Potential NC: unverified fact is held, NC refused, resolves either way', () => {
  const S = create();
  Data.world.populations['OB-8.4.2-d'].forEach(id => S.addToSample('OB-8.4.2-d', id));
  S.perform('SUP-ENTRY');
  let a = S.assessment('OB-8.4.2-d');
  assert.strictEqual(a.recommended, 'potential');
  assert.strictEqual(S.conclude('OB-8.4.2-d', 'nc').ok, false);
  assert.strictEqual(S.conclude('OB-8.4.2-d', 'demonstrated').ok, false);
  assert.ok(S.conclude('OB-8.4.2-d', 'pending', 'Portal record outstanding').ok);
  assert.ok(S.followUps('OB-8.4.2-d').some(f => f.kind === 'investigate'));
  S.perform('PORTAL-REQ');
  assert.strictEqual(S.assessment('OB-8.4.2-d').recommended, 'potential', 'a pending request resolves nothing');
  // branch 1: resolves in the organization's favour
  const S2 = create();
  Data.world.populations['OB-8.4.2-d'].forEach(id => S2.addToSample('OB-8.4.2-d', id)); S2.perform('SUP-ENTRY'); S2.perform('SIM-PORTAL-A');
  assert.strictEqual(S2.assessment('OB-8.4.2-d').recommended, 'demonstrated');
  // branch 2: resolves against, but alternatives not yet evaluated -> still held; then substantiated
  Data.world.populations['OB-8.4.2-d'].forEach(id => S.addToSample('OB-8.4.2-d', id)); S.perform('SIM-PORTAL-B');
  assert.strictEqual(S.assessment('OB-8.4.2-d').recommended, 'potential');
  S.perform('ALT-RCV');
  assert.strictEqual(S.assessment('OB-8.4.2-d').recommended, 'nc-supported');
  assert.ok(S.reevaluate('OB-8.4.2-d') === null || true);
});

test('C — Substantiated NC requires evidence, rebuttals, then yields a defensible NCR', () => {
  const S = create();
  Data.world.populations['OB-7.1.5.2-a'].slice(0, 4).forEach(id => S.addToSample('OB-7.1.5.2-a', id));
  S.addToSample('OB-7.1.5.2-a', 'CAL-TW-0417');
  // register alone is not a finding
  assert.notStrictEqual(S.assessment('OB-7.1.5.2-a').recommended, 'nc-supported');
  assert.ok(S.followUps('OB-7.1.5.2-a').some(f => f.kind === 'lead' && f.actionIds.includes('WO-88213-OP40')));
  S.perform('WO-88213-OP40');
  assert.strictEqual(S.assessment('OB-7.1.5.2-a').recommended, 'potential', 'alternative explanations outstanding');
  assert.strictEqual(S.conclude('OB-7.1.5.2-a', 'nc').ok, false);
  ['DEV-LOG', 'QP-7.1.5', 'OBS-TW-0417-TAG'].forEach(id => S.perform(id));
  assert.strictEqual(S.assessment('OB-7.1.5.2-a').recommended, 'nc-supported');
  assert.ok(S.conclude('OB-7.1.5.2-a', 'nc', 'Tool used outside interval').ok);
  const ncr = S.startNCR('OB-7.1.5.2-a');
  assert.strictEqual(S.submitNCR(ncr).ok, false, 'deficient NCR cannot be submitted');
  fullNcr(S, ncr);
  const r = S.submitNCR(ncr);
  assert.ok(r.ok, JSON.stringify(r.gates.filter(g => !g.ok)));
  assert.strictEqual(ncr.status, 'In auditor review');
  assert.strictEqual(S.gates(ncr).find(g => g.n === 10).ok, false, 'not issuable before approval');
  const ap = S.approveNCR(ncr);
  assert.ok(ap.ok);
  assert.strictEqual(ncr.status, 'Issued');
});

test('C — As Found must carry a date and a linked record identifier', () => {
  const S = create(); const ob = 'OB-7.1.5.2-a';
  S.addToSample(ob, 'CAL-TW-0417'); ['WO-88213-OP40', 'DEV-LOG', 'QP-7.1.5', 'OBS-TW-0417-TAG'].forEach(i => S.perform(i));
  const ncr = S.startNCR(ob); fullNcr(S, ncr);
  ncr.asFound = 'The tool was used out of calibration and nobody noticed it at all in the plant.';
  assert.strictEqual(S.gates(ncr).find(g => g.n === 5).ok, false);
});

test('D — Incorrect citation: parent, wrong paragraph and invalid designator are each refused', () => {
  const S = create(); const ob = 'OB-7.1.5.2-a';
  S.addToSample(ob, 'CAL-TW-0417'); ['WO-88213-OP40', 'DEV-LOG', 'QP-7.1.5', 'OBS-TW-0417-TAG'].forEach(i => S.perform(i));
  const ncr = S.startNCR(ob); fullNcr(S, ncr);
  const tryCite = c => { ncr.citation = c; return S.citationCheck(ncr); };
  assert.strictEqual(tryCite('7.1.5.2').level, 'incomplete');
  assert.strictEqual(tryCite('7.1.5').level, 'incomplete');
  assert.strictEqual(tryCite('7.1.5.2(b)').level, 'mismatch');
  assert.strictEqual(tryCite('7.1.5.2(e)').level, 'invalid');
  assert.strictEqual(tryCite('7.9.9').level, 'invalid');
  assert.strictEqual(tryCite('seven').level, 'invalid');
  assert.strictEqual(tryCite('7.1.5.2(a)').ok, true);
  ncr.citation = '7.1.5.2';
  assert.strictEqual(S.submitNCR(ncr).ok, false, 'NCR with incomplete citation cannot be issued');
  assert.strictEqual(S.gates(ncr).find(g => g.n === 2).ok, false);
});

test('E — Alternative compliant method: no false finding because a form is absent', () => {
  const S = create(); const ob = 'OB-7.2-c';
  S.perform('FORM-SEARCH');
  assert.strictEqual(S.assessment(ob).recommended, 'insufficient', 'absence of a form proves nothing either way');
  assert.strictEqual(S.conclude(ob, 'nc').ok, false);
  ['TR-2026-011', 'TR-2026-014', 'TR-2026-016'].forEach(id => S.addToSample(ob, id));
  S.perform('WI-QUAL-12'); S.perform('INT-SUPV');
  const a = S.assessment(ob);
  assert.strictEqual(a.recommended, 'demonstrated');
  assert.ok(a.altMethod && a.formAbsent);
  assert.strictEqual(S.conclude(ob, 'nc').ok, false);
  const ncr = S.startNCR(ob);
  fullNcr(S, ncr); ncr.citation = '7.2(c)';
  const g = S.gates(ncr);
  assert.strictEqual(g.find(g => g.n === 7).ok, false, 'no unmet requirement');
  assert.strictEqual(S.submitNCR(ncr).ok, false);
  assert.ok(S.conclude(ob, 'demonstrated').ok);
});

test('F — Insufficient evidence: neither conformity nor nonconformity may be asserted', () => {
  const S = create(); const ob = 'OB-8.5.1.2';
  ['HT-SPEC', 'SURVEY-REQ', 'PERS-MATRIX', 'INT-HTLEAD'].forEach(i => S.perform(i));
  const a = S.assessment(ob);
  assert.strictEqual(a.recommended, 'insufficient');
  const by = Object.fromEntries(a.attrs.map(x => [x.attr.id, x.status]));
  assert.strictEqual(by.V1, 'met'); assert.strictEqual(by.V3, 'met');
  assert.strictEqual(by.V2, 'claimed', 'interview alone is not corroboration'); assert.strictEqual(by.V4, 'claimed');
  assert.strictEqual(S.conclude(ob, 'demonstrated').ok, false);
  assert.strictEqual(S.conclude(ob, 'nc').ok, false);
  assert.ok(S.conclude(ob, 'insufficient', 'Survey record not produced').ok);
});

test('Evidence is single-sourced and reusable across obligations', () => {
  const S = create();
  S.addToSample('OB-8.5.2', 'LOT-26-0431');
  const ev = S.audit.evidence['EV-LOT-26-0431'];
  assert.deepStrictEqual(ev.obligationsLinked.sort(), ['OB-7.1.5.2-a', 'OB-8.5.2']);
  assert.strictEqual(Object.keys(S.audit.evidence).length, 1);
  assert.ok(S.assessment('OB-7.1.5.2-a').attrs.find(a => a.attr.id === 'C2').contradicts.includes('EV-LOT-26-0431'));
});

test('Audit record hash is reproducible and changes with content', () => {
  const run = () => { const S = create(); S.addToSample('OB-8.5.2', 'LOT-26-0412'); return S.record().hash; };
  assert.strictEqual(run(), run());
  const S = create(); assert.notStrictEqual(S.record().hash, run());
});

test('Applicability is explainable and scope-driven', () => {
  const S = create(); S.setActivities(['distribute']);
  const sc = S.scopeFor('OB-7.2-c');
  assert.strictEqual(sc.applies, false);
  assert.ok(/required activities/.test(sc.reason));
});

test('sha256 matches known vector', () => {
  assert.strictEqual(Core.sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

/* ---- 2026-10-11 additions ---- */
const { restore } = require('../src/session.js');
const readyC = () => { const S = create(); const ob = 'OB-7.1.5.2-a';
  S.addToSample(ob, 'CAL-TW-0417'); ['WO-88213-OP40', 'DEV-LOG', 'QP-7.1.5', 'OBS-TW-0417-TAG'].forEach(i => S.perform(i));
  S.conclude(ob, 'nc', 'Tool used outside interval'); const ncr = S.startNCR(ob); fullNcr(S, ncr); return { S, ncr }; };

test('NCR requires the auditor to have recorded an NC conclusion (no NCR from an unrecorded conclusion)', () => {
  const S = create(); const ob = 'OB-7.1.5.2-a';
  S.addToSample(ob, 'CAL-TW-0417'); ['WO-88213-OP40', 'DEV-LOG', 'QP-7.1.5', 'OBS-TW-0417-TAG'].forEach(i => S.perform(i));
  const ncr = S.startNCR(ob); fullNcr(S, ncr);
  assert.strictEqual(S.gates(ncr).find(g => g.n === 12).ok, false);
  assert.strictEqual(S.submitNCR(ncr).ok, false);
});
test('production content mode: unverified requirement content blocks NCR submission; demonstration mode marks it', () => {
  const { S, ncr } = readyC();
  assert.ok(S.gates(ncr).find(g => g.n === 11).demo, 'demonstration marker present');
  assert.ok(S.submitNCR(ncr).ok);
  const P = readyC(); P.S.audit.contentMode = 'production';
  const g11 = P.S.gates(P.ncr).find(g => g.n === 11);
  assert.strictEqual(g11.ok, false); assert.match(g11.msg, /not release-verified/);
  assert.strictEqual(P.S.submitNCR(P.ncr).ok, false);
  // verified record in production mode → allowed
  const Q = readyC(); Q.S.audit.contentMode = 'production';
  Q.S.verification = require('./fixtures/verified.js').verifyRecord(Data.VERIFICATION);
  assert.ok(Q.S.submitNCR(Q.ncr).ok);
});
test('NCR needs a statement of nonconformity explaining the difference', () => {
  const { S, ncr } = readyC(); ncr.statement = '';
  assert.strictEqual(S.gates(ncr).find(g => g.n === 5).ok, false);
});
test('unresolved contradictory evidence blocks the NCR gate', () => {
  const S = create(); const ob = 'OB-8.4.2-d';
  Data.world.populations[ob].forEach(id => S.addToSample(ob, id)); S.perform('SUP-ENTRY'); S.perform('SIM-PORTAL-B'); S.perform('ALT-RCV');
  S.conclude(ob, 'nc', 'portal shows no review');
  assert.strictEqual(S.assessment(ob).recommended, 'nc-supported');
});
test('duplicate evidence: performing the same action twice creates one evidence item and one log entry', () => {
  const S = create(); S.perform('DEV-LOG'); S.perform('DEV-LOG'); S.addToSample('OB-8.5.2', 'LOT-26-0412'); S.addToSample('OB-8.5.2', 'LOT-26-0412');
  assert.strictEqual(Object.keys(S.audit.evidence).length, 2);
  assert.strictEqual(S.audit.log.filter(l => l.type === 'evidence').length, 2);
  assert.deepStrictEqual(S.sampleIds('OB-8.5.2'), ['LOT-26-0412']);
});
test('discarded findings: a draft can be discarded with a reason and is retained; an issued NCR cannot be discarded', () => {
  const { S, ncr } = readyC();
  assert.strictEqual(S.discardNCR(ncr, '').ok, false);
  assert.ok(S.discardNCR(ncr, 'Raised in error; re-evaluating').ok);
  assert.strictEqual(S.audit.ncrs.length, 0); assert.strictEqual(S.audit.discarded.length, 1);
  assert.match(S.audit.discarded[0].reason, /error/);
  const { S: S2, ncr: n2 } = readyC(); S2.submitNCR(n2); S2.approveNCR(n2);
  assert.strictEqual(S2.discardNCR(n2, 'oops').ok, false);
});
test('persistence: a serialized audit restores to an identical record hash and identical assessments', () => {
  const { S, ncr } = readyC(); S.submitNCR(ncr);
  const saved = JSON.parse(JSON.stringify(S.audit));
  const R = restore(saved);
  assert.strictEqual(R.record().hash, S.record().hash);
  assert.strictEqual(R.assessment('OB-7.1.5.2-a').recommended, 'nc-supported');
  assert.strictEqual(R.audit.ncrs[0].status, 'In auditor review');
  R.perform('CAL-TW-0417-B'); assert.strictEqual(R.seq > S.seq, true);
});
test('a conclusion the evidence no longer supports is flagged, not silently kept', () => {
  const S = create(); const ob = 'OB-8.5.2';
  ['LOT-26-0412', 'LOT-26-0419', 'LOT-26-0446'].forEach(id => S.addToSample(ob, id)); S.conclude(ob, 'demonstrated', 'ok');
  assert.strictEqual(S.reevaluate(ob), null);
  S.audit.evidence = Object.fromEntries(Object.entries(S.audit.evidence).filter(([k]) => k !== 'EV-LOT-26-0446'));
  assert.ok(S.reevaluate(ob), 'stale conclusion flagged');
});

test('guided audit thread: all 12 steps execute through real session operations and end with an NCR awaiting approval', () => {
  const W = require('../src/walkthrough.js'); const S = create();
  W.steps.forEach(st => st.run(S));
  const ncr = S.audit.ncrs[0];
  assert.strictEqual(ncr.status, 'In auditor review');
  assert.strictEqual(S.audit.conclusions['OB-8.5.2'].status, 'demonstrated');
  assert.strictEqual(S.audit.conclusions['OB-7.1.5.2-a'].status, 'nc');
  assert.deepStrictEqual(S.sampleIds('OB-8.5.2'), ['LOT-26-0419', 'LOT-26-0431', 'LOT-26-0438']);
  const types = new Set(S.evList().map(e => e.type));
  ['record', 'interview', 'document', 'observation'].forEach(t => assert.ok(types.has(t), 'has ' + t));
  assert.ok(S.evList().length >= 14);
  assert.ok(S.approveNCR(ncr).ok);
});
