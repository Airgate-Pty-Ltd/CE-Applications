/**
 * Audit Program core: risk-based scheduling and the traceable Requirement Coverage Matrix.
 * Coverage is computed from actual obligation identifiers in the library pack, never from clause headings or question counts.
 * Coverage RULES are policy objects; a policy not marked verified can inform planning but can never be reported as scheme compliance.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../vendor/resolver.js'), require('../vendor/ril/library.js'));
  else root.AuditProgram = factory(root.CEResolver, root.RIL);
})(typeof self !== 'undefined' ? self : this, function (Resolver, RIL) {
  'use strict';

  /* Coverage policies. verified:false means the rule has not been checked against the governing scheme documents
     (ISO 19011 edition, AS9101, AS9104/1, certification-body rules). Do not label output as scheme-compliant until verified. */
  const POLICIES = {
    'cycle-all-applicable': { id: 'cycle-all-applicable', label: 'Every applicable obligation assigned at least once within the program period', applies: 'program', verified: false, note: 'Common internal-programme planning rule; actual requirement depends on the standard, scheme, program period and audit type — UNVERIFIED.' },
    'per-audit-sampled': { id: 'per-audit-sampled', label: 'Each audit covers a planned sample; the program must cover all applicable obligations over the cycle', applies: 'program', verified: false, note: 'Sampled-audit principle; UNVERIFIED against the governing scheme.' }
  };

  function createProgram(o) {
    return Object.assign({ id: 'PRG-001', name: '', version: 1, period: { start: null, end: null }, org: { name: '', activities: [] }, standard: { id: '', edition: '' }, policyId: 'cycle-all-applicable',
      sites: [], processes: [], audits: [], naJustifications: {}, history: [], auditors: [], revisions: [], contentPin: null }, o || {});
  }
  const idx = pack => RIL.obligationIndex(pack);
  const profile = p => ({ activities: p.org.activities, certifications: [p.standard.id] });

  /**
   * Seven distinct sets (arrays of obligation ids):
   * 1 total in source · 2 applicable · 3 justified non-applicable · 4 assigned to planned audits · 5 assessed (results recorded/imported)
   * 6 not yet covered · 7 requiring re-evaluation.
   */
  function coverage(program, pack) {
    const ix = idx(pack); const total = Object.keys(ix);
    const scopeOf = id => Resolver.matchApplicability(ix[id].applicability.conditions, profile(program));
    const justified = {}, applicable = [];
    total.forEach(id => {
      const s = scopeOf(id), j = program.naJustifications[id];
      if (!s.applies) justified[id] = { basis: 'scope', reason: s.reason };
      else if (j && j.reason && j.reason.trim().length >= 20) justified[id] = { basis: 'justified', reason: j.reason, by: j.by, date: j.date };
      else applicable.push(id);
    });
    const live = program.audits.filter(a => a.status !== 'Cancelled');
    const assigned = Array.from(new Set(live.flatMap(a => a.obligationIds))).filter(id => ix[id] && applicable.includes(id));
    const assignedButNA = Array.from(new Set(live.flatMap(a => a.obligationIds))).filter(id => ix[id] && justified[id]);
    const assessed = [], reeval = [], reevalWhy = {};
    const cur = RIL.buildManifest(pack).obligations;
    applicable.forEach(id => {
      const rs = live.flatMap(a => Object.entries(a.results || {}).filter(([k]) => k === id).map(([, r]) => Object.assign({ audit: a.id }, r)));
      const done = rs.filter(r => ['demonstrated', 'nc', 'observation'].includes(r.outcome));
      if (done.length) {
        assessed.push(id);
        const latest = done.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).pop();
        if (latest.assessedHash && latest.assessedHash !== cur[id]) { reeval.push(id); reevalWhy[id] = 'library content changed since it was assessed (' + latest.audit + ')'; }
        else if (latest.outcome === 'nc' && !latest.closed) { reeval.push(id); reevalWhy[id] = 'open nonconformity from ' + latest.audit + ' needs follow-up'; }
      }
      if (rs.some(r => r.outcome === 'insufficient')) { if (!assessed.includes(id)) { reeval.push(id); reevalWhy[id] = 'previous assessment recorded insufficient evidence'; } }
    });
    const notCovered = applicable.filter(id => !assigned.includes(id));
    return { total, applicable, justified, assigned, assignedButNA, assessed, notCovered, reeval, reevalWhy, packComplete: RIL.completeness(pack).complete, packIncompleteReasons: RIL.completeness(pack).reasons,
      counts: { total: total.length, applicable: applicable.length, justifiedNA: Object.keys(justified).length, assigned: assigned.length, assessed: assessed.length, notCovered: notCovered.length, reeval: reeval.length } };
  }
  function matrix(program, pack) {
    const c = coverage(program, pack), ix = idx(pack);
    return c.total.map(id => {
      const audits = program.audits.filter(a => a.status !== 'Cancelled' && a.obligationIds.includes(id)).map(a => a.id);
      let state = 'Not covered'; if (c.justified[id]) state = 'Justified N/A'; else if (c.reeval.includes(id)) state = 'Re-evaluate'; else if (c.assessed.includes(id)) state = 'Assessed'; else if (c.assigned.includes(id)) state = 'Assigned';
      return { obligationId: id, clauseRef: ix[id].clauseRef, title: ix[id].title, state, audits, note: (c.justified[id] || {}).reason || c.reevalWhy[id] || '' };
    });
  }
  /** Scheme/policy evaluation. Unverified policies produce 'UNVERIFIED-POLICY' and never a compliance claim. */
  function policyCheck(program, pack) {
    const pol = POLICIES[program.policyId]; const c = coverage(program, pack);
    const gaps = c.notCovered.slice();
    const met = gaps.length === 0;
    return { policy: pol.id, label: pol.label, verified: pol.verified, met, gaps, status: pol.verified ? (met ? 'MET' : 'GAPS') : (met ? 'MET-UNVERIFIED-POLICY' : 'GAPS-UNVERIFIED-POLICY'), note: pol.verified ? '' : pol.note + ' This is a planning indicator, not a statement of scheme compliance.', packComplete: c.packComplete,
      caveat: c.packComplete ? '' : 'The content pack is not complete, so coverage of "all applicable obligations" cannot be declared: obligations may exist that are not in the approved index.' };
  }

  function addAudit(program, audit) { program.audits.push(Object.assign({ id: 'AUD-P' + String(program.audits.length + 1).padStart(2, '0'), status: 'Planned', obligationIds: [], processIds: [], results: {} }, audit)); return program; }
  function justifyNA(program, obligationId, reason, by, date) {
    if (!reason || reason.trim().length < 20) return { ok: false, reason: 'A justification of at least 20 characters is required.' };
    program.naJustifications[obligationId] = { reason: reason.trim(), by, date }; return { ok: true };
  }
  function overdue(program, today) { return program.audits.filter(a => a.status === 'Planned' && a.plannedDate && a.plannedDate < today); }
  function repeatFindings(program) {
    // one event = one (obligation, date): a finding present both in history and in a recorded audit result on the same date counts once
    const seen = {}; const add = (id, date, src) => { const k = id; seen[k] = seen[k] || {}; if (!seen[k][date]) seen[k][date] = src; };
    program.history.forEach(h => (h.findings || []).forEach(f => add(f.obligationId, h.date, h.date + ' (history)')));
    program.audits.forEach(a => Object.entries(a.results || {}).forEach(([id, r]) => { if (r.outcome === 'nc') add(id, r.date || a.plannedDate || a.id, a.id); }));
    return Object.entries(seen).filter(([, v]) => Object.keys(v).length >= 2).map(([obligationId, v]) => ({ obligationId, sources: Object.values(v) }));
  }
  /** Risk-based frequency (months between audits) — a configurable planning rule, shown with its inputs. */
  function riskSchedule(program, today) {
    const rep = repeatFindings(program).map(r => r.obligationId);
    return program.processes.map(p => {
      const last = program.history.filter(h => h.processId === p.id).map(h => h.date).sort().pop() || null;
      const recentNc = program.history.some(h => h.processId === p.id && (h.findings || []).length) ;
      const months = (p.risk >= 4 || recentNc) ? 6 : p.risk === 3 ? 12 : 18;
      const due = last ? addMonths(last, months) : today;
      return { processId: p.id, process: p.name, risk: p.risk, recentFindings: recentNc, intervalMonths: months, lastAudit: last, due, overdue: due < today, rule: 'risk ≥4 or recent findings → 6 months; risk 3 → 12; else 18 (planning rule, adjustable; not a scheme requirement)' };
    });
  }
  function addMonths(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); }
  function effectiveness(program, pack, today) {
    const c = coverage(program, pack); const done = program.audits.filter(a => a.status === 'Completed').length, planned = program.audits.filter(a => a.status !== 'Cancelled').length;
    const nc = program.audits.reduce((n, a) => n + Object.values(a.results || {}).filter(r => r.outcome === 'nc').length, 0);
    return { auditsPlanned: planned, auditsCompleted: done, overdue: overdue(program, today).length, applicable: c.counts.applicable, assigned: c.counts.assigned, assessed: c.counts.assessed, coveragePlannedPct: c.counts.applicable ? Math.round(100 * c.counts.assigned / c.counts.applicable) : 0, coverageAssessedPct: c.counts.applicable ? Math.round(100 * c.counts.assessed / c.counts.applicable) : 0, nonconformities: nc, repeatFindings: repeatFindings(program).length, reevaluation: c.counts.reeval };
  }
  function revise(program, change, reason, by, date) {
    if (!reason || !reason.trim()) return { ok: false, reason: 'A reason is required for a program revision.' };
    program.revisions.push({ version: program.version, change, reason: reason.trim(), by, date }); program.version++; return { ok: true };
  }
  function pin(program, pack) { const m = RIL.buildManifest(pack); program.contentPin = { packId: pack.packId, contentVersion: pack.contentVersion, packHash: m.packHash }; return program.contentPin; }
  return { POLICIES, createProgram, coverage, matrix, policyCheck, addAudit, justifyNA, overdue, repeatFindings, riskSchedule, effectiveness, revise, pin };
});
