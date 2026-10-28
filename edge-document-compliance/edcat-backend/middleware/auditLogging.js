/**
 * Audit Logging Middleware
 * 
 * Immutable audit trail for all operations.
 * Records: user, timestamp, action, resource, request params, response status.
 * 
 * © 2025 Conform-Edge Quality Consulting. All rights reserved. CEQC-OQCQMS
 */

import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sanitize request parameters for audit logging
 * Removes sensitive data (passwords, tokens, etc.)
 */
function sanitizeParams(params) {
  if (!params || typeof params !== 'object') {
    return params;
  }
  
  const sanitized = { ...params };
  const sensitiveKeys = ['password', 'password_hash', 'token', 'api_key', 'secret', 'authorization'];
  
  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Audit logging middleware
 * Logs all API requests and responses
 */
export function auditLoggingMiddleware(req, res, next) {
  const startTime = Date.now();
  const requestId = uuidv4();
  req.auditRequestId = requestId;
  
  // Capture original res.json to intercept response
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    // Log after response is sent
    logAuditEvent(req, res, data, Date.now() - startTime).catch(err => {
      console.error('[Audit] Failed to log audit event:', err);
    });
    
    return originalJson(data);
  };
  
  next();
}

/**
 * Log audit event to database
 */
async function logAuditEvent(req, res, responseData, processingTimeMs) {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id || req.body?.customer_id || req.query?.tenant_id;
    const userId = req.user?.id || req.body?.user_id || null;
    const action = `${req.method} ${req.path}`;
    const resourceType = extractResourceType(req.path);
    const resourceId = req.params.id || req.params.analysisId || req.params.documentId || null;
    
    // Sanitize request parameters
    const requestParams = sanitizeParams({
      ...req.query,
      ...req.body,
      ...req.params
    });
    
    // Determine response status
    const responseStatus = res.statusCode || 200;
    
    // Extract affected rows from response (if available)
    const affectedRows = responseData?.data?.requirements?.length 
      || responseData?.data?.findings?.length 
      || (responseData?.success ? 1 : 0)
      || 0;
    
    await query(
      `INSERT INTO audit_log
       (id, tenant_id, user_id, action, resource_type, resource_id,
        request_params, response_status, processing_time_ms, affected_rows,
        notes, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        uuidv4(),
        tenantId,
        userId,
        action,
        resourceType,
        resourceId,
        JSON.stringify(requestParams),
        responseStatus,
        processingTimeMs,
        affectedRows,
        `Request ID: ${req.auditRequestId}`,
      ]
    );
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('[Audit] Error logging audit event:', error);
  }
}

/**
 * Extract resource type from path
 */
function extractResourceType(path) {
  if (path.includes('/documents')) return 'document';
  if (path.includes('/requirements')) return 'requirement';
  if (path.includes('/gap-analysis')) return 'gap_analysis';
  if (path.includes('/assessments')) return 'assessment';
  if (path.includes('/customers')) return 'customer';
  if (path.includes('/users')) return 'user';
  return 'unknown';
}

/**
 * Manual audit log entry (for important operations)
 */
export async function logAuditEntry({ tenantId, userId, action, resourceType, resourceId, details, notes }) {
  try {
    await query(
      `INSERT INTO audit_log
       (id, tenant_id, user_id, action, resource_type, resource_id,
        details, notes, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        uuidv4(),
        tenantId,
        userId,
        action,
        resourceType,
        resourceId,
        JSON.stringify(details || {}),
        notes || null
      ]
    );
  } catch (error) {
    console.error('[Audit] Error creating manual audit entry:', error);
    throw error;
  }
}

export default auditLoggingMiddleware;

