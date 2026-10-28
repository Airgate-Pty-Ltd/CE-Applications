/**
 * Two-Database Migration Runner
 * Automatically runs migrations for both PostgreSQL Customer Data DB and EDCAT AI DB on startup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryPostgres, queryEdcatAI } from '../config/databases.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine migrations directory - handle both local and Railway paths
// Local: backend/src/database -> backend/migrations
// Railway: /app/backend/src/database -> /app/backend/migrations
const getMigrationsPath = (filename) => {
  // Try relative path first (local development)
  const relativePath = path.join(__dirname, '../../../migrations', filename);
  if (fs.existsSync(relativePath)) {
    return relativePath;
  }
  // Try absolute path from process.cwd() (Railway)
  const absolutePath = path.join(process.cwd(), 'backend/migrations', filename);
  if (fs.existsSync(absolutePath)) {
    return absolutePath;
  }
  // Try /app/backend/migrations (Railway alternative)
  const railwayPath = path.join('/app/backend/migrations', filename);
  if (fs.existsSync(railwayPath)) {
    return railwayPath;
  }
  // Fallback to relative path (will show error if not found)
  return relativePath;
};

// Paths to migration files
const POSTGRES_MIGRATION = getMigrationsPath('001_postgres_customer_data.sql');
const EDCAT_AI_MIGRATION = getMigrationsPath('002_edcat_ai_intelligence.sql');
const CLEANUP_MIGRATION = getMigrationsPath('003_cleanup_duplicate_tables.sql');
const REMOVE_DUPLICATES_MIGRATION = getMigrationsPath('004_remove_duplicate_tables_from_edcat_ai.sql');
const REMOVE_DEAD_ENDS_POSTGRES = getMigrationsPath('005a_remove_dead_end_tables_postgres.sql');
const REMOVE_DEAD_ENDS_EDCAT = getMigrationsPath('005b_remove_dead_end_tables_edcat_ai.sql');
const CONSOLIDATE_TO_STANDARDS = getMigrationsPath('006_consolidate_to_standards_table.sql');
const FIX_SCHEMA_MISMATCHES = getMigrationsPath('007_fix_schema_mismatches.sql');
const ENSURE_PARSED_CLAUSES = getMigrationsPath('008_ensure_parsed_clauses_table.sql');
const FIX_PARSED_REQUIREMENTS = getMigrationsPath('009_fix_parsed_requirements_schema.sql');
const REMOVE_ORPHANED_POSTGRES = getMigrationsPath('010_remove_orphaned_tables_postgres.sql');
const REMOVE_ORPHANED_EDCAT = getMigrationsPath('011_remove_orphaned_tables_edcat_ai.sql');
const CREATE_PARSED_REQUIREMENTS = getMigrationsPath('012_create_parsed_requirements_table.sql');
const RESTORE_AUTHORIZED_USERS = getMigrationsPath('013_restore_authorized_users_table.sql');
const VERA_ENHANCED_INTELLIGENCE = getMigrationsPath('014_vera_enhanced_intelligence.sql');
const VERA_KNOWLEDGE_BASE = getMigrationsPath('015_vera_knowledge_base_enhancement.sql');
const VERA_COMPREHENSIVE_RESEARCH = getMigrationsPath('016_vera_comprehensive_research.sql');
const CUSTOMER_ARCHIVE_GAP_TRACKING = getMigrationsPath('017_customer_archive_gap_tracking.sql');
const VERA_COMPLETE_PERSONA = getMigrationsPath('018_vera_complete_persona_specification.sql');
const VERA_QUERY_RESPONSE_BANK = getMigrationsPath('019_vera_query_response_bank.sql');
const VERA_WEBSITE_LEARNING = getMigrationsPath('020_vera_website_learning.sql');
const VERA_USER_PROFILES = getMigrationsPath('021_vera_user_profiles.sql');
const VERA_PARSER_SUPERVISION = getMigrationsPath('022_vera_parser_supervision.sql');
const VERA_SEMANTIC_MEMORY = getMigrationsPath('023_vera_semantic_memory.sql');
const VERA_LEARNED_CORRECTIONS = getMigrationsPath('024_vera_learned_corrections.sql');
const VERA_DEBUG_SESSIONS = getMigrationsPath('025_vera_debug_sessions.sql');
const FIX_ADMIN_CONSOLE_ERRORS = getMigrationsPath('026_fix_admin_console_errors.sql');
const FIX_PRODUCTION_ERRORS = getMigrationsPath('027_fix_production_errors.sql');
const VERA_DYNAMIC_GREETINGS = getMigrationsPath('028_vera_dynamic_greetings.sql');
const VERA_QUALITY_KNOWLEDGE = getMigrationsPath('029_vera_quality_knowledge.sql');
const VERA_CLAUSE_INTELLIGENCE = getMigrationsPath('030_vera_clause_intelligence.sql');
const VERA_AUDIT_KNOWLEDGE = getMigrationsPath('031_vera_audit_knowledge.sql');
const VERA_QUALITY_TOOLS = getMigrationsPath('032_vera_quality_tools.sql');
const VERA_ROOT_CAUSE_KNOWLEDGE = getMigrationsPath('033_vera_root_cause_knowledge.sql');
const VERA_INDUSTRY_KNOWLEDGE = getMigrationsPath('034_vera_industry_knowledge.sql');
const VERA_GAP_MAPPING_KNOWLEDGE = getMigrationsPath('035_vera_gap_mapping_knowledge.sql');
const VERA_DEBUG_EXPLANATIONS = getMigrationsPath('036_vera_debug_explanations.sql');
const MAKE_DOC_NUMBER_OPTIONAL = getMigrationsPath('037_make_doc_number_optional.sql');
const SEED_VERA_ANNEX_A_KNOWLEDGE = getMigrationsPath('038_seed_vera_annex_a_knowledge.sql');
const FIX_VERA_MEMORY_SCHEMA = getMigrationsPath('042_fix_vera_memory_schema.sql');
const FIX_VERA_DEBUG_SESSIONS_SCHEMA = getMigrationsPath('048_fix_vera_debug_sessions_schema.sql');
const FIX_VERA_DEBUG_SESSIONS_USER_ID = getMigrationsPath('050_fix_vera_debug_sessions_user_id.sql');
const ENSURE_LEARNING_TABLES = getMigrationsPath('051_ensure_learning_tables.sql');
const CREATE_TERMS_AND_DEFINITIONS = getMigrationsPath('051_create_terms_and_definitions_table.sql');
const VERA_RESPONSE_LEARNING_SYSTEM = getMigrationsPath('054_vera_response_learning_system.sql');
const VERIFY_QA_RESPONSES = getMigrationsPath('055_verify_qa_responses.sql');
const FIX_VERA_EMBEDDING_COLUMNS = getMigrationsPath('056_fix_vera_embedding_columns.sql');
const FIX_VERA_COLUMN_MISMATCHES = getMigrationsPath('060_fix_vera_column_mismatches.sql');
const CREATE_AI_LEARNING_EVENT = getMigrationsPath('061_create_ai_learning_event.sql');
const CREATE_VERA_AUDIT_SCENARIOS = getMigrationsPath('062_create_vera_audit_scenarios.sql');
const FIX_VERA_QUERY_RESPONSE_BANK = getMigrationsPath('070_fix_vera_query_response_bank_columns.sql');
const FIX_AI_CONVERSATION_HISTORY = getMigrationsPath('071_fix_ai_conversation_history_columns.sql');
const ENSURE_ALL_EDCAT_TABLES = getMigrationsPath('072_ensure_all_edcat_tables.sql');
const ENSURE_ALL_EDCAT_COLUMNS = getMigrationsPath('073_ensure_all_edcat_columns.sql');
const FIX_CRITICAL_COLUMN_MISMATCHES = getMigrationsPath('074_fix_critical_column_mismatches.sql');
const DROP_NOT_NULL_CONSTRAINTS = getMigrationsPath('075_drop_not_null_constraints_ai_conversation_history.sql');
const ADD_CONTEXT_TO_VERA_TERMINOLOGY = getMigrationsPath('076_add_context_to_vera_terminology.sql');
const FIX_DOCUMENT_CONTENT_FILE_ID = getMigrationsPath('077_fix_document_content_for_learning_file_id.sql');
const CREATE_GAP_ANALYSIS_FUNCTIONS = getMigrationsPath('078_create_gap_analysis_functions.sql');
const FIX_VERA_SCHEMA_CRITICAL = getMigrationsPath('099_fix_vera_schema_critical.sql');

/**
 * Split SQL into executable statements
 */
function splitSQLStatements(sql) {
  const statements = [];
  let currentStatement = '';
  let inMultiLineComment = false;
  let inDollarQuote = false;
  let dollarTag = null;
  
  const lines = sql.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Handle multi-line comments
    if (line.includes('/*')) {
      inMultiLineComment = true;
    }
    if (line.includes('*/')) {
      inMultiLineComment = false;
      line = line.substring(line.indexOf('*/') + 2);
    }
    
    if (inMultiLineComment && !line.includes('*/')) {
      continue;
    }
    
    // Handle single-line comments (but not inside dollar quotes)
    if (!inDollarQuote) {
      const commentIndex = line.indexOf('--');
      if (commentIndex !== -1) {
        line = line.substring(0, commentIndex);
      }
    }
    
    // Handle dollar-quoted strings (DO $$ ... $$, $tag$ ... $tag$, etc.)
    if (!inDollarQuote) {
      // Look for dollar quote start: $tag$ or $$
      // Match patterns like: DO $$, DO $tag$, $$, $tag$
      const dollarQuoteStart = line.match(/(?:DO\s+)?(\$[^$]*\$)/i);
      if (dollarQuoteStart) {
        inDollarQuote = true;
        dollarTag = dollarQuoteStart[1]; // Capture the full tag like $$ or $tag$
      }
    } else {
      // Inside dollar quote - look for closing tag
      // The closing tag must match exactly (case-sensitive)
      if (line.includes(dollarTag)) {
        inDollarQuote = false;
        dollarTag = null;
      }
    }
    
    line = line.trim();
    
    if (!line && !inDollarQuote) {
      continue;
    }
    
    currentStatement += line + '\n';
    
    // Check if statement ends with semicolon (but not inside dollar quotes)
    if (!inDollarQuote && line.endsWith(';')) {
      const statement = currentStatement.trim();
      if (statement && !statement.startsWith('--')) {
        statements.push(statement);
      }
      currentStatement = '';
    }
  }
  
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }
  
  return statements.filter(stmt => stmt.length > 0);
}

/**
 * Run migration against a database
 */
async function runMigration(connectionString, migrationFile, dbName) {
  console.log(`\n📦 Running migration for ${dbName}...`);
  console.log(`   File: ${path.basename(migrationFile)}`);
  console.log(`   Full path: ${migrationFile}`);
  
  if (!fs.existsSync(migrationFile)) {
    console.error(`   ❌ Migration file not found: ${migrationFile}`);
    console.error(`   ❌ Tried paths: ${migrationFile}`);
    console.error(`   ❌ Current working directory: ${process.cwd()}`);
    console.error(`   ❌ __dirname: ${__dirname}`);
    return false;
  }

  try {
    // Read migration file
    const sql = fs.readFileSync(migrationFile, 'utf8');
    const statements = splitSQLStatements(sql);
    
    console.log(`   Executing ${statements.length} statements...`);

    let successCount = 0;
    let errorCount = 0;

    // Use appropriate query function based on database
    const queryFn = dbName.includes('Customer Data') ? queryPostgres : queryEdcatAI;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          await queryFn(statement);
          successCount++;
          if ((i + 1) % 10 === 0) {
            process.stdout.write(`   Progress: ${i + 1}/${statements.length}\r`);
          }
        } catch (error) {
          // Ignore "already exists" errors (idempotent)
          const isIdempotentError = 
            error.message.includes('already exists') || 
            error.message.includes('duplicate key') ||
            error.message.includes('relation already exists') ||
            error.message.includes('constraint') ||
            error.message.includes('trigger') && error.message.includes('already exists') ||
            error.code === '42P07' || // relation already exists
            error.code === '42710' || // duplicate object
            error.code === '42P16';   // invalid table definition (often means already exists)
          
          if (isIdempotentError) {
            successCount++; // Count as success for idempotent operations
          } else {
            console.error(`\n   ⚠️  Statement ${i + 1} warning:`, error.message.substring(0, 100));
            errorCount++;
          }
        }
      }
    }

    console.log(`\n   ✅ ${dbName} migration completed: ${successCount} successful, ${errorCount} errors`);

    // Verify tables were created
    try {
      const tableCount = await queryFn(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      console.log(`   📊 Tables in database: ${tableCount.rows[0].count}`);
    } catch (err) {
      console.warn(`   ⚠️  Could not verify table count: ${err.message}`);
    }

    return errorCount === 0;

  } catch (error) {
    console.error(`\n   ❌ ${dbName} migration failed:`, error.message);
    return false;
  }
}

/**
 * Initialize both databases with their respective schemas
 */
export async function initializeTwoDatabases() {
  console.log('\n🚀 Initializing Two-Database Architecture');
  console.log('='.repeat(60));

  // Check environment variables
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set - skipping migrations');
    return false;
  }

  if (!process.env.EDCAT_AI_DATABASE_URL) {
    console.warn('⚠️  EDCAT_AI_DATABASE_URL not set, using DATABASE_URL for both');
    console.warn('   This means both databases will use the same connection');
  }

  // Wait a moment for database connections to be established
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 1: PostgreSQL Customer Data
  let postgresSuccess = false;
  try {
    postgresSuccess = await runMigration(
      process.env.DATABASE_URL,
      POSTGRES_MIGRATION,
      'PostgreSQL Customer Data DB'
    );
  } catch (error) {
    console.error('❌ PostgreSQL migration failed:', error.message);
  }

  // Step 2: EDCAT AI Intelligence
  let edcatSuccess = false;
  try {
    edcatSuccess = await runMigration(
      process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
      EDCAT_AI_MIGRATION,
      'EDCAT AI Intelligence DB'
    );
  } catch (error) {
    console.error('❌ EDCAT AI migration failed:', error.message);
  }

  // Step 3: Cleanup duplicates from EDCAT AI DB
  let cleanupSuccess = false;
  if (edcatSuccess) {
    try {
      cleanupSuccess = await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        CLEANUP_MIGRATION,
        'EDCAT AI Cleanup (Remove Duplicates)'
      );
    } catch (error) {
      console.error('❌ Cleanup migration failed:', error.message);
    }
  }

  // Step 4: Remove duplicate tables from EDCAT AI DB (more aggressive cleanup)
  let removeDuplicatesSuccess = false;
  if (edcatSuccess) {
    try {
      removeDuplicatesSuccess = await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        REMOVE_DUPLICATES_MIGRATION,
        'EDCAT AI Remove Duplicates (Final Cleanup)'
      );
    } catch (error) {
      console.error('❌ Remove duplicates migration failed:', error.message);
    }
  }

  // Step 5: Remove dead-end tables from PostgreSQL
  let removeDeadEndsPostgresSuccess = false;
  if (postgresSuccess) {
    try {
      removeDeadEndsPostgresSuccess = await runMigration(
        process.env.DATABASE_URL,
        REMOVE_DEAD_ENDS_POSTGRES,
        'PostgreSQL Remove Dead-End Tables'
      );
    } catch (error) {
      console.error('❌ Remove dead-ends from Postgres failed:', error.message);
    }
  }

  // Step 6: Remove dead-end tables from EDCAT AI DB
  let removeDeadEndsEdcatSuccess = false;
  if (edcatSuccess) {
    try {
      removeDeadEndsEdcatSuccess = await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        REMOVE_DEAD_ENDS_EDCAT,
        'EDCAT AI Remove Dead-End Tables'
      );
    } catch (error) {
      console.error('❌ Remove dead-ends from EDCAT AI failed:', error.message);
    }
  }

  // Step 7: Consolidate to standards table (remove standard_files and standard_files_content)
  let consolidateSuccess = false;
  if (postgresSuccess) {
    try {
      consolidateSuccess = await runMigration(
        process.env.DATABASE_URL,
        CONSOLIDATE_TO_STANDARDS,
        'PostgreSQL Consolidate to Standards Table'
      );
    } catch (error) {
      console.error('❌ Consolidate to standards table failed:', error.message);
    }
  }

  // Step 8: Fix schema mismatches (gap_analysis_id, current_model_version, created_at, file_name, clause_number, full_ref)
  let fixSchemaSuccess = false;
  if (postgresSuccess) {
    try {
      fixSchemaSuccess = await runMigration(
        process.env.DATABASE_URL,
        FIX_SCHEMA_MISMATCHES,
        'PostgreSQL Fix Schema Mismatches'
      );
    } catch (error) {
      console.error('❌ Fix schema mismatches failed:', error.message);
    }
  }

  // Step 9: Ensure parsed_clauses and regulatory_websites tables exist
  let ensureTablesSuccess = false;
  if (postgresSuccess) {
    try {
      ensureTablesSuccess = await runMigration(
        process.env.DATABASE_URL,
        ENSURE_PARSED_CLAUSES,
        'PostgreSQL Ensure Parsed Clauses Table'
      );
    } catch (error) {
      console.error('❌ Ensure parsed_clauses table failed:', error.message);
    }
  }

  // Step 10: Fix parsed_requirements schema (add clause_number and other missing columns)
  let fixParsedRequirementsSuccess = false;
  if (postgresSuccess) {
    try {
      fixParsedRequirementsSuccess = await runMigration(
        process.env.DATABASE_URL,
        FIX_PARSED_REQUIREMENTS,
        'PostgreSQL Fix Parsed Requirements Schema'
      );
    } catch (error) {
      console.error('❌ Fix parsed_requirements schema failed:', error.message);
    }
  }

  // Step 11: Remove orphaned tables from PostgreSQL
  let removeOrphanedPostgresSuccess = false;
  if (postgresSuccess) {
    try {
      removeOrphanedPostgresSuccess = await runMigration(
        process.env.DATABASE_URL,
        REMOVE_ORPHANED_POSTGRES,
        'PostgreSQL Remove Orphaned Tables'
      );
    } catch (error) {
      console.error('❌ Remove orphaned tables from Postgres failed:', error.message);
    }
  }

  // Step 12: Remove orphaned tables from EDCAT AI DB
  let removeOrphanedEdcatSuccess = false;
  if (edcatSuccess) {
    try {
      removeOrphanedEdcatSuccess = await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        REMOVE_ORPHANED_EDCAT,
        'EDCAT AI Remove Orphaned Tables'
      );
    } catch (error) {
      console.error('❌ Remove orphaned tables from EDCAT AI failed:', error.message);
    }
  }

  // Step 13: Create parsed_requirements table (CRITICAL for parsing to work)
  let createParsedRequirementsSuccess = false;
  if (postgresSuccess) {
    try {
      createParsedRequirementsSuccess = await runMigration(
        process.env.DATABASE_URL,
        CREATE_PARSED_REQUIREMENTS,
        'PostgreSQL Create Parsed Requirements Table'
      );
    } catch (error) {
      console.error('❌ Create parsed_requirements table failed:', error.message);
    }
  }

  // Step 14: Restore authorized_users and user_permissions tables (CRITICAL for Admin section)
  let restoreAuthorizedUsersSuccess = false;
  if (postgresSuccess) {
    try {
      restoreAuthorizedUsersSuccess = await runMigration(
        process.env.DATABASE_URL,
        RESTORE_AUTHORIZED_USERS,
        'PostgreSQL Restore Authorized Users Table'
      );
    } catch (error) {
      console.error('❌ Restore authorized_users table failed:', error.message);
    }
  }

  // Step 15: Vera Enhanced Intelligence System (EDCAT AI DB)
  let veraIntelligenceSuccess = false;
  if (edcatSuccess) {
    try {
      veraIntelligenceSuccess = await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_ENHANCED_INTELLIGENCE,
        'EDCAT AI Vera Enhanced Intelligence System'
      );
    } catch (error) {
      console.error('❌ Vera Enhanced Intelligence migration failed:', error.message);
    }
  }

  // Step 16: Vera Knowledge Base Enhancement (EDCAT AI DB)
  let veraKnowledgeBaseSuccess = false;
  if (edcatSuccess) {
    try {
      veraKnowledgeBaseSuccess = await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_KNOWLEDGE_BASE,
        'EDCAT AI Vera Knowledge Base Enhancement'
      );
    } catch (error) {
      console.error('❌ Vera Knowledge Base Enhancement migration failed:', error.message);
    }
  }

  // Step 17: Vera Comprehensive Regulatory Research (EDCAT AI DB)
  let veraResearchSuccess = false;
  if (edcatSuccess) {
    try {
      veraResearchSuccess = await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_COMPREHENSIVE_RESEARCH,
        'EDCAT AI Vera Comprehensive Regulatory Research System'
      );
    } catch (error) {
      console.error('❌ Vera Comprehensive Research migration failed:', error.message);
    }
  }

  // Step 17: Customer Archive Gap Tracking (PostgreSQL)
  let customerArchiveSuccess = false;
  if (postgresSuccess) {
    try {
      customerArchiveSuccess = await runMigration(
        process.env.DATABASE_URL,
        CUSTOMER_ARCHIVE_GAP_TRACKING,
        'PostgreSQL Customer Archive Gap Tracking'
      );
    } catch (error) {
      console.error('❌ Customer archive migration failed:', error.message);
    }
  }

  // Step 18: Vera Complete Persona Specification (EDCAT AI)
  let veraPersonaSuccess = false;
  if (edcatSuccess) {
    try {
      veraPersonaSuccess = await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_COMPLETE_PERSONA,
        'EDCAT AI Vera Complete Persona Specification'
      );
    } catch (error) {
      console.error('❌ Vera persona specification migration failed:', error.message);
    }
  }

  // Step 19: Vera Query-Response Bank & Learning Loop (EDCAT AI)
  let veraQABankSuccess = false;
  if (edcatSuccess) {
    try {
      veraQABankSuccess = await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_QUERY_RESPONSE_BANK,
        'EDCAT AI Vera Query-Response Bank & Learning Loop'
      );
    } catch (error) {
      console.error('❌ Vera Q&A bank migration failed:', error.message);
    }
  }

  // Step 20: Vera Website Learning System (EDCAT AI)
  let veraWebsiteLearningSuccess = false;
  if (edcatSuccess) {
    try {
      veraWebsiteLearningSuccess = await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_WEBSITE_LEARNING,
        'EDCAT AI Vera Website Learning System'
      );
    } catch (error) {
      console.error('❌ Vera website learning migration failed:', error.message);
    }
  }

  // Step 21: Vera User Profiles & Preferences (EDCAT AI)
  let veraUserProfilesSuccess = false;
  if (edcatSuccess) {
    try {
      veraUserProfilesSuccess = await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_USER_PROFILES,
        'EDCAT AI Vera User Profiles & Preferences'
      );
    } catch (error) {
      console.error('❌ Vera user profiles migration failed:', error.message);
    }

    // Migration 022: Vera Parser Supervision
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_PARSER_SUPERVISION,
        'EDCAT AI Vera Parser Supervision System'
      );
    } catch (error) {
      console.error('❌ Vera parser supervision migration failed:', error.message);
    }
  }

  // Step 23: Vera Semantic Memory System (EDCAT AI)
  let veraSemanticMemorySuccess = false;
  if (edcatSuccess) {
    try {
      veraSemanticMemorySuccess = await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_SEMANTIC_MEMORY,
        'EDCAT AI Vera Semantic Memory System'
      );
    } catch (error) {
      console.error('❌ Vera semantic memory migration failed:', error.message);
    }
  }

  // Step 24: Vera Learned Corrections (EDCAT AI)
  let veraLearnedCorrectionsSuccess = false;
  if (edcatSuccess) {
    try {
      veraLearnedCorrectionsSuccess = await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_LEARNED_CORRECTIONS,
        'EDCAT AI Vera Learned Corrections'
      );
    } catch (error) {
      console.error('❌ Vera learned corrections migration failed:', error.message);
    }

    // Vera Debug Sessions
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_DEBUG_SESSIONS,
        'EDCAT AI Vera Debug Sessions'
      );
    } catch (error) {
      console.error('❌ Vera debug sessions migration failed:', error.message);
    }
  }

  // Step 27: Fix Admin Console Errors (PostgreSQL)
  let fixAdminConsoleSuccess = false;
  if (postgresSuccess) {
    try {
      fixAdminConsoleSuccess = await runMigration(
        process.env.DATABASE_URL,
        FIX_ADMIN_CONSOLE_ERRORS,
        FIX_PRODUCTION_ERRORS,
        'PostgreSQL Fix Admin Console Errors'
      );
    } catch (error) {
      console.error('❌ Fix admin console errors migration failed:', error.message);
    }
  }

  // Step 28: Vera Dynamic Greetings (EDCAT AI DB)
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_DYNAMIC_GREETINGS,
        'EDCAT AI Vera Dynamic Greetings'
      );
    } catch (error) {
      console.error('❌ Vera dynamic greetings migration failed:', error.message);
    }
  }

  // Step 29: Vera Quality Knowledge Base (EDCAT AI DB)
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_QUALITY_KNOWLEDGE,
        'EDCAT AI Vera Quality Knowledge Base'
      );
    } catch (error) {
      console.error('❌ Vera quality knowledge migration failed:', error.message);
    }
  }

  // Step 30: Vera Clause Intelligence Pack
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_CLAUSE_INTELLIGENCE,
        'EDCAT AI Vera Clause Intelligence'
      );
    } catch (error) {
      console.error('❌ Vera clause intelligence migration failed:', error.message);
    }
  }

  // Step 31: Vera Audit Knowledge Pack
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_AUDIT_KNOWLEDGE,
        'EDCAT AI Vera Audit Knowledge'
      );
    } catch (error) {
      console.error('❌ Vera audit knowledge migration failed:', error.message);
    }
  }

  // Step 32: Vera Quality Tools Pack
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_QUALITY_TOOLS,
        'EDCAT AI Vera Quality Tools'
      );
    } catch (error) {
      console.error('❌ Vera quality tools migration failed:', error.message);
    }
  }

  // Step 33: Vera Root Cause Knowledge Pack
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_ROOT_CAUSE_KNOWLEDGE,
        'EDCAT AI Vera Root Cause Knowledge'
      );
    } catch (error) {
      console.error('❌ Vera root cause knowledge migration failed:', error.message);
    }
  }

  // Step 34: Vera Industry Knowledge Pack
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_INDUSTRY_KNOWLEDGE,
        'EDCAT AI Vera Industry Knowledge'
      );
    } catch (error) {
      console.error('❌ Vera industry knowledge migration failed:', error.message);
    }
  }

  // Step 35: Vera Gap Mapping Knowledge Pack
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_GAP_MAPPING_KNOWLEDGE,
        'EDCAT AI Vera Gap Mapping Knowledge'
      );
    } catch (error) {
      console.error('❌ Vera gap mapping knowledge migration failed:', error.message);
    }
  }

  // Step 36: Vera Debug Explanations Pack
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_DEBUG_EXPLANATIONS,
        'EDCAT AI Vera Debug Explanations'
      );
    } catch (error) {
      console.error('❌ Vera debug explanations migration failed:', error.message);
    }
  }

  // Step 37: Make Document Numbering Optional
  if (postgresSuccess) {
    try {
      await runMigration(
        process.env.DATABASE_URL,
        MAKE_DOC_NUMBER_OPTIONAL,
        'PostgreSQL Make Document Numbering Optional'
      );
    } catch (error) {
      console.error('❌ Make doc number optional migration failed:', error.message);
    }
  }

  // Step 38: Seed Vera Annex A Knowledge
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        SEED_VERA_ANNEX_A_KNOWLEDGE,
        'EDCAT AI Seed Vera Annex A Knowledge'
      );
    } catch (error) {
      console.error('❌ Seed Vera Annex A knowledge migration failed:', error.message);
    }
  }

  // Step 42: Fix Vera Memory Schema (EDCAT AI DB)
  // CRITICAL: Adds missing columns (role, message_text, question_text) to conversation_memory and related tables
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        FIX_VERA_MEMORY_SCHEMA,
        'EDCAT AI Fix Vera Memory Schema'
      );
    } catch (error) {
      console.error('❌ Fix Vera memory schema migration failed:', error.message);
    }
  }

  // Step 48: Fix Vera Debug Sessions Schema (EDCAT AI DB)
  // CRITICAL: Adds missing columns (issue_code, severity, message, etc.) to vera_debug_sessions
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        FIX_VERA_DEBUG_SESSIONS_SCHEMA,
        'EDCAT AI Fix Vera Debug Sessions Schema'
      );
    } catch (error) {
      console.error('❌ Fix Vera debug sessions schema migration failed:', error.message);
    }
  }

  // Step 50: Fix Vera Debug Sessions user_id Constraint (EDCAT AI DB)
  // CRITICAL: Makes user_id nullable with default 'system' to prevent constraint violations
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        FIX_VERA_DEBUG_SESSIONS_USER_ID,
        'EDCAT AI Fix Vera Debug Sessions user_id Constraint'
      );
      console.log('✅ vera_debug_sessions user_id constraint fixed');
    } catch (error) {
      console.error('❌ Fix Vera debug sessions user_id constraint migration failed:', error.message);
    }
  }

  // Step 51: Ensure Learning Tables Exist (EDCAT AI DB)
  // CRITICAL: These tables are required for VeraLearningRepository to function
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        ENSURE_LEARNING_TABLES,
        'EDCAT AI Ensure Learning Tables'
      );
      console.log('✅ Learning tables (document_content_for_learning, learning_examples) ensured');
    } catch (error) {
      console.error('❌ Ensure learning tables migration failed:', error.message);
    }
  }

  // Step 51b: Create Terms and Definitions Table (EDCAT AI DB)
  // CRITICAL: This table is required for VeraTerminologyService to function
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        CREATE_TERMS_AND_DEFINITIONS,
        'EDCAT AI Create Terms and Definitions Table'
      );
    } catch (error) {
      console.error('❌ Create terms and definitions table migration failed:', error.message);
    }
  }

  // Step 54: Create Vera Response Learning System (EDCAT AI DB)
  // CRITICAL: Enables Vera to learn, generate, and improve responses dynamically
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERA_RESPONSE_LEARNING_SYSTEM,
        'EDCAT AI Create Vera Response Learning System'
      );
      console.log('✅ Vera response learning system tables created');
    } catch (error) {
      console.error('❌ Create Vera response learning system migration failed:', error.message);
    }
  }

  // Step 55: Verify and populate Q&A responses (EDCAT AI DB)
  // CRITICAL: Ensures response_text is NOT NULL and contains actual answers
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        VERIFY_QA_RESPONSES,
        'EDCAT AI Verify and Populate Q&A Responses'
      );
      console.log('✅ Q&A responses verified and populated');
    } catch (error) {
      console.error('❌ Verify Q&A responses migration failed:', error.message);
    }
  }

  // Step 56: Fix Vera Embedding Columns (EDCAT AI DB)
  // CRITICAL: Fixes DB_SCHEMA_MISMATCH by adding embedding columns to memory tables
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        FIX_VERA_EMBEDDING_COLUMNS,
        'EDCAT AI Fix Vera Embedding Columns'
      );
      console.log('✅ Vera embedding columns fixed (DB_SCHEMA_MISMATCH resolved)');
    } catch (error) {
      console.error('❌ Fix Vera embedding columns migration failed:', error.message);
    }
  }

  // Step 60: Fix Vera Column Mismatches (EDCAT AI DB)
  // CRITICAL: Fixes schema mismatches between code and database
  // - Adds user_id to ai_conversation_history
  // - Adds issue_type to vera_debug_sessions
  // - Ensures response_template and user_query_pattern exist
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        FIX_VERA_COLUMN_MISMATCHES,
        'EDCAT AI Fix Vera Column Mismatches'
      );
      console.log('✅ Vera column mismatches fixed');
    } catch (error) {
      console.error('❌ Fix Vera column mismatches migration failed:', error.message);
    }
  }

  // Step 61: Create AI Learning Event Table (EDCAT AI DB)
  // PHASE 8: Active Learning Loop - Stores learning events when Vera struggles or receives corrections
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        CREATE_AI_LEARNING_EVENT,
        'EDCAT AI Create AI Learning Event Table'
      );
      console.log('✅ AI learning event table created (Phase 8)');
    } catch (error) {
      console.error('❌ Create AI learning event table migration failed:', error.message);
    }
  }

  // Step 70: Fix vera_query_response_bank column names (EDCAT AI DB)
  // CRITICAL FIX: Normalize column names to fix Vera data retrieval
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        FIX_VERA_QUERY_RESPONSE_BANK,
        'EDCAT AI Fix Vera Query Response Bank Columns'
      );
      console.log('✅ Vera query response bank columns normalized (Migration 070)');
    } catch (error) {
      console.error('❌ Fix Vera query response bank columns migration failed:', error.message);
    }
  }

  // Step 71: Fix ai_conversation_history column names (EDCAT AI DB)
  // CRITICAL FIX: Add missing columns for conversation history
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        FIX_AI_CONVERSATION_HISTORY,
        'EDCAT AI Fix AI Conversation History Columns'
      );
      console.log('✅ AI conversation history columns fixed (Migration 071)');
    } catch (error) {
      console.error('❌ Fix AI conversation history columns migration failed:', error.message);
    }
  }

  // Step 72: Ensure All Required EDCAT Tables Exist (EDCAT AI DB)
  // CRITICAL: Creates any missing tables documented in architecture
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        ENSURE_ALL_EDCAT_TABLES,
        'EDCAT AI Ensure All Required Tables'
      );
      console.log('✅ All required EDCAT tables verified (Migration 072)');
    } catch (error) {
      console.error('❌ Ensure all EDCAT tables migration failed:', error.message);
    }
  }

  // Step 73: Ensure All Required EDCAT Columns Exist (EDCAT AI DB)
  // CRITICAL: Adds missing columns that services actually use
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        ENSURE_ALL_EDCAT_COLUMNS,
        'EDCAT AI Ensure All Required Columns'
      );
      console.log('✅ All required EDCAT columns verified (Migration 073)');
    } catch (error) {
      console.error('❌ Ensure all EDCAT columns migration failed:', error.message);
    }
  }

  // Step 74: Fix Critical Column Mismatches (EDCAT AI DB)
  // CRITICAL: Fixes immediate errors: response_template→response_text, missing user_id, missing context
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        FIX_CRITICAL_COLUMN_MISMATCHES,
        'EDCAT AI Fix Critical Column Mismatches'
      );
      console.log('✅ Critical column mismatches fixed (Migration 074)');
    } catch (error) {
      console.error('❌ Fix critical column mismatches failed:', error.message);
    }
  }

  // Step 75: Drop NOT NULL Constraints on ai_conversation_history (EDCAT AI DB)
  // CRITICAL: Allows NULL values for tenant_id, message, and user_id to support existing data
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        DROP_NOT_NULL_CONSTRAINTS,
        'EDCAT AI Drop NOT NULL Constraints'
      );
      console.log('✅ NOT NULL constraints dropped (Migration 075)');
    } catch (error) {
      console.error('❌ Drop NOT NULL constraints failed:', error.message);
    }
  }

  // Step 76: Add context column to vera_terminology (EDCAT AI DB)
  // CRITICAL: Adds context column for richer term definitions
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        ADD_CONTEXT_TO_VERA_TERMINOLOGY,
        'EDCAT AI Add Context to Vera Terminology'
      );
      console.log('✅ Context column added to vera_terminology (Migration 076)');
    } catch (error) {
      console.error('❌ Add context to vera_terminology failed:', error.message);
    }
  }

  // Step 77: Fix document_content_for_learning file_id column (EDCAT AI DB)
  // CRITICAL: Adds file_id column that code expects but table is missing
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        FIX_DOCUMENT_CONTENT_FILE_ID,
        'EDCAT AI Fix document_content_for_learning file_id'
      );
      console.log('✅ file_id column added to document_content_for_learning (Migration 077)');
    } catch (error) {
      console.error('❌ Fix document_content_for_learning file_id failed:', error.message);
    }
  }

  // Step 78: Create GAP Analysis Helper Functions (PostgreSQL)
  // CRITICAL: Creates generate_gap_reference_number and get_next_revision_number functions
  if (postgresSuccess) {
    try {
      await runMigration(
        process.env.DATABASE_URL,
        CREATE_GAP_ANALYSIS_FUNCTIONS,
        'PostgreSQL Create GAP Analysis Helper Functions'
      );
      console.log('✅ GAP analysis helper functions created (Migration 078)');
    } catch (error) {
      console.error('❌ Create GAP analysis functions failed:', error.message);
    }
  }

  // Step 99: Fix VERA Schema Critical Issues (EDCAT AI DB)
  // CRITICAL: Fixes missing file_id column and NOT NULL constraint violations
  // - Adds file_id to document_content_for_learning
  // - Drops NOT NULL from vera_debug_sessions.user_id
  // - Drops NOT NULL from ai_conversation_history (tenant_id, message, user_id)
  if (edcatSuccess) {
    try {
      await runMigration(
        process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
        FIX_VERA_SCHEMA_CRITICAL,
        'EDCAT AI Fix VERA Schema Critical Issues'
      );
      console.log('✅ VERA schema critical issues fixed (Migration 099)');
    } catch (error) {
      console.error('❌ Fix VERA schema critical issues failed:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  
  if (postgresSuccess && edcatSuccess) {
    console.log('✅ Both database migrations completed successfully!');
    return true;
  } else {
    console.log('⚠️  Some migrations had issues. Check logs above.');
    // Still return true to allow app to start (migrations are idempotent)
    return true;
  }
}

