/**
 * Diagnostic script to identify why standards aren't visible
 * Checks:
 * 1. How many standards exist in PostgreSQL
 * 2. How many entries exist in standard_files
 * 3. How many standard_files entries have standard_id set
 * 4. Which standards have files vs which don't
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

async function diagnoseStandardsVisibility() {
  console.log('\n🔍 Diagnosing Standards Visibility Issue...\n');
  console.log('='.repeat(70));

  try {
    // Step 1: Count standards in PostgreSQL
    console.log('📊 Step 1: Checking PostgreSQL standards table...');
    const standardsCount = await queryPostgres(`
      SELECT COUNT(*) as count FROM public.standards
    `);
    const totalStandards = parseInt(standardsCount.rows[0].count);
    console.log(`   Total standards in PostgreSQL: ${totalStandards}`);

    if (totalStandards > 0) {
      const standardsList = await queryPostgres(`
        SELECT id, code, name, uploaded_at, total_clauses, total_requirements
        FROM public.standards
        ORDER BY uploaded_at DESC
        LIMIT 10
      `);
      console.log(`   Sample standards (first 10):`);
      standardsList.rows.forEach((std, idx) => {
        console.log(`   ${idx + 1}. ${std.code} - ${std.name || 'No name'}`);
        console.log(`      ID: ${std.id}`);
        console.log(`      Uploaded: ${std.uploaded_at || 'NULL'}`);
        console.log(`      Total clauses: ${std.total_clauses || std.total_requirements || 0}`);
      });
    }

    // Step 2: Check standard_files table
    console.log('\n📁 Step 2: Checking standard_files table...');
    const filesTableExists = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'standard_files'
      ) as exists
    `);
    const tableExists = filesTableExists.rows[0]?.exists || false;
    console.log(`   Table exists: ${tableExists}`);

    if (tableExists) {
      const filesCount = await queryPostgres(`
        SELECT COUNT(*) as count FROM public.standard_files
      `);
      const totalFiles = parseInt(filesCount.rows[0].count);
      console.log(`   Total files in standard_files: ${totalFiles}`);

      const filesWithStandardId = await queryPostgres(`
        SELECT COUNT(*) as count FROM public.standard_files WHERE standard_id IS NOT NULL
      `);
      const filesWithId = parseInt(filesWithStandardId.rows[0].count);
      console.log(`   Files with standard_id set: ${filesWithId}`);
      console.log(`   Files with NULL standard_id: ${totalFiles - filesWithId}`);

      if (filesWithId > 0) {
        const sampleFiles = await queryPostgres(`
          SELECT standard_id, file_name, file_category, COUNT(*) as file_count
          FROM public.standard_files
          WHERE standard_id IS NOT NULL
          GROUP BY standard_id, file_name, file_category
          ORDER BY file_count DESC
          LIMIT 10
        `);
        console.log(`   Sample files with standard_id:`);
        sampleFiles.rows.forEach((file, idx) => {
          console.log(`   ${idx + 1}. Standard ID: ${file.standard_id}`);
          console.log(`      File: ${file.file_name}`);
          console.log(`      Category: ${file.file_category}`);
        });
      }

      // Step 3: Check which standards have files
      console.log('\n🔗 Step 3: Checking standard-to-file linkage...');
      const standardsWithFiles = await queryPostgres(`
        SELECT DISTINCT s.id, s.code, s.name, COUNT(sf.id) as file_count
        FROM public.standards s
        LEFT JOIN public.standard_files sf ON sf.standard_id = s.id
        GROUP BY s.id, s.code, s.name
        ORDER BY file_count DESC, s.code
      `);
      
      const standardsWithFilesCount = standardsWithFiles.rows.filter(r => parseInt(r.file_count) > 0).length;
      const standardsWithoutFilesCount = standardsWithFiles.rows.filter(r => parseInt(r.file_count) === 0).length;
      
      console.log(`   Standards WITH files: ${standardsWithFilesCount}`);
      console.log(`   Standards WITHOUT files: ${standardsWithoutFilesCount}`);

      if (standardsWithoutFilesCount > 0) {
        console.log(`\n   ⚠️  Standards without files (won't show in UI):`);
        standardsWithFiles.rows
          .filter(r => parseInt(r.file_count) === 0)
          .slice(0, 10)
          .forEach((std, idx) => {
            console.log(`   ${idx + 1}. ${std.code} - ${std.name || 'No name'}`);
            console.log(`      ID: ${std.id}`);
          });
      }
    } else {
      console.log('   ⚠️  standard_files table does not exist!');
      console.log('   This means NO standards will show in the UI (filtering is too strict)');
    }

    // Step 4: Check what the API would return
    console.log('\n🌐 Step 4: Simulating API endpoint logic...');
    if (!tableExists || filesWithId === 0) {
      console.log('   ❌ API would return: [] (empty array)');
      console.log('   Reason: No files found in standard_files table');
    } else {
      const standardsWithFilesSet = await queryPostgres(`
        SELECT DISTINCT standard_id
        FROM public.standard_files
        WHERE standard_id IS NOT NULL
      `);
      const standardIdsArray = standardsWithFilesSet.rows.map(r => r.standard_id);
      console.log(`   Standards with files (would be queried): ${standardIdsArray.length}`);

      if (standardIdsArray.length > 0) {
        const apiResult = await queryPostgres(`
          SELECT 
            s.id as standard_id,
            s.code,
            s.name,
            s.uploaded_at,
            COALESCE(s.total_clauses, s.total_requirements, 0) as total_requirements
          FROM public.standards s
          WHERE s.code IS NOT NULL 
            AND TRIM(s.code) != ''
            AND s.uploaded_at IS NOT NULL
            AND s.id = ANY($1)
          ORDER BY LOWER(TRIM(s.code))
        `, [standardIdsArray]);

        console.log(`   API would return: ${apiResult.rows.length} standards`);
        if (apiResult.rows.length > 0) {
          console.log(`   Standards that WOULD show:`);
          apiResult.rows.forEach((std, idx) => {
            console.log(`   ${idx + 1}. ${std.code} - ${std.name || 'No name'}`);
          });
        }
      }
    }

    // Step 5: Recommendations
    console.log('\n💡 Step 5: Recommendations...\n');
    
    if (!tableExists) {
      console.log('   ❌ CRITICAL: standard_files table does not exist');
      console.log('   → Run: node backend/src/scripts/create-standard-files-table.js');
      console.log('   → Or ensure migrations have run');
    } else if (filesWithId === 0 && totalStandards > 0) {
      console.log('   ⚠️  WARNING: Standards exist but no files are linked');
      console.log('   → Files in standard_files have NULL standard_id');
      console.log('   → Need to run process-requirements-folder.js to link files to standards');
      console.log('   → OR: Update standard_files entries to set standard_id');
    } else if (standardsWithoutFilesCount > 0) {
      console.log('   ⚠️  WARNING: Some standards have no files');
      console.log('   → These standards will not appear in the UI');
      console.log('   → Options:');
      console.log('     1. Upload files for these standards');
      console.log('     2. Modify filtering logic to show standards without files');
      console.log('     3. Link existing files to these standards');
    } else {
      console.log('   ✅ All standards have files - should be visible');
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
diagnoseStandardsVisibility()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

