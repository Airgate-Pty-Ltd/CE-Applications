/**
 * Authentication Service
 * Handles user authentication and authorization
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - Login result with token and user info
 */
export async function login(email, password) {
  const userResult = await query(
    `SELECT u.id, u.tenant_id, u.email, u.password_hash, u.display_name, u.is_active,
            COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::TEXT[]) as roles
     FROM auth.users u
     LEFT JOIN auth.user_roles ur ON u.id = ur.user_id
     LEFT JOIN auth.roles r ON ur.role_id = r.id
     WHERE u.email = $1 AND u.is_active = true
     GROUP BY u.id, u.tenant_id, u.email, u.password_hash, u.display_name, u.is_active`,
    [email]
  );

  if (userResult.rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = userResult.rows[0];
  const validPassword = await bcrypt.compare(password, user.password_hash);

  if (!validPassword) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  await query(
    'UPDATE auth.users SET last_login = NOW() WHERE id = $1',
    [user.id]
  );

  // Generate JWT token
  const token = jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      roles: user.roles
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      tenantId: user.tenant_id,
      roles: user.roles
    }
  };
}

/**
 * Get current user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User info
 */
export async function getCurrentUser(userId) {
  const result = await query(
    `SELECT u.id, u.tenant_id, u.email, u.display_name, u.is_active,
            COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::TEXT[]) as roles
     FROM auth.users u
     LEFT JOIN auth.user_roles ur ON u.id = ur.user_id
     LEFT JOIN auth.roles r ON ur.role_id = r.id
     WHERE u.id = $1
     GROUP BY u.id, u.tenant_id, u.email, u.display_name, u.is_active`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return result.rows[0];
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Promise<Object>} - Decoded token payload
 */
export async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user still exists and is active
    const userResult = await query(
      'SELECT id, is_active FROM auth.users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      throw new Error('User not found or inactive');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * Check if user has role
 * @param {string} userId - User ID
 * @param {string} roleName - Role name to check
 * @returns {Promise<boolean>} - True if user has role
 */
export async function userHasRole(userId, roleName) {
  const result = await query(
    `SELECT 1 FROM auth.user_roles ur
     JOIN auth.roles r ON ur.role_id = r.id
     WHERE ur.user_id = $1 AND r.name = $2`,
    [userId, roleName]
  );
  return result.rows.length > 0;
}

/**
 * Create user (for seeding/admin)
 * @param {Object} userData - User data
 * @returns {Promise<Object>} - Created user
 */
export async function createUser(userData) {
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(userData.password, 10);

  await query(
    `INSERT INTO auth.users (id, tenant_id, email, password_hash, display_name, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      userId,
      userData.tenant_id,
      userData.email,
      passwordHash,
      userData.display_name,
      userData.is_active !== false
    ]
  );

  // Assign roles
  if (userData.roles && userData.roles.length > 0) {
    for (const roleName of userData.roles) {
      const roleResult = await query(
        'SELECT id FROM auth.roles WHERE name = $1',
        [roleName]
      );
      if (roleResult.rows.length > 0) {
        await query(
          'INSERT INTO auth.user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, roleResult.rows[0].id]
        );
      }
    }
  }

  return getCurrentUser(userId);
}
