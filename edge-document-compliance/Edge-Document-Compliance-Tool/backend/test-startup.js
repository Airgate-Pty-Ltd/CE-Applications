#!/usr/bin/env node
/**
 * Minimal startup test - verifies Node.js can execute the entry point
 */

console.log('[TEST] Startup test script executing...');
process.stdout.write('[TEST] stdout test\n');
process.stderr.write('[TEST] stderr test\n');

// Test if we can import the main file
console.log('[TEST] Attempting to import index.js...');
try {
  await import('./index.js');
  console.log('[TEST] ✅ index.js imported successfully');
} catch (err) {
  console.error('[TEST] ❌ Failed to import index.js:');
  console.error('[TEST] Error:', err.message);
  console.error('[TEST] Stack:', err.stack);
  process.exit(1);
}

