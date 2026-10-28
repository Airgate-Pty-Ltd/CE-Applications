/**
 * ============================================================================
 * COMPLIANCE GAP WITH CHAT - Database Setup Script
 * ============================================================================
 * 
 * Purpose: Create all 9 database tables in Railway PostgreSQL
 * 
 * Usage: 
 *   cd backend
 *   node setup-db.js
 * 
 * What it does:
 *   1. Connects to Railway PostgreSQL (using DATABASE_URL from .env)
 *   2. Creates 2 schemas (compliance_lib, customer_data)
 *   3. Creates 9 tables with proper indices
 *   4. Shows success/error messages
 * 
 * ============================================================================
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  COMPLIANCE GAP - DATABASE SETUP SCRIPT                       ║
║  Creating schemas and 9 tables in Railway PostgreSQL          ║
╚════════════════════════════════════════════════════════════════╝
`);

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false, // Required for Railway
  } : false,
});

// ============================================================================
// SQL SCHEMA
// ============================================================================

// Read schema from file or use inline
const schema = readFileSync(
  join(__dirname, 'src/database/schema/complete-schema.sql'),
  'utf8'
);

// ============================================================================
// SETUP FUNCTION
// ============================================================================

async function setupDatabase() {
  const client = await pool.connect();

  try {
    console.log('📝 Starting database setup...\n');

    // Test connection first
    await client.query('SELECT NOW()');
    console.log('✅ Connected to database\n');

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => 
        stmt.length > 0 && 
        !stmt.startsWith('--') &&
        !stmt.startsWith('/*') &&
        stmt !== ''
      );

    let count = 0;
    let skipped = 0;

    for (const statement of statements) {
      try {
        if (statement.length < 10) continue; // Skip very short statements
        
        await client.query(statement);
        count++;
        
        // Show progress for important statements
        if (statement.includes('CREATE SCHEMA') || statement.includes('CREATE TABLE')) {
          const match = statement.match(/CREATE (SCHEMA|TABLE).*?(\w+\.\w+|\w+)/i);
          if (match) {
            console.log(`✅ Created: ${match[2]}`);
          }
        }
      } catch (err) {
        // Some statements might fail if they already exist
        // This is OK - we're using "CREATE IF NOT EXISTS"
        if (err.message.includes('already exists') || err.code === '42P07') {
          skipped++;
          // Only show skipped for important statements
          if (statement.includes('CREATE SCHEMA') || statement.includes('CREATE TABLE')) {
            const match = statement.match(/CREATE (SCHEMA|TABLE).*?(\w+\.\w+|\w+)/i);
            if (match) {
              console.log(`⏭️  Skipped (already exists): ${match[2]}`);
            }
          }
        } else {
          console.error(`❌ Error executing statement:`);
          console.error(`   ${statement.substring(0, 100)}...`);
          console.error(`   Error: ${err.message}`);
          throw err;
        }
      }
    }

    console.log(`\n✅ Executed ${count} statements (${skipped} skipped)\n`);

    // Verify tables were created
    const result = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema IN ('compliance_lib', 'customer_data')
      ORDER BY table_schema, table_name;
    `);

    console.log('📊 Tables created:\n');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_schema}.${row.table_name}`);
    });

    console.log(`\n✅ Total tables: ${result.rows.length}\n`);

    // Verify indices
    const indexResult = await client.query(`
      SELECT schemaname, indexname 
      FROM pg_indexes 
      WHERE schemaname IN ('compliance_lib', 'customer_data')
      ORDER BY schemaname, indexname;
    `);

    console.log(`📊 Indices created: ${indexResult.rows.length}\n`);

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║  DATABASE SETUP COMPLETE!                                     ║
║  All schemas and tables ready to use.                          ║
║  Your Railway PostgreSQL is now configured.                    ║
╚════════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    console.error('\n❌ SETUP FAILED:', err.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check DATABASE_URL in backend/.env');
    console.error('  2. Verify PostgreSQL is running on Railway');
    console.error('  3. Check network connection to Railway');
    console.error('  4. Ensure .env file exists and has DATABASE_URL');
    console.error('\nFull error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// ============================================================================
// RUN SETUP
// ============================================================================

setupDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

