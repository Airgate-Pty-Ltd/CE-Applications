/**
 * VERA Token Service
 * 
 * Manages token counting, budget allocation, and usage tracking.
 * Ensures responses fit within token limits and tracks usage for metrics.
 */

import { queryPostgres } from '../../config/databases.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Count tokens in text (simple estimation)
 * Rough estimation: 1 token ≈ 4 characters
 * For more accuracy, could use tiktoken or similar
 * @param {string} text - Text to count tokens for
 * @returns {Promise<number>} Estimated token count
 */
export async function countTokens(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  
  // Simple estimation: 1 token ≈ 4 characters
  // This is a rough estimate - for production, consider using tiktoken
  const estimatedTokens = Math.ceil(text.length / 4);
  
  return estimatedTokens;
}

/**
 * Ensure response fits in token budget
 * Trims context if needed to fit within maxTokens
 * @param {string} context - Context text
 * @param {number} maxTokens - Maximum tokens allowed
 * @returns {Promise<string>} Trimmed context that fits budget
 */
export async function ensureTokenBudget(context, maxTokens) {
  if (!context) return '';
  
  const contextTokens = await countTokens(context);
  const bufferTokens = 200; // Reserve for response
  const availableTokens = maxTokens - contextTokens - bufferTokens;
  
  if (availableTokens < 500) {
    // Trim context if needed
    return await trimContextToFitBudget(context, availableTokens + 200);
  }
  
  return context;
}

/**
 * Trim context to fit within token budget
 * @param {string} context - Context to trim
 * @param {number} maxTokens - Maximum tokens allowed
 * @returns {Promise<string>} Trimmed context
 */
async function trimContextToFitBudget(context, maxTokens) {
  const maxChars = maxTokens * 4; // Rough conversion
  
  if (context.length <= maxChars) {
    return context;
  }
  
  // Try to trim intelligently - keep beginning and end
  const keepStart = Math.floor(maxChars * 0.4);
  const keepEnd = Math.floor(maxChars * 0.4);
  const middle = maxChars - keepStart - keepEnd;
  
  const start = context.substring(0, keepStart);
  const end = context.substring(context.length - keepEnd);
  const middleText = context.substring(keepStart, context.length - keepEnd);
  
  // If middle is too long, truncate it
  const truncatedMiddle = middleText.length > middle 
    ? middleText.substring(0, middle) + '\n\n[... context truncated ...]\n\n'
    : middleText;
  
  return start + truncatedMiddle + end;
}

/**
 * Calculate actual tokens used in response
 * @param {string} response - Response text
 * @returns {Promise<number>} Token count
 */
export async function calculateResponseTokens(response) {
  return await countTokens(response);
}

/**
 * Track token usage for metrics
 * @param {string} userId - User ID
 * @param {string} responseType - Response type
 * @param {number} promptTokens - Tokens in prompt
 * @param {number} responseTokens - Tokens in response
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<void>}
 */
export async function trackTokenUsage(userId, responseType, promptTokens, responseTokens, tenantId = DEFAULT_TENANT_ID) {
  try {
    await queryPostgres(
      `INSERT INTO public.vera_token_usage
       (user_id, response_type, prompt_tokens, response_tokens, total_tokens, timestamp, tenant_id)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
      [userId, responseType, promptTokens, responseTokens, promptTokens + responseTokens, tenantId]
    );
  } catch (error) {
    console.error('[VeraTokenService] Error tracking token usage:', error);
    // Don't throw - token tracking is non-critical
  }
}

/**
 * Get token usage statistics
 * @param {string} userId - User ID (optional)
 * @param {string} responseType - Response type (optional)
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<Object>} Usage statistics
 */
export async function getTokenUsageStats(userId = null, responseType = null, startDate = null, endDate = null) {
  try {
    let query = `
      SELECT 
        response_type,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(response_tokens) as total_response_tokens,
        SUM(total_tokens) as total_tokens,
        COUNT(*) as request_count,
        AVG(total_tokens) as avg_tokens_per_request
      FROM public.vera_token_usage
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (userId) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }
    
    if (responseType) {
      query += ` AND response_type = $${paramIndex}`;
      params.push(responseType);
      paramIndex++;
    }
    
    if (startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    query += ` GROUP BY response_type ORDER BY total_tokens DESC`;
    
    const result = await queryPostgres(query, params);
    return result.rows;
  } catch (error) {
    console.error('[VeraTokenService] Error getting token usage stats:', error);
    return [];
  }
}

export default {
  countTokens,
  ensureTokenBudget,
  calculateResponseTokens,
  trackTokenUsage,
  getTokenUsageStats
};

