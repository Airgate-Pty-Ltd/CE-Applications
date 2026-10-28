/**
 * Cleanup backup tables in EDCAT AI DB
 */

import { queryEdcatAI } from '../config/databases.js';

async function cleanup() {
  console.log('=== CLEANING UP BACKUP TABLES IN EDCAT AI DB ===\n');
  
  const backupTables = [
    'standards_backup_1763496722039',
    'standard_files_backup_1763496722432',
    'parsed_requirements_backup_1763495826147'
  ];
  
  for (const tableName of backupTables) {
    try {
      const exists = await queryEdcatAI(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        ) as exists
      `);
      
      if (exists.rows[0].exists) {
        await queryEdcatAI(`DROP TABLE IF EXISTS public.${tableName} CASCADE`);
        console.log(`✓ Dropped ${tableName}`);
      } else {
        console.log(`  ${tableName}: Does not exist`);
      }
    } catch (error) {
      console.log(`  ✗ Error dropping ${tableName}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Cleanup complete!');
  process.exit(0);
}

cleanup().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});

