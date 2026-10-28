/**
 * COMPREHENSIVE CLEANUP: Drop ALL Orphaned Tables from PostgreSQL
 * This script identifies and drops tables that have NO code connections
 * Based on comprehensive audit of codebase
 */

import dotenv from 'dotenv';
import { queryPostgres } from '../config/databases.js';

dotenv.config();

// Tables that ARE USED in code (DO NOT DROP)
const ACTIVE_TABLES = [
  'standards',                    // ✅ Used in requirements.js, upload.js, parse.js
  'parsed_requirements',          // ✅ Used in requirements.js, parse.js, chat.js
  'gap_analyses',                 // ✅ Used in gap.js, admin.js, orchestrator.js
  'audit_trail',                  // ✅ Used in gap.js, auditTrail.js
  'tenants',                      // ✅ Used in predictions.js, fix-all-schema-errors.js
  'customer_procedures',          // ✅ Used in correlation engines
  'customer_documents',           // ✅ Used in gap analysis workflows
  'analysis_clarifications',      // ✅ Used in gap analysis workflows
  'parsed_clauses',               // ✅ Used in parse.js, clauseQuery.js
  'regulatory_websites',         // ✅ Used in regulatory.js
  'document_content_for_learning', // ✅ Used by Vera learning system
  'extraction_history',           // ✅ Used in parse.js
  'model_versions',               // ✅ Used in parse.js
];

// Tables that are DEFINITELY ORPHANED (DROP THESE)
const DEFINITELY_ORPHANED = [
  // Consolidated into standards (migration 006)
  'standard_files',
  'standard_files_content',
  
  // No code connections found
  'upload_files',
  'generated_reports',
  'user_feedback',
  'audit_logs_results',
  'integration_logs',
  'users',
  
  // From phase 5 enterprise migration - no code connections found
  'api_keys',                     // ❌ No code uses this
  'assessments',                  // ❌ No code uses this
  'audit_logs',                   // ❌ No code uses this (different from audit_trail)
  'authorized_users',             // ❌ No code uses this
  'compliance_requirements',      // ❌ No code uses this (we use parsed_requirements)
  'documents',                    // ❌ No code uses this (we use customer_documents)
  'files',                        // ❌ No code uses this
  'i18n_translations',            // ❌ No code uses this
  'industry_modules',             // ❌ No code uses this
  'integrations',                 // ❌ No code uses this
  'requirement_mapping',          // ❌ No code uses this
  'requirement_mappings',         // ❌ No code uses this (alternative name)
  'user_permissions',             // ❌ No code uses this
  'regional_compliance_mappings', // ❌ No code uses this
  'tenant_industry_modules',      // ❌ No code uses this
];

async function dropAllOrphanedTables() {
  console.log('🗑️  COMPREHENSIVE CLEANUP: Dropping ALL Orphaned Tables\n');
  console.log('='.repeat(80));
  
  try {
    // Get all tables in database
    const existingTables = await queryPostgres(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const existingTableNames = existingTables.rows.map(r => r.table_name);
    console.log(`\n📋 Found ${existingTableNames.length} tables in database`);
    
    // Identify tables to drop (exist in database AND in orphaned list)
    const tablesToDrop = DEFINITELY_ORPHANED.filter(table => 
      existingTableNames.includes(table)
    );
    
    // Identify tables that should exist (for verification)
    const activeTablesFound = ACTIVE_TABLES.filter(table => 
      existingTableNames.includes(table)
    );
    
    console.log(`\n✅ Active tables found: ${activeTablesFound.length}/${ACTIVE_TABLES.length}`);
    activeTablesFound.forEach(table => {
      console.log(`   ✓ ${table}`);
    });
    
    const activeTablesMissing = ACTIVE_TABLES.filter(table => 
      !existingTableNames.includes(table)
    );
    if (activeTablesMissing.length > 0) {
      console.log(`\n⚠️  Active tables MISSING: ${activeTablesMissing.length}`);
      activeTablesMissing.forEach(table => {
        console.log(`   ⚠ ${table}`);
      });
    }
    
    if (tablesToDrop.length === 0) {
      console.log('\n✅ No orphaned tables found to drop!');
      return;
    }
    
    console.log(`\n🗑️  Dropping ${tablesToDrop.length} orphaned tables:\n`);
    
    let droppedCount = 0;
    let errorCount = 0;
    
    for (const table of tablesToDrop) {
      try {
        console.log(`   Dropping: ${table}...`);
        await queryPostgres(`DROP TABLE IF EXISTS public.${table} CASCADE;`);
        console.log(`   ✅ Dropped: ${table}`);
        droppedCount++;
      } catch (error) {
        console.error(`   ❌ Error dropping ${table}:`, error.message);
        errorCount++;
      }
    }
    
    // Verify what's left
    const remainingTables = await queryPostgres(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ Cleanup complete!`);
    console.log(`   Dropped: ${droppedCount} tables`);
    console.log(`   Errors: ${errorCount} tables`);
    console.log(`   Remaining: ${remainingTables.rows.length} tables`);
    console.log(`\n📋 Remaining tables:`);
    remainingTables.rows.forEach((row, idx) => {
      const isActive = ACTIVE_TABLES.includes(row.table_name);
      const marker = isActive ? '✅' : '❓';
      console.log(`   ${marker} ${idx + 1}. ${row.table_name}${isActive ? ' (ACTIVE)' : ' (UNKNOWN - REVIEW)'}`);
    });
    
    // Check for unknown tables
    const unknownTables = remainingTables.rows
      .map(r => r.table_name)
      .filter(name => !ACTIVE_TABLES.includes(name) && !name.startsWith('schema_migrations'));
    
    if (unknownTables.length > 0) {
      console.log(`\n⚠️  ${unknownTables.length} unknown tables found (not in active list):`);
      unknownTables.forEach(table => {
        console.log(`   ❓ ${table}`);
      });
      console.log(`\n💡 These may be system tables or need code review.`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

dropAllOrphanedTables();

