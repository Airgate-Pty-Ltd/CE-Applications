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
 * WP-5.2: real, file-level SQLite backup — no Docker dependency.
 *
 * Copies the live database file to docker/backups/backup-<timestamp>.db, computes a real
 * SHA-256 of the copy, and writes/updates docker/backups/latest.json (read by the health
 * screen to report "Backup Overdue"). Deliberately plain Node + fs/crypto only — no new
 * npm dependency for something this small.
 *
 * Usage: node scripts/backup-db.js [--db <path>] [--out <dir>]
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function parseArgs(argv) {
  const args = { db: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--db') args.db = argv[++i];
    if (argv[i] === '--out') args.out = argv[++i];
  }
  return args;
}

export function resolveDbPath(explicitPath) {
  if (explicitPath) return path.resolve(explicitPath);
  // Mirrors the DATABASE_URL resolution documented in DECISIONS.md D-008/D-030:
  // "file:./dev.db" resolves relative to prisma/schema.prisma's directory.
  return path.resolve(__dirname, '..', 'prisma', 'dev.db');
}

export function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function backup({ dbPath, outDir }) {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found: ${dbPath}`);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup-${timestamp}.db`;
  const backupFilePath = path.join(outDir, backupFileName);

  fs.copyFileSync(dbPath, backupFilePath);

  const sha256 = sha256File(backupFilePath);
  const sizeBytes = fs.statSync(backupFilePath).size;

  const manifest = {
    timestamp: new Date().toISOString(),
    file: backupFileName,
    sourceDb: dbPath,
    sha256,
    sizeBytes,
  };
  fs.writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify(manifest, null, 2));

  return manifest;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  const dbPath = resolveDbPath(args.db);
  const outDir = args.out ? path.resolve(args.out) : path.resolve(__dirname, '..', 'docker', 'backups');
  const manifest = backup({ dbPath, outDir });
  console.log(`Backup complete: ${path.join(outDir, manifest.file)}`);
  console.log(`sha256: ${manifest.sha256}`);
  console.log(`size: ${manifest.sizeBytes} bytes`);
}
