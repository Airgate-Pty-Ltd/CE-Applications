/**
 * VERA Root Cause Analysis API Routes
 */

import express from 'express';
import * as rcaService from '../services/vera/VeraRootCauseAnalyzer.js';
import { queryPostgres } from '../config/databases.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /api/vera/rca/analyze
 * Analyze nonconformance and perform root cause analysis
 */
router.post('/analyze', async (req, res) => {
  try {
    const { nonconformanceId } = req.body;

    if (!nonconformanceId) {
      return res.status(400).json({
        success: false,
        error: 'nonconformanceId required'
      });
    }

    const rcaResults = await rcaService.analyzeRootCause(nonconformanceId);

    res.json({
      success: true,
      rca: rcaResults
    });
  } catch (error) {
    console.error('[VERA RCA] Analyze error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vera/rca/nonconformance
 * Create a new nonconformance
 */
router.post('/nonconformance', async (req, res) => {
  try {
    const {
      customerId,
      title,
      description,
      location,
      severity = 'medium',
      detected_by,
      standard_reference,
      impact_description,
      immediate_action_taken
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'title and description required'
      });
    }

    const ncNumber = `NC-${Date.now()}-${uuidv4().substring(0, 8)}`;

    const result = await queryPostgres(
      `INSERT INTO public.nonconformances
       (nc_number, customer_id, title, description, location, severity, detected_by,
        standard_reference, impact_description, immediate_action_taken, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open')
       RETURNING *`,
      [
        ncNumber,
        customerId,
        title,
        description,
        location,
        severity,
        detected_by,
        standard_reference,
        impact_description,
        immediate_action_taken
      ]
    );

    res.json({
      success: true,
      nonconformance: result.rows[0]
    });
  } catch (error) {
    console.error('[VERA RCA] Create nonconformance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vera/rca/nonconformance/:id
 * Get nonconformance with RCA details
 */
router.get('/nonconformance/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const details = await rcaService.getNonconformanceWithRCA(id);

    res.json({
      success: true,
      ...details
    });
  } catch (error) {
    console.error('[VERA RCA] Get nonconformance error:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vera/rca/nonconformances
 * List nonconformances for a customer
 */
router.get('/nonconformances', async (req, res) => {
  try {
    const customerId = req.query.customerId || req.headers['x-customer-id'];
    const status = req.query.status;
    const limit = parseInt(req.query.limit || '50', 10);

    let query = `
      SELECT n.*, 
             (SELECT COUNT(*) FROM public.root_causes WHERE nonconformance_id = n.id) as has_rca,
             (SELECT COUNT(*) FROM public.corrective_actions WHERE nonconformance_id = n.id) as ca_count
      FROM public.nonconformances n
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (customerId) {
      query += ` AND customer_id = $${paramIndex++}`;
      params.push(customerId);
    }

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY detected_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await queryPostgres(query, params);

    res.json({
      success: true,
      nonconformances: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('[VERA RCA] List nonconformances error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vera/rca/corrective-action
 * Create corrective action
 */
router.post('/corrective-action', async (req, res) => {
  try {
    const {
      nonconformanceId,
      rootCauseId,
      action_description,
      responsible_person,
      target_completion_date
    } = req.body;

    if (!nonconformanceId || !action_description) {
      return res.status(400).json({
        success: false,
        error: 'nonconformanceId and action_description required'
      });
    }

    const ca = await rcaService.createCorrectiveAction(
      nonconformanceId,
      rootCauseId,
      {
        action_description,
        responsible_person,
        target_completion_date
      }
    );

    res.json({
      success: true,
      corrective_action: ca
    });
  } catch (error) {
    console.error('[VERA RCA] Create CA error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vera/rca/corrective-action/:id/verify
 * Verify corrective action effectiveness
 */
router.post('/corrective-action/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      effectiveness_verification,
      verified_by,
      effectiveness_score
    } = req.body;

    if (!effectiveness_verification || effectiveness_score === undefined) {
      return res.status(400).json({
        success: false,
        error: 'effectiveness_verification and effectiveness_score required'
      });
    }

    if (effectiveness_score < 0 || effectiveness_score > 1) {
      return res.status(400).json({
        success: false,
        error: 'effectiveness_score must be between 0 and 1'
      });
    }

    const ca = await rcaService.verifyCorrectiveAction(id, {
      effectiveness_verification,
      verified_by,
      effectiveness_score
    });

    res.json({
      success: true,
      corrective_action: ca,
      nonconformance_closed: effectiveness_score >= 0.8
    });
  } catch (error) {
    console.error('[VERA RCA] Verify CA error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vera/rca/guidance/:nonconformanceId
 * Get RCA guidance for a nonconformance
 */
router.get('/guidance/:nonconformanceId', async (req, res) => {
  try {
    const { nonconformanceId } = req.params;
    const currentStep = req.query.step || null;

    const guidance = await rcaService.getRCAGuidance(nonconformanceId, currentStep);

    res.json({
      success: true,
      guidance
    });
  } catch (error) {
    console.error('[VERA RCA] Get guidance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

