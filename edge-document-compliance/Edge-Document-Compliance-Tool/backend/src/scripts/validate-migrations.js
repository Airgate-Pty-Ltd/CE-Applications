/**
 * Migration Validation Script
 * Checks that all migrations have run successfully
 */

import { queryEdcatAI, queryPostgres } from '../config/databases.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

/**
 * Get all migration files
 */
function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
  return files;
}

/**
 * Check if a table exists
 */
async function tableExists(db, tableName, schema = 'public') {
  try {
    const result = await db(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = $1 AND table_name = $2`,
      [schema, tableName]
    );
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Validate migrations by checking for expected tables
 */
async function validateMigrations() {
  console.log('\n🔍 Validating Migrations\n');
  console.log('='.repeat(60));

  const migrationFiles = getMigrationFiles();
  console.log(`\nFound ${migrationFiles.length} migration files\n`);

  const expectedTables = {
    postgres: [
      'standards',
      'parsed_requirements',
      'parsed_clauses',
      'regulatory_websites',
      'authorized_users',
      'user_permissions',
      'tenants',
      'gap_analyses',
      'customer_documents',
      'customer_procedures',
      'audit_trail'
    ],
    edcat: [
      'ai_persona_profile',
      'ai_conversation_state',
      'ai_conversation_history',
      'vera_conversation_context',
      'vera_response_templates',
      'vera_learning_events',
      'vera_model_versions',
      'requirement_embeddings',
      'vera_knowledge_graph_concepts',
      'vera_research_requests',
      'vera_regulatory_lookup'
    ]
  };

  const results = {
    postgres: {},
    edcat: {},
    summary: {
      totalExpected: expectedTables.postgres.length + expectedTables.edcat.length,
      existing: 0,
      missing: 0
    }
  };

  // Check PostgreSQL tables
  console.log('📊 Checking PostgreSQL tables...\n');
  for (const table of expectedTables.postgres) {
    const exists = await tableExists(queryPostgres, table);
    results.postgres[table] = exists;
    if (exists) {
      results.summary.existing++;
      console.log(`  ✅ ${table}`);
    } else {
      results.summary.missing++;
      console.log(`  ❌ ${table} - MISSING`);
    }
  }

  // Check EDCAT AI tables
  console.log('\n📊 Checking EDCAT AI tables...\n');
  for (const table of expectedTables.edcat) {
    const exists = await tableExists(queryEdcatAI, table);
    results.edcat[table] = exists;
    if (exists) {
      results.summary.existing++;
      console.log(`  ✅ ${table}`);
    } else {
      results.summary.missing++;
      console.log(`  ❌ ${table} - MISSING`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📈 Validation Summary:\n');
  console.log(`  Total expected tables: ${results.summary.totalExpected}`);
  console.log(`  Existing tables: ${results.summary.existing}`);
  console.log(`  Missing tables: ${results.summary.missing}`);
  console.log(`  Success rate: ${((results.summary.existing / results.summary.totalExpected) * 100).toFixed(1)}%`);

  if (results.summary.missing === 0) {
    console.log('\n✅ All migrations validated successfully!\n');
  } else {
    console.log('\n⚠️  Some tables are missing. Please run migrations.\n');
  }

  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateMigrations().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export { validateMigrations };

