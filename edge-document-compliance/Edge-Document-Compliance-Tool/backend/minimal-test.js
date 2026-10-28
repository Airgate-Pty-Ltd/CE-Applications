#!/usr/bin/env node
/**
 * Minimal test - just log and exit
 * This verifies Node.js can execute a file in the backend directory
 */

console.log('[MINIMAL] Test script started');
process.stdout.write('[MINIMAL] stdout test\n');
process.stderr.write('[MINIMAL] stderr test\n');

// Try to write to both streams
console.log('[MINIMAL] All streams working');
console.error('[MINIMAL] stderr working');

// Exit successfully
process.exit(0);

