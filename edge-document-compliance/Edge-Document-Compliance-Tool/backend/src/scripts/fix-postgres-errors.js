/**
 * Fix PostgreSQL database errors
 * 1. Ensure standard_files table exists
 * 2. Re-process files from Requirements folder to restore data
 */

import { queryPostgres } from '../config/databases.js';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

async function fixErrors() {
  console.log('=== FIXING POSTGRESQL ERRORS ===\n');
  
  const errors = [];
  
  // Step 1: Verify standard_files table exists
  console.log('STEP 1: Verifying standard_files table...');
  console.log('─────────────────────────────────────────');
  
  try {
    const exists = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'standard_files'
      ) as exists
    `);
    
    if (!exists.rows[0].exists) {
      console.log('❌ Table does not exist - creating...');
      // Import and run the create script
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      await execAsync('node backend/src/scripts/create-standard-files-table.js');
      console.log('✅ Table created');
    } else {
      console.log('✅ Table exists');
    }
  } catch (e) {
    errors.push(`Failed to create standard_files: ${e.message}`);
    console.log(`❌ Error: ${e.message}`);
  }
  
  // Step 2: Check current data
  console.log('\n\nSTEP 2: Checking current data...');
  console.log('───────────────────────────────');
  
  const standardsCount = await queryPostgres('SELECT COUNT(*) as count FROM public.standards');
  const filesCount = await queryPostgres('SELECT COUNT(*) as count FROM public.standard_files');
  
  console.log(`Standards: ${standardsCount.rows[0].count} rows`);
  console.log(`Files: ${filesCount.rows[0].count} rows`);
  
  if (standardsCount.rows[0].count === 0) {
    console.log('\n⚠️  WARNING: No standards in database!');
    console.log('   Data needs to be restored by processing files from Requirements folder');
    errors.push('No standards data - need to run process-requirements-folder.js');
  }
  
  if (filesCount.rows[0].count === 0) {
    console.log('\n⚠️  WARNING: No files in standard_files table!');
    console.log('   Files need to be registered by processing Requirements folder');
    errors.push('No files data - need to run process-requirements-folder.js');
  }
  
  // Step 3: Check Requirements folder
  console.log('\n\nSTEP 3: Checking Requirements folder...');
  console.log('─────────────────────────────────────');
  
  const requirementsPath = join(process.cwd(), 'backend', 'EDCAT AIP', 'Requirements');
  
  if (!existsSync(requirementsPath)) {
    console.log(`❌ Requirements folder not found: ${requirementsPath}`);
    errors.push('Requirements folder not found');
  } else {
    console.log(`✓ Folder exists: ${requirementsPath}`);
    
    try {
      const standardsDir = join(requirementsPath, 'Standards');
      if (existsSync(standardsDir)) {
        const files = await readdir(standardsDir);
        const fileCount = files.filter(f => 
          f.endsWith('.pdf') || f.endsWith('.docx') || f.endsWith('.doc')
        ).length;
        console.log(`  Standards folder: ${fileCount} document files`);
      }
      
      const regulatoryDir = join(requirementsPath, 'Regulatory');
      if (existsSync(regulatoryDir)) {
        const files = await readdir(regulatoryDir);
        const fileCount = files.filter(f => 
          f.endsWith('.pdf') || f.endsWith('.docx') || f.endsWith('.doc')
        ).length;
        console.log(`  Regulatory folder: ${fileCount} document files`);
      }
      
      const customerDir = join(requirementsPath, 'Customer');
      if (existsSync(customerDir)) {
        const files = await readdir(customerDir);
        const fileCount = files.filter(f => 
          f.endsWith('.pdf') || f.endsWith('.docx') || f.endsWith('.doc')
        ).length;
        console.log(`  Customer folder: ${fileCount} document files`);
      }
    } catch (e) {
      console.log(`  ⚠️  Could not read folder: ${e.message}`);
    }
  }
  
  // Summary
  console.log('\n\n=== ERROR SUMMARY ===');
  console.log('─────────────────────');
  
  if (errors.length > 0) {
    console.log('❌ ERRORS FOUND:');
    errors.forEach(e => console.log(`  - ${e}`));
    console.log('\n🔧 RECOMMENDED FIX:');
    console.log('   Run: node backend/src/scripts/process-requirements-folder.js');
    console.log('   This will re-process all files and restore data');
  } else {
    console.log('✅ No critical errors found');
  }
  
  // Additional checks
  console.log('\n\n=== ADDITIONAL CHECKS ===');
  console.log('─────────────────────────');
  
  // Check for orphaned data
  try {
    const orphanedFiles = await queryPostgres(`
      SELECT COUNT(*) as count 
      FROM public.standard_files sf
      WHERE sf.standard_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.standards s WHERE s.id = sf.standard_id
      )
    `);
    
    if (orphanedFiles.rows[0].count > 0) {
      console.log(`⚠️  ${orphanedFiles.rows[0].count} orphaned files (standard_id doesn't exist)`);
    } else {
      console.log('✅ No orphaned files');
    }
  } catch (e) {
    // Table might not exist yet
  }
  
  // Check for standards without files
  try {
    const standardsWithoutFiles = await queryPostgres(`
      SELECT COUNT(*) as count 
      FROM public.standards s
      WHERE NOT EXISTS (
        SELECT 1 FROM public.standard_files sf WHERE sf.standard_id = s.id
      )
    `);
    
    if (standardsWithoutFiles.rows[0].count > 0) {
      console.log(`⚠️  ${standardsWithoutFiles.rows[0].count} standards have no files`);
    } else {
      console.log('✅ All standards have files');
    }
  } catch (e) {
    // Table might not exist yet
  }
  
  process.exit(errors.length > 0 ? 1 : 0);
}

fixErrors().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});

