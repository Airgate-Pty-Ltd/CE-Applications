#!/usr/bin/env node
/**
 * Builds a content pack (manifest + pack) from a library source file.
 *   node build-contentpack.js <packs/x.library.json> [--release] [--out dist]
 * - Validation errors  → exit 1, nothing written.
 * - --release          → also requires completeness (edition verified, hierarchy verified, every leaf classified, every auditable
 *                        leaf has an approved, source-verified obligation); otherwise exit 1, nothing written.
 * - Default (development) writes a pack whose manifest says NOT-RELEASABLE when incomplete.
 * Signing is not implemented: manifests carry signature.state UNSIGNED-DEVELOPMENT.
 */
'use strict';
const fs = require('fs'), path = require('path');
const R = require('../src/library.js');
const argv = process.argv.slice(2);
const src = argv[0]; const release = argv.includes('--release');
const oi = argv.indexOf('--out'); const outDir = oi >= 0 ? argv[oi + 1] : path.join(__dirname, '..', 'dist');
if (!src) { console.error('usage: build-contentpack.js <library.json> [--release] [--out dir]'); process.exit(2); }
let pack; try { pack = JSON.parse(fs.readFileSync(src, 'utf8')); } catch (e) { console.error('cannot read pack: ' + e.message); process.exit(2); }
const v = R.validatePack(pack);
if (v.errors.length) { console.error('FAIL — pack validation\n' + v.errors.map(e => '  - ' + e).join('\n')); process.exit(1); }
const comp = R.completeness(pack);
if (release && !comp.complete) { console.error('FAIL — release refused: pack is not complete\n' + comp.reasons.map(e => '  - ' + e).join('\n')); process.exit(1); }
const manifest = R.buildManifest(pack);
fs.mkdirSync(outDir, { recursive: true });
const base = path.join(outDir, pack.packId + '@' + pack.contentVersion + '.contentpack');
fs.writeFileSync(base + '.json', JSON.stringify({ manifest, pack }, null, 2));
fs.writeFileSync(base + '.js', '/* generated content pack (' + manifest.release.status + ') */\n(function(g){g.RIL_PACKS=g.RIL_PACKS||{};g.RIL_PACKS[' + JSON.stringify(pack.packId) + ']=' + JSON.stringify({ manifest, pack }) + ';})(typeof self!=="undefined"?self:this);\n');
console.log(`built ${pack.packId}@${pack.contentVersion} — ${manifest.release.status} — packHash ${manifest.packHash.slice(0, 12)} — ${manifest.obligationCount} obligations`);
if (!comp.complete) console.log('not complete:\n' + comp.reasons.map(e => '  - ' + e).join('\n'));
