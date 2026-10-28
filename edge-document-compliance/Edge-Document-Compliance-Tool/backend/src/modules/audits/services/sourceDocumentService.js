/**
 * Source Document Service
 * Manages source documents (standards, regulations, customer requirements, checklists)
 */

import { query } from '../../../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { isValidSourceType } from '../domain/validators.js';

/**
 * Create source document
 * @param {Object} sourceData - Source document data
 * @param {string} sourceData.tenant_id - Tenant ID
 * @param {string} sourceData.source_type - Source type
 * @param {string} sourceData.name - Document name
 * @param {string} [sourceData.code] - Standard/regulation code
 * @param {string} [sourceData.revision] - Revision
 * @param {string} [sourceData.authority] - Authority
 * @param {string} [sourceData.jurisdiction] - Jurisdiction
 * @param {string} [sourceData.file_path] - File path
 * @param {string} [sourceData.extracted_text] - Extracted text
 * @param {Object} [sourceData.metadata] - Metadata
 * @returns {Promise<Object>} - Created source document
 */
export async function createSourceDocument(sourceData) {
  if (!isValidSourceType(sourceData.source_type)) {
    throw new Error(`Invalid source type: ${sourceData.source_type}`);
  }

  const sourceId = uuidv4();
  const result = await query(
    `INSERT INTO audits.source_documents
     (id, tenant_id, source_type, name, code, revision, authority, jurisdiction, 
      file_path, extracted_text, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      sourceId,
      sourceData.tenant_id,
      sourceData.source_type,
      sourceData.name,
      sourceData.code || null,
      sourceData.revision || null,
      sourceData.authority || null,
      sourceData.jurisdiction || null,
      sourceData.file_path || null,
      sourceData.extracted_text || null,
      JSON.stringify(sourceData.metadata || {})
    ]
  );

  return result.rows[0];
}

/**
 * Get source document by ID
 * @param {string} sourceId - Source document ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object|null>} - Source document or null
 */
export async function getSourceDocument(sourceId, tenantId) {
  const result = await query(
    'SELECT * FROM audits.source_documents WHERE id = $1 AND tenant_id = $2',
    [sourceId, tenantId]
  );
  return result.rows[0] || null;
}

/**
 * List source documents
 * @param {Object} filters - Filter criteria
 * @param {string} filters.tenant_id - Tenant ID
 * @param {string} [filters.source_type] - Source type filter
 * @returns {Promise<Object[]>} - List of source documents
 */
export async function listSourceDocuments(filters) {
  let sql = 'SELECT * FROM audits.source_documents WHERE tenant_id = $1';
  const params = [filters.tenant_id];

  if (filters.source_type) {
    sql += ' AND source_type = $2';
    params.push(filters.source_type);
  }

  sql += ' ORDER BY uploaded_at DESC';

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Update source document extraction status
 * @param {string} sourceId - Source document ID
 * @param {string} tenantId - Tenant ID
 * @param {string} extractedText - Extracted text
 * @returns {Promise<Object>} - Updated source document
 */
export async function updateSourceExtraction(sourceId, tenantId, extractedText) {
  const result = await query(
    `UPDATE audits.source_documents
     SET extracted_text = $1, extracted_at = NOW()
     WHERE id = $2 AND tenant_id = $3
     RETURNING *`,
    [extractedText, sourceId, tenantId]
  );

  if (result.rows.length === 0) {
    throw new Error('Source document not found');
  }

  return result.rows[0];
}
