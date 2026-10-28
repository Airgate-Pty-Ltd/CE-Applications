/**
 * Check for duplicate standards tables in PostgreSQL
 */

import { queryPostgres } from '../config/databases.js';

async function checkDuplicates() {
  console.log('=== CHECKING POSTGRESQL FOR DUPLICATE STANDARDS TABLES ===\n');
  
  // Find all standards-related tables
  const tables = await queryPostgres(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_name LIKE '%standard%' 
    ORDER BY table_schema, table_name
  `);
  
  console.log('Standards-related tables found:');
  tables.rows.forEach(t => {
    console.log(`  ${t.table_schema}.${t.table_name}`);
  });
  
  // Check for multiple 'standards' tables
  const standardsTables = tables.rows.filter(t => t.table_name === 'standards');
  console.log(`\nFound ${standardsTables.length} 'standards' tables:`);
  
  for (const t of standardsTables) {
    try {
      const count = await queryPostgres(`SELECT COUNT(*) as count FROM ${t.table_schema}.${t.table_name}`);
      console.log(`  ${t.table_schema}.standards: ${count.rows[0].count} rows`);
      
      // Get sample data
      const sample = await queryPostgres(`SELECT code, name FROM ${t.table_schema}.${t.table_name} LIMIT 5`);
      console.log(`    Sample codes: ${sample.rows.map(r => r.code).join(', ')}`);
    } catch (e) {
      console.log(`  ${t.table_schema}.standards: ERROR - ${e.message}`);
    }
  }
  
  // Check for multiple 'standard_files' tables
  const filesTables = tables.rows.filter(t => t.table_name === 'standard_files');
  console.log(`\nFound ${filesTables.length} 'standard_files' tables:`);
  
  for (const t of filesTables) {
    try {
      const count = await queryPostgres(`SELECT COUNT(*) as count FROM ${t.table_schema}.${t.table_name}`);
      console.log(`  ${t.table_schema}.standard_files: ${count.rows[0].count} rows`);
    } catch (e) {
      console.log(`  ${t.table_schema}.standard_files: ERROR - ${e.message}`);
    }
  }
  
  if (standardsTables.length > 1) {
    console.log('\n⚠️  ISSUE: Multiple standards tables found!');
    console.log('   Recommendation: Keep only public.standards, remove others');
  }
  
  process.exit(0);
}

checkDuplicates().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});

