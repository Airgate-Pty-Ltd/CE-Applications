#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getDbIntrospectionReport } from '../backend/src/services/dbIntrospectService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runMigrateDryRun() {
  const migrateScript = path.join(__dirname, '..', 'backend', 'scripts', 'migrate.js');
  const result = spawnSync(
    process.execPath,
    [migrateScript, '--dry-run'],
    {
      env: { ...process.env, MIGRATE_DRYRUN: '1', MIGRATE_CONTINUE_ON_ERROR: '1' },
      encoding: 'utf8'
    }
  );
  return {
    status: result.status ?? 0,
    stdout: result.stdout?.trim() || '',
    stderr: result.stderr?.trim() || ''
  };
}

async function main() {
  const summary = {
    ok: true,
    introspection: null,
    migrate: null
  };

  try {
    summary.introspection = await getDbIntrospectionReport();
  } catch (error) {
    summary.ok = false;
    summary.introspectionError = error.message;
  }

  const migrateResult = runMigrateDryRun();
  summary.migrate = migrateResult;
  if (migrateResult.status !== 0) {
    summary.ok = false;
  }

  console.log(JSON.stringify(summary));
  process.exit(0);
}

main().catch((error) => {
  console.error('[diagnose:db] Unexpected failure', error);
  console.log(JSON.stringify({ ok: false, error: error.message }));
  process.exit(0);
});
