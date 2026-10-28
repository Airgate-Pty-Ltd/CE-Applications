/**
 * Find ALL standards tables in the database
 * This will help identify if we're writing to the wrong table
 */

import dotenv from 'dotenv';
import { queryPostgres, queryEdcatAI, postgresPool, edcatPool } from '../config/databases.js';

dotenv.config();

async function findAllStandardsTables() {
  console.log('\n🔍 Finding ALL standards-related tables...\n');
  console.log('='.repeat(60));
  
  try {
    // Check PostgreSQL (DATABASE_URL)
    console.log('\n📊 PostgreSQL Database (DATABASE_URL):');
    console.log('  Connection string:', process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@') || 'NOT SET');
    
    const pgTables = await queryPostgres(`
      SELECT 
        table_schema,
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = t.table_schema AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_name LIKE '%standard%' 
         OR table_name LIKE '%requirement%'
         OR table_name LIKE '%compliance%'
      ORDER BY table_schema, table_name
    `);
    
    console.log(`  Found ${pgTables.rows.length} tables:`);
    for (const table of pgTables.rows) {
      // Get row count
      try {
        const countResult = await queryPostgres(
          `SELECT COUNT(*) as count FROM ${table.table_schema}.${table.table_name}`
        );
        const rowCount = countResult.rows[0]?.count || 0;
        console.log(`    - ${table.table_schema}.${table.table_name} (${table.column_count} columns, ${rowCount} rows)`);
        
        // If it's a standards table, show sample data
        if (table.table_name === 'standards' && rowCount > 0 && rowCount <= 10) {
          const sample = await queryPostgres(
            `SELECT id, code, name, sector FROM ${table.table_schema}.${table.table_name} LIMIT 5`
          );
          console.log(`      Sample data:`);
          sample.rows.forEach(row => {
            console.log(`        - ${row.code} (${row.sector || 'null'})`);
          });
        }
      } catch (err) {
        console.log(`    - ${table.table_schema}.${table.table_name} (${table.column_count} columns) - ERROR: ${err.message}`);
      }
    }
    
    // Check all schemas
    const schemas = await queryPostgres(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `);
    
    console.log(`\n  Available schemas: ${schemas.rows.map(r => r.schema_name).join(', ')}`);
    
    // Check EDCAT AI Database
    console.log('\n📊 EDCAT AI Database (EDCAT_AI_DATABASE_URL):');
    const edcatUrl = process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL;
    console.log('  Connection string:', edcatUrl?.replace(/:([^:@]+)@/, ':****@') || 'NOT SET');
    
    if (edcatUrl && edcatUrl !== process.env.DATABASE_URL) {
      const edcatTables = await queryEdcatAI(`
        SELECT 
          table_schema,
          table_name,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = t.table_schema AND table_name = t.table_name) as column_count
        FROM information_schema.tables t
        WHERE table_name LIKE '%standard%' 
           OR table_name LIKE '%requirement%'
           OR table_name LIKE '%compliance%'
        ORDER BY table_schema, table_name
      `);
      
      console.log(`  Found ${edcatTables.rows.length} tables:`);
      for (const table of edcatTables.rows) {
        try {
          const countResult = await queryEdcatAI(
            `SELECT COUNT(*) as count FROM ${table.table_schema}.${table.table_name}`
          );
          const rowCount = countResult.rows[0]?.count || 0;
          console.log(`    - ${table.table_schema}.${table.table_name} (${table.column_count} columns, ${rowCount} rows)`);
        } catch (err) {
          console.log(`    - ${table.table_schema}.${table.table_name} (${table.column_count} columns) - ERROR: ${err.message}`);
        }
      }
    } else {
      console.log('  (Using same database as PostgreSQL)');
    }
    
    // Check what the processing script is actually writing to
    console.log('\n📝 What the processing script writes to:');
    console.log('  - Uses: queryPostgres()');
    console.log('  - Target: public.standards');
    console.log('  - Connection: DATABASE_URL');
    
    // Verify the exact table structure
    console.log('\n🔍 Detailed structure of public.standards:');
    try {
      const structure = await queryPostgres(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'standards'
        ORDER BY ordinal_position
      `);
      
      if (structure.rows.length > 0) {
        console.log('  Columns:');
        structure.rows.forEach(col => {
          console.log(`    - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
      } else {
        console.log('  ❌ public.standards table does not exist!');
      }
    } catch (err) {
      console.log(`  ❌ Error checking structure: ${err.message}`);
    }
    
    // Check if there are other standards tables that might be what Railway is showing
    console.log('\n🔍 Checking for other potential standards tables:');
    const allTables = await queryPostgres(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      AND (
        table_name = 'standards' 
        OR table_name = 'standard_files'
        OR table_name = 'compliance_standards'
        OR table_name = 'compliance_requirements'
      )
      ORDER BY table_schema, table_name
    `);
    
    for (const table of allTables.rows) {
      try {
        const count = await queryPostgres(`SELECT COUNT(*) as count FROM ${table.table_schema}.${table.table_name}`);
        const columns = await queryPostgres(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = '${table.table_schema}' AND table_name = '${table.table_name}'
          ORDER BY ordinal_position
        `);
        console.log(`  ${table.table_schema}.${table.table_name}:`);
        console.log(`    - Rows: ${count.rows[0].count}`);
        console.log(`    - Columns: ${columns.rows.map(c => c.column_name).join(', ')}`);
      } catch (err) {
        console.log(`  ${table.table_schema}.${table.table_name}: ERROR - ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Analysis complete!\n');
}

findAllStandardsTables()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

