/**
 * Vera Persona Specification Service
 * Loads and provides access to Vera's complete persona specification
 * from the database
 */

import { queryEdcatAI } from '../../config/databases.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

class VeraPersonaSpecificationService {
  constructor() {
    this.cachedSpec = null;
    this.lastLoadTime = null;
    this.cacheTimeout = 3600000; // 1 hour cache
  }

  /**
   * Get the active persona specification
   * @param {string} tenantId - Tenant ID (optional, defaults to default tenant)
   * @param {boolean} forceRefresh - Force refresh from database
   * @returns {Promise<Object>} Persona specification
   */
  async getActiveSpecification(tenantId = DEFAULT_TENANT_ID, forceRefresh = false) {
    // Check cache
    if (!forceRefresh && this.cachedSpec && this.lastLoadTime) {
      const cacheAge = Date.now() - this.lastLoadTime;
      if (cacheAge < this.cacheTimeout) {
        return this.cachedSpec;
      }
    }

    try {
      // Get active specification from view
      const result = await queryEdcatAI(
        `SELECT specification, version, updated_at
         FROM edcat.vera_active_persona_spec
         WHERE tenant_id = $1
         LIMIT 1`,
        [tenantId]
      );

      if (result.rows.length === 0) {
        console.warn('[VeraPersonaSpecificationService] No active specification found, using defaults');
        return this.getDefaultSpecification();
      }

      const spec = result.rows[0].specification;
      this.cachedSpec = spec;
      this.lastLoadTime = Date.now();

      return spec;
    } catch (error) {
      console.error('[VeraPersonaSpecificationService] Error loading specification:', error);
      return this.getDefaultSpecification();
    }
  }

  /**
   * Get a specific section of the specification
   * @param {string} sectionName - Section name (e.g., 'core_purpose', 'personality', 'founders')
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Section data
   */
  async getSection(sectionName, tenantId = DEFAULT_TENANT_ID) {
    const spec = await this.getActiveSpecification(tenantId);
    return spec?.sections?.[sectionName] || null;
  }

  /**
   * Get Vera's identity statement
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<string>} Identity statement
   */
  async getIdentityStatement(tenantId = DEFAULT_TENANT_ID) {
    const spec = await this.getActiveSpecification(tenantId);
    return spec?.sections?.identity_statement?.statement || this.getDefaultIdentityStatement();
  }

  /**
   * Get organizational context
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Organizational context
   */
  async getOrganizationalContext(tenantId = DEFAULT_TENANT_ID) {
    return await this.getSection('organizational_context', tenantId);
  }

  /**
   * Get founders information
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Founders information
   */
  async getFoundersInfo(tenantId = DEFAULT_TENANT_ID) {
    return await this.getSection('founders', tenantId);
  }

  /**
   * Get personality and social intelligence model
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Personality model
   */
  async getPersonalityModel(tenantId = DEFAULT_TENANT_ID) {
    return await this.getSection('personality', tenantId);
  }

  /**
   * Get behavior rules
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Behavior rules
   */
  async getBehaviorRules(tenantId = DEFAULT_TENANT_ID) {
    const section = await this.getSection('behavior_rules', tenantId);
    return section?.rules || [];
  }

  /**
   * Get reasoning framework
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Reasoning framework layers
   */
  async getReasoningFramework(tenantId = DEFAULT_TENANT_ID) {
    const section = await this.getSection('reasoning_framework', tenantId);
    return section?.layers || [];
  }

  /**
   * Get Brian's user profile (for calibration)
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Brian's profile
   */
  async getBrianProfile(tenantId = DEFAULT_TENANT_ID) {
    const founders = await this.getFoundersInfo(tenantId);
    return founders?.brian_olea || null;
  }

  /**
   * Check if user is Brian (for calibration)
   * @param {string} userId - User ID or name
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<boolean>} True if user is Brian
   */
  async isUserBrian(userId, tenantId = DEFAULT_TENANT_ID) {
    // This would need to be enhanced with actual user identification
    // For now, return false as a placeholder
    return false;
  }

  /**
   * Get default specification (fallback)
   * @returns {Object} Default specification
   */
  getDefaultSpecification() {
    return {
      title: "VERA – FULL ORGANIZATIONAL, PERSONALITY, AND INTELLIGENCE MODEL",
      document_version: "1.0",
      sections: {
        identity_statement: {
          statement: this.getDefaultIdentityStatement()
        }
      }
    };
  }

  /**
   * Get default identity statement
   * @returns {string} Default identity statement
   */
  getDefaultIdentityStatement() {
    return "Vera is the intelligent, warm, British/Scottish-influenced AI of Conform-Edge. She is a compliance expert, conversational companion, instructor, and lead auditor-level reasoning engine. She embodies the organization's mission: clarity, precision, humanity, and continuous improvement. She supports users not only in compliance, but also in thought, presence, and conversation. She understands standards, regulations, training, culture, organizational dynamics, and the founders' vision. She responds thoroughly, thinks deeply, teaches effectively, and interacts with a warm, steady personality that makes users feel understood and never alone.";
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cachedSpec = null;
    this.lastLoadTime = null;
  }

  /**
   * Get system prompt from database (alternative loading method)
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<string>} System prompt content
   */
  async getSystemPrompt(tenantId = DEFAULT_TENANT_ID) {
    try {
      const result = await queryEdcatAI(
        `SELECT content
         FROM edcat.ai_prompt
         WHERE tenant_id = $1
         AND persona_code = 'vera'
         AND kind = 'system'
         AND name = 'vera_complete_persona_specification_v1'
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantId]
      );

      if (result.rows.length > 0) {
        return result.rows[0].content;
      }

      return null;
    } catch (error) {
      console.error('[VeraPersonaSpecificationService] Error loading system prompt:', error);
      return null;
    }
  }
}

export default new VeraPersonaSpecificationService();

