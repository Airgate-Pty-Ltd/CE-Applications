/**
 * Check if standards table exists in PostgreSQL
 * This will query the actual database to see what tables exist
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function checkStandardsTable() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set!');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔍 Checking for standards table in PostgreSQL...\n');

    // Check all schemas
    const schemas = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `);

    console.log('📋 Available schemas:');
    schemas.rows.forEach(row => {
      console.log(`   - ${row.schema_name}`);
    });

    // Check for standards table in each schema
    console.log('\n🔍 Searching for "standards" table in all schemas...\n');
    
    for (const schema of schemas.rows) {
      const schemaName = schema.schema_name;
      const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_name LIKE '%standard%'
        ORDER BY table_name
      `, [schemaName]);

      if (tables.rows.length > 0) {
        console.log(`📊 Schema "${schemaName}":`);
        tables.rows.forEach(row => {
          console.log(`   ✅ ${row.table_name}`);
        });
      }
    }

    // Specifically check public.standards
    console.log('\n🎯 Checking public.standards specifically...');
    const publicCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'standards'
      ) as exists
    `);

    if (publicCheck.rows[0].exists) {
      console.log('✅ public.standards EXISTS\n');
      
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
        const sample = await pool.query('SELECT code, name, file_category FROM public.standards LIMIT 5');
        console.log('\n📝 Sample standards:');
        sample.rows.forEach(row => {
          console.log(`   - ${row.code}: ${row.name} (category: ${row.file_category || 'none'})`);
        });
      }
    } else {
      console.log('❌ public.standards DOES NOT EXIST\n');
      
      // Try to create it
      console.log('🔧 Attempting to create public.standards table...');
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
        console.log('✅ Table created successfully!');
      } catch (createError) {
        console.error('❌ Failed to create table:', createError.message);
      }
    }

    // List ALL tables in public schema
    console.log('\n📋 ALL tables in public schema:');
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    allTables.rows.forEach((row, idx) => {
      const marker = row.table_name === 'standards' ? ' ⭐' : '';
      console.log(`   ${idx + 1}. ${row.table_name}${marker}`);
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

checkStandardsTable();

