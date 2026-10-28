#!/usr/bin/env node
/**
 * Railway Start Script - SIMPLIFIED
 * Directly starts the server without wrapper complexity
 */

console.log('========================================');
console.log('EDCAT Administrator - Starting Server');
console.log('========================================');
console.log('Working directory:', process.cwd());
console.log('Node version:', process.version);
console.log('PORT:', process.env.PORT || 'not set');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'not set');
console.log('========================================\n');

// Change to backend directory
process.chdir('./backend');
console.log('Changed to:', process.cwd(), '\n');

// Import and start server - use dynamic import to handle top-level await
console.log('Importing server...\n');
import('./src/server.js')
  .then(() => {
    console.log('✅ Server module loaded successfully');
  })
  .catch((err) => {
    console.error('❌ Failed to import server:');
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    process.exit(1);
  });
