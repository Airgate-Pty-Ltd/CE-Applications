/**
 * Browser acceptance sweep for the revised Toolkit prototype (toolkit.html). Run INSIDE the page (served over http):
 *   const code = await fetch('/tests/ui/toolkit-sweep.js').then(r=>r.text()); (0,eval)(code); const r = await __tk.run();
 * Drives the same functions the on-screen controls call and asserts on rendered text; then measures layout on the current viewport.
 * Covers the twelve required demonstrations. It does not replace review on a real device.
 */
(function () {
  async function run() {
    const R = [], errs = []; window.addEventListener('error', e => errs.push(e.message));
    const ck = (id, p, d) => R.push({ id, pass: !!p, detail: d ? String(d).slice(0, 120) : '' });
    window.confirm = () => true; window.prompt = m => /Evidence/.test(m) ? 'E4' : '2026-10-12';
    localStorage.clear(); T = freshState(); S = null; render();
    const T0 = () => document.getElementById('main').innerText;
    ck('nav.seven-modules', ['Dashboard', 'Audit Planner', 'Audit Program', 'Checklist Library', 'SCAR Builder', 'NCR Builder', 'Competency'].every(n => [...document.querySelectorAll('#tabs button')].some(b => b.innerText.includes(n))));
    ck('nav.field-execution-not-primary', !/photo capture|evidence collection/i.test(document.body.innerText));
    tab('dashboard'); ck('D0.dashboard-ten-standards-and-references', /ISO 22000/.test(T0()) && /FAA Part 145/.test(T0()) && /AS9101/.test(T0()) && /ISO 19011/.test(T0()));
    ck('D0.dashboard-not-releasable', /NOT-RELEASABLE/.test(T0()) && /manifest verified/.test(T0()));
    /* 1-3 standard, hierarchy, deep checklist */
    tab('library'); ck('D1.standard-and-edition-selectable', document.querySelectorAll('#main select option').length === 10);
    ck('D2.complete-hierarchy-with-incomplete-banner', /Clause hierarchy/i.test(T0()) && /8\.4\.2\(c\)\(1\)/.test(T0()) && /cannot be called complete/i.test(T0()) && /unclassified leaf/.test(T0()));
    T.lib.std = 'ISO14001'; render(); ck('D2b.unauthored-standard-honest', /Not authored/i.test(T0()) && !document.querySelector('#main .tree'));
    T.lib.std = 'AS9100D'; T.lib.ob = 'OB-7.1.5.2-a'; render();
    ck('D3.deep-checklist-fields', ['Interpretation', 'Intent', 'Expected control', 'Applicability', 'Audit questions', 'Interview questions', 'Expected objective evidence', 'Sampling', 'Process relationships', 'Risk considerations', 'Common failure indicators', 'Alternative valid implementations', 'Related requirements', 'source verification: PENDING', 'technical approval: PENDING', 'content hash'].every(x => new RegExp(x, 'i').test(T0())));
    /* 12 Pocket Auditor consumption */
    T.lib.showPA = true; render(); ck('D12.same-record-second-consumer', /identical id and hash in both consumers/.test(T0()) && /Field prompts/i.test(T0()));
    T.lib.ob = null; T.lib.showPA = false;
    /* 4-5 plan */
    tab('planner'); planDemo(); T.planStep = 3; render(); ck('D4.requirement-selection-with-applicability', /applies/.test(T0()) && document.querySelectorAll('#main input[type=checkbox]').length === 5);
    T.planStep = 4; render(); ck('D5.checklist-built', /Audit questions/i.test(T0()) && /Interview prompts/i.test(T0()) && /Process interactions/i.test(T0()) && /Valid alternatives to consider/i.test(T0()));
    T.planStep = 5; render(); ck('D5.schedule-and-duration', /Estimated duration/i.test(T0()) && /Opening meeting/.test(T0()) && /Closing meeting/.test(T0()) && /Planning estimate/.test(T0()));
    T.planStep = 6; render(); setRole('AU-02', 'Lead'); ck('D5.team-independence-blocks', /cannot audit it \(independence\)/.test(T0()) && /not recorded as lead-qualified/.test(T0()));
    setRole('AU-02', ''); setRole('AU-01', 'Lead');
    T.planStep = 7; render(); document.getElementById('apn').value = ''; document.getElementById('apr').value = ''; approvePlan(); ck('D5.approval-needs-accountable-approver', /accountable approver/.test(T0()) && T.plan.status !== 'Approved');
    document.getElementById('apn').value = 'B. Approver'; document.getElementById('apr').value = 'Quality manager'; approvePlan(); ck('D5.plan-approved-and-pinned', T.plan.status === 'Approved' && /sha256:/.test(T0()));
    T.exportView = 'plan'; render(); ck('D11.plan-export-preview', /Audit plan PLAN-2026-07/.test(T0()) && /DEMONSTRATION CONTENT/.test(T0()) && /Agenda/.test(T0()));
    T.exportView = 'csv'; render(); ck('D11.checklist-csv-preview', /"Citation","Obligation"/.test(T0()));
    T.sim = true; render(); tab('dashboard'); ck('D6.library-update-flags-plan-not-alters', /Library update detected/.test(T0()) && T.plan.status === 'Approved' && T.plan.stamps.contentVersion === '0.3.0'); T.sim = false;
    /* 6-7 program */
    tab('program'); newProgram(); const pt = T0();
    ck('D6.seven-coverage-measures', ['Total in source', 'Applicable', 'Justified N/A', 'Assigned to audits', 'Assessed', 'Not yet covered', 'Re-evaluation needed'].every(x => pt.includes(x)));
    const c = PG.coverage(T.program, pack()); ck('D7.uncovered-requirement-identified', c.notCovered.join() === 'OB-7.2-c' && /Not covered/.test(pt));
    ck('D6.policy-unverified-and-incomplete-pack-caveat', /UNVERIFIED-POLICY/.test(pt) && /not a statement of scheme compliance/.test(pt) && /INCOMPLETE/.test(pt));
    ck('D6.overdue-and-risk-schedule', /OVERDUE/.test(pt) && /Risk-based schedule/i.test(pt));
    T.pg.tile = 'notCovered'; assignGaps(); ck('D7.gap-assignable', PG.coverage(T.program, pack()).counts.notCovered === 0);
    T.sim = true; render(); ck('D6.library-update-flags-reevaluation', PG.coverage(T.program, pack()).reeval.length >= 2 && /library has been updated/i.test(T0())); T.sim = false; render();
    importResults(); ck('D6.import-results-feeds-coverage', PG.coverage(T.program, pack()).counts.assessed >= 3);
    /* 8 SCAR */
    tab('scar'); scarImport(); ck('D8.scar-import-blocks-and-separates-assertions', /Not ready/.test(T0()) && /customer assertion/.test(T0()) && /stated requirements vs customer assertions/i.test(T0()));
    scarExample(); ck('D8.scar-ready-response', /Response is ready/.test(T0()));
    T.scar.containment[0].evidenceRef = null; render(); ck('D8.invented-completion-blocked', /marked completed without a completion date and evidence/.test(T0())); scarExample();
    T.scarView = 'doc'; render(); ck('D8.document-states-planned-and-probable', /probable cause, not yet verified/.test(T0()) && /Planned/.test(T0()) && /not yet verified/.test(T0()));
    T.scarView = '8d'; render(); ck('D8.8d-optional-view', /D8/.test(T0()) && /not a mandate/.test(T0())); T.scarView = 'edit';
    /* 9 NCR */
    tab('ncr'); importResultsForNcr(); ck('D9.imported-results', /AUD-IMP-2026-114/.test(T0()));
    startNcr('OB-7.1.5.2-a'); ck('D9.should-be-as-found-statement', /Should Be/.test(T0()) && /As Found/.test(T0()) && /Statement of nonconformity/i.test(T0()) && /Issuance checks/i.test(T0()));
    ck('D9.multi-scheme-classification', /Critical \/ Major \/ Minor/.test(T0()) && /Nonconformity \/ Observation/.test(T0()) && /Major \/ Minor/.test(T0()));
    const pr = x => { onCite(x); return document.getElementById('citeres').innerText; };
    ck('D9.citation-gates', /Incomplete reference/.test(pr('7.1.5.2')) && /does not govern/.test(pr('7.1.5.2(b)')) && /Invalid reference/.test(pr('7.1.5.2(e)')));
    onCite('7.1.5.2(a)'); curNCR().shouldBeAttested = true; draftAF(); curNCR().class = 'Minor'; curNCR().classRationale = 'Isolated lapse; as-found within tolerance.'; render();
    ck('D9.submit-after-gates', document.querySelector('#ncract .btn') && !document.querySelector('#ncract .btn').disabled); ncrStep('submit'); ncrStep('approve'); ck('D9.issued-with-approval', curNCR().status === 'Issued');
    /* 10 competency */
    tab('competency'); compStart(); ck('D10.nine-items-practice-mode', document.querySelectorAll('#main .card').length >= 9 && /PRACTICE MODE/.test(T0()) && /not been expert-reviewed/.test(T0()));
    const set = compSet(); set.items.filter(i => !i.free).forEach(i => { T.comp.answers[i.id] = i.multi ? i.correct : i.correct[0]; }); compSubmit();
    ck('D10.result-never-claims-competence', /PRACTICE-ONLY/.test(T0()) && /not a determination of auditor competence/.test(T0()));
    /* wording */
    const html = document.documentElement.outerHTML.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, ''); ck('wording.no-internal-names', !/\bMAK\b|M-AI|\bKernel\b|micro ai/i.test(html));
    /* layout on the current viewport */
    const de = document.documentElement; const lay = [];
    const meas = tag => { const tiny = [...document.querySelectorAll('button,select,input,textarea,.chipb')].filter(e => e.offsetParent !== null && !e.closest('.review') && !e.closest('.tabs')).map(e => { const r = e.getBoundingClientRect(); return Math.min(r.height, r.width); }).filter(x => x < 26); if (de.scrollWidth > de.clientWidth || tiny.length) lay.push(tag + (de.scrollWidth > de.clientWidth ? ' overflow' : '') + (tiny.length ? ' tiny=' + tiny.length : '')); };
    tab('dashboard'); meas('dashboard'); tab('library'); meas('library'); T.lib.ob = 'OB-8.4.2-d'; T.lib.showPA = true; render(); meas('library-detail'); T.lib.ob = null; tab('planner'); for (let i = 1; i <= 7; i++) { T.planStep = i; render(); meas('plan-' + i); }
    tab('program'); meas('program'); tab('scar'); meas('scar'); tab('ncr'); T.ncrId = null; render(); meas('ncr-list'); tab('competency'); T.comp.result = null; render(); meas('competency');
    ck('layout.no-overflow-no-tiny-targets@' + window.innerWidth, lay.length === 0, lay.join('; '));
    return { n: R.length, pass: R.filter(x => x.pass).length, fails: R.filter(x => !x.pass), errs };
  }
  window.__tk = { run };
})();
