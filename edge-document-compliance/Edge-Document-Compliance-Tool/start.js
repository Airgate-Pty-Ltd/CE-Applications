#!/usr/bin/env node
/**
 * Wrapper script to ensure we see logs
 * This runs BEFORE any imports to catch startup issues
 */

// Write to both stdout and stderr immediately
process.stdout.write('=== START WRAPPER ===\n');
process.stderr.write('=== START WRAPPER (stderr) ===\n');
console.log('[WRAPPER] Starting application...');
console.error('[WRAPPER] Starting application (stderr)...');

// Set error handlers BEFORE importing anything
process.on('uncaughtException', (err) => {
  console.error('[WRAPPER] FATAL Exception:', err.message);
  console.error('[WRAPPER] Stack:', err.stack);
  process.stderr.write(`[WRAPPER] FATAL: ${err.message}\n`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[WRAPPER] FATAL Rejection:', reason);
  process.stderr.write(`[WRAPPER] FATAL Rejection: ${reason}\n`);
  process.exit(1);
});

// Now try to import and run the actual app
console.log('[WRAPPER] Importing backend/index.js...');

import('./backend/index.js')
  .then(() => {
    console.log('[WRAPPER] ✅ Application module loaded');
  })
  .catch((err) => {
    console.error('[WRAPPER] ❌ Failed to import application:');
    console.error('[WRAPPER] Error:', err.message);
    console.error('[WRAPPER] Stack:', err.stack);
    process.exit(1);
  });
