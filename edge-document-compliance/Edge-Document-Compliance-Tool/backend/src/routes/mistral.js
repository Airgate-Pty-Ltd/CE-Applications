/**
 * Mistral API Routes
 * Provides endpoints for compliance analysis using Mistral 7B via Ollama
 */

import express from 'express';
import { getVeraMistralService } from '../services/vera-mistral-service.js';
import { createLogger } from '../utils/logger.js';

const router = express.Router();
const logger = createLogger('MISTRAL-ROUTES');

// Get service instance
const mistralService = getVeraMistralService();

/**
 * GET /api/mistral/health
 * Check Mistral/Ollama service health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await mistralService.health();
    
    if (health.status === 'ok') {
      return res.status(200).json({
        success: true,
        ...health
      });
    } else {
      return res.status(503).json({
        success: false,
        ...health,
        message: 'Mistral service is not available. Please ensure Ollama is running.'
      });
    }
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    return res.status(500).json({
      success: false,
      status: 'error',
      error: error.message
    });
  }
});

/**
 * POST /api/mistral/clarification
 * Generate a clarification question to determine if a procedure meets a requirement
 * 
 * Body: {
 *   requirement: string (required)
 *   procedure: string (required)
 * }
 */
router.post('/clarification', async (req, res) => {
  try {
    const { requirement, procedure } = req.body;
    
    // Input validation
    if (!requirement || typeof requirement !== 'string' || requirement.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid "requirement" field'
      });
    }
    
    if (!procedure || typeof procedure !== 'string' || procedure.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid "procedure" field'
      });
    }
    
    logger.info('Generating clarification question', {
      requirementLength: requirement.length,
      procedureLength: procedure.length
    });
    
    const result = await mistralService.generateClarificationQuestion(
      requirement.trim(),
      procedure.trim()
    );
    
    return res.status(200).json({
      success: true,
      question: result.question,
      tokensUsed: result.tokensUsed,
      model: result.model
    });
    
  } catch (error) {
    logger.error('Failed to generate clarification question', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate clarification question'
    });
  }
});

/**
 * POST /api/mistral/explain
 * Explain a requirement in simple terms
 * 
 * Body: {
 *   requirement: string (required)
 *   context: string (optional)
 * }
 */
router.post('/explain', async (req, res) => {
  try {
    const { requirement, context } = req.body;
    
    // Input validation
    if (!requirement || typeof requirement !== 'string' || requirement.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid "requirement" field'
      });
    }
    
    logger.info('Explaining requirement', {
      requirementLength: requirement.length,
      hasContext: !!context
    });
    
    const result = await mistralService.explainRequirement(
      requirement.trim(),
      context ? context.trim() : ''
    );
    
    return res.status(200).json({
      success: true,
      explanation: result.explanation,
      tokensUsed: result.tokensUsed,
      model: result.model
    });
    
  } catch (error) {
    logger.error('Failed to explain requirement', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to explain requirement'
    });
  }
});

/**
 * POST /api/mistral/gap-analysis
 * Analyze if a procedure covers a requirement
 * 
 * Body: {
 *   requirement: string (required)
 *   procedure: string (required)
 *   industry: string (optional)
 * }
 */
router.post('/gap-analysis', async (req, res) => {
  try {
    const { requirement, procedure, industry } = req.body;
    
    // Input validation
    if (!requirement || typeof requirement !== 'string' || requirement.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid "requirement" field'
      });
    }
    
    if (!procedure || typeof procedure !== 'string' || procedure.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid "procedure" field'
      });
    }
    
    logger.info('Analyzing gap', {
      requirementLength: requirement.length,
      procedureLength: procedure.length,
      industry: industry || 'not specified'
    });
    
    const result = await mistralService.analyzeGap(
      requirement.trim(),
      procedure.trim(),
      industry ? industry.trim() : ''
    );
    
    return res.status(200).json({
      success: true,
      analysis: result.analysis,
      tokensUsed: result.tokensUsed,
      model: result.model
    });
    
  } catch (error) {
    logger.error('Failed to analyze gap', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze gap'
    });
  }
});

/**
 * POST /api/mistral/generate-procedure
 * Generate procedure language from a requirement
 * 
 * Body: {
 *   requirement: string (required)
 *   context: string (optional)
 * }
 */
router.post('/generate-procedure', async (req, res) => {
  try {
    const { requirement, context } = req.body;
    
    // Input validation
    if (!requirement || typeof requirement !== 'string' || requirement.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid "requirement" field'
      });
    }
    
    logger.info('Generating procedure language', {
      requirementLength: requirement.length,
      hasContext: !!context
    });
    
    const result = await mistralService.generateProcedureLanguage(
      requirement.trim(),
      context ? context.trim() : ''
    );
    
    return res.status(200).json({
      success: true,
      suggestedLanguage: result.suggestedLanguage,
      tokensUsed: result.tokensUsed,
      model: result.model
    });
    
  } catch (error) {
    logger.error('Failed to generate procedure language', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate procedure language'
    });
  }
});

/**
 * GET /api/mistral/cache/stats
 * Get cache statistics (for debugging)
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = mistralService.getCacheStats();
    return res.status(200).json({
      success: true,
      cache: stats
    });
  } catch (error) {
    logger.error('Failed to get cache stats', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/mistral/cache/clear
 * Clear the response cache (for debugging)
 */
router.post('/cache/clear', async (req, res) => {
  try {
    mistralService.clearCache();
    return res.status(200).json({
      success: true,
      message: 'Cache cleared'
    });
  } catch (error) {
    logger.error('Failed to clear cache', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
