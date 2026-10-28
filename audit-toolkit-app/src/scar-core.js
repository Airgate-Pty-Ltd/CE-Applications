/**
 * SCAR Response Builder core. The system never invents completed containment, verified causes, implemented actions or effectiveness
 * results: anything claimed as done/verified needs an owner-supplied date and evidence reference, otherwise the response document
 * states it as planned or probable. Methodology-neutral (8D is one supported view, not a mandate).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ScarBuilder = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const CAUSE_TYPES = ['occurrence', 'escape', 'systemic'];

  function createScar(o) {
    return Object.assign({ id: 'SCAR-001', format: 'generic', customer: '', customerRef: '', received: null, responseDue: null, subject: '',
      allegation: { text: '', items: [], statedRequirements: [], customerAssertions: [] },
      criteria: [], evidence: [], allegationAssessment: { verdict: null, basis: '', evidenceRefs: [] },
      containment: [], correction: [], rootCause: { method: '', analyses: [], notApplicable: [] }, correctiveActions: [], effectiveness: { criteria: [], results: [] }, status: 'Draft' }, o || {});
  }
  const hasEv = (s, ref) => s.evidence.some(e => e.id === ref);
  function reviewScar(s) {
    const blockers = [], warnings = []; const B = m => blockers.push(m), W = m => warnings.push(m);
    // allegation vs stated requirements
    if (!s.allegation.text.trim()) B('The customer’s allegation is not recorded.');
    if (!s.allegation.items.length) B('Break the allegation into itemised points so the response can be checked against each.');
    s.criteria.forEach(c => { if (c.source === 'customer-assertion') B('Criterion "' + c.text + '" is a customer assertion, not a stated requirement. Identify the governing requirement or contest the assertion.'); if (!c.source) B('Criterion "' + c.text + '" has no stated source.'); });
    if (!s.criteria.some(c => c.source && c.source !== 'customer-assertion')) B('No governing criteria (standard clause, contract or drawing requirement) are identified.');
    // evidence and assessment
    if (!s.evidence.length) B('No objective evidence has been entered.');
    const a = s.allegationAssessment;
    if (!a.verdict) B('The allegation has not been assessed (valid / partially valid / not substantiated / undetermined).');
    else { if (!(a.evidenceRefs || []).length) B('The allegation assessment cites no evidence.'); (a.evidenceRefs || []).forEach(r => { if (!hasEv(s, r)) B('Assessment cites unknown evidence ' + r + '.'); }); if (a.verdict === 'not-substantiated' && !(a.basis || '').trim()) B('"Not substantiated" needs a stated basis.'); }
    const needsAction = a.verdict && a.verdict !== 'not-substantiated';
    // containment and correction
    const act = (list, label) => list.forEach(x => {
      if (!x.action || !x.owner) B(label + ' "' + (x.action || x.id) + '" needs an action and an owner.');
      if (x.status === 'completed') { if (!DATE_RE.test(x.completedOn || '') || !x.evidenceRef) B(label + ' "' + x.action + '" is marked completed without a completion date and evidence reference.'); else if (!hasEv(s, x.evidenceRef)) B(label + ' "' + x.action + '" cites unknown evidence ' + x.evidenceRef + '.'); }
      else if (!DATE_RE.test(x.due || '')) B(label + ' "' + x.action + '" is planned without a due date.');
    });
    act(s.containment, 'Containment'); act(s.correction, 'Correction');
    if (needsAction && !s.containment.length) B('No immediate containment is recorded. State containment, or record why none is needed (product not affected, not in the field, etc.).');
    // root cause
    const rc = s.rootCause;
    if (needsAction) {
      if (!rc.method.trim()) B('Root-cause method is not stated.');
      CAUSE_TYPES.forEach(t => { const has = rc.analyses.some(x => x.type === t), na = (rc.notApplicable || []).some(x => x.type === t && (x.reason || '').trim().length >= 15); if (!has && !na) B('The ' + t + ' cause is neither analysed nor justified as not applicable.'); });
      rc.analyses.forEach(x => { if (!(x.cause || '').trim()) B('A ' + x.type + ' analysis has no stated cause.'); if (x.status === 'verified') { if (!(x.evidenceRefs || []).length || !x.evidenceRefs.every(r => hasEv(s, r))) B('The ' + x.type + ' cause is marked verified without valid evidence.'); } else W('The ' + x.type + ' cause is a hypothesis and will be stated as "probable cause (not verified)".'); if (!(x.whys || []).length) W('The ' + x.type + ' analysis records no cause chain.'); });
      // corrective actions
      if (!s.correctiveActions.length) B('No corrective actions are defined.');
      s.correctiveActions.forEach(x => {
        if (!x.causeRef || !rc.analyses.some(c => c.type === x.causeRef)) B('Corrective action "' + (x.action || x.id) + '" is not linked to an analysed cause.');
        if (!x.action || !x.owner) B('Corrective action needs an action and an owner.');
        if (x.status === 'completed') { if (!DATE_RE.test(x.completedOn || '') || !x.evidenceRef) B('Corrective action "' + x.action + '" is marked implemented without date and evidence.'); else if (!hasEv(s, x.evidenceRef)) B('Corrective action "' + x.action + '" cites unknown evidence.'); }
        else if (!DATE_RE.test(x.due || '')) B('Corrective action "' + x.action + '" has no due date.');
      });
      // effectiveness
      const ef = s.effectiveness;
      if (!ef.criteria.length) B('No objective effectiveness-verification criteria are defined.');
      ef.criteria.forEach(c => { if (!c.metric || !c.threshold || !c.method) B('Effectiveness criterion "' + (c.metric || c.id) + '" needs a measurable metric, a threshold and a method.'); if (!DATE_RE.test(c.verifyOn || '')) B('Effectiveness criterion "' + (c.metric || c.id) + '" needs a verification date.'); else { const lastDue = s.correctiveActions.map(x => x.completedOn || x.due).filter(Boolean).sort().pop(); if (lastDue && c.verifyOn <= lastDue) W('Effectiveness check "' + c.metric + '" is on or before the last corrective-action date; allow time to see results.'); } });
      (ef.results || []).forEach(r => { if (!r.evidenceRef || !hasEv(s, r.evidenceRef) || !DATE_RE.test(r.date || '')) B('An effectiveness result is recorded without date and valid evidence.'); });
    }
    // addresses the original issue
    s.allegation.items.forEach(it => {
      const refs = [].concat(s.containment, s.correction, s.correctiveActions, s.rootCause.analyses).some(x => (x.addresses || []).includes(it.id)) || (a.verdict && (a.addresses || []).includes(it.id));
      if (!refs) B('Allegation item "' + it.text + '" is not addressed by any containment, correction, cause or action.');
    });
    return { ready: blockers.length === 0, blockers, warnings };
  }
  const state = x => x.status === 'completed' ? 'Completed ' + x.completedOn + ' (evidence ' + x.evidenceRef + ')' : 'PLANNED — due ' + (x.due || 'unset');
  function render8D(s) {
    return [['D1 Team', ''], ['D2 Problem description', s.allegation.text], ['D3 Interim containment', s.containment.map(x => x.action + ' — ' + state(x)).join('; ')],
      ['D4 Root cause', s.rootCause.analyses.map(x => x.type + ': ' + x.cause + (x.status === 'verified' ? ' (verified)' : ' (probable, not verified)')).join('; ')],
      ['D5 Corrective actions', s.correctiveActions.map(x => x.action + ' — ' + state(x)).join('; ')], ['D6 Implementation and validation', s.effectiveness.criteria.map(c => c.metric + ' ' + c.threshold + ' by ' + c.verifyOn).join('; ')],
      ['D7 Prevent recurrence', s.correctiveActions.filter(x => x.causeRef === 'systemic').map(x => x.action).join('; ')], ['D8 Closure', 'Not claimed until effectiveness results are recorded with evidence.']];
  }
  const esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function responseDocument(s) {
    const r = reviewScar(s); const a = s.allegationAssessment;
    const head = r.ready ? '' : `<p style="border:2px solid #b91c1c;padding:8px"><b>DRAFT — NOT READY TO SEND.</b> ${r.blockers.length} open item(s).</p>`;
    const claim = x => x.status === 'completed' ? 'Completed on ' + esc(x.completedOn) + ' (evidence ' + esc(x.evidenceRef) + ')' : '<b>Planned</b> — owner ' + esc(x.owner) + ', due ' + esc(x.due);
    return `<h1>Response to ${esc(s.customerRef)} — ${esc(s.subject)}</h1>${head}<p>Supplier reference ${esc(s.id)} · Customer ${esc(s.customer)} · Received ${esc(s.received)} · Response due ${esc(s.responseDue)}</p>
<h2>Allegation and governing criteria</h2><p>${esc(s.allegation.text)}</p><ul>${s.criteria.map(c => `<li>${esc(c.text)} <i>(${esc(c.source)})</i></li>`).join('')}</ul>
<h2>Assessment of the allegation</h2><p><b>${esc(a.verdict || 'not assessed')}</b> — ${esc(a.basis)} Evidence: ${(a.evidenceRefs || []).map(esc).join(', ')}</p>
<h2>Containment</h2><ul>${s.containment.map(x => `<li>${esc(x.action)} — ${claim(x)}</li>`).join('')}</ul>
<h2>Correction</h2><ul>${s.correction.map(x => `<li>${esc(x.action)} — ${claim(x)}</li>`).join('')}</ul>
<h2>Root cause (${esc(s.rootCause.method)})</h2><ul>${s.rootCause.analyses.map(x => `<li><b>${esc(x.type)}:</b> ${esc(x.cause)} — ${x.status === 'verified' ? 'verified (evidence ' + (x.evidenceRefs || []).map(esc).join(', ') + ')' : '<b>probable cause, not yet verified</b>'}</li>`).join('')}${(s.rootCause.notApplicable || []).map(x => `<li><b>${esc(x.type)}:</b> not applicable — ${esc(x.reason)}</li>`).join('')}</ul>
<h2>Corrective actions</h2><ul>${s.correctiveActions.map(x => `<li>${esc(x.action)} (cause: ${esc(x.causeRef)}) — ${claim(x)}</li>`).join('')}</ul>
<h2>Effectiveness verification</h2><ul>${s.effectiveness.criteria.map(c => { const res = (s.effectiveness.results || []).find(z => z.criteriaId === c.id); return `<li>${esc(c.metric)}: ${esc(c.threshold)} by ${esc(c.verifyOn)} (${esc(c.method)}) — ${res ? 'result recorded ' + esc(res.date) + ': ' + esc(res.result) + ' (evidence ' + esc(res.evidenceRef) + ')' : '<b>not yet verified</b>'}</li>`; }).join('')}</ul>`;
  }
  /** Imports a SCAR from a simple key/value or JSON object; never fills in analysis, containment or evidence it does not contain. */
  function importScar(obj) {
    const s = createScar({ id: obj.supplierRef || 'SCAR-IMPORT', customer: obj.customer || '', customerRef: obj.customerRef || '', received: obj.received || null, responseDue: obj.responseDue || null, subject: obj.subject || '' });
    s.allegation.text = obj.allegation || ''; s.allegation.items = (obj.items || []).map((t, i) => ({ id: 'AL-' + (i + 1), text: t }));
    s.allegation.customerAssertions = obj.assertions || []; s.allegation.statedRequirements = obj.requirements || [];
    s.criteria = (obj.requirements || []).map(t => ({ text: t.text, source: t.source })).concat((obj.assertions || []).map(t => ({ text: t, source: 'customer-assertion' })));
    return s;
  }
  return { CAUSE_TYPES, createScar, reviewScar, render8D, responseDocument, importScar };
});
