/**
 * Verify Standards Table Exists
 * Quick script to check if public.standards table exists in PostgreSQL
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function verifyStandardsTable() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set!');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔍 Checking if public.standards table exists...\n');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'standards'
      ) as exists
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ public.standards table EXISTS\n');

      // Get table structure
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'standards'
        ORDER BY ordinal_position
      `);

      console.log('📋 Table columns:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });

      // Get row count
      const count = await pool.query('SELECT COUNT(*) as count FROM public.standards');
      console.log(`\n📊 Row count: ${count.rows[0].count}`);

      if (parseInt(count.rows[0].count) > 0) {
        const sample = await pool.query('SELECT code, name FROM public.standards LIMIT 5');
        console.log('\n📝 Sample standards:');
        sample.rows.forEach(row => {
          console.log(`   - ${row.code}: ${row.name}`);
        });
      }
    } else {
      console.log('❌ public.standards table DOES NOT EXIST\n');
      console.log('💡 Solution: Run migrations first:');
      console.log('   node backend/src/scripts/run-migrations.js');
      
      // Try to create it manually
      console.log('\n🔧 Attempting to create table manually...');
      try {
        await pool.query(`
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
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
        console.log('✅ Table created successfully!');
      } catch (createError) {
        console.error('❌ Failed to create table:', createError.message);
      }
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyStandardsTable();

