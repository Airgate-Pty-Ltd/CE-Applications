/**
 * Tenant Isolation Middleware
 * 
 * CRITICAL: Enforces multi-tenant data isolation at the API layer.
 * Every request must include tenant_id, and all database queries
 * must be scoped to that tenant.
 * 
 * © 2025 Conform-Edge Quality Consulting. All rights reserved. CEQC-OQCQMS
 */

/**
 * Extract tenant ID from request
 * Priority: X-Tenant-ID header > user.tenant_id > customer_id param > query param
 */
export function extractTenantId(req) {
  // Method 1: Explicit header
  if (req.headers['x-tenant-id']) {
    return req.headers['x-tenant-id'];
  }
  
  // Method 2: From authenticated user context
  if (req.user && req.user.tenant_id) {
    return req.user.tenant_id;
  }
  
  // Method 3: From route parameter (for /api/tenants/{tenantId}/... routes)
  if (req.params.tenantId) {
    return req.params.tenantId;
  }
  
  // Method 4: From customer_id (legacy support - customers act as tenants)
  if (req.body.customer_id) {
    return req.body.customer_id;
  }
  
  if (req.query.customer_id) {
    return req.query.customer_id;
  }
  
  // Method 5: From query parameter
  if (req.query.tenant_id) {
    return req.query.tenant_id;
  }
  
  return null;
}

/**
 * Tenant isolation middleware
 * Adds tenant_id to request object and validates it exists
 */
export function tenantIsolationMiddleware(req, res, next) {
  const tenantId = extractTenantId(req);
  
  if (!tenantId) {
    return res.status(401).json({
      success: false,
      error: 'Tenant ID required. Provide X-Tenant-ID header or tenant_id parameter.'
    });
  }
  
  // Attach to request for use in routes
  req.tenantId = tenantId;
  
  // Set tenant context for database queries (if using connection pooling with context)
  // This ensures all queries automatically include WHERE tenant_id = $1
  if (req.db && req.db.setTenantId) {
    req.db.setTenantId(tenantId);
  }
  
  next();
}

/**
 * Optional: Verify tenant exists and is active
 * Use this for stricter validation
 */
export async function validateTenantMiddleware(req, res, next) {
  const tenantId = extractTenantId(req);
  
  if (!tenantId) {
    return res.status(401).json({
      success: false,
      error: 'Tenant ID required'
    });
  }
  
  try {
    const { query } = await import('../database/connection.js');
    
    // Check if tenant exists (check both tenants table and customers table)
    const tenantCheck = await query(
      `SELECT id FROM tenants WHERE id = $1 AND is_active = TRUE
       UNION
       SELECT id FROM customers WHERE id = $1`,
      [tenantId]
    );
    
    if (tenantCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or inactive tenant'
      });
    }
    
    req.tenantId = tenantId;
    next();
  } catch (error) {
    console.error('[Tenant Isolation] Validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Tenant validation failed'
    });
  }
}

export default tenantIsolationMiddleware;

