'use strict';
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const R = require('../src/library.js');
const C = require('../consumers/consumer-views.js');
const ROOT = path.join(__dirname, '..');
const PACK = JSON.parse(fs.readFileSync(path.join(ROOT, 'packs', 'as9100d-demo.library.json'), 'utf8'));
const clone = o => JSON.parse(JSON.stringify(o));
const errs = (mut) => { const p = clone(PACK); mut(p); return R.validatePack(p).errors; };

test('shipped pack validates with zero errors; is NOT complete and says why', () => {
  assert.deepStrictEqual(R.validatePack(PACK).errors, []);
  const c = R.completeness(PACK);
  assert.strictEqual(c.complete, false);
  assert.ok(c.reasons.some(r => /not yet classified/.test(r)) && c.reasons.some(r => /not source-verified/.test(r)) && c.reasons.some(r => /not technically approved/.test(r)));
  assert.strictEqual(c.stats.auditableWithObligation, 5);
});

test('canonical record: every required authored field is enforced', () => {
  ['interpretation', 'intent', 'expectedControl', 'shouldBe', 'contentVersion', 'title'].forEach(f => assert.ok(errs(p => { p.obligations[0][f] = ''; }).some(e => e.includes(f + ' is required')), f));
  Object.keys(R.MIN_COUNTS).forEach(f => assert.ok(errs(p => { p.obligations[0][f] = []; }).some(e => e.includes(f + ' needs at least')), f));
  assert.ok(errs(p => { delete p.obligations[0].applicability; }).some(e => /applicability\.conditions/.test(e)));
  assert.ok(errs(p => { delete p.obligations[0].sampling; }).some(e => /sampling/.test(e)));
  assert.ok(errs(p => { delete p.obligations[0].sourceVerification; }).some(e => /sourceVerification\.status/.test(e)));
  assert.ok(errs(p => { delete p.obligations[0].technicalApproval; }).some(e => /technicalApproval\.status/.test(e)));
});

test('exact citation rules: invented, parent, non-existent and mismatched designators are rejected', () => {
  const cite = r => R.validateCitation(PACK, r);
  assert.strictEqual(cite('7.2(c)').ok, true);
  assert.strictEqual(cite('7.2').level, 'incomplete');          // parent of lettered paragraphs
  assert.strictEqual(cite('7.1.5').level, 'incomplete');        // parent clause
  assert.strictEqual(cite('7.2(e)').level, 'invalid');          // invented designator
  assert.strictEqual(cite('99.1').level, 'invalid');
  assert.strictEqual(cite('banana').level, 'invalid');
  assert.strictEqual(cite('8.4.2(c)(1)').ok, true);             // numbered subdivision exists
  assert.strictEqual(cite('8.4.2(c)(3)').level, 'invalid');
  assert.ok(errs(p => { p.obligations[0].clauseRef = '7.2(e)'; }).some(e => /not catalogued|does not exist/.test(e)));
  assert.ok(errs(p => { p.obligations[0].clauseRef = '7.2'; }).some(e => /parent/.test(e)));
});

test('obligation must match pack standard and edition; ids unique; relationships and concepts resolve', () => {
  assert.ok(errs(p => { p.obligations[0].standard.id = 'ISO9001'; }).some(e => /does not match pack standard/.test(e)));
  assert.ok(errs(p => { p.obligations[0].edition.label = 'Rev X'; }).some(e => /does not match pack edition/.test(e)));
  assert.ok(errs(p => { p.obligations[1].obligationId = p.obligations[0].obligationId; }).some(e => /duplicate obligationId/.test(e)));
  assert.ok(errs(p => { p.obligations[0].relatedRequirements = ['OB-NOPE']; }).some(e => /unknown obligation/.test(e)));
  assert.ok(errs(p => { p.obligations[0].relatedRequirements = [p.obligations[0].obligationId]; }).some(e => /relates to itself/.test(e)));
  assert.ok(errs(p => { p.obligations[0].concepts = ['CONCEPT-NOPE']; }).some(e => /not defined in the pack/.test(e)));
  assert.ok(errs(p => { p.hierarchy.find(n => n.ref === '7.2(c)').obligationIds = []; }).some(e => /does not list this obligation/.test(e)));
});

test('separate states: APPROVED needs approver+date and cannot coexist with unverified source', () => {
  assert.ok(errs(p => { p.obligations[0].technicalApproval = { status: 'APPROVED' }; }).some(e => /requires approver and date/.test(e)));
  assert.ok(errs(p => { p.obligations[0].technicalApproval = { status: 'APPROVED', approver: 'X', date: '2026-10-11' }; }).some(e => /cannot be APPROVED while source verification/.test(e)));
});

test('IP rules: no verbatim requirement text for a non-public-domain source; copied NOTE/definition phrasing rejected; source text flag enforced', () => {
  assert.ok(errs(p => { p.obligations[0].requirementText = 'Verbatim.'; }).some(e => /requirementText is not permitted/.test(e)));
  assert.ok(errs(p => { p.obligations[0].auditQuestions[0] += ' NOTE 1: copied note'; }).some(e => /copied-standard pattern/.test(e)));
  assert.ok(errs(p => { p.licence.sourceTextIncluded = true; }).some(e => /sourceTextIncluded must be false/.test(e)));
});

test('completeness is computed from leaves and obligation ids, not headings or question counts', () => {
  const p = clone(PACK);
  p.obligations.forEach(o => { o.auditQuestions = o.auditQuestions.concat(['x1', 'x2', 'x3', 'x4', 'x5', 'x6']); });
  assert.strictEqual(R.completeness(p).stats.auditableWithObligation, 5);
  assert.strictEqual(R.completeness(p).complete, false, 'more questions do not complete a pack');
  // a fully classified, verified and approved fixture IS complete
  const f = clone(PACK);
  f.hierarchy.forEach(n => { if (!(n.children || []).length && n.auditable !== 'yes') { n.auditable = 'no'; n.nonAuditableJustification = 'fixture: heading-only'; } });
  f.edition.verification = { status: 'VERIFIED' }; f.hierarchyVerification = { status: 'VERIFIED' };
  f.obligations.forEach(o => { o.sourceVerification = { status: 'VERIFIED' }; o.technicalApproval = { status: 'APPROVED', approver: 'R. Approver', date: '2026-10-11' }; });
  assert.deepStrictEqual(R.completeness(f).reasons, []);
  assert.strictEqual(R.completeness(f).complete, true);
  // an auditable leaf with no obligation blocks completeness
  const g = clone(f); g.hierarchy.find(n => n.ref === '7.2(a)').auditable = 'yes';
  assert.ok(R.completeness(g).reasons.some(r => /auditable leaves have no obligation/.test(r)));
});

test('content hash covers authored content only: approval/status changes do not alter it; authored changes do', () => {
  const o = clone(PACK.obligations[0]); const h = R.contentHash(o);
  o.technicalApproval = { status: 'APPROVED', approver: 'A', date: '2026-10-11' }; o.sourceVerification = { status: 'VERIFIED' }; o.contentVersion = '9.9.9';
  assert.strictEqual(R.contentHash(o), h);
  o.auditQuestions[0] += ' (edited)'; assert.notStrictEqual(R.contentHash(o), h);
});

test('manifest: stable, verifiable, tamper-evident, diffable; unsigned in development', () => {
  const m1 = R.buildManifest(PACK), m2 = R.buildManifest(clone(PACK));
  assert.deepStrictEqual(m1, m2);
  assert.strictEqual(m1.release.status, 'NOT-RELEASABLE'); assert.strictEqual(m1.signature.state, 'UNSIGNED-DEVELOPMENT'); assert.strictEqual(m1.obligationCount, 5);
  assert.ok(R.verifyPack(PACK, m1).ok);
  const t = clone(PACK); t.obligations[2].sampling.guidance += ' tampered';
  const v = R.verifyPack(t, m1); assert.strictEqual(v.ok, false); assert.ok(v.reasons.some(r => /OB-8.4.2-d/.test(r)));
  const u = clone(PACK); u.contentVersion = '0.3.1'; u.obligations[2].sampling.guidance += ' revised';
  const d = R.diffManifests(m1, R.buildManifest(u)); assert.deepStrictEqual(d.changed, ['OB-8.4.2-d']); assert.deepStrictEqual(d.added, []); assert.strictEqual(d.to, '0.3.1');
});

test('one record, two consumers: both views carry the same identity and the same pin; neither is a separate copy', () => {
  const m = R.buildManifest(PACK); const rec = PACK.obligations[1];
  const a = C.toolkitPlanningView(rec, m), b = C.fieldExecutionView(rec, m);
  assert.strictEqual(a.obligationId, b.obligationId); assert.strictEqual(a.citation, b.citation); assert.deepStrictEqual(a.pin, b.pin);
  assert.deepStrictEqual(a.auditQuestions, b.prompts.ask); assert.deepStrictEqual(a.expectedEvidence, b.evidenceToCollect);
  assert.strictEqual(a.pin.obligationHash, R.contentHash(rec));
});

test('build tool: invalid pack and incomplete release both exit non-zero and write nothing; development build writes NOT-RELEASABLE', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ril-')); const out = path.join(tmp, 'o');
  const tool = path.join(ROOT, 'tools', 'build-contentpack.js'); const run = a => spawnSync(process.execPath, [tool].concat(a), { encoding: 'utf8' });
  const bad = clone(PACK); bad.obligations[0].clauseRef = '7.2(e)'; const bp = path.join(tmp, 'bad.json'); fs.writeFileSync(bp, JSON.stringify(bad));
  assert.strictEqual(run([bp, '--out', out]).status, 1); assert.ok(!fs.existsSync(out));
  const pp = path.join(ROOT, 'packs', 'as9100d-demo.library.json');
  const r = run([pp, '--release', '--out', out]); assert.strictEqual(r.status, 1); assert.match(r.stderr, /release refused/); assert.ok(!fs.existsSync(out));
  const d = run([pp, '--out', out]); assert.strictEqual(d.status, 0, d.stderr);
  const built = JSON.parse(fs.readFileSync(path.join(out, 'as9100d-demo@0.3.0.contentpack.json'), 'utf8'));
  assert.strictEqual(built.manifest.release.status, 'NOT-RELEASABLE'); assert.ok(R.verifyPack(built.pack, built.manifest).ok);
});
