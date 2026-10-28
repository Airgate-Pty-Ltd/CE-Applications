/**
 * Create All Tables Script
 * Directly creates all required tables - bypasses migrations
 * Run this if migrations aren't working
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function createAllTables() {
  console.log('\n🔨 Creating all database tables directly...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set!');
    console.error('   Set DATABASE_URL in Railway environment variables');
    console.error('⚠️  Continuing anyway - server will start but database features will be disabled\n');
    process.exit(0); // Exit successfully to allow server to start
  }

  console.log('📡 Connecting to database...');
  console.log(`   URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false,
  });

  const client = await pool.connect();

  try {
    // Test connection
    const testResult = await client.query('SELECT current_database(), current_user, version()');
    console.log('✓ Connected to database:');
    console.log(`   Database: ${testResult.rows[0].current_database}`);
    console.log(`   User: ${testResult.rows[0].current_user}`);
    console.log(`   PostgreSQL: ${testResult.rows[0].version.split('\n')[0]}\n`);

    // Create schemas
    console.log('📦 Creating schemas...');
    await client.query('CREATE SCHEMA IF NOT EXISTS compliance_lib');
    console.log('   ✓ compliance_lib (EDCAT Administrator knowledge base)');
    await client.query('CREATE SCHEMA IF NOT EXISTS customer_data');
    console.log('   ✓ customer_data (Client data)');
    
    // Also create tables in public schema for Railway UI visibility
    console.log('   ✓ Also creating tables in public schema for Railway UI\n');

    // Create compliance_lib tables (EDCAT Administrator knowledge base)
    console.log('📋 Creating compliance_lib tables (EDCAT Administrator knowledge base)...');
    
    // Create standard_files table for storing standards/regulatory/customer requirements files
    await client.query(`
      CREATE TABLE IF NOT EXISTS compliance_lib.standard_files (
        file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(20),
        file_path VARCHAR(512) NOT NULL,
        file_category VARCHAR(50) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        parsed_at TIMESTAMP,
        file_size BIGINT,
        metadata JSONB
      )
    `);
    console.log('   ✓ compliance_lib.standard_files');
    
    // Also create in public schema for Railway UI visibility
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.standard_files (
        file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(20),
        file_path VARCHAR(512) NOT NULL,
        file_category VARCHAR(50) NOT NULL,
        standard_id UUID REFERENCES public.standards(standard_id) ON DELETE CASCADE,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        parsed_at TIMESTAMP,
        file_size BIGINT,
        file_content BYTEA,
        metadata JSONB
      )
    `);
    console.log('   ✓ public.standard_files (for Railway UI visibility + file storage)');
    
    // Add standard_id column to compliance_lib.standard_files if it doesn't exist
    try {
      await client.query(`
        ALTER TABLE compliance_lib.standard_files 
        ADD COLUMN IF NOT EXISTS standard_id UUID REFERENCES compliance_lib.standards(standard_id) ON DELETE CASCADE
      `);
      console.log('   ✓ Added standard_id column to compliance_lib.standard_files');
    } catch (err) {
      console.log(`   ⚠️  Could not add standard_id column (may already exist): ${err.message}`);
    }
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS compliance_lib.standards (
        standard_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name TEXT NOT NULL,
        sector VARCHAR(50),
        uploaded_at TIMESTAMP DEFAULT NOW(),
        total_requirements INT DEFAULT 0,
        model_version_used VARCHAR(20) DEFAULT '1.0.0',
        created_by VARCHAR(255)
      )
    `);
    console.log('   ✓ compliance_lib.standards');

    await client.query(`
      CREATE TABLE IF NOT EXISTS compliance_lib.requirements (
        requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        standard_id UUID NOT NULL REFERENCES compliance_lib.standards(standard_id) ON DELETE CASCADE,
        clause_number VARCHAR(50),
        requirement_text TEXT NOT NULL,
        keyword VARCHAR(50),
        confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
        extracted_at TIMESTAMP DEFAULT NOW(),
        extraction_event VARCHAR(50)
      )
    `);
    console.log('   ✓ compliance_lib.requirements');

    await client.query(`
      CREATE TABLE IF NOT EXISTS compliance_lib.extraction_history (
        history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requirement_id UUID NOT NULL REFERENCES compliance_lib.requirements(requirement_id) ON DELETE CASCADE,
        extraction_event VARCHAR(50),
        confidence_before DECIMAL(3,2),
        confidence_after DECIMAL(3,2),
        improvement DECIMAL(3,2) GENERATED ALWAYS AS (confidence_after - confidence_before) STORED,
        model_version VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('   ✓ compliance_lib.extraction_history');

    await client.query(`
      CREATE TABLE IF NOT EXISTS compliance_lib.model_versions (
        version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        version VARCHAR(20) NOT NULL UNIQUE,
        baseline_accuracy DECIMAL(4,3),
        baseline_precision DECIMAL(4,3),
        baseline_recall DECIMAL(4,3),
        created_at TIMESTAMP DEFAULT NOW(),
        created_by VARCHAR(100),
        reason_for_update TEXT,
        total_learning_events INT DEFAULT 0,
        approved BOOLEAN DEFAULT FALSE
      )
    `);
    console.log('   ✓ compliance_lib.model_versions\n');

    // Create customer_data tables
    console.log('📋 Creating customer_data tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_data.documents (
        document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID,
        customer_name VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(20),
        file_path VARCHAR(512),
        uploaded_at TIMESTAMP DEFAULT NOW(),
        parsed_at TIMESTAMP,
        procedures_extracted INT DEFAULT 0
      )
    `);
    console.log('   ✓ customer_data.documents');

    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_data.procedures (
        procedure_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES customer_data.documents(document_id) ON DELETE CASCADE,
        procedure_text TEXT NOT NULL,
        extracted_text TEXT,
        confidence DECIMAL(3,2),
        extracted_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('   ✓ customer_data.procedures');

    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_data.requirement_mappings (
        mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requirement_id UUID NOT NULL,
        procedure_id UUID NOT NULL REFERENCES customer_data.procedures(procedure_id) ON DELETE CASCADE,
        match_confidence DECIMAL(3,2),
        is_covered BOOLEAN,
        coverage_type VARCHAR(50),
        analysis_id UUID,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('   ✓ customer_data.requirement_mappings');

    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_data.gap_analyses (
        analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL,
        customer_name VARCHAR(255),
        standard_id UUID NOT NULL,
        standard_code VARCHAR(50),
        analyzed_at TIMESTAMP DEFAULT NOW(),
        total_requirements INT,
        covered_requirements INT,
        gap_count INT,
        gap_percentage DECIMAL(5,2),
        model_version_used VARCHAR(20),
        feedback_rating INT CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
        feedback_accuracy DECIMAL(3,2),
        feedback_submitted_at TIMESTAMP
      )
    `);
    console.log('   ✓ customer_data.gap_analyses');

    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_data.analysis_clarifications (
        clarification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_id UUID NOT NULL REFERENCES customer_data.gap_analyses(analysis_id) ON DELETE CASCADE,
        requirement_id UUID NOT NULL,
        procedure_id UUID NOT NULL,
        clarification_question TEXT NOT NULL,
        ai_confidence_before DECIMAL(3,2),
        user_response VARCHAR(50),
        ai_confidence_after DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('   ✓ customer_data.analysis_clarifications');

    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_data.regulatory_websites (
        website_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        url VARCHAR(2048) NOT NULL,
        name VARCHAR(255),
        agency VARCHAR(255),
        added_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('   ✓ customer_data.regulatory_websites');

    // Create tables in PUBLIC schema for Railway UI visibility
    console.log('\n📋 Creating tables in PUBLIC schema (for Railway UI)...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.regulatory_websites (
        website_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        url VARCHAR(2048) NOT NULL,
        name VARCHAR(255),
        agency VARCHAR(255),
        added_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('   ✓ public.regulatory_websites');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.standards (
        standard_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name TEXT NOT NULL,
        sector VARCHAR(50),
        uploaded_at TIMESTAMP DEFAULT NOW(),
        total_requirements INT DEFAULT 0,
        model_version_used VARCHAR(20) DEFAULT '1.0.0',
        created_by VARCHAR(255)
      )
    `);
    console.log('   ✓ public.standards');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.documents (
        document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID,
        customer_name VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(20),
        file_path VARCHAR(512),
        uploaded_at TIMESTAMP DEFAULT NOW(),
        parsed_at TIMESTAMP,
        procedures_extracted INT DEFAULT 0
      )
    `);
    console.log('   ✓ public.documents');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.requirements (
        requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        standard_id UUID NOT NULL,
        clause_number VARCHAR(50),
        requirement_text TEXT NOT NULL,
        keyword VARCHAR(50),
        confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
        extracted_at TIMESTAMP DEFAULT NOW(),
        extraction_event VARCHAR(50)
      )
    `);
    console.log('   ✓ public.requirements');

    // Create customers table for customer management
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.customers (
        customer_id VARCHAR(255) PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        contact_email VARCHAR(255),
        schema_name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        status VARCHAR(50) DEFAULT 'active'
      )
    `);
    console.log('   ✓ public.customers');

    // Create learning tables in customer_data schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_data.gap_analysis_traces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        standard_code TEXT NOT NULL,
        clause_ref TEXT NOT NULL,
        requested_doc_ids UUID[] NOT NULL,
        engine_config JSONB NOT NULL,
        candidates JSONB NOT NULL,
        result JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('   ✓ customer_data.gap_analysis_traces');

    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_data.gap_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trace_id UUID NOT NULL REFERENCES customer_data.gap_analysis_traces(id) ON DELETE CASCADE,
        reviewer_id UUID,
        final_status TEXT NOT NULL CHECK (final_status IN ('covered','partially_covered','not_covered','insufficient_data')),
        notes TEXT,
        helpful_candidate_chunk_ids UUID[],
        unhelpful_chunk_ids UUID[],
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('   ✓ customer_data.gap_feedback');

    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_data.gap_tuning (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        standard_code TEXT NOT NULL,
        clause_ref TEXT NOT NULL,
        version INT NOT NULL DEFAULT 1,
        semantic_full REAL,
        semantic_partial REAL,
        lexicon_target INT,
        alpha REAL,
        beta REAL,
        gamma REAL,
        delta REAL,
        penalties JSONB,
        boosts JSONB,
        synonyms JSONB,
        stop_phrases JSONB,
        approved BOOLEAN DEFAULT FALSE,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        rationale JSONB
      )
    `);
    console.log('   ✓ customer_data.gap_tuning\n');

    // Create indices
    console.log('📇 Creating indices...');
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_standards_code ON compliance_lib.standards(code)',
      'CREATE INDEX IF NOT EXISTS idx_requirements_standard ON compliance_lib.requirements(standard_id)',
      'CREATE INDEX IF NOT EXISTS idx_requirements_clause ON compliance_lib.requirements(clause_number)',
      'CREATE INDEX IF NOT EXISTS idx_documents_customer ON customer_data.documents(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_documents_uploaded ON customer_data.documents(uploaded_at)',
      'CREATE INDEX IF NOT EXISTS idx_regulatory_websites_url ON customer_data.regulatory_websites(url)',
      'CREATE INDEX IF NOT EXISTS idx_gap_traces_tenant ON customer_data.gap_analysis_traces(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_gap_feedback_trace ON customer_data.gap_feedback(trace_id)',
      'CREATE INDEX IF NOT EXISTS idx_gap_tuning_key ON customer_data.gap_tuning(tenant_id, standard_code, clause_ref, approved)'
    ];

    for (const indexSql of indices) {
      try {
        await client.query(indexSql);
      } catch (err) {
        console.log(`   ⚠️  Index warning: ${err.message}`);
      }
    }
    console.log('   ✓ Indices created\n');

    // Verify tables exist
    console.log('🔍 Verifying tables...\n');
    const verifyResult = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema IN ('compliance_lib', 'customer_data', 'public')
      ORDER BY table_schema, table_name
    `);

    console.log('📊 All tables in database:');
    const tablesBySchema = {};
    verifyResult.rows.forEach(row => {
      if (!tablesBySchema[row.table_schema]) {
        tablesBySchema[row.table_schema] = [];
      }
      tablesBySchema[row.table_schema].push(row.table_name);
    });

    for (const [schema, tables] of Object.entries(tablesBySchema)) {
      console.log(`\n   Schema: ${schema}`);
      tables.forEach(table => {
        console.log(`     ✓ ${table}`);
      });
    }

    console.log(`\n✅ Success! Created/verified ${verifyResult.rows.length} table(s) total\n`);

  } catch (error) {
    console.error('\n❌ Error creating tables:', error);
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   Detail:', error.detail);
    console.error('\n   Stack:', error.stack);
    // Don't exit with error - allow server to start anyway
    console.error('⚠️  Continuing with server startup despite table creation errors...\n');
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
  
  // Always exit successfully to allow server to start
  process.exit(0);
}

createAllTables();

