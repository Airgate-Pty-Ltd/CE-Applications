/**
 * VERA LLM Monitoring Service
 * 
 * Tracks LLM performance metrics, latency, token usage, and quality.
 * Provides analytics and alerts for system health.
 */

import { queryPostgres } from '../../config/databases.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Track Ollama performance metrics
 * @param {Object} metrics - Performance metrics
 * @returns {Promise<void>}
 */
export async function trackOllamaPerformance(metrics = {}) {
  const {
    userId = null,
    responseType = 'general_qa',
    duration = 0,
    promptTokens = 0,
    responseTokens = 0,
    qualityScore = null,
    userSatisfaction = null,
    success = true,
    errorMessage = null,
    tenantId = DEFAULT_TENANT_ID
  } = metrics;

  try {
    await queryPostgres(
      `INSERT INTO public.vera_ollama_performance
       (timestamp, response_type, duration_ms, prompt_tokens, response_tokens,
        total_tokens, quality_score, user_satisfaction, success, error_message, tenant_id)
       VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        responseType,
        duration,
        promptTokens,
        responseTokens,
        promptTokens + responseTokens,
        qualityScore,
        userSatisfaction,
        success,
        errorMessage,
        tenantId
      ]
    );
  } catch (error) {
    console.error('[VeraLLMMonitoring] Error tracking performance:', error);
    // Don't throw - monitoring is non-critical
  }
}

/**
 * Get average latency for response type
 * @param {string} responseType - Response type (optional)
 * @param {number} hours - Hours to look back (default 24)
 * @returns {Promise<Object>} Latency statistics
 */
export async function getAverageLatency(responseType = null, hours = 24) {
  try {
    let query = `
      SELECT 
        response_type,
        AVG(duration_ms) as avg_latency_ms,
        MIN(duration_ms) as min_latency_ms,
        MAX(duration_ms) as max_latency_ms,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as median_latency_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_latency_ms,
        COUNT(*) as request_count
      FROM public.vera_ollama_performance
      WHERE timestamp > NOW() - INTERVAL '${hours} hours'
        AND success = true
    `;
    
    const params = [];
    if (responseType) {
      query += ` AND response_type = $1`;
      params.push(responseType);
    }
    
    query += ` GROUP BY response_type ORDER BY avg_latency_ms DESC`;
    
    const result = await queryPostgres(query, params);
    return result.rows;
  } catch (error) {
    console.error('[VeraLLMMonitoring] Error getting latency stats:', error);
    return [];
  }
}

/**
 * Get token usage per day
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Daily token usage
 */
export async function getTokenUsagePerDay(days = 7) {
  try {
    const result = await queryPostgres(
      `SELECT 
        DATE(timestamp) as date,
        response_type,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(response_tokens) as total_response_tokens,
        SUM(total_tokens) as total_tokens,
        COUNT(*) as request_count
       FROM public.vera_ollama_performance
       WHERE timestamp > NOW() - INTERVAL '${days} days'
       GROUP BY DATE(timestamp), response_type
       ORDER BY date DESC, total_tokens DESC`
    );
    return result.rows;
  } catch (error) {
    console.error('[VeraLLMMonitoring] Error getting token usage:', error);
    return [];
  }
}

/**
 * Get quality trends
 * @param {string} responseType - Response type (optional)
 * @param {number} days - Days to look back
 * @returns {Promise<Array>} Quality trends
 */
export async function getQualityTrends(responseType = null, days = 30) {
  try {
    let query = `
      SELECT 
        DATE(timestamp) as date,
        response_type,
        AVG(quality_score) as avg_quality,
        AVG(user_satisfaction) as avg_satisfaction,
        COUNT(*) as sample_count
      FROM public.vera_ollama_performance
      WHERE timestamp > NOW() - INTERVAL '${days} days'
        AND quality_score IS NOT NULL
    `;
    
    const params = [];
    if (responseType) {
      query += ` AND response_type = $1`;
      params.push(responseType);
    }
    
    query += ` GROUP BY DATE(timestamp), response_type ORDER BY date DESC`;
    
    const result = await queryPostgres(query, params);
    return result.rows;
  } catch (error) {
    console.error('[VeraLLMMonitoring] Error getting quality trends:', error);
    return [];
  }
}

/**
 * Detect Ollama issues
 * @returns {Promise<Array>} Detected issues
 */
export async function detectOllamaIssues() {
  const issues = [];
  
  try {
    // Check error rate in last hour
    const errorRate = await queryPostgres(
      `SELECT 
        COUNT(*) FILTER (WHERE success = false) * 100.0 / COUNT(*) as error_rate
       FROM public.vera_ollama_performance
       WHERE timestamp > NOW() - INTERVAL '1 hour'`
    );
    
    if (errorRate.rows[0]?.error_rate > 10) {
      issues.push({
        severity: 'high',
        type: 'high_error_rate',
        message: `Error rate is ${errorRate.rows[0].error_rate.toFixed(1)}% in last hour`,
        timestamp: new Date()
      });
    }

    // Check latency degradation
    const latency = await getAverageLatency(null, 1);
    for (const row of latency) {
      if (row.avg_latency_ms > 10000) { // > 10 seconds
        issues.push({
          severity: 'medium',
          type: 'high_latency',
          message: `${row.response_type} has average latency of ${row.avg_latency_ms.toFixed(0)}ms`,
          timestamp: new Date()
        });
      }
    }

    // Check quality degradation
    const quality = await queryPostgres(
      `SELECT 
        response_type,
        AVG(quality_score) as avg_quality
       FROM public.vera_ollama_performance
       WHERE timestamp > NOW() - INTERVAL '24 hours'
         AND quality_score IS NOT NULL
       GROUP BY response_type
       HAVING AVG(quality_score) < 0.6`
    );
    
    for (const row of quality.rows) {
      issues.push({
        severity: 'medium',
        type: 'low_quality',
        message: `${row.response_type} has average quality score of ${row.avg_quality.toFixed(2)}`,
        timestamp: new Date()
      });
    }

  } catch (error) {
    console.error('[VeraLLMMonitoring] Error detecting issues:', error);
  }

  return issues;
}

/**
 * Generate performance report
 * @param {number} days - Days to include in report
 * @returns {Promise<Object>} Performance report
 */
export async function generatePerformanceReport(days = 7) {
  try {
    const latency = await getAverageLatency(null, days * 24);
    const tokenUsage = await getTokenUsagePerDay(days);
    const qualityTrends = await getQualityTrends(null, days);
    const issues = await detectOllamaIssues();
    
    // Get overall stats
    const overall = await queryPostgres(
      `SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE success = true) as successful_requests,
        COUNT(*) FILTER (WHERE success = false) as failed_requests,
        AVG(duration_ms) as avg_duration_ms,
        AVG(quality_score) as avg_quality_score,
        SUM(total_tokens) as total_tokens_used
       FROM public.vera_ollama_performance
       WHERE timestamp > NOW() - INTERVAL '${days} days'`
    );

    return {
      period: `${days} days`,
      overall: overall.rows[0] || {},
      latency: latency,
      tokenUsage: tokenUsage,
      qualityTrends: qualityTrends,
      issues: issues,
      generatedAt: new Date()
    };
  } catch (error) {
    console.error('[VeraLLMMonitoring] Error generating report:', error);
    return {
      period: `${days} days`,
      error: error.message,
      generatedAt: new Date()
    };
  }
}

export default {
  trackOllamaPerformance,
  getAverageLatency,
  getTokenUsagePerDay,
  getQualityTrends,
  detectOllamaIssues,
  generatePerformanceReport
};

