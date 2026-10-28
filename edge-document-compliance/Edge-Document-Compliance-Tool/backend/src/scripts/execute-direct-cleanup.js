/**
 * DIRECT CLEANUP: Execute SQL directly to drop orphaned tables
 * This bypasses the migration system and runs SQL directly
 */

import dotenv from 'dotenv';
import { queryPostgres } from '../config/databases.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// CRITICAL: These tables are NO LONGER ORPHANED - they are part of the current architecture
// DO NOT DROP: authorized_users, standard_files, compliance_requirements, user_permissions, requirement_mappings
// These tables are actively used by the application

const ORPHANED_TABLES = [
  // Only truly unused tables should be here
  'upload_files',
  'generated_reports',
  'user_feedback',
  'audit_logs_results',
  'users', // Old users table (if exists, replaced by authorized_users)
  // DO NOT include: authorized_users, standard_files, standard_files_content, 
  // compliance_requirements, user_permissions, requirement_mappings, industry_modules,
  // tenant_industry_modules, integrations, api_keys, i18n_translations
];

async function executeDirectCleanup() {
  console.log('🗑️  DIRECT CLEANUP: Dropping Orphaned Tables\n');
  console.log('='.repeat(80));
  
  try {
    // Get tables before
    const beforeResult = await queryPostgres(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const beforeTables = beforeResult.rows.map(r => r.table_name);
    console.log(`\n📋 Before: ${beforeTables.length} tables`);
    
    // Drop each orphaned table directly
    console.log(`\n🗑️  Dropping ${ORPHANED_TABLES.length} orphaned tables:\n`);
    
    let dropped = 0;
    let errors = 0;
    
    for (const table of ORPHANED_TABLES) {
      try {
        // Check if table exists first
        const exists = beforeTables.includes(table);
        if (!exists) {
          console.log(`   ⏭️  ${table} (does not exist, skipping)`);
          continue;
        }
        
        console.log(`   Dropping: ${table}...`);
        await queryPostgres(`DROP TABLE IF EXISTS public.${table} CASCADE;`);
        console.log(`   ✅ Dropped: ${table}`);
        dropped++;
      } catch (error) {
        console.error(`   ❌ Error dropping ${table}:`, error.message);
        errors++;
      }
    }
    
    // Get tables after
    const afterResult = await queryPostgres(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const afterTables = afterResult.rows.map(r => r.table_name);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ Cleanup complete!`);
    console.log(`   Dropped: ${dropped} tables`);
    console.log(`   Errors: ${errors} tables`);
    console.log(`   Before: ${beforeTables.length} tables`);
    console.log(`   After: ${afterTables.length} tables`);
    console.log(`   Removed: ${beforeTables.length - afterTables.length} tables`);
    
    console.log(`\n📋 Remaining tables (${afterTables.length}):`);
    afterTables.forEach((table, idx) => {
      console.log(`   ${idx + 1}. ${table}`);
    });
    
    return {
      success: true,
      dropped,
      errors,
      before: beforeTables.length,
      after: afterTables.length,
      removed: beforeTables.length - afterTables.length,
      remainingTables: afterTables
    };
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  }
}

// Export for use as module
export default executeDirectCleanup;

// Run if called directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || 
    process.argv[1]?.includes('execute-direct-cleanup.js')) {
  executeDirectCleanup()
    .then(result => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

