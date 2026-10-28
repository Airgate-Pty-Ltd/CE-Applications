/**
 * Diagnose Upload Issue
 * Check why /api/upload is returning 500 and why only 4 standards show
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function diagnose() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set!');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔍 Diagnosing upload issue...\n');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'standards'
      ) as exists
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ public.standards table does NOT exist!');
      await pool.end();
      return;
    }

    console.log('✅ public.standards table exists\n');

    // Check columns
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'standards'
      ORDER BY ordinal_position
    `);

    console.log('📋 Table columns:');
    const columnNames = columns.rows.map(c => c.column_name);
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // Check if file_path column exists
    const hasFilePath = columnNames.includes('file_path');
    const hasFileName = columnNames.includes('file_name');
    const hasFileSize = columnNames.includes('file_size');
    const hasFileCategory = columnNames.includes('file_category');

    console.log(`\n📊 Column check:`);
    console.log(`   file_path: ${hasFilePath ? '✅' : '❌'}`);
    console.log(`   file_name: ${hasFileName ? '✅' : '❌'}`);
    console.log(`   file_size: ${hasFileSize ? '✅' : '❌'}`);
    console.log(`   file_category: ${hasFileCategory ? '✅' : '❌'}`);

    // Count standards
    const totalCount = await pool.query('SELECT COUNT(*) as count FROM public.standards');
    console.log(`\n📊 Total standards: ${totalCount.rows[0].count}`);

    // Count with file_path
    if (hasFilePath) {
      const withPath = await pool.query(`
        SELECT COUNT(*) as count 
        FROM public.standards 
        WHERE file_path IS NOT NULL
      `);
      console.log(`📊 Standards with file_path: ${withPath.rows[0].count}`);
    }

    // Count with uploaded_at
    const withUploaded = await pool.query(`
      SELECT COUNT(*) as count 
      FROM public.standards 
      WHERE uploaded_at IS NOT NULL
    `);
    console.log(`📊 Standards with uploaded_at: ${withUploaded.rows[0].count}`);

    // Sample standards
    const sample = await pool.query(`
      SELECT code, file_path, file_category, uploaded_at 
      FROM public.standards 
      WHERE uploaded_at IS NOT NULL 
      ORDER BY uploaded_at DESC 
      LIMIT 10
    `);

    console.log(`\n📝 Sample standards (first 10):`);
    sample.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.code}`);
      console.log(`      file_path: ${row.file_path ? 'SET' : 'NULL'}`);
      console.log(`      file_category: ${row.file_category || 'NULL'}`);
      console.log(`      uploaded_at: ${row.uploaded_at}`);
    });

    // Test the actual query from upload.js
    console.log(`\n🧪 Testing /api/upload query for type=standards:`);
    try {
      const testQuery = `
        SELECT id, file_path as "originalName", COALESCE(file_size, 0) as size, 
               uploaded_at as "uploadedAt", file_path, file_category as category
        FROM public.standards
        WHERE file_path IS NOT NULL
          AND (file_category = 'standard' OR file_category = 'standards' OR (file_category IS NULL AND sector != 'regulatory' AND sector != 'customer'))
        ORDER BY uploaded_at DESC
        LIMIT 500
      `;
      const testResult = await pool.query(testQuery);
      console.log(`   ✅ Query succeeded: ${testResult.rows.length} rows`);
      if (testResult.rows.length > 0) {
        console.log(`   Sample row:`, JSON.stringify(testResult.rows[0], null, 2));
      }
    } catch (queryError) {
      console.error(`   ❌ Query failed: ${queryError.message}`);
      console.error(`   Stack: ${queryError.stack}`);
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

diagnose();

