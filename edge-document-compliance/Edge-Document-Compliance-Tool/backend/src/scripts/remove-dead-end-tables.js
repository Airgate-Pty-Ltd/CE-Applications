/**
 * Remove Dead-End Tables
 * 
 * Removes tables that have no code connections (dead-ends)
 * These tables waste space and cause confusion
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';
import dotenv from 'dotenv';

dotenv.config();

// Dead-end tables identified from code analysis
const DEAD_END_TABLES = {
  postgres: [
    'audit_logs_results',
    'conversation_context',
    'generated_reports',
    'upload_files',  // Replaced by standard_files
    'user_feedback'
  ],
  edcatAi: [
    'ai_chat_log',
    'ai_doc_ref',
    'ai_memories',  // Note: May be in edcat schema, verify first
    'ai_messages',
    'ai_sessions',
    'baseline_metrics',
    'personality_learning_events',
    'qa_pairs',
    'sync_log'
  ]
};

async function removeDeadEndTables() {
  console.log('\n🗑️  REMOVING DEAD-END TABLES\n');
  console.log('='.repeat(100));
  
  const report = {
    postgres: { found: [], removed: [], errors: [] },
    edcatAi: { found: [], removed: [], errors: [] }
  };
  
  try {
    // Check and remove from PostgreSQL
    console.log('\n📊 POSTGRESQL DATABASE - Removing dead-end tables...');
    console.log('-'.repeat(100));
    
    for (const tableName of DEAD_END_TABLES.postgres) {
      try {
        // Check if table exists
        const exists = await queryPostgres(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
          ) as exists
        `, [tableName]);
        
        if (exists.rows[0].exists) {
          // Get row count before deletion
          const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${tableName}`);
          const rowCount = parseInt(count.rows[0].count);
          
          console.log(`  Found: public.${tableName} (${rowCount} rows)`);
          report.postgres.found.push({ table: `public.${tableName}`, rows: rowCount });
          
          // Drop the table
          await queryPostgres(`DROP TABLE IF EXISTS public.${tableName} CASCADE`);
          console.log(`    ✅ Removed: public.${tableName}`);
          report.postgres.removed.push(`public.${tableName}`);
        } else {
          console.log(`  ⚠️  Not found: public.${tableName} (may already be removed)`);
        }
      } catch (error) {
        console.log(`    ❌ Error removing public.${tableName}: ${error.message}`);
        report.postgres.errors.push({ table: `public.${tableName}`, error: error.message });
      }
    }
    
    // Check and remove from EDCAT AI DB
    console.log('\n\n🤖 EDCAT AI DATABASE - Removing dead-end tables...');
    console.log('-'.repeat(100));
    
    for (const tableName of DEAD_END_TABLES.edcatAi) {
      try {
        // Check if table exists in public schema
        let exists = await queryEdcatAI(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
          ) as exists
        `, [tableName]);
        
        // Also check edcat schema for ai_memories
        if (!exists.rows[0].exists && tableName === 'ai_memories') {
          exists = await queryEdcatAI(`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'edcat' AND table_name = $1
            ) as exists
          `, [tableName]);
        }
        
        if (exists.rows[0].exists) {
          // Determine schema
          const schema = tableName === 'ai_memories' ? 'edcat' : 'public';
          const fullName = schema === 'public' ? tableName : `edcat.${tableName}`;
          
          // Get row count before deletion
          const count = await queryEdcatAI(`SELECT COUNT(*) as count FROM ${fullName}`);
          const rowCount = parseInt(count.rows[0].count);
          
          console.log(`  Found: ${fullName} (${rowCount} rows)`);
          report.edcatAi.found.push({ table: fullName, rows: rowCount });
          
          // Drop the table
          await queryEdcatAI(`DROP TABLE IF EXISTS ${fullName} CASCADE`);
          console.log(`    ✅ Removed: ${fullName}`);
          report.edcatAi.removed.push(fullName);
        } else {
          console.log(`  ⚠️  Not found: ${tableName} (may already be removed)`);
        }
      } catch (error) {
        console.log(`    ❌ Error removing ${tableName}: ${error.message}`);
        report.edcatAi.errors.push({ table: tableName, error: error.message });
      }
    }
    
    // Summary
    console.log('\n\n📋 CLEANUP SUMMARY');
    console.log('='.repeat(100));
    console.log(`PostgreSQL:`);
    console.log(`  Found: ${report.postgres.found.length} dead-end tables`);
    console.log(`  Removed: ${report.postgres.removed.length} tables`);
    console.log(`  Errors: ${report.postgres.errors.length}`);
    if (report.postgres.removed.length > 0) {
      console.log(`  Removed tables: ${report.postgres.removed.join(', ')}`);
    }
    
    console.log(`\nEDCAT AI:`);
    console.log(`  Found: ${report.edcatAi.found.length} dead-end tables`);
    console.log(`  Removed: ${report.edcatAi.removed.length} tables`);
    console.log(`  Errors: ${report.edcatAi.errors.length}`);
    if (report.edcatAi.removed.length > 0) {
      console.log(`  Removed tables: ${report.edcatAi.removed.join(', ')}`);
    }
    
    console.log('\n✅ Dead-end table cleanup complete!');
    
  } catch (error) {
    console.error('\n❌ ERROR during cleanup:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

removeDeadEndTables();

