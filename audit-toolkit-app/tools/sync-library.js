#!/usr/bin/env node
/**
 * Consumes an APPROVED content-pack build from the Requirement Intelligence Library.
 * Copies the library's reference implementation and one built content pack into vendor/ril/ and records sha256 of each
 * in VENDORED.json. The pack is verified against its own manifest first; a failing pack is never vendored.
 * The Toolkit never edits these files; changing content means changing the library and re-syncing a new version.
 */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const lib = path.join(__dirname, '..', '..', '2026-10-11-requirement-intelligence-library');
const dest = path.join(__dirname, '..', 'vendor', 'ril');
const packFile = process.argv[2] || 'as9100d-demo@0.3.0.contentpack';
const R = require(path.join(lib, 'src', 'library.js'));
const built = JSON.parse(fs.readFileSync(path.join(lib, 'dist', packFile + '.json'), 'utf8'));
const v = R.verifyPack(built.pack, built.manifest);
if (!v.ok) { console.error('REFUSED: content pack failed verification: ' + v.reasons.join('; ')); process.exit(1); }
fs.mkdirSync(dest, { recursive: true });
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const files = [['src/library.js', 'library.js'], ['consumers/consumer-views.js', 'consumer-views.js'], ['dist/' + packFile + '.json', packFile + '.json'], ['dist/' + packFile + '.js', packFile + '.js']];
const rec = { source: '2026-10-11-requirement-intelligence-library', packId: built.manifest.packId, contentVersion: built.manifest.contentVersion, packHash: built.manifest.packHash, release: built.manifest.release.status, files: {} };
files.forEach(([from, to]) => { fs.copyFileSync(path.join(lib, from), path.join(dest, to)); rec.files[to] = { from, sha256: sha(path.join(dest, to)) }; });
fs.writeFileSync(path.join(dest, 'VENDORED.json'), JSON.stringify(rec, null, 2));
console.log('vendored ' + rec.packId + '@' + rec.contentVersion + ' (' + rec.release + ') into vendor/ril');
