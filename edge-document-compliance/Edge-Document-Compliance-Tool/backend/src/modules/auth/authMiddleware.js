/**
 * Authentication Middleware
 * Express middleware for JWT authentication and authorization
 */

import { verifyToken, userHasRole } from './authService.js';

/**
 * Middleware to authenticate JWT token
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);

    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
      roles: decoded.roles || []
    };
    req.tenantId = decoded.tenantId;

    next();
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Invalid token' });
  }
}

/**
 * Middleware to require specific role
 * @param {string|string[]} requiredRole - Role name(s) required
 */
export function requireRole(requiredRole) {
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userRoles = req.user.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Middleware to require tenant context
 */
export function requireTenant(req, res, next) {
  if (!req.tenantId) {
    return res.status(401).json({ error: 'No tenant context' });
  }
  next();
}

/**
 * Optional authentication (doesn't fail if no token)
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = await verifyToken(token);
      req.user = {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        email: decoded.email,
        roles: decoded.roles || []
      };
      req.tenantId = decoded.tenantId;
    }
  } catch (error) {
    // Ignore auth errors for optional auth
  }
  next();
}
