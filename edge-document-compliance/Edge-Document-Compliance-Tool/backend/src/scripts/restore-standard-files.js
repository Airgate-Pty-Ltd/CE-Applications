/**
 * Restore standard_files from backup
 */

import { queryPostgres } from '../config/databases.js';

async function restoreFiles() {
  console.log('=== RESTORING STANDARD_FILES FROM BACKUP ===\n');
  
  // Get column structures
  const backupCols = await queryPostgres(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'standard_files_backup_1763495825770'
    ORDER BY ordinal_position
  `);
  
  const currentCols = await queryPostgres(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'standard_files'
    ORDER BY ordinal_position
  `);
  
  const backupColNames = backupCols.rows.map(c => c.column_name);
  const currentColNames = currentCols.rows.map(c => c.column_name);
  
  console.log('Backup columns:', backupColNames.join(', '));
  console.log('Current columns:', currentColNames.join(', '));
  
  // Find matching columns
  const matching = backupColNames.filter(c => currentColNames.includes(c));
  console.log('\nMatching columns:', matching.join(', '));
  
  if (matching.length === 0) {
    console.log('❌ No matching columns - cannot restore');
    process.exit(1);
  }
  
  // Restore data
  console.log('\nRestoring data...');
  const columnList = matching.join(', ');
  
  await queryPostgres(`
    INSERT INTO public.standard_files (${columnList})
    SELECT ${columnList}
    FROM public.standard_files_backup_1763495825770
    ON CONFLICT (id) DO NOTHING
  `);
  
  const after = await queryPostgres('SELECT COUNT(*) as count FROM public.standard_files');
  console.log(`✓ Restored ${after.rows[0].count} rows`);
  
  process.exit(0);
}

restoreFiles().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});

