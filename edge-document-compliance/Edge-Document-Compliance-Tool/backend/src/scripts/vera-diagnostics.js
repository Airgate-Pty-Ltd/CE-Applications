/**
 * Vera Diagnostics Tool
 * Checks all Vera table connections and verifies data integrity
 */

import { queryEdcatAI, queryPostgres } from '../config/databases.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

// All Vera/AI tables to check
const VERA_TABLES = {
  edcat: [
    'ai_persona_profile',
    'ai_persona',
    'ai_prompt',
    'ai_policy',
    'ai_template',
    'ai_validator',
    'ai_router',
    'ai_chat_log',
    'ai_doc_ref',
    'ai_conversation_state',
    'ai_conversation_history',
    'ai_standard',
    'ai_clause_blueprint',
    'ai_crosswalk_blueprint',
    'vera_conversation_context',
    'vera_clarification_rules',
    'vera_response_templates',
    'vera_knowledge_boundaries',
    'vera_data_gaps',
    'vera_conversation_memory',
    'vera_response_effectiveness',
    'vera_learning_events',
    'vera_model_versions',
    'vera_daily_learning_batch',
    'vera_clarification_feedback',
    'vera_user_interaction_patterns',
    'requirement_embeddings',
    'procedure_embeddings',
    'vera_knowledge_graph_concepts',
    'vera_concept_relationships',
    'vera_requirement_reasoning_chains',
    'vera_pattern_discoveries',
    'vera_self_learning_questions',
    'vera_standard_profiles',
    'vera_transfer_learning_maps',
    'vera_expert_training_sessions',
    'vera_contextual_enrichment',
    'vera_reasoning_validation_feedback',
    'vera_research_requests',
    'vera_research_sources_web',
    'vera_standard_profiles_comprehensive',
    'vera_regulatory_lookup'
  ],
  postgres: [
    'standards',
    'parsed_requirements',
    'parsed_clauses',
    'regulatory_websites',
    'authorized_users',
    'user_permissions'
  ]
};

/**
 * Check if a table exists and get row count
 */
async function checkTable(db, tableName) {
  try {
    const result = await db(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = $1`,
      [tableName]
    );
    
    const exists = result.rows[0].count > 0;
    
    if (!exists) {
      return { exists: false, rowCount: 0, error: null };
    }
    
    // Get row count
    const countResult = await db(`SELECT COUNT(*) as count FROM ${tableName}`);
    const rowCount = parseInt(countResult.rows[0].count);
    
    return { exists: true, rowCount, error: null };
  } catch (error) {
    return { exists: false, rowCount: 0, error: error.message };
  }
}

/**
 * Check seed data exists
 */
async function checkSeedData() {
  const seedChecks = {
    persona_profile: false,
    response_templates: false,
    regulatory_websites: false,
    model_versions: false
  };

  try {
    // Check persona profile
    const personaResult = await queryEdcatAI(
      `SELECT COUNT(*) as count FROM ai_persona_profile WHERE persona_code = 'vera'`
    );
    seedChecks.persona_profile = parseInt(personaResult.rows[0].count) > 0;

    // Check response templates
    const templatesResult = await queryEdcatAI(
      `SELECT COUNT(*) as count FROM vera_response_templates WHERE tenant_id = $1`,
      [DEFAULT_TENANT_ID]
    );
    seedChecks.response_templates = parseInt(templatesResult.rows[0].count) > 0;

    // Check regulatory websites
    const regResult = await queryPostgres(
      `SELECT COUNT(*) as count FROM public.regulatory_websites`
    );
    seedChecks.regulatory_websites = parseInt(regResult.rows[0].count) > 0;

    // Check model versions
    const modelResult = await queryEdcatAI(
      `SELECT COUNT(*) as count FROM vera_model_versions`
    );
    seedChecks.model_versions = parseInt(modelResult.rows[0].count) > 0;
  } catch (error) {
    console.error('[vera-diagnostics] Error checking seed data:', error.message);
  }

  return seedChecks;
}

/**
 * Run comprehensive diagnostics
 */
async function runDiagnostics() {
  console.log('\n🔍 Vera Diagnostics Tool\n');
  console.log('='.repeat(60));

  const results = {
    edcat: {},
    postgres: {},
    seedData: {},
    summary: {
      totalTables: 0,
      existingTables: 0,
      missingTables: 0,
      totalRows: 0
    }
  };

  // Check EDCAT AI tables
  console.log('\n📊 Checking EDCAT AI tables...\n');
  for (const table of VERA_TABLES.edcat) {
    const check = await checkTable(queryEdcatAI, table);
    results.edcat[table] = check;
    results.summary.totalTables++;
    
    if (check.exists) {
      results.summary.existingTables++;
      results.summary.totalRows += check.rowCount;
      console.log(`  ✅ ${table}: ${check.rowCount} rows`);
    } else {
      results.summary.missingTables++;
      console.log(`  ❌ ${table}: ${check.error || 'Not found'}`);
    }
  }

  // Check PostgreSQL tables
  console.log('\n📊 Checking PostgreSQL tables...\n');
  for (const table of VERA_TABLES.postgres) {
    const check = await checkTable(queryPostgres, table);
    results.postgres[table] = check;
    results.summary.totalTables++;
    
    if (check.exists) {
      results.summary.existingTables++;
      results.summary.totalRows += check.rowCount;
      console.log(`  ✅ ${table}: ${check.rowCount} rows`);
    } else {
      results.summary.missingTables++;
      console.log(`  ❌ ${table}: ${check.error || 'Not found'}`);
    }
  }

  // Check seed data
  console.log('\n🌱 Checking seed data...\n');
  results.seedData = await checkSeedData();
  for (const [key, value] of Object.entries(results.seedData)) {
    console.log(`  ${value ? '✅' : '❌'} ${key}: ${value ? 'Seeded' : 'Missing'}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📈 Summary:\n');
  console.log(`  Total tables checked: ${results.summary.totalTables}`);
  console.log(`  Existing tables: ${results.summary.existingTables}`);
  console.log(`  Missing tables: ${results.summary.missingTables}`);
  console.log(`  Total rows across all tables: ${results.summary.totalRows}`);
  console.log(`  Seed data complete: ${Object.values(results.seedData).every(v => v) ? 'Yes' : 'No'}`);

  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDiagnostics().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Diagnostics failed:', error);
    process.exit(1);
  });
}

export { runDiagnostics, checkTable, checkSeedData };

