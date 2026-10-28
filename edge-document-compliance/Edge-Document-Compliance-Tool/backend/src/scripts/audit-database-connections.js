/**
 * Comprehensive Database Connection Audit
 * 
 * Traces all database connections, table references, and identifies:
 * - Broken connections
 * - Missing connection strings
 * - Incorrect database usage (queryPostgres for edcat tables, etc.)
 * - Legacy connection code
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const issues = {
  incorrectDatabaseUsage: [],
  missingConnectionStrings: [],
  legacyConnectionCode: [],
  brokenConnections: [],
  missingTables: []
};

// Expected table mappings
const EXPECTED_TABLES = {
  postgres: [
    'public.standards',
    'public.compliance_requirements',
    'public.compliance_standards',
    'public.customer_documents',
    'public.customer_procedures',
    'public.gap_analyses',
    'public.regulatory_registry',
    'public.parsed_requirements',
    'public.standard_files',
    'public.tenants',
    'public.users',
    'public.upload_files',
    'public.analysis_clarifications',
    'public.generated_reports',
    'public.user_feedback',
    'public.audit_logs',
    'public.integration_logs'
  ],
  edcat: [
    'edcat.terms_and_definitions',
    'edcat.document_content_for_learning',
    'edcat.example_documents',
    'edcat.vera_query_response_bank',
    'edcat.ai_conversation_history',
    'edcat.ai_conversation_state',
    'edcat.conversation_memory',
    'edcat.vera_memory',
    'edcat.vera_response_templates',
    'edcat.ai_router',
    'edcat.ai_template',
    'edcat.ai_policy',
    'edcat.ai_prompt',
    'edcat.vera_learned_corrections',
    'edcat.vera_debug_sessions',
    'edcat.knowledge_embeddings',
    'edcat.vera_knowledge_graph_concepts',
    'edcat.vera_standard_profiles',
    'edcat.vera_clarification_rules',
    'edcat.vera_knowledge_boundaries',
    'edcat.requirement_mappings',
    'edcat.vera_requirement_reasoning_chains'
  ]
};

// Scan all TypeScript and JavaScript files
function scanFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, .git, dist, build
      if (!['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(file)) {
        scanFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Analyze a file for database connection issues
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(path.join(__dirname, '../..'), filePath);
    
    // Check for incorrect database usage
    // queryPostgres with edcat tables
    const postgresWithEdcat = content.match(/queryPostgres[^;]*FROM\s+edcat\./gi);
    if (postgresWithEdcat) {
      postgresWithEdcat.forEach(match => {
        issues.incorrectDatabaseUsage.push({
          file: relativePath,
          issue: 'queryPostgres used with edcat table',
          code: match.substring(0, 100),
          fix: 'Change queryPostgres to queryEdcatAI'
        });
      });
    }
    
    // queryEdcatAI with public tables (may be intentional for cross-db queries)
    const edcatWithPublic = content.match(/queryEdcatAI[^;]*FROM\s+public\./gi);
    if (edcatWithPublic) {
      edcatWithPublic.forEach(match => {
        issues.incorrectDatabaseUsage.push({
          file: relativePath,
          issue: 'queryEdcatAI used with public table',
          code: match.substring(0, 100),
          fix: 'Verify if this should be queryPostgres instead',
          severity: 'warning'
        });
      });
    }
    
    // Check for missing connection string checks
    if (content.includes('queryPostgres') || content.includes('queryEdcatAI')) {
      if (!content.includes('DATABASE_URL') && !content.includes('EDCAT_AI_DATABASE_URL')) {
        // Check if it imports from databases.js (which handles connection strings)
        if (!content.includes('from') && !content.includes('require')) {
          issues.missingConnectionStrings.push({
            file: relativePath,
            issue: 'Uses database queries but no connection string validation visible',
            fix: 'Ensure connection strings are checked or imported from databases.js'
          });
        }
      }
    }
    
    // Check for legacy connection code
    const legacyPatterns = [
      /new\s+Pool\s*\(/g,
      /createPool\s*\(/g,
      /process\.env\.DB_HOST/g,
      /process\.env\.DB_NAME/g,
      /process\.env\.DB_USER/g,
      /process\.env\.DB_PASSWORD/g
    ];
    
    legacyPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches && !filePath.includes('databases.js') && !filePath.includes('connection.js')) {
        issues.legacyConnectionCode.push({
          file: relativePath,
          issue: 'Legacy connection code detected',
          pattern: pattern.toString(),
          fix: 'Use queryPostgres/queryEdcatAI from databases.js instead'
        });
      }
    });
    
    // Check for hardcoded table references that might not exist
    EXPECTED_TABLES.edcat.forEach(table => {
      const regex = new RegExp(`FROM\\s+${table.replace('.', '\\.')}`, 'gi');
      if (content.match(regex)) {
        // Check if using correct database function
        if (content.match(/queryPostgres[^;]*FROM\s+${table.replace('.', '\\.')}/gi)) {
          issues.incorrectDatabaseUsage.push({
            file: relativePath,
            issue: `Table ${table} accessed via queryPostgres (should use queryEdcatAI)`,
            fix: 'Change queryPostgres to queryEdcatAI'
          });
        }
      }
    });
    
    EXPECTED_TABLES.postgres.forEach(table => {
      const regex = new RegExp(`FROM\\s+${table.replace('.', '\\.')}`, 'gi');
      if (content.match(regex)) {
        // Check if using correct database function
        if (content.match(/queryEdcatAI[^;]*FROM\s+${table.replace('.', '\\.')}/gi)) {
          issues.incorrectDatabaseUsage.push({
            file: relativePath,
            issue: `Table ${table} accessed via queryEdcatAI (should use queryPostgres)`,
            fix: 'Change queryEdcatAI to queryPostgres',
            severity: 'warning' // May be intentional for cross-db queries
          });
        }
      }
    });
    
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
  }
}

// Main audit function
async function runAudit() {
  console.log('🔍 Starting Database Connection Audit...\n');
  
  const backendDir = path.join(__dirname, '../..');
  const files = scanFiles(backendDir);
  
  console.log(`📁 Scanning ${files.length} files...\n`);
  
  files.forEach(file => {
    analyzeFile(file);
  });
  
  // Generate report
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           DATABASE CONNECTION AUDIT REPORT                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Incorrect Database Usage
  console.log(`\n❌ INCORRECT DATABASE USAGE (${issues.incorrectDatabaseUsage.length} issues):`);
  console.log('='.repeat(70));
  if (issues.incorrectDatabaseUsage.length === 0) {
    console.log('✅ No incorrect database usage found');
  } else {
    issues.incorrectDatabaseUsage.forEach((issue, idx) => {
      console.log(`\n${idx + 1}. ${issue.file}`);
      console.log(`   Issue: ${issue.issue}`);
      console.log(`   Code: ${issue.code || 'N/A'}`);
      console.log(`   Fix: ${issue.fix}`);
      if (issue.severity) console.log(`   Severity: ${issue.severity}`);
    });
  }
  
  // Missing Connection Strings
  console.log(`\n⚠️  MISSING CONNECTION STRING VALIDATION (${issues.missingConnectionStrings.length} issues):`);
  console.log('='.repeat(70));
  if (issues.missingConnectionStrings.length === 0) {
    console.log('✅ All files properly validate connection strings');
  } else {
    issues.missingConnectionStrings.forEach((issue, idx) => {
      console.log(`\n${idx + 1}. ${issue.file}`);
      console.log(`   Issue: ${issue.issue}`);
      console.log(`   Fix: ${issue.fix}`);
    });
  }
  
  // Legacy Connection Code
  console.log(`\n🔧 LEGACY CONNECTION CODE (${issues.legacyConnectionCode.length} issues):`);
  console.log('='.repeat(70));
  if (issues.legacyConnectionCode.length === 0) {
    console.log('✅ No legacy connection code found');
  } else {
    const uniqueFiles = [...new Set(issues.legacyConnectionCode.map(i => i.file))];
    uniqueFiles.forEach((file, idx) => {
      const fileIssues = issues.legacyConnectionCode.filter(i => i.file === file);
      console.log(`\n${idx + 1}. ${file}`);
      console.log(`   Issues: ${fileIssues.length} legacy patterns found`);
      fileIssues.forEach(issue => {
        console.log(`   - ${issue.issue}`);
      });
      console.log(`   Fix: ${fileIssues[0].fix}`);
    });
  }
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      SUMMARY                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`Total Issues Found: ${issues.incorrectDatabaseUsage.length + issues.missingConnectionStrings.length + issues.legacyConnectionCode.length}`);
  console.log(`  - Incorrect Database Usage: ${issues.incorrectDatabaseUsage.length}`);
  console.log(`  - Missing Connection Validation: ${issues.missingConnectionStrings.length}`);
  console.log(`  - Legacy Connection Code: ${issues.legacyConnectionCode.length}`);
  
  // Save report to file
  const reportPath = path.join(__dirname, '../../DATABASE_CONNECTION_AUDIT_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(issues, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}`);
  
  return issues;
}

// Run audit
runAudit().catch(console.error);

