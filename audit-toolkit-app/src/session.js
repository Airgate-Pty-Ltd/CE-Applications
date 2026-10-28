/**
 * Audit session — the stateful side of the Governed Audit Runtime.
 * Thin, UI-free: the prototype UI and the headless acceptance tests drive exactly this API.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./audit-core.js'), require('./synthetic-data.js'), require('../vendor/resolver.js'));
  else root.AuditSession = factory(root.AuditCore, root.SyntheticData, root.CEResolver);
})(typeof self !== 'undefined' ? self : this, function (Core, Data, Resolver) {
  'use strict';

  function create(opts) {
    const a = Data.AUDIT; opts = opts || {};
    const audit = {
      id: opts.id || a.id, type: a.type, standard: a.standard, edition: a.edition, date: a.date,
      org: Data.ORG, auditor: Data.AUDITOR, activities: Data.ORG.activities.slice(),
      evidence: {}, performed: [], samples: {}, conclusions: {}, ncrs: [], discarded: [], log: [], contentMode: 'demonstration',
      stamps: { pack: Data.STAMPS.pack, resolver: Data.STAMPS.resolver, core: 'audit-core ' + Core.CORE_VERSION, scheme: Data.STAMPS.scheme, followUp: Data.STAMPS.followUpProvider, referenceIndex: Data.CLAUSE_INDEX.verification.status }
    };
    return new Session(audit);
  }

  function Session(audit) { this.audit = audit; this.seq = (audit.log || []).length; }
  function restore(audit) { return new Session(audit); }
  const P = Session.prototype;

  P.log = function (type, detail) { this.audit.log.push({ seq: ++this.seq, type, detail }); };
  P.ob = function (id) { return Data.OBLIGATIONS.find(o => o.id === id); };
  P.profile = function () { return { activities: this.audit.activities, certifications: [this.audit.standard] }; };
  P.scope = function () { return Core.resolveScope(Resolver, Data.OBLIGATIONS, this.profile()); };
  P.scopeFor = function (obId) { return this.scope().find(s => s.ob.id === obId); };
  P.applicable = function () { return this.scope().filter(s => s.applies).map(s => s.ob); };
  P.setActivities = function (acts) { this.audit.activities = acts.slice(); this.log('scope', acts.join(',')); };
  P.evList = function () { return Object.values(this.audit.evidence); };
  P.sampleIds = function (obId) { return (this.audit.samples[obId] || { ids: [] }).ids.filter(id => this.audit.evidence['EV-' + id]); };
  P.assessment = function (obId) { return Core.assess(this.ob(obId), this.evList(), this.sampleIds(obId)); };
  P.followUps = function (obId) { return Core.followUps(this.ob(obId), Data.world, this.evList(), this.sampleIds(obId), this.audit.performed); };
  P.available = function (obId) { return Data.world.actions.filter(x => x.listedFor.includes(obId) && !x.simulated); };
  P.simulated = function (obId) { return Data.world.actions.filter(x => x.listedFor.includes(obId) && x.simulated); };
  P.population = function (obId) { return Data.world.actions.filter(x => x.popOf === obId); };

  /** Performing an action creates ONE evidence item (stable id) that may link to several obligations. */
  P.perform = function (actionId) {
    const act = Data.world.actions.find(x => x.id === actionId);
    if (!act) throw new Error('Unknown action ' + actionId);
    if (this.audit.performed.includes(actionId)) return this.audit.evidence['EV-' + actionId];
    const ev = JSON.parse(JSON.stringify(act));
    ev.id = 'EV-' + actionId;
    ev.obligationsLinked = Array.from(new Set(act.links.map(l => l.ob)));
    this.audit.evidence[ev.id] = ev;
    this.audit.performed.push(actionId);
    this.log('evidence', ev.id + ' → ' + ev.obligationsLinked.join(','));
    return ev;
  };

  P.addToSample = function (obId, recId, method, seed) {
    const s = this.audit.samples[obId] || (this.audit.samples[obId] = { ids: [], method: 'manual', seed: null, populationSize: this.population(obId).length });
    if (!s.ids.includes(recId)) s.ids.push(recId);
    if (method) { s.method = method; s.seed = seed; }
    this.perform(recId);
    this.log('sample', obId + ' + ' + recId);
  };
  P.drawSample = function (obId, k, seed) {
    const popIds = this.population(obId).map(x => x.id);
    const ids = Core.drawSample(popIds, k, seed);
    this.audit.samples[obId] = { ids: [], method: 'seeded', seed, populationSize: popIds.length };
    ids.forEach(id => this.addToSample(obId, id, 'seeded', seed));
    return ids;
  };

  P.conclude = function (obId, status, rationale) {
    const ob = this.ob(obId);
    const chk = Core.checkConclusion(ob, status, this.assessment(obId), rationale);
    if (!chk.ok) { this.log('conclusion-blocked', obId + ' ' + status); return chk; }
    this.audit.conclusions[obId] = { status, rationale: rationale || '' };
    this.log('conclusion', obId + ' ' + status);
    return chk;
  };
  P.reevaluate = function (obId) {
    // A recorded conclusion that evidence no longer supports is flagged, never silently kept.
    const c = this.audit.conclusions[obId];
    if (!c) return null;
    const chk = Core.checkConclusion(this.ob(obId), c.status, this.assessment(obId), c.rationale);
    return chk.ok ? null : chk.reasons[0];
  };

  /* ---- NCR ---- */
  P.startNCR = function (obId) {
    const ob = this.ob(obId);
    const existing = this.audit.ncrs.find(n => n.obId === obId);
    if (existing) return existing;
    const ev = this.evList().filter(e => e.links.some(l => l.ob === obId && l.effect === 'contradicts' && e.verified)).map(e => e.id);
    const ncr = {
      id: 'NCR-2026-' + String(114 + this.audit.ncrs.length).padStart(3, '0'), obId, citation: '', shouldBe: ob.shouldBe, shouldBeAttested: false,
      asFound: '', statement: '', evidenceIds: ev, class: '', classRationale: '', status: 'Draft', approval: null
    };
    this.audit.ncrs.push(ncr);
    this.log('ncr-start', ncr.id);
    return ncr;
  };
  P.gates = function (ncr) {
    return Core.ncrGates({ audit: this.audit, ncr, ob: this.ob(ncr.obId), assessment: this.assessment(ncr.obId), scope: this.scopeFor(ncr.obId), index: Data.CLAUSE_INDEX, auditor: this.audit.auditor, contentMode: this.audit.contentMode, verification: this.verification || Data.VERIFICATION, schemeClasses: ncr.schemeClasses });
  };
  P.citationCheck = function (ncr) { return Core.verifyCitation(Data.CLAUSE_INDEX, ncr.citation, this.ob(ncr.obId)); };
  P.submitNCR = function (ncr) {
    const g = this.gates(ncr);
    if (!Core.readyForReview(g)) return { ok: false, gates: g };
    ncr.status = 'In auditor review'; this.log('ncr-submit', ncr.id); return { ok: true, gates: g };
  };
  P.approveNCR = function (ncr) {
    if (ncr.status !== 'In auditor review') return { ok: false, gates: this.gates(ncr), reason: 'NCR must be submitted for auditor review first.' };
    const au = this.audit.auditor, auth = au.authorizations.find(x => x.scheme === this.audit.standard && x.validTo >= this.audit.date);
    if (!auth) return { ok: false, gates: this.gates(ncr), reason: 'Approver is not authorized for this scheme.' };
    ncr.approval = { by: au.name, authId: auth.authId, at: 'audit-session' };
    const g = this.gates(ncr);
    if (!Core.canIssue(g)) { ncr.approval = null; return { ok: false, gates: g }; }
    ncr.status = 'Issued'; this.log('ncr-issued', ncr.id); return { ok: true, gates: g };
  };
  /** Discard a non-issued NCR draft. The draft and the reason are retained in the audit record; nothing is silently deleted. */
  P.discardNCR = function (ncr, reason) {
    if (ncr.status === 'Issued') return { ok: false, reason: 'An issued NCR cannot be discarded; it must be formally withdrawn.' };
    if (!(reason || '').trim()) return { ok: false, reason: 'A reason is required to discard a draft.' };
    this.audit.ncrs = this.audit.ncrs.filter(n => n !== ncr);
    this.audit.discarded.push({ ncr: JSON.parse(JSON.stringify(ncr)), reason: reason.trim() });
    this.log('ncr-discard', ncr.id); return { ok: true };
  };
  /** Withdraw: if evidence/gates no longer hold the NCR returns to Draft rather than staying issued. */
  P.record = function () { return Core.auditRecord(this.audit); };

  return { create, restore, Session };
});
