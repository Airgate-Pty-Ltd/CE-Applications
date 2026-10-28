/**
 * EDCAT Brain Initialization Script
 * 
 * Consolidated script to initialize all EDCAT AI tables and populate them with data.
 * This is the single entry point for "brain initialization" - runs all ingestion
 * and seeding scripts in the correct order.
 * 
 * Usage: npm run edcat:init
 * 
 * Environment-agnostic: Works in development, staging, and production.
 */

import { queryEdcatAI, queryPostgres, checkConnections } from '../config/databases.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Check database connections
 */
async function checkDatabaseConnections() {
  console.log('\n🔌 Checking database connections...');
  try {
    const status = await checkConnections();
    if (status.postgres === 'connected' && status.edcatAI === 'connected') {
      console.log('✅ Both databases connected');
      return true;
    } else {
      console.error('❌ Database connection failed:', status);
      return false;
    }
  } catch (error) {
    console.error('❌ Database connection check failed:', error.message);
    return false;
  }
}

/**
 * Verify critical tables exist
 */
async function verifyTables() {
  console.log('\n📋 Verifying critical tables exist...');
  
  const criticalTables = [
    'terms_and_definitions',
    'vera_query_response_bank',
    'document_content_for_learning',
    'example_documents',
    'ai_conversation_history',
    'ai_conversation_state',
    'vera_memory',
    'knowledge_embeddings'
  ];

  const missing = [];
  
  for (const table of criticalTables) {
    try {
      const result = await queryEdcatAI(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'edcat' AND table_name = $1
        ) as exists`,
        [table]
      );
      
      if (!result.rows[0].exists) {
        missing.push(table);
        console.warn(`  ⚠️  Missing table: ${table}`);
      } else {
        console.log(`  ✅ Table exists: ${table}`);
      }
    } catch (error) {
      console.error(`  ❌ Error checking table ${table}:`, error.message);
      missing.push(table);
    }
  }

  if (missing.length > 0) {
    console.error(`\n❌ ${missing.length} critical tables are missing. Run migrations first.`);
    return false;
  }

  console.log('✅ All critical tables exist');
  return true;
}

/**
 * Seed Q&A Response Bank
 */
async function seedQAResponses() {
  console.log('\n📚 Seeding Q&A Response Bank...');
  
  try {
    // This script runs on import, so we just import it
    await import('./load_vera_qna_responses.js');
    // Wait a moment for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Q&A Response Bank seeded');
    return true;
  } catch (error) {
    console.error('❌ Failed to seed Q&A Response Bank:', error.message);
    return false;
  }
}

/**
 * Seed comprehensive Vera data
 */
async function seedVeraComprehensive() {
  console.log('\n🌱 Seeding comprehensive Vera data...');
  
  try {
    // Script may run on import or export a function
    await import('./seed-vera-comprehensive.js');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Comprehensive Vera data seeded');
    return true;
  } catch (error) {
    console.error('❌ Failed to seed comprehensive Vera data:', error.message);
    return false;
  }
}

/**
 * Seed personality and agent data
 */
async function seedPersonality() {
  console.log('\n🎭 Seeding personality and agent data...');
  
  try {
    await import('./seed-edcat-personality.js');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Personality and agent data seeded');
    return true;
  } catch (error) {
    console.error('❌ Failed to seed personality data:', error.message);
    return false;
  }
}

/**
 * Ingest terms and definitions
 */
async function ingestTerms() {
  console.log('\n📖 Ingesting terms and definitions...');
  
  try {
    await import('./ingest-terms-definitions.js');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Terms and definitions ingested');
    return true;
  } catch (error) {
    console.warn('⚠️  Terms ingestion failed (may not have Terms folder):', error.message);
    // Non-fatal - terms folder may not exist
    return true;
  }
}

/**
 * Seed regulatory standards
 */
async function seedRegulatory() {
  console.log('\n📜 Seeding regulatory standards...');
  
  try {
    await import('./seed-regulatory-standards.js');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Regulatory standards seeded');
    return true;
  } catch (error) {
    console.warn('⚠️  Regulatory seeding failed:', error.message);
    return true; // Non-fatal
  }
}

/**
 * Get table row counts for verification
 */
async function getTableCounts() {
  console.log('\n📊 Table row counts:');
  
  const tables = [
    'terms_and_definitions',
    'vera_query_response_bank',
    'document_content_for_learning',
    'example_documents',
    'ai_conversation_history',
    'ai_conversation_state',
    'vera_memory'
  ];

  for (const table of tables) {
    try {
      const result = await queryEdcatAI(`SELECT COUNT(*) as count FROM edcat.${table}`);
      const count = result.rows[0].count;
      console.log(`  ${table}: ${count} rows`);
    } catch (error) {
      console.warn(`  ${table}: Error getting count - ${error.message}`);
    }
  }
}

/**
 * Main initialization function
 */
async function initializeEDCATBrain() {
  console.log('\n' + '='.repeat(60));
  console.log('🧠 EDCAT Brain Initialization');
  console.log('='.repeat(60));
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Tenant ID: ${DEFAULT_TENANT_ID}`);

  // Step 1: Check connections
  const connectionsOk = await checkDatabaseConnections();
  if (!connectionsOk) {
    console.error('\n❌ Database connections failed. Cannot proceed.');
    process.exit(1);
  }

  // Step 2: Verify tables
  const tablesOk = await verifyTables();
  if (!tablesOk) {
    console.error('\n❌ Critical tables missing. Run migrations first:');
    console.error('   npm start (migrations run automatically on startup)');
    process.exit(1);
  }

  // Step 3: Seed data in order
  const results = {
    qa: false,
    vera: false,
    personality: false,
    terms: false,
    regulatory: false
  };

  results.qa = await seedQAResponses();
  results.vera = await seedVeraComprehensive();
  results.personality = await seedPersonality();
  results.terms = await ingestTerms();
  results.regulatory = await seedRegulatory();

  // Step 4: Show summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Initialization Summary:');
  console.log('='.repeat(60));
  
  const successCount = Object.values(results).filter(r => r).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`✅ Successful: ${successCount}/${totalCount}`);
  console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`);
  
  Object.entries(results).forEach(([key, success]) => {
    console.log(`  ${success ? '✅' : '❌'} ${key}`);
  });

  // Step 5: Show table counts
  await getTableCounts();

  console.log('\n' + '='.repeat(60));
  if (successCount === totalCount) {
    console.log('✅ EDCAT Brain initialization completed successfully!');
  } else {
    console.log('⚠️  EDCAT Brain initialization completed with some failures.');
    console.log('   Check logs above for details.');
  }
  console.log('='.repeat(60) + '\n');

  return successCount === totalCount;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeEDCATBrain()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n❌ Fatal error during initialization:', error);
      process.exit(1);
    });
}

export default initializeEDCATBrain;

