/**
 * VERA FULL DIAGNOSTIC SCRIPT
 * 
 * Comprehensive check of:
 * - Database connections (Postgres + EDCAT AI)
 * - Table existence and schemas
 * - Data availability
 * - Q&A bank access
 * - Terminology library access
 * - Memory tables
 * - Service functionality
 * 
 * Usage: node backend/src/scripts/vera-full-diagnostic.js
 */

import { queryPostgres, queryEdcatAI, checkConnections, postgresPool, edcatPool } from '../config/databases.js';
import dotenv from 'dotenv';

dotenv.config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(70)}`, 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(70), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

const diagnostics = {
  connections: {},
  tables: {},
  data: {},
  services: {},
  errors: []
};

/**
 * TEST 1: Database Connections
 */
async function testConnections() {
  logSection('TEST 1: DATABASE CONNECTIONS');

  // Check environment variables
  logInfo('Checking environment variables...');
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const hasEdcatUrl = !!process.env.EDCAT_AI_DATABASE_URL;
  
  if (hasDatabaseUrl) {
    logSuccess(`DATABASE_URL is set (${process.env.DATABASE_URL.substring(0, 30)}...)`);
  } else {
    logError('DATABASE_URL is NOT set');
    diagnostics.errors.push('DATABASE_URL missing');
  }

  if (hasEdcatUrl) {
    logSuccess(`EDCAT_AI_DATABASE_URL is set (${process.env.EDCAT_AI_DATABASE_URL.substring(0, 30)}...)`);
  } else {
    logWarning('EDCAT_AI_DATABASE_URL is NOT set (will use DATABASE_URL)');
  }

  // Check pool initialization
  logInfo('\nChecking pool initialization...');
  if (postgresPool) {
    logSuccess('Postgres pool initialized');
    diagnostics.connections.postgresPool = true;
  } else {
    logError('Postgres pool is NULL');
    diagnostics.connections.postgresPool = false;
    diagnostics.errors.push('Postgres pool not initialized');
  }

  if (edcatPool) {
    logSuccess('EDCAT AI pool initialized');
    diagnostics.connections.edcatPool = true;
  } else {
    logError('EDCAT AI pool is NULL');
    diagnostics.connections.edcatPool = false;
    diagnostics.errors.push('EDCAT AI pool not initialized');
  }

  // Test actual connections
  logInfo('\nTesting Postgres connection...');
  try {
    const pgResult = await queryPostgres('SELECT NOW() as now, current_database() as db');
    logSuccess(`Postgres connected: ${pgResult.rows[0].db} at ${pgResult.rows[0].now}`);
    diagnostics.connections.postgres = 'connected';
  } catch (error) {
    logError(`Postgres connection failed: ${error.message}`);
    diagnostics.connections.postgres = 'error';
    diagnostics.errors.push(`Postgres: ${error.message}`);
  }

  logInfo('Testing EDCAT AI connection...');
  try {
    const edcatResult = await queryEdcatAI('SELECT NOW() as now, current_database() as db');
    logSuccess(`EDCAT AI connected: ${edcatResult.rows[0].db} at ${edcatResult.rows[0].now}`);
    diagnostics.connections.edcatAI = 'connected';
  } catch (error) {
    logError(`EDCAT AI connection failed: ${error.message}`);
    diagnostics.connections.edcatAI = 'error';
    diagnostics.errors.push(`EDCAT AI: ${error.message}`);
  }

  // Check schema
  logInfo('\nChecking EDCAT AI schema...');
  try {
    const schemaResult = await queryEdcatAI(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'edcat'
    `);
    if (schemaResult.rows.length > 0) {
      logSuccess('Schema "edcat" exists');
    } else {
      logWarning('Schema "edcat" does NOT exist');
    }
  } catch (error) {
    logError(`Schema check failed: ${error.message}`);
  }
}

/**
 * TEST 2: Table Existence
 */
async function testTableExistence() {
  logSection('TEST 2: TABLE EXISTENCE');

  const criticalTables = [
    { name: 'vera_query_response_bank', schema: 'edcat', description: 'Q&A response bank' },
    { name: 'terms_and_definitions', schema: 'edcat', description: 'Terminology library (correct name)' },
    { name: 'vera_manufacturing_terminology', schema: 'edcat', description: 'Terminology library (alternate name)', optional: true },
    { name: 'ai_conversation_history', schema: 'edcat', description: 'Conversation history' },
    { name: 'ai_conversation_state', schema: 'edcat', description: 'Conversation state' },
    { name: 'vera_debug_sessions', schema: 'edcat', description: 'Debug sessions' },
    { name: 'knowledge_embeddings', schema: 'edcat', description: 'Knowledge embeddings' },
    { name: 'conversation_memory', schema: 'edcat', description: 'Conversation memory' },
    { name: 'standards', schema: 'public', description: 'Standards (Postgres)' },
    { name: 'parsed_requirements', schema: 'public', description: 'Requirements (Postgres)' }
  ];

  for (const table of criticalTables) {
    try {
      const query = table.schema === 'edcat' 
        ? `SELECT EXISTS (
             SELECT FROM information_schema.tables 
             WHERE table_schema = 'edcat' AND table_name = $1
           ) as exists`
        : `SELECT EXISTS (
             SELECT FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = $1
           ) as exists`;

      const pool = table.schema === 'edcat' ? queryEdcatAI : queryPostgres;
      const result = await pool(query, [table.name]);

      if (result.rows[0].exists) {
        logSuccess(`${table.schema}.${table.name} exists (${table.description})`);
        diagnostics.tables[table.name] = true;
      } else {
        if (table.optional) {
          logWarning(`${table.schema}.${table.name} does NOT exist (${table.description}) - optional`);
          diagnostics.tables[table.name] = 'optional_missing';
        } else {
          logError(`${table.schema}.${table.name} does NOT exist (${table.description})`);
          diagnostics.tables[table.name] = false;
          diagnostics.errors.push(`Table missing: ${table.schema}.${table.name}`);
        }
      }
    } catch (error) {
      logError(`${table.schema}.${table.name} check failed: ${error.message}`);
      diagnostics.tables[table.name] = 'error';
      diagnostics.errors.push(`Table check error: ${table.schema}.${table.name} - ${error.message}`);
    }
  }
}

/**
 * TEST 3: Table Schemas (Column Existence)
 */
async function testTableSchemas() {
  logSection('TEST 3: TABLE SCHEMAS (COLUMNS)');

  const schemaChecks = [
    {
      table: 'vera_query_response_bank',
      schema: 'edcat',
      requiredColumns: ['id', 'user_query_pattern', 'response_text', 'answer', 'response_template', 'category', 'persona_code', 'tenant_id'],
      pool: queryEdcatAI
    },
    {
      table: 'terms_and_definitions',
      schema: 'edcat',
      requiredColumns: ['id', 'term', 'definition', 'category', 'source_standard'],
      pool: queryEdcatAI
    },
    {
      table: 'ai_conversation_history',
      schema: 'edcat',
      requiredColumns: ['id', 'session_id', 'tenant_id', 'user_id', 'role', 'message_text', 'created_at'],
      pool: queryEdcatAI
    }
  ];

  for (const check of schemaChecks) {
    logInfo(`Checking ${check.schema}.${check.table}...`);
    try {
      const result = await check.pool(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY column_name
      `, [check.schema, check.table]);

      const existingColumns = result.rows.map(r => r.column_name);
      const missingColumns = check.requiredColumns.filter(col => !existingColumns.includes(col));

      if (missingColumns.length === 0) {
        logSuccess(`All required columns exist (${existingColumns.length} total)`);
        diagnostics.tables[`${check.table}_schema`] = 'complete';
      } else {
        logError(`Missing columns: ${missingColumns.join(', ')}`);
        diagnostics.tables[`${check.table}_schema`] = 'incomplete';
        diagnostics.errors.push(`Missing columns in ${check.table}: ${missingColumns.join(', ')}`);
      }

      // Check for embedding column specifically
      if (existingColumns.includes('embedding') || existingColumns.includes('embedding_vector')) {
        logSuccess('Embedding column exists');
      } else {
        logWarning('Embedding column missing (may need migration 056)');
      }

    } catch (error) {
      logError(`Schema check failed: ${error.message}`);
      diagnostics.errors.push(`Schema check error: ${check.table} - ${error.message}`);
    }
  }
}

/**
 * TEST 4: Data Availability
 */
async function testDataAvailability() {
  logSection('TEST 4: DATA AVAILABILITY');

  // Check Q&A bank
  logInfo('Checking Q&A response bank...');
  try {
    const qaResult = await queryEdcatAI(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN response_text IS NOT NULL THEN 1 END) as has_response_text,
             COUNT(CASE WHEN answer IS NOT NULL THEN 1 END) as has_answer,
             COUNT(CASE WHEN response_template IS NOT NULL THEN 1 END) as has_template
      FROM edcat.vera_query_response_bank
      WHERE persona_code = 'vera'
    `);

    const qa = qaResult.rows[0];
    logInfo(`Total Q&A entries: ${qa.total}`);
    logInfo(`  - With response_text: ${qa.has_response_text}`);
    logInfo(`  - With answer: ${qa.has_answer}`);
    logInfo(`  - With response_template: ${qa.has_template}`);

    if (parseInt(qa.total) > 0) {
      logSuccess(`Q&A bank has ${qa.total} entries`);
      diagnostics.data.qaBank = parseInt(qa.total);
    } else {
      logError('Q&A bank is EMPTY - need to run seed script!');
      diagnostics.data.qaBank = 0;
      diagnostics.errors.push('Q&A bank is empty');
    }

    // Check for specific entries
    const as9100Check = await queryEdcatAI(`
      SELECT id, category, user_query_pattern 
      FROM edcat.vera_query_response_bank 
      WHERE (user_query_pattern ILIKE '%AS9100%' 
         OR representative_examples::text ILIKE '%AS9100%')
        AND persona_code = 'vera'
      LIMIT 5
    `);

    if (as9100Check.rows.length > 0) {
      logSuccess(`Found ${as9100Check.rows.length} AS9100-related entries`);
    } else {
      logWarning('No AS9100-related entries found');
    }

  } catch (error) {
    logError(`Q&A bank check failed: ${error.message}`);
    diagnostics.errors.push(`Q&A bank check: ${error.message}`);
  }

  // Check terminology library (try both table names)
  logInfo('\nChecking terminology library...');
  let termResult = null;
  let terminologyTableName = null;
  
  try {
    // Try terms_and_definitions first (correct name)
    try {
      termResult = await queryEdcatAI(`
        SELECT COUNT(*) as total,
               COUNT(DISTINCT category) as categories,
               COUNT(DISTINCT source_standard) as standards
        FROM edcat.terms_and_definitions
      `);
      terminologyTableName = 'edcat.terms_and_definitions';
      logSuccess('Found terminology table: edcat.terms_and_definitions');
    } catch (err) {
      // Try alternate name
      try {
        termResult = await queryEdcatAI(`
          SELECT COUNT(*) as total,
                 COUNT(DISTINCT category) as categories,
                 COUNT(DISTINCT standard_code) as standards
          FROM edcat.vera_manufacturing_terminology
        `);
        terminologyTableName = 'edcat.vera_manufacturing_terminology';
        logSuccess('Found terminology table: edcat.vera_manufacturing_terminology');
      } catch (err2) {
        throw new Error(`Neither table exists: ${err.message}`);
      }
    }

    const term = termResult.rows[0];
    logInfo(`Total terms: ${term.total}`);
    logInfo(`Categories: ${term.categories}`);
    logInfo(`Standards: ${term.standards}`);

    if (parseInt(term.total) > 0) {
      logSuccess(`Terminology library has ${term.total} terms`);
      diagnostics.data.terminology = parseInt(term.total);
    } else {
      logError('Terminology library is EMPTY - need to seed data!');
      diagnostics.data.terminology = 0;
      diagnostics.errors.push('Terminology library is empty');
    }

  } catch (error) {
    logError(`Terminology check failed: ${error.message}`);
    diagnostics.errors.push(`Terminology check: ${error.message}`);
  }

  // Check conversation history
  logInfo('\nChecking conversation history...');
  try {
    const historyResult = await queryEdcatAI(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT session_id) as sessions,
             COUNT(DISTINCT tenant_id) as tenants
      FROM edcat.ai_conversation_history
    `);

    const hist = historyResult.rows[0];
    logInfo(`Total messages: ${hist.total}`);
    logInfo(`Sessions: ${hist.sessions}`);
    logInfo(`Tenants: ${hist.tenants}`);
    diagnostics.data.conversationHistory = parseInt(hist.total);

  } catch (error) {
    logError(`History check failed: ${error.message}`);
    diagnostics.errors.push(`History check: ${error.message}`);
  }
}

/**
 * TEST 5: Service Functionality
 */
async function testServiceFunctionality() {
  logSection('TEST 5: SERVICE FUNCTIONALITY');

  // Test VeraQueryResponseService
  logInfo('Testing VeraQueryResponseService...');
  try {
    const VeraQueryResponseService = (await import('../services/vera/VeraQueryResponseService.js')).default;
    
    const testMatch = await VeraQueryResponseService.findBestMatch({
      tenantId: '00000000-0000-0000-0000-000000000000',
      personaCode: 'vera',
      message: 'what is AS9100',
      intent: 'qa',
      category: null
    });

    if (testMatch && testMatch.id) {
      logSuccess(`Q&A service found match: ${testMatch.category} (confidence: ${testMatch.confidence_score || 'N/A'})`);
      diagnostics.services.qaService = 'working';
    } else {
      logError('Q&A service returned no match');
      diagnostics.services.qaService = 'no_match';
      diagnostics.errors.push('Q&A service found no matches');
    }
  } catch (error) {
    logError(`Q&A service test failed: ${error.message}`);
    diagnostics.services.qaService = 'error';
    diagnostics.errors.push(`Q&A service: ${error.message}`);
  }

  // Test VeraTerminologyAccess
  logInfo('\nTesting VeraTerminologyAccess...');
  try {
    const VeraTerminologyAccess = (await import('../services/vera/VeraTerminologyAccess.js')).default;
    
    const termCount = await VeraTerminologyAccess.getAllTermsCount();
    if (termCount > 0) {
      logSuccess(`Terminology service accessible: ${termCount} terms`);
      diagnostics.services.terminologyService = 'working';
    } else {
      logError('Terminology service returned 0 terms');
      diagnostics.services.terminologyService = 'empty';
      diagnostics.errors.push('Terminology service has no data');
    }
  } catch (error) {
    logError(`Terminology service test failed: ${error.message}`);
    diagnostics.services.terminologyService = 'error';
    diagnostics.errors.push(`Terminology service: ${error.message}`);
  }
}

/**
 * Generate Summary Report
 */
function generateSummary() {
  logSection('DIAGNOSTIC SUMMARY');

  const totalErrors = diagnostics.errors.length;
  const totalWarnings = Object.values(diagnostics).filter(v => v === false || v === 'error' || v === 'incomplete').length;

  if (totalErrors === 0 && totalWarnings === 0) {
    logSuccess('🎉 ALL CHECKS PASSED - Vera should be fully operational!');
  } else {
    logError(`Found ${totalErrors} errors and ${totalWarnings} warnings`);
  }

  log('\n📊 DETAILED RESULTS:', 'magenta');
  
  log('\n🔌 Connections:', 'blue');
  log(`  Postgres Pool: ${diagnostics.connections.postgresPool ? '✅' : '❌'}`);
  log(`  EDCAT AI Pool: ${diagnostics.connections.edcatPool ? '✅' : '❌'}`);
  log(`  Postgres DB: ${diagnostics.connections.postgres || '❌'}`);
  log(`  EDCAT AI DB: ${diagnostics.connections.edcatAI || '❌'}`);

  log('\n📋 Tables:', 'blue');
  Object.entries(diagnostics.tables).forEach(([table, status]) => {
    const icon = status === true ? '✅' : status === false ? '❌' : '⚠️';
    log(`  ${icon} ${table}: ${status}`);
  });

  log('\n💾 Data:', 'blue');
  log(`  Q&A Bank: ${diagnostics.data.qaBank || 0} entries`);
  log(`  Terminology: ${diagnostics.data.terminology || 0} terms`);
  log(`  Conversation History: ${diagnostics.data.conversationHistory || 0} messages`);

  log('\n⚙️  Services:', 'blue');
  Object.entries(diagnostics.services).forEach(([service, status]) => {
    const icon = status === 'working' ? '✅' : '❌';
    log(`  ${icon} ${service}: ${status}`);
  });

  if (diagnostics.errors.length > 0) {
    log('\n❌ ERRORS FOUND:', 'red');
    diagnostics.errors.forEach((error, i) => {
      log(`  ${i + 1}. ${error}`, 'red');
    });
  }

  log('\n💡 RECOMMENDATIONS:', 'yellow');
  
  if (!diagnostics.connections.postgres || !diagnostics.connections.edcatAI) {
    log('  1. Check DATABASE_URL and EDCAT_AI_DATABASE_URL environment variables', 'yellow');
  }
  
  if (diagnostics.data.qaBank === 0) {
    log('  2. Run: node backend/src/scripts/seed-vera-query-response-bank.js', 'yellow');
  }
  
  if (diagnostics.data.terminology === 0) {
    log('  3. Run terminology seeding script', 'yellow');
  }
  
  if (diagnostics.services.qaService === 'no_match') {
    log('  4. Q&A bank may need more entries or better patterns', 'yellow');
  }

  log('\n' + '='.repeat(70), 'cyan');
}

/**
 * Main execution
 */
async function runDiagnostics() {
  log('\n' + '='.repeat(70), 'cyan');
  log('  VERA FULL DIAGNOSTIC - COMPREHENSIVE SYSTEM CHECK', 'cyan');
  log('='.repeat(70), 'cyan');
  log(`Started at: ${new Date().toISOString()}\n`, 'blue');

  try {
    await testConnections();
    await testTableExistence();
    await testTableSchemas();
    await testDataAvailability();
    await testServiceFunctionality();
    generateSummary();
  } catch (error) {
    logError(`\nFatal error during diagnostics: ${error.message}`);
    console.error(error);
    process.exit(1);
  }

  log(`\nCompleted at: ${new Date().toISOString()}`, 'blue');
}

// Run diagnostics
runDiagnostics().catch(console.error);

