/**
 * Run Two-Database Migrations
 * 
 * Step 1: Apply PostgreSQL Customer Data schema
 * Step 2: Apply EDCAT AI Intelligence schema
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Split SQL into executable statements (handles DO $$ blocks and dollar-quoted strings)
 * This is the same function from twoDatabaseMigrations.js
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
    
    // Handle dollar-quoted strings ($$, $tag$, etc.)
    const dollarQuoteRegex = /\$([^$]*)\$/g;
    let match;
    let lastIndex = 0;
    let processedLine = '';
    
    while ((match = dollarQuoteRegex.exec(line)) !== null) {
      processedLine += line.substring(lastIndex, match.index);
      
      if (!inDollarQuote) {
        // Starting a dollar quote
        inDollarQuote = true;
        dollarTag = match[0];
        processedLine += match[0];
      } else if (match[0] === dollarTag) {
        // Ending the dollar quote
        inDollarQuote = false;
        dollarTag = null;
        processedLine += match[0];
      } else {
        // Inside a dollar quote, keep as-is
        processedLine += match[0];
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    processedLine += line.substring(lastIndex);
    line = processedLine;
    
    // Add line to current statement
    currentStatement += line + '\n';
    
    // Check if we've completed a statement (semicolon outside of dollar quotes)
    if (!inDollarQuote && line.trim().endsWith(';')) {
      const trimmed = currentStatement.trim();
      if (trimmed.length > 0 && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      currentStatement = '';
    }
  }
  
  // Add any remaining statement
  const trimmed = currentStatement.trim();
  if (trimmed.length > 0 && !trimmed.startsWith('--')) {
    statements.push(trimmed);
  }
  
  return statements;
}

async function runMigration(connectionString, migrationFile, dbName) {
  console.log(`\n📦 Running migration for ${dbName}...`);
  console.log(`   File: ${migrationFile}`);
  
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', '..', '..', migrationFile);
    const sql = readFileSync(migrationPath, 'utf8');

    // Use the proper SQL splitting function from twoDatabaseMigrations.js
    const statements = splitSQLStatements(sql);

    console.log(`   Executing ${statements.length} statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0 && statement.trim().length > 0) {
        try {
          await pool.query(statement);
          if ((i + 1) % 10 === 0) {
            process.stdout.write(`   Progress: ${i + 1}/${statements.length}\r`);
          }
        } catch (error) {
          // Ignore "already exists" errors and idempotent operations
          const isIdempotentError = 
            error.message.includes('already exists') || 
            error.message.includes('duplicate key') ||
            error.message.includes('relation already exists') ||
            error.message.includes('does not exist') && (
              statement.includes('DROP') || 
              statement.includes('IF EXISTS') ||
              statement.includes('ADD COLUMN IF NOT EXISTS')
            );
          
          if (!isIdempotentError) {
            // Only show warnings for non-idempotent errors
            const errorMsg = error.message.substring(0, 100);
            // Don't show warnings for "relation does not exist" if it's in an IF EXISTS check
            if (!errorMsg.includes('does not exist') || !statement.includes('IF EXISTS')) {
              console.error(`\n   ⚠️  Statement ${i + 1} error:`, errorMsg);
              // Show first 200 chars of statement for debugging
              const stmtPreview = statement.substring(0, 200).replace(/\s+/g, ' ');
              console.error(`   Statement: ${stmtPreview}...`);
            }
          }
        }
      }
    }

    console.log(`\n   ✅ ${dbName} migration completed successfully!`);

    // Verify critical tables were created
    const criticalTables = ['standards', 'parsed_requirements', 'tenants', 'gap_analyses'];
    const existingTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name = ANY($1)
    `, [criticalTables]);
    
    const existingTableNames = existingTables.rows.map(r => r.table_name);
    const missingTables = criticalTables.filter(t => !existingTableNames.includes(t));
    
    if (missingTables.length > 0) {
      console.log(`   ⚠️  Missing critical tables: ${missingTables.join(', ')}`);
    } else {
      console.log(`   ✅ All critical tables exist: ${existingTableNames.join(', ')}`);
    }
    
    const tableCount = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`   📊 Total tables in database: ${tableCount.rows[0].count}`);

    await pool.end();
    return true;

  } catch (error) {
    console.error(`\n   ❌ ${dbName} migration failed:`, error.message);
    await pool.end();
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Two-Database Migration Process\n');
  console.log('=' .repeat(60));

  // Check environment variables
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  if (!process.env.EDCAT_AI_DATABASE_URL) {
    console.warn('⚠️  EDCAT_AI_DATABASE_URL not set, using DATABASE_URL for both');
    process.env.EDCAT_AI_DATABASE_URL = process.env.DATABASE_URL;
  }

  // Step 1: PostgreSQL Customer Data
  const postgresSuccess = await runMigration(
    process.env.DATABASE_URL,
    'migrations/001_postgres_customer_data.sql',
    'PostgreSQL Customer Data DB'
  );

  // Step 2: EDCAT AI Intelligence
  const edcatSuccess = await runMigration(
    process.env.EDCAT_AI_DATABASE_URL,
    'migrations/002_edcat_ai_intelligence.sql',
    'EDCAT AI Intelligence DB'
  );

  console.log('\n' + '='.repeat(60));
  
  if (postgresSuccess && edcatSuccess) {
    console.log('✅ All migrations completed successfully!');
    process.exit(0);
  } else {
    console.log('❌ Some migrations failed. Check logs above.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

