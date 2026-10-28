/**
 * Vera Clarification Engine
 * Intelligently decides WHEN to ask clarifications
 */

import { queryEdcatAI } from '../../config/databases.js';

const VeraClarificationEngine = {

  async determineClarificationNeeded(analysisId, contextId) {
    // Get all mappings with confidence between 0.55-0.80
    try {
      // Note: This assumes requirement_mappings table exists in EDCAT AI DB
      // If it doesn't, we'll need to adapt this query
      const ambiguousItems = await queryEdcatAI(
        `SELECT rm.*, r.requirement_text, p.procedure_text
         FROM requirement_mappings rm
         LEFT JOIN parsed_requirements r ON rm.requirement_id = r.id
         LEFT JOIN parsed_clauses p ON rm.procedure_id = p.id
         WHERE rm.analysis_id = $1 
         AND rm.match_confidence BETWEEN 0.55 AND 0.80
         ORDER BY ABS(0.68 - rm.match_confidence) ASC
         LIMIT 8`,
        [analysisId]
      );
      return ambiguousItems.rows;
    } catch (error) {
      // If table doesn't exist, return empty array
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        console.log('[VeraClarificationEngine] requirement_mappings table not found, returning empty');
        return [];
      }
      console.error('[VeraClarificationEngine] Error determining clarifications:', error.message);
      return [];
    }
  },

  async selectClarificationRules(contextId, requiredCount = 6) {
    try {
      // Get context confidence level
      const contextResult = await queryEdcatAI(
        `SELECT confidence_level FROM edcat.vera_conversation_context WHERE context_id = $1`,
        [contextId]
      );
      const contextConfidence = contextResult.rows[0]?.confidence_level || 0.50;

      // Find applicable rules in priority order
      const rules = await queryEdcatAI(
        `SELECT * FROM edcat.vera_clarification_rules
         WHERE active = TRUE
         AND ask_only_if_confidence_below >= $1
         AND ask_only_if_confidence_above <= $1
         ORDER BY priority DESC
         LIMIT $2`,
        [contextConfidence, requiredCount]
      );
      
      return rules.rows;
    } catch (error) {
      console.error('[VeraClarificationEngine] Error selecting rules:', error.message);
      return [];
    }
  },

  async generateClarificationQuestion(mappingId, ruleId, requirementText, procedureText, confidence) {
    try {
      // Get the rule
      const ruleResult = await queryEdcatAI(
        `SELECT * FROM edcat.vera_clarification_rules WHERE rule_id = $1`,
        [ruleId]
      );
      
      if (ruleResult.rows.length === 0) {
        return null;
      }

      const rule = ruleResult.rows[0];

      // Replace placeholders in template
      let question = rule.clarification_template
        .replace(/\[PROCEDURE\]/g, procedureText || 'the procedure')
        .replace(/\[REQUIREMENT\]/g, requirementText || 'the requirement')
        .replace(/\[CONFIDENCE\]/g, `${Math.round(confidence * 100)}%`)
        .replace(/\[REASON\]/g, 'the language could be interpreted multiple ways');

      return {
        rule_id: ruleId,
        mapping_id: mappingId,
        question_text: question,
        question_type: rule.question_type,
        answer_options: rule.answer_options || ['Yes', 'No', 'Not Sure']
      };
    } catch (error) {
      console.error('[VeraClarificationEngine] Error generating question:', error.message);
      return null;
    }
  },

  async shouldAskClarification(mappingConfidence, recentlyClarified, contextId) {
    try {
      const contextResult = await queryEdcatAI(
        `SELECT clarification_questions_asked FROM edcat.ai_conversation_history 
         WHERE conversation_id IN (
           SELECT conversation_id FROM edcat.vera_conversation_context WHERE context_id = $1
         )`,
        [contextId]
      );

      const questionsAsked = contextResult.rows[0]?.clarification_questions_asked || 0;
      
      // Don't overwhelm user
      if (questionsAsked >= 8) return false;
      
      // Don't repeat if we boosted confidence
      if (recentlyClarified) return false;
      
      // Ask if confidence is truly ambiguous
      return mappingConfidence >= 0.45 && mappingConfidence <= 0.80;
    } catch (error) {
      console.error('[VeraClarificationEngine] Error checking if should ask:', error.message);
      return false;
    }
  },

  async recordClarificationAsked(conversationId, clarificationData) {
    try {
      const result = await queryEdcatAI(
        `INSERT INTO edcat.vera_clarification_feedback 
         (conversation_id, clarification_rule_id, clarification_question, 
          requirement_id, procedure_id, vera_confidence_before, clarification_asked_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING feedback_id`,
        [conversationId, clarificationData.rule_id, clarificationData.question_text,
         clarificationData.requirement_id, clarificationData.procedure_id, 
         clarificationData.confidence_before]
      );
      return result.rows[0]?.feedback_id;
    } catch (error) {
      console.error('[VeraClarificationEngine] Error recording clarification:', error.message);
      return null;
    }
  },

  async processClarificationResponse(feedbackId, userResponse, reasoningDetails = null) {
    try {
      // Get the feedback record
      const feedback = await queryEdcatAI(
        `SELECT * FROM edcat.vera_clarification_feedback WHERE feedback_id = $1`,
        [feedbackId]
      );
      
      if (feedback.rows.length === 0) {
        throw new Error('Feedback record not found');
      }

      const fb = feedback.rows[0];

      // Calculate new confidence based on response
      let newConfidence = parseFloat(fb.vera_confidence_before) || 0.50;
      let mappingResult = 'unclear';
      
      if (userResponse === 'yes' || userResponse === 'Yes') {
        newConfidence = Math.min(0.95, newConfidence + 0.20); // YES = strong signal
        mappingResult = 'confirmed_covered';
      } else if (userResponse === 'no' || userResponse === 'No') {
        newConfidence = Math.max(0.15, newConfidence - 0.25); // NO = strong negative signal
        mappingResult = 'confirmed_gap';
      } else if (userResponse === 'not_sure' || userResponse === 'Not Sure') {
        newConfidence = newConfidence + 0.05; // Slight improvement
        mappingResult = 'partial_coverage';
      }

      // Update mapping with new confidence (if table exists)
      try {
        await queryEdcatAI(
          `UPDATE requirement_mappings 
           SET match_confidence = $1 
           WHERE mapping_id = (
             SELECT mapping_id FROM vera_clarification_feedback 
             WHERE feedback_id = $2
           )`,
          [newConfidence, feedbackId]
        );
      } catch (updateError) {
        // Table might not exist yet, that's okay
        console.log('[VeraClarificationEngine] Could not update requirement_mappings:', updateError.message);
      }

      // Record the feedback and learning
      await queryEdcatAI(
        `UPDATE vera_clarification_feedback 
         SET user_response = $1, 
             vera_confidence_after = $2, 
             mapping_result_after_feedback = $3, 
             response_received_at = NOW(),
             confidence_improvement = $4
         WHERE feedback_id = $5`,
        [userResponse, newConfidence, mappingResult, newConfidence - parseFloat(fb.vera_confidence_before), feedbackId]
      );

      // Create learning event (will be handled by VeraLearningEngine)
      const confidenceDelta = newConfidence - parseFloat(fb.vera_confidence_before);

      return { 
        newConfidence, 
        mappingResult,
        confidenceDelta,
        feedbackId: fb.feedback_id
      };
    } catch (error) {
      console.error('[VeraClarificationEngine] Error processing response:', error.message);
      throw error;
    }
  }
};

export default VeraClarificationEngine;

