/**
 * ComplianceGap Analysis Controller
 * API endpoints for gap analysis operations
 */

import * as analyzerService from '../services/analyzer.js';
import { queryPostgres } from '../../config/databases.js';

/**
 * POST /api/compliancegap/analyze
 * Start a new gap analysis
 */
export async function startAnalysis(req, res) {
  try {
    const { customerId, standardId, documentIds } = req.body;

    if (!customerId || !standardId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customerId and standardId'
      });
    }

    const analysis = await analyzerService.analyzeGaps(customerId, standardId, documentIds);

    res.json({
      success: true,
      analysis: analysis
    });
  } catch (error) {
    console.error('[ComplianceGap] Start analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/compliancegap/analysis/:analysisId
 * Get analysis results
 */
export async function getAnalysis(req, res) {
  try {
    const { analysisId } = req.params;

    const analysis = await analyzerService.getAnalysis(analysisId);

    res.json({
      success: true,
      analysis: analysis
    });
  } catch (error) {
    console.error('[ComplianceGap] Get analysis error:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/compliancegap/analyses
 * List analyses for a customer
 */
export async function listAnalyses(req, res) {
  try {
    const customerId = req.query.customerId || req.headers['x-customer-id'];

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'customerId required (query param or X-Customer-Id header)'
      });
    }

    const limit = parseInt(req.query.limit || '50', 10);
    const analyses = await analyzerService.listAnalyses(customerId, limit);

    res.json({
      success: true,
      analyses: analyses
    });
  } catch (error) {
    console.error('[ComplianceGap] List analyses error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/compliancegap/standards
 * List available compliance standards
 */
export async function listStandards(req, res) {
  try {
    const result = await queryPostgres(
      `SELECT id, code, name, version, authority_source, sector, description, is_active
       FROM public.compliance_standards
       WHERE is_active = TRUE
       ORDER BY code, name`
    );

    res.json({
      success: true,
      standards: result.rows
    });
  } catch (error) {
    console.error('[ComplianceGap] List standards error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/compliancegap/standards
 * Create a new compliance standard
 */
export async function createStandard(req, res) {
  try {
    const { code, name, version, authority_source, sector, description, document_url } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: code and name'
      });
    }

    const result = await queryPostgres(
      `INSERT INTO public.compliance_standards
       (code, name, version, authority_source, sector, description, document_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [code, name, version, authority_source, sector, description, document_url]
    );

    res.json({
      success: true,
      standard: result.rows[0]
    });
  } catch (error) {
    console.error('[ComplianceGap] Create standard error:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({
        success: false,
        error: `Standard with code '${req.body.code}' already exists`
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/compliancegap/analysis/:analysisId/clarifications
 * Get clarifications for an analysis
 */
export async function getClarifications(req, res) {
  try {
    const { analysisId } = req.params;

    const clarifications = await analyzerService.getClarifications(analysisId);

    res.json({
      success: true,
      clarifications: clarifications
    });
  } catch (error) {
    console.error('[ComplianceGap] Get clarifications error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/compliancegap/analysis/:analysisId/clarifications
 * Add a clarification question
 */
export async function addClarification(req, res) {
  try {
    const { analysisId } = req.params;
    const { questionText, requirementReference } = req.body;

    if (!questionText) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: questionText'
      });
    }

    const clarification = await analyzerService.addClarification(
      analysisId,
      questionText,
      requirementReference
    );

    res.json({
      success: true,
      clarification: clarification
    });
  } catch (error) {
    console.error('[ComplianceGap] Add clarification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/compliancegap/clarifications/:clarificationId/answer
 * Answer a clarification
 */
export async function answerClarification(req, res) {
  try {
    const { clarificationId } = req.params;
    const { answerText } = req.body;

    if (!answerText) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: answerText'
      });
    }

    const clarification = await analyzerService.answerClarification(clarificationId, answerText);

    res.json({
      success: true,
      clarification: clarification
    });
  } catch (error) {
    console.error('[ComplianceGap] Answer clarification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

