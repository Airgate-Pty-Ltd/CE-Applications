/**
 * Root Cause Diagnosis: Why are 0 standards showing?
 * 
 * This script traces the exact logic flow from database to frontend
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

async function diagnose() {
  console.log('=== ROOT CAUSE DIAGNOSIS: ZERO STANDARDS ===\n');
  
  // Step 1: Check database state
  console.log('STEP 1: Database State');
  console.log('─────────────────────');
  
  const standardsCount = await queryEdcatAI('SELECT COUNT(*) as count FROM standards WHERE uploaded_at IS NOT NULL');
  console.log(`✓ Standards with uploaded_at: ${standardsCount.rows[0].count}`);
  
  const filesCount = await queryPostgres('SELECT COUNT(*) as count FROM public.standard_files WHERE standard_id IS NOT NULL');
  console.log(`✓ Files in standard_files: ${filesCount.rows[0].count}`);
  
  const uniqueStandardsWithFiles = await queryPostgres('SELECT COUNT(DISTINCT standard_id) as count FROM public.standard_files WHERE standard_id IS NOT NULL');
  console.log(`✓ Unique standards with files: ${uniqueStandardsWithFiles.rows[0].count}\n`);
  
  // Step 2: Check if standard_files table exists
  console.log('STEP 2: Table Existence Check');
  console.log('─────────────────────────────');
  
  let hasStandardFiles = false;
  try {
    const tableCheck = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'standard_files'
      ) as exists
    `);
    hasStandardFiles = tableCheck.rows[0]?.exists || false;
    console.log(`✓ standard_files table exists: ${hasStandardFiles}`);
  } catch (error) {
    console.log(`✗ Error checking table: ${error.message}`);
  }
  
  // Step 3: Build standardsWithFiles Set (simulating requirements.js logic)
  console.log('\nSTEP 3: Building standardsWithFiles Set');
  console.log('─────────────────────────────────────────');
  
  let fileCategoryMap = new Map();
  let standardsWithFiles = new Set();
  
  if (hasStandardFiles) {
    try {
      const filesResult = await queryPostgres(`
        SELECT DISTINCT ON (standard_id)
          standard_id,
          file_category
        FROM public.standard_files
        WHERE standard_id IS NOT NULL
        ORDER BY standard_id, uploaded_at DESC
      `);
      
      filesResult.rows.forEach(row => {
        if (row.standard_id) {
          fileCategoryMap.set(row.standard_id, row.file_category);
          standardsWithFiles.add(row.standard_id);
        }
      });
      
      console.log(`✓ standardsWithFiles Set size: ${standardsWithFiles.size}`);
      console.log(`✓ fileCategoryMap size: ${fileCategoryMap.size}`);
      
      if (standardsWithFiles.size > 0) {
        console.log(`✓ Sample standard_ids: ${Array.from(standardsWithFiles).slice(0, 5).join(', ')}`);
      } else {
        console.log(`✗ CRITICAL: standardsWithFiles is EMPTY!`);
      }
    } catch (error) {
      console.log(`✗ Error building Set: ${error.message}`);
    }
  }
  
  // Step 4: Query standards table with the same logic as requirements.js
  console.log('\nSTEP 4: Querying Standards Table');
  console.log('──────────────────────────────────');
  
  let query = `
    SELECT 
      s.id as standard_id,
      s.code,
      s.name,
      s.sector,
      s.uploaded_at
    FROM standards s
    WHERE s.code IS NOT NULL 
      AND TRIM(s.code) != ''
      AND s.uploaded_at IS NOT NULL
      ${hasStandardFiles && standardsWithFiles.size > 0 ? `
      AND s.id = ANY($1)
      ` : ''}
    ORDER BY LOWER(TRIM(s.code)), s.uploaded_at DESC NULLS LAST
  `;
  
  const queryParams = hasStandardFiles && standardsWithFiles.size > 0 
    ? [Array.from(standardsWithFiles)]
    : [];
  
  console.log(`Query params length: ${queryParams.length}`);
  if (queryParams.length > 0) {
    console.log(`Query will filter by ${queryParams[0].length} standard_ids`);
  } else {
    console.log(`⚠️  Query will return ALL standards (no filter)`);
  }
  
  const result = await queryEdcatAI(query, queryParams);
  console.log(`✓ Query returned: ${result.rows.length} standards\n`);
  
  // Step 5: Check if IDs match between databases
  console.log('STEP 5: ID Matching Check');
  console.log('─────────────────────────');
  
  if (result.rows.length > 0 && standardsWithFiles.size > 0) {
    const standardIds = new Set(result.rows.map(r => r.standard_id));
    const fileStandardIds = new Set(standardsWithFiles);
    
    let matches = 0;
    let mismatches = [];
    
    fileStandardIds.forEach(fid => {
      if (standardIds.has(fid)) {
        matches++;
      } else {
        mismatches.push(fid);
      }
    });
    
    console.log(`✓ Matching IDs: ${matches}`);
    console.log(`✗ Mismatched IDs: ${mismatches.length}`);
    
    if (mismatches.length > 0) {
      console.log(`\n✗ CRITICAL: These standard_ids in standard_files don't match any standards:`);
      mismatches.slice(0, 10).forEach(id => {
        console.log(`  - ${id.substring(0, 8)}...`);
      });
    }
    
    // Check reverse: standards that don't have files
    let standardsWithoutFiles = [];
    standardIds.forEach(sid => {
      if (!fileStandardIds.has(sid)) {
        standardsWithoutFiles.push(sid);
      }
    });
    
    if (standardsWithoutFiles.length > 0) {
      console.log(`\n⚠️  Standards without files: ${standardsWithoutFiles.length}`);
      const sampleStandards = result.rows.filter(r => standardsWithoutFiles.includes(r.standard_id));
      sampleStandards.slice(0, 5).forEach(s => {
        console.log(`  - ${s.code} (id: ${s.standard_id.substring(0, 8)}...)`);
      });
    }
  }
  
  // Step 6: Apply the filter logic (simulating requirements.js)
  console.log('\nSTEP 6: Applying Filter Logic');
  console.log('───────────────────────────────');
  
  const filtered = result.rows.filter(row => {
    if (hasStandardFiles) {
      const hasFile = standardsWithFiles.has(row.standard_id);
      if (!hasFile) {
        console.log(`  ✗ Filtered out: ${row.code} (id: ${row.standard_id.substring(0, 8)}... not in standardsWithFiles)`);
      }
      return hasFile;
    }
    return false;
  });
  
  console.log(`\n✓ After filter: ${filtered.length} standards`);
  
  // Step 7: Root Cause Summary
  console.log('\n=== ROOT CAUSE SUMMARY ===');
  console.log('───────────────────────────');
  
  if (filtered.length === 0) {
    if (standardsWithFiles.size === 0) {
      console.log('✗ ROOT CAUSE: standardsWithFiles Set is EMPTY');
      console.log('  → No standard_ids found in standard_files table');
      console.log('  → OR standard_ids in standard_files don\'t match standards.id');
    } else if (result.rows.length === 0) {
      console.log('✗ ROOT CAUSE: Query returned 0 standards');
      console.log('  → The ANY($1) filter is excluding all standards');
      console.log('  → standard_ids in standard_files don\'t match standards.id');
    } else {
      console.log('✗ ROOT CAUSE: All standards filtered out');
      console.log(`  → Query returned ${result.rows.length} standards`);
      console.log(`  → But ${result.rows.length - filtered.length} were filtered out`);
      console.log('  → standard_ids don\'t match between databases');
    }
  } else {
    console.log('✓ Standards should be showing!');
    console.log(`  → ${filtered.length} standards passed all filters`);
  }
  
  process.exit(0);
}

diagnose().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});

