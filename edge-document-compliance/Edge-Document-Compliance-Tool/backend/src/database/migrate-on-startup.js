/**
 * Optional Migration Runner
 * Runs migrations on startup if RUN_MIGRATIONS=true
 * Non-blocking - server starts even if migrations fail
 */

import { query } from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, 'migrations');

async function runMigrations() {
  try {
    console.log('[migrate] Checking for pending migrations...');

    // Ensure migrations tracking table exists
    await query(`
      CREATE SCHEMA IF NOT EXISTS edcat;
      CREATE TABLE IF NOT EXISTS edcat.migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Get all migration files, sorted
    if (!fs.existsSync(migrationsDir)) {
      console.log('[migrate] No migrations directory found, skipping');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('[migrate] No migration files found');
      return;
    }

    console.log(`[migrate] Found ${files.length} migration file(s)`);

    let executed = 0;
    for (const file of files) {
      // Check if already executed
      try {
        const check = await query(
          'SELECT filename FROM edcat.migrations WHERE filename = $1',
          [file]
        );

        if (check.rows.length > 0) {
          console.log(`[migrate] ⏭️  Skipping ${file} (already executed)`);
          continue;
        }
      } catch (checkErr) {
        // Table might not exist yet, continue
        console.log(`[migrate] Note: Could not check migration status: ${checkErr.message}`);
      }

      console.log(`[migrate] ▶️  Running ${file}...`);
      try {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await query(sql);

        // Record execution
        await query(
          'INSERT INTO edcat.migrations(filename) VALUES ($1)',
          [file]
        );

        console.log(`[migrate] ✓ Completed ${file}`);
        executed++;
      } catch (migrateErr) {
        console.error(`[migrate] ❌ Error running ${file}:`, migrateErr.message);
        // Continue with other migrations
      }
    }

    if (executed > 0) {
      console.log(`[migrate] ✅ Migrations complete: ${executed} executed`);
    } else {
      console.log('[migrate] ✅ All migrations up to date');
    }
  } catch (err) {
    console.warn('[migrate] ⚠️  Migration check failed (non-critical):', err.message);
    // Don't throw - allow server to start
  }
}

// Run migrations if enabled
if (process.env.RUN_MIGRATIONS === 'true') {
  runMigrations().catch(err => {
    console.warn('[migrate] Migration error (non-critical):', err.message);
  });
} else {
  console.log('[migrate] Skipping migrations (set RUN_MIGRATIONS=true to enable)');
}

