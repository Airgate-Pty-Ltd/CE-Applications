#!/usr/bin/env node
/**
 * Extended pack validator for the Audit Toolkit.
 *
 * WRAPS — does not modify or weaken — the framework validator
 * (2026-10-10-clause-map-framework/tools/validate-pack.js). The framework validator runs first,
 * unchanged; this tool then adds the checks the framework validator does not perform
 * (see tests/framework/README.md for the evidence of each gap).
 *
 * Usage: node validate-pack-extended.js <pack.json> --index <clause-index.json> [--release] [--verification-record <record.json>] [--framework <validate-pack.js>]
 *   authoring mode (default): unverified source/index status is a WARNING
 *   --release              : unverified source/index status is an ERROR (required release gate)
 * Exit: 0 pass, 1 fail.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const VALIDATOR_VERSION = '0.4.0';
const ALLOWED_APPLIES_KEYS = ['activitiesAny', 'regulatorsAny', 'certificationsAny', 'flagsAll', 'excludeIfFlagsAny'];
const CITE_RE = /^(\d+(?:\.\d+)*)(?:\(([a-z])\)(?:\((\d+)\))?)?$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function arg(name) { const i = process.argv.indexOf(name); return i === -1 ? null : process.argv[i + 1]; }
function validateExtended(pack, index, opts) {
  const errors = [], warnings = [];
  const err = m => errors.push(m), warn = m => warnings.push(m);
  const release = !!opts.release;

  // --- required metadata ---
  const src = pack.source || {};
  ['designation', 'revision', 'publisher', 'sourceType'].forEach(f => { if (!src[f]) err(`source.${f} is required`); });
  if (!pack.mapVersion || !SEMVER_RE.test(pack.mapVersion)) err('mapVersion must be semantic (x.y.z)');
  if (!pack.effectiveDate || !DATE_RE.test(pack.effectiveDate)) err('effectiveDate must be YYYY-MM-DD');
  if (!Array.isArray(pack.changelog) || !pack.changelog.length) err('changelog must have at least one entry');
  if (!pack.packId) err('packId is required');

  // --- source version verification ---
  const v = src.verification;
  if (!v || v.status !== 'VERIFIED') {
    const m = 'source version is not verified (source.verification.status !== "VERIFIED")';
    release ? err(m + ' — required before release') : warn(m);
  } else if (!v.verifiedBy || !DATE_RE.test(v.verifiedOn || '')) err('source.verification VERIFIED requires verifiedBy and verifiedOn (YYYY-MM-DD)');
  if (index) {
    if (index.source !== src.designation) err(`clause index is for "${index.source}" but pack source is "${src.designation}"`);
    if (index.edition && src.revision && String(index.edition) !== String(src.revision) && !String(index.edition).includes(String(src.revision))) err(`clause index edition "${index.edition}" does not match pack revision "${src.revision}"`);
    if (!index.verification || index.verification.status !== 'VERIFIED') {
      const m = 'clause index status is ' + ((index.verification && index.verification.status) || 'missing');
      release ? err(m + ' — designators must be verified against the licensed edition before release') : warn(m);
    }
  }

  // --- source-verification record (release): clause hierarchy AND authored interpretation reviewed separately, per obligation ---
  if (release) {
    const rec = opts.verificationRecord;
    const allObs = [];
    (Array.isArray(pack.items) ? pack.items : []).forEach(it => (it.obligations || []).forEach(o => allObs.push({ it, o })));
    if (!rec) err('release mode requires a source-verification record (--verification-record)');
    else {
      const edition = (src.designation || '') + ' ' + (src.revision || '');
      if (!allObs.length) err('release mode: pack has no obligation-grain entries to verify');
      const V = require('../src/verification.js');
      allObs.forEach(({ o }) => {
        const e = rec.find(r => r.obligationId === o.obligationId);
        if (!e) return err(`verification record has no entry for obligation ${o.obligationId}`);
        V.check(e, { packVersion: pack.mapVersion, sourceEdition: (src.designation || '') + ' ' + (src.revision || ''), clauseRef: o.paragraph }).reasons.forEach(r => err(r));
      });
    }
  }

  const items = Array.isArray(pack.items) ? pack.items : [];
  const ids = new Set(items.map(i => i.itemId));
  const catalog = new Set((pack.evidenceCatalog || []).map(e => e.evidenceId));

  const checkCite = (where, str, strictLeaf) => {
    const m = CITE_RE.exec(String(str || '').trim());
    if (!m) { err(`${where}: "${str}" is not a valid clause designator`); return null; }
    if (!index) return m;
    const entry = index.clauses[m[1]];
    if (!entry) { err(`${where}: clause ${m[1]} is not in the reference index`); return m; }
    if (m[2]) {
      if (!entry.paragraphs || !entry.paragraphs.includes(m[2])) err(`${where}: paragraph (${m[2]}) does not exist under ${m[1]} in the reference index`);
      else if (m[3] && !(entry.subs && entry.subs[m[2]] && entry.subs[m[2]].includes(m[3]))) err(`${where}: subdivision (${m[3]}) does not exist under ${m[1]}(${m[2]})`);
    } else if (entry.paragraphs && entry.paragraphs.length) {
      if (strictLeaf) err(`${where}: clause ${m[1]} has lettered paragraphs (${entry.paragraphs.join(',')}); an obligation must cite the subordinate paragraph`);
    } else if (entry.children && entry.children.length) {
      const msg = `${where}: ${m[1]} is a parent clause (sub-clauses ${entry.children.join(', ')})`;
      strictLeaf ? err(msg + '; obligations must cite the sub-clause') : warn(msg + ' — clause-grain item, not obligation grain');
    }
    return m;
  };

  items.forEach((it, idx) => {
    const where = `item[${idx}] (${it.itemId || 'NO-ID'})`;
    if (it.clauseRef) {
      checkCite(where + ' clauseRef', it.clauseRef);
      if (it.itemId && !it.itemId.includes(it.clauseRef)) err(`${where}: itemId does not embed its clauseRef "${it.clauseRef}"`);
    }
    if (it.paragraphRef) {
      const m = checkCite(where + ' paragraphRef', it.paragraphRef, true);
      if (m && it.clauseRef && !String(it.paragraphRef).startsWith(it.clauseRef)) err(`${where}: paragraphRef "${it.paragraphRef}" is not under clauseRef "${it.clauseRef}"`);
    }
    // applicability vocabulary
    if (it.appliesWhen) {
      if (typeof it.appliesWhen !== 'object' || Array.isArray(it.appliesWhen)) err(`${where}: appliesWhen must be an object`);
      else Object.keys(it.appliesWhen).forEach(k => {
        if (!ALLOWED_APPLIES_KEYS.includes(k)) err(`${where}: unsupported applicability rule "${k}" (supported: ${ALLOWED_APPLIES_KEYS.join(', ')})`);
        else if (!Array.isArray(it.appliesWhen[k]) || !it.appliesWhen[k].length || it.appliesWhen[k].some(x => typeof x !== 'string' || !x)) err(`${where}: appliesWhen.${k} must be a non-empty array of strings`);
      });
    }
    // relationships
    (it.relatedItems || []).forEach(r => {
      if (r === it.itemId) err(`${where}: relatedItems references itself`);
      else if (!ids.has(r)) err(`${where}: relatedItems references unknown item "${r}"`);
    });
    // evidence references
    if (!Array.isArray(it.evidence) || !it.evidence.length) err(`${where}: evidence must be a non-empty array`);
    else {
      const seen = new Set();
      it.evidence.forEach(e => {
        if (typeof e !== 'string' || !e.trim()) err(`${where}: evidence entries must be non-empty strings`);
        else { if (seen.has(e)) err(`${where}: duplicate evidence entry "${e}"`); seen.add(e); }
      });
    }
    (it.evidenceRefs || []).forEach(r => { if (!catalog.has(r)) err(`${where}: evidenceRefs references "${r}" which is not in pack.evidenceCatalog`); });
    // obligations (obligation-grain records)
    (it.obligations || []).forEach((ob, j) => {
      const w = `${where} obligation[${j}]`;
      if (!ob.obligationId) err(`${w}: obligationId required`);
      if (!ob.paragraph) err(`${w}: paragraph required`);
      else {
        const m = checkCite(w + ' paragraph', ob.paragraph, true);
        if (m && it.clauseRef && !String(ob.paragraph).startsWith(it.clauseRef)) err(`${w}: paragraph "${ob.paragraph}" is not under item clause "${it.clauseRef}"`);
      }
      (ob.relatedObligations || []).forEach(r => { if (r === ob.obligationId) err(`${w}: relates to itself`); });
    });
  });
  // pack-wide obligation relationship integrity
  const obIds = new Set(); items.forEach(it => (it.obligations || []).forEach(o => obIds.add(o.obligationId)));
  items.forEach(it => (it.obligations || []).forEach(o => (o.relatedObligations || []).forEach(r => { if (r !== o.obligationId && !obIds.has(r)) err(`obligation ${o.obligationId}: relatedObligations references unknown obligation "${r}"`); })));

  return { errors, warnings };
}

function main() {
  const packPath = process.argv[2];
  if (!packPath) { console.error('Usage: node validate-pack-extended.js <pack.json> --index <clause-index.json> [--release] [--framework <validate-pack.js>]'); process.exit(2); }
  const framework = arg('--framework') || path.join(__dirname, '..', '..', '2026-10-10-clause-map-framework', 'tools', 'validate-pack.js');
  const base = spawnSync(process.execPath, [framework, packPath], { encoding: 'utf8' });
  const issues = [];
  if (base.status !== 0) issues.push('[framework validator] ' + (base.stderr || base.stdout).trim().split('\n').filter(l => l.trim().startsWith('-')).map(l => l.trim().slice(2)).join(' | '));

  let pack, index = null;
  try { pack = JSON.parse(fs.readFileSync(packPath, 'utf8')); } catch (e) { console.error('FAIL — cannot parse pack: ' + e.message); process.exit(1); }
  const ip = arg('--index');
  if (ip) { try { index = JSON.parse(fs.readFileSync(ip, 'utf8')); } catch (e) { console.error('FAIL — cannot parse index: ' + e.message); process.exit(1); } }
  else console.error('note: no --index supplied; clause existence cannot be verified');

  let verificationRecord = null;
  const vp = arg('--verification-record');
  if (vp) { try { verificationRecord = JSON.parse(fs.readFileSync(vp, 'utf8')); } catch (e) { console.error('FAIL: cannot parse verification record: ' + e.message); process.exit(1); } }
  const r = validateExtended(pack, index, { release: process.argv.includes('--release'), verificationRecord });
  const errors = issues.concat(r.errors);
  r.warnings.forEach(w => console.error('WARN — ' + w));
  if (errors.length) { console.error('\nFAIL — extended validation\n'); errors.forEach(e => console.error('  - ' + e)); console.error(`\n${errors.length} issue(s).`); process.exit(1); }
  console.log('PASS — ' + packPath + (r.warnings.length ? ` (${r.warnings.length} warning(s))` : ''));
}
if (require.main === module) main();
module.exports = { validateExtended, VALIDATOR_VERSION };
