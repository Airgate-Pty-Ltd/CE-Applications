/**
 * IMMEDIATE CLEANUP: Run Migration 010 to remove orphaned tables
 * This script runs the cleanup migration directly on the PostgreSQL database
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryPostgres } from '../config/databases.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const MIGRATION_FILE = path.join(__dirname, '../../../migrations/010_remove_orphaned_tables_postgres.sql');

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
      const dollarQuoteStart = line.match(/(?:DO\s+)?(\$[^$]*\$)/i);
      if (dollarQuoteStart) {
        inDollarQuote = true;
        dollarTag = dollarQuoteStart[1];
      }
    } else {
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
  
  return statements;
}

async function runCleanupMigration() {
  console.log('🗑️  Running Cleanup Migration 010 to Remove Orphaned Tables\n');
  console.log('='.repeat(80));
  
  try {
    // Check which tables exist before
    const beforeTables = await queryPostgres(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log(`\n📋 Before: ${beforeTables.rows.length} tables found`);
    
    // Read migration file
    if (!fs.existsSync(MIGRATION_FILE)) {
      throw new Error(`Migration file not found: ${MIGRATION_FILE}`);
    }
    
    const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');
    const statements = splitSQLStatements(migrationSQL);
    
    console.log(`\n📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`   [${i + 1}/${statements.length}] Executing statement...`);
        await queryPostgres(statement);
        console.log(`   ✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        console.error(`   ❌ Error executing statement ${i + 1}:`, error.message);
        // Continue with next statement (some may fail if tables don't exist, which is OK)
      }
    }
    
    // Check which tables exist after
    const afterTables = await queryPostgres(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ Cleanup complete!`);
    console.log(`   Before: ${beforeTables.rows.length} tables`);
    console.log(`   After: ${afterTables.rows.length} tables`);
    console.log(`   Removed: ${beforeTables.rows.length - afterTables.rows.length} tables`);
    
    console.log(`\n📋 Remaining tables:`);
    afterTables.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Export the function for use as module
export default runCleanupMigration;

// Run if called directly (not imported)
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].includes('run-cleanup-migration-now.js')) {
  runCleanupMigration();
}

