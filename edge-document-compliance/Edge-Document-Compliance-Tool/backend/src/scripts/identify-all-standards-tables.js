/**
 * Identify all standards-related tables in both databases
 * This will help us understand the duplication issue
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

async function identifyTables() {
  console.log('=== IDENTIFYING ALL STANDARDS TABLES ===\n');
  
  // Check PostgreSQL (Customer Data DB)
  console.log('📊 POSTGRESQL (Customer Data DB) - Standards Related Tables:');
  console.log('─────────────────────────────────────────────────────────────');
  
  try {
    const pgTables = await queryPostgres(`
      SELECT 
        table_schema,
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = t.table_schema AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE (table_name LIKE '%standard%' OR table_name LIKE '%requirement%' OR table_name LIKE '%compliance%')
        AND table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name
    `);
    
    if (pgTables.rows.length === 0) {
      console.log('  No standards-related tables found\n');
    } else {
      pgTables.rows.forEach(t => {
        console.log(`  ✓ ${t.table_schema}.${t.table_name} (${t.column_count} columns)`);
      });
    }
    
    // Get row counts for each standards table
    console.log('\n📊 Row Counts in PostgreSQL Standards Tables:');
    for (const table of pgTables.rows.filter(t => t.table_name.includes('standard'))) {
      try {
        const count = await queryPostgres(`SELECT COUNT(*) as count FROM ${table.table_schema}.${table.table_name}`);
        console.log(`  ${table.table_schema}.${table.table_name}: ${count.rows[0].count} rows`);
      } catch (e) {
        console.log(`  ${table.table_schema}.${table.table_name}: Error - ${e.message}`);
      }
    }
  } catch (error) {
    console.log(`  Error querying PostgreSQL: ${error.message}\n`);
  }
  
  // Check EDCAT AI DB
  console.log('\n\n📊 EDCAT AI DB - Standards Related Tables:');
  console.log('───────────────────────────────────────────');
  
  try {
    edcatTables = await queryEdcatAI(`
      SELECT 
        table_schema,
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = t.table_schema AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE (table_name LIKE '%standard%' OR table_name LIKE '%requirement%' OR table_name LIKE '%compliance%')
        AND table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name
    `);
    
    if (edcatTables.rows.length === 0) {
      console.log('  No standards-related tables found\n');
    } else {
      edcatTables.rows.forEach(t => {
        console.log(`  ✓ ${t.table_schema}.${t.table_name} (${t.column_count} columns)`);
      });
    }
    
    // Get row counts for each standards table
    console.log('\n📊 Row Counts in EDCAT AI Standards Tables:');
    for (const table of edcatTables.rows.filter(t => t.table_name.includes('standard'))) {
      try {
        const count = await queryEdcatAI(`SELECT COUNT(*) as count FROM ${table.table_schema}.${table.table_name}`);
        console.log(`  ${table.table_schema}.${table.table_name}: ${count.rows[0].count} rows`);
      } catch (e) {
        console.log(`  ${table.table_schema}.${table.table_name}: Error - ${e.message}`);
      }
    }
  } catch (error) {
    console.log(`  Error querying EDCAT AI DB: ${error.message}\n`);
  }
  
  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log('────────────────');
  
  const pgStandardsTables = pgTables?.rows?.filter(t => t.table_name.includes('standard') && !t.table_name.includes('file')) || [];
  const edcatStandardsTables = edcatTables?.rows?.filter(t => t.table_name.includes('standard') && !t.table_name.includes('file')) || [];
  
  console.log(`\nPostgreSQL 'standards' tables: ${pgStandardsTables.length}`);
  pgStandardsTables.forEach(t => console.log(`  - ${t.table_schema}.${t.table_name}`));
  
  console.log(`\nEDCAT AI 'standards' tables: ${edcatStandardsTables.length}`);
  edcatStandardsTables.forEach(t => console.log(`  - ${t.table_schema}.${t.table_name}`));
  
  console.log(`\n⚠️  DUPLICATION ISSUE DETECTED:`);
  console.log(`   Both databases have identical tables:`);
  console.log(`   - standards (${pgStandardsTables.length > 0 ? 'PostgreSQL' : ''} ${edcatStandardsTables.length > 0 ? 'EDCAT AI' : ''})`);
  console.log(`   - standard_files (in both databases)`);
  console.log(`   - parsed_requirements (in both databases)`);
  console.log(`\n   This causes:`);
  console.log(`   1. Data duplication (same data in 2 places)`);
  console.log(`   2. Sync issues (data can get out of sync)`);
  console.log(`   3. Confusion about which database is source of truth`);
  console.log(`\n   RECOMMENDATION:`);
  console.log(`   - Use PostgreSQL as SINGLE source of truth for Compliance Library`);
  console.log(`   - EDCAT AI DB should READ from PostgreSQL (or be removed)`);
  console.log(`   - OR: Keep EDCAT AI DB for Vera, but sync from PostgreSQL`);
  
  process.exit(0);
}

identifyTables().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});

