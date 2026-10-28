#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.join(__dirname, '..', 'backend');

function runNodeScript(relativePath, args = [], options = {}) {
  const scriptPath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(__dirname, relativePath);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit',
    env: process.env,
    ...options
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('[prestart] ⚡⚡⚡ NEW CODE v1.0.1+ (commit a79a489) - prestart.mjs ⚡⚡⚡');
console.log('[prestart] Running syntax check...');
runNodeScript('check-syntax.mjs');

function isManagedEnvironment() {
  // Railway detection: check multiple indicators
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_NAME ||
    process.env.RAILWAY_DEPLOYMENT_ID ||
    process.env.VERCEL ||
    process.env.RENDER ||
    // If PORT is set to Railway's default (8080) and NODE_ENV is production, assume Railway
    (process.env.PORT === '8080' && process.env.NODE_ENV === 'production')
  );
}

const diagnoseRequested = process.env.MIGRATION_DIAGNOSE === '1';
const managedEnv = isManagedEnvironment();
// CRITICAL: Only allow diagnostics if explicitly permitted OR in local dev
// Default to blocking in production/managed environments
const diagnoseAllowed =
  process.env.ALLOW_DIAGNOSE === '1' ||
  (!managedEnv &&
    (process.env.NODE_ENV || '').toLowerCase() !== 'production' &&
    !process.env.PORT); // No PORT means likely local dev
const shouldDiagnose = diagnoseRequested && diagnoseAllowed;
const skipMigrations = process.env.SKIP_MIGRATIONS === '1';

if (diagnoseRequested && !shouldDiagnose) {
  console.log(
    '[prestart] MIGRATION_DIAGNOSE=1 detected but ALLOW_DIAGNOSE is not enabled in this environment; skipping diagnostics.'
  );
}

if (shouldDiagnose) {
  console.log('[prestart] MIGRATION_DIAGNOSE=1 -> running diagnose:db (introspect + dry-run migrations)...');
  runNodeScript('diagnose-db.mjs');
  console.log('[prestart] MIGRATION_DIAGNOSE completed. Continuing with normal startup flow.');
}

if (skipMigrations) {
  console.log('[prestart] SKIP_MIGRATIONS=1 -> skipping migration execution.');
} else {
  console.log('[prestart] Running database migrations...');
  runNodeScript(path.join(backendDir, 'scripts', 'migrate.js'));
  console.log('[prestart] ✅ Migrations completed successfully.');
}
