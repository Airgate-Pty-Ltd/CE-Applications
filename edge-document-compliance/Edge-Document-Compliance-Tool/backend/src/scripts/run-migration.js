/**
 * Migration Runner
 * Runs SQL migration files in order
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, '../database/migrations');

async function runMigrations() {
  try {
    // Get all migration files, sorted
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files`);

    // Create migrations tracking table
    await query(`
      CREATE TABLE IF NOT EXISTS edcat.migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const file of files) {
      // Check if already executed
      const check = await query(
        'SELECT filename FROM edcat.migrations WHERE filename = $1',
        [file]
      );

      if (check.rows.length > 0) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`▶️  Running ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      // Execute migration
      await query(sql);

      // Record execution
      await query(
        'INSERT INTO edcat.migrations(filename) VALUES ($1)',
        [file]
      );

      console.log(`✓ Completed ${file}`);
    }

    console.log('\n✓ All migrations complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

runMigrations();

