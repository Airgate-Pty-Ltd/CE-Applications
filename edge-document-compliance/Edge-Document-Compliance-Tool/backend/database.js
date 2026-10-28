/**
 * Database Connection and Query Helpers
 * Manages connections to both Compliance Library and Customer Data databases
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Compliance Library Database Pool
const compliancePool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME_COMPLIANCE || 'edcat_compliance_library',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Customer Data Database Pool
const customerPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME_CUSTOMER || 'edcat_customer_data',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connections
async function testConnections() {
  try {
    await compliancePool.query('SELECT NOW()');
    console.log('✓ Compliance Library database connected');
    
    await customerPool.query('SELECT NOW()');
    console.log('✓ Customer Data database connected');
  } catch (error) {
    console.error('Database connection error:', error.message);
    throw error;
  }
}

// Compliance Library Queries
export const complianceDB = {
  // Standards
  async getStandardByCode(code) {
    const result = await compliancePool.query(
      'SELECT * FROM compliance_standards WHERE code = $1',
      [code]
    );
    return result.rows[0];
  },

  async createStandard(data) {
    const { code, name, sector, version, model_version_used } = data;
    const result = await compliancePool.query(
      `INSERT INTO compliance_standards (code, name, sector, version, model_version_used)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [code, name, sector, version, model_version_used || '1.0.0']
    );
    return result.rows[0];
  },

  async getAllStandards() {
    const result = await compliancePool.query(
      'SELECT * FROM compliance_standards ORDER BY name'
    );
    return result.rows;
  },

  // Requirements
  async getRequirementById(requirementId) {
    const result = await compliancePool.query(
      'SELECT * FROM compliance_requirements WHERE requirement_id = $1',
      [requirementId]
    );
    return result.rows[0];
  },

  async getRequirementsByStandard(standardId) {
    const result = await compliancePool.query(
      `SELECT * FROM compliance_requirements 
       WHERE standard_id = $1 
       ORDER BY clause_number`,
      [standardId]
    );
    return result.rows;
  },

  async createRequirement(data) {
    const { standard_id, clause_number, requirement_text, keyword, confidence } = data;
    const result = await compliancePool.query(
      `INSERT INTO compliance_requirements 
       (standard_id, clause_number, requirement_text, keyword, confidence)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [standard_id, clause_number, requirement_text, keyword, confidence || 0.82]
    );
    return result.rows[0];
  },

  async updateRequirementConfidence(requirementId, newConfidence) {
    const result = await compliancePool.query(
      `UPDATE compliance_requirements 
       SET confidence = $1, updated_at = CURRENT_TIMESTAMP
       WHERE requirement_id = $2
       RETURNING *`,
      [newConfidence, requirementId]
    );
    return result.rows[0];
  },

  // Extraction History
  async recordExtraction(data) {
    const { requirement_id, extraction_event, confidence_before, confidence_after } = data;
    const result = await compliancePool.query(
      `INSERT INTO extraction_history 
       (requirement_id, extraction_event, confidence_before, confidence_after)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [requirement_id, extraction_event, confidence_before, confidence_after]
    );
    return result.rows[0];
  },

  // Model Versions
  async getCurrentModelVersion() {
    const result = await compliancePool.query(
      'SELECT * FROM model_versions ORDER BY created_at DESC LIMIT 1'
    );
    return result.rows[0];
  },

  async createModelVersion(data) {
    const { version, baseline_accuracy, reason_for_update } = data;
    const result = await compliancePool.query(
      `INSERT INTO model_versions (version, baseline_accuracy, reason_for_update)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [version, baseline_accuracy, reason_for_update]
    );
    return result.rows[0];
  },
};

// Customer Data Queries
export const customerDB = {
  // Documents
  async createDocument(data) {
    const { customer_id, file_name, file_path, file_size } = data;
    const result = await customerPool.query(
      `INSERT INTO customer_documents (customer_id, file_name, file_path, file_size)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [customer_id, file_name, file_path, file_size]
    );
    return result.rows[0];
  },

  async getDocumentsByCustomer(customerId) {
    const result = await customerPool.query(
      'SELECT * FROM customer_documents WHERE customer_id = $1 ORDER BY uploaded_at DESC',
      [customerId]
    );
    return result.rows;
  },

  // Procedures
  async createProcedure(data) {
    const { document_id, procedure_text, confidence } = data;
    const result = await customerPool.query(
      `INSERT INTO customer_procedures (document_id, procedure_text, confidence)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [document_id, procedure_text, confidence || 0.75]
    );
    return result.rows[0];
  },

  async getProceduresByDocument(documentId) {
    const result = await customerPool.query(
      'SELECT * FROM customer_procedures WHERE document_id = $1',
      [documentId]
    );
    return result.rows;
  },

  async getProceduresByCustomer(customerId) {
    const result = await customerPool.query(
      `SELECT cp.* FROM customer_procedures cp
       JOIN customer_documents cd ON cp.document_id = cd.document_id
       WHERE cd.customer_id = $1`,
      [customerId]
    );
    return result.rows;
  },

  // Requirement Mappings
  async createMapping(data) {
    const { requirement_id, procedure_id, match_confidence, is_covered } = data;
    const result = await customerPool.query(
      `INSERT INTO requirement_mappings 
       (requirement_id, procedure_id, match_confidence, is_covered)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [requirement_id, procedure_id, match_confidence, is_covered]
    );
    return result.rows[0];
  },

  async updateMapping(mappingId, data) {
    const { match_confidence, is_covered } = data;
    const result = await customerPool.query(
      `UPDATE requirement_mappings 
       SET match_confidence = $1, is_covered = $2, updated_at = CURRENT_TIMESTAMP
       WHERE mapping_id = $3
       RETURNING *`,
      [match_confidence, is_covered, mappingId]
    );
    return result.rows[0];
  },

  async getMappingsByAnalysis(analysisId) {
    const result = await customerPool.query(
      `SELECT rm.* FROM requirement_mappings rm
       JOIN gap_analyses ga ON ga.analysis_id = $1
       WHERE rm.requirement_id IN (
         SELECT requirement_id FROM compliance_requirements 
         WHERE standard_id = ga.standard_id
       )`,
      [analysisId]
    );
    return result.rows;
  },

  // Gap Analyses
  async createAnalysis(data) {
    const { customer_id, standard_id, total_requirements, model_version_used } = data;
    const result = await customerPool.query(
      `INSERT INTO gap_analyses 
       (customer_id, standard_id, total_requirements, model_version_used, status)
       VALUES ($1, $2, $3, $4, 'in_progress')
       RETURNING *`,
      [customer_id, standard_id, total_requirements, model_version_used || '1.0.0']
    );
    return result.rows[0];
  },

  async updateAnalysis(analysisId, data) {
    const { gaps_found, covered_count, final_confidence, status, feedback_rating } = data;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (gaps_found !== undefined) {
      updates.push(`gaps_found = $${paramCount++}`);
      values.push(gaps_found);
    }
    if (covered_count !== undefined) {
      updates.push(`covered_count = $${paramCount++}`);
      values.push(covered_count);
    }
    if (final_confidence !== undefined) {
      updates.push(`final_confidence = $${paramCount++}`);
      values.push(final_confidence);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (feedback_rating !== undefined) {
      updates.push(`feedback_rating = $${paramCount++}`);
      values.push(feedback_rating);
    }

    values.push(analysisId);
    const result = await customerPool.query(
      `UPDATE gap_analyses 
       SET ${updates.join(', ')}
       WHERE analysis_id = $${paramCount}
       RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async getAnalysis(analysisId) {
    const result = await customerPool.query(
      'SELECT * FROM gap_analyses WHERE analysis_id = $1',
      [analysisId]
    );
    return result.rows[0];
  },

  async getAnalysesByCustomer(customerId) {
    const result = await customerPool.query(
      'SELECT * FROM gap_analyses WHERE customer_id = $1 ORDER BY analyzed_at DESC',
      [customerId]
    );
    return result.rows;
  },

  // Clarifications
  async createClarification(data) {
    const {
      analysis_id,
      requirement_id,
      procedure_id,
      clarification_question,
      ai_confidence_before,
      user_response,
      ai_confidence_after,
    } = data;
    const result = await customerPool.query(
      `INSERT INTO analysis_clarifications 
       (analysis_id, requirement_id, procedure_id, clarification_question, 
        ai_confidence_before, user_response, ai_confidence_after)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        analysis_id,
        requirement_id,
        procedure_id,
        clarification_question,
        ai_confidence_before,
        user_response,
        ai_confidence_after,
      ]
    );
    return result.rows[0];
  },

  async getClarificationById(clarificationId) {
    const result = await customerPool.query(
      'SELECT * FROM analysis_clarifications WHERE clarification_id = $1',
      [clarificationId]
    );
    return result.rows[0];
  },

  async getClarificationsByAnalysis(analysisId) {
    const result = await customerPool.query(
      `SELECT * FROM analysis_clarifications 
       WHERE analysis_id = $1 
       ORDER BY created_at ASC`,
      [analysisId]
    );
    return result.rows;
  },

  async updateClarification(clarificationId, data) {
    const { user_response, ai_confidence_after } = data;
    const result = await customerPool.query(
      `UPDATE analysis_clarifications 
       SET user_response = $1, ai_confidence_after = $2
       WHERE clarification_id = $3
       RETURNING *`,
      [user_response, ai_confidence_after, clarificationId]
    );
    return result.rows[0];
  },
};

// Initialize connections on module load
testConnections().catch(console.error);

export { compliancePool, customerPool, testConnections };

