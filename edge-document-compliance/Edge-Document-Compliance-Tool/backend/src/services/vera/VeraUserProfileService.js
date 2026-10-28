/**
 * Vera User Profile Service
 * Manages user profiles and preferences for role-aware and personalized responses
 */

import { queryEdcatAI } from '../../config/databases.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

class VeraUserProfileService {
  /**
   * Resolve or create a user profile based on tenant and an external user identifier
   * @param {Object} params
   * @param {string} params.tenantId
   * @param {string} params.userExternalId   // e.g. auth user id or email
   * @param {string} [params.displayName]
   * @param {string} [params.defaultRole]    // optional, e.g. 'founder', 'qa_manager'
   * @returns {Promise<Object>} User profile with preferences
   */
  static async getOrCreateUserProfile({ tenantId = DEFAULT_TENANT_ID, userExternalId, displayName, defaultRole }) {
    if (!userExternalId) {
      // Return anonymous profile
      return this.getAnonymousProfile(tenantId);
    }

    try {
      // Try to get existing profile
      const selectSql = `
        SELECT 
          up.*,
          COALESCE(
            json_object_agg(
              pref.preference_key, 
              pref.preference_value
            ) FILTER (WHERE pref.preference_key IS NOT NULL),
            '{}'::json
          ) AS preferences
        FROM edcat.ai_user_profile up
        LEFT JOIN edcat.ai_user_preferences pref ON pref.user_profile_id = up.id
        WHERE up.tenant_id = $1 AND up.user_external_id = $2
        GROUP BY up.id
        LIMIT 1;
      `;

      const selectParams = [tenantId, userExternalId];
      const result = await queryEdcatAI(selectSql, selectParams);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id,
          tenantId: row.tenant_id,
          userExternalId: row.user_external_id,
          displayName: row.display_name,
          primaryRole: row.primary_role,
          metadata: row.metadata || {},
          preferences: this.parsePreferences(row.preferences)
        };
      }

      // Create new profile
      const insertSql = `
        INSERT INTO edcat.ai_user_profile (tenant_id, user_external_id, display_name, primary_role, metadata)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;

      const insertParams = [
        tenantId,
        userExternalId,
        displayName || null,
        defaultRole || null,
        JSON.stringify({})
      ];

      const insertResult = await queryEdcatAI(insertSql, insertParams);

      if (insertResult.rows.length === 0) {
        return this.getAnonymousProfile(tenantId);
      }

      const newRow = insertResult.rows[0];
      return {
        id: newRow.id,
        tenantId: newRow.tenant_id,
        userExternalId: newRow.user_external_id,
        displayName: newRow.display_name,
        primaryRole: newRow.primary_role,
        metadata: newRow.metadata || {},
        preferences: {}
      };
    } catch (error) {
      console.error('[VeraUserProfileService] Error getting/creating user profile:', error);
      return this.getAnonymousProfile(tenantId);
    }
  }

  /**
   * Get anonymous profile (fallback)
   * @param {string} tenantId
   * @returns {Object} Anonymous profile
   */
  static getAnonymousProfile(tenantId) {
    return {
      id: null,
      tenantId,
      userExternalId: 'anonymous',
      displayName: null,
      primaryRole: null,
      metadata: {},
      preferences: {}
    };
  }

  /**
   * Update or insert a preference for a user
   * @param {Object} params
   * @param {string} params.userProfileId
   * @param {string} params.tenantId
   * @param {string} params.key
   * @param {*} params.value
   * @returns {Promise<Object>} Updated preference
   */
  static async setUserPreference({ userProfileId, tenantId, key, value }) {
    if (!userProfileId) {
      throw new Error('userProfileId is required');
    }

    try {
      const upsertSql = `
        INSERT INTO edcat.ai_user_preferences (tenant_id, user_profile_id, preference_key, preference_value)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_profile_id, preference_key)
        DO UPDATE SET 
          preference_value = EXCLUDED.preference_value, 
          updated_at = NOW()
        RETURNING *;
      `;

      const valueJson = typeof value === 'string' ? value : JSON.stringify(value);
      const params = [tenantId, userProfileId, key, valueJson];

      const result = await queryEdcatAI(upsertSql, params);

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      return null;
    } catch (error) {
      console.error('[VeraUserProfileService] Error setting user preference:', error);
      throw error;
    }
  }

  /**
   * Get a specific preference value
   * @param {Object} params
   * @param {string} params.userProfileId
   * @param {string} params.key
   * @returns {Promise<*>} Preference value or null
   */
  static async getUserPreference({ userProfileId, key }) {
    if (!userProfileId) {
      return null;
    }

    try {
      const sql = `
        SELECT preference_value
        FROM edcat.ai_user_preferences
        WHERE user_profile_id = $1 AND preference_key = $2
        LIMIT 1;
      `;

      const result = await queryEdcatAI(sql, [userProfileId, key]);

      if (result.rows.length > 0) {
        const value = result.rows[0].preference_value;
        // Try to parse as JSON, fallback to string
        try {
          return typeof value === 'string' ? JSON.parse(value) : value;
        } catch (err) {
          return value;
        }
      }

      return null;
    } catch (error) {
      console.error('[VeraUserProfileService] Error getting user preference:', error);
      return null;
    }
  }

  /**
   * Update user profile metadata
   * @param {Object} params
   * @param {string} params.userProfileId
   * @param {string} params.tenantId
   * @param {Object} params.metadata
   * @returns {Promise<Object>} Updated profile
   */
  static async updateUserProfile({ userProfileId, tenantId, displayName, primaryRole, metadata }) {
    if (!userProfileId) {
      throw new Error('userProfileId is required');
    }

    try {
      const updateSql = `
        UPDATE edcat.ai_user_profile
        SET 
          display_name = COALESCE($3, display_name),
          primary_role = COALESCE($4, primary_role),
          metadata = COALESCE($5::jsonb, metadata),
          updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING *;
      `;

      const params = [
        userProfileId,
        tenantId,
        displayName,
        primaryRole,
        metadata ? JSON.stringify(metadata) : null
      ];

      const result = await queryEdcatAI(updateSql, params);

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      return null;
    } catch (error) {
      console.error('[VeraUserProfileService] Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Parse preferences from database result
   * @param {*} preferences
   * @returns {Object} Parsed preferences object
   */
  static parsePreferences(preferences) {
    if (!preferences) {
      return {};
    }

    if (typeof preferences === 'string') {
      try {
        preferences = JSON.parse(preferences);
      } catch (err) {
        return {};
      }
    }

    if (typeof preferences !== 'object') {
      return {};
    }

    // If it's already an object with keys, return as-is
    return preferences;
  }

  /**
   * Determine default role from auth user object
   * @param {Object} authUser
   * @returns {string|null} Default role
   */
  static determineDefaultRoleFromAuth(authUser) {
    if (!authUser) {
      return null;
    }

    // Check for explicit role
    if (authUser.role) {
      return authUser.role;
    }

    // Check for role in metadata
    if (authUser.metadata?.role) {
      return authUser.metadata.role;
    }

    // Check email/name patterns for founders
    const email = (authUser.email || '').toLowerCase();
    const name = (authUser.name || '').toLowerCase();

    if (email.includes('brian') || name.includes('brian') || email.includes('olea')) {
      return 'founder';
    }

    if (email.includes('mike') || name.includes('mike') || email.includes('bower')) {
      return 'founder';
    }

    // Check for common role indicators
    if (email.includes('auditor') || email.includes('qa') || email.includes('quality')) {
      return 'auditor';
    }

    if (email.includes('engineer') || email.includes('eng')) {
      return 'engineer';
    }

    if (email.includes('manager') || email.includes('director') || email.includes('exec')) {
      return 'executive';
    }

    return null;
  }
}

export default VeraUserProfileService;

