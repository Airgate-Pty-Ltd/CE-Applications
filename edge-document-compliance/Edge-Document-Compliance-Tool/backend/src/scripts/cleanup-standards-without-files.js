/**
 * Cleanup Standards Without Files
 * 
 * This script removes standards that don't have actual files uploaded.
 * It checks both the database records and verifies files exist on disk.
 * 
 * What it does:
 * 1. Finds all standards in EDCAT AI DB
 * 2. Checks if they have entries in standard_files table (Customer Data DB)
 * 3. Verifies the actual files exist on disk
 * 4. Removes standards that don't have files or have missing files
 * 5. Cleans up related data (parsed_requirements, document_content_for_learning, etc.)
 */

import { query, queryEdcatAI } from '../database/connection.js';
import fs from 'fs';
import path from 'path';

/**
 * Main cleanup function
 */
async function cleanupStandardsWithoutFiles() {
  console.log('\n🧹 Cleaning up standards without actual files...\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Get all standards from EDCAT AI DB
    console.log('\n📋 Step 1: Getting all standards from EDCAT AI DB...');
    const allStandards = await queryEdcatAI(
      `SELECT id, code, name, uploaded_at, total_clauses 
       FROM standards 
       WHERE code IS NOT NULL 
       ORDER BY uploaded_at DESC`
    );
    
    console.log(`   Found ${allStandards.rows.length} standards in database`);
    
    if (allStandards.rows.length === 0) {
      console.log('   ✅ No standards to check');
      return;
    }
    
    // Step 2: Check if standard_files table exists
    console.log('\n📋 Step 2: Checking standard_files table...');
    let hasStandardFiles = false;
    let standardsWithFiles = new Map(); // Map: standard_id -> file info
    
    try {
      const tableCheck = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'standard_files'
        ) as exists
      `);
      hasStandardFiles = tableCheck.rows[0]?.exists || false;
      
      if (hasStandardFiles) {
        // Get all files from standard_files table
        const filesResult = await query(`
          SELECT standard_id, file_path, file_name, file_category
          FROM public.standard_files
          WHERE standard_id IS NOT NULL
          ORDER BY standard_id, uploaded_at DESC
        `);
        
        console.log(`   Found ${filesResult.rows.length} file records in standard_files table`);
        
        // Group by standard_id (take the most recent file for each standard)
        const filesByStandard = new Map();
        filesResult.rows.forEach(row => {
          if (row.standard_id && !filesByStandard.has(row.standard_id)) {
            filesByStandard.set(row.standard_id, {
              file_path: row.file_path,
              file_name: row.file_name,
              file_category: row.file_category
            });
          }
        });
        
        // Verify files exist on disk
        for (const [standardId, fileInfo] of filesByStandard.entries()) {
          const filePath = fileInfo.file_path;
          if (filePath && fs.existsSync(filePath)) {
            standardsWithFiles.set(standardId, fileInfo);
          } else {
            console.log(`   ⚠️  File missing for standard_id ${standardId}: ${filePath}`);
          }
        }
        
        console.log(`   ✅ ${standardsWithFiles.size} standards have valid files on disk`);
      } else {
        console.log('   ⚠️  standard_files table does not exist');
      }
    } catch (filesError) {
      console.log(`   ⚠️  Error checking standard_files: ${filesError.message}`);
    }
    
    // Step 3: Identify standards without files
    console.log('\n📋 Step 3: Identifying standards without files...');
    const standardsToRemove = [];
    
    for (const standard of allStandards.rows) {
      const hasFile = standardsWithFiles.has(standard.id);
      
      if (!hasFile) {
        standardsToRemove.push(standard);
        console.log(`   ❌ ${standard.code} (${standard.name}) - No file record or file missing`);
      } else {
        console.log(`   ✅ ${standard.code} (${standard.name}) - Has valid file`);
      }
    }
    
    if (standardsToRemove.length === 0) {
      console.log('\n   ✅ All standards have valid files!');
      return;
    }
    
    // Step 4: Confirm deletion
    console.log(`\n🗑️  Step 4: Found ${standardsToRemove.length} standards to remove:`);
    standardsToRemove.forEach((std, idx) => {
      console.log(`   ${idx + 1}. ${std.code} - ${std.name} (ID: ${std.id})`);
    });
    
    // Step 5: Delete standards and related data
    console.log('\n🗑️  Step 5: Removing standards and related data...');
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const standard of standardsToRemove) {
      try {
        const standardId = standard.id;
        const standardCode = standard.code;
        
        // Delete from parsed_requirements (EDCAT AI DB)
        const reqResult = await queryEdcatAI(
          `DELETE FROM parsed_requirements WHERE standard_id = $1`,
          [standardId]
        );
        console.log(`   ✓ Deleted ${reqResult.rowCount || 0} requirements for ${standardCode}`);
        
        // Delete from document_content_for_learning (EDCAT AI DB)
        try {
          const learningResult = await queryEdcatAI(
            `DELETE FROM document_content_for_learning 
             WHERE standard_id = $1 OR standard_code = $2`,
            [standardId, standardCode]
          );
          console.log(`   ✓ Deleted ${learningResult.rowCount || 0} learning records for ${standardCode}`);
        } catch (learningError) {
          // Table might not exist, that's okay
          console.log(`   ℹ️  Could not delete learning records (table may not exist)`);
        }
        
        // Delete from example_documents (EDCAT AI DB)
        try {
          const exampleResult = await queryEdcatAI(
            `DELETE FROM example_documents 
             WHERE standard_id = $1 OR standard_code = $2`,
            [standardId, standardCode]
          );
          console.log(`   ✓ Deleted ${exampleResult.rowCount || 0} example records for ${standardCode}`);
        } catch (exampleError) {
          // Table might not exist, that's okay
          console.log(`   ℹ️  Could not delete example records (table may not exist)`);
        }
        
        // Delete from standards table (EDCAT AI DB)
        const stdResult = await queryEdcatAI(
          `DELETE FROM standards WHERE id = $1`,
          [standardId]
        );
        console.log(`   ✓ Deleted standard ${standardCode} from standards table`);
        
        // Delete from standard_files (Customer Data DB) if it exists
        if (hasStandardFiles) {
          try {
            const fileResult = await query(
              `DELETE FROM public.standard_files WHERE standard_id = $1`,
              [standardId]
            );
            console.log(`   ✓ Deleted ${fileResult.rowCount || 0} file records for ${standardCode}`);
          } catch (fileError) {
            console.log(`   ⚠️  Could not delete file records: ${fileError.message}`);
          }
        }
        
        deletedCount++;
        
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error deleting ${standard.code}: ${error.message}`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Cleanup Summary:');
    console.log(`   ✅ Successfully removed: ${deletedCount} standards`);
    console.log(`   ❌ Errors: ${errorCount} standards`);
    console.log(`   📋 Remaining standards: ${allStandards.rows.length - deletedCount}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupStandardsWithoutFiles()
    .then(() => {
      console.log('\n✅ Cleanup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Cleanup failed:', error);
      process.exit(1);
    });
}

export { cleanupStandardsWithoutFiles };

