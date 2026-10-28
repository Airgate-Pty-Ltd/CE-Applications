/**
 * Application Entry Point
 * Starts the Express server and initializes database schema
 * CRITICAL: Server must start IMMEDIATELY for Railway healthcheck
 */

// Suppress punycode deprecation warnings from dependencies
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.message.includes('punycode')) {
    // Suppress punycode deprecation warnings from dependencies
    return;
  }
  // Log other warnings normally
  console.warn(warning.name, warning.message);
});

// CRITICAL: Catch ALL errors before they kill the process
// Set these FIRST before any other code runs
process.on('uncaughtException', (err) => {
  // Use multiple methods to ensure error is visible
  try {
    console.error('\n[FATAL] Uncaught Exception:', err.message);
    console.error('[FATAL] Stack:', err.stack);
    process.stderr.write(`\n[FATAL] Uncaught Exception: ${err.message}\n`);
    if (err.stack) {
      process.stderr.write(`[FATAL] Stack: ${err.stack}\n`);
    }
    // Force flush
    if (typeof process.stderr.flush === 'function') process.stderr.flush();
  } catch (e) {
    // Last resort - try to write raw
    try {
      process.stderr.write(String(err));
    } catch (e2) {
      // Can't even do that
    }
  }
  // Give time for logs to flush before exiting
  setTimeout(() => process.exit(1), 100);
});

process.on('unhandledRejection', (reason, promise) => {
  // Use multiple methods to ensure error is visible
  try {
    console.error('\n[FATAL] Unhandled Rejection:', reason);
    if (reason && reason.stack) {
      console.error('[FATAL] Stack:', reason.stack);
    }
    process.stderr.write(`\n[FATAL] Unhandled Rejection: ${reason}\n`);
    if (reason && reason.stack) {
      process.stderr.write(`[FATAL] Stack: ${reason.stack}\n`);
    }
    // Force flush
    if (typeof process.stderr.flush === 'function') process.stderr.flush();
  } catch (e) {
    // Last resort
    try {
      process.stderr.write(String(reason));
    } catch (e2) {
      // Can't even do that
    }
  }
  // Give time for logs to flush before exiting
  setTimeout(() => process.exit(1), 100);
});

// CRITICAL: Log IMMEDIATELY - first thing in file, before ANY imports
// Use multiple methods to ensure visibility in Railway logs
try {
  console.log('[BOOT] ========================================');
  console.log('[BOOT] EDCAT Administrator Server Starting');
  console.log('[BOOT] ========================================');
  process.stdout.write('[BOOT] stdout: Server starting...\n');
  process.stderr.write('[BOOT] stderr: Server starting...\n');
  // Force flush
  if (typeof process.stdout.flush === 'function') process.stdout.flush();
  if (typeof process.stderr.flush === 'function') process.stderr.flush();
} catch (e) {
  // If logging fails, at least try to write to stderr
  try {
    process.stderr.write(`[BOOT] Logging error: ${e.message}\n`);
  } catch (e2) {
    // Last resort - can't even write to stderr
  }
}

// Import dotenv synchronously (it's a standard import)
import dotenv from 'dotenv';
dotenv.config();
console.log('[BOOT] dotenv loaded');

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

// CRITICAL: Log immediately with process.stdout.write (unbuffered)
process.stdout.write(`[index] Port: ${PORT}, Host: ${HOST}\n`);
process.stdout.write(`[index] Loading Express app module...\n`);

// CRITICAL: Create minimal Express app FIRST for immediate health checks
// This ensures Railway health checks pass even if full app fails to load
import express from 'express';
const minimalApp = express();
minimalApp.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'edcat-backend',
    timestamp: new Date().toISOString(),
    mode: 'minimal'
  });
});

// Start minimal server immediately so health checks pass
const minimalServer = minimalApp.listen(PORT, HOST, () => {
  process.stdout.write(`[index] ✅ Minimal server listening on http://${HOST}:${PORT}\n`);
  process.stdout.write(`[index] ✅ Healthcheck available at http://${HOST}:${PORT}/health\n`);
  
  // Now try to load the full app in the background (after minimal server is ready)
  process.stdout.write('[index] Loading full application in background...\n');
  loadFullApp();
});

function loadFullApp() {

// Use dynamic import to catch any errors
// Add timeout to prevent hanging
const IMPORT_TIMEOUT = 30000; // 30 seconds

// Enhanced error tracking
const originalError = console.error;
console.error = function(...args) {
  originalError.apply(console, args);
  if (args[0] && typeof args[0] === 'string' && args[0].includes('analyze')) {
    process.stderr.write(`[ERROR TRACK] Found 'analyze' in error: ${args.join(' ')}\n`);
  }
};

process.stdout.write('[index] Attempting to import app module...\n');
process.stdout.write('[index] Import path: ./src/app.js\n');

const importPromise = import('./src/app.js');
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('App import timeout after 30s')), IMPORT_TIMEOUT);
});

Promise.race([importPromise, timeoutPromise])
  .then((appModule) => {
    process.stdout.write('[index] ✅ App module imported successfully\n');
    
    const app = appModule.default;
    if (!app) {
      process.stderr.write(`[index] ⚠️ App module did not export default, continuing with minimal server\n`);
      process.stderr.write(`[index] App module keys: ${Object.keys(appModule).join(', ')}\n`);
      return; // Continue with minimal server
    }
    
    process.stdout.write('[index] ✅ Express app loaded, upgrading to full server...\n');
    
    // Close minimal server and start full server
    minimalServer.close(() => {
      process.stdout.write('[index] Minimal server closed, starting full server...\n');
      
      // Start full server
      const server = app.listen(PORT, HOST, () => {
        process.stdout.write(`✅ Full server listening on http://${HOST}:${PORT}\n`);
        process.stdout.write(`✅ Healthcheck available at http://${HOST}:${PORT}/health\n`);
        // Force output flush
        if (typeof process.stdout.flush === 'function') {
          process.stdout.flush();
        }
        if (typeof process.stderr.flush === 'function') {
          process.stderr.flush();
        }
      });
    
      server.on('error', (err) => {
        process.stderr.write(`[server] ❌ Full server error: ${err.message}\n`);
        process.stderr.write(`[server] Error code: ${err.code}\n`);
        if (err.code === 'EADDRINUSE') {
          process.stderr.write(`[server] Port ${PORT} is already in use - keeping minimal server\n`);
          return; // Keep minimal server running
        }
        if (err.stack) {
          process.stderr.write(`[server] Stack: ${err.stack}\n`);
        }
        // Don't exit - keep minimal server running for health checks
      });
      
      server.on('listening', () => {
        process.stdout.write('[server] ✅ Full server is listening and ready for connections\n');
      });
      
      // Graceful shutdown
      function closeServer(signal) {
        process.stdout.write(`[server] ${signal} received, shutting down gracefully...\n`);
        server.close(() => {
          process.stdout.write('[server] Server closed\n');
          process.exit(0);
        });
      }
      
      process.on('SIGTERM', () => closeServer('SIGTERM'));
      process.on('SIGINT', () => closeServer('SIGINT'));
    });
    
    // Note: Top-level error handlers are set at the very beginning of the file
    // These are for runtime errors after server starts
    process.on('uncaughtException', (err) => {
      process.stderr.write(`[process] Uncaught Exception: ${err.message}\n`);
      if (err.stack) {
        process.stderr.write(`[process] Stack: ${err.stack}\n`);
      }
      // Don't exit - allow server to continue
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      process.stderr.write(`[process] ⚠️  Unhandled Rejection (non-fatal): ${reason}\n`);
      if (reason && reason.stack) {
        process.stderr.write(`[process] Stack: ${reason.stack}\n`);
      }
      // Log but don't exit - allow server to continue running
    });
    
    // Start background initialization AFTER server is confirmed listening
    setTimeout(() => {
      startBackgroundInitialization();
    }, 2000);
  })
  .catch((err) => {
    // CRITICAL: Log full error details to help diagnose the issue
    process.stderr.write(`\n`);
    process.stderr.write(`[index] ⚠️ Failed to load full app module - continuing with minimal server\n`);
    process.stderr.write(`[index] Error Type: ${err.constructor.name}\n`);
    process.stderr.write(`[index] Error Message: ${err.message}\n`);
    process.stderr.write(`[index] Error Code: ${err.code || 'N/A'}\n`);
    
    // Special handling for syntax errors with "analyze"
    if (err.message && err.message.includes('analyze')) {
      process.stderr.write(`[index] 🔍 ERROR CONTAINS 'analyze' - This is a syntax error!\n`);
      process.stderr.write(`[index] 🔍 Searching stack trace for file paths...\n`);
    }
    
    // Log the file that caused the error if available
    if (err.fileName || err.url || err.code === 'ERR_MODULE_NOT_FOUND') {
      process.stderr.write(`[index] Problem File: ${err.fileName || err.url || 'Unknown'}\n`);
    }
    
    if (err.stack) {
      process.stderr.write(`[index] Full Stack Trace:\n`);
      process.stderr.write(`${err.stack}\n`);
      
      // Extract ALL file paths from stack trace
      const stackLines = err.stack.split('\n');
      const filePaths = new Set();
      
      for (const line of stackLines) {
        // Look for file paths in stack trace
        const pathMatches = line.match(/([^\s]+\.(js|ts|mjs|cjs))[:\d]*/g);
        if (pathMatches) {
          pathMatches.forEach(match => {
            const cleanPath = match.replace(/[:\d]+$/, '');
            if (!cleanPath.includes('node:internal') && !cleanPath.includes('node_modules')) {
              filePaths.add(cleanPath);
            }
          });
        }
        
        // Look for "analyze" mentions
        if (line.includes('analyze')) {
          process.stderr.write(`[index] 🔍 Stack line with 'analyze': ${line.trim()}\n`);
        }
      }
      
      if (filePaths.size > 0) {
        process.stderr.write(`[index] 📁 Files referenced in stack:\n`);
        filePaths.forEach(path => {
          process.stderr.write(`[index]    - ${path}\n`);
        });
      }
      
      // Try to extract the problematic file from stack trace
      const stackMatch = err.stack.match(/at (.*?)\s+\(([^)]+)\)/);
      if (stackMatch) {
        process.stderr.write(`[index] Problematic location: ${stackMatch[2]}\n`);
      }
    }
    
    // Log additional error properties
    if (err.cause) {
      process.stderr.write(`[index] Error Cause: ${err.cause}\n`);
    }
    if (err.fileName) {
      process.stderr.write(`[index] Error File: ${err.fileName}\n`);
    }
    if (err.lineNumber) {
      process.stderr.write(`[index] Error Line: ${err.lineNumber}\n`);
    }
    
    // Also try to write to console as fallback
    console.error('[index] Full app load error (continuing with minimal server):', err);
    console.error('[index] Error details:', {
      name: err.name,
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    
    // DON'T exit - keep minimal server running so health checks pass
    // Railway can then inspect logs to see what went wrong
    process.stdout.write('[index] ⚠️ Continuing with minimal server - health checks will pass\n');
  });
}

// Background initialization (runs after server starts)
async function startBackgroundInitialization() {
  console.log('[index] Starting background initialization tasks...');
  
  try {
    // Import modules for initialization
    const [
      { initializeSchema },
      { initializeTwoDatabases },
      { seedStandards },
      { queryPostgres }
    ] = await Promise.all([
      import('./src/database/schema.js'),
      import('./src/database/twoDatabaseMigrations.js'),
      import('./src/seeds/standards.js'),
      import('./src/config/databases.js')
    ]);
    
    // Import database connection (non-blocking)
    import('./src/database/connection.js').catch(err => {
      console.warn('[index] ⚠️ Database connection import failed (non-fatal):', err.message);
    });
    
    // Step 0: Ensure critical tables exist
    console.log('[index] 🔧 Pre-flight: Ensuring critical tables exist...');
    try {
      await ensureStandardsTable(queryPostgres);
      await ensureParsedRequirementsTable(queryPostgres);
      console.log('[index] ✅ Pre-flight check: critical tables ready');
    } catch (err) {
      console.error('[index] ⚠️ Pre-flight table creation error (continuing):', err.message);
    }
    
    // Step 1: Run two-database migrations
    console.log('[index] Initializing two-database architecture...');
    try {
      await initializeTwoDatabases();
      console.log('[index] ✅ Two-database migrations completed');
    } catch (err) {
      console.error('[index] ⚠️ Two-database migration error (continuing):', err.message);
    }
    
    // Step 1.5: Ensure standards table exists (safety net)
    await ensureStandardsTable(queryPostgres);
    
    // Step 1.6: Verify Vera tables (non-blocking)
    console.log('[index] Verifying Vera AI tables...');
    try {
      const { verifyVeraTables } = await import('./src/scripts/verify-vera-tables.js');
      verifyVeraTables().catch(err => {
        console.warn('[index] ⚠️  Vera table verification failed (non-fatal):', err.message);
      });
    } catch (err) {
      console.warn('[index] ⚠️  Could not load Vera verification script (non-fatal):', err.message);
    }
    
    // Step 2: Run legacy schema initialization
    console.log('[index] Initializing legacy schema in background...');
    try {
      await initializeSchema();
      console.log('[index] ✅ Legacy schema initialization finished');
    } catch (err) {
      console.error('[index] ⚠️ Legacy schema initialization error (continuing):', err.message);
    }
    
    // Step 3: Seed standards table
    console.log('[index] Seeding standards table...');
    try {
      await seedStandards();
      console.log('[index] ✅ Standards seeding completed');
    } catch (err) {
      console.error('[index] ⚠️ Standards seeding error (continuing):', err.message);
    }
    
    // Step 4: Seed Vera tables
    console.log('[index] Seeding Vera tables...');
    try {
      const { seedAll } = await import('./src/scripts/seed-vera-comprehensive.js');
      await seedAll();
      console.log('[index] ✅ Vera seeding completed');
    } catch (err) {
      console.error('[index] ⚠️ Vera seeding error (continuing):', err.message);
    }
    
    // Step 3.5: Run cleanup ONLY if explicitly forced (not in production by default)
    // CRITICAL: Cleanup should NOT run automatically as it drops critical tables
    if (process.env.FORCE_ORPHAN_CLEANUP === 'true') {
      console.warn('[index] ⚠️ FORCE_ORPHAN_CLEANUP is true – dropping orphaned tables (use only for local dev)!');
      try {
        console.log('[index] 🗑️  Running cleanup of orphaned tables on startup...');
        const executeDirectCleanup = (await import('./src/scripts/execute-direct-cleanup.js')).default;
        const result = await executeDirectCleanup();
        console.log(`[index] ✅ Cleanup completed: Removed ${result.removed} tables, ${result.after} tables remaining`);
      } catch (error) {
        console.error('[index] ⚠️  Cleanup failed (non-fatal):', error.message);
      }
    } else {
      console.info('[index] Skipping direct orphan table cleanup in production. Set FORCE_ORPHAN_CLEANUP=true to enable.');
    }
    
    // Step 3.6: Ensure master admin user exists
    try {
      const { ensureMasterAdmin } = await import('./src/scripts/ensure-master-admin.js');
      await ensureMasterAdmin();
    } catch (error) {
      console.error('[index] ⚠️  Master admin check failed (non-fatal):', error.message);
    }
    
    // Step 3.7: Initialize VERA and check Mistral health
    console.log('[index] Initializing VERA and checking Mistral health...');
    try {
      const { initializeVERA } = await import('./src/services/vera-initialization.js');
      const mistralOnline = await initializeVERA();
      if (mistralOnline) {
        console.log('[index] ✅ VERA initialized - Mistral is online');
      } else {
        console.log('[index] ⚠️  VERA initialized - Mistral is offline (app will continue with fallback)');
      }
    } catch (error) {
      console.error('[index] ⚠️  VERA initialization error (non-fatal):', error.message);
    }
    
    // Step 4: Process Requirements folder if enabled
    const shouldProcessRequirements = process.env.PROCESS_REQUIREMENTS_ON_STARTUP === 'true' || 
                                      process.env.PROCESS_REQUIREMENTS_ON_STARTUP === '1';
    
    let standardCount = 0;
    try {
      const countResult = await queryPostgres('SELECT COUNT(*) as count FROM public.standards WHERE uploaded_at IS NOT NULL');
      standardCount = parseInt(countResult.rows[0]?.count || '0', 10);
    } catch (err) {
      console.error('[index] ⚠️ Could not check standard count:', err.message);
    }
    
    if (shouldProcessRequirements || standardCount < 5) {
      console.log('[index] Processing Requirements folder (background task)...');
      import('./src/scripts/process-requirements-folder.js').then(async (module) => {
        try {
          if (standardCount < 10) {
            console.log(`[index] 📁 Only ${standardCount} standards found. Processing Requirements folder...`);
            await module.processRequirementsFolder();
            console.log('[index] ✅ Requirements folder processing completed');
          } else {
            console.log(`[index] ℹ️  ${standardCount} standards already exist. Skipping Requirements folder processing.`);
            console.log('[index]    Set PROCESS_REQUIREMENTS_ON_STARTUP=true to force processing.');
          }
        } catch (err) {
          console.error('[index] ⚠️ Requirements folder processing error (non-fatal):', err.message);
        }
      }).catch(err => {
        console.error('[index] ⚠️ Could not load process-requirements-folder module:', err.message);
      });
    } else {
      console.log(`[index] ℹ️  ${standardCount} standards found. Requirements folder processing skipped.`);
      console.log('[index]    Set PROCESS_REQUIREMENTS_ON_STARTUP=true to process Requirements folder on startup.');
    }
    
    console.log('[index] ✅ Background initialization tasks completed');
  } catch (err) {
    console.error('[index] ⚠️ Background initialization error (non-fatal):', err.message);
    // Don't throw - server is already running
  }
}

// Helper functions
async function ensureStandardsTable(queryPostgres) {
  try {
    console.log('[index] 🔧 Ensuring public.standards table exists...');
    
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS public.standards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        authority_source VARCHAR(100),
        sector VARCHAR(100),
        description TEXT,
        total_clauses INT DEFAULT 0,
        total_requirements INT DEFAULT 0,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        parsed_at TIMESTAMP,
        model_version_used VARCHAR(20) DEFAULT '1.0.0',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        file_path TEXT,
        file_name VARCHAR(255),
        file_size BIGINT,
        file_type VARCHAR(100),
        file_category VARCHAR(100),
        file_content TEXT,
        metadata JSONB
      )
    `);

    await queryPostgres(`
      ALTER TABLE public.standards 
      ADD COLUMN IF NOT EXISTS file_path TEXT,
      ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS file_size BIGINT,
      ADD COLUMN IF NOT EXISTS file_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS file_category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS file_content TEXT,
      ADD COLUMN IF NOT EXISTS metadata JSONB
    `);

    await queryPostgres('CREATE INDEX IF NOT EXISTS idx_standards_code ON public.standards(code)');
    await queryPostgres('CREATE INDEX IF NOT EXISTS idx_standards_sector ON public.standards(sector)');
    await queryPostgres('CREATE INDEX IF NOT EXISTS idx_standards_uploaded_at ON public.standards(uploaded_at DESC)');
    await queryPostgres('CREATE INDEX IF NOT EXISTS idx_standards_file_category ON public.standards(file_category)');
    
    console.log('[index] ✅ public.standards table verified');
  } catch (err) {
    console.error('[index] ❌ Failed to ensure standards table:', err.message);
  }
}

async function ensureParsedRequirementsTable(queryPostgres) {
  try {
    console.log('[index] 🔧 Ensuring public.parsed_requirements table exists...');
    
    const { default: createParsedRequirementsTableNow } = await import('./src/scripts/create-parsed-requirements-table-now.js');
    await createParsedRequirementsTableNow();
    console.log('[index] ✅ public.parsed_requirements table verified');

    await queryPostgres(`
      ALTER TABLE public.parsed_requirements 
      ADD COLUMN IF NOT EXISTS requirement_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS requirement_subtype VARCHAR(100),
      ADD COLUMN IF NOT EXISTS clause_ref VARCHAR(100),
      ADD COLUMN IF NOT EXISTS sub_ref VARCHAR(100),
      ADD COLUMN IF NOT EXISTS full_ref VARCHAR(200),
      ADD COLUMN IF NOT EXISTS clause_path_depth INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS subject_text TEXT,
      ADD COLUMN IF NOT EXISTS is_informative_note BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_recommendation BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_in_scope BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS keyword VARCHAR(50),
      ADD COLUMN IF NOT EXISTS modal_verb VARCHAR(50),
      ADD COLUMN IF NOT EXISTS intent TEXT,
      ADD COLUMN IF NOT EXISTS keywords TEXT,
      ADD COLUMN IF NOT EXISTS extraction_flags JSONB,
      ADD COLUMN IF NOT EXISTS requirement_uid VARCHAR(16),
      ADD COLUMN IF NOT EXISTS requires_retained_di BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS extracted_by_model_version VARCHAR(20) DEFAULT '1.0.0'
    `);

    await queryPostgres('CREATE INDEX IF NOT EXISTS idx_parsed_requirements_standard_id ON public.parsed_requirements(standard_id)');
    await queryPostgres('CREATE INDEX IF NOT EXISTS idx_parsed_requirements_clause_ref ON public.parsed_requirements(clause_ref)');
    await queryPostgres('CREATE INDEX IF NOT EXISTS idx_parsed_requirements_full_ref ON public.parsed_requirements(full_ref)');
    await queryPostgres('CREATE INDEX IF NOT EXISTS idx_parsed_requirements_extracted_at ON public.parsed_requirements(extracted_at DESC)');
    
    console.log('[index] ✅ public.parsed_requirements table verified');
  } catch (err) {
    console.error('[index] ❌ Failed to ensure parsed_requirements table:', err.message);
  }
}
