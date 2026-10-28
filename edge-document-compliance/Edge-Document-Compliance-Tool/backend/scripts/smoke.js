#!/usr/bin/env node
/**
 * Minimal smoke test to verify server health.
 * Can start the backend automatically (default) or test an already running server.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.SMOKE_BASE_URL || `http://localhost:${PORT}`;
const SHOULD_START = process.env.SMOKE_START_SERVER !== 'false';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverEntry = path.join(__dirname, '..', 'index.js');

let child;

async function checkHealthOnce() {
  const res = await fetch(`${BASE_URL}/health`, { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`/health returned ${res.status}`);
  }
  return res.text();
}

async function waitForHealth(retries = 20, delayMs = 500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const body = await checkHealthOnce();
      console.log(`[smoke] Healthcheck OK on attempt ${attempt}`);
      return body;
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function run() {
  if (SHOULD_START) {
    console.log('[smoke] Starting backend server for smoke test...');
    child = spawn('node', [serverEntry], {
      env: { ...process.env, PORT },
      stdio: 'inherit',
    });
  }

  const body = await waitForHealth();
  console.log('[smoke] ✅ Healthcheck response:', body);
}

async function shutdown() {
  if (child) {
    child.kill('SIGINT');
  }
}

process.on('exit', shutdown);
process.on('SIGINT', () => {
  shutdown();
  process.exit(1);
});

run().catch((err) => {
  console.error('[smoke] ❌ Smoke test failed:', err.message);
  shutdown();
  process.exit(1);
});


