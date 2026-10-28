/**
 * Browser acceptance sweep. Run INSIDE the prototype page (served over http):
 *   fetch('/tests/ui/acceptance-sweep.js').then(r=>r.text()).then(eval)
 *   await __sweep.phase1()   // scenarios A-F through the UI handlers + DOM assertions
 *   (reload page)            // persistence
 *   await __sweep.phase2()   // restored state, navigation between partial audits
 *   await __sweep.phase3()   // corrupt / unavailable storage
 * Each check is { id, pass, detail }. It drives the same functions the on-screen buttons call (inline onclick handlers),
 * then asserts on the RENDERED text. It does not replace manual review with a real finger on a real device.
 */
(function () {
  const R = [];
  const ck = (id, pass, detail) => R.push({ id, pass: !!pass, detail: detail === undefined ? '' : String(detail).slice(0, 220) });
  const T = () => document.getElementById('main').innerText;
  const has = (s, re) => re.test(s);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  window.confirm = () => true;
  const sel = (id, v, rat) => { document.getElementById('cs').value = v; document.getElementById('cr').value = rat || ''; };
  const conclude = (ob, v, rat) => { sel(ob, v, rat); recordConclusion(ob); const m = ui.msg[ob] || {}; return { block: m.ok === false ? m.text : '', ok: m.ok ? m.text : '' }; };
  const cardText = ob => { go('card', ob); return T(); };

  function leakScan(tag) {
    const html = document.documentElement.outerHTML.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '');
    const m = html.match(/\bMAK\b|M-AI|\bKernel\b|micro ai/i);
    ck('no-internal-names:' + tag, !m, m ? m[0] : 'clean');
  }

  async function phase1() {
    R.length = 0;
    resetAll(); await wait(50);

    /* ---------- A — Conforming ---------- */
    tab('audit'); go('card', 'OB-8.5.2');
    let t = T();
    ck('A.initial.governing-ref', has(t, /8\.5\.2/) && document.getElementById('sub').textContent === '8.5.2', document.getElementById('sub').textContent);
    ck('A.initial.state', has(t, /0 of 6 reviewed/) && has(t, /Not yet tested/), 'attributes untested, 0 of 6 reviewed');
    ck('A.initial.no-evidence', has(t, /No evidence recorded yet/));
    let r = conclude('OB-8.5.2', 'demonstrated', 'x');
    ck('A.blocked-before-evidence', /cannot be recorded as demonstrated/.test(r.block), r.block);
    pick('OB-8.5.2', 'LOT-26-0412'); pick('OB-8.5.2', 'LOT-26-0419');
    r = conclude('OB-8.5.2', 'demonstrated', 'two lots');
    ck('A.blocked-below-min-sample', /below the planned minimum/.test(T()) || /cannot be recorded as demonstrated/.test(r.block), r.block);
    const before = Object.keys(S.audit.evidence).length;
    pick('OB-8.5.2', 'LOT-26-0446');
    ck('A.sampling-traceability', JSON.stringify(S.sampleIds('OB-8.5.2')) === JSON.stringify(['LOT-26-0412', 'LOT-26-0419', 'LOT-26-0446']) && has(T(), /LOT-26-0446/), S.sampleIds('OB-8.5.2'));
    doAct('INT-STORES'); doAct('INT-STORES'); // duplicate evidence attempt
    ck('A.duplicate-evidence-not-duplicated', Object.keys(S.audit.evidence).length === before + 2 && S.audit.log.filter(l => l.type === 'evidence' && /INT-STORES/.test(l.detail)).length === 1, Object.keys(S.audit.evidence).length);
    ck('A.assessment', has(T(), /Evidence supports the requirement/), '');
    r = conclude('OB-8.5.2', 'nc', 'attempt');
    ck('A.NC-prohibited', /cannot be recorded|No verified objective evidence shows/.test(r.block), r.block);
    r = conclude('OB-8.5.2', 'demonstrated', 'Lots 0412, 0419, 0446 traced to material cert; EV-INT-STORES.');
    ck('A.demonstrated-permitted', /Recorded: Requirement demonstrated/.test(r.ok), r.ok);
    go('findings'); ck('A.no-NCR-behavior', !has(T(), /NCR-2026/) && !has(T(), /nonconformity recorded/), T().slice(0, 80));
    go('report'); t = T();
    ck('A.report', has(t, /8\.5\.2/) && has(t, /Requirement demonstrated/) && has(t, /LOT-26-0412, LOT-26-0419, LOT-26-0446/) && has(t, /DEMONSTRATION/), t.slice(0, 60));
    ck('A.report.record-hash', /sha256:[0-9a-f]{64}/.test(t));

    /* ---------- F — Insufficient evidence ---------- */
    go('card', 'OB-8.5.1.2'); t = T();
    ck('F.initial', has(t, /8\.5\.1\.2/) && has(t, /Validation and control of special processes/) && has(t, /Not yet tested/));
    ['HT-SPEC', 'SURVEY-REQ', 'PERS-MATRIX', 'INT-HTLEAD'].forEach(doAct); t = T();
    ck('F.evaluation', has(t, /Statement only/) && has(t, /Evidence supports/) && has(t, /More evidence needed/), '');
    ck('F.interview-alone-not-corroboration', S.assessment('OB-8.5.1.2').attrs.filter(a => a.status === 'claimed').length === 2);
    r = conclude('OB-8.5.1.2', 'demonstrated', 'x'); ck('F.demonstrated-prohibited', /Cannot conclude/.test(r.block) || /cannot be recorded as demonstrated/.test(r.block), r.block);
    r = conclude('OB-8.5.1.2', 'nc', 'x'); ck('F.NC-prohibited', /No verified objective evidence shows/.test(r.block), r.block);
    r = conclude('OB-8.5.1.2', 'insufficient', 'Furnace F-3 survey record not produced; custodian away until 2026-10-21.');
    ck('F.insufficient-permitted', /Recorded: Insufficient/.test(r.ok), r.ok);
    go('report'); t = T();
    ck('F.report-limitation', has(t, /Insufficient objective evidence — 8\.5\.1\.2: no conclusion of conformity or nonconformity/), '');
    ck('F.no-NCR-offered', !has(cardText('OB-8.5.1.2'), /Develop NCR/));

    /* ---------- E — Alternative compliant method ---------- */
    go('card', 'OB-7.2-c'); doAct('FORM-SEARCH');
    r = conclude('OB-7.2-c', 'nc', 'form missing'); ck('E.NC-refused-on-missing-form', /No verified objective evidence shows/.test(r.block), r.block);
    ['TR-2026-011', 'TR-2026-014', 'TR-2026-016'].forEach(i => pick('OB-7.2-c', i)); doAct('WI-QUAL-12'); doAct('INT-SUPV'); t = T();
    ck('E.alt-method-recognised', has(t, /different method/) && has(t, /Evidence supports the requirement/));
    r = conclude('OB-7.2-c', 'nc', 'form missing'); ck('E.NC-still-refused', /cannot be recorded|No verified/.test(r.block), r.block);
    r = conclude('OB-7.2-c', 'demonstrated', 'Intent met via MES qualification gate (EV-WI-QUAL-12, EV-TR-2026-014 shows failed assessment blocked authorization).');
    ck('E.demonstrated', /Recorded: Requirement demonstrated/.test(r.ok));
    go('report'); ck('E.report-alt-method-note', has(T(), /alternative method/));

    /* ---------- B — Potential NC (audit 1: resolves in organization's favour) ---------- */
    go('card', 'OB-8.4.2-d'); t = T();
    ck('B.initial', has(t, /8\.4\.2\(d\)/) && has(t, /Not yet tested/));
    S.population('OB-8.4.2-d').forEach(x => pick('OB-8.4.2-d', x.id)); doAct('SUP-ENTRY'); t = T();
    ck('B.potential-held', has(t, /Possible gap — unconfirmed/) && has(t, /Additional investigation recommended/) && has(t, /RCV-26-0903/), '');
    ck('B.followup-offered', has(t, /Suggested follow-up/i) && has(t, /Additional Investigation Recommended/i));
    r = conclude('OB-8.4.2-d', 'nc', 'x'); ck('B.NC-prohibited', /cannot be recorded yet/.test(r.block), r.block);
    r = conclude('OB-8.4.2-d', 'demonstrated', 'x'); ck('B.demonstrated-prohibited', /cannot be recorded as demonstrated/.test(r.block), r.block);
    r = conclude('OB-8.4.2-d', 'pending', 'Portal record for RCV-26-0903 outstanding.'); ck('B.held-permitted', /Recorded: Potential nonconformity/.test(r.ok), r.ok);
    go('findings'); t = T(); ck('B.findings-shows-held-not-NCR', has(t, /held — potential/) && !has(t, /NCR-2026/), '');
    go('card', 'OB-8.4.2-d'); doAct('PORTAL-REQ'); ck('B.pending-request-resolves-nothing', S.assessment('OB-8.4.2-d').recommended === 'potential');
    doAct('SIM-PORTAL-A'); t = T();
    ck('B.resolved-favourably', S.assessment('OB-8.4.2-d').recommended === 'demonstrated');
    ck('B.stale-held-conclusion-flagged', has(t, /Conclusion needs review/), 'held conclusion no longer supported');

    /* ---------- C + D — new audit (also exercises switching) ---------- */
    newAudit(); const auditC = S.audit.id; go('card', 'OB-7.1.5.2-a');
    ck('C.initial', document.getElementById('sub').textContent === '7.1.5.2(a)' && has(T(), /Not yet tested/));
    pick('OB-7.1.5.2-a', 'CAL-TW-0417'); t = T();
    ck('C.register-alone-not-finding', S.assessment('OB-7.1.5.2-a').recommended !== 'nc-supported' && has(t, /follow the lead/i), '');
    doAct('WO-88213-OP40'); r = conclude('OB-7.1.5.2-a', 'nc', 'x'); ck('C.NC-refused-until-alternatives-evaluated', /alternative explanations/.test(r.block), r.block);
    ['DEV-LOG', 'QP-7.1.5', 'OBS-TW-0417-TAG', 'INT-CALCOORD'].forEach(doAct);
    r = conclude('OB-7.1.5.2-a', 'nc', 'Tool used 2026-09-17 after due date 2026-08-31 (EV-WO-88213-OP40).'); ck('C.NC-permitted', /Recorded: Nonconformity/.test(r.ok), r.ok);
    openNCR('OB-7.1.5.2-a'); t = T();
    ck('D.initial-gates-block', document.querySelectorAll('.gate.f').length >= 4, document.querySelectorAll('.gate.f').length);
    const probe = c => { onCite(c); return document.getElementById('citeres').innerText; };
    ck('D.parent-clause-refused', /Incomplete reference/.test(probe('7.1.5.2')), '');
    ck('D.grandparent-refused', /Incomplete reference/.test(probe('7.1.5')));
    ck('D.wrong-paragraph-refused', /does not govern/.test(probe('7.1.5.2(b)')));
    ck('D.invalid-paragraph-refused', /Invalid reference/.test(probe('7.1.5.2(e)')));
    ck('D.nonexistent-clause-refused', /Invalid reference/.test(probe('7.9.9')));
    ck('D.submit-disabled-with-bad-citation', document.querySelector('#ncract .btn').disabled === true);
    onCite('7.1.5.2(a)'); ck('D.correct-citation-verified', /Verified/.test(document.getElementById('citeres').innerText));
    ck('D.demo-marker-shown', /DEMONSTRATION CONTENT/.test(T()));
    draftAF(); setClass('Minor'); curNCR().classRationale = 'Isolated lapse; as-found within tolerance.'; curNCR().shouldBeAttested = true; render();
    ck('C.submit-needs-attestation-and-all-gates', document.querySelector('#ncract .btn').disabled === false, [...document.querySelectorAll('.gate.f')].map(g => g.innerText.slice(0, 40)).join('|'));
    submitNCR(); ck('C.in-review', curNCR().status === 'In auditor review');
    ck('C.not-issuable-before-approval', /Awaiting approval/.test(document.getElementById('gates').innerText));
    approveNCR(); ck('C.issued', curNCR().status === 'Issued');
    const n = curNCR();
    ck('C.NCR-content', /7\.1\.5\.2\(a\)/.test(n.citation) && /TW-0417/.test(n.asFound) && /2026-09-17/.test(n.asFound) && n.statement.length > 30 && n.evidenceIds.length >= 2, n.evidenceIds.join(','));
    ck('C.no-discard-control-when-issued', !/Discard this draft/.test(T()));
    go('report'); t = T();
    ck('C.report-NCR', /Should Be:/.test(t) && /As Found:/.test(t) && /Statement of nonconformity:/.test(t) && /Rev D \(2016\)/.test(t) && /AUTH-SYN-0042/.test(t), '');

    /* ---------- discarded findings ---------- */
    newAudit(); go('card', 'OB-7.1.5.2-a'); pick('OB-7.1.5.2-a', 'CAL-TW-0417'); ['WO-88213-OP40', 'DEV-LOG', 'QP-7.1.5', 'OBS-TW-0417-TAG'].forEach(doAct);
    conclude('OB-7.1.5.2-a', 'nc', 'tool used out of cal'); openNCR('OB-7.1.5.2-a'); const draftId = curNCR().id;
    document.getElementById('dreason').value = ''; discardNCR(); ck('discard.requires-reason', /reason is required/i.test(document.getElementById('dmsg').textContent));
    document.getElementById('dreason').value = 'Raised in error; re-evaluating'; discardNCR();
    ck('discard.retained', S.audit.discarded.length === 1 && S.audit.ncrs.length === 0 && has(T(), /Discarded drafts \(retained\)/i) && has(T(), /Raised in error/), '');
    go('report'); ck('discard.in-report', has(T(), /discarded: Raised in error/));

    /* ---------- B branch 2 (portal shows no review) in a fresh audit ---------- */
    newAudit(); go('card', 'OB-8.4.2-d'); S.population('OB-8.4.2-d').forEach(x => pick('OB-8.4.2-d', x.id)); doAct('SUP-ENTRY'); doAct('SIM-PORTAL-B');
    ck('B2.still-held-until-alternatives-checked', S.assessment('OB-8.4.2-d').recommended === 'potential');
    doAct('ALT-RCV'); r = conclude('OB-8.4.2-d', 'nc', 'Portal audit trail shows no review; EV-SIM-PORTAL-B.'); ck('B2.NC-permitted-after-resolution', /Recorded: Nonconformity/.test(r.ok), r.ok);

    /* ---------- screens: no internal names ---------- */
    ['home', 'plan', 'audit', 'findings', 'report', 'scenarios', 'walk', 'about'].forEach(s => { tab(s); leakScan('screen-' + s); });
    ['OB-8.5.2', 'OB-7.1.5.2-a', 'OB-8.4.2-d', 'OB-7.2-c', 'OB-8.5.1.2'].forEach(o => { go('card', o); leakScan('card-' + o); });
    const ncr = S.audit.ncrs[0]; if (ncr) { go('ncr', ncr.id); leakScan('ncr'); }
    ck('audits-on-device', store.audits.length >= 4, store.audits.map(a => a.id).join(','));
    saveStore();
    return { results: R.slice(), audits: store.audits.map(a => ({ id: a.id, ev: Object.keys(a.evidence).length, ncr: a.ncrs.length, discarded: a.discarded.length })), auditC };
  }

  async function phase2() {
    R.length = 0;
    ck('P.restored-audit-count', store.audits.length >= 4, store.audits.length);
    ck('P.restored-current-audit-id', typeof S.audit.id === 'string', S.audit.id);
    const first = store.audits[0], A = AuditSession.restore(first);
    ck('P.first-audit-conclusions-intact', ['OB-8.5.2', 'OB-7.2-c', 'OB-8.5.1.2'].every(o => (first.conclusions[o] || {}).status), Object.keys(first.conclusions).join(','));
    ck('P.first-audit-sample-intact', JSON.stringify(A.sampleIds('OB-8.5.2')) === JSON.stringify(['LOT-26-0412', 'LOT-26-0419', 'LOT-26-0446']));
    openAudit(0); ck('P.switch-to-first-audit', S.audit.id === first.id && /AUD-2026-114/.test(document.getElementById('sub').textContent));
    go('report'); ck('P.first-audit-report-after-reload', /Requirement demonstrated/.test(T()) && /Insufficient objective evidence/.test(T()));
    const issuedIdx = store.audits.findIndex(a => a.ncrs.some(n => n.status === 'Issued'));
    ck('P.issued-NCR-survives-reload', issuedIdx >= 0, issuedIdx);
    if (issuedIdx >= 0) { openAudit(issuedIdx); go('findings'); ck('P.issued-NCR-visible', /Issued/.test(T()) && /7\.1\.5\.2\(a\)/.test(T())); }
    const discIdx = store.audits.findIndex(a => a.discarded.length); ck('P.discarded-survives-reload', discIdx >= 0);
    // continue a partially completed audit after reload: add evidence, assessments recompute
    const heldIdx = store.audits.findIndex(a => (a.conclusions['OB-8.4.2-d'] || {}).status === 'pending'); ck('P.partial-held-audit-present', heldIdx >= 0, heldIdx);
    if (heldIdx >= 0) { openAudit(heldIdx); go('card', 'OB-8.4.2-d'); ck('P.stale-flag-after-reload', /Conclusion needs review/.test(T())); }
    openAudit(0); go('report'); const h1 = (T().match(/sha256:[0-9a-f]{64}/g) || []).pop();
    ck('P.record-hash-stable-across-reload', !!h1 && h1 === 'sha256:' + S.record().hash, h1);
    return R.slice();
  }

  async function phase3() {
    R.length = 0;
    // storage write failure
    const orig = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error('QuotaExceededError'); };
    storageNote = ''; tab('home'); const t = T(); Storage.prototype.setItem = orig;
    ck('S.write-failure-surfaced-not-silent', /not being saved on this device/.test(t), '');
    // corrupt storage
    localStorage.setItem(KEY, '{not json'); return R.slice();
  }
  window.__sweep = { phase1, phase2, phase3, results: () => R.slice() };
})();
