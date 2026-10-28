/**
 * Vera Learning Event Service
 * 
 * Records learning events when Vera struggles, fails, or receives corrections.
 * These events become training data for future improvement.
 */

import { queryEdcatAI } from '../../config/databases.js';
import { v4 as uuidv4 } from 'uuid';

export interface VeraLearningEventInput {
  tenantId?: string;
  sessionId?: string;
  userQuestion: string;
  intent?: string | null;
  userRole?: string;
  confidenceScore?: number;
  llmAnswer?: string;
  legacyAnswer?: string;
  failureType?: "LOW_CONFIDENCE" | "USER_CORRECTION" | "NO_KNOWLEDGE" | "REMEDY_APPLIED" | "SELF_EVAL_LOW" | "SELF_EVAL_ISSUES";
  metadata?: Record<string, any>;
}

/**
 * Record a learning event in the database
 */
export async function recordLearningEvent(input: VeraLearningEventInput): Promise<void> {
  try {
    const {
      tenantId = '00000000-0000-0000-0000-000000000000',
      sessionId,
      userQuestion,
      intent,
      userRole,
      confidenceScore,
      llmAnswer,
      legacyAnswer,
      failureType = 'LOW_CONFIDENCE',
      metadata = {}
    } = input;

    const eventId = uuidv4();
    const answer = llmAnswer || legacyAnswer || '';

    // Insert into ai_learning_event table
    await queryEdcatAI(`
      INSERT INTO edcat.ai_learning_event 
      (
        id, 
        tenant_id, 
        session_id, 
        user_question, 
        intent, 
        user_role,
        confidence_score,
        answer_text,
        failure_type,
        metadata,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    `, [
      eventId,
      tenantId,
      sessionId || null,
      userQuestion,
      intent || null,
      userRole || null,
      confidenceScore || null,
      answer,
      failureType,
      JSON.stringify(metadata)
    ]);

    console.log(`[VeraLearning] Recorded learning event: ${failureType} (confidence: ${confidenceScore || 'N/A'})`);

    // If this is a user correction, also update vera_learned_corrections
    if (failureType === 'USER_CORRECTION' && metadata.correctedAnswer) {
      await recordCorrection({
        tenantId,
        originalQuestion: userQuestion,
        originalAnswer: answer,
        correctedAnswer: metadata.correctedAnswer,
        correctionType: metadata.correctionType || 'user_correction',
        confidence: 0.9
      });
    }

  } catch (error: any) {
    console.error('[VeraLearning] Error recording learning event:', error.message);
    // Don't throw - learning events are non-critical
  }
}

/**
 * Record a user correction
 */
async function recordCorrection(params: {
  tenantId: string;
  originalQuestion: string;
  originalAnswer: string;
  correctedAnswer: string;
  correctionType: string;
  confidence: number;
}): Promise<void> {
  try {
    const { tenantId, originalQuestion, originalAnswer, correctedAnswer, correctionType, confidence } = params;

    await queryEdcatAI(`
      INSERT INTO edcat.vera_learned_corrections 
      (
        id,
        tenant_id,
        original_question,
        original_answer,
        corrected_answer,
        correction_type,
        confidence,
        applied_count,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW())
      ON CONFLICT (tenant_id, original_question) 
      DO UPDATE SET
        corrected_answer = EXCLUDED.corrected_answer,
        correction_type = EXCLUDED.correction_type,
        confidence = EXCLUDED.confidence,
        updated_at = NOW()
    `, [
      uuidv4(),
      tenantId,
      originalQuestion,
      originalAnswer,
      correctedAnswer,
      correctionType,
      confidence
    ]);

    console.log(`[VeraLearning] Recorded correction for: "${originalQuestion.substring(0, 50)}..."`);

  } catch (error: any) {
    console.error('[VeraLearning] Error recording correction:', error.message);
  }
}

/**
 * Get learning events for analysis
 */
export async function getLearningEvents(params: {
  tenantId?: string;
  failureType?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  try {
    const {
      tenantId = '00000000-0000-0000-0000-000000000000',
      failureType,
      limit = 50,
      offset = 0
    } = params;

    let query = `
      SELECT 
        id,
        tenant_id,
        session_id,
        user_question,
        intent,
        user_role,
        confidence_score,
        answer_text,
        failure_type,
        metadata,
        created_at
      FROM edcat.ai_learning_event
      WHERE tenant_id = $1
    `;

    const paramsArray: any[] = [tenantId];

    if (failureType) {
      query += ` AND failure_type = $2`;
      paramsArray.push(failureType);
      query += ` ORDER BY created_at DESC LIMIT $${paramsArray.length + 1} OFFSET $${paramsArray.length + 2}`;
      paramsArray.push(limit, offset);
    } else {
      query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      paramsArray.push(limit, offset);
    }

    const result = await queryEdcatAI(query, paramsArray);
    return result.rows.map(row => ({
      ...row,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
    }));

  } catch (error: any) {
    console.error('[VeraLearning] Error getting learning events:', error.message);
    return [];
  }
}

/**
 * Get learning statistics
 */
export async function getLearningStats(params: {
  tenantId?: string;
}): Promise<any> {
  try {
    const { tenantId = '00000000-0000-0000-0000-000000000000' } = params;

    // Count by failure type
    const failureTypeStats = await queryEdcatAI(`
      SELECT 
        failure_type,
        COUNT(*) as count,
        AVG(confidence_score) as avg_confidence
      FROM edcat.ai_learning_event
      WHERE tenant_id = $1
      GROUP BY failure_type
      ORDER BY count DESC
    `, [tenantId]);

    // Count by intent
    const intentStats = await queryEdcatAI(`
      SELECT 
        intent,
        COUNT(*) as count,
        AVG(confidence_score) as avg_confidence
      FROM edcat.ai_learning_event
      WHERE tenant_id = $1
        AND intent IS NOT NULL
      GROUP BY intent
      ORDER BY count DESC
      LIMIT 20
    `, [tenantId]);

    // Recent trends (last 7 days)
    const recentTrends = await queryEdcatAI(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as event_count,
        AVG(confidence_score) as avg_confidence
      FROM edcat.ai_learning_event
      WHERE tenant_id = $1
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [tenantId]);

    return {
      failureTypes: failureTypeStats.rows,
      intents: intentStats.rows,
      recentTrends: recentTrends.rows,
      totalEvents: failureTypeStats.rows.reduce((sum, row) => sum + parseInt(row.count), 0)
    };

  } catch (error: any) {
    console.error('[VeraLearning] Error getting learning stats:', error.message);
    return {
      failureTypes: [],
      intents: [],
      recentTrends: [],
      totalEvents: 0
    };
  }
}

