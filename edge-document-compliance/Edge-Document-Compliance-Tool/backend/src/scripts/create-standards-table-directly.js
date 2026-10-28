/**
 * Create Standards Table Directly
 * Bypasses migration parser issues by creating the table directly
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function createStandardsTable() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set!');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔧 Creating public.standards table directly...\n');

    // Create the table with all necessary columns
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

    // Ensure all file-related columns exist (in case table was created without them)
    await pool.query(`
      ALTER TABLE public.standards 
      ADD COLUMN IF NOT EXISTS file_path TEXT,
      ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS file_size BIGINT,
      ADD COLUMN IF NOT EXISTS file_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS file_category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS file_content TEXT,
      ADD COLUMN IF NOT EXISTS metadata JSONB
    `);

    console.log('✅ Table created\n');

    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_standards_code ON public.standards(code)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_standards_sector ON public.standards(sector)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_standards_uploaded_at ON public.standards(uploaded_at DESC)');
    
    if (await columnExists(pool, 'public.standards', 'authority_source')) {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_standards_authority ON public.standards(authority_source)');
    }
    
    if (await columnExists(pool, 'public.standards', 'file_category')) {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_standards_file_category ON public.standards(file_category)');
    }

    console.log('✅ Indexes created\n');

    // Verify
    const count = await pool.query('SELECT COUNT(*) as count FROM public.standards');
    console.log(`✅ Verification: Table exists with ${count.rows[0].count} rows\n`);

    await pool.end();
    console.log('✅ Standards table setup complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

async function columnExists(pool, tableName, columnName) {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      ) as exists
    `, [tableName.replace('public.', ''), columnName]);
    return result.rows[0].exists;
  } catch (err) {
    return false;
  }
}

createStandardsTable();

