#!/usr/bin/env node
/**
 * MANDATORY ENTRY POINT for application content validation (development baseline).
 *
 *   node validate-content.js <pack.json> --index <index.json> [--mode dev|release] [--verification-record <rec.json>] [--evidence-dir <dir>]
 *
 * - Runs the preserved framework validator, then the extended validator (which wraps the former). Neither is bypassable here.
 * - dev     : authoring checks; unverified sources are warnings.
 * - release : unverified sources, unverified clause hierarchy/interpretation, or missing technical approvals FAIL.
 * - Every failure exits non-zero (1 = validation failure, 2 = usage/internal error).
 * - Writes an evidence record: validator version, input-pack sha256, index sha256, framework validator sha256, mode, result, failure reasons.
 * Development checks stay separate from the stricter production-content release requirements.
 */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawnSync } = require('child_process');
const { VALIDATOR_VERSION } = require('./validate-pack-extended.js');

const argv = process.argv.slice(2);
const arg = n => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

function run() {
  const pack = argv[0];
  const index = arg('--index'), mode = arg('--mode') || 'dev', rec = arg('--verification-record');
  if (!pack || pack.startsWith('--') || !index || !['dev', 'release'].includes(mode)) { console.error('usage: validate-content.js <pack.json> --index <index.json> [--mode dev|release] [--verification-record <rec.json>] [--evidence-dir <dir>]'); return 2; }
  if (!fs.existsSync(pack) || !fs.existsSync(index)) { console.error('input not found'); return 2; }
  const framework = path.join(__dirname, '..', '..', '2026-10-10-clause-map-framework', 'tools', 'validate-pack.js');
  const args = [path.join(__dirname, 'validate-pack-extended.js'), pack, '--index', index, '--framework', framework];
  if (mode === 'release') args.push('--release');
  if (rec) args.push('--verification-record', rec);
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const failures = out.split('\n').filter(l => /^\s+- /.test(l)).map(l => l.trim().slice(2));
  const warnings = out.split('\n').filter(l => l.startsWith('WARN — ')).map(l => l.slice(7));
  const exitCode = r.status === 0 ? 0 : 1;
  const evidence = {
    validator: 'validate-content', validatorVersion: VALIDATOR_VERSION, mode,
    pack: path.basename(pack), packSha256: sha(pack), indexSha256: sha(index), verificationRecordSha256: rec && fs.existsSync(rec) ? sha(rec) : null,
    frameworkValidatorSha256: fs.existsSync(framework) ? sha(framework) : null,
    result: exitCode === 0 ? 'PASS' : 'FAIL', exitCode, failures, warnings, at: new Date().toISOString()
  };
  const dir = arg('--evidence-dir') || path.join(__dirname, '..', 'evidence', 'validation');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `validation-${mode}-${evidence.packSha256.slice(0, 12)}-${evidence.result}.json`);
  fs.writeFileSync(file, JSON.stringify(evidence, null, 2));
  console.log(`${evidence.result} [${mode}] ${evidence.pack} sha256:${evidence.packSha256.slice(0, 12)} — evidence: ${file}`);
  failures.forEach(f => console.error('  - ' + f));
  return exitCode;
}
let code = 2;
try { code = run(); } catch (e) { console.error('internal error: ' + e.message); code = 2; }
process.exit(code);
