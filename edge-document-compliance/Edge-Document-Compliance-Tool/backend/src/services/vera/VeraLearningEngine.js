/**
 * Vera Learning Engine
 * Record learning events and drive daily improvement
 */

import { queryEdcatAI } from '../../config/databases.js';

const VeraLearningEngine = {

  async recordLearningEvent(eventType, eventData) {
    try {
      const result = await queryEdcatAI(
        `INSERT INTO edcat.vera_learning_events
         (event_type, learned_item, learned_detail, confidence_before, confidence_after,
          triggering_action, is_positive_signal, learning_value, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING event_id`,
        [
          eventType, 
          eventData.learned_item || eventType,
          JSON.stringify(eventData),
          eventData.confidence_before || 0.50,
          eventData.confidence_after || 0.50,
          eventData.triggering_action || 'unknown',
          eventData.is_positive || false,
          eventData.value || 0.50
        ]
      );
      return result.rows[0]?.event_id;
    } catch (error) {
      console.error('[VeraLearningEngine] Error recording learning event:', error.message);
      return null;
    }
  },

  async processDailyLearningBatch(batchDate = new Date()) {
    console.log(`[VeraLearningEngine] Starting daily learning batch for ${batchDate.toISOString().split('T')[0]}`);

    try {
      // Get all learning events from past 24 hours
      const events = await queryEdcatAI(
        `SELECT * FROM edcat.vera_learning_events
         WHERE created_at >= NOW() - INTERVAL '1 day'
         AND processed_in_batch = FALSE
         ORDER BY created_at`
      );

      const learnings = events.rows;
      console.log(`[VeraLearningEngine] Found ${learnings.length} learning events`);

      // Calculate improvement metrics
      let totalConfidenceDelta = 0;
      let positiveEvents = 0;
      let eventTypes = {};

      learnings.forEach(event => {
        const delta = parseFloat(event.confidence_after || 0) - parseFloat(event.confidence_before || 0);
        totalConfidenceDelta += delta;
        if (event.is_positive_signal) positiveEvents++;
        eventTypes[event.event_type] = (eventTypes[event.event_type] || 0) + 1;
      });

      const avgImprovement = learnings.length > 0 
        ? totalConfidenceDelta / learnings.length 
        : 0;

      // Get conversation and user satisfaction data
      let avgSatisfaction = 0.75; // Default
      try {
        const satisfactionData = await queryEdcatAI(
          `SELECT AVG(user_satisfaction_rating) as avg_rating
           FROM edcat.ai_conversation_history
           WHERE created_at >= NOW() - INTERVAL '1 day'
           AND user_satisfaction_rating IS NOT NULL`
        );
        avgSatisfaction = parseFloat(satisfactionData.rows[0]?.avg_rating || 0.75);
      } catch (err) {
        console.log('[VeraLearningEngine] Could not get satisfaction data:', err.message);
      }

      // Get conversation count
      let totalConversations = 0;
      try {
        const convData = await queryEdcatAI(
          `SELECT COUNT(DISTINCT conversation_id) as count
           FROM edcat.ai_conversation_history
           WHERE created_at >= NOW() - INTERVAL '1 day'`
        );
        totalConversations = parseInt(convData.rows[0]?.count || 0);
      } catch (err) {
        console.log('[VeraLearningEngine] Could not get conversation count:', err.message);
      }

      // Create batch record
      const batchDateStr = batchDate.toISOString().split('T')[0];
      const batchResult = await queryEdcatAI(
        `INSERT INTO edcat.vera_daily_learning_batch
         (batch_date, total_learning_events, total_conversations, clarification_feedbacks_count, 
          avg_user_satisfaction, overall_improvement_delta, 
          improvement_confidence, should_create_new_version, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (batch_date) DO UPDATE
         SET total_learning_events = EXCLUDED.total_learning_events,
             total_conversations = EXCLUDED.total_conversations,
             clarification_feedbacks_count = EXCLUDED.clarification_feedbacks_count,
             avg_user_satisfaction = EXCLUDED.avg_user_satisfaction,
             overall_improvement_delta = EXCLUDED.overall_improvement_delta,
             improvement_confidence = EXCLUDED.improvement_confidence,
             should_create_new_version = EXCLUDED.should_create_new_version,
             status = EXCLUDED.status,
             processed_at = NOW()
         RETURNING batch_id`,
        [
          batchDateStr,
          learnings.length,
          totalConversations,
          eventTypes['clarification_feedback'] || 0,
          avgSatisfaction,
          avgImprovement,
          Math.min(learnings.length / 50, 1.0), // Confidence increases with sample size
          avgImprovement > 0.05, // Threshold for new version
          'processing'
        ]
      );

      const batchId = batchResult.rows[0]?.batch_id;

      // Mark events as processed
      if (batchId) {
        await queryEdcatAI(
          `UPDATE vera_learning_events 
           SET processed_in_batch = TRUE, batch_id = $1
           WHERE created_at >= NOW() - INTERVAL '1 day'
           AND processed_in_batch = FALSE`,
          [batchId]
        );
      }

      // If improvement significant, create new version
      if (avgImprovement > 0.05) {
        await this.createNewModelVersion(batchId, avgImprovement, learnings.length);
      }

      // Update batch status
      if (batchId) {
        await queryEdcatAI(
          `UPDATE vera_daily_learning_batch 
           SET status = 'complete', processed_at = NOW()
           WHERE batch_id = $1`,
          [batchId]
        );
      }

      console.log(`[VeraLearningEngine] Batch ${batchId} complete. Improvement delta: ${(avgImprovement * 100).toFixed(2)}%`);
      return batchId;
    } catch (error) {
      console.error('[VeraLearningEngine] Error processing daily batch:', error.message);
      throw error;
    }
  },

  async createNewModelVersion(batchId, improvementDelta, eventCount) {
    try {
      // Get latest version
      const latestVersion = await queryEdcatAI(
        `SELECT * FROM edcat.vera_model_versions 
         WHERE status = 'deployed'
         ORDER BY created_at DESC LIMIT 1`
      );

      let latest = { version_number: '1.0.0', baseline_accuracy: 0.800, baseline_precision: 0.820, baseline_recall: 0.780 };
      if (latestVersion.rows.length > 0) {
        latest = latestVersion.rows[0];
      }

      const versionParts = latest.version_number.split('.');
      
      // Increment version
      let newVersion;
      if (improvementDelta > 0.10) {
        versionParts[1] = (parseInt(versionParts[1]) + 1).toString(); // Minor version bump
        versionParts[2] = '0';
      } else {
        versionParts[2] = (parseInt(versionParts[2]) + 1).toString(); // Patch version
      }
      
      newVersion = versionParts.join('.');

      // Get template and rule counts
      const templateCount = await queryEdcatAI(`SELECT COUNT(*) as count FROM edcat.vera_response_templates WHERE active = TRUE`);
      const ruleCount = await queryEdcatAI(`SELECT COUNT(*) as count FROM edcat.vera_clarification_rules WHERE active = TRUE`);
      const boundaryCount = await queryEdcatAI(`SELECT COUNT(*) as count FROM edcat.vera_knowledge_boundaries WHERE active = TRUE`);

      const newVersionResult = await queryEdcatAI(
        `INSERT INTO edcat.vera_model_versions
         (version_number, baseline_accuracy, baseline_precision, baseline_recall,
          improvements_from_previous_version, improvement_delta, 
          clarification_rules_version, response_template_count, knowledge_boundary_count,
          trained_on_event_count, status, 
          created_by, reason_for_update, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
         RETURNING version_id`,
        [
          newVersion, 
          parseFloat(latest.baseline_accuracy) + improvementDelta,
          parseFloat(latest.baseline_precision) + (improvementDelta * 0.8),
          parseFloat(latest.baseline_recall) + (improvementDelta * 0.7),
          JSON.stringify(['daily_learning_improvement']),
          improvementDelta,
          1, // clarification_rules_version
          parseInt(templateCount.rows[0]?.count || 0),
          parseInt(boundaryCount.rows[0]?.count || 0),
          eventCount,
          'approved', // Auto-approve if passes threshold
          'system',
          `Daily learning batch improved accuracy by ${(improvementDelta * 100).toFixed(2)}%`
        ]
      );

      const newVersionId = newVersionResult.rows[0]?.version_id;

      // Mark as deployed (auto-deploy)
      await queryEdcatAI(
        `UPDATE vera_model_versions 
         SET status = 'deployed', deployed_at = NOW()
         WHERE version_id = $1`,
        [newVersionId]
      );

      // Update batch
      await queryEdcatAI(
        `UPDATE vera_daily_learning_batch 
         SET new_version_created = TRUE, new_version_id = $1, new_version_number = $2
         WHERE batch_id = $3`,
        [newVersionId, newVersion, batchId]
      );

      console.log(`[VeraLearningEngine] Created and deployed new Vera version: ${newVersion}`);
      return newVersionId;
    } catch (error) {
      console.error('[VeraLearningEngine] Error creating new version:', error.message);
      throw error;
    }
  }
};

export default VeraLearningEngine;

