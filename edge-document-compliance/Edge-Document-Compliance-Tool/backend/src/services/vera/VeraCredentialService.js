/**
 * VERA Credential Service
 * 
 * Manages user credentials for accessing gated websites
 * Handles storage, retrieval, and audit logging
 */

import { queryPostgres } from '../../database/connection.js';
import VeraEncryptionService from './VeraEncryptionService.js';

/**
 * Store new credentials
 * @param {string} userId - User ID
 * @param {string} website - Website identifier (e.g., 'ansi.org')
 * @param {string} username - Username/email
 * @param {string} password - Plain text password (will be encrypted)
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Stored credential record
 */
export async function storeCredential(userId, website, username, password, metadata = {}) {
  try {
    // Encrypt password
    const encryptedPassword = VeraEncryptionService.encryptPassword(password);
    
    // Extract metadata
    const websiteUrl = metadata.url || `https://${website}`;
    const accessLevel = metadata.access_level || null;
    const membershipType = metadata.membership_type || null;
    const organization = metadata.organization || null;
    const membershipNumber = metadata.membership_number || null;
    const expirationDate = metadata.expiration_date || null;

    // Insert credential
    const result = await queryPostgres(
      `INSERT INTO public.vera_credentials
       (user_id, website, website_url, username, password_encrypted, encryption_key_id,
        access_level, membership_type, organization, membership_number, expiration_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, website, username, access_level, membership_type, 
                 organization, membership_number, expiration_date, created_at`,
      [
        userId, 
        website, 
        websiteUrl, 
        username, 
        encryptedPassword,
        'default', // encryption_key_id
        accessLevel, 
        membershipType, 
        organization,
        membershipNumber, 
        expirationDate
      ]
    );

    const credential = result.rows[0];

    // Log the action
    await logCredentialAudit(userId, credential.id, 'created', { 
      website,
      username: username.substring(0, 3) + '***' // Don't log full username
    });

    return credential;
  } catch (error) {
    console.error('[VeraCredential] Error storing credential:', error);
    throw error;
  }
}

/**
 * Get stored credentials for a website
 * @param {string} userId - User ID
 * @param {string} website - Website identifier
 * @returns {Promise<Object|null>} Credential record with decrypted password
 */
export async function getCredentials(userId, website) {
  try {
    const result = await queryPostgres(
      `SELECT * FROM public.vera_credentials
       WHERE user_id = $1 AND website = $2 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, website]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const cred = result.rows[0];

    // Log access
    await logCredentialAudit(userId, cred.id, 'accessed', { website });

    // Decrypt password
    try {
      cred.password = VeraEncryptionService.decryptPassword(cred.password_encrypted);
      delete cred.password_encrypted; // Never return encrypted version
    } catch (decryptError) {
      console.error('[VeraCredential] Decryption failed:', decryptError);
      throw new Error('Failed to decrypt stored password. Credential may be corrupted.');
    }

    // Update last_used timestamp
    await queryPostgres(
      `UPDATE public.vera_credentials
       SET last_used = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [cred.id]
    );

    return cred;
  } catch (error) {
    console.error('[VeraCredential] Error getting credentials:', error);
    throw error;
  }
}

/**
 * List all stored credentials (without passwords)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of credential records
 */
export async function listCredentials(userId) {
  try {
    const result = await queryPostgres(
      `SELECT id, website, website_url, username, access_level, membership_type, 
              organization, membership_number, expiration_date, last_used, created_at
       FROM public.vera_credentials
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY website`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error('[VeraCredential] Error listing credentials:', error);
    throw error;
  }
}

/**
 * Check if credential is expired
 * @param {string} credentialId - Credential ID
 * @returns {Promise<boolean>} True if expired
 */
export async function isCredentialExpired(credentialId) {
  try {
    const result = await queryPostgres(
      `SELECT expiration_date FROM public.vera_credentials WHERE id = $1`,
      [credentialId]
    );

    if (result.rows.length === 0) {
      return true; // Consider missing as expired
    }

    const expDate = result.rows[0].expiration_date;
    if (!expDate) {
      return false; // No expiration date = never expires
    }

    return new Date(expDate) < new Date();
  } catch (error) {
    console.error('[VeraCredential] Error checking expiration:', error);
    return true; // On error, consider expired for safety
  }
}

/**
 * Update existing credential
 * @param {string} userId - User ID
 * @param {string} credentialId - Credential ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated credential
 */
export async function updateCredential(userId, credentialId, updates) {
  try {
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (updates.password) {
      const encryptedPassword = VeraEncryptionService.encryptPassword(updates.password);
      updateFields.push(`password_encrypted = $${paramIndex++}`);
      updateValues.push(encryptedPassword);
    }

    if (updates.username) {
      updateFields.push(`username = $${paramIndex++}`);
      updateValues.push(updates.username);
    }

    if (updates.access_level !== undefined) {
      updateFields.push(`access_level = $${paramIndex++}`);
      updateValues.push(updates.access_level);
    }

    if (updates.membership_type !== undefined) {
      updateFields.push(`membership_type = $${paramIndex++}`);
      updateValues.push(updates.membership_type);
    }

    if (updates.organization !== undefined) {
      updateFields.push(`organization = $${paramIndex++}`);
      updateValues.push(updates.organization);
    }

    if (updates.membership_number !== undefined) {
      updateFields.push(`membership_number = $${paramIndex++}`);
      updateValues.push(updates.membership_number);
    }

    if (updates.expiration_date !== undefined) {
      updateFields.push(`expiration_date = $${paramIndex++}`);
      updateValues.push(updates.expiration_date);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(userId, credentialId);

    const result = await queryPostgres(
      `UPDATE public.vera_credentials
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
       RETURNING id, website, username, access_level, membership_type, 
                 organization, membership_number, expiration_date, updated_at`,
      updateValues
    );

    if (result.rows.length === 0) {
      throw new Error('Credential not found or access denied');
    }

    // Log the update
    await logCredentialAudit(userId, credentialId, 'updated', { 
      website: result.rows[0].website,
      fields_updated: Object.keys(updates)
    });

    return result.rows[0];
  } catch (error) {
    console.error('[VeraCredential] Error updating credential:', error);
    throw error;
  }
}

/**
 * Delete/revoke credential (soft delete)
 * @param {string} userId - User ID
 * @param {string} credentialId - Credential ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteCredential(userId, credentialId) {
  try {
    const result = await queryPostgres(
      `UPDATE public.vera_credentials
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [credentialId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Credential not found or access denied');
    }

    // Log the deletion
    await logCredentialAudit(userId, credentialId, 'deleted', {});

    return true;
  } catch (error) {
    console.error('[VeraCredential] Error deleting credential:', error);
    throw error;
  }
}

/**
 * Check if credential exists for a website
 * @param {string} userId - User ID
 * @param {string} website - Website identifier
 * @returns {Promise<Object|null>} Credential info (without password)
 */
export async function checkCredentialExists(userId, website) {
  try {
    const result = await queryPostgres(
      `SELECT id, website, access_level, membership_type, expiration_date, last_used
       FROM public.vera_credentials
       WHERE user_id = $1 AND website = $2 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, website]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const cred = result.rows[0];
    const isExpired = await isCredentialExpired(cred.id);

    return {
      exists: true,
      ...cred,
      is_expired: isExpired
    };
  } catch (error) {
    console.error('[VeraCredential] Error checking credential:', error);
    return null;
  }
}

/**
 * Get audit log for a credential
 * @param {string} userId - User ID
 * @param {string} credentialId - Credential ID
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>} Audit log entries
 */
export async function getCredentialAudit(userId, credentialId, limit = 50) {
  try {
    const result = await queryPostgres(
      `SELECT action, details, ip_address, timestamp
       FROM public.vera_credentials_audit
       WHERE credential_id = $1 AND user_id = $2
       ORDER BY timestamp DESC
       LIMIT $3`,
      [credentialId, userId, limit]
    );

    return result.rows;
  } catch (error) {
    console.error('[VeraCredential] Error getting audit log:', error);
    throw error;
  }
}

/**
 * Log credential action to audit trail
 * @param {string} userId - User ID
 * @param {string} credentialId - Credential ID
 * @param {string} action - Action type ('created', 'used', 'updated', 'deleted', 'accessed')
 * @param {Object} details - Additional details
 * @param {string} ipAddress - IP address (optional)
 * @returns {Promise<void>}
 */
export async function logCredentialAudit(userId, credentialId, action, details = {}, ipAddress = null) {
  try {
    await queryPostgres(
      `INSERT INTO public.vera_credentials_audit
       (credential_id, user_id, action, details, ip_address, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [credentialId, userId, action, JSON.stringify(details), ipAddress]
    );
  } catch (error) {
    // Don't throw - audit logging is non-critical
    console.error('[VeraCredential] Error logging audit:', error);
  }
}

