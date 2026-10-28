'use strict';
/**
 * Gate tests: validate-content (mandatory entry point), release-mode requirements, exit codes,
 * evidence records, and packaging that cannot bypass validation.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawnSync } = require('child_process');
const { verifyRecord } = require('../fixtures/verified.js');

const ROOT = path.join(__dirname, '..', '..');
const GATE = path.join(ROOT, 'tools', 'validate-content.js');
const PACKAGER = path.join(ROOT, 'tools', 'package-content.js');
const FW = path.join(ROOT, '..', '2026-10-10-clause-map-framework', 'tools', 'validate-pack.js');
const DEMO = JSON.parse(fs.readFileSync(path.join(ROOT, 'packs', 'as9100d-demo.pack.json'), 'utf8'));
const INDEX = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'as9100d-clause-index.sample.json'), 'utf8'));
const RECORD = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'source-verification-record.json'), 'utf8'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ce-gate-'));
let n = 0;
const clone = o => JSON.parse(JSON.stringify(o));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const w = (o, name) => { const p = path.join(TMP, (name || 'f') + (++n) + '.json'); fs.writeFileSync(p, JSON.stringify(o, null, 2)); return p; };
const run = (script, args) => spawnSync(process.execPath, [script].concat(args), { encoding: 'utf8' });

/** A fully verified fixture: every approval present. Test-only; no real review is implied. */
function verifiedSet() {
  const pack = clone(DEMO); pack.source.verification = { status: 'VERIFIED', verifiedBy: 'Test reviewer (synthetic fixture)', verifiedOn: '2026-10-11' };
  const idx = clone(INDEX); idx.verification = { status: 'VERIFIED' };
  const rec = verifyRecord(RECORD);
  return { pack, idx, rec };
}
const gate = (pack, idx, mode, rec, ev) => run(GATE, [w(pack, 'p'), '--index', w(idx, 'i'), '--mode', mode, '--evidence-dir', ev || path.join(TMP, 'ev' + (++n))].concat(rec ? ['--verification-record', w(rec, 'r')] : []));
const readEvidence = dir => JSON.parse(fs.readFileSync(path.join(dir, fs.readdirSync(dir)[0]), 'utf8'));

test('dev mode: demo pack passes, exit 0, evidence record complete and hashes are real', () => {
  const dir = path.join(TMP, 'evdev'); const pp = w(DEMO, 'demo'), ip = w(INDEX, 'idx');
  const r = run(GATE, [pp, '--index', ip, '--mode', 'dev', '--evidence-dir', dir]);
  assert.strictEqual(r.status, 0, r.stderr);
  const ev = readEvidence(dir);
  assert.strictEqual(ev.result, 'PASS'); assert.strictEqual(ev.mode, 'dev'); assert.strictEqual(ev.exitCode, 0);
  assert.ok(ev.validatorVersion); assert.strictEqual(ev.packSha256, sha(pp)); assert.strictEqual(ev.indexSha256, sha(ip));
  assert.strictEqual(ev.frameworkValidatorSha256, sha(FW), 'original framework validator is the one that ran');
  assert.ok(ev.warnings.some(x => /not verified/.test(x)));
});

test('release mode: shipped demo content is rejected with non-zero exit and recorded reasons', () => {
  const dir = path.join(TMP, 'evrel');
  const r = run(GATE, [w(DEMO, 'demo'), '--index', w(INDEX, 'idx'), '--mode', 'release', '--verification-record', w(RECORD, 'rec'), '--evidence-dir', dir]);
  assert.strictEqual(r.status, 1);
  const ev = readEvidence(dir);
  assert.strictEqual(ev.result, 'FAIL'); assert.strictEqual(ev.exitCode, 1);
  assert.ok(ev.failures.some(f => /source version is not verified/.test(f)));
  assert.ok(ev.failures.some(f => /clauseHierarchy is not VERIFIED/.test(f)));
  assert.ok(ev.failures.some(f => /interpretation is not VERIFIED/.test(f)));
});

test('release mode: no verification record at all is rejected', () => {
  const { pack, idx } = verifiedSet();
  const r = gate(pack, idx, 'release', null);
  assert.strictEqual(r.status, 1); assert.match(r.stderr, /requires a source-verification record/);
});

test('release mode: fully verified fixture passes', () => {
  const { pack, idx, rec } = verifiedSet();
  const r = gate(pack, idx, 'release', rec);
  assert.strictEqual(r.status, 0, r.stderr);
});

test('release mode: clause identifier verified but interpretation not → rejected (both reviewed separately)', () => {
  const { pack, idx, rec } = verifiedSet(); rec[0].interpretation = { result: 'PENDING', reviewer: null, reviewDate: null, evidenceRef: null };
  const r = gate(pack, idx, 'release', rec);
  assert.strictEqual(r.status, 1); assert.match(r.stderr, /interpretation is not VERIFIED/);
});
test('release mode: VERIFIED without reviewer/date/source is rejected', () => {
  const { pack, idx, rec } = verifiedSet(); rec[1].clauseHierarchy.reviewer = null;
  const r = gate(pack, idx, 'release', rec); assert.strictEqual(r.status, 1); assert.match(r.stderr, /requires reviewer, reviewDate and evidenceRef/);
  const s = verifiedSet(); s.rec[1].clauseHierarchy.evidenceRef = '';
  assert.strictEqual(gate(s.pack, s.idx, 'release', s.rec).status, 1);
});
test('release mode: record for a different pack version is rejected', () => {
  const { pack, idx, rec } = verifiedSet(); rec[0].packVersion = '9.9.9';
  const r = gate(pack, idx, 'release', rec); assert.strictEqual(r.status, 1); assert.match(r.stderr, /pack version/);
});
test('release mode: obligation missing from the record is rejected', () => {
  const { pack, idx, rec } = verifiedSet(); rec.pop();
  const r = gate(pack, idx, 'release', rec); assert.strictEqual(r.status, 1); assert.match(r.stderr, /no entry for obligation/);
});
test('release mode: record clauseRef that disagrees with the obligation is rejected', () => {
  const { pack, idx, rec } = verifiedSet(); rec[0].clauseRef = '7.2(a)';
  const r = gate(pack, idx, 'release', rec); assert.strictEqual(r.status, 1); assert.match(r.stderr, /does not match obligation paragraph/);
});
test('release mode: unverified clause index alone is rejected', () => {
  const { pack, idx, rec } = verifiedSet(); idx.verification = { status: 'UNVERIFIED-SAMPLE' };
  assert.strictEqual(gate(pack, idx, 'release', rec).status, 1);
});
test('release mode: designator error is still caught even if everything else is approved', () => {
  const { pack, idx, rec } = verifiedSet(); pack.items[0].obligations[0].paragraph = pack.items[0].clauseRef + '(z)';
  assert.strictEqual(gate(pack, idx, 'release', rec).status, 1);
});

test('framework rules cannot be bypassed through the gate (both modes)', () => {
  for (const mode of ['dev', 'release']) {
    const { pack, idx, rec } = verifiedSet(); pack.items[0].requirementText = 'Verbatim text.';
    const r = gate(pack, idx, mode, mode === 'release' ? rec : null);
    assert.strictEqual(r.status, 1, mode); assert.match(r.stderr, /requirementText present/);
  }
});

test('usage and input errors exit non-zero (2); unparseable pack exits non-zero', () => {
  assert.strictEqual(run(GATE, []).status, 2);
  assert.strictEqual(run(GATE, ['nope.json', '--index', 'nope.json']).status, 2);
  assert.strictEqual(run(GATE, [w(DEMO), '--index', w(INDEX), '--mode', 'bogus']).status, 2);
  const bad = path.join(TMP, 'bad.json'); fs.writeFileSync(bad, '{ nope');
  assert.notStrictEqual(run(GATE, [bad, '--index', w(INDEX), '--evidence-dir', path.join(TMP, 'evbad')]).status, 0);
});

/* ---- packaging ---- */
test('production packaging of unverified content is refused: non-zero, nothing packaged', () => {
  const out = path.join(TMP, 'pk-refused');
  const r = run(PACKAGER, [w(DEMO), '--index', w(INDEX), '--verification-record', w(RECORD), '--out', out]);
  assert.notStrictEqual(r.status, 0); assert.match(r.stderr, /PACKAGING REFUSED/);
  assert.ok(!fs.existsSync(path.join(out, 'package-manifest.json')));
});
test('no flag skips validation in the packager', () => {
  const out = path.join(TMP, 'pk-skip');
  const r = run(PACKAGER, [w(DEMO), '--index', w(INDEX), '--verification-record', w(RECORD), '--out', out, '--skip-validation', '--force', '--no-verify']);
  assert.notStrictEqual(r.status, 0);
  assert.ok(!fs.existsSync(path.join(out, 'package-manifest.json')));
});
test('development packaging succeeds but is labelled NOT FOR RELEASE and carries validation evidence', () => {
  const out = path.join(TMP, 'pk-dev');
  const r = run(PACKAGER, [w(DEMO), '--index', w(INDEX), '--out', out, '--dev']);
  assert.strictEqual(r.status, 0, r.stderr);
  const m = JSON.parse(fs.readFileSync(path.join(out, 'package-manifest.json'), 'utf8'));
  assert.match(m.kind, /NOT FOR RELEASE/); assert.strictEqual(m.validationEvidenceSha256, sha(path.join(out, m.validationEvidence)));
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(out, m.validationEvidence), 'utf8')).mode, 'dev');
});
test('a development package cannot be produced from content that fails development validation', () => {
  const bad = clone(DEMO); bad.items[0].clauseRef = 'banana';
  const out = path.join(TMP, 'pk-devbad');
  assert.notStrictEqual(run(PACKAGER, [w(bad), '--index', w(INDEX), '--out', out, '--dev']).status, 0);
  assert.ok(!fs.existsSync(path.join(out, 'package-manifest.json')));
});
test('production packaging succeeds only for fully approved content (test fixture)', () => {
  const { pack, idx, rec } = verifiedSet(); const out = path.join(TMP, 'pk-rel');
  const r = run(PACKAGER, [w(pack), '--index', w(idx), '--verification-record', w(rec), '--out', out]);
  assert.strictEqual(r.status, 0, r.stderr);
  const m = JSON.parse(fs.readFileSync(path.join(out, 'package-manifest.json'), 'utf8'));
  assert.strictEqual(m.kind, 'RELEASE-PACKAGE');
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(out, m.validationEvidence), 'utf8')).mode, 'release');
});

test('the original framework validator is preserved: still runs standalone and passes its own fixture', () => {
  const FWPACK = path.join(ROOT, '..', '2026-10-10-clause-map-framework', 'packs', 'src', 'as9100d.pack.json');
  assert.strictEqual(run(FW, [FWPACK]).status, 0);
});

/* ---- 2026-10-11 technical-authority rules: separate states, human reviewers, no self-approval ---- */
test('release mode: intended outcome and applicability are verified separately from clause and interpretation', () => {
  for (const k of ['intendedOutcome', 'applicability']) {
    const { pack, idx, rec } = verifiedSet(); rec[2][k] = { result: 'PENDING', reviewer: null, reviewDate: null, evidenceRef: null };
    const r = gate(pack, idx, 'release', rec); assert.strictEqual(r.status, 1, k); assert.match(r.stderr, new RegExp(k + ' is not VERIFIED'));
  }
});
test('release mode: final technical approval must be recorded', () => {
  const { pack, idx, rec } = verifiedSet(); rec[0].finalApproval = { status: 'PENDING', approver: null, date: null };
  const r = gate(pack, idx, 'release', rec); assert.strictEqual(r.status, 1); assert.match(r.stderr, /final technical approval is not APPROVED/);
});
test('release mode: an AI reviewer or AI final approver is rejected', () => {
  const a = verifiedSet(); a.rec[0].interpretation.reviewer = 'Claude';
  let r = gate(a.pack, a.idx, 'release', a.rec); assert.strictEqual(r.status, 1); assert.match(r.stderr, /not an accountable human reviewer/);
  const b = verifiedSet(); b.rec[0].finalApproval.approver = 'AI assistant';
  r = gate(b.pack, b.idx, 'release', b.rec); assert.strictEqual(r.status, 1); assert.match(r.stderr, /final approver .* is not an accountable human/);
});
test('release mode: no self-approval (reviewer or approver equal to the author)', () => {
  const a = verifiedSet(); a.rec[0].authoredBy = 'R. Reviewer (test fixture)';
  let r = gate(a.pack, a.idx, 'release', a.rec); assert.strictEqual(r.status, 1); assert.match(r.stderr, /reviewer is the author/);
  const b = verifiedSet(); b.rec[0].authoredBy = 'F. Approver (test fixture)';
  r = gate(b.pack, b.idx, 'release', b.rec); assert.strictEqual(r.status, 1); assert.match(r.stderr, /final approver is the author/);
});
test('release mode: source identity, edition and controlled-copy identifier are required', () => {
  const { pack, idx, rec } = verifiedSet(); rec[0].source.controlledCopyId = null;
  const r = gate(pack, idx, 'release', rec); assert.strictEqual(r.status, 1); assert.match(r.stderr, /controlled-copy identifier/);
});
test('the shipped record is v2-shaped: every state PENDING, authored by AI-assisted draft, final approval PENDING', () => {
  RECORD.forEach(e => {
    ['clauseHierarchy', 'interpretation', 'intendedOutcome', 'applicability'].forEach(k => assert.strictEqual(e[k].result, 'PENDING', e.obligationId + ' ' + k));
    assert.strictEqual(e.finalApproval.status, 'PENDING'); assert.match(e.authoredBy, /AI-assisted/); assert.ok(e.applicability.conditions);
  });
});
