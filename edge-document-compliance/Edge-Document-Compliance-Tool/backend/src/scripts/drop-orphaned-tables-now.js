/**
 * IMMEDIATE CLEANUP: Drop Orphaned Tables from PostgreSQL
 * This script directly drops tables that have no code connections
 * Run this to clean up the database immediately
 */

import dotenv from 'dotenv';
import { queryPostgres } from '../config/databases.js';

dotenv.config();

const ORPHANED_TABLES = [
  // Tables consolidated into standards (migration 006)
  'standard_files',
  'standard_files_content',
  
  // Tables with no code connections
  'upload_files',
  'generated_reports',
  'user_feedback',
  'audit_logs_results',
  'integration_logs',
  'users',
  
  // Additional tables that may be orphaned (need verification)
  'api_keys',
  'assessments',
  'audit_logs',
  'authorized_users',
  'compliance_requirements',
  'documents',
  'files',
  'requirement_mapping',
  'user_permissions',
];

async function dropOrphanedTables() {
  console.log('🗑️  DROPPING ORPHANED TABLES FROM POSTGRESQL\n');
  console.log('='.repeat(80));
  
  try {
    // First, check which tables actually exist
    const existingTables = await queryPostgres(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const existingTableNames = existingTables.rows.map(r => r.table_name);
    console.log(`\n📋 Found ${existingTableNames.length} tables in database`);
    
    // Filter to only tables we want to drop that actually exist
    const tablesToDrop = ORPHANED_TABLES.filter(table => existingTableNames.includes(table));
    
    if (tablesToDrop.length === 0) {
      console.log('\n✅ No orphaned tables found to drop!');
      return;
    }
    
    console.log(`\n🗑️  Dropping ${tablesToDrop.length} orphaned tables:\n`);
    
    for (const table of tablesToDrop) {
      try {
        console.log(`   Dropping: ${table}...`);
        await queryPostgres(`DROP TABLE IF EXISTS public.${table} CASCADE;`);
        console.log(`   ✅ Dropped: ${table}`);
      } catch (error) {
        console.error(`   ❌ Error dropping ${table}:`, error.message);
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
    
    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Remaining tables: ${remainingTables.rows.length}`);
    console.log(`\n📋 Remaining tables:`);
    remainingTables.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

dropOrphanedTables();

