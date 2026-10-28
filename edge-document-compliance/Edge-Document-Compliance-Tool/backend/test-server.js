#!/usr/bin/env node
/**
 * Simple test to verify server.js can be executed
 * This will help diagnose if the issue is with the file path or execution
 */

console.log('TEST: test-server.js executed');
console.log('Working directory:', process.cwd());
console.log('Node version:', process.version);
console.log('Attempting to import server.js...');

try {
  const serverPath = './src/server.js';
  console.log('Server path:', serverPath);
  import(serverPath)
    .then(() => {
      console.log('✅ Server module imported successfully');
      // Don't exit - let server start
    })
    .catch((err) => {
      console.error('❌ Failed to import server:', err.message);
      console.error('Stack:', err.stack);
      process.exit(1);
    });
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}

