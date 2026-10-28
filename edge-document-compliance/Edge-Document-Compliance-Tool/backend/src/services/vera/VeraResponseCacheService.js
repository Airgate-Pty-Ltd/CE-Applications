/**
 * VERA Response Cache Service
 * 
 * Caches LLM responses to reduce API calls and improve response time.
 * Uses intelligent cache keys and expiration based on response type.
 */

import { queryPostgres } from '../../config/databases.js';
import crypto from 'crypto';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Generate cache key from query and response type
 * @param {string} query - User query
 * @param {string} responseType - Response type
 * @param {Object} context - Additional context (optional)
 * @returns {Promise<string>} Cache key
 */
export async function generateCacheKey(query, responseType, context = {}) {
  // Create hash of query + response type + relevant context
  const keyString = `${query}|${responseType}|${JSON.stringify(context)}`;
  const hash = crypto.createHash('sha256').update(keyString).digest('hex');
  return `vera_cache_${hash.substring(0, 32)}`;
}

/**
 * Check if cached response exists and is valid
 * @param {string} cacheKey - Cache key
 * @returns {Promise<Object|null>} Cached response or null
 */
export async function checkResponseCache(cacheKey) {
  try {
    const result = await queryPostgres(
      `SELECT response, quality_score, created_at, expires_at 
       FROM public.vera_response_cache
       WHERE cache_key = $1 AND expires_at > NOW()`,
      [cacheKey]
    );

    if (result.rows.length > 0) {
      const cached = result.rows[0];
      
      // Increment hit count
      await queryPostgres(
        `UPDATE public.vera_response_cache 
         SET hit_count = hit_count + 1,
             last_accessed_at = NOW()
         WHERE cache_key = $1`,
        [cacheKey]
      );

      return {
        response: cached.response,
        qualityScore: cached.quality_score,
        createdAt: cached.created_at,
        expiresAt: cached.expires_at,
        fromCache: true
      };
    }

    return null;
  } catch (error) {
    console.error('[VeraResponseCache] Error checking cache:', error);
    return null; // Don't fail on cache errors
  }
}

/**
 * Cache a response
 * @param {string} cacheKey - Cache key
 * @param {string} response - Response text
 * @param {number} expiryMinutes - Expiration in minutes
 * @param {string} responseType - Response type
 * @param {string} userId - User ID (optional)
 * @param {number} qualityScore - Quality score (optional)
 * @returns {Promise<void>}
 */
export async function cacheResponse(cacheKey, response, expiryMinutes = 60, responseType = null, userId = null, qualityScore = null) {
  try {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    await queryPostgres(
      `INSERT INTO public.vera_response_cache
       (cache_key, response, response_type, user_id, expires_at, quality_score, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (cache_key) DO UPDATE
       SET response = EXCLUDED.response,
           expires_at = EXCLUDED.expires_at,
           quality_score = COALESCE(EXCLUDED.quality_score, vera_response_cache.quality_score),
           hit_count = 0,
           last_accessed_at = NULL`,
      [cacheKey, response, responseType, userId, expiresAt, qualityScore]
    );
  } catch (error) {
    console.error('[VeraResponseCache] Error caching response:', error);
    // Don't throw - caching is non-critical
  }
}

/**
 * Check if cache entry is expired
 * @param {Object} cached - Cached entry
 * @returns {boolean} True if expired
 */
export function isCacheExpired(cached) {
  if (!cached || !cached.expires_at) {
    return true;
  }
  return new Date(cached.expires_at) < new Date();
}

/**
 * Clear expired cache entries
 * @returns {Promise<number>} Number of entries cleared
 */
export async function clearExpiredCache() {
  try {
    const result = await queryPostgres(
      `DELETE FROM public.vera_response_cache
       WHERE expires_at < NOW()`
    );
    return result.rowCount || 0;
  } catch (error) {
    console.error('[VeraResponseCache] Error clearing expired cache:', error);
    return 0;
  }
}

/**
 * Get cache statistics
 * @returns {Promise<Object>} Cache statistics
 */
export async function getCacheStats() {
  try {
    const stats = await queryPostgres(
      `SELECT 
        COUNT(*) as total_entries,
        SUM(hit_count) as total_hits,
        AVG(hit_count) as avg_hits_per_entry,
        COUNT(*) FILTER (WHERE expires_at > NOW()) as active_entries,
        COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_entries
       FROM public.vera_response_cache`
    );
    
    return stats.rows[0] || {};
  } catch (error) {
    console.error('[VeraResponseCache] Error getting cache stats:', error);
    return {};
  }
}

export default {
  generateCacheKey,
  checkResponseCache,
  cacheResponse,
  isCacheExpired,
  clearExpiredCache,
  getCacheStats
};

