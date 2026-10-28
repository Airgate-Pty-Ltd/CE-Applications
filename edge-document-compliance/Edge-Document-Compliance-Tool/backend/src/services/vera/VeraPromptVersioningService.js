/**
 * VERA Prompt Versioning Service
 * 
 * Manages system prompt versions for A/B testing and optimization.
 * Tracks which prompts perform best for different response types.
 */

import { queryPostgres } from '../../config/databases.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Create a new prompt version
 * @param {Object} promptData - Prompt data
 * @returns {Promise<Object>} Created prompt version
 */
export async function createPromptVersion(promptData = {}) {
  const {
    versionNumber,
    responseType,
    systemPrompt,
    userPromptTemplate = null,
    tenantId = DEFAULT_TENANT_ID
  } = promptData;

  if (!versionNumber || !responseType || !systemPrompt) {
    throw new Error('versionNumber, responseType, and systemPrompt are required');
  }

  try {
    const result = await queryPostgres(
      `INSERT INTO public.vera_system_prompts
       (version_number, response_type, system_prompt, user_prompt_template, created_at, active, tenant_id)
       VALUES ($1, $2, $3, $4, NOW(), false, $5)
       RETURNING *`,
      [versionNumber, responseType, systemPrompt, userPromptTemplate, tenantId]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('[VeraPromptVersioning] Error creating prompt version:', error);
    throw error;
  }
}

/**
 * Activate a prompt version (deactivates others of same type)
 * @param {string} promptId - Prompt version ID
 * @param {string} responseType - Response type
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<boolean>} Success status
 */
export async function activatePrompt(promptId, responseType, tenantId = DEFAULT_TENANT_ID) {
  try {
    // Deactivate all prompts of this type
    await queryPostgres(
      `UPDATE public.vera_system_prompts
       SET active = false
       WHERE response_type = $1 AND tenant_id = $2`,
      [responseType, tenantId]
    );

    // Activate the specified prompt
    await queryPostgres(
      `UPDATE public.vera_system_prompts
       SET active = true
       WHERE id = $1 AND tenant_id = $2`,
      [promptId, tenantId]
    );

    return true;
  } catch (error) {
    console.error('[VeraPromptVersioning] Error activating prompt:', error);
    return false;
  }
}

/**
 * Get active prompt for response type
 * @param {string} responseType - Response type
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object|null>} Active prompt or null
 */
export async function getActivePrompt(responseType, tenantId = DEFAULT_TENANT_ID) {
  try {
    const result = await queryPostgres(
      `SELECT * FROM public.vera_system_prompts
       WHERE response_type = $1 
         AND active = true 
         AND tenant_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [responseType, tenantId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('[VeraPromptVersioning] Error getting active prompt:', error);
    return null;
  }
}

/**
 * Compare prompt performance
 * @param {string} responseType - Response type
 * @param {number} days - Days to look back
 * @returns {Promise<Array>} Comparison results
 */
export async function comparePrompts(responseType, days = 30) {
  try {
    // Get performance metrics grouped by prompt version
    const result = await queryPostgres(
      `SELECT 
        sp.version_number,
        sp.id as prompt_id,
        COUNT(p.id) as request_count,
        AVG(p.quality_score) as avg_quality,
        AVG(p.user_satisfaction) as avg_satisfaction,
        AVG(p.duration_ms) as avg_duration,
        AVG(p.total_tokens) as avg_tokens
       FROM public.vera_system_prompts sp
       LEFT JOIN public.vera_ollama_performance p 
         ON p.prompt_version_id = sp.id
       WHERE sp.response_type = $1
         AND p.timestamp > NOW() - INTERVAL '${days} days'
       GROUP BY sp.id, sp.version_number
       ORDER BY avg_quality DESC NULLS LAST`
    );

    return result.rows;
  } catch (error) {
    console.error('[VeraPromptVersioning] Error comparing prompts:', error);
    return [];
  }
}

/**
 * Track prompt performance
 * @param {string} promptVersionId - Prompt version ID
 * @param {Object} metrics - Performance metrics
 * @returns {Promise<void>}
 */
export async function trackPromptPerformance(promptVersionId, metrics = {}) {
  const {
    qualityScore = null,
    userSatisfaction = null,
    duration = null,
    tokens = null
  } = metrics;

  try {
    // Update prompt version with latest metrics
    await queryPostgres(
      `UPDATE public.vera_system_prompts
       SET accuracy_score = COALESCE($1, accuracy_score),
           user_satisfaction = COALESCE($2, user_satisfaction),
           tested = true
       WHERE id = $3`,
      [qualityScore, userSatisfaction, promptVersionId]
    );
  } catch (error) {
    console.error('[VeraPromptVersioning] Error tracking performance:', error);
    // Don't throw - tracking is non-critical
  }
}

/**
 * Get all prompt versions for a response type
 * @param {string} responseType - Response type
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} Prompt versions
 */
export async function getPromptVersions(responseType, tenantId = DEFAULT_TENANT_ID) {
  try {
    const result = await queryPostgres(
      `SELECT * FROM public.vera_system_prompts
       WHERE response_type = $1 AND tenant_id = $2
       ORDER BY created_at DESC`,
      [responseType, tenantId]
    );

    return result.rows;
  } catch (error) {
    console.error('[VeraPromptVersioning] Error getting prompt versions:', error);
    return [];
  }
}

export default {
  createPromptVersion,
  activatePrompt,
  getActivePrompt,
  comparePrompts,
  trackPromptPerformance,
  getPromptVersions
};

