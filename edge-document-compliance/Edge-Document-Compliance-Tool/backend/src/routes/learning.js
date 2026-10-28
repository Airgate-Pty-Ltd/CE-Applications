/**
 * LEARNING ROUTES
 * 
 * Admin endpoints for managing learning system.
 * 
 * GET /api/learning/pending-tunings
 * POST /api/learning/approve-tuning/:tuningId
 * GET /api/learning/history
 */

import express from 'express';
import { query } from '../database/connection.js';
import { queryPostgres, queryEdcatAI } from '../config/databases.js';
import VeraLearningIngestionService from '../services/vera/VeraLearningIngestionService.js';

const router = express.Router();

// ============================================================
// GET PENDING TUNINGS
// ============================================================

router.get('/pending-tunings', async (req, res) => {
  const { customerId } = req.query;

  try {
    // Get customer schema name
    const customerResult = await query(
      `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const schemaName = customerResult.rows[0].schema_name;

    // Get pending tunings from both analyzer types
    const result = await query(
      `SELECT 
        'parser' as analyzer_type,
        parser_tuning_id as tuning_id,
        standard_code,
        confidence_threshold_full as new_threshold_full,
        confidence_threshold_partial as new_threshold_partial,
        improvement_delta,
        reason,
        approved,
        created_at
      FROM ${schemaName}.parser_tuning
      WHERE approved = FALSE
      
      UNION ALL
      
      SELECT 
        'gap_analyzer' as analyzer_type,
        gap_tuning_id as tuning_id,
        standard_code,
        confidence_threshold_full as new_threshold_full,
        confidence_threshold_partial as new_threshold_partial,
        improvement_delta,
        reason,
        approved,
        created_at
      FROM ${schemaName}.gap_analyzer_tuning
      WHERE approved = FALSE
      
      ORDER BY created_at DESC`,
      []
    );

    res.json({
      success: true,
      pending_tunings: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Pending tunings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// APPROVE TUNING
// ============================================================

router.post('/approve-tuning/:tuningId', async (req, res) => {
  const { tuningId } = req.params;
  const { customerId, analyzerType, approvedBy } = req.body;

  try {
    // Get customer schema name
    const customerResult = await query(
      `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const schemaName = customerResult.rows[0].schema_name;
    const tuningTable =
      analyzerType === 'parser' ? 'parser_tuning' : 'gap_analyzer_tuning';
    const idColumn =
      analyzerType === 'parser' ? 'parser_tuning_id' : 'gap_tuning_id';

    // Update tuning as approved
    await query(
      `UPDATE ${schemaName}.${tuningTable}
      SET approved = TRUE, approved_at = NOW(), approved_by = $1
      WHERE ${idColumn} = $2`,
      [approvedBy, tuningId]
    );

    res.json({
      success: true,
      message: `✅ ${analyzerType} tuning approved and will apply to next analysis`,
    });
  } catch (error) {
    console.error('Approve tuning error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// LEARNING HISTORY
// ============================================================

router.get('/history', async (req, res) => {
  const { customerId, days = 30 } = req.query;

  try {
    // Get customer schema name
    const customerResult = await query(
      `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const schemaName = customerResult.rows[0].schema_name;

    // Get learning events
    const events = await query(
      `SELECT 
        event_type,
        COUNT(*) as count,
        AVG(CAST(improvement_signal AS DECIMAL)) as avg_improvement
      FROM ${schemaName}.learning_events
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY event_type
      ORDER BY avg_improvement DESC`,
      []
    );

    // Get approved tunings (applied improvements)
    const applied = await query(
      `SELECT 
        'parser' as analyzer_type,
        standard_code,
        confidence_threshold_full,
        improvement_delta,
        approved_at
      FROM ${schemaName}.parser_tuning
      WHERE approved = TRUE AND approved_at > NOW() - INTERVAL '${days} days'
      
      UNION ALL
      
      SELECT 
        'gap_analyzer' as analyzer_type,
        standard_code,
        confidence_threshold_full,
        improvement_delta,
        approved_at
      FROM ${schemaName}.gap_analyzer_tuning
      WHERE approved = TRUE AND approved_at > NOW() - INTERVAL '${days} days'
      
      ORDER BY approved_at DESC`,
      []
    );

    res.json({
      success: true,
      learning_events: events.rows,
      applied_tunings: applied.rows,
      summary: {
        total_feedback_events: events.rows.reduce(
          (sum, row) => sum + parseInt(row.count),
          0
        ),
        total_improvements_applied: applied.rows.length,
        avg_improvement_per_tuning: 
          applied.rows.length > 0
            ? applied.rows.reduce((sum, row) => sum + (parseFloat(row.improvement_delta) || 0), 0) /
              applied.rows.length
            : 0,
      },
    });
  } catch (error) {
    console.error('Learning history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// NEW: LEARN FROM DOCUMENT
// ============================================================

router.post('/document/:documentId', async (req, res) => {
  const { documentId } = req.params;
  const { tenantId } = req.body;
  const userId = req.user?.id || null;

  try {
    const result = await VeraLearningIngestionService.learnFromDocument({
      tenantId: tenantId || '00000000-0000-0000-0000-000000000000',
      documentId,
      userId
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[learning] Error learning from document:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// NEW: LEARN FROM URL
// ============================================================

router.post('/url', async (req, res) => {
  const { tenantId, url } = req.body;
  const userId = req.user?.id || null;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL is required'
    });
  }

  try {
    const result = await VeraLearningIngestionService.learnFromWebsite({
      tenantId: tenantId || '00000000-0000-0000-0000-000000000000',
      url,
      userId
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[learning] Error learning from URL:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// GET LEARNING SOURCES
// ============================================================

router.get('/sources', async (req, res) => {
  const { tenantId } = req.query;
  const effectiveTenantId = tenantId || '00000000-0000-0000-0000-000000000000';

  try {
    const result = await queryEdcatAI(
      `SELECT * FROM edcat.get_learning_sources($1)`,
      [effectiveTenantId]
    );

    res.json({
      success: true,
      sources: result.rows || []
    });
  } catch (error) {
    console.error('[learning] Error getting learning sources:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

