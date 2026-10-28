/**
 * Audit Planner core: builds defensible audit plans from approved library content.
 * Deterministic and UI-free. Plans PIN the content pack (manifest hash) and each obligation's content hash:
 * a later library update never alters an approved plan; it only raises a drift flag.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../vendor/resolver.js'), require('../vendor/ril/library.js'));
  else root.AuditPlanner = factory(root.CEResolver, root.RIL);
})(typeof self !== 'undefined' ? self : this, function (Resolver, RIL) {
  'use strict';

  const DURATION_RULE = { id: 'planning-heuristic-1', note: 'Planning estimate only (editable by the lead auditor); not a certification-body duration rule.', minutesPerQuestion: 4, minutesPerInterviewQuestion: 6, minutesPerSampleItem: 8, openingClosingMinutes: 60, reportMinutes: 90, workdayMinutes: 360 };

  /** Obligations that can be planned: applicable to the profile (resolver) and in the selected processes. */
  function selectable(pack, profile, processes) {
    return pack.obligations.map(o => {
      const r = Resolver.matchApplicability(o.applicability.conditions, profile);
      const inProc = !processes || !processes.length || o.processes.some(p => processes.includes(p));
      return { obligationId: o.obligationId, clauseRef: o.clauseRef, title: o.title, process: o.processes[0], applies: r.applies, reason: r.reason, inSelectedProcesses: inProc, planable: r.applies && inProc };
    });
  }
  function profileOf(plan) { return { activities: plan.org.activities, certifications: plan.criteria.certifications || [plan.standard.id] }; }
  function createPlan(o) {
    return Object.assign({ id: 'PLAN-001', title: '', org: { name: '', site: '', activities: [] }, standard: { id: '', edition: '' }, criteria: { certifications: [] }, auditType: 'Internal', objectives: [], scope: '', processes: [], obligationIds: [], dates: { start: null, days: null }, team: [], approvals: [], status: 'Draft', stamps: null, author: null, log: [] }, o || {});
  }

  /** Detailed checklist from library records: every planned obligation separately, with process interactions and related requirements. */
  function buildChecklist(plan, pack) {
    const idx = RIL.obligationIndex(pack); const chosen = new Set(plan.obligationIds);
    return plan.obligationIds.map(id => idx[id]).filter(Boolean).map(r => ({
      obligationId: r.obligationId, citation: plan.standard.id + ' ' + plan.standard.edition + ' ' + r.clauseRef, title: r.title, process: r.processes[0],
      interpretation: r.interpretation, intent: r.intent, expectedControl: r.expectedControl,
      verificationActivities: r.verificationActivities, auditQuestions: r.auditQuestions, interviewQuestions: r.interviewQuestions, expectedEvidence: r.expectedEvidence,
      sampling: r.sampling, riskConsiderations: r.riskConsiderations, commonFailureIndicators: r.commonFailureIndicators, alternativeValidImplementations: r.alternativeValidImplementations,
      processInteractions: r.processRelationships.map(p => ({ process: p, inPlan: plan.processes.includes(p) })),
      related: r.relatedRequirements.map(x => ({ obligationId: x, inPlan: chosen.has(x), clauseRef: idx[x] ? idx[x].clauseRef : null })),
      contentStatus: { sourceVerification: r.sourceVerification.status, technicalApproval: r.technicalApproval.status, contentVersion: r.contentVersion }
    }));
  }
  /** Content status of the plan = the weakest status of any planned obligation. */
  function contentStatus(plan, pack) {
    const idx = RIL.obligationIndex(pack); const rs = plan.obligationIds.map(i => idx[i]).filter(Boolean);
    const ok = rs.length > 0 && rs.every(r => r.sourceVerification.status === 'VERIFIED' && r.technicalApproval.status === 'APPROVED');
    return ok ? { level: 'APPROVED-CONTENT', note: 'All planned obligations are source-verified and technically approved.' } : { level: 'DEMONSTRATION-CONTENT', note: 'One or more planned obligations are not source-verified/technically approved. The plan is a demonstration and is marked so.' };
  }

  function estimateDuration(plan, pack) {
    const idx = RIL.obligationIndex(pack); const R = DURATION_RULE; let m = 0; const rows = [];
    plan.obligationIds.forEach(id => { const r = idx[id]; if (!r) return; const mins = r.auditQuestions.length * R.minutesPerQuestion + r.interviewQuestions.length * R.minutesPerInterviewQuestion + (r.sampling.minSample || 0) * R.minutesPerSampleItem; rows.push({ obligationId: id, minutes: mins }); m += mins; });
    const total = m + R.openingClosingMinutes + R.reportMinutes;
    return { rule: R.id, note: R.note, rows, verificationMinutes: m, totalMinutes: total, days: Math.max(1, Math.ceil(total / R.workdayMinutes)) };
  }

  /** Agenda: opening, process blocks in order (grouped), lunch, closing. Times are computed from the duration rule. */
  function buildAgenda(plan, pack) {
    const idx = RIL.obligationIndex(pack); const R = DURATION_RULE; const byProc = {};
    plan.obligationIds.forEach(id => { const r = idx[id]; if (!r) return; (byProc[r.processes[0]] = byProc[r.processes[0]] || []).push(r); });
    let t = 9 * 60; const rows = []; const fmt = x => String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); const lead = (plan.team.find(x => x.role === 'Lead') || {}).name || 'TBD';
    const push = (label, mins, who, obs) => { rows.push({ from: fmt(t), to: fmt(t + mins), activity: label, who, obligations: obs || [] }); t += mins; };
    push('Opening meeting', 30, lead);
    let lunched = false;
    Object.keys(byProc).forEach((p, i) => {
      const mins = byProc[p].reduce((a, r) => a + r.auditQuestions.length * R.minutesPerQuestion + r.interviewQuestions.length * R.minutesPerInterviewQuestion + (r.sampling.minSample || 0) * R.minutesPerSampleItem, 0);
      if (!lunched && t >= 12 * 60) { push('Lunch', 45, ''); lunched = true; }
      const member = plan.team.filter(x => x.role !== 'Lead')[i % Math.max(1, plan.team.filter(x => x.role !== 'Lead').length)] || plan.team[0];
      push('Process audit — ' + p, mins, member ? member.name : lead, byProc[p].map(r => r.clauseRef));
    });
    push('Auditor review and report preparation', R.reportMinutes - 30, lead); push('Closing meeting', 30, lead);
    return rows;
  }

  /** Competence and independence considerations for the assigned team. */
  function teamCheck(plan, auditors) {
    const issues = [];
    const lead = plan.team.find(m => m.role === 'Lead');
    if (!lead) issues.push({ level: 'block', code: 'no-lead', msg: 'No lead auditor assigned.' });
    plan.team.forEach(m => {
      const a = auditors.find(x => x.id === m.auditorId);
      if (!a) { issues.push({ level: 'block', code: 'unknown-auditor', msg: m.name + ' is not a registered auditor.' }); return; }
      const comp = (a.competencies || []).find(c => c.standard === plan.standard.id);
      if (!comp) issues.push({ level: 'block', code: 'no-competence', msg: a.name + ' has no recorded competence for ' + plan.standard.id + '.' });
      else {
        if (m.role === 'Lead' && !comp.lead) issues.push({ level: 'block', code: 'not-lead-qualified', msg: a.name + ' is not recorded as lead-qualified for ' + plan.standard.id + '.' });
        if (comp.validTo && plan.dates.start && comp.validTo < plan.dates.start) issues.push({ level: 'block', code: 'competence-expired', msg: a.name + '’s competence record expires before the audit (' + comp.validTo + ').' });
      }
      const conflict = (a.responsibleFor || []).filter(p => plan.processes.includes(p));
      if (conflict.length) issues.push({ level: 'block', code: 'independence', msg: a.name + ' is responsible for ' + conflict.join(', ') + ' and cannot audit it (independence).' });
      if (a.site && a.site === plan.org.site && plan.auditType !== 'Internal') issues.push({ level: 'warn', code: 'same-site', msg: a.name + ' works at the audited site; consider impartiality for a ' + plan.auditType + ' audit.' });
    });
    if (plan.team.length === 1 && lead) issues.push({ level: 'warn', code: 'single-auditor', msg: 'One-person team; confirm technical expertise covers every process in scope.' });
    return issues;
  }

  function planIssues(plan, pack, auditors) {
    const issues = [];
    if (!plan.objectives.length) issues.push({ level: 'block', msg: 'Audit objectives are required.' });
    if (!plan.scope.trim()) issues.push({ level: 'block', msg: 'Audit scope is required.' });
    if (!plan.dates.start) issues.push({ level: 'block', msg: 'A start date is required.' });
    if (!plan.processes.length) issues.push({ level: 'block', msg: 'Select at least one process.' });
    if (!plan.obligationIds.length) issues.push({ level: 'block', msg: 'Select at least one requirement.' });
    const sel = selectable(pack, profileOf(plan), plan.processes);
    plan.obligationIds.forEach(id => { const s = sel.find(x => x.obligationId === id); if (!s) issues.push({ level: 'block', msg: id + ' is not in the content pack.' }); else if (!s.applies) issues.push({ level: 'block', msg: s.clauseRef + ' is not applicable to the organization profile: ' + s.reason }); else if (!s.inSelectedProcesses) issues.push({ level: 'warn', msg: s.clauseRef + ' belongs to a process that is not selected.' }); });
    const idx = RIL.obligationIndex(pack);
    plan.obligationIds.forEach(id => { const r = idx[id]; if (r) r.relatedRequirements.forEach(x => { if (!plan.obligationIds.includes(x)) issues.push({ level: 'warn', msg: r.clauseRef + ' is related to ' + (idx[x] ? idx[x].clauseRef : x) + ', which is not in this plan.' }); }); });
    return issues.concat(teamCheck(plan, auditors));
  }
  function approvePlan(plan, pack, auditors, approver) {
    const issues = planIssues(plan, pack, auditors).filter(i => i.level === 'block');
    if (issues.length) return { ok: false, issues };
    if (!approver || !approver.name || !approver.role) return { ok: false, issues: [{ level: 'block', msg: 'An accountable approver (name and role) is required.' }] };
    if (plan.author && approver.name === plan.author && plan.requireSeparateApprover) return { ok: false, issues: [{ level: 'block', msg: 'The plan author cannot approve their own plan under this policy.' }] };
    const manifest = RIL.buildManifest(pack);
    plan.stamps = { packId: pack.packId, contentVersion: pack.contentVersion, packHash: manifest.packHash, obligationHashes: Object.fromEntries(plan.obligationIds.map(i => [i, manifest.obligations[i]])), contentStatus: contentStatus(plan, pack).level, durationRule: DURATION_RULE.id };
    plan.approvals.push({ by: approver.name, role: approver.role, date: approver.date || null });
    plan.status = 'Approved'; plan.log.push('approved by ' + approver.name);
    return { ok: true, issues: [] };
  }
  /** A library update never changes an approved plan; it reports what changed so the plan can be reviewed and re-approved. */
  function planDrift(plan, currentManifest) {
    if (!plan.stamps) return { drifted: false, changed: [], removed: [] };
    const changed = [], removed = [];
    Object.keys(plan.stamps.obligationHashes).forEach(id => { const h = currentManifest.obligations[id]; if (!h) removed.push(id); else if (h !== plan.stamps.obligationHashes[id]) changed.push(id); });
    return { drifted: changed.length + removed.length > 0, changed, removed, planVersion: plan.stamps.contentVersion, currentVersion: currentManifest.contentVersion };
  }

  /* ---- exports ---- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function exportChecklistCsv(plan, pack) {
    const q = v => '"' + String(v).replace(/"/g, '""') + '"'; const rows = [['Citation', 'Obligation', 'Process', 'Type', 'Item', 'Result', 'Evidence ref', 'Notes']];
    buildChecklist(plan, pack).forEach(c => { c.auditQuestions.forEach((x, i) => rows.push([c.citation, c.obligationId, c.process, 'Audit question ' + (i + 1), x, '', '', ''])); c.interviewQuestions.forEach((x, i) => rows.push([c.citation, c.obligationId, c.process, 'Interview ' + (i + 1), x, '', '', ''])); c.expectedEvidence.forEach(x => rows.push([c.citation, c.obligationId, c.process, 'Evidence expected', x, '', '', ''])); });
    return rows.map(r => r.map(q).join(',')).join('\r\n');
  }
  function exportPlanHtml(plan, pack, auditors) {
    const cs = contentStatus(plan, pack), dur = estimateDuration(plan, pack), ag = buildAgenda(plan, pack), cl = buildChecklist(plan, pack);
    const banner = cs.level === 'APPROVED-CONTENT' ? '' : `<p style="border:2px solid #b45309;padding:8px"><b>DEMONSTRATION CONTENT</b> — ${esc(cs.note)}</p>`;
    return `<h1>Audit plan ${esc(plan.id)} — ${esc(plan.title)}</h1>${banner}
<table border="1" cellpadding="4"><tr><th>Organization / site</th><td>${esc(plan.org.name)} — ${esc(plan.org.site)}</td></tr><tr><th>Criteria</th><td>${esc(plan.standard.id)} ${esc(plan.standard.edition)}</td></tr><tr><th>Type</th><td>${esc(plan.auditType)}</td></tr><tr><th>Date / duration</th><td>${esc(plan.dates.start)} · ${dur.days} day(s) (${dur.totalMinutes} min, ${esc(dur.rule)}: planning estimate)</td></tr><tr><th>Scope</th><td>${esc(plan.scope)}</td></tr><tr><th>Objectives</th><td>${plan.objectives.map(esc).join('; ')}</td></tr><tr><th>Team</th><td>${plan.team.map(m => esc(m.name) + ' (' + esc(m.role) + ')').join(', ')}</td></tr><tr><th>Status</th><td>${esc(plan.status)}${plan.approvals.length ? ' — ' + plan.approvals.map(a => esc(a.by) + ', ' + esc(a.role)).join('; ') : ''}</td></tr>${plan.stamps ? `<tr><th>Content pin</th><td>${esc(plan.stamps.packId)} ${esc(plan.stamps.contentVersion)} sha256:${esc(plan.stamps.packHash.slice(0, 16))}…</td></tr>` : ''}</table>
<h2>Agenda</h2><table border="1" cellpadding="4">${ag.map(r => `<tr><td>${r.from}–${r.to}</td><td>${esc(r.activity)}</td><td>${esc(r.who)}</td><td>${r.obligations.map(esc).join(', ')}</td></tr>`).join('')}</table>
<h2>Checklist</h2>${cl.map(c => `<h3>${esc(c.citation)} — ${esc(c.title)}</h3><p><i>${esc(c.intent)}</i></p><p><b>Verification activities:</b> ${c.verificationActivities.map(esc).join(' · ')}</p><ol>${c.auditQuestions.map(q => `<li>${esc(q)}</li>`).join('')}</ol><p><b>Interview prompts:</b> ${c.interviewQuestions.map(esc).join(' | ')}</p><p><b>Expected evidence:</b> ${c.expectedEvidence.map(esc).join('; ')}</p><p><b>Sampling:</b> ${esc(c.sampling.population)} — ${esc(c.sampling.guidance)}</p><p><b>Risk:</b> ${c.riskConsiderations.map(esc).join('; ')}. <b>Failure indicators:</b> ${c.commonFailureIndicators.map(esc).join('; ')}. <b>Valid alternatives to consider:</b> ${c.alternativeValidImplementations.map(esc).join('; ')}</p>`).join('')}`;
  }
  return { DURATION_RULE, selectable, createPlan, buildChecklist, contentStatus, estimateDuration, buildAgenda, teamCheck, planIssues, approvePlan, planDrift, exportChecklistCsv, exportPlanHtml };
});
