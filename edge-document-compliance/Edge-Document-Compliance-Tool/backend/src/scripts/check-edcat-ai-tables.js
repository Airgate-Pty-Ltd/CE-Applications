/**
 * Check all standards-related tables in EDCAT AI DB
 */

import { queryEdcatAI } from '../config/databases.js';

async function checkTables() {
  console.log('=== CHECKING EDCAT AI DB FOR STANDARDS TABLES ===\n');
  
  // Find all standards-related tables
  const tables = await queryEdcatAI(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_name LIKE '%standard%' 
    ORDER BY table_schema, table_name
  `);
  
  console.log('Standards-related tables found:');
  tables.rows.forEach(t => {
    console.log(`  ${t.table_schema}.${t.table_name}`);
  });
  
  // Check each table
  console.log('\n=== TABLE DETAILS ===\n');
  
  for (const t of tables.rows) {
    try {
      const count = await queryEdcatAI(`SELECT COUNT(*) as count FROM ${t.table_schema}.${t.table_name}`);
      console.log(`${t.table_schema}.${t.table_name}: ${count.rows[0].count} rows`);
      
      if (count.rows[0].count > 0 && count.rows[0].count < 100) {
        // Try to get sample data
        try {
          const sample = await queryEdcatAI(`
            SELECT * FROM ${t.table_schema}.${t.table_name} LIMIT 3
          `);
          if (sample.rows.length > 0) {
            console.log(`  Columns: ${Object.keys(sample.rows[0]).join(', ')}`);
            sample.rows.forEach((row, i) => {
              const code = row.code || row.standard_code || row.title || 'N/A';
              console.log(`  Sample ${i+1}: ${code}`);
            });
          }
        } catch (e) {
          // Can't read data, that's okay
        }
      }
      console.log('');
    } catch (e) {
      console.log(`  Error: ${e.message}\n`);
    }
  }
  
  // Check if there are any backup tables
  const backupTables = await queryEdcatAI(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_name LIKE '%backup%' 
    ORDER BY table_schema, table_name
  `);
  
  if (backupTables.rows.length > 0) {
    console.log('\n=== BACKUP TABLES (should be removed) ===\n');
    backupTables.rows.forEach(t => {
      console.log(`  ${t.table_schema}.${t.table_name}`);
    });
  }
  
  process.exit(0);
}

checkTables().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});

