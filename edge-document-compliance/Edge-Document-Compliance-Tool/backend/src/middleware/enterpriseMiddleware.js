/**
 * Enterprise Middleware
 * Rate limiting, tenant isolation, API key validation, security headers
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { query } from '../database/connection.js';
import crypto from 'crypto';

// Rate limiting
// FIXED: Added keyGenerator to handle trust proxy setting
export const createRateLimiter = (windowMs = 60000, max = 100) => {
  return rateLimit({
    windowMs: windowMs,
    max: max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    // Fix trust proxy warning: Use X-Forwarded-For header if behind proxy
    keyGenerator: (req) => {
      // Use X-Forwarded-For header if available (when behind proxy)
      const forwarded = req.headers['x-forwarded-for'];
      if (forwarded) {
        return forwarded.split(',')[0].trim();
      }
      // Fallback to connection remote address
      return req.ip || req.connection?.remoteAddress || 'unknown';
    }
  });
};

// API-specific rate limiter (stricter)
export const apiRateLimiter = createRateLimiter(60000, 60); // 60 requests per minute

// Security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'"],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers (onclick, onchange, etc.)
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false // Allow iframe embedding if needed
});

// API Key Validation Middleware
export const validateApiKey = async (req, res, next) => {
  // Skip if API key validation is disabled
  if (process.env.ENABLE_API_KEY_VALIDATION !== 'true') {
    return next();
  }

  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required. Provide via X-API-Key header or api_key query parameter.'
    });
  }

  try {
    // Hash the provided key
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Look up the key
    const result = await query(
      `SELECT id, tenant_id, key_name, permissions, rate_limit_per_minute, 
              expires_at, is_active
       FROM api_keys
       WHERE key_hash = $1 AND is_active = TRUE`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    const apiKeyRecord = result.rows[0];

    // Check expiration
    if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
      return res.status(401).json({
        success: false,
        error: 'API key has expired'
      });
    }

    // Attach to request
    req.apiKey = {
      id: apiKeyRecord.id,
      tenantId: apiKeyRecord.tenant_id,
      keyName: apiKeyRecord.key_name,
      permissions: apiKeyRecord.permissions || [],
      rateLimit: apiKeyRecord.rate_limit_per_minute || 60
    };

    // Update last used
    await query(
      `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,
      [apiKeyRecord.id]
    );

    next();
  } catch (error) {
    console.error('[EnterpriseMiddleware] Error validating API key:', error);
    return res.status(500).json({
      success: false,
      error: 'Error validating API key'
    });
  }
};

// Tenant Isolation Middleware
export const tenantIsolation = async (req, res, next) => {
  try {
    // Get tenant ID from various sources
    // Note: req.user may not exist if authentication middleware hasn't run
    const tenantId = req.headers['x-tenant-id'] || 
                     req.query.tenant_id || 
                     req.body?.tenant_id ||
                     req.apiKey?.tenantId ||
                     (req.user && req.user.tenant_id ? req.user.tenant_id : null);

    if (tenantId) {
      req.tenantId = tenantId;
      
      // Verify tenant exists (optional, can be skipped for performance)
      if (process.env.VERIFY_TENANT_EXISTS === 'true') {
        try {
          const result = await query(
            `SELECT id FROM tenants WHERE id = $1`,
            [tenantId]
          );
          if (result.rows.length === 0) {
            return res.status(404).json({
              success: false,
              error: 'Tenant not found'
            });
          }
        } catch (error) {
          console.error('[EnterpriseMiddleware] Error verifying tenant:', error);
          // Don't fail the request if verification fails
        }
      }
    }

    // Continue even if no tenant ID - some routes don't require it
    next();
  } catch (error) {
    console.error('[EnterpriseMiddleware] Error in tenantIsolation:', error);
    // Don't fail the request - just continue without tenant ID
    next();
  }
};

// Request Correlation ID Middleware
export const correlationId = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || 
                        req.headers['x-request-id'] ||
                        crypto.randomUUID();
  
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
};

// Audit Logging Middleware
export const auditLog = async (req, res, next) => {
  // Only log if enabled
  if (process.env.ENABLE_AUDIT_LOGS !== 'true') {
    return next();
  }

  const startTime = Date.now();

  // Override res.json to capture response
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    res.responseData = data;
    return originalJson(data);
  };

  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      const tenantId = req.tenantId || null;
      const userId = (req.user && req.user.id) ? req.user.id : (req.headers['x-user-id'] || null);

      await query(
        `INSERT INTO audit_logs 
         (tenant_id, user_id, action_type, resource_type, resource_id,
          ip_address, user_agent, request_path, request_method,
          changes, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          tenantId,
          userId,
          req.method.toLowerCase(),
          req.path.split('/')[2] || null, // e.g., 'upload', 'parse', 'chat'
          req.params.id || null,
          req.ip || req.connection.remoteAddress,
          req.get('user-agent'),
          req.path,
          req.method,
          null, // changes (for updates)
          JSON.stringify({
            correlationId: req.correlationId,
            statusCode: res.statusCode,
            duration: duration,
            responseSize: JSON.stringify(res.responseData || {}).length
          })
        ]
      );
    } catch (error) {
      console.error('[EnterpriseMiddleware] Error logging audit:', error);
      // Don't fail the request if audit logging fails
    }
  });

  next();
};

// CORS Configuration
export const corsConfig = {
  origin: function(origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['*'];

    if (allowedOrigins.includes('*') || !origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Tenant-ID', 'X-Correlation-ID']
};

export default {
  createRateLimiter,
  apiRateLimiter,
  securityHeaders,
  validateApiKey,
  tenantIsolation,
  correlationId,
  auditLog,
  corsConfig
};

