/**
 * Static Table Mapping Analysis
 * 
 * Maps ALL tables from migrations and codebase to their connections
 * Works without database connection - analyzes code and migration files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const codebaseRoot = path.join(__dirname, '../../..');

// Extract all CREATE TABLE statements from SQL files
function extractTablesFromMigrations() {
  const migrationsPath = path.join(codebaseRoot, 'migrations');
  const tables = new Map();
  
  if (!fs.existsSync(migrationsPath)) {
    return tables;
  }
  
  const files = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'));
  
  for (const file of files) {
    const filePath = path.join(migrationsPath, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Match CREATE TABLE statements
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.|edcat\.)?(\w+)/gi;
    const dropTableRegex = /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.|edcat\.)?(\w+)/gi;
    
    let match;
    while ((match = createTableRegex.exec(content)) !== null) {
      const tableName = match[1];
      if (!tables.has(tableName)) {
        tables.set(tableName, {
          name: tableName,
          createdIn: [],
          droppedIn: [],
          schema: content.includes(`CREATE TABLE IF NOT EXISTS ${tableName}`) || content.includes(`CREATE TABLE ${tableName}`) 
            ? (content.includes('public.') ? 'public' : content.includes('edcat.') ? 'edcat' : 'public')
            : 'unknown'
        });
      }
      tables.get(tableName).createdIn.push(file);
    }
    
    // Also track DROP statements
    while ((match = dropTableRegex.exec(content)) !== null) {
      const tableName = match[1];
      if (tables.has(tableName)) {
        tables.get(tableName).droppedIn.push(file);
      }
    }
  }
  
  return tables;
}

// Search for table usage in code
function findTableUsageInCode(tableName) {
  const connections = [];
  const patterns = [
    new RegExp(`FROM\\s+(?:public\\.|edcat\\.)?${tableName}\\b`, 'gi'),
    new RegExp(`INTO\\s+(?:public\\.|edcat\\.)?${tableName}\\b`, 'gi'),
    new RegExp(`UPDATE\\s+(?:public\\.|edcat\\.)?${tableName}\\b`, 'gi'),
    new RegExp(`DELETE\\s+FROM\\s+(?:public\\.|edcat\\.)?${tableName}\\b`, 'gi'),
    new RegExp(`JOIN\\s+(?:public\\.|edcat\\.)?${tableName}\\b`, 'gi'),
    new RegExp(`\\.${tableName}\\b`, 'gi'),
    new RegExp(`'${tableName}'`, 'gi'),
    new RegExp(`"${tableName}"`, 'gi'),
    new RegExp(`\`${tableName}\``, 'gi'),
  ];
  
  function searchDirectory(dir, relativePath = '') {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      const relativeItemPath = path.join(relativePath, item);
      
      if (stat.isDirectory()) {
        // Skip irrelevant directories
        if (!['node_modules', '.git', 'dist', 'build', '.next', 'migrations'].includes(item)) {
          searchDirectory(itemPath, relativeItemPath);
        }
      } else if (item.match(/\.(js|ts|jsx|tsx)$/)) {
        try {
          const content = fs.readFileSync(itemPath, 'utf8');
          for (const pattern of patterns) {
            if (pattern.test(content)) {
              if (!connections.includes(relativeItemPath)) {
                connections.push(relativeItemPath);
              }
            }
          }
        } catch (err) {
          // Skip files that can't be read
        }
      }
    }
  }
  
  searchDirectory(path.join(codebaseRoot, 'backend'));
  searchDirectory(path.join(codebaseRoot, 'public'));
  
  return connections;
}

// Determine which database a table belongs to based on migration file
function getTableDatabase(tableName, createdInFiles) {
  for (const file of createdInFiles) {
    if (file.includes('postgres_customer_data') || file.includes('001_')) {
      return 'PostgreSQL (DATABASE_URL)';
    }
    if (file.includes('edcat_ai') || file.includes('002_')) {
      return 'EDCAT AI (EDCAT_AI_DATABASE_URL)';
    }
    if (file.includes('cleanup')) {
      return 'EDCAT AI (to be deleted)';
    }
  }
  return 'Unknown';
}

async function mapAllTables() {
  console.log('\n🗺️  COMPREHENSIVE TABLE MAPPING ANALYSIS\n');
  console.log('='.repeat(100));
  
  // Extract tables from migrations
  console.log('\n📋 Step 1: Extracting tables from migration files...');
  const tables = extractTablesFromMigrations();
  console.log(`   Found ${tables.size} unique tables in migrations`);
  
  // Map each table to code usage
  console.log('\n🔍 Step 2: Searching codebase for table usage...');
  const tableMap = new Map();
  
  for (const [tableName, tableInfo] of tables.entries()) {
    console.log(`   Analyzing: ${tableName}...`);
    const connections = findTableUsageInCode(tableName);
    const database = getTableDatabase(tableName, tableInfo.createdIn);
    
    tableMap.set(tableName, {
      ...tableInfo,
      database,
      codeConnections: connections,
      isUsed: connections.length > 0,
      isDuplicate: ['standards', 'standard_files', 'parsed_requirements'].includes(tableName) && 
                   tableInfo.createdIn.some(f => f.includes('edcat_ai') || f.includes('002_'))
    });
  }
  
  // Group by database
  const postgresTables = [];
  const edcatTables = [];
  const unknownTables = [];
  
  for (const [name, info] of tableMap.entries()) {
    if (info.database.includes('PostgreSQL')) {
      postgresTables.push({ name, ...info });
    } else if (info.database.includes('EDCAT AI')) {
      edcatTables.push({ name, ...info });
    } else {
      unknownTables.push({ name, ...info });
    }
  }
  
  // Display results
  console.log('\n\n📊 POSTGRESQL DATABASE (DATABASE_URL)');
  console.log('='.repeat(100));
  console.log(`Total: ${postgresTables.length} tables\n`);
  
  for (const table of postgresTables.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  ${table.name.padEnd(40)} | Used: ${table.isUsed ? '✅' : '❌'.padEnd(3)} | Created in: ${table.createdIn.join(', ')}`);
    if (table.codeConnections.length > 0) {
      console.log(`    └─ Code: ${table.codeConnections.slice(0, 5).join(', ')}${table.codeConnections.length > 5 ? ` (+${table.codeConnections.length - 5} more)` : ''}`);
    }
  }
  
  console.log('\n\n🤖 EDCAT AI DATABASE (EDCAT_AI_DATABASE_URL)');
  console.log('='.repeat(100));
  console.log(`Total: ${edcatTables.length} tables\n`);
  
  for (const table of edcatTables.sort((a, b) => a.name.localeCompare(b.name))) {
    const duplicateMark = table.isDuplicate ? ' ⚠️ DUPLICATE' : '';
    console.log(`  ${table.name.padEnd(40)} | Used: ${table.isUsed ? '✅' : '❌'.padEnd(3)} | Created in: ${table.createdIn.join(', ')}${duplicateMark}`);
    if (table.codeConnections.length > 0) {
      console.log(`    └─ Code: ${table.codeConnections.slice(0, 5).join(', ')}${table.codeConnections.length > 5 ? ` (+${table.codeConnections.length - 5} more)` : ''}`);
    }
  }
  
  // Identify duplicates
  console.log('\n\n⚠️  DUPLICATE TABLES (Should be removed from EDCAT AI DB)');
  console.log('='.repeat(100));
  const duplicates = edcatTables.filter(t => t.isDuplicate);
  if (duplicates.length > 0) {
    for (const dup of duplicates) {
      const postgresVersion = postgresTables.find(t => t.name === dup.name);
      console.log(`  ❌ ${dup.name}`);
      console.log(`     Postgres: ${postgresVersion ? '✅ EXISTS' : '❌ MISSING'} (${postgresVersion?.codeConnections.length || 0} code connections)`);
      console.log(`     EDCAT AI:  ✅ EXISTS (${dup.codeConnections.length} code connections)`);
      console.log(`     → Action: DELETE from EDCAT AI DB`);
    }
  } else {
    console.log('  ✅ No duplicates found in migration files');
  }
  
  // Dead-end tables
  console.log('\n\n❌ DEAD-END TABLES (No code connections found)');
  console.log('='.repeat(100));
  const deadEnds = [...postgresTables, ...edcatTables].filter(t => !t.isUsed);
  if (deadEnds.length > 0) {
    for (const deadEnd of deadEnds) {
      console.log(`  ${deadEnd.database.padEnd(30)} | ${deadEnd.name.padEnd(40)} | Created in: ${deadEnd.createdIn.join(', ')}`);
    }
  } else {
    console.log('  ✅ All tables have code connections!');
  }
  
  // Save detailed report
  const report = {
    postgres: postgresTables,
    edcatAi: edcatTables,
    unknown: unknownTables,
    duplicates: duplicates,
    deadEnds: deadEnds,
    summary: {
      totalPostgres: postgresTables.length,
      totalEdcat: edcatTables.length,
      usedPostgres: postgresTables.filter(t => t.isUsed).length,
      usedEdcat: edcatTables.filter(t => t.isUsed).length,
      duplicates: duplicates.length,
      deadEnds: deadEnds.length
    }
  };
  
  const reportPath = path.join(codebaseRoot, 'TABLE_MAPPING_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: TABLE_MAPPING_REPORT.json`);
  
  console.log('\n\n📋 SUMMARY');
  console.log('='.repeat(100));
  console.log(`PostgreSQL Tables: ${report.summary.totalPostgres} (${report.summary.usedPostgres} used, ${postgresTables.length - report.summary.usedPostgres} dead-ends)`);
  console.log(`EDCAT AI Tables: ${report.summary.totalEdcat} (${report.summary.usedEdcat} used, ${edcatTables.length - report.summary.usedEdcat} dead-ends)`);
  console.log(`Duplicates to remove: ${report.summary.duplicates}`);
  console.log(`Total dead-ends: ${report.summary.deadEnds}`);
  
  process.exit(0);
}

mapAllTables();

