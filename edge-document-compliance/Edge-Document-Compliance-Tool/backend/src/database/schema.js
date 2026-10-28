/**
 * Database Schema Initialization
 * Reads database/schema.sql and executes it on startup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to schema.sql from project root
const SCHEMA_FILE_PATH = path.join(__dirname, '../../../database/schema.sql');

// Expected tables to verify
const EXPECTED_TABLES = [
  'standards',  // Changed from compliance_standards
  'standard_files',  // Added
  'compliance_requirements',
  'extraction_history',
  'model_versions',
  'customer_documents',
  'customer_procedures',
  'requirement_mappings',
  'gap_analyses',
  'analysis_clarifications',
  'regulatory_websites',
  'authorized_users',
  'user_permissions'
];

/**
 * Read schema file
 */
function readSchemaFile() {
  if (!fs.existsSync(SCHEMA_FILE_PATH)) {
    throw new Error(`Schema file not found at: ${SCHEMA_FILE_PATH}`);
  }
  
  const schemaContent = fs.readFileSync(SCHEMA_FILE_PATH, 'utf8');
  return schemaContent;
}

/**
 * Split SQL into statements
 * Handles dollar-quoted strings ($$) and DO blocks
 */
function splitSQLStatements(sql) {
  const statements = [];
  let currentStatement = '';
  let inMultiLineComment = false;
  let inDollarQuote = false;
  let dollarTag = '';
  
  // Split by lines but preserve structure
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
    
    // Handle dollar-quoted strings ($$ ... $$)
    if (!inDollarQuote) {
      const dollarMatch = line.match(/\$\$([^\$]*)\$\$/);
      if (dollarMatch) {
        // Single-line dollar quote
        currentStatement += line + '\n';
        continue;
      }
      
      // Check for start of dollar quote block
      // Match: DO $$, DO $$tag, $$, $$tag
      const dollarStart = line.match(/\$\$([a-zA-Z_]*)?\s*$/);
      if (dollarStart) {
        inDollarQuote = true;
        // Use the matched tag or empty string for $$ (no tag)
        dollarTag = dollarStart[0].trim(); // e.g., "$$" or "$$tag"
        currentStatement += line + '\n';
        continue;
      }
    } else {
      // Inside dollar quote block
      currentStatement += line + '\n';
      
      // Check for end of dollar quote
      // For "$$" (no tag), match "$$" at end of line
      // For "$$tag", match "$$tag" at end of line
      let endMatch = false;
      if (dollarTag === '$$') {
        // Match "$$" followed by optional semicolon and whitespace at end of line
        endMatch = /^\s*END\s+\$\$\s*;?\s*$/i.test(line.trim()) || /^\s*\$\$\s*;?\s*$/i.test(line.trim());
      } else {
        // Match the exact tag (e.g., "$$tag")
        const tagPart = dollarTag.replace('$$', '');
        endMatch = new RegExp(`\\$\\$${tagPart}\\s*;?\\s*$`, 'i').test(line.trim());
      }
      
      if (endMatch) {
        inDollarQuote = false;
        dollarTag = '';
        // If this line ends the DO block, it should end with semicolon
        if (line.trim().endsWith(';')) {
          const statement = currentStatement.trim();
          if (statement && !statement.startsWith('--')) {
            statements.push(statement);
          }
          currentStatement = '';
        }
      }
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

/**
 * Extract table name from CREATE TABLE statement
 */
function extractTableName(statement) {
  const createTableMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/i);
  if (createTableMatch) {
    return createTableMatch[1];
  }
  return null;
}

async function tableExists(tableName) {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = $1
     ) AS exists`,
    [tableName]
  );
  return result.rows[0]?.exists || false;
}

async function ensureCompatibilityTables() {
  // Ensure gap_analyses has status column for legacy databases
  await query(
    `ALTER TABLE IF EXISTS public.gap_analyses
       ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed'`
  ).catch(() => {});
  await query(
    `UPDATE public.gap_analyses
       SET status = COALESCE(status, 'completed')
     WHERE status IS NULL`
  ).catch(() => {});

  const standardsExists = await tableExists('standards');
  const complianceExists = await tableExists('compliance_standards');

  // Ensure standards table exists with all required columns
  // CRITICAL: This must include authority_source or processing will fail
  await query(`
    CREATE TABLE IF NOT EXISTS public.standards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      authority_source VARCHAR(100),
      sector VARCHAR(100),
      version VARCHAR(50),
      description TEXT,
      file_path VARCHAR(1000),
      file_name VARCHAR(255),
      file_size BIGINT,
      file_type VARCHAR(100),
      file_category VARCHAR(50) DEFAULT 'standard',
      file_content TEXT,
      metadata JSONB,
      uploaded_at TIMESTAMP DEFAULT NOW(),
      parsed_at TIMESTAMP,
      total_requirements INT DEFAULT 0,
      total_clauses INT DEFAULT 0,
      model_version_used VARCHAR(20) DEFAULT '1.0.0',
      is_active BOOLEAN DEFAULT TRUE,
      created_by VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  // CRITICAL: Ensure authority_source and all file-related columns exist
  // This handles cases where the table was created by legacy schema without these columns
  await query(`
    ALTER TABLE public.standards 
    ADD COLUMN IF NOT EXISTS authority_source VARCHAR(100),
    ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS file_size BIGINT,
    ADD COLUMN IF NOT EXISTS file_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS file_content TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB,
    ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS total_clauses INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE
  `).catch(() => {});

  // Rebuild standards table if only compliance_standards exists
  if (!standardsExists && complianceExists) {
    console.log('[schema] ⚠️  standards table missing, rebuilding from compliance_standards');

    await query(`
      INSERT INTO public.standards (
        id, code, name, sector, version, description,
        file_path, file_category, uploaded_at, total_requirements,
        model_version_used, created_by, created_at, updated_at
      )
      SELECT
        standard_id,
        code,
        name,
        sector,
        version,
        description,
        file_path,
        COALESCE(file_category, 'standard'),
        uploaded_at,
        COALESCE(total_requirements, 0),
        COALESCE(model_version_used, '1.0.0'),
        created_by,
        COALESCE(created_at, NOW()),
        COALESCE(updated_at, NOW())
      FROM public.compliance_standards
      ON CONFLICT (code) DO NOTHING
    `).catch(() => {});
  }

  const fkTarget = (await tableExists('standards'))
    ? 'public.standards(id)'
    : (await tableExists('compliance_standards'))
      ? 'public.compliance_standards(standard_id)'
      : null;

  if (fkTarget) {
    await query(
      `ALTER TABLE IF EXISTS public.standard_files
         DROP CONSTRAINT IF EXISTS standard_files_standard_id_fkey`
    ).catch(() => {});

    await query(
      `ALTER TABLE IF EXISTS public.standard_files
         ADD CONSTRAINT standard_files_standard_id_fkey
         FOREIGN KEY (standard_id)
         REFERENCES ${fkTarget}
         ON DELETE CASCADE`
    ).catch(() => {});
  }
}

/**
 * Initialize database schema
 */
export async function initializeSchema() {
  try {
    console.log('[schema] 📖 Reading schema file...');
    const schemaContent = readSchemaFile();
    
    console.log('[schema] 📋 Parsing SQL statements...');
    const statements = splitSQLStatements(schemaContent);
    console.log(`[schema] Found ${statements.length} SQL statements`);
    
    // Check if we have database connection
    if (!process.env.DATABASE_URL) {
      console.log('[schema] ⚠️  DATABASE_URL not set - skipping schema initialization');
      return;
    }
    
    // Test connection
    try {
      await query('SELECT NOW()');
    } catch (err) {
      console.log('[schema] ⚠️  Database not available - skipping schema initialization');
      return;
    }
    
    // Only drop tables if FORCE_RESET_SCHEMA environment variable is set
    // This prevents data loss on normal deployments
    const forceReset = process.env.FORCE_RESET_SCHEMA === '1' || process.env.FORCE_RESET_SCHEMA === 'true';
    
    if (forceReset) {
      console.log('[schema] 🗑️  Dropping existing tables (CASCADE) - FORCE_RESET_SCHEMA is enabled...');
      
      // Drop all tables in reverse dependency order
      const dropStatements = [
        'DROP TABLE IF EXISTS analysis_clarifications CASCADE',
        'DROP TABLE IF EXISTS requirement_mappings CASCADE',
        'DROP TABLE IF EXISTS gap_analyses CASCADE',
        'DROP TABLE IF EXISTS customer_procedures CASCADE',
        'DROP TABLE IF EXISTS customer_documents CASCADE',
        'DROP TABLE IF EXISTS regulatory_websites CASCADE',
        'DROP TABLE IF EXISTS extraction_history CASCADE',
        'DROP TABLE IF EXISTS compliance_requirements CASCADE',
        'DROP TABLE IF EXISTS standard_files CASCADE',
        'DROP TABLE IF EXISTS standards CASCADE',  // Changed from compliance_standards
        'DROP TABLE IF EXISTS model_versions CASCADE',
        'DROP TABLE IF EXISTS user_permissions CASCADE',
        'DROP TABLE IF EXISTS authorized_users CASCADE',
        // Also drop old compliance_standards if it exists (for migration)
        'DROP TABLE IF EXISTS compliance_standards CASCADE'
      ];
      
      for (const dropStmt of dropStatements) {
        try {
          await query(dropStmt);
        } catch (err) {
          // Ignore errors - tables might not exist
        }
      }
      
      console.log('[schema] ✅ Tables dropped');
    } else {
      console.log('[schema] ℹ️  Skipping table drop (FORCE_RESET_SCHEMA not set) - preserving existing data');
    }
    
    console.log('[schema] 🔨 Creating tables from schema.sql...');
    
    const createdTables = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const tableName = extractTableName(statement);
      
      try {
        await query(statement);
        
        if (tableName) {
          createdTables.push(tableName);
          console.log(`[schema] ✅ Table created: ${tableName}`);
        }
      } catch (error) {
        // Check if error is about table already existing (safe to ignore)
        const isTableExistsError = error.message.includes('already exists') || 
                                   error.message.includes('duplicate key') ||
                                   (error.code === '42P07'); // PostgreSQL code for "relation already exists"
        
        // Check if error is about missing referenced column/table (critical - table creation failed)
        const isForeignKeyError = error.message.includes('does not exist') && 
                                  (error.message.includes('column') || error.message.includes('relation'));
        
        if (isTableExistsError && !isForeignKeyError) {
          if (tableName) {
            console.log(`[schema] ⚠️  Table already exists: ${tableName} (skipping)`);
          }
        } else if (isForeignKeyError && tableName) {
          // Foreign key error means table creation failed - don't mark as "already exists"
          console.error(`[schema] ❌ Failed to create table ${tableName}: ${error.message}`);
          console.error(`[schema]    This usually means a referenced table/column is missing. Check migration order.`);
        } else {
          console.error(`[schema] ❌ Error executing statement ${i + 1}:`, error.message);
          if (tableName) {
            console.error(`[schema]    Table: ${tableName}`);
          }
        }
        // Continue with other statements even on error
      }
    }
    
    console.log(`[schema] ✅ Created ${createdTables.length} tables`);

    // Apply compatibility adjustments for legacy databases
    await ensureCompatibilityTables();
    
    // Verify all 10 tables exist
    console.log('[schema] 🔍 Verifying tables...');
    const tableList = EXPECTED_TABLES.map((_, i) => `$${i + 1}`).join(', ');
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name IN (${tableList})
      ORDER BY table_name
    `, EXPECTED_TABLES);
    
    const foundTables = result.rows.map(row => row.table_name);
    const missingTables = EXPECTED_TABLES.filter(t => !foundTables.includes(t));
    
    if (missingTables.length === 0) {
      console.log('[schema] ✅ All 10 required tables present!');
      console.log('[schema] Tables:', foundTables.join(', '));
    } else {
      console.log(`[schema] ⚠️  Missing tables: ${missingTables.join(', ')}`);
    }
    
  } catch (error) {
    console.error('[schema] ❌ Schema initialization failed:', error.message);
    console.error('[schema] Stack:', error.stack);
    // Don't throw - allow server to start even if schema init fails
  }
}

