/**
 * Remove duplicate standards tables from EDCAT AI DB
 * Keep PostgreSQL as single source of truth
 * 
 * This script will:
 * 1. Rename duplicate tables in EDCAT AI DB to _backup (safer than dropping)
 * 2. Verify PostgreSQL tables are intact
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

async function removeDuplicates() {
  console.log('=== REMOVING DUPLICATE TABLES FROM EDCAT AI DB ===\n');
  console.log('⚠️  This will rename tables in EDCAT AI DB to _backup\n');
  
  const tablesToRename = [
    'standards',
    'standard_files',
    'parsed_requirements'
  ];
  
  // Step 1: Verify PostgreSQL tables exist and have data
  console.log('STEP 1: Verifying PostgreSQL tables...');
  console.log('───────────────────────────────────────');
  
  for (const tableName of tablesToRename) {
    try {
      const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${tableName}`);
      console.log(`✓ PostgreSQL.${tableName}: ${count.rows[0].count} rows`);
    } catch (error) {
      console.log(`✗ PostgreSQL.${tableName}: ERROR - ${error.message}`);
      console.log('  ⚠️  Cannot proceed - PostgreSQL table missing!');
      process.exit(1);
    }
  }
  
  // Step 2: Rename tables in EDCAT AI DB
  console.log('\n\nSTEP 2: Renaming duplicate tables in EDCAT AI DB...');
  console.log('───────────────────────────────────────────────────');
  
  for (const tableName of tablesToRename) {
    const backupName = `${tableName}_backup_${Date.now()}`;
    
    try {
      // Check if table exists
      const exists = await queryEdcatAI(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        ) as exists
      `);
      
      if (exists.rows[0].exists) {
        // NOTE: This is a cleanup script checking for duplicate public.* tables in EDCAT AI DB
        // These tables shouldn't exist in EDCAT AI DB - they should only be in Customer Data DB
        // Get row count before rename (for logging only)
        try {
          const count = await queryEdcatAI(`SELECT COUNT(*) as count FROM public.${tableName}`);
          console.log(`  ${tableName}: ${count.rows[0].count} rows (duplicate - should be removed)`);
        } catch (e) {
          console.log(`  ${tableName}: exists but cannot query (${e.message})`);
        }
        
        // Rename table to backup (safer than dropping)
        await queryEdcatAI(`ALTER TABLE public.${tableName} RENAME TO ${backupName}`);
        console.log(`  ✓ Renamed ${tableName} → ${backupName}`);
      } else {
        console.log(`  ✓ ${tableName} does not exist in EDCAT AI DB (correct - only in Customer Data DB)`);
      }
    } catch (error) {
      console.log(`  ✗ Error renaming ${tableName}: ${error.message}`);
    }
  }
  
  // Step 3: Verify tables are renamed
  console.log('\n\nSTEP 3: Verifying tables are renamed...');
  console.log('───────────────────────────────────────');
  
  for (const tableName of tablesToRename) {
    try {
      const exists = await queryEdcatAI(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        ) as exists
      `);
      
      if (exists.rows[0].exists) {
        console.log(`  ✗ ${tableName} still exists in EDCAT AI DB!`);
      } else {
        console.log(`  ✓ ${tableName} successfully removed from EDCAT AI DB`);
      }
    } catch (error) {
      console.log(`  ⚠️  Could not verify ${tableName}: ${error.message}`);
    }
  }
  
  console.log('\n\n=== COMPLETE ===');
  console.log('────────────────');
  console.log('✓ Duplicate tables renamed in EDCAT AI DB');
  console.log('✓ PostgreSQL tables remain intact');
  console.log('\n⚠️  Next: Update code to use PostgreSQL only');
  console.log('   See ROOT_CAUSE_AND_FIX.md for files to update');
  
  process.exit(0);
}

removeDuplicates().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});

