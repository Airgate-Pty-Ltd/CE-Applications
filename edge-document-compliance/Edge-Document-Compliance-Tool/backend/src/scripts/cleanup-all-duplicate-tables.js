/**
 * Clean Up ALL Duplicate Tables in Databases
 * 
 * This script:
 * 1. Lists ALL tables in both databases (not just from migrations)
 * 2. Identifies duplicates
 * 3. Removes duplicates from EDCAT AI DB
 * 4. Reports dead-end tables
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';
import dotenv from 'dotenv';

dotenv.config();

async function cleanupAllDuplicates() {
  console.log('\n🧹 COMPREHENSIVE DATABASE CLEANUP\n');
  console.log('='.repeat(100));
  
  const report = {
    postgres: { tables: [], total: 0 },
    edcatAi: { tables: [], total: 0 },
    duplicates: [],
    toDelete: []
  };
  
  try {
    // Get ALL tables from PostgreSQL
    console.log('\n📊 POSTGRESQL DATABASE - Listing ALL tables...');
    const postgresTables = await queryPostgres(`
      SELECT 
        table_schema,
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = t.table_schema AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema IN ('public', 'edcat')
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `);
    
    report.postgres.total = postgresTables.rows.length;
    console.log(`   Found ${postgresTables.rows.length} tables in PostgreSQL\n`);
    
    for (const row of postgresTables.rows) {
      const tableName = row.table_name;
      const schema = row.table_schema;
      const fullName = schema === 'public' ? `public.${tableName}` : `${schema}.${tableName}`;
      
      // Get row count
      let rowCount = 0;
      try {
        const countResult = await queryPostgres(`SELECT COUNT(*) as count FROM ${fullName}`);
        rowCount = parseInt(countResult.rows[0]?.count || 0);
      } catch (err) {
        rowCount = -1;
      }
      
      report.postgres.tables.push({
        name: tableName,
        schema: schema,
        fullName: fullName,
        rowCount: rowCount,
        columnCount: parseInt(row.column_count)
      });
      
      console.log(`  ${fullName.padEnd(50)} | Rows: ${rowCount.toString().padStart(8)} | Columns: ${row.column_count.padStart(3)}`);
    }
    
    // Get ALL tables from EDCAT AI DB
    console.log('\n\n🤖 EDCAT AI DATABASE - Listing ALL tables...');
    const edcatTables = await queryEdcatAI(`
      SELECT 
        table_schema,
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = t.table_schema AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema IN ('public', 'edcat')
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `);
    
    report.edcatAi.total = edcatTables.rows.length;
    console.log(`   Found ${edcatTables.rows.length} tables in EDCAT AI DB\n`);
    
    for (const row of edcatTables.rows) {
      const tableName = row.table_name;
      const schema = row.table_schema;
      const fullName = schema === 'public' ? tableName : `${schema}.${tableName}`;
      
      // Get row count
      let rowCount = 0;
      try {
        const countResult = await queryEdcatAI(`SELECT COUNT(*) as count FROM ${fullName}`);
        rowCount = parseInt(countResult.rows[0]?.count || 0);
      } catch (err) {
        rowCount = -1;
      }
      
      report.edcatAi.tables.push({
        name: tableName,
        schema: schema,
        fullName: fullName,
        rowCount: rowCount,
        columnCount: parseInt(row.column_count)
      });
      
      console.log(`  ${fullName.padEnd(50)} | Rows: ${rowCount.toString().padStart(8)} | Columns: ${row.column_count.padStart(3)}`);
    }
    
    // Identify duplicates
    console.log('\n\n⚠️  IDENTIFYING DUPLICATES...');
    console.log('='.repeat(100));
    
    const duplicateTableNames = ['standards', 'standard_files', 'parsed_requirements'];
    
    for (const dupName of duplicateTableNames) {
      const inPostgres = report.postgres.tables.find(t => t.name === dupName && t.schema === 'public');
      const inEdcat = report.edcatAi.tables.find(t => t.name === dupName && t.schema === 'public');
      
      if (inPostgres && inEdcat) {
        console.log(`\n  ❌ DUPLICATE FOUND: ${dupName}`);
        console.log(`     Postgres: ${inPostgres.fullName} (${inPostgres.rowCount} rows, ${inPostgres.columnCount} columns)`);
        console.log(`     EDCAT AI:  ${inEdcat.fullName} (${inEdcat.rowCount} rows, ${inEdcat.columnCount} columns)`);
        console.log(`     → Action: DELETE from EDCAT AI DB`);
        
        report.duplicates.push({
          tableName: dupName,
          postgres: inPostgres,
          edcat: inEdcat
        });
        
        report.toDelete.push({
          database: 'EDCAT AI',
          table: inEdcat.fullName,
          reason: `Duplicate of ${inPostgres.fullName} in Postgres`
        });
      } else if (inEdcat && !inPostgres) {
        console.log(`\n  ⚠️  ORPHANED: ${dupName} exists in EDCAT AI but NOT in Postgres`);
        console.log(`     EDCAT AI:  ${inEdcat.fullName} (${inEdcat.rowCount} rows)`);
        console.log(`     → Action: DELETE from EDCAT AI DB (should only exist in Postgres)`);
        
        report.toDelete.push({
          database: 'EDCAT AI',
          table: inEdcat.fullName,
          reason: `Orphaned duplicate - should only exist in Postgres`
        });
      }
    }
    
    // Show summary
    console.log('\n\n📋 CLEANUP SUMMARY');
    console.log('='.repeat(100));
    console.log(`PostgreSQL Tables: ${report.postgres.total}`);
    console.log(`EDCAT AI Tables: ${report.edcatAi.total}`);
    console.log(`Duplicates Found: ${report.duplicates.length}`);
    console.log(`Tables to Delete: ${report.toDelete.length}`);
    
    if (report.toDelete.length > 0) {
      console.log('\n\n🗑️  TABLES TO DELETE FROM EDCAT AI DB:');
      console.log('-'.repeat(100));
      for (const item of report.toDelete) {
        console.log(`  ${item.table.padEnd(50)} | Reason: ${item.reason}`);
      }
      
      console.log('\n\n⚠️  READY TO DELETE?');
      console.log('   Run the following SQL against EDCAT_AI_DATABASE_URL:');
      console.log('');
      for (const item of report.toDelete) {
        const tableName = item.table.includes('.') ? item.table : `public.${item.table}`;
        console.log(`   DROP TABLE IF EXISTS ${tableName} CASCADE;`);
      }
    } else {
      console.log('\n  ✅ No duplicates found!');
    }
    
    // Save report
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const reportPath = path.join(__dirname, '../../../DATABASE_CLEANUP_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: DATABASE_CLEANUP_REPORT.json`);
    
  } catch (error) {
    console.error('\n❌ ERROR during cleanup:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

cleanupAllDuplicates();

