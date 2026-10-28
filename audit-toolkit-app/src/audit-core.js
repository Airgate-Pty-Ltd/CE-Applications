/**
 * Conform-Edge Audit Toolkit — Governed Audit Runtime (prototype core)
 *
 * Deterministic, dependency-free, runs identically in Node (tests) and the browser.
 * Everything the prototype UI claims as "enforced" is enforced HERE and tested headlessly
 * (tests/scenarios.test.js). The UI contains no conclusion logic of its own.
 *
 * What this module is:  evidence assessment, conclusion governance, citation verification,
 *   NCR issuance gates, seeded sampling, reproducible audit-record hashing.
 * What it is NOT:       an AI. "Suggested Follow-Up" below is a deterministic ENGINEERING STUB
 *   standing in for the future Audit Intelligence Provider contract. It does not establish that
 *   intelligent audit reasoning exists.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AuditCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const root = typeof self !== 'undefined' ? self : this;
  const CORE_VERSION = '0.2.0-proto';

  /* ---------------- utilities ---------------- */
  function stableStringify(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
    return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
  }

  // Compact synchronous SHA-256 (works in file:// pages and Node alike).
  function sha256(str) {
    const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const bytes = [];
    const s = unescape(encodeURIComponent(str));
    for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i));
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 0xff);
    let h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < bytes.length; off += 64) {
      const w = new Array(64);
      for (let i = 0; i < 16; i++) w[i] = (bytes[off+4*i]<<24)|(bytes[off+4*i+1]<<16)|(bytes[off+4*i+2]<<8)|bytes[off+4*i+3];
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i-15],7)^rotr(w[i-15],18)^(w[i-15]>>>3);
        const s1 = rotr(w[i-2],17)^rotr(w[i-2],19)^(w[i-2]>>>10);
        w[i] = (w[i-16]+s0+w[i-7]+s1)|0;
      }
      let [a,b,c,d,e,f,g,hh] = h;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e,6)^rotr(e,11)^rotr(e,25), ch = (e&f)^(~e&g);
        const t1 = (hh+S1+ch+K[i]+w[i])|0;
        const S0 = rotr(a,2)^rotr(a,13)^rotr(a,22), mj = (a&b)^(a&c)^(b&c);
        const t2 = (S0+mj)|0;
        hh=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
      }
      h = [(h[0]+a)|0,(h[1]+b)|0,(h[2]+c)|0,(h[3]+d)|0,(h[4]+e)|0,(h[5]+f)|0,(h[6]+g)|0,(h[7]+hh)|0];
    }
    return h.map(x => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
  }

  /* ---------------- sampling (seeded, reproducible) ---------------- */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedFromString(s) { return parseInt(sha256(String(s)).slice(0, 8), 16); }
  /** Draws k unique ids from the population. Same (population, k, seed) => same sample. */
  function drawSample(populationIds, k, seed) {
    const pool = populationIds.slice().sort();
    const rnd = mulberry32(seedFromString(seed));
    const out = [];
    while (out.length < Math.min(k, pool.length)) {
      out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    }
    return out.sort();
  }

  /* ---------------- citation verification ---------------- */
  // Grammar: 7.1.5.2   7.1.5.2(a)   8.4.2(c)(1)
  const CITE_RE = /^\s*(\d+(?:\.\d+)*)\s*(?:\(\s*([a-z])\s*\)\s*(?:\(\s*(\d+)\s*\))?)?\s*$/;
  function parseCitation(str) {
    const m = CITE_RE.exec(String(str || ''));
    if (!m) return null;
    return { clause: m[1], para: m[2] || null, sub: m[3] || null };
  }
  function formatCitation(c) { return c.clause + (c.para ? '(' + c.para + ')' : '') + (c.sub ? '(' + c.sub + ')' : ''); }

  /**
   * Verifies a citation against the (sample) clause index AND against the obligation it is
   * supposed to govern. Self-attestation is not accepted: the answer is computed.
   * level: ok | incomplete | invalid | mismatch
   */
  function verifyCitation(index, citation, ob) {
    const msgs = [];
    const c = parseCitation(citation);
    if (!c) return { ok: false, level: 'invalid', normalized: null, messages: ['Reference is not a recognisable clause designator (expected e.g. 7.1.5.2(a)).'] };
    const entry = index.clauses[c.clause];
    if (!entry) return { ok: false, level: 'invalid', normalized: formatCitation(c), messages: ['Clause ' + c.clause + ' is not in the reference index for ' + index.source + '. Designators are never inferred.'] };
    const norm = formatCitation(c);
    // Subordinate structure
    if (entry.paragraphs && entry.paragraphs.length) {
      if (!c.para) return finish('incomplete', ['Clause ' + c.clause + ' has lettered subordinate paragraphs (' + entry.paragraphs.join(', ') + '). A formal reference must name the governing paragraph.']);
      if (!entry.paragraphs.includes(c.para)) return finish('invalid', ['Paragraph (' + c.para + ') does not exist under ' + c.clause + ' in the reference index (valid: ' + entry.paragraphs.join(', ') + ').']);
      const subs = entry.subs && entry.subs[c.para];
      if (c.sub && !(subs && subs.includes(c.sub))) return finish('invalid', ['Subdivision (' + c.sub + ') does not exist under ' + c.clause + '(' + c.para + ') in the reference index.']);
    } else if (c.para) {
      if (entry.paragraphs === null) msgs.push('Reference index does not yet catalogue paragraphs under ' + c.clause + '; paragraph (' + c.para + ') cannot be verified.');
      return finish('invalid', ['Clause ' + c.clause + ' has no lettered paragraphs in the reference index; (' + c.para + ') cannot be verified.'].concat(msgs));
    } else if (entry.children && entry.children.length) {
      return finish('incomplete', ['Clause ' + c.clause + ' is a parent clause (sub-clauses: ' + entry.children.join(', ') + '). Cite the sub-clause that holds the obligation.']);
    }
    // Mapping to the obligation being cited
    if (ob) {
      const gov = parseCitation(ob.ref);
      if (norm !== formatCitation(gov)) {
        const isAncestor = gov.clause !== c.clause && gov.clause.indexOf(c.clause + '.') === 0;
        if (isAncestor) return finish('incomplete', ['Reference ' + norm + ' is a parent of the governing obligation ' + ob.ref + '. The finding must cite the subordinate requirement.']);
        return finish('mismatch', ['Reference ' + norm + ' is valid but does not govern the condition being assessed (' + ob.ref + ' — ' + ob.label + ').']);
      }
    }
    const warn = index.verification && index.verification.status !== 'VERIFIED'
      ? ['Reference index status: ' + index.verification.status + ' — designators must be confirmed against the licensed edition before a pack is released.'] : [];
    return { ok: true, level: 'ok', normalized: norm, messages: ['Reference ' + norm + ' exists in the index and governs ' + (ob ? ob.label : 'the cited requirement') + '.'].concat(warn), indexStatus: index.verification && index.verification.status };
    function finish(level, m) { return { ok: false, level, normalized: norm, messages: m }; }
  }

  /* ---------------- applicability ---------------- */
  function resolveScope(Resolver, obligations, profile) {
    return obligations.map(ob => ({ ob, ...Resolver.matchApplicability(ob.appliesWhen, profile) }));
  }

  /* ---------------- evidence assessment ---------------- */
  function linksFor(evList, obId) {
    const out = [];
    evList.forEach(ev => (ev.links || []).forEach(l => { if (l.ob === obId) out.push({ ev, link: l }); }));
    return out;
  }

  /**
   * Attribute status:
   *   unmet       verified contradicting evidence (not open)
   *   unconfirmed contradiction exists but is flagged open (fact not yet established)
   *   met         verified, corroborated supporting evidence; no contradiction
   *   claimed     only uncorroborated statements (interview) — NOT accepted as met
   *   untested    nothing yet
   */
  function assess(ob, evList, sampleIds) {
    const rel = linksFor(evList, ob.id);
    const resolves = {};
    rel.forEach(({ ev, link }) => { if (link.resolves) resolves[link.resolves] = (resolves[link.resolves] || []).concat({ ev, link }); });

    const attrs = ob.attributes.map(a => {
      const mine = rel.filter(r => r.link.attr === a.id);
      const contra = mine.filter(r => r.link.effect === 'contradicts' && !r.link.resolves);
      let confirmed = [], open = [];
      contra.forEach(r => {
        if (r.link.open) {
          const res = resolves[r.link.key] || [];
          const rc = res.filter(x => x.link.effect === 'contradicts' && x.ev.verified);
          const rs = res.filter(x => x.link.effect === 'supports' && x.ev.verified);
          if (rc.length) confirmed.push(r, ...rc);
          else if (rs.length) { /* resolved in favour of the organization */ }
          else open.push(r);
        } else if (r.ev.verified) confirmed.push(r);
        else open.push(r);
      });
      const supp = mine.filter(r => r.link.effect === 'supports' && r.ev.verified && !r.link.resolves)
        .concat(mine.filter(r => r.link.effect === 'supports' && r.link.resolves && r.ev.verified));
      const corroborated = supp.filter(r => r.ev.type !== 'interview');
      let status;
      if (confirmed.length) status = 'unmet';
      else if (open.length) status = 'unconfirmed';
      else if (corroborated.length) status = 'met';
      else if (supp.length) status = 'claimed';
      else status = 'untested';
      return { attr: a, status, supports: supp.map(r => r.ev.id), contradicts: confirmed.map(r => r.ev.id), open: open.map(r => r.ev.id), openQuestions: open.map(r => r.link.question || r.ev.openQuestion).filter(Boolean) };
    });

    const required = attrs.filter(a => a.attr.required !== false);
    const unmet = attrs.filter(a => a.status === 'unmet');
    const unconfirmed = attrs.filter(a => a.status === 'unconfirmed');
    const rebuttalsDone = new Set(evList.filter(e => e.rebuttal && e.rebuttal.ob === ob.id).map(e => e.rebuttal.check));
    const rebuttalsOutstanding = (ob.rebuttalChecks || []).filter(r => !rebuttalsDone.has(r.id));
    const sampleN = (sampleIds || []).length;
    const sampleShort = ob.minSample && sampleN < ob.minSample;
    const altMethod = evList.some(e => e.altMethod && (e.links || []).some(l => l.ob === ob.id));
    const formAbsent = evList.some(e => e.formAbsent && (e.links || []).some(l => l.ob === ob.id) || (e.formAbsent && e.obRef === ob.id));

    let recommended, reasons = [];
    if (unmet.length) {
      if (rebuttalsOutstanding.length) {
        recommended = 'potential';
        reasons.push('Evidence indicates a requirement is not met, but alternative explanations have not all been evaluated (' + rebuttalsOutstanding.length + ' outstanding).');
      } else {
        recommended = 'nc-supported';
        reasons.push('Verified objective evidence shows the requirement is not met; alternative explanations were evaluated.');
      }
    } else if (unconfirmed.length) {
      recommended = 'potential';
      reasons.push('A possible gap exists but the underlying fact is not yet established.');
    } else if (required.every(a => a.status === 'met')) {
      if (sampleShort) { recommended = 'insufficient'; reasons.push('Evidence supports every attribute but the sample (' + sampleN + ') is below the planned minimum (' + ob.minSample + ').'); }
      else { recommended = 'demonstrated'; reasons.push('Every attribute of the requirement is supported by verified, corroborated objective evidence' + (altMethod ? ' (organization uses a different but equivalent method).' : '.')); }
    } else {
      recommended = 'insufficient';
      const gaps = required.filter(a => a.status !== 'met').map(a => a.attr.id + ' (' + a.status + ')');
      reasons.push('Cannot conclude: no verified evidence yet for ' + gaps.join(', ') + '.');
    }
    return { obId: ob.id, attrs, recommended, reasons, unmet: unmet.map(a => a.attr.id), unconfirmed: unconfirmed.map(a => a.attr.id), rebuttalsOutstanding, sampleN, sampleShort: !!sampleShort, altMethod, formAbsent };
  }

  /** Conclusions the auditor may record. The app blocks unsupported ones; the auditor keeps decision authority over what IS supported. */
  function checkConclusion(ob, status, assessment, rationale) {
    const rec = assessment.recommended;
    const block = m => ({ ok: false, reasons: [m] });
    switch (status) {
      case 'demonstrated':
        return rec === 'demonstrated' ? { ok: true, reasons: [] } : block('Requirement cannot be recorded as demonstrated: ' + assessment.reasons.join(' '));
      case 'nc':
        if (rec === 'nc-supported') return { ok: true, reasons: [] };
        if (rec === 'potential') return block('A nonconformity cannot be recorded yet: ' + assessment.reasons.join(' ') + ' Record it as a potential nonconformity and complete the investigation.');
        return block('No verified objective evidence shows this requirement is unmet. A nonconformity cannot be recorded on absence of evidence, or because a preferred form is missing.');
      case 'pending':
        return (rec === 'potential' || rec === 'nc-supported') ? { ok: true, reasons: [] } : block('There is no unresolved evidence condition to hold. If evidence is simply incomplete, record "Insufficient objective evidence".');
      case 'insufficient':
        return rec === 'insufficient' || rec === 'potential' ? { ok: true, reasons: [] } : block('Evidence is sufficient for a conclusion (' + rec + ').');
      case 'na':
        return (rationale || '').trim().length >= 20 ? { ok: true, reasons: [] } : block('Justified non-applicability needs a recorded rationale.');
      default:
        return { ok: true, reasons: [] };
    }
  }

  /* ---------------- Suggested Follow-Up (deterministic engineering stub) ---------------- */
  function followUps(ob, world, evList, sampleIds, performed) {
    const a = assess(ob, evList, sampleIds);
    const done = new Set(performed);
    const out = [];
    const actionsFor = (pred) => world.actions.filter(x => !done.has(x.id) && !x.simulated && (x.listedFor || []).includes(ob.id) && pred(x));
    const touches = (x, attrId) => (x.links || []).some(l => l.ob === ob.id && l.attr === attrId);

    if (a.sampleShort) out.push({ kind: 'sample', title: 'Sample below planned minimum', why: a.sampleN + ' of ' + ob.minSample + ' records reviewed. Select more records from the population.', actionIds: [] });
    a.attrs.filter(x => x.status === 'untested' || x.status === 'claimed').forEach(x => {
      const acts = actionsFor(act => touches(act, x.attr.id)).slice(0, 2);
      out.push({ kind: 'verify', title: 'Requirement Verification: ' + x.attr.text, why: x.status === 'claimed' ? 'Only a statement supports this. Corroborate with a record or observation.' : 'No objective evidence recorded for this aspect yet.', actionIds: acts.map(z => z.id) });
    });
    a.attrs.filter(x => x.status === 'unconfirmed').forEach(x => {
      out.push({ kind: 'investigate', title: 'Additional Investigation Recommended', why: (x.openQuestions[0] || 'A possible gap has not been established as fact.') + ' Do not conclude until resolved.', actionIds: actionsFor(act => (act.resolvesKey || act.followFor) && touches(act, x.attr.id)).map(z => z.id) });
    });
    // lead-to rules: evidence already gathered points at the next thing to examine
    evList.forEach(ev => (ev.leadsTo || []).forEach(id => {
      if (!done.has(id) && world.actions.find(z => z.id === id && (z.listedFor || []).includes(ob.id))) {
        const lead = world.actions.find(z => z.id === id);
        out.push({ kind: 'lead', title: 'Evidence Review: follow the lead from ' + ev.ref, why: ev.leadWhy || 'This record points to a related check.', actionIds: [lead.id] });
      }
    }));
    if (a.unmet.length && a.rebuttalsOutstanding.length) {
      a.rebuttalsOutstanding.forEach(r => out.push({ kind: 'rebuttal', title: 'Finding Review: ' + r.text, why: 'Evaluate alternative explanations before concluding a nonconformity.', actionIds: actionsFor(act => act.rebuttal && act.rebuttal.ob === ob.id && act.rebuttal.check === r.id).map(z => z.id) }));
    }
    if (a.formAbsent && a.recommended !== 'nc-supported') out.push({ kind: 'note', title: 'Evidence Review: expected document not found', why: 'The absence of a specific form is not itself a finding. Establish whether the organization controls the same intent another way.', actionIds: [] });
    if (a.recommended === 'demonstrated') out.push({ kind: 'ready', title: 'Evidence supports the requirement', why: a.reasons.join(' '), actionIds: [] });
    if (a.recommended === 'nc-supported') out.push({ kind: 'ready', title: 'Finding Review: a nonconformity is supported', why: a.reasons.join(' ') + ' Develop the NCR.', actionIds: [] });
    // de-duplicate leads
    const seen = new Set();
    return out.filter(o => { const k = o.kind + o.title; if (seen.has(k)) return false; seen.add(k); return true; });
  }

  /* ---------------- NCR issuance gates ---------------- */
  const DATE_RE = /\b20\d{2}-\d{2}-\d{2}\b/;
  function ncrGates(ctx) {
    const { audit, ncr, ob, assessment, scope, index, auditor } = ctx;
    const ev = (ncr.evidenceIds || []).map(id => audit.evidence[id]).filter(Boolean);
    const cite = verifyCitation(index, ncr.citation, ob);
    const gates = [];
    const push = (n, id, ok, pass, fail) => gates.push({ n, id, ok: !!ok, msg: ok ? pass : fail });

    push(1, 'source', index.source && index.edition, 'Governing source identified: ' + index.source + ' ' + index.edition + '.', 'Governing source or edition is not identified.');
    push(2, 'citation', cite.ok, cite.messages[0], cite.messages.join(' '));
    push(3, 'applicable', scope && scope.applies, 'Requirement is applicable to the audited scope.', 'Requirement is not applicable to the audited scope' + (scope ? ': ' + scope.reason : '.'));
    const terms = ob.shouldBeTerms || [];
    const sbLower = (ncr.shouldBe || '').toLowerCase();
    const missingTerms = terms.filter(t => !sbLower.includes(t.toLowerCase()));
    push(4, 'shouldbe', (ncr.shouldBe || '').trim().length >= 40 && !missingTerms.length && ncr.shouldBeAttested,
      'Should Be reflects the verified obligation and the auditor attests it against the licensed text.',
      !(ncr.shouldBe || '').trim() ? 'Should Be is empty.' : missingTerms.length ? 'Should Be omits elements of the governing obligation: ' + missingTerms.join(', ') + '.' : 'Auditor has not attested the Should Be against the licensed edition.');
    const idsInText = ev.filter(e => (ncr.asFound || '').includes(e.ref) || (ncr.asFound || '').includes(e.id));
    const asFoundOk = (ncr.asFound || '').trim().length >= 60 && DATE_RE.test(ncr.asFound || '') && idsInText.length >= 1;
    push(5, 'asfound', asFoundOk && (ncr.statement || '').trim().length >= 30,
      'As Found states a specific, dated condition tied to record identifiers, and the statement of nonconformity explains the difference.',
      'As Found must be a specific condition (date + record identifier from linked evidence), and the statement of nonconformity must explain the difference between the requirement and the verified condition.');
    const contraEv = ev.filter(e => (e.links || []).some(l => l.ob === ob.id && l.effect === 'contradicts' && e.verified));
    push(6, 'evidence', contraEv.length >= 1, 'Verified objective evidence linked (' + contraEv.map(e => e.id).join(', ') + ').', 'No verified contradicting objective evidence is linked to this NCR.');
    push(7, 'unmet', assessment.unmet.length > 0, 'Unmet aspect of the requirement identified (' + assessment.unmet.join(', ') + ').',
      assessment.altMethod ? 'No unmet requirement: the intent is demonstrated by an alternative method. A different form or terminology is not a nonconformity.' : 'No aspect of the requirement is shown to be unmet by verified evidence.');
    push(8, 'rebuttal', assessment.unmet.length > 0 && !assessment.rebuttalsOutstanding.length && !assessment.unconfirmed.length, 'Contradictory and alternative explanations were evaluated; no unresolved contradictory evidence remains.',
      assessment.rebuttalsOutstanding.length ? 'Alternative explanations not yet evaluated: ' + assessment.rebuttalsOutstanding.map(r => r.text).join('; ')
        : assessment.unconfirmed.length ? 'Unresolved contradictory evidence remains (' + assessment.unconfirmed.join(', ') + ').' : 'Alternative explanations cannot be evaluated without an unmet aspect.');
    const sc = ctx.schemeClasses; const classOk = ncr.class && (!sc || sc.includes(ncr.class));
    push(9, 'class', classOk && (ncr.classRationale || '').trim().length >= 20, 'Classified ' + ncr.class + ' under the selected scheme with recorded rationale.', ncr.class && sc && !sc.includes(ncr.class) ? 'Classification "' + ncr.class + '" is not defined in the selected scheme (' + sc.join(' / ') + ').' : 'Scheme-based classification and rationale are required.');
    const authOk = auditor && auditor.authorizations.some(a => a.scheme === audit.standard && a.validTo >= audit.date);
    gates.push({ n: 10, id: 'approval', ok: !!(ncr.approval && authOk), msg: ncr.approval ? 'Approved by ' + ncr.approval.by + ' (' + ncr.approval.authId + ').' : authOk ? 'Awaiting approval by an authorized auditor.' : 'Approver is not authorized for this scheme.' });
    // 11: requirement content verified against the controlled source (production) / demonstration marker (demonstration mode)
    const mode = ctx.contentMode || 'demonstration';
    const vr = (ctx.verification || []).find(v => v.obligationId === ob.id);
    const V = (typeof module === 'object' && module.exports) ? require('./verification.js') : root.Verification;
    const vc = V.check(vr, { sourceEdition: index.source + ' ' + index.edition, clauseRef: ob.ref });
    const verified = vc.ok;
    if (mode === 'production') gates.push({ n: 11, id: 'content', ok: verified, msg: verified ? 'Clause hierarchy, interpretation, intended outcome and applicability verified against the controlled source; final technical approval recorded (' + vr.finalApproval.approver + ', ' + vr.finalApproval.date + ').' : 'Requirement content is not release-verified, so no production NCR can be issued: ' + vc.reasons.slice(0, 2).join('; ') + (vc.reasons.length > 2 ? ' (+' + (vc.reasons.length - 2) + ' more)' : '') + '.' });
    else gates.push({ n: 11, id: 'content', ok: true, demo: !verified, msg: verified ? 'Requirement content verified.' : 'DEMONSTRATION CONTENT: requirement and clause reference are not verified. This NCR is a demonstration and is marked as such; it could not be issued in production mode.' });
    // 12: the auditor has recorded the nonconformity conclusion (no NCR from an unrecorded or unsupported conclusion)
    const cc = audit.conclusions[ob.id];
    push(12, 'conclusion', cc && cc.status === 'nc', 'Auditor has recorded a nonconformity conclusion for this requirement.', 'No nonconformity conclusion is recorded by the auditor for this requirement.');
    return gates;
  }
  function readyForReview(gates) { return gates.filter(g => g.n !== 10).every(g => g.ok); }
  function canIssue(gates) { return gates.every(g => g.ok); }

  /* ---------------- reproducible audit record ---------------- */
  function auditRecord(audit) {
    const rec = {
      id: audit.id, standard: audit.standard, edition: audit.edition, date: audit.date,
      scope: audit.activities.slice().sort(), stamps: audit.stamps,
      sampling: audit.samples, evidence: audit.evidence, performed: audit.performed.slice(),
      conclusions: audit.conclusions,
      ncrs: audit.ncrs.map(n => ({ ...n })), discarded: audit.discarded || []
    };
    return { record: rec, hash: sha256(stableStringify(rec)) };
  }

  return { CORE_VERSION, stableStringify, sha256, drawSample, parseCitation, formatCitation, verifyCitation, resolveScope, assess, checkConclusion, followUps, ncrGates, readyForReview, canIssue, auditRecord, linksFor };
});
