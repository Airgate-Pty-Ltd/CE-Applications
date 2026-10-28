/**
 * Diagnostic script to identify why standards are not loading
 * Checks:
 * 1. Are there standards in the database?
 * 2. Are there files in standard_files?
 * 3. Do standard_ids match?
 * 4. Is the API endpoint working?
 */

import { queryPostgres } from '../config/databases.js';
import dotenv from 'dotenv';

dotenv.config();

async function diagnose() {
  console.log('\n🔍 DIAGNOSING STANDARDS NOT LOADING ISSUE\n');
  console.log('='.repeat(60));
  
  try {
    // 1. Check if standards table exists and has data
    console.log('\n1️⃣  Checking standards table...');
    const standardsCheck = await queryPostgres(`
      SELECT COUNT(*) as count
      FROM public.standards
    `);
    const standardsCount = parseInt(standardsCheck.rows[0]?.count || 0);
    console.log(`   ✅ Standards table exists`);
    console.log(`   📊 Total standards in database: ${standardsCount}`);
    
    if (standardsCount > 0) {
      const sampleStandards = await queryPostgres(`
        SELECT id, code, name, uploaded_at, total_clauses, total_requirements
        FROM public.standards
        ORDER BY uploaded_at DESC NULLS LAST
        LIMIT 5
      `);
      console.log(`   📋 Sample standards (first 5):`);
      sampleStandards.rows.forEach((std, idx) => {
        console.log(`      ${idx + 1}. ${std.code} - ${std.name}`);
        console.log(`         ID: ${std.id}`);
        console.log(`         Uploaded: ${std.uploaded_at || 'NULL'}`);
        console.log(`         Clauses: ${std.total_clauses || 0}, Requirements: ${std.total_requirements || 0}`);
      });
    } else {
      console.log(`   ⚠️  NO STANDARDS FOUND IN DATABASE!`);
      console.log(`   💡 This is the root cause - no standards exist yet.`);
    }
    
    // 2. Check if standard_files table exists and has data
    console.log('\n2️⃣  Checking standard_files table...');
    const filesCheck = await queryPostgres(`
      SELECT COUNT(*) as count
      FROM public.standard_files
    `);
    const filesCount = parseInt(filesCheck.rows[0]?.count || 0);
    console.log(`   ✅ Standard_files table exists`);
    console.log(`   📊 Total files in database: ${filesCount}`);
    
    if (filesCount > 0) {
      const filesWithStandardId = await queryPostgres(`
        SELECT COUNT(*) as count
        FROM public.standard_files
        WHERE standard_id IS NOT NULL
      `);
      const filesWithId = parseInt(filesWithStandardId.rows[0]?.count || 0);
      console.log(`   📊 Files with standard_id: ${filesWithId}`);
      console.log(`   📊 Files without standard_id: ${filesCount - filesWithId}`);
      
      if (filesWithId > 0) {
        const sampleFiles = await queryPostgres(`
          SELECT id, file_name, file_category, standard_id, uploaded_at
          FROM public.standard_files
          WHERE standard_id IS NOT NULL
          ORDER BY uploaded_at DESC
          LIMIT 5
        `);
        console.log(`   📋 Sample files with standard_id (first 5):`);
        sampleFiles.rows.forEach((file, idx) => {
          console.log(`      ${idx + 1}. ${file.file_name}`);
          console.log(`         Category: ${file.file_category || 'NULL'}`);
          console.log(`         Standard ID: ${file.standard_id}`);
          console.log(`         Uploaded: ${file.uploaded_at || 'NULL'}`);
        });
      }
      
      // Check file categories
      const categoryCounts = await queryPostgres(`
        SELECT file_category, COUNT(*) as count
        FROM public.standard_files
        WHERE standard_id IS NOT NULL
        GROUP BY file_category
        ORDER BY count DESC
      `);
      console.log(`   📊 Files by category:`);
      categoryCounts.rows.forEach(row => {
        console.log(`      ${row.file_category || 'NULL'}: ${row.count}`);
      });
    } else {
      console.log(`   ⚠️  NO FILES FOUND IN STANDARD_FILES TABLE!`);
    }
    
    // 3. Check if standard_ids match between tables
    console.log('\n3️⃣  Checking standard_id linkage...');
    if (standardsCount > 0 && filesCount > 0) {
      const linkedCount = await queryPostgres(`
        SELECT COUNT(DISTINCT sf.standard_id) as count
        FROM public.standard_files sf
        INNER JOIN public.standards s ON sf.standard_id = s.id
        WHERE sf.standard_id IS NOT NULL
      `);
      const linked = parseInt(linkedCount.rows[0]?.count || 0);
      console.log(`   ✅ Standards with linked files: ${linked}`);
      
      const orphanedFiles = await queryPostgres(`
        SELECT COUNT(*) as count
        FROM public.standard_files sf
        WHERE sf.standard_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.standards s WHERE s.id = sf.standard_id)
      `);
      const orphaned = parseInt(orphanedFiles.rows[0]?.count || 0);
      console.log(`   ⚠️  Files with orphaned standard_ids: ${orphaned}`);
      
      const standardsWithoutFiles = await queryPostgres(`
        SELECT COUNT(*) as count
        FROM public.standards s
        WHERE NOT EXISTS (SELECT 1 FROM public.standard_files sf WHERE sf.standard_id = s.id)
      `);
      const withoutFiles = parseInt(standardsWithoutFiles.rows[0]?.count || 0);
      console.log(`   ⚠️  Standards without files: ${withoutFiles}`);
      
      if (withoutFiles > 0 && linked === 0) {
        console.log(`   💡 ISSUE FOUND: Standards exist but none have linked files!`);
        console.log(`   💡 This would cause the API to return 0 standards.`);
      }
    }
    
    // 4. Test the exact query the API uses
    console.log('\n4️⃣  Testing API query logic...');
    if (filesCount > 0) {
      const filesResult = await queryPostgres(`
        SELECT DISTINCT ON (standard_id)
          standard_id,
          file_category
        FROM public.standard_files
        WHERE standard_id IS NOT NULL
        ORDER BY standard_id, uploaded_at DESC
      `);
      console.log(`   📊 Files query returned: ${filesResult.rows.length} rows`);
      
      if (filesResult.rows.length > 0) {
        const standardIds = filesResult.rows.map(r => r.standard_id);
        console.log(`   📋 Standard IDs found: ${standardIds.length}`);
        
        // Test the main query
        const mainQuery = await queryPostgres(`
          SELECT 
            s.id as standard_id,
            s.code,
            s.name,
            s.sector,
            s.uploaded_at,
            COALESCE(s.total_clauses, s.total_requirements, 0) as total_requirements,
            COALESCE(s.model_version_used, '1.0.0') as model_version_used,
            false as has_learning_data
          FROM public.standards s
          WHERE s.id = ANY($1)
            AND s.code IS NOT NULL 
            AND TRIM(s.code) != ''
            AND s.uploaded_at IS NOT NULL
          ORDER BY LOWER(TRIM(s.code)), s.uploaded_at DESC NULLS LAST
        `, [standardIds]);
        
        console.log(`   📊 Main query returned: ${mainQuery.rows.length} standards`);
        if (mainQuery.rows.length > 0) {
          console.log(`   ✅ API query logic works! Should return ${mainQuery.rows.length} standards`);
          console.log(`   📋 Sample codes: ${mainQuery.rows.slice(0, 5).map(r => r.code).join(', ')}`);
        } else {
          console.log(`   ⚠️  API query returned 0 results despite having ${standardIds.length} standard_ids`);
          console.log(`   💡 Possible causes:`);
          console.log(`      - Standard_ids don't match between tables`);
          console.log(`      - Standards have NULL or empty codes`);
          console.log(`      - Standards don't have uploaded_at set`);
        }
      }
    } else {
      // Test fallback query
      console.log(`   📊 Testing fallback query (no files)...`);
      const fallbackQuery = await queryPostgres(`
        SELECT 
          s.id as standard_id,
          s.code,
          s.name,
          s.sector,
          s.uploaded_at,
          COALESCE(s.total_clauses, s.total_requirements, 0) as total_requirements,
          s.current_model_version as model_version_used,
          false as has_learning_data
        FROM public.standards s
        WHERE s.code IS NOT NULL 
          AND TRIM(s.code) != ''
          AND (s.uploaded_at IS NOT NULL OR EXISTS (SELECT 1 FROM public.standard_files WHERE standard_id = s.id))
        ORDER BY LOWER(TRIM(s.code)), s.uploaded_at DESC NULLS LAST
      `);
      
      console.log(`   📊 Fallback query returned: ${fallbackQuery.rows.length} standards`);
      if (fallbackQuery.rows.length > 0) {
        console.log(`   ✅ Fallback query works! Should return ${fallbackQuery.rows.length} standards`);
        console.log(`   📋 Sample codes: ${fallbackQuery.rows.slice(0, 5).map(r => r.code).join(', ')}`);
      } else {
        console.log(`   ⚠️  Fallback query also returned 0 results`);
        console.log(`   💡 This confirms no standards meet the criteria.`);
      }
    }
    
    // 5. Recommendations
    console.log('\n5️⃣  RECOMMENDATIONS:');
    console.log('='.repeat(60));
    if (standardsCount === 0) {
      console.log('❌ ROOT CAUSE: No standards in database');
      console.log('💡 SOLUTION: Upload standards first using the upload feature');
    } else if (filesCount === 0) {
      console.log('⚠️  ISSUE: No files in standard_files table');
      console.log('💡 SOLUTION: Re-upload standards to create file entries');
    } else if (filesCount > 0 && standardsCount > 0) {
      const linkedCount = await queryPostgres(`
        SELECT COUNT(DISTINCT sf.standard_id) as count
        FROM public.standard_files sf
        INNER JOIN public.standards s ON sf.standard_id = s.id
        WHERE sf.standard_id IS NOT NULL
      `);
      const linked = parseInt(linkedCount.rows[0]?.count || 0);
      
      if (linked === 0) {
        console.log('❌ ROOT CAUSE: Standards exist but no linked files');
        console.log('💡 SOLUTION: Run process-requirements-folder.js to link files to standards');
      } else {
        console.log('✅ Standards and files exist and are linked');
        console.log('💡 Check Railway logs for API endpoint errors');
        console.log('💡 Verify the /api/requirements/standards endpoint is working');
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnosis complete!\n');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

diagnose();

