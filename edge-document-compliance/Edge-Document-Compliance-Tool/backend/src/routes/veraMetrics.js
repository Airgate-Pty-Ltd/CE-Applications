/**
 * VERA LLM Metrics Dashboard Routes
 * 
 * Provides endpoints for monitoring LLM performance, token usage,
 * cache performance, and overall system health.
 */

import express from 'express';
import * as VeraLLMMonitoring from '../services/vera/VeraLLMMonitoringService.js';
import * as VeraTokenService from '../services/vera/VeraTokenService.js';
import * as VeraResponseCache from '../services/vera/VeraResponseCacheService.js';
import { queryPostgres } from '../config/databases.js';

const router = express.Router();

/**
 * GET /api/vera/metrics/llm-performance
 * Get LLM performance metrics (latency, quality, error rates)
 */
router.get('/llm-performance', async (req, res) => {
  try {
    const { hours = 24, responseType = null } = req.query;
    const hoursNum = parseInt(hours, 10);

    // Get latency statistics
    const latency = await VeraLLMMonitoring.getAverageLatency(responseType, hoursNum);

    // Get overall performance stats
    const overall = await queryPostgres(
      `SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE success = true) as successful_requests,
        COUNT(*) FILTER (WHERE success = false) as failed_requests,
        AVG(duration_ms) as avg_duration_ms,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as median_duration_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms,
        AVG(quality_score) as avg_quality_score,
        AVG(user_satisfaction) as avg_user_satisfaction
       FROM public.vera_ollama_performance
       WHERE timestamp > NOW() - INTERVAL '${hoursNum} hours'
       ${responseType ? `AND response_type = '${responseType}'` : ''}`
    );

    // Get error rate by response type
    const errorRates = await queryPostgres(
      `SELECT 
        response_type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE success = false) as failed,
        ROUND(COUNT(*) FILTER (WHERE success = false) * 100.0 / COUNT(*), 2) as error_rate_percent
       FROM public.vera_ollama_performance
       WHERE timestamp > NOW() - INTERVAL '${hoursNum} hours'
       GROUP BY response_type
       ORDER BY error_rate_percent DESC`
    );

    res.json({
      success: true,
      period: `${hoursNum} hours`,
      responseType: responseType || 'all',
      overall: overall.rows[0] || {},
      latency: latency,
      errorRates: errorRates.rows,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('[VeraMetrics] Error getting LLM performance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vera/metrics/token-usage
 * Get token usage statistics
 */
router.get('/token-usage', async (req, res) => {
  try {
    const { days = 7, userId = null, responseType = null } = req.query;
    const daysNum = parseInt(days, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Get token usage stats
    const stats = await VeraTokenService.getTokenUsageStats(
      userId || null,
      responseType || null,
      startDate,
      new Date()
    );

    // Get daily breakdown
    const daily = await queryPostgres(
      `SELECT 
        DATE(timestamp) as date,
        response_type,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(response_tokens) as total_response_tokens,
        SUM(total_tokens) as total_tokens,
        COUNT(*) as request_count,
        AVG(total_tokens) as avg_tokens_per_request
       FROM public.vera_token_usage
       WHERE timestamp > NOW() - INTERVAL '${daysNum} days'
       ${userId ? `AND user_id = '${userId}'` : ''}
       ${responseType ? `AND response_type = '${responseType}'` : ''}
       GROUP BY DATE(timestamp), response_type
       ORDER BY date DESC, total_tokens DESC`
    );

    // Get totals
    const totals = await queryPostgres(
      `SELECT 
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(response_tokens) as total_response_tokens,
        SUM(total_tokens) as total_tokens,
        COUNT(*) as total_requests,
        AVG(total_tokens) as avg_tokens_per_request
       FROM public.vera_token_usage
       WHERE timestamp > NOW() - INTERVAL '${daysNum} days'
       ${userId ? `AND user_id = '${userId}'` : ''}
       ${responseType ? `AND response_type = '${responseType}'` : ''}`
    );

    res.json({
      success: true,
      period: `${daysNum} days`,
      userId: userId || 'all',
      responseType: responseType || 'all',
      totals: totals.rows[0] || {},
      byResponseType: stats,
      daily: daily.rows,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('[VeraMetrics] Error getting token usage:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vera/metrics/cache-performance
 * Get cache hit rate and performance
 */
router.get('/cache-performance', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const hoursNum = parseInt(hours, 10);

    // Get cache stats
    const stats = await VeraResponseCache.getCacheStats();

    // Get cache hit rate
    const hitRate = await queryPostgres(
      `SELECT 
        COUNT(*) FILTER (WHERE hit_count > 0) as cached_responses,
        COUNT(*) as total_responses,
        ROUND(COUNT(*) FILTER (WHERE hit_count > 0) * 100.0 / NULLIF(COUNT(*), 0), 2) as hit_rate_percent,
        AVG(hit_count) as avg_hits_per_entry,
        MAX(hit_count) as max_hits
       FROM public.vera_response_cache
       WHERE created_at > NOW() - INTERVAL '${hoursNum} hours'`
    );

    // Get top cached responses
    const topCached = await queryPostgres(
      `SELECT 
        cache_key,
        response_type,
        hit_count,
        quality_score,
        created_at,
        last_accessed_at
       FROM public.vera_response_cache
       WHERE hit_count > 0
       ORDER BY hit_count DESC
       LIMIT 10`
    );

    // Get cache by response type
    const byType = await queryPostgres(
      `SELECT 
        response_type,
        COUNT(*) as total_entries,
        SUM(hit_count) as total_hits,
        AVG(hit_count) as avg_hits,
        AVG(quality_score) as avg_quality
       FROM public.vera_response_cache
       WHERE created_at > NOW() - INTERVAL '${hoursNum} hours'
       GROUP BY response_type
       ORDER BY total_hits DESC`
    );

    res.json({
      success: true,
      period: `${hoursNum} hours`,
      overall: stats,
      hitRate: hitRate.rows[0] || {},
      byResponseType: byType.rows,
      topCached: topCached.rows,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('[VeraMetrics] Error getting cache performance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vera/metrics/ollama-health
 * Get Ollama service health status
 */
router.get('/ollama-health', async (req, res) => {
  try {
    const { hours = 1 } = req.query;
    const hoursNum = parseInt(hours, 10);

    // Get recent performance
    const recent = await queryPostgres(
      `SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE success = true) as successful,
        COUNT(*) FILTER (WHERE success = false) as failed,
        AVG(duration_ms) as avg_latency_ms,
        MAX(duration_ms) as max_latency_ms,
        MIN(duration_ms) as min_latency_ms
       FROM public.vera_ollama_performance
       WHERE timestamp > NOW() - INTERVAL '${hoursNum} hours'`
    );

    // Detect issues
    const issues = await VeraLLMMonitoring.detectOllamaIssues();

    // Get error messages (if any)
    const errors = await queryPostgres(
      `SELECT 
        error_message,
        COUNT(*) as count,
        MAX(timestamp) as last_occurrence
       FROM public.vera_ollama_performance
       WHERE success = false
         AND timestamp > NOW() - INTERVAL '${hoursNum} hours'
         AND error_message IS NOT NULL
       GROUP BY error_message
       ORDER BY count DESC
       LIMIT 5`
    );

    const recentData = recent.rows[0] || {};
    const errorRate = recentData.total_requests > 0
      ? (recentData.failed / recentData.total_requests) * 100
      : 0;

    // Determine health status
    let healthStatus = 'healthy';
    if (errorRate > 10) {
      healthStatus = 'degraded';
    } else if (errorRate > 25) {
      healthStatus = 'unhealthy';
    } else if (recentData.avg_latency_ms > 10000) {
      healthStatus = 'slow';
    }

    res.json({
      success: true,
      healthStatus,
      period: `${hoursNum} hours`,
      recent: recentData,
      errorRate: errorRate.toFixed(2),
      issues: issues,
      recentErrors: errors.rows,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('[VeraMetrics] Error getting Ollama health:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      healthStatus: 'unknown'
    });
  }
});

/**
 * GET /api/vera/metrics/quality-trends
 * Get quality score trends over time
 */
router.get('/quality-trends', async (req, res) => {
  try {
    const { days = 30, responseType = null } = req.query;
    const daysNum = parseInt(days, 10);

    // Get quality trends
    const trends = await VeraLLMMonitoring.getQualityTrends(responseType, daysNum);

    // Get quality distribution
    const distribution = await queryPostgres(
      `SELECT 
        CASE
          WHEN quality_score >= 0.9 THEN 'excellent'
          WHEN quality_score >= 0.7 THEN 'good'
          WHEN quality_score >= 0.5 THEN 'acceptable'
          ELSE 'poor'
        END as quality_category,
        COUNT(*) as count,
        AVG(quality_score) as avg_quality
       FROM public.vera_ollama_performance
       WHERE timestamp > NOW() - INTERVAL '${daysNum} days'
         AND quality_score IS NOT NULL
       ${responseType ? `AND response_type = '${responseType}'` : ''}
       GROUP BY quality_category
       ORDER BY avg_quality DESC`
    );

    // Get quality by response type
    const byType = await queryPostgres(
      `SELECT 
        response_type,
        AVG(quality_score) as avg_quality,
        AVG(user_satisfaction) as avg_satisfaction,
        COUNT(*) as sample_count
       FROM public.vera_ollama_performance
       WHERE timestamp > NOW() - INTERVAL '${daysNum} days'
         AND quality_score IS NOT NULL
       GROUP BY response_type
       ORDER BY avg_quality DESC`
    );

    res.json({
      success: true,
      period: `${daysNum} days`,
      responseType: responseType || 'all',
      trends: trends,
      distribution: distribution.rows,
      byResponseType: byType.rows,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('[VeraMetrics] Error getting quality trends:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vera/metrics/dashboard
 * Get comprehensive dashboard data (all metrics)
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { hours = 24, days = 7 } = req.query;
    const hoursNum = parseInt(hours, 10);
    const daysNum = parseInt(days, 10);

    // Get all metrics in parallel
    const [performance, tokenUsage, cacheStats, health, qualityTrends] = await Promise.all([
      VeraLLMMonitoring.generatePerformanceReport(daysNum),
      VeraTokenService.getTokenUsageStats(null, null, new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000), new Date()),
      VeraResponseCache.getCacheStats(),
      VeraLLMMonitoring.detectOllamaIssues(),
      VeraLLMMonitoring.getQualityTrends(null, daysNum)
    ]);

    res.json({
      success: true,
      period: {
        hours: hoursNum,
        days: daysNum
      },
      performance,
      tokenUsage,
      cache: cacheStats,
      health: {
        issues: health,
        status: health.length === 0 ? 'healthy' : 'degraded'
      },
      qualityTrends,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('[VeraMetrics] Error generating dashboard:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

