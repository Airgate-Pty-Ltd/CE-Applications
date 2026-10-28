/**
 * Inventory EDCAT Tables
 * Compares documented tables with what actually exists in the database
 */

import { queryEdcatAI } from '../config/databases.js';

// Required tables from VERA_ARCHITECTURE_AND_CAPABILITIES.md
const REQUIRED_EDCAT_TABLES = [
  'terms_and_definitions',
  'document_content_for_learning',
  'example_documents',
  'vera_query_response_bank',
  'ai_conversation_history',
  'ai_conversation_state',
  'conversation_memory',
  'vera_memory',
  'vera_response_templates',
  'ai_router',
  'ai_template',
  'ai_policy',
  'ai_prompt',
  'vera_learned_corrections',
  'vera_debug_sessions',
  'knowledge_embeddings',
  'knowledge_relationships',
  'requirement_relationships',
  'document_multimodal_content',
  'vera_remedy_applications',
  'vera_knowledge_graph_concepts',
  'vera_standard_profiles',
  'vera_clarification_rules',
  'ai_learning_event',
  'vera_audit_scenarios',
  'quality_concepts',
  'quality_concept_relations',
  'cross_domain_mappings',
  'vera_gap_rules',
  'vera_training_questions'
];

async function inventoryTables() {
  try {
    console.log('🔍 Inventorying EDCAT AI Database Tables...\n');
    
    // First, ensure edcat schema exists
    try {
      await queryEdcatAI('CREATE SCHEMA IF NOT EXISTS edcat');
      console.log('✅ edcat schema exists or created\n');
    } catch (err) {
      console.error('❌ Failed to create edcat schema:', err.message);
      return;
    }
    
    // Get all tables in edcat schema
    const result = await queryEdcatAI(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'edcat'
      ORDER BY table_name
    `);
    
    const existingTables = result.rows.map(row => row.table_name);
    
    console.log('📊 Current State:');
    console.log(`   Existing tables: ${existingTables.length}`);
    console.log(`   Required tables: ${REQUIRED_EDCAT_TABLES.length}\n`);
    
    // Find missing tables
    const missingTables = REQUIRED_EDCAT_TABLES.filter(
      table => !existingTables.includes(table)
    );
    
    // Find extra tables (not in required list)
    const extraTables = existingTables.filter(
      table => !REQUIRED_EDCAT_TABLES.includes(table)
    );
    
    console.log('✅ Existing Tables:');
    existingTables.forEach(table => {
      const isRequired = REQUIRED_EDCAT_TABLES.includes(table);
      console.log(`   ${isRequired ? '✓' : '?'} edcat.${table}`);
    });
    
    if (missingTables.length > 0) {
      console.log('\n❌ Missing Tables:');
      missingTables.forEach(table => {
        console.log(`   ✗ edcat.${table}`);
      });
    }
    
    if (extraTables.length > 0) {
      console.log('\n⚠️  Extra Tables (not in required list):');
      extraTables.forEach(table => {
        console.log(`   ? edcat.${table}`);
      });
    }
    
    // Check row counts for existing tables
    console.log('\n📈 Row Counts:');
    for (const table of existingTables) {
      try {
        const countResult = await queryEdcatAI(
          `SELECT COUNT(*) as count FROM edcat.${table}`
        );
        const count = parseInt(countResult.rows[0].count);
        const status = count > 0 ? '✓' : '⚠️ ';
        console.log(`   ${status} edcat.${table}: ${count} rows`);
      } catch (err) {
        console.log(`   ❌ edcat.${table}: Error - ${err.message.substring(0, 50)}`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 Summary:');
    console.log(`   Total existing: ${existingTables.length}`);
    console.log(`   Total required: ${REQUIRED_EDCAT_TABLES.length}`);
    console.log(`   Missing: ${missingTables.length}`);
    console.log(`   Extra: ${extraTables.length}`);
    
    if (missingTables.length === 0) {
      console.log('\n✅ All required tables exist!');
    } else {
      console.log(`\n⚠️  ${missingTables.length} tables need to be created`);
      console.log('   Run: npm run edcat:create-missing-tables');
    }
    
    return {
      existing: existingTables,
      missing: missingTables,
      extra: extraTables,
      required: REQUIRED_EDCAT_TABLES
    };
    
  } catch (error) {
    console.error('❌ Inventory failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('inventory-edcat-tables.js')) {
  inventoryTables()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

export { inventoryTables, REQUIRED_EDCAT_TABLES };

