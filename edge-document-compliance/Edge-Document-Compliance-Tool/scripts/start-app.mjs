#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.join(__dirname, '..', 'backend');

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

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
    ...options
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result;
}

async function startDiagnoseServer() {
  const app = express();
  const port = Number(process.env.PORT || 8080);

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      mode: 'diagnose',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/__db/introspect', async (_req, res) => {
    if (process.env.ENABLE_DB_INTROSPECTION !== '1') {
      return res.status(403).json({ error: 'INTROSPECTION_DISABLED' });
    }
    try {
      const { getDbIntrospectionReport } = await import('../backend/src/services/dbIntrospectService.js');
      const report = await getDbIntrospectionReport();
      res.json({ ok: true, report });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.listen(port, () => {
    console.log(`[start] Diagnose server listening on port ${port} (MIGRATION_DIAGNOSE=1)`);
  });
}

async function main() {
  // CRITICAL: This log MUST appear to confirm new code is running
  // If you don't see this line, Railway is running OLD CODE from cache
  console.log('[start] ⚡⚡⚡ NEW CODE v1.0.1+ (commit a79a489) - If you see this, new code is running! ⚡⚡⚡');
  
  const diagnoseOnlyRequested = process.env.START_MODE === 'diagnose';
  const diagnoseRequested = process.env.MIGRATION_DIAGNOSE === '1';
  const managedEnv = isManagedEnvironment();
  // CRITICAL: Only allow diagnostics if explicitly permitted OR in local dev
  // Default to blocking in production/managed environments
  const diagnoseAllowed =
    process.env.ALLOW_DIAGNOSE === '1' ||
    (!managedEnv &&
      (process.env.NODE_ENV || '').toLowerCase() !== 'production' &&
      !process.env.PORT); // No PORT means likely local dev
  // Gate START_MODE=diagnose behind ALLOW_DIAGNOSE as well
  const diagnoseOnly = diagnoseOnlyRequested && diagnoseAllowed;
  const runDiagnose = (diagnoseRequested && diagnoseAllowed) || diagnoseOnly;

  console.log('[start] env flags', {
    MIGRATION_DIAGNOSE: process.env.MIGRATION_DIAGNOSE || '(unset)',
    ALLOW_DIAGNOSE: process.env.ALLOW_DIAGNOSE || '(unset)',
    START_MODE: process.env.START_MODE || '(unset)',
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || '(unset)',
    RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID || '(unset)',
    NODE_ENV: process.env.NODE_ENV || '(unset)',
    PORT: process.env.PORT || '(unset)',
    managedEnv,
    diagnoseRequested,
    diagnoseOnlyRequested,
    diagnoseAllowed,
    willDiagnose: runDiagnose
  });

  if (diagnoseRequested && !diagnoseAllowed && !diagnoseOnly) {
    console.log(
      '[start] MIGRATION_DIAGNOSE=1 detected but diagnostics are disabled in this environment (set ALLOW_DIAGNOSE=1 to override).'
    );
  }

  if (diagnoseOnlyRequested && !diagnoseAllowed) {
    console.log(
      '[start] START_MODE=diagnose detected but diagnostics are disabled in this environment (set ALLOW_DIAGNOSE=1 to override).'
    );
  }

  if (runDiagnose) {
    console.log('[start] Running database diagnostics before launch...');
    try {
      runCommand('npm', ['run', 'diagnose:db']);
    } catch (error) {
      console.warn('[start] diagnose:db reported issues but continuing.');
    }
  }

  if (diagnoseOnly) {
    console.log('[start] START_MODE=diagnose -> serving diagnostics only');
    await startDiagnoseServer();
    return;
  }

  console.log('[start] Launching backend server...');
  runCommand(process.execPath, ['index.js'], { cwd: backendDir });
}

main().catch((error) => {
  console.error('[start] Unhandled error', error);
  process.exit(1);
});
