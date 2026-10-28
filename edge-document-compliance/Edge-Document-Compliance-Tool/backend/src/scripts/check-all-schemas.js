/**
 * Check all schemas for standards tables
 */

import { queryPostgres } from '../config/databases.js';

async function checkAllSchemas() {
  console.log('=== CHECKING ALL SCHEMAS FOR STANDARDS TABLES ===\n');
  
  // Check all schemas
  const schemas = await queryPostgres(`
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    ORDER BY schema_name
  `);
  
  console.log('Schemas found:');
  schemas.rows.forEach(s => console.log(`  - ${s.schema_name}`));
  
  // Check for standards tables in each schema
  console.log('\n=== STANDARDS TABLES BY SCHEMA ===\n');
  
  for (const schema of schemas.rows) {
    const schemaName = schema.schema_name;
    
    try {
      const tables = await queryPostgres(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_name LIKE '%standard%'
        ORDER BY table_name
      `, [schemaName]);
      
      if (tables.rows.length > 0) {
        console.log(`${schemaName}:`);
        for (const table of tables.rows) {
          try {
            const count = await queryPostgres(`SELECT COUNT(*) as count FROM ${schemaName}.${table.table_name}`);
            console.log(`  - ${table.table_name}: ${count.rows[0].count} rows`);
            
            if (table.table_name === 'standards' && count.rows[0].count > 0) {
              const sample = await queryPostgres(`SELECT code, name FROM ${schemaName}.${table.table_name} LIMIT 5`);
              console.log(`    Sample: ${sample.rows.map(r => r.code).join(', ')}`);
            }
          } catch (e) {
            console.log(`  - ${table.table_name}: ERROR - ${e.message}`);
          }
        }
        console.log('');
      }
    } catch (e) {
      // Schema might not be accessible
    }
  }
  
  process.exit(0);
}

checkAllSchemas().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});

