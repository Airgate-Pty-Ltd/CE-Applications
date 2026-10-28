/**
 * EDCAT AI Audit Trail Service
 * Logs every EDCAT decision for traceability & learning
 */

import { queryEdcatAI } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

class AuditTrail {
  /**
   * Log an EDCAT decision/action
   * @param {Object} logEntry - The audit log entry
   * @param {string} logEntry.analysisId - Analysis ID (can be null for standalone actions)
   * @param {string} logEntry.actor - Who performed the action ('EDCAT_ORCHESTRATOR', 'PARSER', 'GAP_ANALYZER', etc.)
   * @param {string} logEntry.action - What action was performed ('PARSE_STANDARD', 'ANALYZE_GAPS', etc.)
   * @param {string} logEntry.details - Human-readable description
   * @param {Object} logEntry.reasoning - Decision logic, thresholds, confidence calculations (JSONB)
   * @param {string} logEntry.status - 'success', 'partial', 'failed'
   * @param {Object} logEntry.metadata - Additional context (JSONB)
   * @param {number} logEntry.predictedAccuracy - What EDCAT predicted (0.00-1.00)
   * @param {string} logEntry.standardId - Standard ID (optional)
   * @param {string} logEntry.customerId - Customer ID (optional)
   * @param {number} logEntry.executionTimeMs - Execution time in milliseconds
   * @param {number} logEntry.confidenceScore - EDCAT's confidence (0.00-1.00)
   */
  async log(logEntry) {
    const {
      analysisId = null,
      actor,
      action,
      details,
      reasoning = null,
      status = 'success',
      metadata = null,
      predictedAccuracy = null,
      standardId = null,
      customerId = null,
      executionTimeMs = null,
      confidenceScore = null
    } = logEntry;

    if (!actor || !action || !details) {
      console.warn('[auditTrail] ⚠️  Missing required fields: actor, action, or details');
      return;
    }

    try {
      await queryEdcatAI(
        `INSERT INTO audit_trail_decisions (
          audit_id, analysis_id, timestamp, actor, action, details,
          reasoning, status, metadata, predicted_accuracy, actual_accuracy,
          standard_id, customer_id, execution_time_ms, confidence_score
        ) VALUES (
          $1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )`,
        [
          uuidv4(),
          analysisId,
          actor,
          action,
          details,
          reasoning ? JSON.stringify(reasoning) : null,
          status,
          metadata ? JSON.stringify(metadata) : null,
          predictedAccuracy,
          null, // actual_accuracy filled in later by feedback
          standardId,
          customerId,
          executionTimeMs,
          confidenceScore
        ]
      );

      console.log(`[auditTrail] ✅ Logged: ${actor} → ${action}`);
    } catch (error) {
      console.error('[auditTrail] ❌ Error logging audit trail:', error);
      // Don't throw - audit logging should never break the main flow
    }
  }

  /**
   * Update actual accuracy after feedback
   * @param {string} auditId - Audit trail ID
   * @param {number} actualAccuracy - Actual accuracy (0.00-1.00)
   */
  async updateAccuracy(auditId, actualAccuracy) {
    try {
      await queryEdcatAI(
        `UPDATE audit_trail_decisions 
         SET actual_accuracy = $1 
         WHERE audit_id = $2`,
        [actualAccuracy, auditId]
      );
    } catch (error) {
      console.error('[auditTrail] ❌ Error updating accuracy:', error);
    }
  }

  /**
   * Get audit trail for an analysis
   * @param {string} analysisId - Analysis ID
   * @returns {Promise<Array>} Audit trail entries
   */
  async getByAnalysis(analysisId) {
    try {
      const result = await queryEdcatAI(
        `SELECT * FROM audit_trail_decisions 
         WHERE analysis_id = $1 
         ORDER BY timestamp ASC`,
        [analysisId]
      );
      return result.rows;
    } catch (error) {
      console.error('[auditTrail] ❌ Error fetching audit trail:', error);
      return [];
    }
  }

  /**
   * Get audit trail by actor and action
   * @param {string} actor - Actor name
   * @param {string} action - Action name (optional)
   * @param {number} limit - Limit results
   * @returns {Promise<Array>} Audit trail entries
   */
  async getByActor(actor, action = null, limit = 100) {
    try {
      let queryText = `SELECT * FROM audit_trail_decisions WHERE actor = $1`;
      const params = [actor];
      
      if (action) {
        queryText += ` AND action = $2`;
        params.push(action);
      }
      
      queryText += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await queryEdcatAI(queryText, params);
      return result.rows;
    } catch (error) {
      console.error('[auditTrail] ❌ Error fetching audit trail:', error);
      return [];
    }
  }
}

export default new AuditTrail();


