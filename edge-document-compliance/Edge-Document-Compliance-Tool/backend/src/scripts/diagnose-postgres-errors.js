/**
 * Diagnose PostgreSQL database errors
 */

import { queryPostgres } from '../config/databases.js';

async function diagnose() {
  console.log('=== POSTGRESQL ERROR DIAGNOSIS ===\n');
  
  // Check all schemas
  console.log('STEP 1: Checking all schemas...');
  console.log('───────────────────────────────');
  
  const schemas = await queryPostgres(`
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    ORDER BY schema_name
  `);
  
  schemas.rows.forEach(s => console.log(`  - ${s.schema_name}`));
  
  // Check standards in each schema
  console.log('\n\nSTEP 2: Checking standards tables in all schemas...');
  console.log('─────────────────────────────────────────────────────');
  
  for (const schema of schemas.rows) {
    const schemaName = schema.schema_name;
    
    try {
      const tables = await queryPostgres(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 
        AND (table_name LIKE '%standard%' OR table_name LIKE '%requirement%')
        ORDER BY table_name
      `, [schemaName]);
      
      if (tables.rows.length > 0) {
        console.log(`\n${schemaName}:`);
        for (const table of tables.rows) {
          try {
            const count = await queryPostgres(`SELECT COUNT(*) as count FROM ${schemaName}.${table.table_name}`);
            console.log(`  ${table.table_name}: ${count.rows[0].count} rows`);
            
            if (table.table_name === 'standards' && count.rows[0].count > 0) {
              const sample = await queryPostgres(`SELECT code, name FROM ${schemaName}.${table.table_name} LIMIT 3`);
              console.log(`    Sample: ${sample.rows.map(r => r.code).join(', ')}`);
            }
          } catch (e) {
            console.log(`  ${table.table_name}: ERROR - ${e.message}`);
          }
        }
      }
    } catch (e) {
      // Schema might not be accessible
    }
  }
  
  // Check public.standards specifically
  console.log('\n\nSTEP 3: Checking public.standards structure...');
  console.log('───────────────────────────────────────────────');
  
  try {
    const columns = await queryPostgres(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'standards'
      ORDER BY ordinal_position
    `);
    
    if (columns.rows.length > 0) {
      console.log('Columns:');
      columns.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
    } else {
      console.log('❌ Table public.standards does not exist!');
    }
  } catch (e) {
    console.log(`❌ Error: ${e.message}`);
  }
  
  // Check public.standard_files
  console.log('\n\nSTEP 4: Checking public.standard_files...');
  console.log('─────────────────────────────────────────');
  
  try {
    const exists = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'standard_files'
      ) as exists
    `);
    
    if (exists.rows[0].exists) {
      const count = await queryPostgres('SELECT COUNT(*) as count FROM public.standard_files');
      console.log(`✓ Table exists: ${count.rows[0].count} rows`);
    } else {
      console.log('❌ Table public.standard_files does NOT exist!');
      console.log('   This is a CRITICAL ERROR - files cannot be tracked');
    }
  } catch (e) {
    console.log(`❌ Error: ${e.message}`);
  }
  
  // Check for backup tables with data
  console.log('\n\nSTEP 5: Checking for backup tables with data...');
  console.log('───────────────────────────────────────────────');
  
  const backups = await queryPostgres(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%backup%'
    ORDER BY table_name
  `);
  
  if (backups.rows.length > 0) {
    console.log('Backup tables found:');
    for (const backup of backups.rows) {
      try {
        const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${backup.table_name}`);
        console.log(`  ${backup.table_name}: ${count.rows[0].count} rows`);
      } catch (e) {
        console.log(`  ${backup.table_name}: ERROR`);
      }
    }
  } else {
    console.log('No backup tables found');
  }
  
  // Summary
  console.log('\n\n=== ERROR SUMMARY ===');
  console.log('─────────────────────');
  
  const publicStandards = await queryPostgres('SELECT COUNT(*) as count FROM public.standards');
  const publicFilesExists = await queryPostgres(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'standard_files') as exists`);
  
  if (publicStandards.rows[0].count === 0) {
    console.log('❌ CRITICAL: public.standards has 0 rows (should have 39)');
  }
  
  if (!publicFilesExists.rows[0].exists) {
    console.log('❌ CRITICAL: public.standard_files table does not exist');
  }
  
  process.exit(0);
}

diagnose().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});

