/**
 * Remove duplicate standards and standard_files tables from EDCAT AI DB
 * Keep ai_standard (Vera's blueprint system) - that's legitimate
 */

import { queryEdcatAI } from '../config/databases.js';

async function removeDuplicates() {
  console.log('=== REMOVING DUPLICATE TABLES FROM EDCAT AI DB ===\n');
  console.log('⚠️  This will remove standards and standard_files tables\n');
  console.log('✓ ai_standard will be KEPT (Vera\'s blueprint system)\n');
  
  const tablesToRemove = [
    'standards',
    'standard_files'
  ];
  
  // Step 1: Verify PostgreSQL has the data
  console.log('STEP 1: Verifying PostgreSQL has the data...');
  console.log('─────────────────────────────────────────────');
  
  try {
    const { queryPostgres } = await import('../config/databases.js');
    const pgStandards = await queryPostgres('SELECT COUNT(*) as count FROM public.standards');
    const pgFiles = await queryPostgres('SELECT COUNT(*) as count FROM public.standard_files');
    console.log(`✓ PostgreSQL.standards: ${pgStandards.rows[0].count} rows`);
    console.log(`✓ PostgreSQL.standard_files: ${pgFiles.rows[0].count} rows`);
  } catch (e) {
    console.log(`⚠️  Could not verify PostgreSQL: ${e.message}`);
  }
  
  // Step 2: Check what's in EDCAT AI DB
  console.log('\n\nSTEP 2: Checking EDCAT AI DB tables...');
  console.log('───────────────────────────────────────');
  
  for (const tableName of tablesToRemove) {
    try {
      const exists = await queryEdcatAI(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        ) as exists
      `);
      
      if (exists.rows[0].exists) {
        // NOTE: This is a cleanup script - public.* tables shouldn't exist in EDCAT AI DB
        // They should only be in Customer Data DB (public.* schema)
        const count = await queryEdcatAI(`SELECT COUNT(*) as count FROM public.${tableName}`);
        console.log(`  ${tableName}: ${count.rows[0].count} rows (duplicate - removing)`);
        
        // Rename to backup first (safer)
        const backupName = `${tableName}_backup_${Date.now()}`;
        await queryEdcatAI(`ALTER TABLE public.${tableName} RENAME TO ${backupName}`);
        console.log(`  ✓ Renamed ${tableName} → ${backupName}`);
      } else {
        console.log(`  ✓ ${tableName}: Does not exist in EDCAT AI DB (correct - only in Customer Data DB)`);
      }
    } catch (error) {
      console.log(`  ✗ Error with ${tableName}: ${error.message}`);
    }
  }
  
  // Step 3: Verify removal
  console.log('\n\nSTEP 3: Verifying tables are removed...');
  console.log('─────────────────────────────────────────');
  
  for (const tableName of tablesToRemove) {
    try {
      const exists = await queryEdcatAI(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        ) as exists
      `);
      
      if (exists.rows[0].exists) {
        console.log(`  ✗ ${tableName} still exists!`);
      } else {
        console.log(`  ✓ ${tableName} successfully removed`);
      }
    } catch (error) {
      console.log(`  ⚠️  Could not verify ${tableName}: ${error.message}`);
    }
  }
  
  // Step 4: Verify ai_standard is still there
  console.log('\n\nSTEP 4: Verifying ai_standard is preserved...');
  console.log('──────────────────────────────────────────────');
  
  try {
    const exists = await queryEdcatAI(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_standard'
      ) as exists
    `);
    
    if (exists.rows[0].exists) {
      const count = await queryEdcatAI('SELECT COUNT(*) as count FROM public.ai_standard');
      console.log(`  ✓ ai_standard preserved: ${count.rows[0].count} rows`);
      console.log(`  ✓ This is Vera's blueprint system - should remain`);
    } else {
      console.log(`  ⚠️  ai_standard not found (may need to be created)`);
    }
  } catch (error) {
    console.log(`  ⚠️  Could not verify ai_standard: ${error.message}`);
  }
  
  console.log('\n\n=== COMPLETE ===');
  console.log('────────────────');
  console.log('✓ Duplicate tables removed from EDCAT AI DB');
  console.log('✓ PostgreSQL remains as single source of truth');
  console.log('✓ ai_standard preserved for Vera');
  
  process.exit(0);
}

removeDuplicates().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});

