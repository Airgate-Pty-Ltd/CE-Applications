/**
 * ComplianceGap Database Models/Service Layer
 * Provides data access functions for ComplianceGap module
 */

import { queryPostgres } from '../../config/databases.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get a compliance standard by ID
 */
export async function getStandard(standardId) {
  const result = await queryPostgres(
    `SELECT * FROM public.compliance_standards WHERE id = $1 AND is_active = TRUE`,
    [standardId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Standard not found: ${standardId}`);
  }

  return result.rows[0];
}

/**
 * Get all requirements for a standard
 */
export async function getRequirements(standardId) {
  const result = await queryPostgres(
    `SELECT * FROM public.compliance_requirements 
     WHERE standard_id = $1 
     ORDER BY clause_number`,
    [standardId]
  );

  return result.rows;
}

/**
 * Get customer documents
 */
export async function getCustomerDocuments(customerId, limit = 100) {
  const result = await queryPostgres(
    `SELECT id, filename, file_type, file_size, uploaded_at, extraction_status
     FROM public.customer_documents
     WHERE customer_id = $1
     ORDER BY uploaded_at DESC
     LIMIT $2`,
    [customerId, limit]
  );

  return result.rows;
}

/**
 * Get customer document by ID
 */
export async function getCustomerDocument(documentId) {
  const result = await queryPostgres(
    `SELECT * FROM public.customer_documents WHERE id = $1`,
    [documentId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Document not found: ${documentId}`);
  }

  return result.rows[0];
}

/**
 * Get customer procedures for a document
 */
export async function getCustomerProcedures(documentId) {
  const result = await queryPostgres(
    `SELECT * FROM public.customer_procedures
     WHERE document_id = $1
     ORDER BY section_number, page_number`,
    [documentId]
  );

  return result.rows;
}

/**
 * Create a gap analysis record
 */
export async function createGapAnalysis(analysisData) {
  const {
    analysis_id,
    customer_id,
    standard_id,
    standard_code,
    status = 'pending',
    summary,
    total_requirements = 0,
    covered_count = 0,
    partially_covered_count = 0,
    not_covered_count = 0,
    confidence_score,
    analysis_data,
    model_version = '1.0.0'
  } = analysisData;

  const result = await queryPostgres(
    `INSERT INTO public.gap_analyses
     (analysis_id, customer_id, standard_id, standard_code, status, summary,
      total_requirements, covered_count, partially_covered_count, not_covered_count,
      confidence_score, analysis_data, model_version, started_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
     RETURNING *`,
    [
      analysis_id,
      customer_id,
      standard_id,
      standard_code,
      status,
      summary,
      total_requirements,
      covered_count,
      partially_covered_count,
      not_covered_count,
      confidence_score,
      JSON.stringify(analysis_data),
      model_version
    ]
  );

  return result.rows[0];
}

/**
 * Update gap analysis status
 */
export async function updateGapAnalysis(analysisId, updates) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }

  if (updates.summary !== undefined) {
    fields.push(`summary = $${paramIndex++}`);
    values.push(updates.summary);
  }

  if (updates.confidence_score !== undefined) {
    fields.push(`confidence_score = $${paramIndex++}`);
    values.push(updates.confidence_score);
  }

  if (updates.analysis_data !== undefined) {
    fields.push(`analysis_data = $${paramIndex++}`);
    values.push(JSON.stringify(updates.analysis_data));
  }

  if (updates.completed_at !== undefined) {
    fields.push(`completed_at = $${paramIndex++}`);
    values.push(updates.completed_at);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  fields.push(`updated_at = NOW()`);
  values.push(analysisId);

  const result = await queryPostgres(
    `UPDATE public.gap_analyses
     SET ${fields.join(', ')}
     WHERE analysis_id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error(`Analysis not found: ${analysisId}`);
  }

  return result.rows[0];
}

/**
 * Create a requirement mapping
 */
export async function createRequirementMapping(requirement_id, procedure_id, confidence, analysis_id = null, additionalData = {}) {
  const {
    match_type = 'covered',
    evidence_text = null,
    gap_description = null,
    risk_level = 'medium'
  } = additionalData;

  const result = await queryPostgres(
    `INSERT INTO public.requirement_mappings
     (requirement_id, procedure_id, analysis_id, match_type, confidence_score, 
      evidence_text, gap_description, risk_level)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (requirement_id, procedure_id, analysis_id) 
     DO UPDATE SET
       match_type = EXCLUDED.match_type,
       confidence_score = EXCLUDED.confidence_score,
       evidence_text = EXCLUDED.evidence_text,
       gap_description = EXCLUDED.gap_description,
       risk_level = EXCLUDED.risk_level,
       updated_at = NOW()
     RETURNING *`,
    [requirement_id, procedure_id, analysis_id, match_type, confidence, evidence_text, gap_description, risk_level]
  );

  return result.rows[0];
}

/**
 * Save a learning event
 */
export async function saveLearningEvent(requirement_id, before_confidence, after_confidence, options = {}) {
  const {
    procedure_id = null,
    mapping_id = null,
    improvement_reason = null,
    model_version_before = '1.0.0',
    model_version_after = '1.0.0',
    learning_event_type = 'user_feedback'
  } = options;

  const result = await queryPostgres(
    `INSERT INTO public.extraction_history
     (requirement_id, procedure_id, mapping_id, before_confidence, after_confidence,
      improvement_reason, model_version_before, model_version_after, learning_event_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      requirement_id,
      procedure_id,
      mapping_id,
      before_confidence,
      after_confidence,
      improvement_reason,
      model_version_before,
      model_version_after,
      learning_event_type
    ]
  );

  return result.rows[0];
}

/**
 * Create a new model version
 */
export async function createModelVersion(version, improvements, options = {}) {
  const {
    model_name = 'mistral',
    baseline_accuracy = null,
    improved_accuracy = null,
    learning_events_count = 0
  } = options;

  const result = await queryPostgres(
    `INSERT INTO public.model_versions
     (version, model_name, improvements, baseline_accuracy, improved_accuracy, learning_events_count)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (version) DO UPDATE SET
       improvements = EXCLUDED.improvements,
       improved_accuracy = EXCLUDED.improved_accuracy,
       learning_events_count = EXCLUDED.learning_events_count
     RETURNING *`,
    [version, model_name, improvements, baseline_accuracy, improved_accuracy, learning_events_count]
  );

  return result.rows[0];
}

/**
 * Get current active model version
 */
export async function getCurrentModelVersion() {
  const result = await queryPostgres(
    `SELECT * FROM public.model_versions
     WHERE is_active = TRUE
     ORDER BY released_at DESC
     LIMIT 1`
  );

  if (result.rows.length === 0) {
    // Return default version if none exists
    return {
      version: '1.0.0',
      model_name: 'mistral',
      is_active: true
    };
  }

  return result.rows[0];
}

/**
 * Save customer document
 */
export async function saveCustomerDocument(customerId, documentData) {
  const {
    filename,
    file_type,
    file_size,
    file_path = 'database',
    file_content = null,
    metadata = null
  } = documentData;

  const result = await queryPostgres(
    `INSERT INTO public.customer_documents
     (customer_id, filename, file_type, file_size, file_path, file_content, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [customerId, filename, file_type, file_size, file_path, file_content, metadata ? JSON.stringify(metadata) : null]
  );

  return result.rows[0];
}

/**
 * Save customer procedure
 */
export async function saveCustomerProcedure(documentId, procedureData) {
  const {
    procedure_title,
    procedure_text,
    section_number = null,
    page_number = null,
    confidence_score = 0.75,
    model_version = '1.0.0',
    metadata = null
  } = procedureData;

  const result = await queryPostgres(
    `INSERT INTO public.customer_procedures
     (document_id, procedure_title, procedure_text, section_number, page_number,
      confidence_score, model_version, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [documentId, procedure_title, procedure_text, section_number, page_number, confidence_score, model_version, metadata ? JSON.stringify(metadata) : null]
  );

  return result.rows[0];
}

/**
 * Update document extraction status
 */
export async function updateDocumentExtractionStatus(documentId, status, extractedAt = null) {
  const result = await queryPostgres(
    `UPDATE public.customer_documents
     SET extraction_status = $1, extracted_at = COALESCE($2, NOW()), updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [status, extractedAt, documentId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Document not found: ${documentId}`);
  }

  return result.rows[0];
}

/**
 * Get gap analysis by analysis_id
 */
export async function getGapAnalysis(analysisId) {
  const result = await queryPostgres(
    `SELECT * FROM public.gap_analyses WHERE analysis_id = $1`,
    [analysisId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Analysis not found: ${analysisId}`);
  }

  return result.rows[0];
}

/**
 * List gap analyses for a customer
 */
export async function listGapAnalyses(customerId, limit = 50) {
  const result = await queryPostgres(
    `SELECT analysis_id, standard_code, status, summary, 
            total_requirements, covered_count, partially_covered_count, not_covered_count,
            confidence_score, started_at, completed_at, created_at
     FROM public.gap_analyses
     WHERE customer_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [customerId, limit]
  );

  return result.rows;
}

