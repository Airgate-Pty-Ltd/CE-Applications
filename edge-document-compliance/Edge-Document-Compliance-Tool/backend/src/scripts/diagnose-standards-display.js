/**
 * Diagnostic script to check why standards aren't showing in frontend
 * Checks:
 * 1. Standards in database
 * 2. Files in standard_files
 * 3. Linkage between standards and files
 * 4. Category mapping
 */

import { queryPostgres } from '../config/databases.js';

async function diagnoseStandardsDisplay() {
  console.log('\n🔍 Diagnosing Standards Display Issue...\n');
  console.log('='.repeat(70));

  try {
    // Step 1: Check standards table
    console.log('📋 Step 1: Checking standards table...');
    const standardsCheck = await queryPostgres(`
      SELECT id, code, name, sector, uploaded_at, total_clauses, total_requirements
      FROM public.standards
      ORDER BY uploaded_at DESC
      LIMIT 10
    `);
    
    console.log(`   Found ${standardsCheck.rows.length} standards:`);
    standardsCheck.rows.forEach((std, idx) => {
      console.log(`   ${idx + 1}. ${std.code} - ${std.name || 'No name'}`);
      console.log(`      ID: ${std.id}`);
      console.log(`      Sector: ${std.sector || 'NULL'}`);
      console.log(`      Uploaded: ${std.uploaded_at || 'NULL'}`);
      console.log(`      Clauses: ${std.total_clauses || std.total_requirements || 0}`);
    });

    // Step 2: Check standard_files table
    console.log('\n📁 Step 2: Checking standard_files table...');
    const filesCheck = await queryPostgres(`
      SELECT id, file_name, file_category, standard_id, uploaded_at
      FROM public.standard_files
      ORDER BY uploaded_at DESC
      LIMIT 10
    `);
    
    console.log(`   Found ${filesCheck.rows.length} files:`);
    filesCheck.rows.forEach((file, idx) => {
      console.log(`   ${idx + 1}. ${file.file_name}`);
      console.log(`      File ID: ${file.id}`);
      console.log(`      Standard ID: ${file.standard_id || 'NULL'}`);
      console.log(`      Category: ${file.file_category || 'NULL'}`);
      console.log(`      Uploaded: ${file.uploaded_at || 'NULL'}`);
    });

    // Step 3: Check linkage
    console.log('\n🔗 Step 3: Checking linkage between standards and files...');
    const linkageCheck = await queryPostgres(`
      SELECT 
        s.id as standard_id,
        s.code,
        s.name,
        sf.id as file_id,
        sf.file_name,
        sf.file_category
      FROM public.standards s
      LEFT JOIN public.standard_files sf ON s.id = sf.standard_id
      ORDER BY s.uploaded_at DESC
      LIMIT 10
    `);
    
    console.log(`   Found ${linkageCheck.rows.length} standards with file linkage:`);
    linkageCheck.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.code} - ${row.name || 'No name'}`);
      if (row.file_id) {
        console.log(`      ✅ Has file: ${row.file_name} (category: ${row.file_category || 'NULL'})`);
      } else {
        console.log(`      ❌ No file linked`);
      }
    });

    // Step 4: Simulate API query
    console.log('\n🌐 Step 4: Simulating API query for category=standard...');
    const apiSimulation = await queryPostgres(`
      SELECT DISTINCT ON (sf.standard_id)
        sf.standard_id,
        sf.file_category
      FROM public.standard_files sf
      WHERE sf.standard_id IS NOT NULL
      ORDER BY sf.standard_id, sf.uploaded_at DESC
    `);
    
    console.log(`   Found ${apiSimulation.rows.length} standards with files:`);
    const standardIdsWithFiles = apiSimulation.rows.map(r => r.standard_id);
    const categoryMap = new Map();
    apiSimulation.rows.forEach(row => {
      categoryMap.set(row.standard_id, row.file_category);
    });
    
    if (standardIdsWithFiles.length > 0) {
      const standardsQuery = await queryPostgres(`
        SELECT 
          s.id as standard_id,
          s.code,
          s.name,
          s.sector,
          s.uploaded_at,
          COALESCE(s.total_clauses, s.total_requirements, 0) as total_requirements
        FROM public.standards s
        WHERE s.code IS NOT NULL 
          AND TRIM(s.code) != ''
          AND s.uploaded_at IS NOT NULL
          AND s.id = ANY($1)
        ORDER BY LOWER(TRIM(s.code)), s.uploaded_at DESC NULLS LAST
      `, [standardIdsWithFiles]);
      
      console.log(`   Query returned ${standardsQuery.rows.length} standards:`);
      standardsQuery.rows.forEach((std, idx) => {
        const fileCategory = categoryMap.get(std.standard_id) || 'unknown';
        const matchesStandard = fileCategory === 'standard' || fileCategory === 'standards';
        console.log(`   ${idx + 1}. ${std.code} - ${std.name || 'No name'}`);
        console.log(`      fileCategory: ${fileCategory}`);
        console.log(`      Matches 'standard' filter: ${matchesStandard ? '✅' : '❌'}`);
      });
    } else {
      console.log(`   ⚠️  No standards with files found!`);
    }

    // Step 5: Check for NULL standard_id in files
    console.log('\n⚠️  Step 5: Checking for files without standard_id...');
    const nullStandardIdCheck = await queryPostgres(`
      SELECT COUNT(*) as count
      FROM public.standard_files
      WHERE standard_id IS NULL
    `);
    const nullCount = parseInt(nullStandardIdCheck.rows[0].count);
    if (nullCount > 0) {
      console.log(`   ⚠️  Found ${nullCount} files with NULL standard_id!`);
      console.log(`   These files won't be linked to any standard.`);
    } else {
      console.log(`   ✅ All files have standard_id`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Diagnosis complete!\n');

  } catch (error) {
    console.error('\n❌ Diagnosis failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run diagnosis
diagnoseStandardsDisplay()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

