/**
 * Cleanup Examples Folder Errors
 * 
 * This script removes all standards and files that were incorrectly added
 * from the Examples folder. Examples should NOT be in the compliance library.
 * 
 * What it does:
 * 1. Finds all files in standard_files where file_path contains "Examples"
 * 2. Finds all standards that were created only from Examples folder
 * 3. Removes those files and standards from the database
 * 4. Cleans up related data in example_documents and document_content_for_learning
 */

import { query, queryEdcatAI } from '../database/connection.js';

/**
 * Main cleanup function
 */
async function cleanupExamplesFolderErrors() {
  console.log('\n🧹 Cleaning up incorrectly added Examples folder items...\n');
  console.log('='.repeat(60));
  
  try {
    // Check if standard_files table exists
    console.log('\n📋 Step 0: Checking if standard_files table exists...');
    const tableCheck = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'standard_files'
      )`
    );
    
    if (!tableCheck.rows[0].exists) {
      console.log('   ⚠️  standard_files table does not exist in Customer Data DB');
      console.log('   Checking EDCAT AI DB for standards that might have been created from Examples...');
      
      // Check standards table in EDCAT AI DB for any suspicious entries
      // We can't easily identify Examples-based standards, but we can check if there are
      // standards that shouldn't be there (like procedures, work instructions, etc.)
      const allStandards = await queryEdcatAI(
        `SELECT code, name, uploaded_at FROM standards ORDER BY uploaded_at DESC LIMIT 50`
      );
      
      console.log(`   Found ${allStandards.rows.length} standards in EDCAT AI DB`);
      
      if (allStandards.rows.length > 0) {
        console.log('\n   Recent standards (checking for Examples-based entries)...');
        
        // Identify standards that look like they came from Examples folder
        // Patterns: R_200_*, procedures, playbooks, work instructions, forms, etc.
        const examplesPatterns = [
          /^R_200_/i,           // R-200 series (playbooks, guides)
          /playbook/i,
          /procedure/i,
          /work instruction/i,
          /form/i,
          /template/i,
          /guide/i,
          /how to/i,
          /maintaining/i,
          /integrating/i,
          /writing a/i,
          /top 10/i,
          /lessons learned/i,
          /customize/i
        ];
        
        const examplesStandards = allStandards.rows.filter(std => {
          const code = std.code || '';
          const name = std.name || '';
          const combined = `${code} ${name}`.toLowerCase();
          return examplesPatterns.some(pattern => pattern.test(combined));
        });
        
        if (examplesStandards.length > 0) {
          console.log(`\n   ⚠️  Found ${examplesStandards.length} standards that appear to be from Examples folder:`);
          examplesStandards.forEach((std, idx) => {
            console.log(`   ${idx + 1}. ${std.code} - ${std.name}`);
          });
          
          console.log('\n   🗑️  These will be removed from the compliance library...');
          
          // Delete these standards
          const standardIdsToDelete = examplesStandards.map(s => {
            // We need to get the ID - let's query for it
            return null; // Will query below
          });
          
          // Get IDs for the standards to delete
          const codesToDelete = examplesStandards.map(s => s.code);
          const standardsWithIds = await queryEdcatAI(
            `SELECT id, code, name FROM standards WHERE code = ANY($1::text[])`,
            [codesToDelete]
          );
          
          if (standardsWithIds.rows.length > 0) {
            const idsToDelete = standardsWithIds.rows.map(s => s.id);
            
            // Delete from document_content_for_learning
            const deletedContent = await queryEdcatAI(
              `DELETE FROM document_content_for_learning 
               WHERE standard_id = ANY($1::uuid[])`,
              [idsToDelete]
            );
            console.log(`   ✅ Deleted ${deletedContent.rowCount || 0} learning content records`);
            
            // Delete from example_documents
            const deletedExamples = await queryEdcatAI(
              `DELETE FROM example_documents 
               WHERE standard_id = ANY($1::uuid[])`,
              [idsToDelete]
            );
            console.log(`   ✅ Deleted ${deletedExamples.rowCount || 0} example document records`);
            
            // Delete standards
            const deletedStandards = await queryEdcatAI(
              `DELETE FROM standards 
               WHERE id = ANY($1::uuid[])`,
              [idsToDelete]
            );
            console.log(`   ✅ Deleted ${deletedStandards.rowCount || 0} standards from EDCAT AI DB`);
            
            console.log('\n✅ Cleanup complete! Removed Examples-based standards from compliance library.');
          }
        } else {
          console.log('\n   ✅ No Examples-based standards found in the recent list.');
          console.log('   All standards appear to be legitimate compliance standards.');
        }
      }
      
      console.log('\n✅ Cleanup check complete.');
      return;
    }
    console.log('   ✅ standard_files table exists');
    
    // Step 1: Find all files from Examples folder
    console.log('\n📋 Step 1: Finding files from Examples folder...');
    const exampleFiles = await query(
      `SELECT id, file_name, file_path, standard_id 
       FROM public.standard_files 
       WHERE file_path LIKE '%Examples%' OR file_path LIKE '%/Examples/%' OR file_path LIKE '%\\Examples\\%'`
    );
    
    console.log(`   Found ${exampleFiles.rows.length} files from Examples folder`);
    
    if (exampleFiles.rows.length === 0) {
      console.log('\n✅ No files from Examples folder found. Nothing to clean up.');
      return;
    }
    
    // Show what will be deleted
    console.log('\n   Files to be removed:');
    exampleFiles.rows.forEach((file, idx) => {
      console.log(`   ${idx + 1}. ${file.file_name} (${file.file_path})`);
    });
    
    // Step 2: Find standards that only have files from Examples folder
    console.log('\n📋 Step 2: Finding standards created from Examples folder...');
    const standardIds = [...new Set(exampleFiles.rows.map(f => f.standard_id))];
    
    console.log(`   Found ${standardIds.length} unique standards`);
    
    // Check which standards ONLY have files from Examples (should be deleted)
    const standardsToDelete = [];
    for (const standardId of standardIds) {
      const allFiles = await query(
        `SELECT COUNT(*) as total, 
                SUM(CASE WHEN file_path LIKE '%Examples%' OR file_path LIKE '%/Examples/%' OR file_path LIKE '%\\Examples\\%' THEN 1 ELSE 0 END) as examples_count
         FROM public.standard_files 
         WHERE standard_id = $1`,
        [standardId]
      );
      
      const { total, examples_count } = allFiles.rows[0];
      if (parseInt(total) === parseInt(examples_count)) {
        // This standard only has files from Examples - should be deleted
        const standardInfo = await queryEdcatAI(
          `SELECT code, name FROM standards WHERE id = $1`,
          [standardId]
        );
        if (standardInfo.rows.length > 0) {
          standardsToDelete.push({
            id: standardId,
            code: standardInfo.rows[0].code,
            name: standardInfo.rows[0].name
          });
        }
      }
    }
    
    console.log(`   Found ${standardsToDelete.length} standards that should be deleted (only have Examples files)`);
    if (standardsToDelete.length > 0) {
      console.log('\n   Standards to be deleted:');
      standardsToDelete.forEach((std, idx) => {
        console.log(`   ${idx + 1}. ${std.code} - ${std.name}`);
      });
    }
    
    // Step 3: Delete files from standard_files
    console.log('\n🗑️  Step 3: Deleting files from standard_files...');
    const fileIds = exampleFiles.rows.map(f => f.id);
    
    // Delete from document_content_for_learning first (foreign key)
    console.log('   Deleting from document_content_for_learning...');
    const deletedContent = await queryEdcatAI(
      `DELETE FROM document_content_for_learning 
       WHERE file_id = ANY($1::uuid[])`,
      [fileIds]
    );
    console.log(`   ✅ Deleted ${deletedContent.rowCount || 0} learning content records`);
    
    // Delete from example_documents
    console.log('   Deleting from example_documents...');
    const deletedExamples = await queryEdcatAI(
      `DELETE FROM example_documents 
       WHERE file_id = ANY($1::uuid[])`,
      [fileIds]
    );
    console.log(`   ✅ Deleted ${deletedExamples.rowCount || 0} example document records`);
    
    // Delete files from standard_files
    const deletedFiles = await query(
      `DELETE FROM public.standard_files 
       WHERE id = ANY($1::uuid[])`,
      [fileIds]
    );
    console.log(`   ✅ Deleted ${deletedFiles.rowCount || 0} files from standard_files`);
    
    // Step 4: Delete standards that only had Examples files
    if (standardsToDelete.length > 0) {
      console.log('\n🗑️  Step 4: Deleting standards that only had Examples files...');
      const standardIdsToDelete = standardsToDelete.map(s => s.id);
      
      // Delete from document_content_for_learning (by standard_id)
      const deletedContentByStd = await queryEdcatAI(
        `DELETE FROM document_content_for_learning 
         WHERE standard_id = ANY($1::uuid[])`,
        [standardIdsToDelete]
      );
      console.log(`   ✅ Deleted ${deletedContentByStd.rowCount || 0} learning content records by standard_id`);
      
      // Delete from example_documents (by standard_id)
      const deletedExamplesByStd = await queryEdcatAI(
        `DELETE FROM example_documents 
         WHERE standard_id = ANY($1::uuid[])`,
        [standardIdsToDelete]
      );
      console.log(`   ✅ Deleted ${deletedExamplesByStd.rowCount || 0} example document records by standard_id`);
      
      // Delete standards
      const deletedStandards = await queryEdcatAI(
        `DELETE FROM standards 
         WHERE id = ANY($1::uuid[])`,
        [standardIdsToDelete]
      );
      console.log(`   ✅ Deleted ${deletedStandards.rowCount || 0} standards from EDCAT AI DB`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Cleanup Complete!');
    console.log(`   Files removed: ${exampleFiles.rows.length}`);
    console.log(`   Standards removed: ${standardsToDelete.length}`);
    console.log('\n💡 The Examples folder will no longer be processed by the requirements script.');
    console.log('   Examples should only be used for learning, not added to compliance library.');
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    console.error(error.stack);
    throw error;
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.includes('cleanup-examples-folder-errors.js') ||
                     process.argv[1]?.endsWith('cleanup-examples-folder-errors.js');

if (isMainModule || !process.env.NODE_ENV) {
  console.log(`[cleanup-examples] Starting cleanup script...`);
  
  cleanupExamplesFolderErrors()
    .then(() => {
      console.log('\n✅ Cleanup script execution complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      console.error(error.stack);
      process.exit(1);
    });
} else {
  console.log(`[cleanup-examples] Script loaded as module (not executing)`);
}

export { cleanupExamplesFolderErrors };

