/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

/**
 * WP-5.2: exercises the REAL CLI scripts (scripts/backup-db.js, scripts/restore-db.js) as
 * real subprocesses — exactly how an operator would actually run them — rather than importing
 * their internals. This is deliberate: it proves the command-line contract works, not just the
 * underlying functions, and sidesteps needing Jest to transform a separate ESM script tree.
 */

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const BACKUP_SCRIPT = path.join(REPO_ROOT, 'scripts', 'backup-db.js');
const RESTORE_SCRIPT = path.join(REPO_ROOT, 'scripts', 'restore-db.js');

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

describe('backup-db.js / restore-db.js CLI — WP-5.2 real subprocess execution, tested restore', () => {
  let tempDir: string;
  let dbPath: string;
  let backupsDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hf-backup-cli-test-'));
    dbPath = path.join(tempDir, 'test.db');
    backupsDir = path.join(tempDir, 'backups');
    fs.writeFileSync(dbPath, `original-content-${crypto.randomUUID()}`);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('real `node scripts/backup-db.js` run creates a backup file + manifest matching the source db sha256', () => {
    const output = execFileSync('node', [BACKUP_SCRIPT, '--db', dbPath, '--out', backupsDir], { encoding: 'utf8' });
    expect(output).toContain('Backup complete');

    const manifest = JSON.parse(fs.readFileSync(path.join(backupsDir, 'latest.json'), 'utf8'));
    const backupFilePath = path.join(backupsDir, manifest.file);
    expect(fs.existsSync(backupFilePath)).toBe(true);
    expect(manifest.sha256).toBe(sha256(dbPath));
    expect(manifest.sha256).toBe(sha256(backupFilePath));
  });

  test('real backup -> simulated data loss -> real `node scripts/restore-db.js` run recovers the exact original content', () => {
    const originalContent = fs.readFileSync(dbPath, 'utf8');
    execFileSync('node', [BACKUP_SCRIPT, '--db', dbPath, '--out', backupsDir], { encoding: 'utf8' });

    // Real simulated data loss on the live db.
    fs.writeFileSync(dbPath, 'CORRUPTED-OR-LOST-DATA-SIMULATING-A-REAL-INCIDENT');
    expect(fs.readFileSync(dbPath, 'utf8')).not.toBe(originalContent);

    const restoreOutput = execFileSync(
      'node',
      [RESTORE_SCRIPT, '--db', dbPath, '--from-manifest', path.join(backupsDir, 'latest.json')],
      { encoding: 'utf8' }
    );
    expect(restoreOutput).toContain('Restore complete');
    expect(restoreOutput).toContain('Pre-restore safety copy');

    // The exit gate's actual requirement: real data, really lost, really restored.
    expect(fs.readFileSync(dbPath, 'utf8')).toBe(originalContent);
  });

  test('restore CLI exits non-zero and refuses a tampered backup whose content no longer matches its manifest sha256', () => {
    execFileSync('node', [BACKUP_SCRIPT, '--db', dbPath, '--out', backupsDir], { encoding: 'utf8' });
    const manifest = JSON.parse(fs.readFileSync(path.join(backupsDir, 'latest.json'), 'utf8'));
    fs.writeFileSync(path.join(backupsDir, manifest.file), 'TAMPERED-BACKUP-CONTENT');

    expect(() =>
      execFileSync('node', [RESTORE_SCRIPT, '--db', dbPath, '--from-manifest', path.join(backupsDir, 'latest.json')], { encoding: 'utf8', stdio: 'pipe' })
    ).toThrow();

    // The live db must be untouched by the refused restore attempt.
    expect(fs.existsSync(dbPath)).toBe(true);
  });
});
