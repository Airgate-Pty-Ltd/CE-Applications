/**
 * EDCAT Learning System Module
 * Continuously improves from feedback and usage patterns
 * This is part of EDCAT AI's learning system
 */

import { learningEngine } from '../../services/learningEngine.js';
import auditTrail from '../auditTrail.js';

class LearningSystem {
  /**
   * Record feedback and update learning
   * @param {string} analysisId - Analysis ID
   * @param {Object} feedback - Feedback data
   * @param {string} feedback.clarificationId - Clarification ID (if applicable)
   * @param {string} feedback.answer - User's answer ('Yes', 'No', 'Partially', etc.)
   * @param {string} feedback.mappingId - Mapping ID (if applicable)
   * @param {boolean} feedback.isCorrect - Whether EDCAT's prediction was correct
   * @param {number} feedback.actualConfidence - Actual confidence (if provided)
   */
  async recordFeedback(analysisId, feedback) {
    const { clarificationId, answer, mappingId, isCorrect, actualConfidence } = feedback;
    const startTime = Date.now();

    try {
      // Update audit trail with actual accuracy
      if (clarificationId || mappingId) {
        // Find the relevant audit trail entry
        const auditEntries = await auditTrail.getByAnalysis(analysisId);
        const relevantEntry = auditEntries.find(e => 
          e.action === 'ANALYZE_GAPS' || e.action === 'GENERATE_CLARIFICATIONS'
        );

        if (relevantEntry && actualConfidence !== undefined) {
          await auditTrail.updateAccuracy(relevantEntry.audit_id, actualConfidence);
        }
      }

      // Record feedback in learning engine if available
      if (learningEngine && typeof learningEngine.recordFeedback === 'function') {
        await learningEngine.recordFeedback({
          analysisId,
          clarificationId,
          answer,
          mappingId,
          isCorrect,
          actualConfidence
        });
      }

      const executionTime = Date.now() - startTime;

      // Log to audit trail
      await auditTrail.log({
        analysisId,
        actor: 'LEARNING_SYSTEM',
        action: 'RECORD_FEEDBACK',
        details: `Recorded feedback: ${answer || (isCorrect ? 'correct' : 'incorrect')}`,
        reasoning: {
          feedbackType: clarificationId ? 'clarification' : 'mapping',
          answer,
          isCorrect,
          actualConfidence
        },
        status: 'success',
        metadata: feedback,
        executionTimeMs: executionTime
      });

      return { success: true };

    } catch (error) {
      console.error('[LearningSystem] ❌ Error recording feedback:', error);
      
      await auditTrail.log({
        analysisId,
        actor: 'LEARNING_SYSTEM',
        action: 'RECORD_FEEDBACK',
        details: `Failed to record feedback: ${error.message}`,
        status: 'failed',
        metadata: { error: error.message }
      });

      throw error;
    }
  }

  /**
   * Get learning metrics for an analysis
   * @param {string} analysisId - Analysis ID
   * @returns {Promise<Object>} Learning metrics
   */
  async getLearningMetrics(analysisId) {
    try {
      const auditEntries = await auditTrail.getByAnalysis(analysisId);
      
      const predictions = auditEntries.filter(e => e.predicted_accuracy !== null);
      const actuals = auditEntries.filter(e => e.actual_accuracy !== null);
      
      let avgPrediction = 0;
      let avgActual = 0;
      
      if (predictions.length > 0) {
        avgPrediction = predictions.reduce((sum, e) => sum + parseFloat(e.predicted_accuracy || 0), 0) / predictions.length;
      }
      
      if (actuals.length > 0) {
        avgActual = actuals.reduce((sum, e) => sum + parseFloat(e.actual_accuracy || 0), 0) / actuals.length;
      }

      return {
        totalPredictions: predictions.length,
        totalFeedback: actuals.length,
        averagePredictedAccuracy: avgPrediction,
        averageActualAccuracy: avgActual,
        accuracyDelta: avgActual - avgPrediction
      };

    } catch (error) {
      console.error('[LearningSystem] ❌ Error getting learning metrics:', error);
      return {
        totalPredictions: 0,
        totalFeedback: 0,
        averagePredictedAccuracy: 0,
        averageActualAccuracy: 0,
        accuracyDelta: 0
      };
    }
  }
}

export default new LearningSystem();


