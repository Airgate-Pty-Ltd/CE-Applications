'use strict';
/**
 * AUDIT-DEPTH REGRESSION GUARD. These tests fail if the product regresses into a basic checklist.
 * They pin the structural and behavioural depth of the professional audit workflow; the production build must keep them green
 * (and extend them as real obligation packs replace the demonstration content).
 */
const test = require('node:test');
const assert = require('node:assert');
const { create } = require('../src/session.js');
const Core = require('../src/audit-core.js');
const Data = require('../src/synthetic-data.js');

test('every obligation carries intent, objective, method, aspects, steps, expected evidence, sampling, weaknesses and a Should Be paraphrase', () => {
  Data.OBLIGATIONS.forEach(o => {
    ['intent', 'objective', 'method', 'shouldBe'].forEach(k => assert.ok(o[k] && o[k].length > 40, o.id + ' ' + k));
    assert.ok(o.attributes.length >= 3, o.id + ' aspects >= 3');
    assert.ok(o.steps.length >= 4, o.id + ' verification steps >= 4');
    assert.ok(o.evidenceExpected.length >= 3, o.id + ' expected evidence >= 3');
    assert.ok(o.weaknesses.length >= 2, o.id + ' common weaknesses >= 2');
    assert.ok(o.sampling && o.sampling.population && o.sampling.guidance, o.id + ' sampling');
    assert.ok(o.shouldBeTerms.length >= 2, o.id + ' Should Be accuracy terms');
    assert.ok(Core.parseCitation(o.ref), o.id + ' has a parseable exact reference');
  });
});

test('a checkbox is not an audit: no conclusion can be recorded without objective evidence (every obligation, every positive/negative conclusion)', () => {
  Data.OBLIGATIONS.forEach(o => {
    const S = create();
    ['demonstrated', 'nc', 'pending'].forEach(c => assert.strictEqual(S.conclude(o.id, c, 'x'.repeat(30)).ok, false, o.id + ' ' + c));
  });
});

test('every obligation needs corroborated, attribute-level evidence: statements alone never satisfy an aspect', () => {
  const S = create();
  // interview-only support for every aspect of 8.5.1.2
  S.perform('INT-HTLEAD');
  const a = S.assessment('OB-8.5.1.2');
  assert.ok(a.attrs.every(x => x.status !== 'met'));
});

test('every obligation that can yield an NC has alternative-explanation checks that must be evaluated first (where an alternative exists)', () => {
  const withRebuttals = Data.OBLIGATIONS.filter(o => o.rebuttalChecks.length);
  assert.ok(withRebuttals.length >= 3);
  withRebuttals.forEach(o => assert.ok(Data.world.actions.some(a => a.rebuttal && a.rebuttal.ob === o.id), o.id + ' has actions that evaluate its alternatives'));
});

test('sampling is defined, bounded and reproducible for every obligation that has a population', () => {
  Object.entries(Data.world.populations).forEach(([ob, pop]) => {
    if (!pop.length) return;
    const o = Data.OBLIGATIONS.find(x => x.id === ob);
    assert.ok(pop.length >= (o.minSample || 1), ob + ' population >= planned minimum');
    const a = Core.drawSample(pop, Math.min(3, pop.length), 'seed-x'), b = Core.drawSample(pop, Math.min(3, pop.length), 'seed-x');
    assert.deepStrictEqual(a, b);
  });
});

test('the NCR needs all of: exact subordinate citation, Should Be, As Found with identifiers, statement of nonconformity, verified evidence, alternatives evaluated, classification, recorded conclusion, authorized approval', () => {
  const S = create(); const ob = 'OB-7.1.5.2-a';
  S.addToSample(ob, 'CAL-TW-0417'); ['WO-88213-OP40', 'DEV-LOG', 'QP-7.1.5', 'OBS-TW-0417-TAG'].forEach(i => S.perform(i)); S.conclude(ob, 'nc', 'basis');
  const ncr = S.startNCR(ob);
  const ids = S.gates(ncr).map(g => g.id).sort();
  ['approval', 'asfound', 'citation', 'applicable', 'class', 'conclusion', 'content', 'evidence', 'rebuttal', 'shouldbe', 'source', 'unmet'].forEach(id => assert.ok(ids.includes(id), 'gate ' + id));
  assert.ok(S.gates(ncr).filter(g => !g.ok).length >= 5, 'a blank NCR fails many gates');
});

test('cross-process evidence is single-sourced and re-assessed in every obligation it touches', () => {
  const S = create(); S.addToSample('OB-8.5.2', 'LOT-26-0431');
  assert.notStrictEqual(S.assessment('OB-7.1.5.2-a').attrs.find(a => a.attr.id === 'C2').status, 'untested');
});

test('the audit record pins versions and is tamper-evident (hash changes with any recorded fact)', () => {
  const S = create(); const h0 = S.record().hash;
  S.perform('DEV-LOG'); assert.notStrictEqual(S.record().hash, h0);
  assert.ok(S.audit.stamps.pack && S.audit.stamps.resolver && S.audit.stamps.core && S.audit.stamps.referenceIndex);
});

test('scope drives applicability and every exclusion is explained', () => {
  const S = create(); S.setActivities([]);
  S.scope().forEach(s => { assert.strictEqual(s.applies, false); assert.ok(s.reason.length > 10); });
});
