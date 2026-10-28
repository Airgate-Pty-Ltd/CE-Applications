/**
 * Find which schema the standards table is in
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function findStandardsTable() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set!');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔍 Finding standards table in all schemas...\n');

    // Find all tables named "standards" in any schema
    const result = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'standards'
      ORDER BY table_schema, table_name
    `);

    if (result.rows.length === 0) {
      console.log('❌ No table named "standards" found in any schema');
    } else {
      console.log('✅ Found standards table(s):');
      result.rows.forEach(row => {
        console.log(`   Schema: ${row.table_schema}, Table: ${row.table_name}`);
        console.log(`   Full name: ${row.table_schema}.${row.table_name}`);
      });
    }

    // Also check if we can query it without schema prefix
    console.log('\n🧪 Testing queries:');
    
    // Test 1: Query without schema (should default to public or search_path)
    try {
      const test1 = await pool.query('SELECT COUNT(*) as count FROM standards');
      console.log(`   ✅ SELECT FROM standards: ${test1.rows[0].count} rows`);
    } catch (e) {
      console.log(`   ❌ SELECT FROM standards: ${e.message}`);
    }

    // Test 2: Query with public schema
    try {
      const test2 = await pool.query('SELECT COUNT(*) as count FROM public.standards');
      console.log(`   ✅ SELECT FROM public.standards: ${test2.rows[0].count} rows`);
    } catch (e) {
      console.log(`   ❌ SELECT FROM public.standards: ${e.message}`);
    }

    // Check current search_path
    const searchPath = await pool.query('SHOW search_path');
    console.log(`\n📋 Current search_path: ${searchPath.rows[0].search_path}`);

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

findStandardsTable();

