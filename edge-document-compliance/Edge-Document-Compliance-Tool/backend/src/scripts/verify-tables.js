/**
 * Verify Tables Script
 * Checks if all required tables exist and creates them if missing
 */

import { query } from '../database/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function verifyTables() {
  console.log('\n🔍 Verifying database tables...\n');

  try {
    // Test connection
    await query('SELECT NOW()');
    console.log('✓ Database connection successful\n');

    // Check if schemas exist
    const schemasResult = await query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name IN ('compliance_lib', 'customer_data')
    `);

    const existingSchemas = schemasResult.rows.map(r => r.schema_name);
    console.log(`Found schemas: ${existingSchemas.join(', ') || 'none'}\n`);

    // Create schemas if missing
    if (!existingSchemas.includes('compliance_lib')) {
      console.log('Creating compliance_lib schema...');
      await query('CREATE SCHEMA IF NOT EXISTS compliance_lib');
      console.log('✓ compliance_lib schema created\n');
    }

    if (!existingSchemas.includes('customer_data')) {
      console.log('Creating customer_data schema...');
      await query('CREATE SCHEMA IF NOT EXISTS customer_data');
      console.log('✓ customer_data schema created\n');
    }

    // Check existing tables
    const tablesResult = await query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema IN ('compliance_lib', 'customer_data')
      ORDER BY table_schema, table_name
    `);

    console.log(`Found ${tablesResult.rows.length} existing tables:`);
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_schema}.${row.table_name}`);
    });
    console.log('');

    // Expected tables
    const expectedTables = {
      'compliance_lib': ['standards', 'requirements', 'extraction_history', 'model_versions'],
      'customer_data': ['documents', 'procedures', 'requirement_mappings', 'gap_analyses', 'analysis_clarifications', 'regulatory_websites', 'gap_analysis_traces', 'gap_feedback', 'gap_tuning']
    };

    const existingTables = {};
    tablesResult.rows.forEach(row => {
      if (!existingTables[row.table_schema]) {
        existingTables[row.table_schema] = [];
      }
      existingTables[row.table_schema].push(row.table_name);
    });

    // Create missing tables
    let createdCount = 0;

    // compliance_lib.standards
    if (!existingTables['compliance_lib']?.includes('standards')) {
      console.log('Creating compliance_lib.standards...');
      await query(`
        CREATE TABLE compliance_lib.standards (
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
      createdCount++;
      console.log('✓ Created compliance_lib.standards\n');
    }

    // compliance_lib.requirements
    if (!existingTables['compliance_lib']?.includes('requirements')) {
      console.log('Creating compliance_lib.requirements...');
      await query(`
        CREATE TABLE compliance_lib.requirements (
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
      createdCount++;
      console.log('✓ Created compliance_lib.requirements\n');
    }

    // customer_data.documents
    if (!existingTables['customer_data']?.includes('documents')) {
      console.log('Creating customer_data.documents...');
      await query(`
        CREATE TABLE customer_data.documents (
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
      createdCount++;
      console.log('✓ Created customer_data.documents\n');
    }

    // customer_data.regulatory_websites
    if (!existingTables['customer_data']?.includes('regulatory_websites')) {
      console.log('Creating customer_data.regulatory_websites...');
      await query(`
        CREATE TABLE customer_data.regulatory_websites (
          website_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          url VARCHAR(2048) NOT NULL,
          name VARCHAR(255),
          agency VARCHAR(255),
          added_at TIMESTAMP DEFAULT NOW()
        )
      `);
      createdCount++;
      console.log('✓ Created customer_data.regulatory_websites\n');
    }

    // Create remaining tables
    const remainingTables = {
      'compliance_lib': {
        'extraction_history': `
          CREATE TABLE compliance_lib.extraction_history (
            history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            requirement_id UUID NOT NULL REFERENCES compliance_lib.requirements(requirement_id) ON DELETE CASCADE,
            extraction_event VARCHAR(50),
            confidence_before DECIMAL(3,2),
            confidence_after DECIMAL(3,2),
            improvement DECIMAL(3,2) GENERATED ALWAYS AS (confidence_after - confidence_before) STORED,
            model_version VARCHAR(20),
            created_at TIMESTAMP DEFAULT NOW()
          )
        `,
        'model_versions': `
          CREATE TABLE compliance_lib.model_versions (
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
        `
      },
      'customer_data': {
        'procedures': `
          CREATE TABLE customer_data.procedures (
            procedure_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id UUID NOT NULL REFERENCES customer_data.documents(document_id) ON DELETE CASCADE,
            procedure_text TEXT NOT NULL,
            extracted_text TEXT,
            confidence DECIMAL(3,2),
            extracted_at TIMESTAMP DEFAULT NOW()
          )
        `,
        'requirement_mappings': `
          CREATE TABLE customer_data.requirement_mappings (
            mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            requirement_id UUID NOT NULL,
            procedure_id UUID NOT NULL REFERENCES customer_data.procedures(procedure_id) ON DELETE CASCADE,
            match_confidence DECIMAL(3,2),
            is_covered BOOLEAN,
            coverage_type VARCHAR(50),
            analysis_id UUID,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `,
        'gap_analyses': `
          CREATE TABLE customer_data.gap_analyses (
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
        `,
        'analysis_clarifications': `
          CREATE TABLE customer_data.analysis_clarifications (
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
        `,
        'gap_analysis_traces': `
          CREATE TABLE customer_data.gap_analysis_traces (
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
        `,
        'gap_feedback': `
          CREATE TABLE customer_data.gap_feedback (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            trace_id UUID NOT NULL REFERENCES customer_data.gap_analysis_traces(id) ON DELETE CASCADE,
            reviewer_id UUID,
            final_status TEXT NOT NULL CHECK (final_status IN ('covered','partially_covered','not_covered','insufficient_data')),
            notes TEXT,
            helpful_candidate_chunk_ids UUID[],
            unhelpful_chunk_ids UUID[],
            created_at TIMESTAMPTZ DEFAULT NOW()
          )
        `,
        'gap_tuning': `
          CREATE TABLE customer_data.gap_tuning (
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
        `
      }
    };

    for (const [schema, tables] of Object.entries(remainingTables)) {
      for (const [tableName, createSql] of Object.entries(tables)) {
        if (!existingTables[schema]?.includes(tableName)) {
          console.log(`Creating ${schema}.${tableName}...`);
          try {
            await query(createSql);
            createdCount++;
            console.log(`✓ Created ${schema}.${tableName}\n`);
          } catch (err) {
            console.error(`❌ Error creating ${schema}.${tableName}:`, err.message);
          }
        }
      }
    }

    // Create indices
    console.log('Creating indices...');
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_standards_code ON compliance_lib.standards(code)',
      'CREATE INDEX IF NOT EXISTS idx_requirements_standard ON compliance_lib.requirements(standard_id)',
      'CREATE INDEX IF NOT EXISTS idx_requirements_clause ON compliance_lib.requirements(clause_number)',
      'CREATE INDEX IF NOT EXISTS idx_documents_customer ON customer_data.documents(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_documents_uploaded ON customer_data.documents(uploaded_at)',
      'CREATE INDEX IF NOT EXISTS idx_regulatory_websites_url ON customer_data.regulatory_websites(url)'
    ];

    for (const indexSql of indices) {
      try {
        await query(indexSql);
      } catch (err) {
        console.log(`⚠️  Index warning: ${err.message}`);
      }
    }
    console.log('✓ Indices created\n');

    // Final verification
    const finalCheck = await query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema IN ('compliance_lib', 'customer_data')
      ORDER BY table_schema, table_name
    `);

    console.log(`\n✅ Verification complete!`);
    console.log(`   Created ${createdCount} new table(s)`);
    console.log(`   Total tables: ${finalCheck.rows.length}\n`);

    console.log('All tables:');
    finalCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.table_schema}.${row.table_name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

verifyTables();

