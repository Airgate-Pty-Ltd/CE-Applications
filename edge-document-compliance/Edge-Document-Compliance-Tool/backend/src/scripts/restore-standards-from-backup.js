/**
 * Restore standards data from backup table to public.standards
 */

import { queryPostgres } from '../config/databases.js';

async function restoreStandards() {
  console.log('=== RESTORING STANDARDS FROM BACKUP ===\n');
  
  // Check backup table
  const backupCheck = await queryPostgres(`
    SELECT COUNT(*) as count 
    FROM public.standards_backup_1763495824478
  `);
  
  console.log(`Backup table has ${backupCheck.rows[0].count} rows`);
  
  if (backupCheck.rows[0].count === 0) {
    console.log('⚠️  Backup table is empty - nothing to restore');
    process.exit(0);
  }
  
  // Get column names from backup table
  const columns = await queryPostgres(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'standards_backup_1763495824478'
    ORDER BY ordinal_position
  `);
  
  const columnNames = columns.rows.map(c => c.column_name).join(', ');
  console.log(`\nColumns: ${columnNames}`);
  
  // Check if public.standards has data
  const currentCheck = await queryPostgres(`SELECT COUNT(*) as count FROM public.standards`);
  console.log(`\nCurrent public.standards has ${currentCheck.rows[0].count} rows`);
  
  if (currentCheck.rows[0].count > 0) {
    console.log('⚠️  public.standards already has data - skipping restore');
    console.log('   If you want to merge, you may need to do it manually');
    process.exit(0);
  }
  
  // Restore data
  console.log('\nRestoring data from backup...');
  await queryPostgres(`
    INSERT INTO public.standards (${columnNames})
    SELECT ${columnNames}
    FROM public.standards_backup_1763495824478
    ON CONFLICT (id) DO NOTHING
  `);
  
  const afterRestore = await queryPostgres(`SELECT COUNT(*) as count FROM public.standards`);
  console.log(`✓ Restored ${afterRestore.rows[0].count} rows to public.standards`);
  
  // Also check standard_files
  const filesBackup = await queryPostgres(`
    SELECT COUNT(*) as count 
    FROM public.standard_files_backup_1763495825770
  `);
  
  console.log(`\nstandard_files_backup has ${filesBackup.rows[0].count} rows`);
  
  if (filesBackup.rows[0].count > 0) {
    const filesCurrent = await queryPostgres(`SELECT COUNT(*) as count FROM public.standard_files`);
    console.log(`Current public.standard_files has ${filesCurrent.rows[0].count} rows`);
    
    if (filesCurrent.rows[0].count === 0) {
      // Get columns from both tables to match them
      const backupColumns = await queryPostgres(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'standard_files_backup_1763495825770'
        ORDER BY ordinal_position
      `);
      
      const currentColumns = await queryPostgres(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'standard_files'
        ORDER BY ordinal_position
      `);
      
      // Find matching columns
      const backupColNames = backupColumns.rows.map(c => c.column_name);
      const currentColNames = currentColumns.rows.map(c => c.column_name);
      const matchingColumns = backupColNames.filter(c => currentColNames.includes(c));
      
      console.log(`\nMatching columns: ${matchingColumns.join(', ')}`);
      
      if (matchingColumns.length > 0) {
        const columnList = matchingColumns.join(', ');
        await queryPostgres(`
          INSERT INTO public.standard_files (${columnList})
          SELECT ${columnList}
          FROM public.standard_files_backup_1763495825770
          ON CONFLICT (id) DO NOTHING
        `);
        
        const afterFilesRestore = await queryPostgres(`SELECT COUNT(*) as count FROM public.standard_files`);
        console.log(`✓ Restored ${afterFilesRestore.rows[0].count} rows to public.standard_files`);
      } else {
        console.log('⚠️  No matching columns found - cannot restore');
      }
    } else {
      console.log(`⚠️  public.standard_files already has ${filesCurrent.rows[0].count} rows - skipping restore`);
    }
  }
  
  console.log('\n✅ Restore complete!');
  process.exit(0);
}

restoreStandards().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});

