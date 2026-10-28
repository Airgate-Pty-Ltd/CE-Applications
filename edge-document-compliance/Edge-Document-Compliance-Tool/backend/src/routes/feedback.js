/**
 * FEEDBACK ROUTES
 * 
 * Endpoints for user to submit feedback on AI analyses.
 * Feedback is stored and used for learning.
 * 
 * POST /api/feedback/parser/:traceId
 * POST /api/feedback/gap/:traceId
 * GET /api/feedback/learning-progress
 */

import express from 'express';
import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { recordLearningEvent } from '../services/learningEngine.js';

const router = express.Router();

// ============================================================
// PARSER FEEDBACK
// ============================================================

router.post('/parser/:traceId', async (req, res) => {
  const { traceId } = req.params;
  const { customerId, is_requirement, user_confidence, comment } = req.body;

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

    // Get the trace
    const traceResult = await query(
      `SELECT * FROM ${schemaName}.parser_traces 
       WHERE parser_trace_id = $1`,
      [traceId]
    );

    if (traceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trace not found' });
    }

    const trace = traceResult.rows[0];
    const aiConfidence = trace.confidence_scores?.[0] || 0.5;
    const improvement = user_confidence - aiConfidence;

    // Store feedback
    const feedbackId = uuidv4();
    await query(
      `INSERT INTO ${schemaName}.parser_feedback
      (parser_feedback_id, parser_trace_id, user_said_is_requirement,
       user_confidence_correct, improvement_signal)
      VALUES ($1, $2, $3, $4, $5)`,
      [
        feedbackId,
        traceId,
        is_requirement,
        user_confidence,
        JSON.stringify({
          parser_confidence_before: aiConfidence,
          parser_confidence_after: user_confidence,
          improvement_delta: improvement,
          user_feedback: comment,
        }),
      ]
    );

    // Record learning event
    await recordLearningEvent(
      schemaName,
      'parser_feedback',
      traceId,
      feedbackId,
      improvement,
      {
        is_requirement,
        improvement_delta: improvement,
      }
    );

    res.json({
      success: true,
      feedback_id: feedbackId,
      improvement_signal: improvement,
      message: '✅ Your feedback helps us improve!',
    });
  } catch (error) {
    console.error('Parser feedback error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GAP ANALYSIS FEEDBACK
// ============================================================

router.post('/gap/:traceId', async (req, res) => {
  const { traceId } = req.params;
  const { customerId, is_covered, user_confidence, comment } = req.body;

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

    // Get the trace
    const traceResult = await query(
      `SELECT * FROM ${schemaName}.gap_analysis_traces 
       WHERE gap_trace_id = $1`,
      [traceId]
    );

    if (traceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trace not found' });
    }

    const trace = traceResult.rows[0];
    const aiConfidence = trace.match_confidence || 0.5;
    const improvement = Math.abs(user_confidence - aiConfidence);

    // Store feedback
    const feedbackId = uuidv4();
    await query(
      `INSERT INTO ${schemaName}.gap_analysis_feedback
      (gap_feedback_id, gap_trace_id, user_says_covered,
       user_confidence, improvement_signal)
      VALUES ($1, $2, $3, $4, $5)`,
      [
        feedbackId,
        traceId,
        is_covered,
        user_confidence,
        JSON.stringify({
          gap_confidence_before: aiConfidence,
          gap_confidence_after: user_confidence,
          improvement_delta: improvement,
          user_feedback: comment,
        }),
      ]
    );

    // Record learning event
    await recordLearningEvent(
      schemaName,
      'gap_feedback',
      traceId,
      feedbackId,
      improvement,
      {
        is_covered,
        improvement_delta: improvement,
      }
    );

    res.json({
      success: true,
      feedback_id: feedbackId,
      improvement_signal: improvement,
      message: '✅ Your feedback helps us improve!',
    });
  } catch (error) {
    console.error('Gap feedback error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// LEARNING PROGRESS
// ============================================================

router.get('/learning-progress', async (req, res) => {
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

    // Get learning statistics
    const stats = await query(
      `SELECT 
        event_type,
        COUNT(*) as count,
        AVG(CAST(improvement_signal AS DECIMAL)) as avg_improvement,
        MAX(created_at) as last_event
      FROM ${schemaName}.learning_events
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY event_type
      ORDER BY last_event DESC`,
      []
    );

    // Get latest tunings
    const tunings = await query(
      `SELECT 
        'parser' as analyzer_type,
        standard_code,
        improvement_delta,
        approved,
        created_at
      FROM ${schemaName}.parser_tuning
      WHERE created_at > NOW() - INTERVAL '30 days'
      
      UNION ALL
      
      SELECT 
        'gap_analyzer' as analyzer_type,
        standard_code,
        improvement_delta,
        approved,
        created_at
      FROM ${schemaName}.gap_analyzer_tuning
      WHERE created_at > NOW() - INTERVAL '30 days'
      
      ORDER BY created_at DESC
      LIMIT 20`,
      []
    );

    res.json({
      success: true,
      learning_stats: stats.rows,
      recent_tunings: tunings.rows,
      summary: {
        total_learning_events: stats.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        avg_improvement: stats.rows.length > 0 
          ? stats.rows.reduce((sum, row) => sum + (parseFloat(row.avg_improvement) || 0), 0) / stats.rows.length
          : 0,
      }
    });
  } catch (error) {
    console.error('Learning progress error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

