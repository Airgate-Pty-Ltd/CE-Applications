/**
 * Run ONLY EDCAT AI Migration
 * Creates blueprint tables: ai_standard, ai_clause_blueprint, ai_crosswalk_blueprint
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Split SQL into executable statements (handles dollar-quoted strings)
 */
function splitSQLStatements(sql) {
  const statements = [];
  let currentStatement = '';
  let inMultiLineComment = false;
  let inDollarQuote = false;
  let dollarTag = '';
  
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
    
    // Handle dollar-quoted strings (e.g., $$ ... $$)
    if (!inDollarQuote) {
      const dollarMatch = line.match(/\$([^$]*)\$/);
      if (dollarMatch) {
        dollarTag = dollarMatch[1];
        inDollarQuote = true;
      }
    } else {
      // Check if we're closing the dollar quote
      if (line.includes(`$${dollarTag}$`)) {
        inDollarQuote = false;
        dollarTag = '';
      }
    }
    
    // If we're in a dollar quote, add the whole line
    if (inDollarQuote) {
      currentStatement += line + '\n';
      continue;
    }
    
    // Handle single-line comments (only if not in dollar quote)
    const commentIndex = line.indexOf('--');
    if (commentIndex !== -1) {
      line = line.substring(0, commentIndex);
    }
    
    line = line.trim();
    
    if (!line) {
      continue;
    }
    
    currentStatement += line + '\n';
    
    // Check if statement ends with semicolon (only if not in dollar quote)
    if (line.endsWith(';') && !inDollarQuote) {
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

async function runMigration(connectionString, migrationFile, dbName) {
  console.log(`\n📦 Running migration for ${dbName}...`);
  console.log(`   File: ${basename(migrationFile)}`);
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false } // Railway requires SSL
  });

  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', '..', '..', migrationFile);
    const sql = readFileSync(migrationPath, 'utf8');

    // Better SQL splitting that handles dollar-quoted strings
    const statements = splitSQLStatements(sql);

    console.log(`   Executing ${statements.length} statements...`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          await pool.query(statement);
          successCount++;
          if ((i + 1) % 10 === 0) {
            process.stdout.write(`   Progress: ${i + 1}/${statements.length}\r`);
          }
        } catch (error) {
          // Ignore "already exists" errors
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate key') ||
              error.message.includes('relation already exists') ||
              error.message.includes('constraint') && error.message.includes('already exists')) {
            // Silently skip - table/constraint already exists
            successCount++;
          } else {
            console.error(`\n   ⚠️  Statement ${i + 1} warning:`, error.message);
            errorCount++;
          }
        }
      }
    }

    console.log(`\n   ✅ ${dbName} migration completed: ${successCount} successful, ${errorCount} errors`);

    // Verify blueprint tables were created
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('ai_standard', 'ai_clause_blueprint', 'ai_crosswalk_blueprint')
      ORDER BY table_name
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log(`   📊 Blueprint tables found: ${tableCheck.rows.map(r => r.table_name).join(', ')}`);
    } else {
      console.log(`   ⚠️  Blueprint tables not found - check migration file`);
    }

    await pool.end();
    return true;

  } catch (error) {
    console.error(`\n   ❌ ${dbName} migration failed:`, error.message);
    await pool.end();
    return false;
  }
}

async function main() {
  console.log('🚀 Running EDCAT AI Migration Only\n');
  console.log('='.repeat(60));

  // Check environment variable
  if (!process.env.EDCAT_AI_DATABASE_URL) {
    console.error('❌ EDCAT_AI_DATABASE_URL not set');
    console.error('   Set it with: $env:EDCAT_AI_DATABASE_URL="postgresql://..."');
    process.exit(1);
  }

  // Run EDCAT AI migration only
  const edcatSuccess = await runMigration(
    process.env.EDCAT_AI_DATABASE_URL,
    'migrations/002_edcat_ai_intelligence.sql',
    'EDCAT AI Intelligence DB'
  );

  console.log('\n' + '='.repeat(60));
  
  if (edcatSuccess) {
    console.log('✅ EDCAT AI migration completed successfully!');
    console.log('📋 Next step: Run the seed script to load blueprints');
    process.exit(0);
  } else {
    console.log('❌ Migration failed. Check logs above.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

