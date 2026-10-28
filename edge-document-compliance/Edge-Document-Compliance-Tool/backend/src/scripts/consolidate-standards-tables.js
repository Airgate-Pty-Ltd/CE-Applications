/**
 * Consolidate standards tables from both databases into PostgreSQL only
 * 
 * This script:
 * 1. Compares standards tables in both databases
 * 2. Merges unique records into PostgreSQL
 * 3. Drops duplicate tables from EDCAT AI DB (or renames as backup)
 * 
 * RUN WITH CAUTION - This modifies production data!
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

async function consolidate() {
  console.log('=== STANDARDS TABLE CONSOLIDATION ===\n');
  console.log('⚠️  This script will consolidate standards tables into PostgreSQL only\n');
  
  // Step 1: Compare standards tables
  console.log('STEP 1: Comparing standards tables...');
  console.log('─────────────────────────────────────');
  
  const pgStandards = await queryPostgres('SELECT id, code, name, sector, uploaded_at FROM public.standards ORDER BY code');
  // NOTE: Checking if public.standards exists in EDCAT AI DB (shouldn't, but checking for duplicates)
  // If it exists, we'll check it, but standards should ONLY be in Customer Data DB (public.*)
  let edcatStandards = { rows: [] };
  try {
    const exists = await queryEdcatAI(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'standards'
      ) as exists
    `);
    if (exists.rows[0]?.exists) {
      console.warn('⚠️  WARNING: public.standards exists in EDCAT AI DB - this is a duplicate that should be removed');
      // Only query if it exists (for cleanup purposes)
      // NOTE: This is checking for DUPLICATE public.standards in EDCAT AI DB (shouldn't exist)
      // We use queryEdcatAI here because we're checking the EDCAT AI DB for duplicates
      edcatStandards = await queryEdcatAI('SELECT id, code, name, sector, uploaded_at FROM public.standards ORDER BY code');
    }
  } catch (e) {
    // Table doesn't exist in EDCAT AI DB (expected)
    console.log('✓ public.standards does not exist in EDCAT AI DB (correct)');
  }
  
  console.log(`PostgreSQL standards: ${pgStandards.rows.length}`);
  console.log(`EDCAT AI standards: ${edcatStandards.rows.length}`);
  
  // Find unique records in EDCAT AI that don't exist in PostgreSQL
  const pgCodes = new Set(pgStandards.rows.map(s => s.code.toLowerCase()));
  const uniqueInEdcat = edcatStandards.rows.filter(s => !pgCodes.has(s.code.toLowerCase()));
  
  console.log(`\nUnique in EDCAT AI (not in PostgreSQL): ${uniqueInEdcat.length}`);
  if (uniqueInEdcat.length > 0) {
    console.log('  Codes:', uniqueInEdcat.map(s => s.code).join(', '));
  }
  
  // Step 2: Compare standard_files tables
  console.log('\n\nSTEP 2: Comparing standard_files tables...');
  console.log('───────────────────────────────────────────');
  
  const pgFiles = await queryPostgres('SELECT id, file_name, standard_id, file_category FROM public.standard_files ORDER BY file_name');
  // NOTE: Checking for duplicates in EDCAT AI DB (shouldn't exist)
  let edcatFiles = { rows: [] };
  try {
    const exists = await queryEdcatAI(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'standard_files'
      ) as exists
    `);
    if (exists.rows[0]?.exists) {
      console.warn('⚠️  WARNING: public.standard_files exists in EDCAT AI DB - this is a duplicate that should be removed');
      // NOTE: This is checking for DUPLICATE public.standard_files in EDCAT AI DB (shouldn't exist)
      // We use queryEdcatAI here because we're checking the EDCAT AI DB for duplicates
      edcatFiles = await queryEdcatAI('SELECT id, file_name, standard_id, file_category FROM public.standard_files ORDER BY file_name');
    }
  } catch (e) {
    console.log('✓ public.standard_files does not exist in EDCAT AI DB (correct)');
  }
  
  console.log(`PostgreSQL files: ${pgFiles.rows.length}`);
  console.log(`EDCAT AI files: ${edcatFiles.rows.length}`);
  
  // Find unique files in EDCAT AI
  const pgFileIds = new Set(pgFiles.rows.map(f => f.id));
  const uniqueFilesInEdcat = edcatFiles.rows.filter(f => !pgFileIds.has(f.id));
  
  console.log(`\nUnique in EDCAT AI (not in PostgreSQL): ${uniqueFilesInEdcat.length}`);
  
  // Step 3: Compare parsed_requirements tables
  console.log('\n\nSTEP 3: Comparing parsed_requirements tables...');
  console.log('───────────────────────────────────────────────');
  
  const pgReqs = await queryPostgres('SELECT id, standard_id, clause_ref, requirement_text FROM public.parsed_requirements ORDER BY standard_id, clause_ref LIMIT 1000');
  // NOTE: Checking for duplicates in EDCAT AI DB (shouldn't exist)
  let edcatReqs = { rows: [] };
  try {
    const exists = await queryEdcatAI(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'parsed_requirements'
      ) as exists
    `);
    if (exists.rows[0]?.exists) {
      console.warn('⚠️  WARNING: public.parsed_requirements exists in EDCAT AI DB - this is a duplicate that should be removed');
      // NOTE: This is checking for DUPLICATE public.parsed_requirements in EDCAT AI DB (shouldn't exist)
      // We use queryEdcatAI here because we're checking the EDCAT AI DB for duplicates
      edcatReqs = await queryEdcatAI('SELECT id, standard_id, clause_ref, requirement_text FROM public.parsed_requirements ORDER BY standard_id, clause_ref LIMIT 1000');
    }
  } catch (e) {
    console.log('✓ public.parsed_requirements does not exist in EDCAT AI DB (correct)');
  }
  
  console.log(`PostgreSQL requirements (sample): ${pgReqs.rows.length}`);
  console.log(`EDCAT AI requirements (sample): ${edcatReqs.rows.length}`);
  
  // Step 4: Migration plan
  console.log('\n\n=== MIGRATION PLAN ===');
  console.log('─────────────────────');
  
  if (uniqueInEdcat.length > 0) {
    console.log(`\n1. Migrate ${uniqueInEdcat.length} unique standards from EDCAT AI to PostgreSQL`);
    console.log('   (This will be done manually or with a separate migration script)');
  }
  
  if (uniqueFilesInEdcat.length > 0) {
    console.log(`\n2. Migrate ${uniqueFilesInEdcat.length} unique files from EDCAT AI to PostgreSQL`);
    console.log('   (This will be done manually or with a separate migration script)');
  }
  
  console.log('\n3. After migration, drop or rename tables in EDCAT AI DB:');
  console.log('   - DROP TABLE public.standards (or rename to standards_backup)');
  console.log('   - DROP TABLE public.standard_files (or rename to standard_files_backup)');
  console.log('   - DROP TABLE public.parsed_requirements (or rename to parsed_requirements_backup)');
  
  console.log('\n4. Update code to use PostgreSQL only:');
  console.log('   - backend/src/routes/requirements.js');
  console.log('   - backend/src/routes/parse.js');
  console.log('   - backend/src/routes/upload.js');
  console.log('   - All scripts that query standards');
  
  console.log('\n\n⚠️  This script only ANALYZES - it does not modify data');
  console.log('   Run with --execute flag to perform actual migration (not implemented yet)');
  
  process.exit(0);
}

consolidate().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});

