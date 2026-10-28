/**
 * Apply Fixed Database Schema
 * 
 * This script applies the production-ready schema from schema_fixed.sql
 * Run with: node backend/src/scripts/apply-fixed-schema.js
 * 
 * WARNING: This will DROP and recreate the public schema!
 * Make sure you have backups before running this.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

async function applySchema() {
  console.log('📋 Applying fixed database schema...');
  console.log(`   Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('railway') || DATABASE_URL.includes('amazonaws') ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, '../database/schema_fixed.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error(`❌ Schema file not found: ${schemaPath}`);
      process.exit(1);
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📖 Read schema file, executing SQL...');
    
    // Execute schema SQL
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(schemaSQL);
      await client.query('COMMIT');
      
      console.log('✅ Schema applied successfully!');
      
      // Verify tables were created
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      console.log(`\n📊 Created ${result.rows.length} tables:`);
      result.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ${row.table_name}`);
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error applying schema:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
applySchema()
  .then(() => {
    console.log('\n✅ Migration complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  });

