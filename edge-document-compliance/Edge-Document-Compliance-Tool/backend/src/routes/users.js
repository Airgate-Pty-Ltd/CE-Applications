/**
 * User Management Routes
 * Create and manage authorized users with access control
 */

import express from 'express';
import { queryPostgres } from '../config/databases.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

/**
 * GET /api/users
 * List all authorized users
 */
router.get('/', async (req, res) => {
  try {
    // Check if authorized_users table exists
    const tableCheck = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'authorized_users'
      );
    `);
    
    if (!tableCheck.rows || !tableCheck.rows[0] || !tableCheck.rows[0].exists) {
      // Table doesn't exist - return empty array (user management not configured)
      // This is OK - table will be created by migration
      return res.json({
        success: true,
        users: []
      });
    }
    
    // Check which ID column exists (id or user_id)
    const columnCheck = await queryPostgres(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'authorized_users' 
      AND column_name IN ('id', 'user_id')
    `);
    
    const hasId = columnCheck.rows.some(r => r.column_name === 'id');
    const hasUserId = columnCheck.rows.some(r => r.column_name === 'user_id');
    const idColumn = hasId ? 'id' : (hasUserId ? 'user_id' : 'id'); // Default to id
    
    const result = await queryPostgres(`
      SELECT 
        ${idColumn} as id,
        COALESCE(user_id, ${idColumn}) as user_id,
        username,
        email,
        full_name,
        role,
        access_level,
        is_active,
        last_login,
        created_at,
        updated_at
      FROM public.authorized_users
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      users: (result.rows || []).map(row => ({
        id: row.id || row.user_id, // Use id as primary, fallback to user_id
        userId: row.user_id,
        username: row.username,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        accessLevel: row.access_level,
        isActive: row.is_active,
        lastLogin: row.last_login,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    // Return empty array instead of error if table doesn't exist
    if (error.message && (error.message.includes('does not exist') || error.message.includes('relation') || error.code === '42P01')) {
      return res.json({
        success: true,
        users: [],
        message: 'User management table not configured.'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/users
 * Create a new authorized user
 */
router.post('/', async (req, res) => {
  try {
    const { username, email, password, fullName, role, accessLevel } = req.body;

    if (!username || !email) {
      return res.status(400).json({
        success: false,
        error: 'username and email are required'
      });
    }

    // Validate role
    const validRoles = ['admin', 'user', 'viewer', 'auditor'];
    const userRole = role && validRoles.includes(role) ? role : 'user';

    // Validate access level
    const validAccessLevels = ['full', 'standard', 'limited', 'readonly'];
    const userAccessLevel = accessLevel && validAccessLevels.includes(accessLevel) ? accessLevel : 'standard';

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Check if authorized_users table exists
    const tableCheck = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'authorized_users'
      );
    `);
    
    if (!tableCheck.rows || !tableCheck.rows[0] || !tableCheck.rows[0].exists) {
      // Table should exist from migration, but if it doesn't, return 503 (service unavailable)
      // rather than 501 (not implemented) to indicate it's a configuration issue
      return res.status(503).json({
        success: false,
        error: 'User management is not available. The authorized_users table has not been created yet.'
      });
    }

    // Check if user already exists
    const existing = await queryPostgres(
      `SELECT user_id FROM public.authorized_users WHERE username = $1 OR email = $2`,
      [username, email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this username or email already exists'
      });
    }

    // Check which ID column exists for RETURNING clause
    const idColumnCheck = await queryPostgres(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'authorized_users' 
      AND column_name IN ('id', 'user_id')
    `);
    
    const hasIdCol = idColumnCheck.rows.some(r => r.column_name === 'id');
    const returnIdCol = hasIdCol ? 'id' : 'user_id';
    
    // Create user
    const result = await queryPostgres(
      `INSERT INTO public.authorized_users 
       (username, email, password_hash, full_name, role, access_level, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING ${returnIdCol} as id, COALESCE(user_id, ${returnIdCol}) as user_id, username, email, full_name, role, access_level, is_active, created_at`,
      [username, email, passwordHash, fullName || null, userRole, userAccessLevel]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: result.rows[0].id || result.rows[0].user_id,
        userId: result.rows[0].user_id,
        username: result.rows[0].username,
        email: result.rows[0].email,
        fullName: result.rows[0].full_name,
        role: result.rows[0].role,
        accessLevel: result.rows[0].access_level,
        isActive: result.rows[0].is_active,
        createdAt: result.rows[0].created_at
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/users/:userId
 * Update user details and access rights
 */
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, password, fullName, role, accessLevel, isActive } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (username !== undefined) {
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }
    if (fullName !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(fullName);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (accessLevel !== undefined) {
      updates.push(`access_level = $${paramCount++}`);
      values.push(accessLevel);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await queryPostgres(
      `UPDATE public.authorized_users 
       SET ${updates.join(', ')}
       WHERE user_id = $${paramCount}
       RETURNING user_id, username, email, full_name, role, access_level, is_active, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: result.rows[0].user_id,
        username: result.rows[0].username,
        email: result.rows[0].email,
        fullName: result.rows[0].full_name,
        role: result.rows[0].role,
        accessLevel: result.rows[0].access_level,
        isActive: result.rows[0].is_active,
        updatedAt: result.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/users/:userId
 * Delete a user (soft delete by setting is_active = false)
 */
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await queryPostgres(
      `UPDATE public.authorized_users 
       SET is_active = FALSE, updated_at = NOW()
       WHERE user_id = $1
       RETURNING user_id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/users/:userId/permissions
 * Assign permissions to a user
 */
router.post('/:userId/permissions', async (req, res) => {
  try {
    const { userId } = req.params;
    const { resourceType, resourceId, permissionType } = req.body;

    if (!resourceType || !permissionType) {
      return res.status(400).json({
        success: false,
        error: 'resourceType and permissionType are required'
      });
    }

    const result = await queryPostgres(
      `INSERT INTO public.user_permissions 
       (user_id, resource_type, resource_id, permission_type, granted_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING permission_id, user_id, resource_type, resource_id, permission_type`,
      [userId, resourceType, resourceId || null, permissionType]
    );

    res.status(201).json({
      success: true,
      message: 'Permission granted successfully',
      permission: result.rows[0]
    });
  } catch (error) {
    console.error('Error granting permission:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

