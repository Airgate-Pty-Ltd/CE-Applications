#!/usr/bin/env node
/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

/**
 * WP-5.2: real, file-level SQLite restore — no Docker dependency.
 *
 * Restores a backup produced by backup-db.js over the live database file. Verifies the
 * backup's SHA-256 against its recorded manifest hash before restoring (refuses a corrupted
 * or hand-edited backup file), and takes a pre-restore safety copy of whatever is currently
 * live so a bad restore is itself reversible.
 *
 * Usage:
 *   node scripts/restore-db.js --db <path> --backup <path> --sha256 <hex>
 *   node scripts/restore-db.js --db <path> --from-manifest <path-to-latest.json>
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256File, resolveDbPath } from './backup-db.js';

export function parseArgs(argv) {
  const args = { db: null, backup: null, sha256: null, fromManifest: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--db') args.db = argv[++i];
    if (argv[i] === '--backup') args.backup = argv[++i];
    if (argv[i] === '--sha256') args.sha256 = argv[++i];
    if (argv[i] === '--from-manifest') args.fromManifest = argv[++i];
  }
  return args;
}

export function restore({ dbPath, backupPath, expectedSha256, preRestoreDir }) {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  const actualSha256 = sha256File(backupPath);
  if (expectedSha256 && actualSha256 !== expectedSha256) {
    throw new Error(`Backup integrity check FAILED: expected sha256 ${expectedSha256}, got ${actualSha256}. Refusing to restore a file that doesn't match its manifest.`);
  }

  let preRestoreBackupPath = null;
  if (fs.existsSync(dbPath)) {
    const dir = preRestoreDir || path.dirname(backupPath);
    fs.mkdirSync(dir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    preRestoreBackupPath = path.join(dir, `pre-restore-${timestamp}.db`);
    fs.copyFileSync(dbPath, preRestoreBackupPath);
  }

  fs.copyFileSync(backupPath, dbPath);

  return {
    restoredFrom: backupPath,
    restoredTo: dbPath,
    verifiedSha256: actualSha256,
    preRestoreBackupPath,
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  const dbPath = resolveDbPath(args.db);

  let backupPath = args.backup;
  let expectedSha256 = args.sha256;

  if (args.fromManifest) {
    const manifest = JSON.parse(fs.readFileSync(path.resolve(args.fromManifest), 'utf8'));
    backupPath = path.join(path.dirname(path.resolve(args.fromManifest)), manifest.file);
    expectedSha256 = manifest.sha256;
  }

  if (!backupPath) {
    console.error('Usage: node scripts/restore-db.js --db <path> --backup <path> --sha256 <hex>');
    console.error('   or: node scripts/restore-db.js --db <path> --from-manifest <path-to-latest.json>');
    process.exit(1);
  }

  const result = restore({ dbPath, backupPath: path.resolve(backupPath), expectedSha256 });
  console.log(`Restore complete: ${result.restoredTo} <- ${result.restoredFrom}`);
  console.log(`Verified sha256: ${result.verifiedSha256}`);
  if (result.preRestoreBackupPath) {
    console.log(`Pre-restore safety copy: ${result.preRestoreBackupPath}`);
  }
}
