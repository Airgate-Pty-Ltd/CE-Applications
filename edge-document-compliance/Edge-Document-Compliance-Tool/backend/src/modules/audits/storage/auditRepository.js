/**
 * Audit Repository
 * Data access layer for audit entities
 */

import { query } from '../../../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new audit
 * @param {Object} auditData - Audit data
 * @param {string} auditData.tenant_id - Tenant ID
 * @param {string} auditData.title - Audit title
 * @param {string} [auditData.description] - Audit description
 * @param {string} [auditData.audit_type] - Audit type
 * @param {string} auditData.created_by - User ID who created
 * @returns {Promise<Object>} - Created audit
 */
export async function createAudit(auditData) {
  const auditId = uuidv4();
  const result = await query(
    `INSERT INTO audits.audits 
     (id, tenant_id, title, description, audit_type, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      auditId,
      auditData.tenant_id,
      auditData.title,
      auditData.description || null,
      auditData.audit_type || 'MIXED',
      'DRAFT',
      auditData.created_by
    ]
  );
  return result.rows[0];
}

/**
 * Get audit by ID
 * @param {string} auditId - Audit ID
 * @param {string} tenantId - Tenant ID (for isolation)
 * @returns {Promise<Object|null>} - Audit or null
 */
export async function getAuditById(auditId, tenantId) {
  const result = await query(
    `SELECT * FROM audits.audits 
     WHERE id = $1 AND tenant_id = $2`,
    [auditId, tenantId]
  );
  return result.rows[0] || null;
}

/**
 * List audits with filters
 * @param {Object} filters - Filter criteria
 * @param {string} filters.tenant_id - Tenant ID
 * @param {string} [filters.status] - Status filter
 * @param {string} [filters.assigned_to] - Assigned user ID
 * @param {Date} [filters.date_from] - Start date
 * @param {Date} [filters.date_to] - End date
 * @param {number} [limit] - Result limit
 * @param {number} [offset] - Result offset
 * @returns {Promise<Object[]>} - List of audits
 */
export async function listAudits(filters) {
  let sql = `
    SELECT a.*, 
           COUNT(DISTINCT ai.id) as item_count,
           COUNT(DISTINCT ar.id) as response_count
    FROM audits.audits a
    LEFT JOIN audits.audit_items ai ON a.id = ai.audit_id
    LEFT JOIN audits.audit_responses ar ON a.id = ar.audit_id
    WHERE a.tenant_id = $1
  `;
  const params = [filters.tenant_id];
  let paramIndex = 2;

  if (filters.status) {
    sql += ` AND a.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.assigned_to) {
    sql += ` AND EXISTS (
      SELECT 1 FROM audits.audit_assignments aa 
      WHERE aa.audit_id = a.id AND aa.assigned_to = $${paramIndex}
    )`;
    params.push(filters.assigned_to);
    paramIndex++;
  }

  if (filters.date_from) {
    sql += ` AND a.created_at >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    sql += ` AND a.created_at <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  sql += ` GROUP BY a.id ORDER BY a.created_at DESC`;

  if (filters.limit) {
    sql += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
    if (filters.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }
  }

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Update audit
 * @param {string} auditId - Audit ID
 * @param {string} tenantId - Tenant ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated audit
 */
export async function updateAudit(auditId, tenantId, updates) {
  const allowedFields = ['title', 'description', 'due_date', 'scheduled_date', 'status', 'audit_pack_json'];
  const setClauses = [];
  const params = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    throw new Error('No valid fields to update');
  }

  setClauses.push(`updated_at = NOW()`);
  params.push(auditId, tenantId);

  const result = await query(
    `UPDATE audits.audits 
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    throw new Error('Audit not found');
  }

  return result.rows[0];
}

/**
 * Create audit items (bulk insert)
 * @param {Object[]} items - Array of item data
 * @returns {Promise<Object[]>} - Created items
 */
export async function createAuditItems(items) {
  if (items.length === 0) return [];

  const values = [];
  const params = [];
  let paramIndex = 1;

  for (const item of items) {
    const itemId = uuidv4();
    values.push(`(
      $${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, 
      $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7},
      $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12}
    )`);
    params.push(
      itemId,
      item.audit_id,
      item.tenant_id,
      item.source_type,
      item.requirement_id || null,
      item.requirement_ref,
      item.requirement_text,
      item.question,
      JSON.stringify(item.evidence_expectations || {}),
      item.grouping_section || null,
      item.grouping_subsection || null,
      item.sort_order || 0,
      JSON.stringify(item.metadata || {})
    );
    paramIndex += 13;
  }

  const result = await query(
    `INSERT INTO audits.audit_items 
     (id, audit_id, tenant_id, source_type, requirement_id, requirement_ref, 
      requirement_text, question, evidence_expectations, grouping_section, 
      grouping_subsection, sort_order, metadata)
     VALUES ${values.join(', ')}
     RETURNING *`,
    params
  );

  return result.rows;
}

/**
 * Get audit items for an audit
 * @param {string} auditId - Audit ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object[]>} - List of audit items
 */
export async function getAuditItems(auditId, tenantId) {
  const result = await query(
    `SELECT * FROM audits.audit_items 
     WHERE audit_id = $1 AND tenant_id = $2
     ORDER BY grouping_section, sort_order, requirement_ref`,
    [auditId, tenantId]
  );
  return result.rows;
}

/**
 * Record audit state change
 * @param {string} auditId - Audit ID
 * @param {string} fromStatus - Previous status
 * @param {string} toStatus - New status
 * @param {string} changedBy - User ID
 * @param {string} [reason] - Change reason
 * @returns {Promise<Object>} - Created history record
 */
export async function recordStateChange(auditId, fromStatus, toStatus, changedBy, reason = null) {
  const historyId = uuidv4();
  const result = await query(
    `INSERT INTO audits.audit_state_history
     (id, audit_id, from_status, to_status, changed_by, change_reason)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [historyId, auditId, fromStatus, toStatus, changedBy, reason]
  );
  return result.rows[0];
}

/**
 * Get audit state history
 * @param {string} auditId - Audit ID
 * @returns {Promise<Object[]>} - History records
 */
export async function getAuditHistory(auditId) {
  const result = await query(
    `SELECT h.*, u.display_name as changed_by_name
     FROM audits.audit_state_history h
     LEFT JOIN auth.users u ON h.changed_by = u.id
     WHERE h.audit_id = $1
     ORDER BY h.changed_at DESC`,
    [auditId]
  );
  return result.rows;
}
