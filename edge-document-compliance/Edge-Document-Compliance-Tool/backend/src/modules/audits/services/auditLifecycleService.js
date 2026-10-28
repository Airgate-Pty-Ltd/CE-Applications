/**
 * Audit Lifecycle Service
 * Handles audit state transitions, assignments, and lifecycle management
 */

import { updateAudit, recordStateChange, getAuditById } from '../storage/auditRepository.js';
import { isValidStatusTransition } from '../domain/validators.js';
import { query } from '../../../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Update audit status with validation
 * @param {string} auditId - Audit ID
 * @param {string} tenantId - Tenant ID
 * @param {string} newStatus - New status
 * @param {string} changedBy - User ID making the change
 * @param {string} [reason] - Reason for change
 * @returns {Promise<Object>} - Updated audit
 */
export async function updateAuditStatus(auditId, tenantId, newStatus, changedBy, reason = null) {
  const audit = await getAuditById(auditId, tenantId);
  if (!audit) {
    throw new Error('Audit not found');
  }

  const currentStatus = audit.status;

  // Validate transition
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
  }

  // Update audit
  const updates = { status: newStatus };
  if (newStatus === 'CLOSED') {
    updates.closed_at = new Date();
  }

  const updated = await updateAudit(auditId, tenantId, updates);

  // Record state change
  await recordStateChange(auditId, currentStatus, newStatus, changedBy, reason);

  return updated;
}

/**
 * Assign auditor to audit
 * @param {string} auditId - Audit ID
 * @param {string} tenantId - Tenant ID
 * @param {string} assignedTo - User ID to assign
 * @param {string} assignedBy - User ID making assignment
 * @param {string} role - Role ('Lead Auditor' or 'Internal Assessor')
 * @returns {Promise<Object>} - Assignment record
 */
export async function assignAuditor(auditId, tenantId, assignedTo, assignedBy, role) {
  // Verify audit exists
  const audit = await getAuditById(auditId, tenantId);
  if (!audit) {
    throw new Error('Audit not found');
  }

  // Verify user exists and is in same tenant
  const userResult = await query(
    'SELECT id FROM auth.users WHERE id = $1 AND tenant_id = $2',
    [assignedTo, tenantId]
  );
  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }

  // Create or update assignment
  const assignmentId = uuidv4();
  const result = await query(
    `INSERT INTO audits.audit_assignments 
     (id, audit_id, assigned_to, assigned_by, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (audit_id, assigned_to) 
     DO UPDATE SET role = EXCLUDED.role, assigned_by = EXCLUDED.assigned_by
     RETURNING *`,
    [assignmentId, auditId, assignedTo, assignedBy, role]
  );

  return result.rows[0];
}

/**
 * Submit audit (change status to SUBMITTED)
 * @param {string} auditId - Audit ID
 * @param {string} tenantId - Tenant ID
 * @param {string} submittedBy - User ID submitting
 * @returns {Promise<Object>} - Updated audit
 */
export async function submitAudit(auditId, tenantId, submittedBy) {
  return await updateAuditStatus(auditId, tenantId, 'SUBMITTED', submittedBy, 'Audit submitted by auditor');
}

/**
 * Return audit for revision (change status to RETURNED)
 * @param {string} auditId - Audit ID
 * @param {string} tenantId - Tenant ID
 * @param {string} returnedBy - User ID returning (must be Lead Auditor)
 * @param {string} reason - Reason for return
 * @returns {Promise<Object>} - Updated audit
 */
export async function returnAudit(auditId, tenantId, returnedBy, reason) {
  return await updateAuditStatus(auditId, tenantId, 'RETURNED', returnedBy, reason || 'Returned for revision');
}

/**
 * Close audit (change status to CLOSED)
 * @param {string} auditId - Audit ID
 * @param {string} tenantId - Tenant ID
 * @param {string} closedBy - User ID closing (must be Lead Auditor)
 * @returns {Promise<Object>} - Updated audit
 */
export async function closeAudit(auditId, tenantId, closedBy) {
  return await updateAuditStatus(auditId, tenantId, 'CLOSED', closedBy, 'Audit closed by Lead Auditor');
}

/**
 * Schedule audit (change status to SCHEDULED)
 * @param {string} auditId - Audit ID
 * @param {string} tenantId - Tenant ID
 * @param {Date} scheduledDate - Scheduled date
 * @param {Date} [dueDate] - Due date
 * @param {string} scheduledBy - User ID scheduling
 * @returns {Promise<Object>} - Updated audit
 */
export async function scheduleAudit(auditId, tenantId, scheduledDate, dueDate, scheduledBy) {
  const updates = {
    status: 'SCHEDULED',
    scheduled_date: scheduledDate
  };
  if (dueDate) {
    updates.due_date = dueDate;
  }

  const audit = await updateAudit(auditId, tenantId, updates);
  await recordStateChange(auditId, 'DRAFT', 'SCHEDULED', scheduledBy, 'Audit scheduled');
  
  return audit;
}

/**
 * Get audit assignments
 * @param {string} auditId - Audit ID
 * @returns {Promise<Object[]>} - List of assignments
 */
export async function getAuditAssignments(auditId) {
  const result = await query(
    `SELECT aa.*, u.display_name as assigned_to_name, u2.display_name as assigned_by_name
     FROM audits.audit_assignments aa
     LEFT JOIN auth.users u ON aa.assigned_to = u.id
     LEFT JOIN auth.users u2 ON aa.assigned_by = u2.id
     WHERE aa.audit_id = $1
     ORDER BY aa.assigned_at DESC`,
    [auditId]
  );
  return result.rows;
}
