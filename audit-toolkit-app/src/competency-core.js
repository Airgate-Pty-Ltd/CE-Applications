/**
 * Auditor Competency Assessment — shared capability. Items are DERIVED from the validated library records and the deterministic
 * evidence-assessment logic (not from generic LLM output). Every item carries expertReview.status. Until a qualified reviewer has
 * approved the item set, results are PRACTICE ONLY and never a determination of competence.
 * Free-text NCR drafts are scored with the same issuance gates the product enforces; wording quality still needs expert grading.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./audit-core.js'), require('../vendor/ril/library.js'));
  else root.Competency = factory(root.AuditCore, root.RIL);
})(typeof self !== 'undefined' ? self : this, function (Core, RIL) {
  'use strict';
  const DIMENSIONS = [
    ['interpret', 'Interpret the intended requirement'], ['citation', 'Identify the correct subordinate clause'], ['applicability', 'Determine applicability'],
    ['evidence', 'Select appropriate audit evidence'], ['questions', 'Develop verification questions'], ['sampling', 'Apply risk-based sampling'],
    ['sufficiency', 'Distinguish insufficient evidence from nonconformity'], ['equivalence', 'Recognize equivalent valid controls'], ['ncr', 'Draft a defensible Should Be / As Found NCR']
  ];
  const PENDING = { status: 'PENDING', reviewer: null, date: null };
  const rot = (arr, n) => arr.slice(n % arr.length).concat(arr.slice(0, n % arr.length));

  /** Builds the item set from a pack. Deterministic: same pack + seed = same items and same option order. */
  function buildSet(pack, seed) {
    const obs = pack.obligations, s = seed || 0; const items = []; const A = obs[s % obs.length], B = obs[(s + 1) % obs.length], Cc = obs[(s + 2) % obs.length], D = obs[(s + 3) % obs.length];
    const mk = (dim, prompt, options, correct, multi, ob) => ({ id: dim + '-' + ob.obligationId, dimension: dim, obligationId: ob.obligationId, prompt, options: rot(options, s + dim.length), correct, multi: !!multi, expertReview: PENDING });
    // 1 interpret intent
    items.push(mk('interpret', 'Which statement best captures the intent of ' + A.standard.id + ' ' + A.clauseRef + ' (' + A.title + ')?', [A.intent, B.intent, Cc.intent, D.intent], [A.intent], false, A));
    // 2 citation: correct leaf vs parent vs sibling vs invented
    const cl = RIL.parseRef(B.clauseRef), parent = cl.clause.includes('.') ? cl.clause.split('.').slice(0, -1).join('.') : cl.clause;
    const invented = cl.para ? cl.clause + '(' + String.fromCharCode(cl.para.charCodeAt(0) + 6) + ')' : cl.clause + '(z)';
    const sibling = (pack.hierarchy.find(n => n.ref === cl.clause) || {}).children && cl.para ? cl.clause + '(' + (cl.para === 'a' ? 'b' : 'a') + ')' : parent + '.9';
    items.push(mk('citation', 'An auditor finds that ' + B.intent.charAt(0).toLowerCase() + B.intent.slice(1) + ' Which reference governs this obligation?', [B.clauseRef, cl.clause, sibling, invented], [B.clauseRef], false, B));
    // 3 applicability
    const cond = Cc.applicability.conditions.activitiesAny || [];
    const applies = cond.length ? cond[0] : 'manufacture';
    items.push(mk('applicability', 'The organization’s only activity in scope is “distribute”. Does ' + Cc.clauseRef + ' (' + Cc.title + ') apply?', ['Applies', 'Does not apply — justify the exclusion', 'Applies only if the customer asks'], [cond.includes('distribute') || !cond.length ? 'Applies' : 'Does not apply — justify the exclusion'], false, Cc));
    // 4 evidence selection (multi)
    const good = A.expectedEvidence.slice(0, 2), bad = ['A policy statement with no records of application', 'The auditee’s verbal assurance that it is done'];
    items.push(mk('evidence', 'Which items are appropriate objective evidence for ' + A.clauseRef + '?', good.concat(bad), good, true, A));
    // 5 questions: open verification vs closed leading
    const goodQ = B.auditQuestions[1], badQ = ['Do you comply with ' + B.clauseRef + '?', 'Is ' + B.title.toLowerCase() + ' in place?'];
    items.push(mk('questions', 'Which question best tests whether the process actually satisfies ' + B.clauseRef + '?', [goodQ].concat(badQ), [goodQ], false, B));
    // 6 sampling
    const n = Cc.sampling.minSample || 2;
    items.push(mk('sampling', 'For ' + Cc.clauseRef + ' the population is “' + Cc.sampling.population + '”. Which approach is defensible?', ['Review the single record the auditee offers', 'Review at least ' + n + ' records chosen across the population by a reproducible method', 'Review only the newest record'], ['Review at least ' + n + ' records chosen across the population by a reproducible method'], false, Cc));
    // 7 sufficiency: computed by the evidence-assessment logic on a synthetic evidence set
    const evSet = [{ id: 'EV-1', type: 'interview', verified: true, links: [{ ob: D.obligationId, attr: D.aspects[0].id, effect: 'supports' }] }];
    const a = Core.assess({ id: D.obligationId, attributes: D.aspects, rebuttalChecks: D.rebuttalChecks, minSample: D.sampling.minSample }, evSet, []);
    const label = { demonstrated: 'The requirement is demonstrated', 'nc-supported': 'A nonconformity is supported', potential: 'Hold as a potential nonconformity and investigate', insufficient: 'Insufficient evidence: no conclusion yet' };
    items.push(mk('sufficiency', 'For ' + D.clauseRef + ' the only evidence so far is one interview statement supporting one aspect. What does the evidence support?', Object.values(label), [label[a.recommended]], false, D));
    // 8 equivalence
    const alt = A.alternativeValidImplementations[0], notEq = 'A procedure exists, but no records show it is applied';
    items.push(mk('equivalence', 'The organization does not use the form the auditor expected. Which situation is an equivalent valid control for ' + A.clauseRef + '?', [alt, notEq, 'The control is described only in a brochure'], [alt], false, A));
    // 9 NCR draft: free text scored by the product's issuance logic
    const NC = obs.find(o => o.obligationId === 'OB-7.1.5.2-a') || D;
    items.push({ id: 'ncr-' + NC.obligationId, dimension: 'ncr', obligationId: NC.obligationId, free: true, prompt: 'A verified record shows the requirement was not met (see scenario evidence). Draft the NCR: exact reference, Should Be, As Found, statement of nonconformity.', expertReview: PENDING });
    return { packId: pack.packId, contentVersion: pack.contentVersion, seed: s, items, expertReviewComplete: false };
  }
  const same = (a, b) => a.length === b.length && a.every(x => b.includes(x));
  /** answers: { itemId: string | string[] | {citation,shouldBe,asFound,statement} } ; ncrEval: (itemId, answer)=>{gatesPassed,gatesTotal,failed[]} */
  function score(set, answers, ncrEval) {
    const per = {}; const detail = [];
    set.items.forEach(it => {
      let pts = 0, max = 1, note = '';
      const ans = answers[it.id];
      if (it.free) { const r = ncrEval ? ncrEval(it, ans || {}) : { gatesPassed: 0, gatesTotal: 1, failed: [] }; pts = r.gatesTotal ? r.gatesPassed / r.gatesTotal : 0; note = r.failed.length ? 'Gates not met: ' + r.failed.join('; ') : 'All issuance gates met (wording quality still needs expert grading)'; }
      else if (it.multi) { const sel = ans || []; const right = sel.filter(x => it.correct.includes(x)).length, wrong = sel.filter(x => !it.correct.includes(x)).length; pts = Math.max(0, (right - wrong) / it.correct.length); note = same(sel, it.correct) ? 'Correct' : 'Expected: ' + it.correct.join(' | '); }
      else { pts = ans && it.correct.includes(ans) ? 1 : 0; note = pts ? 'Correct' : 'Expected: ' + it.correct[0]; }
      (per[it.dimension] = per[it.dimension] || { points: 0, max: 0 }); per[it.dimension].points += pts; per[it.dimension].max += max; detail.push({ id: it.id, dimension: it.dimension, points: pts, note });
    });
    const total = detail.reduce((a, d) => a + d.points, 0), max = detail.length;
    const reviewed = set.items.every(i => i.expertReview.status === 'APPROVED');
    return { perDimension: per, total, max, pct: Math.round(100 * total / max), detail, mode: reviewed ? 'EXPERT-REVIEWED' : 'PRACTICE-ONLY', statement: reviewed ? 'Item set approved by a qualified reviewer.' : 'PRACTICE MODE: items and scoring have not been expert-reviewed. This result is not a determination of auditor competence.' };
  }
  return { DIMENSIONS, buildSet, score };
});
