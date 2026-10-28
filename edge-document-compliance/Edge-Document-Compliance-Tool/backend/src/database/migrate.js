/**
 * Database Migration Runner
 * 
 * Runs migrations in order, tracking which have been executed.
 * Safe to run multiple times - only runs pending migrations.
 * 
 * Usage:
 *   node src/database/migrate.js
 *   npm run migrate
 */

/**
 * LEGACY Migration Runner
 * 
 * ⚠️  NOTE: This file creates its own pool for migrations.
 *     For production migrations, use twoDatabaseMigrations.js instead.
 * 
 * This script is kept for backward compatibility with old migration structure.
 */

import { queryPostgres, postgresPool } from '../config/databases.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create migrations table if it doesn't exist
async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

// Get list of executed migrations
async function getExecutedMigrations(client) {
  const result = await client.query('SELECT version FROM schema_migrations ORDER BY version');
  return result.rows.map(row => row.version);
}

// Record a migration as executed
async function recordMigration(client, version) {
  await client.query(
    'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
    [version]
  );
}

// Load migration files
function loadMigrations() {
  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.js') && file !== 'migrate.js' && !file.includes('migrate'))
    .sort();

  return files.map(file => {
    const version = file.replace('.js', '');
    const migrationPath = join(migrationsDir, file);
    return {
      version,
      file,
      path: migrationPath
    };
  });
}

// Run migrations
async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set - skipping migrations');
    console.log('   Set DATABASE_URL in Railway environment variables');
    return { success: true, skipped: true };
  }

  let client;

  try {
    // Use centralized postgresPool from databases.js
    if (!postgresPool) {
      throw new Error('PostgreSQL pool not initialized');
    }
    client = await postgresPool.connect();
  } catch (connectionError) {
    console.error('⚠️  Could not connect to database for migrations:', connectionError.message);
    console.log('   Server will start without running migrations');
    return { success: false, error: connectionError.message };
  }

  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  DATABASE MIGRATIONS                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // Ensure migrations table exists
    await ensureMigrationsTable(client);

    // Get executed migrations
    const executed = await getExecutedMigrations(client);
    console.log(`📋 Executed migrations: ${executed.length}\n`);

    // Load migration files
    const migrations = loadMigrations();
    console.log(`📦 Found ${migrations.length} migration file(s)\n`);

    if (migrations.length === 0) {
      console.log('⚠️  No migrations found');
      return;
    }

    // Run pending migrations
    let executedCount = 0;
    for (const migration of migrations) {
      if (executed.includes(migration.version)) {
        console.log(`⏭️  Skipping ${migration.version} (already executed)`);
        continue;
      }

      console.log(`🔄 Running ${migration.version}...`);

      try {
        // Import and run migration
        // Use relative path import for better compatibility
        const migrationModule = await import(`./migrations/${migration.file}`);
        
        if (!migrationModule.up) {
          throw new Error(`Migration ${migration.version} missing 'up' function`);
        }

        // Run migration WITHOUT a transaction wrapper
        // Migrations execute statements individually in auto-commit mode
        try {
          // Ensure we're in auto-commit mode (not in a transaction)
          // PostgreSQL clients are auto-commit by default, but ensure it
          try {
            // Try to rollback any existing transaction
            await client.query('ROLLBACK');
          } catch (rollbackErr) {
            // Not in a transaction - that's fine, continue
          }
          
          // Run migration (statements execute individually)
          await migrationModule.up(client);
          
          // Record migration (simple insert, auto-commits)
          try {
            await recordMigration(client, migration.version);
          } catch (recordErr) {
            console.log(`⚠️  Could not record migration ${migration.version}: ${recordErr.message}`);
            // Don't fail - migration succeeded even if recording failed
          }
          
          console.log(`✅ ${migration.version} completed\n`);
          executedCount++;
        } catch (err) {
          // Migration failed - log but don't throw
          console.error(`❌ Migration ${migration.version} failed:`, err.message);
          // Try to rollback any pending transaction
          try {
            await client.query('ROLLBACK');
          } catch (rollbackErr) {
            // Ignore
          }
          // Don't throw - allow other migrations to run
        }
      } catch (err) {
        console.error(`❌ Migration ${migration.version} failed:`, err.message);
        console.error('   Error details:', err);
        // Don't throw - log and continue to allow server to start
        console.log(`⚠️  Skipping remaining migrations due to error`);
        return { success: false, error: err.message, executedCount };
      }
    }

    if (executedCount === 0) {
      console.log('✅ All migrations are up to date\n');
    } else {
      console.log(`\n✅ Successfully executed ${executedCount} migration(s)\n`);
    }

    // Verify tables
    const tablesResult = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema IN ('compliance_lib', 'customer_data')
      ORDER BY table_schema, table_name
    `);

    if (tablesResult.rows.length > 0) {
      console.log('📊 Database tables:');
      tablesResult.rows.forEach(row => {
        console.log(`   ✓ ${row.table_schema}.${row.table_name}`);
      });
      console.log(`\n✅ Total: ${tablesResult.rows.length} tables\n`);
    }

    return { success: true, executedCount };
  } catch (err) {
    console.error('\n❌ Migration process error:', err.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check DATABASE_URL is set correctly');
    console.error('  2. Verify PostgreSQL is accessible');
    console.error('  3. Check database permissions');
    // Don't exit - allow server to start
    return { success: false, error: err.message };
  } finally {
    if (client) {
      client.release();
    }
    // Don't end the pool - it's shared via databases.js
  }
}

// Run migrations and exit properly
// This script is called from npm start, so it must exit
runMigrations()
  .then(result => {
    if (result && result.success) {
      console.log('✅ Migration process completed successfully\n');
      process.exit(0);
    } else if (result && result.skipped) {
      console.log('⏭️  Migrations skipped (no DATABASE_URL)\n');
      process.exit(0);
    } else {
      console.log('⚠️  Migrations completed with warnings (server will continue)\n');
      process.exit(0); // Exit anyway to allow verify-tables to run
    }
  })
  .catch(err => {
    console.error('⚠️  Migration process error (server will continue):', err.message);
    console.log('   Server will start without migrations\n');
    process.exit(0); // Exit anyway to allow verify-tables to run
  });

