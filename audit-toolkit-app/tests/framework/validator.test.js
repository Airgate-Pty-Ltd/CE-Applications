'use strict';
/**
 * Independent regression tests for the Clause Map pack validators.
 *
 * Part 1  BASELINE   — characterises the UNMODIFIED framework validator (what it really catches).
 * Part 2  KNOWN GAPS — pins what the framework validator does NOT catch. These assert today's behaviour
 *                      (PASS on a bad pack). If the framework is later hardened these tests will fail,
 *                      which is the signal to update this file and the gap register deliberately.
 * Part 3  EXTENDED   — the Audit Toolkit's extended validator catches each gap.
 *
 * Fixtures are mutated copies of the real framework fixture pack; the framework folder is never written.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const FW = path.join(ROOT, '..', '2026-10-10-clause-map-framework');
const FW_VALIDATOR = path.join(FW, 'tools', 'validate-pack.js');
const EXT_VALIDATOR = path.join(ROOT, 'tools', 'validate-pack-extended.js');
const INDEX = path.join(ROOT, 'data', 'as9100d-clause-index.sample.json');
const BASE = JSON.parse(fs.readFileSync(path.join(FW, 'packs', 'src', 'as9100d.pack.json'), 'utf8'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ce-pack-'));
let n = 0;

const clone = o => JSON.parse(JSON.stringify(o));
function write(pack) { const p = path.join(TMP, 'pack' + (++n) + '.json'); fs.writeFileSync(p, JSON.stringify(pack, null, 2)); return p; }
function runFw(pack) { const r = spawnSync(process.execPath, [FW_VALIDATOR, write(pack)], { encoding: 'utf8' }); return { code: r.status, out: r.stdout + r.stderr }; }
function runExt(pack, extra) { const r = spawnSync(process.execPath, [EXT_VALIDATOR, write(pack), '--index', INDEX].concat(extra || []), { encoding: 'utf8' }); return { code: r.status, out: r.stdout + r.stderr }; }
const mutate = fn => { const p = clone(BASE); fn(p); return p; };

/* a pack that is clean under BOTH validators, including release mode */
function cleanPack() {
  const p = clone(BASE);
  p.items = p.items.filter(i => ['AS9100D-8.1.3-01', 'AS9100D-8.4.1-01'].includes(i.itemId));
  p.items[0].relatedItems = ['AS9100D-8.4.1-01'];
  p.source.verification = { status: 'VERIFIED', verifiedBy: 'Technical reviewer (synthetic test)', verifiedOn: '2026-10-10' };
  p.items.forEach(i => delete i.quotedFragment);
  return p;
}
const verifiedIndex = () => { const i = JSON.parse(fs.readFileSync(INDEX, 'utf8')); i.verification = { status: 'VERIFIED' }; return i; };

/* ================= Part 1 — BASELINE (unmodified framework validator) ================= */
test('baseline: the shipped fixture pack passes', () => { assert.strictEqual(runFw(BASE).code, 0); });
test('baseline: clean pack accepted', () => { assert.strictEqual(runFw(cleanPack()).code, 0); });
test('baseline: requirementText on a non-public-domain source is rejected', () => {
  const r = runFw(mutate(p => { p.items[0].requirementText = 'Verbatim requirement text.'; }));
  assert.strictEqual(r.code, 1); assert.match(r.out, /requirementText present but source\.publicDomain/);
});
test('baseline: requirementText allowed only for a public-domain source', () => {
  const r = runFw(mutate(p => { p.source.publicDomain = true; p.items[0].requirementText = 'Public law text.'; }));
  assert.strictEqual(r.code, 0);
});
test('baseline: over-long quotedFragment rejected', () => {
  const r = runFw(mutate(p => { p.items[1].quotedFragment = '"one two three four five six seven"'; }));
  assert.strictEqual(r.code, 1); assert.match(r.out, /exceeds the 6-word budget/);
});
test('baseline: unquoted fragment rejected', () => {
  const r = runFw(mutate(p => { p.items[1].quotedFragment = 'no quotation marks'; }));
  assert.strictEqual(r.code, 1); assert.match(r.out, /wrapped in quotation marks/);
});
test('baseline: excessive share of quoted items rejected (pack ceiling)', () => {
  const r = runFw(mutate(p => { p.items.slice(0, 4).forEach(i => { i.quotedFragment = '"short quote"'; }); }));
  assert.strictEqual(r.code, 1); assert.match(r.out, /exceeding the 25% ceiling/);
});
test('baseline: copied NOTE / EXAMPLE / annex / definitions phrasing rejected', () => {
  for (const [re, txt] of [[/NOTE/, 'NOTE 1: this is copied'], [/EXAMPLE/, 'EXAMPLE 2: copied'], [/annex/, 'see Annex A for more'], [/definitions/, 'for the purposes of this standard, a term']]) {
    const r = runFw(mutate(p => { p.items[0].intent += ' ' + txt; }));
    assert.strictEqual(r.code, 1, txt); assert.match(r.out, /forbidden pattern/);
  }
});
test('baseline: missing required item field rejected', () => {
  const r = runFw(mutate(p => { delete p.items[2].question; }));
  assert.strictEqual(r.code, 1); assert.match(r.out, /missing required field "question"/);
});
test('baseline: duplicate itemId and undeclared groupId rejected', () => {
  const r1 = runFw(mutate(p => { p.items[1].itemId = p.items[0].itemId; }));
  assert.match(r1.out, /duplicate itemId/);
  const r2 = runFw(mutate(p => { p.items[0].groupId = 'nonexistent'; }));
  assert.match(r2.out, /not declared in pack\.groups/);
});
test('baseline: missing license and wrong schemaVersion rejected', () => {
  assert.strictEqual(runFw(mutate(p => { delete p.license.statement; })).code, 1);
  assert.strictEqual(runFw(mutate(p => { p.schemaVersion = '9.9.9'; })).code, 1);
});
test('baseline: unparseable pack fails', () => {
  const p = path.join(TMP, 'bad.json'); fs.writeFileSync(p, '{ nope');
  assert.strictEqual(spawnSync(process.execPath, [FW_VALIDATOR, p], { encoding: 'utf8' }).status, 1);
});

/* ================= Part 2 — KNOWN GAPS in the framework validator (documented, not hidden) ================= */
const GAPS = [
  ['invalid clause identifier', p => { p.items[0].clauseRef = 'banana'; }],
  ['clause that does not exist', p => { p.items[0].clauseRef = '99.9.9'; }],
  ['itemId not matching its clauseRef', p => { p.items[0].itemId = 'AS9100D-1.1-01'; }],
  ['invalid subordinate paragraph reference', p => { p.items[0].paragraphRef = '7.1.5.2(z)'; }],
  ['unsupported applicability rule', p => { p.items[0].appliesWhen = { magicRule: ['x'] }; }],
  ['missing source publisher metadata', p => { delete p.source.publisher; }],
  ['broken relatedItems relationship', p => { p.items[0].relatedItems = ['AS9100D-DOES-NOT-EXIST']; }],
  ['unverified source version', p => { /* base fixture has no verification block */ }],
  ['empty evidence list', p => { p.items[0].evidence = []; }],
  ['evidence reference not in catalogue', p => { p.items[0].evidenceRefs = ['EV-NOPE']; }]
];
GAPS.forEach(([name, fn]) => test('KNOWN GAP (framework passes it): ' + name, () => {
  const r = runFw(mutate(fn));
  // If this ever fails, the framework was hardened: update the gap register and this test deliberately.
  assert.strictEqual(r.code, 0, 'framework validator behaviour changed for: ' + name);
}));

/* ================= Part 3 — EXTENDED validator closes the gaps ================= */
test('extended: clean clause-grain pack (no obligations) accepted in dev mode with verified index', () => {
  const idx = path.join(TMP, 'idx-verified.json'); fs.writeFileSync(idx, JSON.stringify(verifiedIndex()));
  const r = spawnSync(process.execPath, [EXT_VALIDATOR, write(cleanPack()), '--index', idx], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
});
test('extended: release mode needs obligation-grain content and a verification record (see gate.test.js)', () => {
  const idx = path.join(TMP, 'idx-verified2.json'); fs.writeFileSync(idx, JSON.stringify(verifiedIndex()));
  const r = spawnSync(process.execPath, [EXT_VALIDATOR, write(cleanPack()), '--index', idx, '--release'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 1); assert.match(r.stdout + r.stderr, /requires a source-verification record/);
});
test('extended: framework rules still enforced (unauthorized source text rejected)', () => {
  const r = runExt(mutate(p => { p.items[0].requirementText = 'Verbatim.'; }));
  assert.strictEqual(r.code, 1); assert.match(r.out, /framework validator/); assert.match(r.out, /requirementText present/);
});
test('extended: excessive copying still enforced', () => {
  const r = runExt(mutate(p => { p.items.slice(0, 4).forEach(i => { i.quotedFragment = '"short quote"'; }); }));
  assert.strictEqual(r.code, 1); assert.match(r.out, /25% ceiling/);
});
const EXT_CASES = [
  ['invalid clause identifier', p => { p.items[0].clauseRef = 'banana'; }, /not a valid clause designator/],
  ['non-existent clause', p => { p.items[0].clauseRef = '99.9.9'; }, /not in the reference index/],
  ['itemId not embedding clauseRef', p => { p.items[0].itemId = 'AS9100D-1.1-01'; }, /does not embed its clauseRef/],
  ['invalid paragraph', p => { p.items[0].clauseRef = '7.1.5.2'; p.items[0].itemId = 'AS9100D-7.1.5.2-01'; p.items[0].paragraphRef = '7.1.5.2(z)'; }, /paragraph \(z\) does not exist/],
  ['obligation without paragraph where paragraphs exist', p => { p.items[0].clauseRef = '7.1.5.2'; p.items[0].itemId = 'AS9100D-7.1.5.2-01'; p.items[0].obligations = [{ obligationId: 'O1', paragraph: '7.1.5.2' }]; }, /has lettered paragraphs/],
  ['invalid subdivision', p => { p.items[0].clauseRef = '8.4.2'; p.items[0].itemId = 'AS9100D-8.4.2-01'; p.items[0].paragraphRef = '8.4.2(c)(9)'; }, /subdivision \(9\) does not exist/],
  ['obligation cites parent clause', p => { p.items[0].obligations = [{ obligationId: 'O1', paragraph: '8.5.1' }]; p.items[0].clauseRef = '8.1.3'; }, /not under item clause|parent clause/],
  ['unsupported applicability rule', p => { p.items[0].appliesWhen = { magicRule: ['x'] }; }, /unsupported applicability rule "magicRule"/],
  ['malformed applicability value', p => { p.items[0].appliesWhen = { activitiesAny: 'manufacture' }; }, /non-empty array of strings/],
  ['missing source metadata', p => { delete p.source.publisher; }, /source\.publisher is required/],
  ['bad mapVersion', p => { p.mapVersion = 'v1'; }, /mapVersion must be semantic/],
  ['broken relatedItems', p => { p.items[0].relatedItems = ['AS9100D-NOPE-01']; }, /references unknown item/],
  ['self relationship', p => { p.items[0].relatedItems = [p.items[0].itemId]; }, /references itself/],
  ['broken obligation relationship', p => { p.items[0].obligations = [{ obligationId: 'O1', paragraph: '8.1.3', relatedObligations: ['O-NOPE'] }]; }, /unknown obligation/],
  ['empty evidence', p => { p.items[0].evidence = []; }, /evidence must be a non-empty array/],
  ['blank evidence entry', p => { p.items[0].evidence = ['ok', '  ']; }, /non-empty strings/],
  ['evidence reference not in catalogue', p => { p.items[0].evidenceRefs = ['EV-NOPE']; }, /not in pack\.evidenceCatalog/],
  ['wrong-edition index', p => { p.source.designation = 'AS9110C'; }, /clause index is for/]
];
EXT_CASES.forEach(([name, fn, re]) => test('extended rejects: ' + name, () => {
  const r = runExt(mutate(fn));
  assert.strictEqual(r.code, 1, r.out); assert.match(r.out, re);
}));
test('extended: unverified source is a warning while authoring, an error for release', () => {
  const a = runExt(BASE); assert.strictEqual(a.code, 0); assert.match(a.out, /WARN — source version is not verified/);
  const b = runExt(BASE, ['--release']); assert.strictEqual(b.code, 1); assert.match(b.out, /required before release/);
});
test('extended: VERIFIED status requires reviewer and date', () => {
  const r = runExt(mutate(p => { p.source.verification = { status: 'VERIFIED' }; }));
  assert.strictEqual(r.code, 1); assert.match(r.out, /requires verifiedBy and verifiedOn/);
});
