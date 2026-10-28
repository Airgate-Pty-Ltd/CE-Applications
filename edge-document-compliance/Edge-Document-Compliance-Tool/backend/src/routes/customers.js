/**
 * Customer Management Routes
 * Create and manage customer-specific database schemas and tables
 */

import express from 'express';
import { query } from '../database/connection.js';

const router = express.Router();

/**
 * POST /api/customers
 * Create a new customer and their dedicated database schema
 */
router.post('/', async (req, res) => {
  try {
    const { customerId, customerName, contactEmail, companyName, revision, version } = req.body;

    if (!customerId || !customerName) {
      return res.status(400).json({
        success: false,
        error: 'customerId and customerName are required'
      });
    }

    // Validate customerId format (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(customerId)) {
      return res.status(400).json({
        success: false,
        error: 'customerId must contain only letters, numbers, and underscores'
      });
    }

    // Use revision or version as identifier (revision takes precedence)
    const identifier = revision || version || 'v1';
    // Validate identifier format
    if (!/^[a-zA-Z0-9_.-]+$/.test(identifier)) {
      return res.status(400).json({
        success: false,
        error: 'revision/version must contain only letters, numbers, underscores, dots, and hyphens'
      });
    }

    // Create schema name with customerId and revision/version identifier
    const schemaName = `customer_${customerId}_${identifier.replace(/[^a-zA-Z0-9_]/g, '_')}`;

    // Check if customer with this revision already exists
    const existingCheck = await query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
      [schemaName]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Customer with this revision/version already exists',
        customerId,
        revision: identifier,
        schemaName
      });
    }

    // Create customer-specific schema
    await query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

    // Create customer-specific tables
    await createCustomerTables(schemaName);

    // Store customer metadata in public schema (for lookup)
    await query(`
      CREATE TABLE IF NOT EXISTS public.customers (
        customer_id VARCHAR(255) NOT NULL,
        revision VARCHAR(100) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        contact_email VARCHAR(255),
        schema_name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        status VARCHAR(50) DEFAULT 'active',
        PRIMARY KEY (customer_id, revision)
      )
    `);

    await query(
      `INSERT INTO public.customers (customer_id, revision, customer_name, company_name, contact_email, schema_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (customer_id, revision) DO UPDATE
       SET customer_name = EXCLUDED.customer_name,
           company_name = EXCLUDED.company_name,
           contact_email = EXCLUDED.contact_email,
           status = 'active'`,
      [customerId, identifier, customerName, companyName || null, contactEmail || null, schemaName]
    );

    console.log(`✅ Created customer schema: ${schemaName} (revision: ${identifier})`);

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer: {
        id: customerId,
        revision: identifier,
        name: customerName,
        companyName: companyName || null,
        contactEmail: contactEmail || null,
        schemaName
      }
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/customers
 * List all customers
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT customer_id, revision, customer_name, company_name, contact_email, schema_name, created_at, status
      FROM public.customers
      ORDER BY customer_id, revision DESC, created_at DESC
    `);

    res.json({
      success: true,
      customers: result.rows.map(row => ({
        id: row.customer_id,
        revision: row.revision,
        name: row.customer_name,
        companyName: row.company_name,
        contactEmail: row.contact_email,
        schemaName: row.schema_name,
        createdAt: row.created_at,
        status: row.status
      }))
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/customers/:customerId
 * Get customer details
 */
router.get('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { revision } = req.query; // Optional: get specific revision

    let result;
    if (revision) {
      // Get specific revision
      result = await query(
        `SELECT customer_id, revision, customer_name, company_name, contact_email, schema_name, created_at, status
         FROM public.customers
         WHERE customer_id = $1 AND revision = $2`,
        [customerId, revision]
      );
    } else {
      // Get all revisions for this customer
      result = await query(
        `SELECT customer_id, revision, customer_name, company_name, contact_email, schema_name, created_at, status
         FROM public.customers
         WHERE customer_id = $1
         ORDER BY revision DESC`,
        [customerId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // If revision specified, return single customer; otherwise return all revisions
    if (revision) {
      const row = result.rows[0];
      res.json({
        success: true,
        customer: {
          id: row.customer_id,
          revision: row.revision,
          name: row.customer_name,
          companyName: row.company_name,
          contactEmail: row.contact_email,
          schemaName: row.schema_name,
          createdAt: row.created_at,
          status: row.status
        }
      });
    } else {
      res.json({
        success: true,
        customer: {
          id: customerId,
          revisions: result.rows.map(row => ({
            revision: row.revision,
            name: row.customer_name,
            companyName: row.company_name,
            contactEmail: row.contact_email,
            schemaName: row.schema_name,
            createdAt: row.created_at,
            status: row.status
          }))
        }
      });
    }
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/customers/:customerId
 * Delete a customer (soft delete - sets status to 'deleted')
 */
router.delete('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    await query(
      `UPDATE public.customers SET status = 'deleted' WHERE customer_id = $1`,
      [customerId]
    );

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Create all customer-specific tables in a schema
 */
async function createCustomerTables(schemaName) {
  const tables = [
    // Customer documents table (customer's own documents)
    `CREATE TABLE IF NOT EXISTS ${schemaName}.documents (
      document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      file_name VARCHAR(255) NOT NULL,
      file_type VARCHAR(20),
      file_path VARCHAR(512),
      uploaded_at TIMESTAMP DEFAULT NOW(),
      parsed_at TIMESTAMP,
      procedures_extracted INT DEFAULT 0,
      metadata JSONB
    )`,

    // Customer procedures extracted from documents
    `CREATE TABLE IF NOT EXISTS ${schemaName}.procedures (
      procedure_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id UUID NOT NULL REFERENCES ${schemaName}.documents(document_id) ON DELETE CASCADE,
      procedure_text TEXT NOT NULL,
      extracted_text TEXT,
      confidence DECIMAL(3,2),
      extracted_at TIMESTAMP DEFAULT NOW()
    )`,

    // Gap analysis results (comparison of customer docs vs compliance library)
    `CREATE TABLE IF NOT EXISTS ${schemaName}.gap_analyses (
      analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      standard_id UUID NOT NULL REFERENCES public.compliance_standards(standard_id) ON DELETE CASCADE,
      document_id UUID REFERENCES ${schemaName}.documents(document_id) ON DELETE SET NULL,
      analyzed_at TIMESTAMP DEFAULT NOW(),
      total_requirements INT,
      covered_requirements INT,
      gap_count INT,
      gap_percentage DECIMAL(5,2),
      model_version_used VARCHAR(20),
      feedback_rating INT CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
      feedback_accuracy DECIMAL(3,2),
      feedback_submitted_at TIMESTAMP
    )`,

    // Requirement mappings (which customer procedures cover which compliance requirements)
    `CREATE TABLE IF NOT EXISTS ${schemaName}.requirement_mappings (
      mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      requirement_id UUID NOT NULL REFERENCES public.compliance_requirements(requirement_id) ON DELETE CASCADE,
      procedure_id UUID NOT NULL REFERENCES ${schemaName}.procedures(procedure_id) ON DELETE CASCADE,
      analysis_id UUID REFERENCES ${schemaName}.gap_analyses(analysis_id) ON DELETE CASCADE,
      match_confidence DECIMAL(3,2),
      is_covered BOOLEAN,
      coverage_type VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // Analysis clarifications (AI questions and user responses)
    `CREATE TABLE IF NOT EXISTS ${schemaName}.analysis_clarifications (
      clarification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      analysis_id UUID NOT NULL REFERENCES ${schemaName}.gap_analyses(analysis_id) ON DELETE CASCADE,
      requirement_id UUID NOT NULL REFERENCES public.compliance_requirements(requirement_id) ON DELETE CASCADE,
      procedure_id UUID REFERENCES ${schemaName}.procedures(procedure_id) ON DELETE SET NULL,
      clarification_question TEXT NOT NULL,
      ai_confidence_before DECIMAL(3,2),
      user_response VARCHAR(50),
      ai_confidence_after DECIMAL(3,2),
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    // AI Learning Tables - where the AI "lives" and stores its learning
    `CREATE TABLE IF NOT EXISTS ${schemaName}.ai_learning_traces (
      trace_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      standard_code TEXT NOT NULL,
      clause_ref TEXT NOT NULL,
      requested_doc_ids UUID[] NOT NULL,
      engine_config JSONB NOT NULL,
      candidates JSONB NOT NULL,
      result JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS ${schemaName}.ai_learning_feedback (
      feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trace_id UUID NOT NULL REFERENCES ${schemaName}.ai_learning_traces(trace_id) ON DELETE CASCADE,
      helpful_candidate_chunk_ids UUID[],
      unhelpful_chunk_ids UUID[],
      final_status VARCHAR(50),
      reviewer_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS ${schemaName}.ai_learning_tuning (
      tuning_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      standard_code TEXT NOT NULL,
      clause_ref TEXT NOT NULL,
      version INT NOT NULL,
      semantic_full DECIMAL(3,2),
      semantic_partial DECIMAL(3,2),
      keyword_boosts JSONB,
      keyword_penalties JSONB,
      stop_phrases JSONB,
      approved BOOLEAN DEFAULT FALSE,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      rationale JSONB
    )`,

    // Create indices for performance
    `CREATE INDEX IF NOT EXISTS idx_${schemaName}_documents_uploaded ON ${schemaName}.documents(uploaded_at)`,
    `CREATE INDEX IF NOT EXISTS idx_${schemaName}_procedures_document ON ${schemaName}.procedures(document_id)`,
    `CREATE INDEX IF NOT EXISTS idx_${schemaName}_gap_analyses_standard ON ${schemaName}.gap_analyses(standard_id)`,
    `CREATE INDEX IF NOT EXISTS idx_${schemaName}_gap_analyses_date ON ${schemaName}.gap_analyses(analyzed_at)`,
    `CREATE INDEX IF NOT EXISTS idx_${schemaName}_requirement_mappings_req ON ${schemaName}.requirement_mappings(requirement_id)`,
    `CREATE INDEX IF NOT EXISTS idx_${schemaName}_requirement_mappings_proc ON ${schemaName}.requirement_mappings(procedure_id)`,
    `CREATE INDEX IF NOT EXISTS idx_${schemaName}_requirement_mappings_analysis ON ${schemaName}.requirement_mappings(analysis_id)`,
    `CREATE INDEX IF NOT EXISTS idx_${schemaName}_clarifications_analysis ON ${schemaName}.analysis_clarifications(analysis_id)`,
    `CREATE INDEX IF NOT EXISTS idx_${schemaName}_ai_traces_standard ON ${schemaName}.ai_learning_traces(standard_code, clause_ref)`,
    `CREATE INDEX IF NOT EXISTS idx_${schemaName}_ai_feedback_trace ON ${schemaName}.ai_learning_feedback(trace_id)`,
    `CREATE INDEX IF NOT EXISTS idx_${schemaName}_ai_tuning_key ON ${schemaName}.ai_learning_tuning(standard_code, clause_ref, approved)`
  ];

  for (const tableSql of tables) {
    try {
      await query(tableSql);
    } catch (err) {
      console.error(`Error creating table in ${schemaName}:`, err.message);
      throw err;
    }
  }

  // Run learning system migrations
  await runLearningMigrations(schemaName);

  // Run AI intelligence memory migration
  await runAIMemoryMigration();

  console.log(`✅ Created all tables in schema: ${schemaName}`);
}

/**
 * Run AI intelligence memory migration
 */
async function runAIMemoryMigration() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Read AI memory migration file
    const migrationPath = path.join(__dirname, '../../../database/migrations/003_ai_intelligence_memory.sql');
    
    if (fs.existsSync(migrationPath)) {
      let migration = fs.readFileSync(migrationPath, 'utf8');
      
      // Execute migration (split by semicolons)
      const statements = migration.split(';').filter(s => s.trim().length > 0);
      for (const statement of statements) {
        if (statement.trim() && !statement.trim().startsWith('--')) {
          try {
            await query(statement.trim());
          } catch (err) {
            // Ignore "already exists" errors
            if (!err.message.includes('already exists') && 
                !err.message.includes('duplicate') &&
                !err.message.includes('does not exist')) {
              console.warn(`AI Memory migration warning: ${err.message}`);
            }
          }
        }
      }
      console.log(`✅ Applied AI intelligence memory migration`);
    }
  } catch (err) {
    console.error(`⚠️  Error running AI memory migration:`, err.message);
    // Don't throw - allow customer creation to continue even if AI memory migration fails
  }
}

/**
 * Run learning system migrations for customer schema
 */
async function runLearningMigrations(schemaName) {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Read migration files
    const migration1Path = path.join(__dirname, '../../../database/migrations/001_parser_gap_learning_schema.sql');
    const migration2Path = path.join(__dirname, '../../../database/migrations/002_create_learning_indexes.sql');
    
    if (fs.existsSync(migration1Path)) {
      let migration1 = fs.readFileSync(migration1Path, 'utf8');
      migration1 = migration1.replace(/\$\{schemaName\}/g, schemaName);
      
      // Execute migration (split by semicolons)
      const statements = migration1.split(';').filter(s => s.trim().length > 0);
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await query(statement.trim());
          } catch (err) {
            // Ignore "already exists" errors
            if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
              console.warn(`Migration warning: ${err.message}`);
            }
          }
        }
      }
      console.log(`✅ Applied learning schema migration to ${schemaName}`);
    }
    
    if (fs.existsSync(migration2Path)) {
      let migration2 = fs.readFileSync(migration2Path, 'utf8');
      migration2 = migration2.replace(/\$\{schemaName\}/g, schemaName);
      
      // Execute migration (split by semicolons)
      const statements = migration2.split(';').filter(s => s.trim().length > 0);
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await query(statement.trim());
          } catch (err) {
            // Ignore "already exists" errors
            if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
              console.warn(`Migration warning: ${err.message}`);
            }
          }
        }
      }
      console.log(`✅ Applied learning indexes migration to ${schemaName}`);
    }
  } catch (err) {
    console.error(`⚠️  Error running learning migrations for ${schemaName}:`, err.message);
    // Don't throw - allow customer creation to continue even if learning migrations fail
  }
}

export default router;

