'use strict';
// Guards a class of defect Node tests cannot see: a source file used by the browser but never loaded by a prototype page.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const page = f => fs.readFileSync(path.join(root, 'prototype', f), 'utf8');
const tagsOf = html => [...html.matchAll(/<script src="\.\.\/([^"]+)"><\/script>/g)].map(m => m[1]);
const TK = page('toolkit.html'), LEGACY = page('index.html');

test('the Toolkit page loads every browser-facing module, library file and the content pack, in dependency order', () => {
  const tags = tagsOf(TK);
  fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).forEach(f => assert.ok(tags.includes('src/' + f), f + ' is loaded by toolkit.html'));
  ['vendor/resolver.js', 'vendor/ril/library.js', 'vendor/ril/consumer-views.js', 'vendor/ril/as9100d-demo@0.3.0.contentpack.js'].forEach(t => assert.ok(tags.includes(t), t));
  const pos = n => tags.indexOf(n);
  assert.ok(pos('vendor/ril/library.js') < pos('src/synthetic-data.js') && pos('vendor/ril/as9100d-demo@0.3.0.contentpack.js') < pos('src/synthetic-data.js'));
  assert.ok(pos('src/synthetic-data.js') < pos('src/session.js') && pos('src/session.js') < pos('src/walkthrough.js') && pos('src/walkthrough.js') < pos('src/toolkit-data.js') && pos('src/audit-core.js') < pos('src/session.js'));
});
test('the reference component page loads the audit-execution modules and the library pack before the data module', () => {
  const tags = tagsOf(LEGACY); const pos = n => tags.indexOf(n);
  ['src/audit-core.js', 'src/verification.js', 'src/session.js', 'src/walkthrough.js', 'src/synthetic-data.js', 'vendor/ril/library.js', 'vendor/ril/as9100d-demo@0.3.0.contentpack.js'].forEach(t => assert.ok(tags.includes(t), t));
  assert.ok(pos('vendor/ril/library.js') < pos('src/synthetic-data.js') && pos('vendor/ril/as9100d-demo@0.3.0.contentpack.js') < pos('src/synthetic-data.js'));
  assert.match(LEGACY, /REFERENCE COMPONENT/);
});
test('single-file builds inline every script (no external script references) and define every global', () => {
  ['audit-toolkit-prototype.html', 'audit-record-reference.html'].forEach(f => { const d = fs.readFileSync(path.join(root, 'prototype', 'dist', f), 'utf8'); assert.ok(!/<script src=/.test(d), f); assert.ok(d.includes('RIL_PACKS'), f + ' carries the content pack'); });
  const d = fs.readFileSync(path.join(root, 'prototype', 'dist', 'audit-toolkit-prototype.html'), 'utf8');
  ['Verification', 'AuditCore', 'SyntheticData', 'AuditSession', 'Walkthrough', 'AuditPlanner', 'AuditProgram', 'ScarBuilder', 'Competency', 'ToolkitData', 'CEResolver', 'RIL', 'RILConsumers'].forEach(g => assert.ok(new RegExp('root\\.' + g + '\\s*=').test(d), g));
});
test('vendored library files are exactly the library originals (drift guard) and the vendoring record matches', () => {
  const crypto = require('crypto'); const lib = path.join(root, '..', '2026-10-11-requirement-intelligence-library');
  const rec = JSON.parse(fs.readFileSync(path.join(root, 'vendor', 'ril', 'VENDORED.json'), 'utf8')); const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  Object.entries(rec.files).forEach(([to, o]) => { assert.strictEqual(sha(path.join(root, 'vendor', 'ril', to)), o.sha256, to + ' matches the vendoring record'); assert.strictEqual(sha(path.join(lib, o.from)), o.sha256, to + ' matches the library original'); });
});
test('no page references internal system names outside comments and scripts', () => {
  [TK, LEGACY].forEach(h => { const visible = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, ''); assert.ok(!/\bMAK\b|M-AI|\bKernel\b|micro ai/i.test(visible)); });
});
test('the Toolkit page does not make field audit execution its primary workflow', () => {
  assert.ok(!/photo capture|collect evidence in the field/i.test(TK.replace(/<!--[\s\S]*?-->/g, '')));
  const nav = /const NAV=\[(.*?)\];/s.exec(TK)[1]; ['Dashboard', 'Audit Planner', 'Audit Program', 'Checklist Library', 'SCAR Builder', 'NCR Builder', 'Competency'].forEach(n => assert.ok(nav.includes(n), n));
});
