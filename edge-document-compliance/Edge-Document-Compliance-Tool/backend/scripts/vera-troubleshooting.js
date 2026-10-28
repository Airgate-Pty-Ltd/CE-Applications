/**
 * Vera Troubleshooting and Debugging Script
 * Comprehensive diagnostic tool for identifying and fixing Vera issues
 */

import { queryPostgres, queryEdcatAI } from '../src/config/databases.js';
import path from 'path';

// Import health service with try-catch to handle missing module gracefully
async function getHealthService() {
  try {
    const healthModule = await import('../src/services/vera/VeraEngineHealthService.js');
    return healthModule.veraEngineHealth;
  } catch (err) {
    console.warn('⚠️  Could not import VeraEngineHealthService:', err.message);
    // Create a mock health service
    return {
      getCurrentIssues: () => []
    };
  }
}

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

const report = {
  timestamp: new Date().toISOString(),
  checks: [],
  errors: [],
  warnings: [],
  recommendations: []
};

function addCheck(name, status, message, details = null) {
  report.checks.push({ name, status, message, details });
  if (status === 'ERROR') {
    report.errors.push({ name, message, details });
  } else if (status === 'WARNING') {
    report.warnings.push({ name, message, details });
  }
}

function addRecommendation(priority, action, reason) {
  report.recommendations.push({ priority, action, reason });
}

async function checkDatabaseConnections() {
  console.log('\n🔍 Checking Database Connections...');
  
  try {
    const pgTest = await queryPostgres('SELECT 1 as test');
    if (pgTest.rows[0].test === 1) {
      addCheck('PostgreSQL Connection', 'OK', 'Customer Data DB connection successful');
    } else {
      addCheck('PostgreSQL Connection', 'ERROR', 'Customer Data DB connection failed');
    }
  } catch (err) {
    addCheck('PostgreSQL Connection', 'ERROR', `Customer Data DB connection failed: ${err.message}`);
    addRecommendation('HIGH', 'Fix DATABASE_URL environment variable', 'Cannot connect to Customer Data DB');
  }
  
  try {
    const edcatTest = await queryEdcatAI('SELECT 1 as test');
    if (edcatTest.rows[0].test === 1) {
      addCheck('EDCAT AI Connection', 'OK', 'EDCAT AI DB connection successful');
    } else {
      addCheck('EDCAT AI Connection', 'ERROR', 'EDCAT AI DB connection failed');
    }
  } catch (err) {
    addCheck('EDCAT AI Connection', 'ERROR', `EDCAT AI DB connection failed: ${err.message}`);
    addRecommendation('HIGH', 'Fix EDCAT_AI_DATABASE_URL environment variable', 'Cannot connect to EDCAT AI DB');
  }
}

async function checkCriticalTables() {
  console.log('\n🔍 Checking Critical Tables...');
  
  const criticalTables = [
    { schema: 'edcat', table: 'terms_and_definitions', description: 'Terminology database' },
    { schema: 'edcat', table: 'vera_query_response_bank', description: 'Q&A response bank' },
    { schema: 'edcat', table: 'document_content_for_learning', description: 'Learning documents' },
    { schema: 'edcat', table: 'conversation_memory', description: 'Conversation memory' },
    { schema: 'edcat', table: 'ai_conversation_history', description: 'Conversation history' },
    { schema: 'edcat', table: 'vera_debug_sessions', description: 'Debug sessions' },
    { schema: 'public', table: 'compliance_requirements', description: 'Compliance requirements' },
    { schema: 'public', table: 'standards', description: 'Standards' }
  ];
  
  for (const { schema, table, description } of criticalTables) {
    try {
      const queryFn = schema === 'public' ? queryPostgres : queryEdcatAI;
      const check = await queryFn(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 
          AND table_name = $2
        ) as exists
      `, [schema, table]);
      
      if (check.rows[0].exists) {
        // Check row count
        const count = await queryFn(`SELECT COUNT(*) as count FROM ${schema}.${table}`);
        addCheck(`${schema}.${table}`, 'OK', `${description} exists (${count.rows[0].count} rows)`);
      } else {
        addCheck(`${schema}.${table}`, 'ERROR', `${description} table missing`);
        addRecommendation('HIGH', `Create ${schema}.${table} table`, `Required table ${table} does not exist`);
      }
    } catch (err) {
      addCheck(`${schema}.${table}`, 'ERROR', `Error checking ${description}: ${err.message}`);
    }
  }
}

async function checkSchemaColumns() {
  console.log('\n🔍 Checking Schema Columns...');
  
  const criticalColumns = [
    { schema: 'edcat', table: 'conversation_memory', column: 'role', description: 'Role column for loop avoidance' },
    { schema: 'edcat', table: 'conversation_memory', column: 'message_text', description: 'Message text column' },
    { schema: 'edcat', table: 'ai_conversation_history', column: 'message_text', description: 'Message text column' },
    { schema: 'edcat', table: 'vera_query_response_bank', column: 'question_text', description: 'Question text column' },
    { schema: 'edcat', table: 'vera_query_response_bank', column: 'response_text', description: 'Response text column' },
    { schema: 'edcat', table: 'vera_debug_sessions', column: 'user_id', description: 'User ID column (should be nullable)' },
    { schema: 'edcat', table: 'vera_debug_sessions', column: 'issue_code', description: 'Issue code column' }
  ];
  
  for (const { schema, table, column, description } of criticalColumns) {
    try {
      const check = await queryEdcatAI(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = $1 
          AND table_name = $2 
          AND column_name = $3
        ) as exists
      `, [schema, table, column]);
      
      if (check.rows[0].exists) {
        addCheck(`${schema}.${table}.${column}`, 'OK', `${description} exists`);
      } else {
        addCheck(`${schema}.${table}.${column}`, 'ERROR', `${description} missing`);
        addRecommendation('HIGH', `Add ${column} column to ${schema}.${table}`, `Required column ${column} does not exist`);
      }
    } catch (err) {
      addCheck(`${schema}.${table}.${column}`, 'ERROR', `Error checking ${description}: ${err.message}`);
    }
  }
}

async function checkQAResponses() {
  console.log('\n🔍 Checking Q&A Responses...');
  
  try {
    const stats = await queryEdcatAI(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN response_text IS NOT NULL AND response_text != '' THEN 1 END) as with_text,
        COUNT(CASE WHEN response_text IS NULL OR response_text = '' THEN 1 END) as without_text,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active
      FROM edcat.vera_query_response_bank
    `);
    
    const row = stats.rows[0];
    addCheck('Q&A Response Bank', 'OK', 
      `Total: ${row.total}, Active: ${row.active}, With Text: ${row.with_text}, Without Text: ${row.without_text}`);
    
    if (parseInt(row.without_text) > 0) {
      addCheck('Q&A Response Text', 'WARNING', 
        `${row.without_text} responses missing text`);
      addRecommendation('MEDIUM', 'Run migration 055_verify_qa_responses.sql', 
        'Some Q&A responses are missing response_text');
    }
  } catch (err) {
    addCheck('Q&A Response Bank', 'ERROR', `Error checking Q&A bank: ${err.message}`);
  }
}

async function checkHealthService() {
  console.log('\n🔍 Checking Health Service...');
  
  try {
    const veraEngineHealth = await getHealthService();
    const issues = veraEngineHealth.getCurrentIssues();
    if (issues.length === 0) {
      addCheck('Vera Health Service', 'OK', 'No active issues detected');
    } else {
      addCheck('Vera Health Service', 'WARNING', 
        `${issues.length} active issues detected`);
      issues.forEach(issue => {
        addCheck(`Health Issue: ${issue.code}`, 'WARNING', 
          `${issue.severity}: ${issue.message}`);
        addRecommendation('MEDIUM', `Address issue: ${issue.code}`, issue.message);
      });
    }
  } catch (err) {
    addCheck('Vera Health Service', 'ERROR', `Error checking health service: ${err.message}`);
  }
}

async function checkSemanticMemory() {
  console.log('\n🔍 Checking Semantic Memory...');
  
  try {
    const check = await queryEdcatAI(`
      SELECT EXISTS (
        SELECT FROM pg_extension WHERE extname = 'vector'
      ) as exists
    `);
    
    if (check.rows[0].exists) {
      addCheck('pgvector Extension', 'OK', 'pgvector extension is available');
    } else {
      addCheck('pgvector Extension', 'WARNING', 'pgvector extension not available - keyword fallback will be used');
      addRecommendation('LOW', 'Install pgvector extension for better semantic search', 
        'Keyword fallback works but semantic search is more accurate');
    }
  } catch (err) {
    addCheck('pgvector Extension', 'WARNING', `Could not check pgvector: ${err.message}`);
  }
  
  // Check if document_content_for_learning has embedding column
  try {
    const check = await queryEdcatAI(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'edcat' 
        AND table_name = 'document_content_for_learning' 
        AND column_name = 'embedding'
      ) as exists
    `);
    
    if (check.rows[0].exists) {
      addCheck('Learning Documents Embeddings', 'OK', 'Embedding column exists');
    } else {
      addCheck('Learning Documents Embeddings', 'WARNING', 'Embedding column missing - keyword search will be used');
    }
  } catch (err) {
    addCheck('Learning Documents Embeddings', 'WARNING', `Could not check embedding column: ${err.message}`);
  }
}

async function checkDataAvailability() {
  console.log('\n🔍 Checking Data Availability...');
  
  const dataChecks = [
    { schema: 'edcat', table: 'terms_and_definitions', name: 'Terms and Definitions' },
    { schema: 'edcat', table: 'document_content_for_learning', name: 'Learning Documents' },
    { schema: 'edcat', table: 'learning_examples', name: 'Example Documents' },
    { schema: 'edcat', table: 'vera_query_response_bank', name: 'Q&A Responses' },
    { schema: 'public', table: 'standards', name: 'Standards' },
    { schema: 'public', table: 'compliance_requirements', name: 'Compliance Requirements' }
  ];
  
  for (const { schema, table, name } of dataChecks) {
    try {
      const queryFn = schema === 'public' ? queryPostgres : queryEdcatAI;
      const count = await queryFn(`SELECT COUNT(*) as count FROM ${schema}.${table}`);
      const rowCount = parseInt(count.rows[0].count);
      
      if (rowCount > 0) {
        addCheck(`${name} Data`, 'OK', `${rowCount} records available`);
      } else {
        addCheck(`${name} Data`, 'WARNING', `No ${name.toLowerCase()} available`);
        addRecommendation('MEDIUM', `Ingest ${name.toLowerCase()}`, `No data in ${schema}.${table}`);
      }
    } catch (err) {
      addCheck(`${name} Data`, 'ERROR', `Error checking ${name}: ${err.message}`);
    }
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERA TROUBLESHOOTING REPORT');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`\nTotal Checks: ${report.checks.length}`);
  console.log(`✅ Passed: ${report.checks.filter(c => c.status === 'OK').length}`);
  console.log(`⚠️  Warnings: ${report.checks.filter(c => c.status === 'WARNING').length}`);
  console.log(`❌ Errors: ${report.checks.filter(c => c.status === 'ERROR').length}`);
  
  if (report.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    report.errors.forEach(err => {
      console.log(`  - ${err.name}: ${err.message}`);
    });
  }
  
  if (report.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    report.warnings.forEach(warn => {
      console.log(`  - ${warn.name}: ${warn.message}`);
    });
  }
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    const byPriority = {
      HIGH: report.recommendations.filter(r => r.priority === 'HIGH'),
      MEDIUM: report.recommendations.filter(r => r.priority === 'MEDIUM'),
      LOW: report.recommendations.filter(r => r.priority === 'LOW')
    };
    
    if (byPriority.HIGH.length > 0) {
      console.log('\n  HIGH PRIORITY:');
      byPriority.HIGH.forEach(rec => {
        console.log(`    - ${rec.action}`);
        console.log(`      Reason: ${rec.reason}`);
      });
    }
    
    if (byPriority.MEDIUM.length > 0) {
      console.log('\n  MEDIUM PRIORITY:');
      byPriority.MEDIUM.forEach(rec => {
        console.log(`    - ${rec.action}`);
        console.log(`      Reason: ${rec.reason}`);
      });
    }
    
    if (byPriority.LOW.length > 0) {
      console.log('\n  LOW PRIORITY:');
      byPriority.LOW.forEach(rec => {
        console.log(`    - ${rec.action}`);
        console.log(`      Reason: ${rec.reason}`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Save report to file
  const fs = await import('fs');
  const reportPath = 'backend/vera-troubleshooting-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}`);
}

async function runTroubleshooting() {
  console.log('\n🚀 Starting Vera Troubleshooting and Debugging');
  console.log('='.repeat(60));
  
  await checkDatabaseConnections();
  await checkCriticalTables();
  await checkSchemaColumns();
  await checkQAResponses();
  await checkHealthService();
  await checkSemanticMemory();
  await checkDataAvailability();
  
  await generateReport();
}

// Run if called directly
const isMainModule = import.meta.url === `file://${path.resolve(process.argv[1])}` || 
                     import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule || process.argv[1]?.includes('vera-troubleshooting')) {
  runTroubleshooting().catch(console.error);
}

export { runTroubleshooting };

