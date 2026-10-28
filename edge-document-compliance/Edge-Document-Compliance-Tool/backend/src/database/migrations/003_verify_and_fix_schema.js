/**
 * Migration: 003_verify_and_fix_schema
 * Verifies and creates all required schemas and tables
 * This migration ensures everything exists even if previous migrations had issues
 */

export const up = async (client) => {
  console.log('🔄 Verifying and creating schemas...');

  // Create schemas first (must be done outside transaction)
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS compliance_lib');
    console.log('✓ Schema compliance_lib exists');
  } catch (err) {
    console.error('Error creating compliance_lib schema:', err.message);
    throw err;
  }

  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS customer_data');
    console.log('✓ Schema customer_data exists');
  } catch (err) {
    console.error('Error creating customer_data schema:', err.message);
    throw err;
  }

  // Create compliance_lib tables
  console.log('🔄 Creating compliance_lib tables...');

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
  console.log('✓ Table compliance_lib.standards created');

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
  console.log('✓ Table compliance_lib.requirements created');

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
  console.log('✓ Table compliance_lib.extraction_history created');

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
  console.log('✓ Table compliance_lib.model_versions created');

  // Create customer_data tables
  console.log('🔄 Creating customer_data tables...');

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
  console.log('✓ Table customer_data.documents created');

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
  console.log('✓ Table customer_data.procedures created');

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
  console.log('✓ Table customer_data.requirement_mappings created');

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
  console.log('✓ Table customer_data.gap_analyses created');

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
  console.log('✓ Table customer_data.analysis_clarifications created');

  await client.query(`
    CREATE TABLE IF NOT EXISTS customer_data.regulatory_websites (
      regulatory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      url VARCHAR(512) NOT NULL UNIQUE,
      name VARCHAR(255),
      description TEXT,
      agency VARCHAR(100),
      added_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✓ Table customer_data.regulatory_websites created');

  // Create indices
  console.log('🔄 Creating indices...');

  const indices = [
    'CREATE INDEX IF NOT EXISTS idx_standards_code ON compliance_lib.standards(code)',
    'CREATE INDEX IF NOT EXISTS idx_requirements_standard ON compliance_lib.requirements(standard_id)',
    'CREATE INDEX IF NOT EXISTS idx_requirements_clause ON compliance_lib.requirements(clause_number)',
    'CREATE INDEX IF NOT EXISTS idx_extraction_history_req ON compliance_lib.extraction_history(requirement_id)',
    'CREATE INDEX IF NOT EXISTS idx_extraction_history_date ON compliance_lib.extraction_history(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_model_versions_version ON compliance_lib.model_versions(version)',
    'CREATE INDEX IF NOT EXISTS idx_documents_customer ON customer_data.documents(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_documents_uploaded ON customer_data.documents(uploaded_at)',
    'CREATE INDEX IF NOT EXISTS idx_procedures_document ON customer_data.procedures(document_id)',
    'CREATE INDEX IF NOT EXISTS idx_requirement_mappings_req ON customer_data.requirement_mappings(requirement_id)',
    'CREATE INDEX IF NOT EXISTS idx_requirement_mappings_proc ON customer_data.requirement_mappings(procedure_id)',
    'CREATE INDEX IF NOT EXISTS idx_requirement_mappings_analysis ON customer_data.requirement_mappings(analysis_id)',
    'CREATE INDEX IF NOT EXISTS idx_gap_analyses_customer ON customer_data.gap_analyses(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_gap_analyses_standard ON customer_data.gap_analyses(standard_id)',
    'CREATE INDEX IF NOT EXISTS idx_gap_analyses_date ON customer_data.gap_analyses(analyzed_at)',
    'CREATE INDEX IF NOT EXISTS idx_clarifications_analysis ON customer_data.analysis_clarifications(analysis_id)',
    'CREATE INDEX IF NOT EXISTS idx_clarifications_requirement ON customer_data.analysis_clarifications(requirement_id)',
    'CREATE INDEX IF NOT EXISTS idx_regulatory_websites_url ON customer_data.regulatory_websites(url)',
    'CREATE INDEX IF NOT EXISTS idx_regulatory_websites_agency ON customer_data.regulatory_websites(agency)'
  ];

  for (const indexSql of indices) {
    try {
      await client.query(indexSql);
    } catch (err) {
      console.log(`⚠️  Index warning: ${err.message}`);
    }
  }

  console.log('✅ Migration 003_verify_and_fix_schema completed - all tables verified/created');
};

export const down = async (client) => {
  await client.query('DROP SCHEMA IF EXISTS customer_data CASCADE');
  await client.query('DROP SCHEMA IF EXISTS compliance_lib CASCADE');
  console.log('✅ Migration 003_verify_and_fix_schema rolled back');
};

