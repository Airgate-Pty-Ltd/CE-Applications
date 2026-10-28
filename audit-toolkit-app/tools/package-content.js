#!/usr/bin/env node
/**
 * Content packaging. There is no code path that packages content without validation.
 *
 *   node package-content.js <pack.json> --index <index.json> --verification-record <rec.json> --out <dir>             (production: release-mode gate)
 *   node package-content.js <pack.json> --index <index.json> --out <dir> --dev                                       (development package, labelled NOT FOR RELEASE)
 *
 * Production packaging always runs `validate-content --mode release`; a failure writes nothing and exits non-zero.
 */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawnSync } = require('child_process');
const argv = process.argv.slice(2);
const arg = n => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
const dev = argv.includes('--dev');
const pack = argv[0], index = arg('--index'), out = arg('--out'), rec = arg('--verification-record');
if (!pack || !index || !out) { console.error('usage: package-content.js <pack.json> --index <index.json> --out <dir> [--verification-record <rec.json>] [--dev]'); process.exit(2); }
const evDir = path.join(out, '.validation-evidence-tmp');
const args = [path.join(__dirname, 'validate-content.js'), pack, '--index', index, '--mode', dev ? 'dev' : 'release', '--evidence-dir', evDir];
if (rec) args.push('--verification-record', rec);
const v = spawnSync(process.execPath, args, { encoding: 'utf8' });
process.stdout.write(v.stdout || ''); process.stderr.write(v.stderr || '');
if (v.status !== 0) { console.error('PACKAGING REFUSED: content did not pass ' + (dev ? 'development' : 'release') + ' validation.'); fs.rmSync(evDir, { recursive: true, force: true }); process.exit(v.status || 1); }
const files = fs.readdirSync(evDir);
fs.mkdirSync(out, { recursive: true });
const evidenceFile = files[0];
fs.copyFileSync(path.join(evDir, evidenceFile), path.join(out, evidenceFile));
fs.rmSync(evDir, { recursive: true, force: true });
fs.copyFileSync(pack, path.join(out, path.basename(pack)));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const manifest = { kind: dev ? 'DEVELOPMENT-PACKAGE — NOT FOR RELEASE' : 'RELEASE-PACKAGE', pack: path.basename(pack), packSha256: sha(pack), validationEvidence: evidenceFile, validationEvidenceSha256: sha(path.join(out, evidenceFile)) };
fs.writeFileSync(path.join(out, 'package-manifest.json'), JSON.stringify(manifest, null, 2));
console.log('packaged: ' + manifest.kind + ' → ' + out);
