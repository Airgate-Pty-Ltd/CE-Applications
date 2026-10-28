/**
 * Conform-Edge Requirement Intelligence Library (RIL) — reference implementation of the canonical obligation contract.
 * Dependency-free; runs in Node and the browser. The library OWNS: canonical record shape, citation grammar,
 * validation, content hashing, manifests, completeness, version diffs. Consumers (Audit Toolkit, Pocket Auditor) read
 * approved content packs through this contract and never keep their own copy of a checklist.
 *
 * SCHEMA STATUS: 1.0.0-rc.1 — a freeze CANDIDATE. Frozen only when the owner approves it (see GOVERNANCE.md).
 * No standard text is carried: every field is Conform-Edge authored; source identity is by exact reference.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RIL = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const SCHEMA_VERSION = '1.0.0-rc.1';
  const CITE_RE = /^(\d+(?:\.\d+)*)(?:\(([a-z])\)(?:\((\d+)\))?)?$/;

  /* ---------- utilities ---------- */
  function stable(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  }
  function sha256(str) {
    const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const bytes = []; const s = unescape(encodeURIComponent(str));
    for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i));
    const bl = bytes.length * 8; bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bl >>> (i * 8)) & 0xff);
    let h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const rr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < bytes.length; o += 64) {
      const w = new Array(64);
      for (let i = 0; i < 16; i++) w[i] = (bytes[o+4*i]<<24)|(bytes[o+4*i+1]<<16)|(bytes[o+4*i+2]<<8)|bytes[o+4*i+3];
      for (let i = 16; i < 64; i++) { const a0 = rr(w[i-15],7)^rr(w[i-15],18)^(w[i-15]>>>3), a1 = rr(w[i-2],17)^rr(w[i-2],19)^(w[i-2]>>>10); w[i] = (w[i-16]+a0+w[i-7]+a1)|0; }
      let [a,b,c,d,e,f,g,hh] = h;
      for (let i = 0; i < 64; i++) { const S1 = rr(e,6)^rr(e,11)^rr(e,25), ch = (e&f)^(~e&g), t1 = (hh+S1+ch+K[i]+w[i])|0, S0 = rr(a,2)^rr(a,13)^rr(a,22), mj = (a&b)^(a&c)^(b&c), t2 = (S0+mj)|0; hh=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0; }
      h = [(h[0]+a)|0,(h[1]+b)|0,(h[2]+c)|0,(h[3]+d)|0,(h[4]+e)|0,(h[5]+f)|0,(h[6]+g)|0,(h[7]+hh)|0];
    }
    return h.map(x => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
  }

  /* ---------- citation grammar and hierarchy ---------- */
  function parseRef(ref) { const m = CITE_RE.exec(String(ref || '').trim()); return m ? { clause: m[1], para: m[2] || null, sub: m[3] || null } : null; }
  function nodeIndex(pack) { const ix = {}; (pack.hierarchy || []).forEach(n => { ix[n.ref] = n; }); return ix; }

  /**
   * Exact citation validation against the pack's catalogued hierarchy. Never infers designators: a reference is valid
   * only if the hierarchy contains that node. Parent references (a node with children/paragraphs) are 'incomplete'.
   */
  function validateCitation(pack, ref) {
    const p = parseRef(ref); if (!p) return { ok: false, level: 'invalid', reason: 'not a clause designator' };
    const ix = nodeIndex(pack); const n = ix[ref.trim()];
    if (!n) {
      const clause = ix[p.clause];
      if (!clause) return { ok: false, level: 'invalid', reason: 'clause ' + p.clause + ' is not catalogued in ' + pack.packId };
      if (p.para) return { ok: false, level: 'invalid', reason: 'subdivision ' + ref + ' does not exist in the catalogued hierarchy' };
      return { ok: false, level: 'invalid', reason: ref + ' is not catalogued' };
    }
    if (n.children && n.children.length) return { ok: false, level: 'incomplete', reason: ref + ' is a parent (children: ' + n.children.join(', ') + ')' };
    return { ok: true, level: 'ok', node: n };
  }

  /* ---------- canonical record validation ---------- */
  const REQUIRED_STRINGS = ['obligationId', 'clauseRef', 'title', 'interpretation', 'intent', 'expectedControl', 'shouldBe', 'contentVersion'];
  const MIN_COUNTS = { verificationActivities: 4, auditQuestions: 4, interviewQuestions: 2, expectedEvidence: 3, aspects: 3, commonFailureIndicators: 2, riskConsiderations: 1, alternativeValidImplementations: 1, processRelationships: 1, processes: 1 };
  const FORBIDDEN = [/\bNOTE\s*\d*\s*:/i, /\bEXAMPLE\s*\d*\s*:/i, /\bfor the purposes? of this (standard|document|part)\b/i];

  function validateRecord(rec, pack, opts) {
    opts = opts || {}; const e = []; const id = rec && rec.obligationId || '?';
    if (!rec || typeof rec !== 'object') return ['record is not an object'];
    REQUIRED_STRINGS.forEach(f => { if (!rec[f] || typeof rec[f] !== 'string' || !rec[f].trim()) e.push(`${id}: ${f} is required`); });
    Object.keys(MIN_COUNTS).forEach(f => { if (!Array.isArray(rec[f]) || rec[f].filter(x => (typeof x === 'string' ? x.trim() : x)).length < MIN_COUNTS[f]) e.push(`${id}: ${f} needs at least ${MIN_COUNTS[f]} entr${MIN_COUNTS[f] === 1 ? 'y' : 'ies'}`); });
    if (!/^OB-[0-9A-Za-z.\-]+$/.test(rec.obligationId || '')) e.push(`${id}: obligationId must match OB-<token>`);
    if (!rec.standard || !rec.standard.id) e.push(`${id}: standard.id is required`);
    else if (rec.standard.id !== pack.standard.id) e.push(`${id}: standard "${rec.standard.id}" does not match pack standard "${pack.standard.id}"`);
    if (!rec.edition || !rec.edition.label) e.push(`${id}: edition.label is required`);
    else if (pack.edition && rec.edition.label !== pack.edition.label) e.push(`${id}: edition "${rec.edition.label}" does not match pack edition "${pack.edition.label}"`);
    // exact citation: must be a catalogued LEAF; never an invented designator
    const c = validateCitation(pack, rec.clauseRef);
    if (!c.ok) e.push(`${id}: clauseRef "${rec.clauseRef}" — ${c.reason}`);
    else if (c.node.obligationIds && !c.node.obligationIds.includes(rec.obligationId)) e.push(`${id}: hierarchy node ${rec.clauseRef} does not list this obligation`);
    // aspects
    (rec.aspects || []).forEach((a, i) => { if (!a || !a.id || !a.text) e.push(`${id}: aspects[${i}] needs id and text`); });
    if (new Set((rec.aspects || []).map(a => a && a.id)).size !== (rec.aspects || []).length) e.push(`${id}: aspect ids must be unique`);
    // applicability
    if (!rec.applicability || typeof rec.applicability !== 'object' || !rec.applicability.conditions) e.push(`${id}: applicability.conditions is required (use {} for unconditional)`);
    // sampling
    if (!rec.sampling || !rec.sampling.population || !rec.sampling.guidance) e.push(`${id}: sampling.population and sampling.guidance are required`);
    // relationships must resolve
    const ids = new Set((pack.obligations || []).map(o => o.obligationId));
    (rec.relatedRequirements || []).forEach(r => { if (r === rec.obligationId) e.push(`${id}: relates to itself`); else if (!ids.has(r)) e.push(`${id}: relatedRequirements references unknown obligation "${r}"`); });
    (rec.concepts || []).forEach(cn => { if (!(pack.concepts || []).some(x => x.id === cn)) e.push(`${id}: concept "${cn}" is not defined in the pack`); });
    // provenance: separate source-verification and technical-approval states
    ['sourceVerification', 'technicalApproval'].forEach(k => { if (!rec[k] || !rec[k].status) e.push(`${id}: ${k}.status is required`); });
    if (rec.technicalApproval && rec.technicalApproval.status === 'APPROVED') {
      if (!rec.technicalApproval.approver || !rec.technicalApproval.date) e.push(`${id}: APPROVED requires approver and date`);
      if (rec.sourceVerification && rec.sourceVerification.status !== 'VERIFIED') e.push(`${id}: cannot be APPROVED while source verification is ${rec.sourceVerification.status}`);
    }
    // IP rules: no verbatim requirement text unless public domain; no copied NOTE/EXAMPLE/definition phrasing
    if (rec.requirementText && !(pack.licence && pack.licence.publicDomain)) e.push(`${id}: requirementText is not permitted for a non-public-domain source`);
    const authored = [rec.interpretation, rec.intent, rec.expectedControl, rec.shouldBe].concat(rec.auditQuestions || [], rec.interviewQuestions || [], rec.verificationActivities || []).join(' \n ');
    FORBIDDEN.forEach(re => { if (re.test(authored)) e.push(`${id}: authored text matches a copied-standard pattern (${re})`); });
    return e;
  }

  /* ---------- hash of authored content (approval/status changes do not alter it) ---------- */
  const NON_CONTENT = ['sourceVerification', 'technicalApproval', 'reviewers', 'contentVersion'];
  function contentHash(rec) { const c = Object.assign({}, rec); NON_CONTENT.forEach(k => delete c[k]); return sha256(stable(c)); }

  /* ---------- pack-level validation and completeness ---------- */
  function validatePack(pack) {
    const errors = [], warnings = [];
    if (pack.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion must be ${SCHEMA_VERSION}`);
    ['packId', 'contentVersion'].forEach(f => { if (!pack[f]) errors.push(`${f} is required`); });
    if (!pack.standard || !pack.standard.id || !pack.standard.publisher) errors.push('standard.id and standard.publisher are required');
    if (!pack.edition || !pack.edition.label) errors.push('edition.label is required');
    if (!pack.licence || !pack.licence.authoredContentOwner || pack.licence.sourceTextIncluded !== false) errors.push('licence.authoredContentOwner is required and licence.sourceTextIncluded must be false');
    if (!pack.edition || !pack.edition.verification || pack.edition.verification.status !== 'VERIFIED') warnings.push('edition not verified against an official source');
    const ix = nodeIndex(pack);
    (pack.hierarchy || []).forEach(n => {
      if (!parseRef(n.ref)) errors.push(`hierarchy node "${n.ref}" is not a valid designator`);
      (n.children || []).forEach(c => { if (!ix[c]) errors.push(`hierarchy node ${n.ref} lists unknown child ${c}`); });
      if (n.parent && !ix[n.parent]) errors.push(`hierarchy node ${n.ref} has unknown parent ${n.parent}`);
    });
    const seen = new Set();
    (pack.obligations || []).forEach(o => { if (seen.has(o.obligationId)) errors.push(`duplicate obligationId ${o.obligationId}`); seen.add(o.obligationId); validateRecord(o, pack).forEach(x => errors.push(x)); });
    // hierarchy → obligations reciprocity
    (pack.hierarchy || []).forEach(n => (n.obligationIds || []).forEach(id => { const o = (pack.obligations || []).find(x => x.obligationId === id); if (!o) errors.push(`hierarchy node ${n.ref} lists unknown obligation ${id}`); else if (o.clauseRef !== n.ref) errors.push(`hierarchy node ${n.ref} lists ${id} but the record cites ${o.clauseRef}`); }));
    return { errors, warnings };
  }

  /**
   * Completeness is computed from the hierarchy LEAVES and actual obligation identifiers, never from headings or counts of questions.
   * A pack is complete only if: edition verified, every leaf is classified (auditable yes/no with justification), every auditable leaf has
   * at least one approved obligation, and all obligations are source-verified and technically approved.
   */
  function completeness(pack) {
    const reasons = []; const ix = nodeIndex(pack);
    const leaves = (pack.hierarchy || []).filter(n => !(n.children && n.children.length));
    const stats = { leaves: leaves.length, auditableWithObligation: 0, auditableWithoutObligation: [], unclassified: [], notAuditable: 0 };
    leaves.forEach(n => {
      const has = (n.obligationIds || []).length > 0;
      if (n.auditable === 'no') { stats.notAuditable++; if (!n.nonAuditableJustification) reasons.push(`leaf ${n.ref} marked not auditable without justification`); }
      else if (n.auditable === 'yes') { if (has) stats.auditableWithObligation++; else stats.auditableWithoutObligation.push(n.ref); }
      else stats.unclassified.push(n.ref);
    });
    if (stats.unclassified.length) reasons.push(`${stats.unclassified.length} hierarchy leaves are not yet classified auditable/not auditable`);
    if (stats.auditableWithoutObligation.length) reasons.push(`${stats.auditableWithoutObligation.length} auditable leaves have no obligation record`);
    if (!pack.edition || !pack.edition.verification || pack.edition.verification.status !== 'VERIFIED') reasons.push('edition is not verified');
    const o = pack.obligations || [];
    const unverified = o.filter(r => !r.sourceVerification || r.sourceVerification.status !== 'VERIFIED').length;
    const unapproved = o.filter(r => !r.technicalApproval || r.technicalApproval.status !== 'APPROVED').length;
    if (unverified) reasons.push(`${unverified} of ${o.length} obligations are not source-verified`);
    if (unapproved) reasons.push(`${unapproved} of ${o.length} obligations are not technically approved`);
    if (pack.hierarchyVerification && pack.hierarchyVerification.status !== 'VERIFIED' || !pack.hierarchyVerification) reasons.push('clause hierarchy is not verified against the controlled source');
    return { complete: reasons.length === 0, reasons, stats, obligations: o.length };
  }

  /* ---------- manifest ---------- */
  function buildManifest(pack) {
    const obligations = {}; (pack.obligations || []).forEach(o => { obligations[o.obligationId] = contentHash(o); });
    const comp = completeness(pack);
    return {
      manifestVersion: '1', schemaVersion: pack.schemaVersion, packId: pack.packId, contentVersion: pack.contentVersion,
      standard: pack.standard, edition: pack.edition,
      obligationCount: (pack.obligations || []).length, obligations,
      packHash: sha256(stable({ hierarchy: pack.hierarchy, obligations: pack.obligations, concepts: pack.concepts, standard: pack.standard, edition: pack.edition, contentVersion: pack.contentVersion })),
      completeness: { complete: comp.complete, reasons: comp.reasons },
      release: { status: comp.complete ? 'RELEASE-CANDIDATE' : 'NOT-RELEASABLE', note: comp.complete ? '' : 'Incomplete or unverified content: development and review use only.' },
      signature: { state: 'UNSIGNED-DEVELOPMENT', note: 'Production packs require a signature by the library release authority; no key exists yet.' }
    };
  }
  function verifyPack(pack, manifest) {
    const reasons = []; const m = buildManifest(pack);
    if (manifest.packHash !== m.packHash) reasons.push('pack hash does not match the manifest');
    if (manifest.contentVersion !== pack.contentVersion) reasons.push('content version mismatch');
    Object.keys(m.obligations).forEach(id => { if (manifest.obligations[id] !== m.obligations[id]) reasons.push('obligation hash mismatch: ' + id); });
    if (Object.keys(manifest.obligations).length !== Object.keys(m.obligations).length) reasons.push('obligation count mismatch');
    return { ok: reasons.length === 0, reasons };
  }
  /** What changed between two manifests. Consumers use this to flag plans/results for re-evaluation — never to alter them silently. */
  function diffManifests(a, b) {
    const added = [], removed = [], changed = [];
    Object.keys(b.obligations).forEach(id => { if (!(id in a.obligations)) added.push(id); else if (a.obligations[id] !== b.obligations[id]) changed.push(id); });
    Object.keys(a.obligations).forEach(id => { if (!(id in b.obligations)) removed.push(id); });
    return { added, removed, changed, from: a.contentVersion, to: b.contentVersion };
  }

  /* ---------- consumer-facing views over the SAME record (no second copy) ---------- */
  function obligationIndex(pack) { const m = {}; (pack.obligations || []).forEach(o => { m[o.obligationId] = o; }); return m; }

  return { SCHEMA_VERSION, stable, sha256, parseRef, validateCitation, validateRecord, validatePack, completeness, contentHash, buildManifest, verifyPack, diffManifests, obligationIndex, MIN_COUNTS };
});
