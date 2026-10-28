/**
 * VERA Credential Management Routes
 * 
 * Handles secure storage and retrieval of user credentials
 * for accessing gated/paid content
 */

import express from 'express';
import * as VeraCredentialService from '../services/vera/VeraCredentialService.js';
import VeraWebsiteLoginService from '../services/vera/VeraWebsiteLoginService.js';

const router = express.Router();

/**
 * POST /api/vera/credentials
 * Add new credentials for a website
 * 
 * Body: {
 *   website: "ansi.org",
 *   username: "user@example.com",
 *   password: "plaintext_password",
 *   metadata: {
 *     access_level: "member",
 *     membership_type: "ANSI",
 *     organization: "My Company",
 *     membership_number: "12345",
 *     expiration_date: "2025-12-31"
 *   }
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { website, username, password, metadata = {} } = req.body;
    const userId = req.user?.id || req.headers['x-user-id'] || req.body.userId || 'default';

    if (!website || !username || !password) {
      return res.status(400).json({
        error: 'website, username, and password are required',
        example: {
          website: 'ansi.org',
          username: 'user@example.com',
          password: 'your_password',
          metadata: {
            access_level: 'member',
            membership_type: 'ANSI',
            organization: 'My Company',
            expiration_date: '2025-12-31'
          }
        }
      });
    }

    // Validate website format
    if (!website.match(/^[a-z0-9.-]+\.[a-z]{2,}$/i)) {
      return res.status(400).json({
        error: 'Invalid website format',
        example: 'ansi.org, asq.org, iso.org'
      });
    }

    // Test login to verify credentials work
    console.log(`[VeraCredentials] Verifying credentials for ${website}...`);
    const loginTest = await VeraWebsiteLoginService.loginToWebsite(website, username, password);
    
    if (!loginTest.success && !loginTest.publicAccess) {
      return res.status(400).json({
        success: false,
        error: 'LOGIN_VERIFICATION_FAILED',
        message: `Login verification failed: ${loginTest.message}`,
        action: loginTest.action,
        suggestion: 'Please check your username and password are correct',
        details: {
          website: website,
          test_result: loginTest
        }
      });
    }
    
    console.log(`[VeraCredentials] ✅ Credentials verified for ${website}`);

    // Store credentials
    const credential = await VeraCredentialService.storeCredential(
      userId,
      website,
      username,
      password,
      {
        url: metadata.url || `https://${website}`,
        access_level: metadata.access_level,
        membership_type: metadata.membership_type,
        organization: metadata.organization,
        membership_number: metadata.membership_number,
        expiration_date: metadata.expiration_date
      }
    );

    res.json({
      success: true,
      verified: true,
      id: credential.id,
      website: credential.website,
      username: credential.username,
      access_level: credential.access_level,
      membership_type: credential.membership_type,
      expiration_date: credential.expiration_date,
      created_at: credential.created_at,
      message: `✅ Credentials verified and stored securely for ${website}`,
      verification_result: {
        success: true,
        message: loginTest.publicAccess 
          ? `${website} is publicly accessible - no login needed`
          : `Successfully logged into ${website}`,
        login_time: loginTest.loginTime || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[VeraCredentials] Error storing credential:', error);
    res.status(500).json({
      error: 'Failed to store credentials',
      message: error.message
    });
  }
});

/**
 * GET /api/vera/credentials
 * List all stored credentials (without passwords)
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'] || req.body.userId || 'default';

    const credentials = await VeraCredentialService.listCredentials(userId);

    res.json({
      success: true,
      credentials: credentials,
      count: credentials.length
    });
  } catch (error) {
    console.error('[VeraCredentials] Error listing credentials:', error);
    res.status(500).json({
      error: 'Failed to list credentials',
      message: error.message
    });
  }
});

/**
 * GET /api/vera/credentials/:website
 * Check if credential exists for a website
 */
router.get('/:website', async (req, res) => {
  try {
    const { website } = req.params;
    const userId = req.user?.id || req.headers['x-user-id'] || req.body.userId || 'default';

    const credential = await VeraCredentialService.checkCredentialExists(userId, website);

    if (!credential) {
      return res.json({
        exists: false,
        website: website,
        message: `No credentials stored for ${website}`
      });
    }

    res.json({
      exists: true,
      website: credential.website,
      access_level: credential.access_level,
      membership_type: credential.membership_type,
      expiration_date: credential.expiration_date,
      is_expired: credential.is_expired,
      last_used: credential.last_used
    });
  } catch (error) {
    console.error('[VeraCredentials] Error checking credential:', error);
    res.status(500).json({
      error: 'Failed to check credential',
      message: error.message
    });
  }
});

/**
 * PUT /api/vera/credentials/:credentialId
 * Update existing credential
 */
router.put('/:credentialId', async (req, res) => {
  try {
    const { credentialId } = req.params;
    const { password, username, ...metadata } = req.body;
    const userId = req.user?.id || req.headers['x-user-id'] || req.body.userId || 'default';

    const updates = {};
    if (password) updates.password = password;
    if (username) updates.username = username;
    if (metadata.access_level) updates.access_level = metadata.access_level;
    if (metadata.membership_type) updates.membership_type = metadata.membership_type;
    if (metadata.organization) updates.organization = metadata.organization;
    if (metadata.membership_number) updates.membership_number = metadata.membership_number;
    if (metadata.expiration_date) updates.expiration_date = metadata.expiration_date;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No fields to update'
      });
    }

    const credential = await VeraCredentialService.updateCredential(userId, credentialId, updates);

    res.json({
      success: true,
      credential: credential,
      message: 'Credential updated successfully'
    });
  } catch (error) {
    console.error('[VeraCredentials] Error updating credential:', error);
    res.status(500).json({
      error: 'Failed to update credential',
      message: error.message
    });
  }
});

/**
 * DELETE /api/vera/credentials/:credentialId
 * Delete/revoke credential (soft delete)
 */
router.delete('/:credentialId', async (req, res) => {
  try {
    const { credentialId } = req.params;
    const userId = req.user?.id || req.headers['x-user-id'] || req.body.userId || 'default';

    await VeraCredentialService.deleteCredential(userId, credentialId);

    res.json({
      success: true,
      message: 'Credential deleted successfully',
      deleted_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[VeraCredentials] Error deleting credential:', error);
    res.status(500).json({
      error: 'Failed to delete credential',
      message: error.message
    });
  }
});

/**
 * GET /api/vera/credentials/:credentialId/audit
 * Get audit log for a credential
 */
router.get('/:credentialId/audit', async (req, res) => {
  try {
    const { credentialId } = req.params;
    const userId = req.user?.id || req.headers['x-user-id'] || req.body.userId || 'default';
    const limit = parseInt(req.query.limit || '50', 10);

    const auditLog = await VeraCredentialService.getCredentialAudit(userId, credentialId, limit);

    res.json({
      success: true,
      credential_id: credentialId,
      audit_log: auditLog,
      count: auditLog.length
    });
  } catch (error) {
    console.error('[VeraCredentials] Error getting audit log:', error);
    res.status(500).json({
      error: 'Failed to get audit log',
      message: error.message
    });
  }
});

/**
 * POST /api/vera/credentials/:credentialId/test
 * Test credential by attempting login
 */
router.post('/:credentialId/test', async (req, res) => {
  try {
    const { credentialId } = req.params;
    const userId = req.user?.id || req.headers['x-user-id'] || req.body.userId || 'default';

    // Get credential by ID
    const { queryPostgres } = await import('../database/connection.js');
    const credResult = await queryPostgres(
      `SELECT * FROM public.vera_credentials WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [credentialId, userId]
    );

    if (credResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Credential not found'
      });
    }

    const cred = credResult.rows[0];
    
    // Decrypt password
    const VeraEncryptionService = (await import('../services/vera/VeraEncryptionService.js')).default;
    const password = VeraEncryptionService.decryptPassword(cred.password_encrypted);

    // Test login
    const loginTest = await VeraWebsiteLoginService.loginToWebsite(cred.website, cred.username, password);

    res.json({
      success: loginTest.success,
      website: cred.website,
      test_result: loginTest,
      message: loginTest.message
    });
  } catch (error) {
    console.error('[VeraCredentials] Error testing credential:', error);
    res.status(500).json({
      error: 'Failed to test credential',
      message: error.message
    });
  }
});

export default router;

