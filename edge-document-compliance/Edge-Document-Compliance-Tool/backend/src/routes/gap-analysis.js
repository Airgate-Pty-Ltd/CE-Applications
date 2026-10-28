/**
 * GAP Analysis Engine API Routes
 * Provides endpoints for standards & regulatory gap analysis using the knowledge pack
 */

import express from 'express';
import { getGapAnalysisEngine } from '../services/gapAnalysisEngine.js';

const router = express.Router();

// Initialize engine on startup
let engineInitialized = false;

async function ensureEngineInitialized() {
  if (!engineInitialized) {
    const engine = getGapAnalysisEngine();
    try {
      await engine.initialize();
      engineInitialized = true;
    } catch (error) {
      console.error('Failed to initialize GAP Analysis Engine:', error.message);
      // Don't throw - allow endpoints to handle gracefully
    }
  }
}

/**
 * GET /api/gap-analysis/status
 * Get engine status and statistics
 */
router.get('/status', async (req, res) => {
  try {
    await ensureEngineInitialized();
    const engine = getGapAnalysisEngine();
    
    res.json({
      initialized: engine.initialized,
      learningBlocks: engine.learningBlocks.length,
      documentRelationships: engine.documentRelationships.length,
      standards: engine.standardsMetadata.length,
      clauseMappings: Object.keys(engine.clauseMappings).length
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get engine status', 
      message: error.message 
    });
  }
});

/**
 * POST /api/gap-analysis/analyze
 * Perform gap analysis between two standards
 * Body: { sourceStandard, targetStandard }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { sourceStandard, targetStandard } = req.body;

    if (!sourceStandard || !targetStandard) {
      return res.status(400).json({ 
        error: 'Missing required fields: sourceStandard and targetStandard' 
      });
    }

    await ensureEngineInitialized();
    const engine = getGapAnalysisEngine();
    
    const analysis = await engine.analyzeGap(sourceStandard, targetStandard);
    
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Gap analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to perform gap analysis', 
      message: error.message 
    });
  }
});

/**
 * POST /api/gap-analysis/search
 * Search learning blocks by query
 * Body: { query, filters: { standardCode, requirementType, clauseNumber, topK } }
 */
router.post('/search', async (req, res) => {
  try {
    const { query, filters = {} } = req.body;

    await ensureEngineInitialized();
    const engine = getGapAnalysisEngine();
    
    const results = await engine.searchLearningBlocks(query || '', filters);
    
    res.json({
      success: true,
      query: query || '',
      filters,
      results: results,
      count: results.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Failed to search learning blocks', 
      message: error.message 
    });
  }
});

/**
 * GET /api/gap-analysis/similar/:standardCode?
 * Find similar requirements to a given text
 * Query params: text (required), standardCode (optional), topK (optional, default 5)
 */
router.get('/similar', async (req, res) => {
  try {
    const { text, standardCode, topK = 5 } = req.query;

    if (!text) {
      return res.status(400).json({ 
        error: 'Missing required query parameter: text' 
      });
    }

    await ensureEngineInitialized();
    const engine = getGapAnalysisEngine();
    
    const similar = await engine.findSimilarRequirements(
      text, 
      standardCode || null, 
      parseInt(topK)
    );
    
    res.json({
      success: true,
      query: text,
      standardCode: standardCode || null,
      results: similar,
      count: similar.length
    });
  } catch (error) {
    console.error('Similar requirements search error:', error);
    res.status(500).json({ 
      error: 'Failed to find similar requirements', 
      message: error.message 
    });
  }
});

/**
 * GET /api/gap-analysis/mappings/:sourceStandard/:targetStandard
 * Get clause mappings between two standards
 */
router.get('/mappings/:sourceStandard/:targetStandard', async (req, res) => {
  try {
    const { sourceStandard, targetStandard } = req.params;

    await ensureEngineInitialized();
    const engine = getGapAnalysisEngine();
    
    const mappings = engine.findClauseMappings(sourceStandard, targetStandard);
    
    res.json({
      success: true,
      sourceStandard,
      targetStandard,
      mappings,
      count: mappings.length
    });
  } catch (error) {
    console.error('Mappings lookup error:', error);
    res.status(500).json({ 
      error: 'Failed to get clause mappings', 
      message: error.message 
    });
  }
});

/**
 * GET /api/gap-analysis/relationships/:standardCode
 * Get document relationships for a standard
 */
router.get('/relationships/:standardCode', async (req, res) => {
  try {
    const { standardCode } = req.params;

    await ensureEngineInitialized();
    const engine = getGapAnalysisEngine();
    
    const relationships = engine.findDocumentRelationships(standardCode);
    
    res.json({
      success: true,
      standardCode,
      relationships,
      count: relationships.length
    });
  } catch (error) {
    console.error('Relationships lookup error:', error);
    res.status(500).json({ 
      error: 'Failed to get document relationships', 
      message: error.message 
    });
  }
});

/**
 * GET /api/gap-analysis/audit-evidence/:standardCode/:clauseNumber
 * Get audit evidence requirements for a clause
 */
router.get('/audit-evidence/:standardCode/:clauseNumber', async (req, res) => {
  try {
    const { standardCode, clauseNumber } = req.params;

    await ensureEngineInitialized();
    const engine = getGapAnalysisEngine();
    
    const evidence = engine.getAuditEvidence(standardCode, clauseNumber);
    
    res.json({
      success: true,
      standardCode,
      clauseNumber,
      evidence,
      count: evidence.length
    });
  } catch (error) {
    console.error('Audit evidence lookup error:', error);
    res.status(500).json({ 
      error: 'Failed to get audit evidence', 
      message: error.message 
    });
  }
});

/**
 * GET /api/gap-analysis/standards
 * Get all standards metadata
 */
router.get('/standards', async (req, res) => {
  try {
    await ensureEngineInitialized();
    const engine = getGapAnalysisEngine();
    
    res.json({
      success: true,
      standards: engine.standardsMetadata,
      count: engine.standardsMetadata.length
    });
  } catch (error) {
    console.error('Standards lookup error:', error);
    res.status(500).json({ 
      error: 'Failed to get standards', 
      message: error.message 
    });
  }
});

/**
 * GET /api/gap-analysis/standards/:standardCode
 * Get metadata for a specific standard
 */
router.get('/standards/:standardCode', async (req, res) => {
  try {
    const { standardCode } = req.params;

    await ensureEngineInitialized();
    const engine = getGapAnalysisEngine();
    
    const metadata = engine.getStandardMetadata(standardCode);
    
    if (!metadata) {
      return res.status(404).json({ 
        error: `Standard not found: ${standardCode}` 
      });
    }

    const learningBlocks = engine.getLearningBlocksForStandard(standardCode);
    
    res.json({
      success: true,
      standard: metadata,
      learningBlocks: learningBlocks.length,
      clauses: [...new Set(learningBlocks.map(b => b.clause_number))].length
    });
  } catch (error) {
    console.error('Standard lookup error:', error);
    res.status(500).json({ 
      error: 'Failed to get standard metadata', 
      message: error.message 
    });
  }
});

export default router;

