/**
 * Fix Standards Data Issues
 * 1. Check all standards in database
 * 2. Fix incorrect sector/file_category mappings
 * 3. Remove duplicates
 * 4. Ensure proper categorization
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function fixStandardsData() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set!');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔍 Analyzing standards table...\n');

    // Get all standards
    const allStandards = await pool.query(`
      SELECT id, code, name, sector, file_category, file_path, uploaded_at
      FROM public.standards
      ORDER BY code, uploaded_at DESC
    `);

    console.log(`📊 Total standards in database: ${allStandards.rows.length}\n`);

    // Group by code to find duplicates
    const codeMap = new Map();
    allStandards.rows.forEach(row => {
      if (!codeMap.has(row.code)) {
        codeMap.set(row.code, []);
      }
      codeMap.get(row.code).push(row);
    });

    const duplicates = Array.from(codeMap.entries()).filter(([code, rows]) => rows.length > 1);
    
    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} duplicate codes:\n`);
      duplicates.forEach(([code, rows]) => {
        console.log(`   ${code}: ${rows.length} entries`);
        rows.forEach((row, idx) => {
          console.log(`     ${idx + 1}. ID: ${row.id}, sector: ${row.sector}, category: ${row.file_category || 'NULL'}, uploaded: ${row.uploaded_at}`);
        });
      });
    }

    // Check sector/file_category issues
    console.log('\n🔍 Checking sector/file_category mappings...\n');
    
    const issues = [];
    allStandards.rows.forEach(row => {
      const code = row.code.toLowerCase();
      const name = (row.name || '').toLowerCase();
      
      // Determine what it should be
      let shouldBeCategory = 'standard';
      let shouldBeSector = 'standard';
      
      if (code.includes('part 120') || code.includes('part 40') || code.includes('title 49') || 
          code.includes('faa') || code.includes('fda') || code.includes('easa') ||
          name.includes('regulatory') || name.includes('part 120') || name.includes('part 40')) {
        shouldBeCategory = 'regulatory';
        shouldBeSector = 'regulatory';
      } else if (code.includes('asr') || code.includes('customer') || 
                 name.includes('customer') || row.sector === 'customer_require') {
        shouldBeCategory = 'customer_requirements';
        shouldBeSector = 'customer';
      } else {
        shouldBeCategory = 'standard';
        shouldBeSector = 'standard';
      }
      
      // Check if there's a mismatch
      const currentCategory = row.file_category || row.sector;
      if (currentCategory !== shouldBeCategory && currentCategory !== shouldBeSector) {
        issues.push({
          id: row.id,
          code: row.code,
          currentSector: row.sector,
          currentCategory: row.file_category,
          shouldBeCategory,
          shouldBeSector
        });
      }
    });

    if (issues.length > 0) {
      console.log(`⚠️  Found ${issues.length} categorization issues:\n`);
      issues.forEach(issue => {
        console.log(`   ${issue.code}:`);
        console.log(`     Current: sector="${issue.currentSector}", category="${issue.currentCategory || 'NULL'}"`);
        console.log(`     Should be: category="${issue.shouldBeCategory}", sector="${issue.shouldBeSector}"`);
      });
    }

    // Show all standards
    console.log('\n📋 All standards in database:\n');
    allStandards.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.code}`);
      console.log(`   Name: ${row.name}`);
      console.log(`   Sector: ${row.sector || 'NULL'}`);
      console.log(`   File Category: ${row.file_category || 'NULL'}`);
      console.log(`   Has File: ${row.file_path ? 'YES' : 'NO'}`);
      console.log(`   Uploaded: ${row.uploaded_at || 'NULL'}`);
      console.log('');
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

fixStandardsData();

