/**
 * Cleanup backup tables after successful restore
 * This removes the backup tables that were created when we renamed duplicates
 */

import { queryPostgres } from '../config/databases.js';

async function cleanupBackups() {
  console.log('=== CLEANING UP BACKUP TABLES ===\n');
  console.log('⚠️  This will DROP backup tables\n');
  
  const backupTables = [
    'standards_backup_1763495824478',
    'standard_files_backup_1763495825770'
  ];
  
  for (const tableName of backupTables) {
    try {
      // Check if table exists
      const exists = await queryPostgres(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        ) as exists
      `);
      
      if (exists.rows[0].exists) {
        const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${tableName}`);
        console.log(`${tableName}: ${count.rows[0].count} rows`);
        
        // Drop table
        await queryPostgres(`DROP TABLE IF EXISTS public.${tableName} CASCADE`);
        console.log(`  ✓ Dropped ${tableName}`);
      } else {
        console.log(`${tableName}: Does not exist (already removed)`);
      }
    } catch (error) {
      console.log(`  ✗ Error dropping ${tableName}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Cleanup complete!');
  console.log('\n⚠️  Note: Backup tables have been removed.');
  console.log('   If you need to restore again, the data is now in public.standards and public.standard_files');
  
  process.exit(0);
}

cleanupBackups().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});

