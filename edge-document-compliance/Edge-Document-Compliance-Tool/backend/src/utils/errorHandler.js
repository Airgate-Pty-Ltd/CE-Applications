/**
 * Standardized Error Response Helper
 * Ensures consistent error format across all routes
 */

/**
 * Send standardized error response
 * @param {Response} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string} error - Error code/message
 * @param {string} [detail] - Optional detail message
 */
export function sendError(res, status, error, detail) {
  const response = { error };
  if (detail) {
    response.detail = detail;
  }
  res.status(status).json(response);
}

/**
 * Send standardized success response
 * @param {Response} res - Express response object
 * @param {number} status - HTTP status code (default 200)
 * @param {object} data - Response data
 */
export function sendSuccess(res, status = 200, data = {}) {
  res.status(status).json({ success: true, ...data });
}

/**
 * Handle database errors consistently
 * @param {Response} res - Express response object
 * @param {Error} err - Database error
 */
export function handleDbError(res, err) {
  console.error('[db] Error:', err);
  
  // Common PostgreSQL error codes
  const pgErrors = {
    '23505': { status: 409, error: 'DUPLICATE_ENTRY', detail: 'Resource already exists' },
    '23503': { status: 400, error: 'FOREIGN_KEY_VIOLATION', detail: 'Referenced resource does not exist' },
    '23502': { status: 400, error: 'NOT_NULL_VIOLATION', detail: 'Required field is missing' },
    '42P01': { status: 500, error: 'TABLE_NOT_FOUND', detail: 'Database table does not exist' },
    '3D000': { status: 500, error: 'SCHEMA_NOT_FOUND', detail: 'Database schema does not exist' }
  };

  const errorInfo = pgErrors[err.code] || { 
    status: 500, 
    error: 'DATABASE_ERROR', 
    detail: err.message 
  };

  sendError(res, errorInfo.status, errorInfo.error, errorInfo.detail);
}

