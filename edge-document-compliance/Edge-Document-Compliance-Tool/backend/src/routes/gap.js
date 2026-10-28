/**
 * Gap Analysis Routes
 * Handle gap analysis, feedback, and learning
 */

import express from 'express';
import { queryPostgres } from '../config/databases.js';
import { v4 as uuidv4 } from 'uuid';
import { getComplianceGapAnalyzer } from '../services/complianceGapAnalyzer.js';
import { formatRequirementsList, formatRequirementsAsText, formatRequirementsAsMarkdown } from '../services/requirementsFormatter.js';

const router = express.Router();

/**
 * POST /api/gap/compliance
 * Perform compliance gap analysis for a customer against a standard
 * Body: { customerId, standardId, documentIds (optional), format (optional) }
 */
router.post('/compliance', async (req, res) => {
  try {
    const { customerId, standardId, documentIds = null, format = 'json', minConfidence = 0.7 } = req.body;

    if (!customerId || !standardId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customerId and standardId'
      });
    }

    const analyzer = getComplianceGapAnalyzer();
    const analysisResults = await analyzer.analyzeComplianceGaps(customerId, standardId, {
      documentIds: documentIds,
      minConfidence: parseFloat(minConfidence),
      includePartialMatches: true
    });

    // Generate report in requested format
    const report = analyzer.generateReport(analysisResults, format);

    res.json({
      success: true,
      analysis: analysisResults,
      report: report,
      format: format
    });
  } catch (error) {
    console.error('Compliance gap analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/gap/analyze
 * Run gap analysis and record trace
 */
router.post('/analyze', async (req, res) => {
  try {
    const { tenant_id, standard_code, clause_ref, target_document_ids, engine_config, candidates, result } = req.body;

    if (!tenant_id || !standard_code || !clause_ref || !target_document_ids) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tenant_id, standard_code, clause_ref, target_document_ids'
      });
    }

    // Record trace in public.gap_analyses table
    const traceId = uuidv4();
    try {
      await queryPostgres(
        `INSERT INTO public.gap_analyses 
         (id, tenant_id, standard_id, status, created_at)
         VALUES ($1, $2, $3, 'pending', NOW())
         ON CONFLICT (id) DO NOTHING`,
        [traceId, tenant_id, standard_code]
      );
    } catch (dbError) {
      console.error('[gap] Error recording trace:', dbError);
      // Continue even if trace recording fails
    }

    res.json({
      success: true,
      trace_id: traceId,
      message: 'Gap analysis trace recorded'
    });
  } catch (error) {
    console.error('Gap analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/gap/feedback
 * Record reviewer feedback on a gap analysis run
 */
router.post('/feedback', async (req, res) => {
  try {
    const { trace_id, final_status, notes, helpful_candidate_chunk_ids, unhelpful_chunk_ids, reviewer_id } = req.body;

    if (!trace_id || !final_status) {
      return res.status(400).json({
        success: false,
        error: 'trace_id and final_status are required'
      });
    }

    const validStatuses = ['covered', 'partially_covered', 'not_covered', 'insufficient_data'];
    if (!validStatuses.includes(final_status)) {
      return res.status(400).json({
        success: false,
        error: `final_status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Verify trace exists in public.gap_analyses
    const traceResult = await queryPostgres(
      `SELECT id FROM public.gap_analyses WHERE id = $1`,
      [trace_id]
    );

    if (traceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Trace not found'
      });
    }

    // Insert feedback into public.audit_trail (or create a feedback table if needed)
    // For now, we'll store feedback in the gap_analyses table metadata or audit_trail
    await queryPostgres(
      `INSERT INTO public.audit_trail
       (gap_analysis_id, action, details, created_at)
       VALUES ($1, 'feedback', $2, NOW())`,
      [
        trace_id,
        JSON.stringify({
          reviewer_id: reviewer_id || null,
          final_status: final_status,
          notes: notes || null,
          helpful_candidate_chunk_ids: helpful_candidate_chunk_ids || [],
          unhelpful_chunk_ids: unhelpful_chunk_ids || []
        })
      ]
    );

    res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/gap/tuning/:tenant_id/:standard_code/:clause_ref
 * Get approved tuning parameters for a clause
 */
router.get('/tuning/:tenant_id/:standard_code/:clause_ref', async (req, res) => {
  try {
    const { tenant_id, standard_code, clause_ref } = req.params;

    // Note: gap_tuning table doesn't exist in public schema yet
    // This endpoint will need to be updated when gap_tuning is migrated
    const result = await queryPostgres(
      `SELECT * FROM public.gap_analyses
       WHERE tenant_id = $1 AND standard_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenant_id, standard_code]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        tuning: null,
        message: 'No approved tuning found, using defaults'
      });
    }

    res.json({
      success: true,
      tuning: result.rows[0]
    });
  } catch (error) {
    console.error('Get tuning error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/gap/tuning/proposed
 * Get all proposed (unapproved) tunings for admin review
 */
router.get('/tuning/proposed', async (req, res) => {
  try {
    // Note: gap_tuning table doesn't exist in public schema yet
    // Return empty for now
    const result = { rows: [] };

    res.json({
      success: true,
      proposed_tunings: result.rows
    });
  } catch (error) {
    console.error('Get proposed tunings error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/gap/tuning/:id/approve
 * Approve a tuning proposal
 */
router.post('/tuning/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_by } = req.body;

    // Note: gap_tuning table doesn't exist in public schema yet
    return res.status(501).json({
      success: false,
      error: 'Gap tuning not yet migrated to public schema'
    });
  } catch (error) {
    console.error('Approve tuning error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/gap/tuning/:id/reject
 * Reject a tuning proposal
 */
router.post('/tuning/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;

    // Note: gap_tuning table doesn't exist in public schema yet
    return res.status(501).json({
      success: false,
      error: 'Gap tuning not yet migrated to public schema'
    });
  } catch (error) {
    console.error('Reject tuning error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/gap/tuning/:id/revert
 * Revert to a previous version (mark it approved, unapprove newer ones)
 */
router.post('/tuning/:id/revert', async (req, res) => {
  try {
    const { id } = req.params;

    // Note: gap_tuning table doesn't exist in public schema yet
    return res.status(501).json({
      success: false,
      error: 'Gap tuning not yet migrated to public schema'
    });
  } catch (error) {
    console.error('Revert tuning error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/gap/tuning/history/:tenant_id/:standard_code/:clause_ref
 * Get tuning history for a clause
 */
router.get('/tuning/history/:tenant_id/:standard_code/:clause_ref', async (req, res) => {
  try {
    const { tenant_id, standard_code, clause_ref } = req.params;

    // Note: gap_tuning table doesn't exist in public schema yet
    return res.json({
      success: true,
      history: []
    });
  } catch (error) {
    console.error('Get tuning history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/gap/learn/last
 * Get last learning job execution info
 */
router.get('/learn/last', async (req, res) => {
  try {
    // Try to get learning data from gap_analyses table (which exists in public schema)
    // Fallback to empty response if table doesn't exist or has no data
    let result;
    let pendingResult;
    
    try {
      // Check if we have gap_analyses table with learning data
      result = await queryPostgres(
        `SELECT MAX(analysis_date) as last_run, COUNT(*) as total_analyses
         FROM public.gap_analyses
         WHERE analysis_date >= NOW() - INTERVAL '7 days'`
      );

      // Note: gap_analyses table doesn't have status column, skip this query
      pendingResult = { rows: [{ count: 0 }] };
    } catch (dbError) {
      // Table might not exist or have different structure - return default values
      console.log('[gap] Learning tables not available, returning defaults');
      result = { rows: [{ last_run: null, total_analyses: 0 }] };
      pendingResult = { rows: [{ count: 0 }] };
    }

    res.json({
      success: true,
      last_run: result.rows[0]?.last_run || null,
      total_proposals: parseInt(result.rows[0]?.total_analyses || 0),
      pending_review: parseInt(pendingResult.rows[0]?.count || 0)
    });
  } catch (error) {
    console.error('Get learn status error:', error);
    // Return success with default values instead of error to prevent UI issues
    res.json({
      success: true,
      last_run: null,
      total_proposals: 0,
      pending_review: 0
    });
  }
});

export default router;

