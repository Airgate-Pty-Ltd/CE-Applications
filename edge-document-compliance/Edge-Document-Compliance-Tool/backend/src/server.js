/**
 * Server Entry Point - SIMPLIFIED FOR RAILWAY
 * Starts the Express application
 */

// IMMEDIATE OUTPUT - NO BUFFERING
process.stdout.write('========================================\n');
process.stdout.write('🚀 SERVER STARTING - THIS MUST APPEAR\n');
process.stdout.write('========================================\n');
process.stdout.write(`Working directory: ${process.cwd()}\n`);
process.stdout.write(`Node version: ${process.version}\n`);
process.stdout.write(`PORT: ${process.env.PORT || 'NOT SET'}\n`);
process.stdout.write(`DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}\n`);
process.stdout.write('========================================\n\n');

// Force output immediately
process.stdout.write('FORCING STDOUT OUTPUT\n');
process.stderr.write('FORCING STDERR OUTPUT\n');
process.stdout.write('About to import app.js...\n');

// Import app with timeout protection
process.stdout.write('Loading app module...\n');
const IMPORT_TIMEOUT = 30000; // 30 seconds max for app import

process.stdout.write('Creating import promise...\n');
const importPromise = import('./app.js').catch(err => {
  process.stderr.write(`Import error: ${err.message}\n`);
  if (err.stack) {
    process.stderr.write(`Stack: ${err.stack}\n`);
  }
  throw err;
});

process.stdout.write('Creating timeout promise...\n');
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error(`App import timeout after ${IMPORT_TIMEOUT}ms`)), IMPORT_TIMEOUT)
);

process.stdout.write('Racing promises...\n');

Promise.race([importPromise, timeoutPromise])
  .then((appModule) => {
    process.stdout.write('✅ App module imported\n');
    const app = appModule.default;
    if (!app) {
      throw new Error('App module did not export default');
    }
    process.stdout.write('✅ App loaded successfully\n');
    
    const port = Number(process.env.PORT || 8080);
    const host = '0.0.0.0';
    
    console.log(`[boot] Starting server on ${host}:${port}...`);
    console.log(`[boot] Healthcheck will be available at http://${host}:${port}/health`);
    
    const server = app.listen(port, host, () => {
      console.log(`[boot] ✅ Server listening on http://${host}:${port}`);
      console.log(`[boot] ✅ Healthcheck available at http://${host}:${port}/health`);
      if (process.env.PORT && Number(process.env.PORT) !== 8080) {
        console.log(`[boot] Railway set PORT=${process.env.PORT}; respecting platform port`);
      }
      // Force flush output
      process.stdout.write('');
      process.stderr.write('');
    });
    
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
      }
      process.exit(1);
    });
    
    // Log successful startup completion
    console.log('[boot] Server startup complete - ready to accept connections');
    
    // Keep process alive
    process.on('SIGTERM', () => {
      console.log('[boot] SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('[boot] Server closed');
        process.exit(0);
      });
    });
  })
  .catch((err) => {
    console.error('❌ Failed to load app:');
    console.error('Error:', err);
    console.error('Message:', err.message);
    if (err.stack) {
      console.error('Stack:', err.stack);
    }
    console.error('[boot] Server will exit - Railway will retry deployment');
    process.exit(1);
  });

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});
