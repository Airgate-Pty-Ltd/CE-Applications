/**
 * Comprehensive Table Audit
 * 
 * Lists ALL tables in both databases and maps them to code connections
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Search for table references in codebase
function searchCodebaseForTable(tableName) {
  const codebasePath = path.join(__dirname, '../../..');
  const connections = [];
  
  // Common patterns to search for
  const patterns = [
    new RegExp(`FROM\\s+${tableName}\\b`, 'gi'),
    new RegExp(`INTO\\s+${tableName}\\b`, 'gi'),
    new RegExp(`UPDATE\\s+${tableName}\\b`, 'gi'),
    new RegExp(`DELETE\\s+FROM\\s+${tableName}\\b`, 'gi'),
    new RegExp(`JOIN\\s+${tableName}\\b`, 'gi'),
    new RegExp(`\\.${tableName}\\b`, 'gi'),
    new RegExp(`'${tableName}'`, 'gi'),
    new RegExp(`"${tableName}"`, 'gi'),
    new RegExp(`\`${tableName}\``, 'gi'),
  ];
  
  try {
    const files = getAllJsFiles(codebasePath);
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        for (const pattern of patterns) {
          if (pattern.test(content)) {
            const relativePath = path.relative(codebasePath, file);
            if (!connections.includes(relativePath)) {
              connections.push(relativePath);
            }
          }
        }
      } catch (err) {
        // Skip files that can't be read
      }
    }
  } catch (err) {
    // If search fails, return empty
  }
  
  return connections;
}

function getAllJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other irrelevant directories
      if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(file)) {
        getAllJsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.sql')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

async function auditAllTables() {
  console.log('\n🔍 COMPREHENSIVE DATABASE TABLE AUDIT\n');
  console.log('='.repeat(80));
  
  const report = {
    postgres: { tables: [], total: 0 },
    edcatAi: { tables: [], total: 0 },
    duplicates: [],
    deadEnds: [],
    summary: {}
  };
  
  try {
    // Get all tables from PostgreSQL
    console.log('\n📊 POSTGRESQL DATABASE (DATABASE_URL)');
    console.log('-'.repeat(80));
    const postgresTables = await queryPostgres(`
      SELECT 
        table_name,
        table_schema,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = t.table_schema AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    report.postgres.total = postgresTables.rows.length;
    console.log(`\nFound ${postgresTables.rows.length} tables in PostgreSQL:\n`);
    
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
        rowCount = -1; // Error counting
      }
      
      // Search codebase for references
      const codeConnections = searchCodebaseForTable(tableName);
      const schemaConnections = searchCodebaseForTable(fullName);
      const allConnections = [...new Set([...codeConnections, ...schemaConnections])];
      
      const tableInfo = {
        name: tableName,
        schema: schema,
        fullName: fullName,
        rowCount: rowCount,
        columnCount: parseInt(row.column_count),
        codeConnections: allConnections,
        isUsed: allConnections.length > 0
      };
      
      report.postgres.tables.push(tableInfo);
      
      console.log(`  ${tableName.padEnd(40)} | Rows: ${rowCount.toString().padStart(8)} | Columns: ${row.column_count.padStart(3)} | Used: ${allConnections.length > 0 ? '✅' : '❌'}`);
      if (allConnections.length > 0) {
        console.log(`    └─ Connected to: ${allConnections.slice(0, 3).join(', ')}${allConnections.length > 3 ? '...' : ''}`);
      }
    }
    
    // Get all tables from EDCAT AI DB
    console.log('\n\n🤖 EDCAT AI DATABASE (EDCAT_AI_DATABASE_URL)');
    console.log('-'.repeat(80));
    const edcatTables = await queryEdcatAI(`
      SELECT 
        table_name,
        table_schema,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = t.table_schema AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema IN ('public', 'edcat')
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `);
    
    report.edcatAi.total = edcatTables.rows.length;
    console.log(`\nFound ${edcatTables.rows.length} tables in EDCAT AI DB:\n`);
    
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
        rowCount = -1; // Error counting
      }
      
      // Search codebase for references
      const codeConnections = searchCodebaseForTable(tableName);
      const schemaConnections = searchCodebaseForTable(fullName);
      const allConnections = [...new Set([...codeConnections, ...schemaConnections])];
      
      const tableInfo = {
        name: tableName,
        schema: schema,
        fullName: fullName,
        rowCount: rowCount,
        columnCount: parseInt(row.column_count),
        codeConnections: allConnections,
        isUsed: allConnections.length > 0
      };
      
      report.edcatAi.tables.push(tableInfo);
      
      // Check if this is a duplicate
      const isDuplicate = ['standards', 'standard_files', 'parsed_requirements'].includes(tableName) && schema === 'public';
      
      console.log(`  ${fullName.padEnd(40)} | Rows: ${rowCount.toString().padStart(8)} | Columns: ${row.column_count.padStart(3)} | Used: ${allConnections.length > 0 ? '✅' : '❌'}${isDuplicate ? ' | ⚠️ DUPLICATE' : ''}`);
      if (allConnections.length > 0) {
        console.log(`    └─ Connected to: ${allConnections.slice(0, 3).join(', ')}${allConnections.length > 3 ? '...' : ''}`);
      }
      
      if (isDuplicate) {
        report.duplicates.push({ database: 'EDCAT AI', table: fullName, rowCount });
      }
    }
    
    // Identify duplicates
    console.log('\n\n⚠️  DUPLICATE TABLES (Should be removed from EDCAT AI DB)');
    console.log('-'.repeat(80));
    const duplicateNames = ['standards', 'standard_files', 'parsed_requirements'];
    for (const dupName of duplicateNames) {
      const inPostgres = report.postgres.tables.find(t => t.name === dupName);
      const inEdcat = report.edcatAi.tables.find(t => t.name === dupName && t.schema === 'public');
      
      if (inPostgres && inEdcat) {
        console.log(`  ❌ ${dupName}`);
        console.log(`     Postgres: ${inPostgres.fullName} (${inPostgres.rowCount} rows, ${inPostgres.codeConnections.length} code connections)`);
        console.log(`     EDCAT AI: ${inEdcat.fullName} (${inEdcat.rowCount} rows, ${inEdcat.codeConnections.length} code connections)`);
        console.log(`     → DELETE from EDCAT AI DB (use Postgres version)`);
      }
    }
    
    // Identify dead-end tables (no code connections)
    console.log('\n\n❌ DEAD-END TABLES (No code connections found)');
    console.log('-'.repeat(80));
    const allDeadEnds = [
      ...report.postgres.tables.filter(t => !t.isUsed).map(t => ({ db: 'Postgres', ...t })),
      ...report.edcatAi.tables.filter(t => !t.isUsed).map(t => ({ db: 'EDCAT AI', ...t }))
    ];
    
    if (allDeadEnds.length > 0) {
      for (const deadEnd of allDeadEnds) {
        console.log(`  ${deadEnd.db.padEnd(12)} | ${deadEnd.fullName.padEnd(40)} | ${deadEnd.rowCount} rows`);
        report.deadEnds.push(deadEnd);
      }
    } else {
      console.log('  ✅ No dead-end tables found!');
    }
    
    // Summary
    console.log('\n\n📋 SUMMARY');
    console.log('='.repeat(80));
    console.log(`PostgreSQL Tables: ${report.postgres.total}`);
    console.log(`  - Used in code: ${report.postgres.tables.filter(t => t.isUsed).length}`);
    console.log(`  - Dead-ends: ${report.postgres.tables.filter(t => !t.isUsed).length}`);
    console.log(`\nEDCAT AI Tables: ${report.edcatAi.total}`);
    console.log(`  - Used in code: ${report.edcatAi.tables.filter(t => t.isUsed).length}`);
    console.log(`  - Dead-ends: ${report.edcatAi.tables.filter(t => !t.isUsed).length}`);
    console.log(`  - Duplicates: ${report.duplicates.length}`);
    
    // Save detailed report to file
    const reportPath = path.join(__dirname, '../../../TABLE_AUDIT_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: TABLE_AUDIT_REPORT.json`);
    
  } catch (error) {
    console.error('\n❌ ERROR during audit:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

auditAllTables();

