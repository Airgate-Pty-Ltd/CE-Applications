/**
 * COMPREHENSIVE TABLE ARCHITECTURE AUDIT
 * 
 * This script:
 * 1. Extracts all table names from migration files
 * 2. Searches codebase for all SQL queries referencing tables
 * 3. Maps each table to its code connections (which files/routes use it)
 * 4. Identifies orphaned tables (defined but never used)
 * 5. Identifies missing tables (used but not defined)
 * 6. Generates comprehensive architecture documentation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// STEP 1: Extract all tables from migration files
// ============================================================================

function extractTablesFromMigrations() {
  const migrationsDir = path.join(__dirname, '../../../migrations');
  const tables = {
    postgres: new Set(),
    edcat_ai: new Set()
  };

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    
    // Determine which database this migration targets
    const isPostgres = content.includes('POSTGRESQL') || 
                      content.includes('DATABASE_URL') ||
                      content.includes('public.') ||
                      file.includes('postgres') ||
                      file.includes('001_') ||
                      file.includes('006_') ||
                      file.includes('007_') ||
                      file.includes('008_');
    
    const isEdcatAI = content.includes('EDCAT_AI') || 
                      content.includes('EDCAT_AI_DATABASE_URL') ||
                      content.includes('edcat.') ||
                      file.includes('edcat') ||
                      file.includes('002_') ||
                      file.includes('003_') ||
                      file.includes('004_') ||
                      file.includes('005_');

    // Extract CREATE TABLE statements
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.|edcat\.)?([a-z_]+)/gi;
    let match;
    
    while ((match = createTableRegex.exec(content)) !== null) {
      const tableName = match[1];
      
      if (isPostgres || (!isEdcatAI && !isPostgres)) {
        // Default to postgres if unclear
        tables.postgres.add(tableName);
      }
      if (isEdcatAI) {
        // Check if it's in edcat schema
        if (content.includes(`edcat.${tableName}`) || content.includes(`CREATE TABLE IF NOT EXISTS edcat.${tableName}`)) {
          tables.edcat_ai.add(`edcat.${tableName}`);
        } else {
          tables.edcat_ai.add(tableName);
        }
      }
    }

    // Also check for DROP TABLE to identify removed tables
    const dropTableRegex = /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.|edcat\.)?([a-z_]+)/gi;
    while ((match = dropTableRegex.exec(content)) !== null) {
      const tableName = match[1];
      // Note: We'll track these separately
    }
  }

  return {
    postgres: Array.from(tables.postgres).sort(),
    edcat_ai: Array.from(tables.edcat_ai).sort(),
    migrationFiles: migrationFiles
  };
}

// ============================================================================
// STEP 2: Search codebase for SQL queries
// ============================================================================

function findFilesRecursive(dir, extensions, ignoreDirs = ['node_modules', 'dist']) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      if (!ignoreDirs.includes(item.name)) {
        files.push(...findFilesRecursive(fullPath, extensions, ignoreDirs));
      }
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      if (extensions.includes(ext) && !item.name.includes('.test.') && !item.name.includes('.spec.')) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

function findTableReferencesInCode() {
  const backendDir = path.join(__dirname, '../../');
  const codeFiles = findFilesRecursive(backendDir, ['.js', '.ts']);

  const tableReferences = new Map(); // tableName -> [{ file, line, operation, context }]

  for (const fullPath of codeFiles) {
    const file = path.relative(backendDir, fullPath).replace(/\\/g, '/');
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    // Patterns to match SQL queries
    const patterns = [
      // SELECT FROM table
      /(?:SELECT|INSERT|UPDATE|DELETE|FROM|INTO|JOIN)\s+(?:public\.|edcat\.)?([a-z_]+)/gi,
      // Table references in backticks or quotes
      /['"`](?:public\.|edcat\.)?([a-z_]+)['"`]\s*(?:WHERE|SET|FROM|INTO|JOIN)/gi,
      // queryPostgres/queryEdcatAI calls with table names
      /query(?:Postgres|EdcatAI)\([^)]*['"](?:public\.|edcat\.)?([a-z_]+)['"]/gi
    ];

    lines.forEach((line, lineNum) => {
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const tableName = match[1];
          
          // Skip common false positives
          if (['id', 'name', 'code', 'type', 'status', 'count', 'now', 'text', 'json', 'uuid'].includes(tableName)) {
            return;
          }

          // Determine operation
          let operation = 'UNKNOWN';
          if (line.includes('SELECT')) operation = 'SELECT';
          else if (line.includes('INSERT')) operation = 'INSERT';
          else if (line.includes('UPDATE')) operation = 'UPDATE';
          else if (line.includes('DELETE')) operation = 'DELETE';
          else if (line.includes('FROM')) operation = 'SELECT';
          else if (line.includes('INTO')) operation = 'INSERT';

          if (!tableReferences.has(tableName)) {
            tableReferences.set(tableName, []);
          }

          tableReferences.get(tableName).push({
            file: file,
            line: lineNum + 1,
            operation: operation,
            context: line.trim().substring(0, 100)
          });
        }
      });
    });
  }

  return tableReferences;
}

// ============================================================================
// STEP 3: Generate comprehensive report
// ============================================================================

function generateReport(migrationTables, codeReferences) {
  const report = {
    postgres: {
      defined: migrationTables.postgres,
      referenced: [],
      orphaned: [],
      missing: []
    },
    edcat_ai: {
      defined: migrationTables.edcat_ai,
      referenced: [],
      orphaned: [],
      missing: []
    },
    tableConnections: new Map()
  };

  // Map each table to its code connections
  for (const [tableName, references] of codeReferences.entries()) {
    // Determine which database
    const isEdcatSchema = tableName.startsWith('edcat.');
    const baseTableName = isEdcatSchema ? tableName : tableName;
    
    // Check if table is defined in migrations
    const inPostgres = migrationTables.postgres.includes(baseTableName);
    const inEdcatAI = migrationTables.edcat_ai.includes(baseTableName) || 
                      migrationTables.edcat_ai.includes(tableName);

    if (isEdcatSchema || inEdcatAI) {
      if (inEdcatAI) {
        report.edcat_ai.referenced.push(tableName);
      } else {
        report.edcat_ai.missing.push(tableName);
      }
    } else {
      if (inPostgres) {
        report.postgres.referenced.push(baseTableName);
      } else {
        report.postgres.missing.push(baseTableName);
      }
    }

    // Store connections
    report.tableConnections.set(tableName, {
      database: isEdcatSchema ? 'EDCAT_AI' : 'PostgreSQL',
      references: references,
      defined: inPostgres || inEdcatAI
    });
  }

  // Find orphaned tables (defined but never referenced)
  for (const table of migrationTables.postgres) {
    if (!report.postgres.referenced.includes(table)) {
      report.postgres.orphaned.push(table);
    }
  }

  for (const table of migrationTables.edcat_ai) {
    if (!report.edcat_ai.referenced.includes(table)) {
      report.edcat_ai.orphaned.push(table);
    }
  }

  return report;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🔍 COMPREHENSIVE TABLE ARCHITECTURE AUDIT\n');
  console.log('='.repeat(80));
  
  console.log('\n📋 Step 1: Extracting tables from migration files...');
  const migrationTables = extractTablesFromMigrations();
  console.log(`   ✓ Found ${migrationTables.postgres.length} PostgreSQL tables`);
  console.log(`   ✓ Found ${migrationTables.edcat_ai.length} EDCAT AI tables`);
  console.log(`   ✓ Scanned ${migrationTables.migrationFiles.length} migration files`);

  console.log('\n📋 Step 2: Searching codebase for table references...');
  const codeReferences = findTableReferencesInCode();
  console.log(`   ✓ Found ${codeReferences.size} unique tables referenced in code`);

  console.log('\n📋 Step 3: Generating comprehensive report...');
  const report = generateReport(migrationTables, codeReferences);

  // Output report
  console.log('\n' + '='.repeat(80));
  console.log('📊 AUDIT RESULTS');
  console.log('='.repeat(80));

  console.log('\n🗄️  POSTGRESQL DATABASE:');
  console.log(`   Defined: ${report.postgres.defined.length} tables`);
  console.log(`   Referenced in code: ${report.postgres.referenced.length} tables`);
  console.log(`   Orphaned (no code connections): ${report.postgres.orphaned.length} tables`);
  console.log(`   Missing (used but not defined): ${report.postgres.missing.length} tables`);

  if (report.postgres.orphaned.length > 0) {
    console.log('\n   ⚠️  ORPHANED TABLES (can be removed):');
    report.postgres.orphaned.forEach(table => {
      console.log(`      - ${table}`);
    });
  }

  if (report.postgres.missing.length > 0) {
    console.log('\n   ❌ MISSING TABLES (need migration):');
    report.postgres.missing.forEach(table => {
      console.log(`      - ${table}`);
    });
  }

  console.log('\n🤖 EDCAT AI DATABASE:');
  console.log(`   Defined: ${report.edcat_ai.defined.length} tables`);
  console.log(`   Referenced in code: ${report.edcat_ai.referenced.length} tables`);
  console.log(`   Orphaned (no code connections): ${report.edcat_ai.orphaned.length} tables`);
  console.log(`   Missing (used but not defined): ${report.edcat_ai.missing.length} tables`);

  if (report.edcat_ai.orphaned.length > 0) {
    console.log('\n   ⚠️  ORPHANED TABLES (can be removed):');
    report.edcat_ai.orphaned.forEach(table => {
      console.log(`      - ${table}`);
    });
  }

  if (report.edcat_ai.missing.length > 0) {
    console.log('\n   ❌ MISSING TABLES (need migration):');
    report.edcat_ai.missing.forEach(table => {
      console.log(`      - ${table}`);
    });
  }

  // Generate detailed table connections report
  console.log('\n' + '='.repeat(80));
  console.log('🔗 TABLE-TO-CODE CONNECTIONS');
  console.log('='.repeat(80));

  const sortedTables = Array.from(report.tableConnections.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  for (const [tableName, info] of sortedTables) {
    console.log(`\n📋 ${tableName} (${info.database})`);
    console.log(`   Defined: ${info.defined ? '✅ YES' : '❌ NO'}`);
    console.log(`   Code references: ${info.references.length}`);
    
    if (info.references.length > 0) {
      const byFile = new Map();
      info.references.forEach(ref => {
        if (!byFile.has(ref.file)) {
          byFile.set(ref.file, []);
        }
        byFile.get(ref.file).push(ref);
      });

      byFile.forEach((refs, file) => {
        console.log(`      ${file}:`);
        refs.forEach(ref => {
          console.log(`         Line ${ref.line}: ${ref.operation} - ${ref.context.substring(0, 60)}...`);
        });
      });
    }
  }

  // Write detailed report to file
  const reportPath = path.join(__dirname, '../../../COMPLETE_TABLE_ARCHITECTURE_AUDIT.md');
  const reportContent = generateMarkdownReport(report, migrationTables);
  fs.writeFileSync(reportPath, reportContent);
  console.log(`\n✅ Detailed report written to: ${reportPath}`);

  return report;
}

function generateMarkdownReport(report, migrationTables) {
  let md = `# Complete Table Architecture Audit\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `## Summary\n\n`;
  md += `- **PostgreSQL Tables**: ${report.postgres.defined.length} defined, ${report.postgres.referenced.length} referenced, ${report.postgres.orphaned.length} orphaned\n`;
  md += `- **EDCAT AI Tables**: ${report.edcat_ai.defined.length} defined, ${report.edcat_ai.referenced.length} referenced, ${report.edcat_ai.orphaned.length} orphaned\n\n`;

  md += `## PostgreSQL Database\n\n`;
  md += `### All Defined Tables\n\n`;
  report.postgres.defined.forEach(table => {
    const isReferenced = report.postgres.referenced.includes(table);
    const isOrphaned = report.postgres.orphaned.includes(table);
    md += `- \`${table}\` ${isReferenced ? '✅' : ''} ${isOrphaned ? '⚠️ ORPHANED' : ''}\n`;
  });

  md += `\n### Table Connections\n\n`;
  const postgresTables = Array.from(report.tableConnections.entries())
    .filter(([name]) => !name.startsWith('edcat.'))
    .sort((a, b) => a[0].localeCompare(b[0]));

  for (const [tableName, info] of postgresTables) {
    md += `#### \`${tableName}\`\n\n`;
    md += `- **Database**: ${info.database}\n`;
    md += `- **Defined**: ${info.defined ? '✅ YES' : '❌ NO'}\n`;
    md += `- **Code References**: ${info.references.length}\n\n`;
    
    if (info.references.length > 0) {
      md += `**Files using this table:**\n\n`;
      const byFile = new Map();
      info.references.forEach(ref => {
        if (!byFile.has(ref.file)) {
          byFile.set(ref.file, []);
        }
        byFile.get(ref.file).push(ref);
      });

      byFile.forEach((refs, file) => {
        md += `- \`${file}\`:\n`;
        refs.forEach(ref => {
          md += `  - Line ${ref.line}: \`${ref.operation}\` - ${ref.context.substring(0, 80)}\n`;
        });
      });
      md += `\n`;
    }
  }

  md += `\n## EDCAT AI Database\n\n`;
  md += `### All Defined Tables\n\n`;
  report.edcat_ai.defined.forEach(table => {
    const isReferenced = report.edcat_ai.referenced.includes(table);
    const isOrphaned = report.edcat_ai.orphaned.includes(table);
    md += `- \`${table}\` ${isReferenced ? '✅' : ''} ${isOrphaned ? '⚠️ ORPHANED' : ''}\n`;
  });

  md += `\n### Orphaned Tables (Can Be Removed)\n\n`;
  if (report.postgres.orphaned.length > 0) {
    md += `**PostgreSQL:**\n\n`;
    report.postgres.orphaned.forEach(table => {
      md += `- \`${table}\`\n`;
    });
    md += `\n`;
  }

  if (report.edcat_ai.orphaned.length > 0) {
    md += `**EDCAT AI:**\n\n`;
    report.edcat_ai.orphaned.forEach(table => {
      md += `- \`${table}\`\n`;
    });
    md += `\n`;
  }

  return md;
}

main().catch(console.error);

