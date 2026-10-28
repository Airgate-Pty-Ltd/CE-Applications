/**
 * Drop standard_files and standard_files_content tables immediately
 * Run this directly: node backend/src/scripts/drop-tables-now.js
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file if it exists
const envPath = path.join(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      if (key && value) {
        process.env[key.trim()] = value;
      }
    }
  });
}

// Get DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
  console.error('   Set it in your .env file or run: $env:DATABASE_URL="your-connection-string"');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function dropTables() {
  console.log('🗑️  Dropping standard_files and standard_files_content tables...\n');

  const client = await pool.connect();
  
  try {
    // Check if tables exist
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('standard_files', 'standard_files_content')
      ORDER BY table_name
    `);

    if (checkResult.rows.length === 0) {
      console.log('✅ Both tables already removed - nothing to do!');
      return;
    }

    console.log(`Found ${checkResult.rows.length} table(s) to remove:`);
    checkResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Drop standard_files_content first
    if (checkResult.rows.some(r => r.table_name === 'standard_files_content')) {
      console.log('\nDropping standard_files_content...');
      await client.query('DROP TABLE IF EXISTS public.standard_files_content CASCADE');
      console.log('   ✅ Dropped standard_files_content');
    }

    // Drop standard_files
    if (checkResult.rows.some(r => r.table_name === 'standard_files')) {
      console.log('\nDropping standard_files...');
      await client.query('DROP TABLE IF EXISTS public.standard_files CASCADE');
      console.log('   ✅ Dropped standard_files');
    }

    // Verify
    const verifyResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('standard_files', 'standard_files_content')
    `);

    if (verifyResult.rows.length === 0) {
      console.log('\n✅ Both tables successfully removed!');
    } else {
      console.log(`\n⚠️  Warning: ${verifyResult.rows.length} table(s) still exist`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

dropTables()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });

