/**
 * Vera Response Learning Service
 * 
 * Enables Vera to learn, generate, and improve responses dynamically
 * - Records user feedback
 * - Generates response variations
 * - Promotes high-performing variants to Q&A bank
 * - Tracks learning events
 */

import { queryEdcatAI } from '../../config/databases.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

class VeraResponseLearningService {
  /**
   * Record user feedback on a response
   * @param {Object} params
   * @param {string} params.variantId - ID of the response variant
   * @param {string} params.qaBankId - ID of Q&A bank entry (optional)
   * @param {string} params.userFeedback - 'positive', 'negative', 'partial', 'irrelevant'
   * @param {number} params.score - 1-5 rating
   * @param {string} params.comment - User comment (optional)
   * @param {string} params.userMessage - Original user message
   * @param {string} params.veraResponse - Vera's response
   * @param {string} params.sessionId - Session ID
   * @param {string} params.userId - User ID
   * @param {string} params.tenantId - Tenant ID
   */
  async recordFeedback({
    variantId,
    qaBankId,
    userFeedback,
    score,
    comment,
    userMessage,
    veraResponse,
    sessionId,
    userId,
    tenantId = DEFAULT_TENANT_ID
  }) {
    try {
      const feedback_type = score >= 4 ? 'positive' : score >= 2 ? 'partial' : 'negative';
      
      // Record learning event
      await queryEdcatAI(`
        INSERT INTO edcat.vera_learning_events 
        (tenant_id, variant_id, qa_bank_id, user_feedback, feedback_score, user_comment, 
         user_message, vera_response, event_type, session_id, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'user_feedback', $9, $10)
      `, [
        tenantId,
        variantId || null,
        qaBankId || null,
        feedback_type,
        score,
        comment || null,
        userMessage || null,
        veraResponse || null,
        sessionId || null,
        userId || null
      ]);
      
      // Update variant effectiveness if variantId provided
      if (variantId) {
        const normalizedScore = score / 5.0; // Convert 1-5 to 0-1
        
        await queryEdcatAI(`
          UPDATE edcat.vera_response_variants 
          SET user_rating = COALESCE((user_rating + $1) / 2, $1),
              usage_count = usage_count + 1,
              effectiveness_score = COALESCE(
                (effectiveness_score * 0.7 + $1 * 0.3),
                $1
              )
          WHERE id = $2
        `, [normalizedScore, variantId]);
        
        // If score >= 4, promote to Q&A bank if not already there
        if (score >= 4) {
          await this.promoteVariantToQABank(variantId, tenantId);
        }
      }
      
      console.log(`[VeraLearning] ✅ Recorded feedback: ${feedback_type} (score: ${score})`);
      return { success: true, feedback_type, score };
    } catch (error) {
      console.error('[VeraLearning] Error recording feedback:', error);
      throw error;
    }
  }

  /**
   * Generate new response variations using template system
   * @param {string} intent - User intent
   * @param {string} topic - Topic/subject
   * @param {string} baseResponse - Base response to vary
   * @param {string} tenantId - Tenant ID
   */
  async generateResponseVariation(intent, topic, baseResponse, tenantId = DEFAULT_TENANT_ID) {
    try {
      // Determine template type from intent
      let templateType = 'explanation';
      if (intent?.toLowerCase().includes('definition') || intent?.toLowerCase().includes('define')) {
        templateType = 'definition';
      } else if (intent?.toLowerCase().includes('procedure') || intent?.toLowerCase().includes('how')) {
        templateType = 'procedure';
      } else if (intent?.toLowerCase().includes('compare')) {
        templateType = 'comparison';
      }
      
      // Get relevant templates
      const templates = await queryEdcatAI(`
        SELECT * FROM edcat.vera_response_templates 
        WHERE template_type = $1 
          AND is_active = TRUE
          AND (tenant_id = $2 OR tenant_id = $3)
        ORDER BY success_rate DESC NULLS LAST, usage_count DESC
        LIMIT 3
      `, [templateType, tenantId, DEFAULT_TENANT_ID]);

      const variations = [];
      
      for (const template of templates.rows) {
        try {
          // Fill template with context
          let variation = template.template_text
            .replace(/\[TERM\]/g, topic || 'the subject')
            .replace(/\[DEFINITION\]/g, baseResponse || '')
            .replace(/\[CONTEXT\]/g, `in the context of ${topic || 'quality management'}`)
            .replace(/\[TOPIC\]/g, topic || 'quality management')
            .replace(/\[RESPONSE\]/g, baseResponse || '');
          
          variations.push({
            text: variation,
            template_id: template.id,
            template_name: template.template_name,
            type: template.template_type
          });
        } catch (err) {
          console.warn(`[VeraLearning] Error filling template ${template.id}:`, err.message);
        }
      }
      
      return variations;
    } catch (error) {
      console.error('[VeraLearning] Error generating variations:', error);
      return [];
    }
  }

  /**
   * Vera learns from conversation - create new variants from good responses
   * @param {Array} conversationHistory - Array of conversation turns
   * @param {string} tenantId - Tenant ID
   */
  async learnFromConversation(conversationHistory, tenantId = DEFAULT_TENANT_ID) {
    try {
      let learnedCount = 0;
      
      for (const turn of conversationHistory) {
        if (turn.user_rating >= 4 || turn.feedback === 'positive') {
          // This was a good response - create variant
          try {
            await queryEdcatAI(`
              INSERT INTO edcat.vera_response_variants 
              (tenant_id, question_text, response_text, response_type, created_via, created_by, is_approved, is_active)
              VALUES ($1, $2, $3, 'user_validated', 'vera_generated', 'vera', false, true)
              ON CONFLICT DO NOTHING
            `, [
              tenantId,
              turn.user_message || turn.message || null,
              turn.vera_response || turn.response || ''
            ]);
            learnedCount++;
          } catch (err) {
            console.warn('[VeraLearning] Error creating variant from conversation:', err.message);
          }
        }
      }
      
      if (learnedCount > 0) {
        console.log(`[VeraLearning] ✅ Learned ${learnedCount} new variants from conversation`);
      }
      
      return { learnedCount };
    } catch (error) {
      console.error('[VeraLearning] Error learning from conversation:', error);
      return { learnedCount: 0, error: error.message };
    }
  }

  /**
   * Promote high-performing variant to main Q&A bank
   * @param {string} variantId - Variant ID
   * @param {string} tenantId - Tenant ID
   */
  async promoteVariantToQABank(variantId, tenantId = DEFAULT_TENANT_ID) {
    try {
      const variant = await queryEdcatAI(`
        SELECT question_text, response_text, effectiveness_score, category
        FROM edcat.vera_response_variants 
        WHERE id = $1 AND is_active = TRUE
      `, [variantId]);

      if (variant.rows.length === 0) {
        return { success: false, reason: 'Variant not found' };
      }

      const v = variant.rows[0];
      
      // Only promote if effectiveness is high
      if ((v.effectiveness_score || 0) > 0.85) {
        try {
          await queryEdcatAI(`
            INSERT INTO edcat.vera_query_response_bank 
            (tenant_id, question_text, response_text, category, approved, confidence_score)
            VALUES ($1, $2, $3, $4, true, $5)
            ON CONFLICT (tenant_id, question_text, response_text) DO NOTHING
          `, [
            tenantId,
            v.question_text || 'Generated variant',
            v.response_text,
            v.category || 'user_created',
            v.effectiveness_score
          ]);
          
          // Record promotion event
          await queryEdcatAI(`
            INSERT INTO edcat.vera_learning_events 
            (tenant_id, variant_id, event_type, metadata)
            VALUES ($1, $2, 'response_promoted', $3)
          `, [tenantId, variantId, JSON.stringify({ effectiveness_score: v.effectiveness_score })]);
          
          console.log(`[VeraLearning] ✅ Promoted variant ${variantId} to Q&A bank`);
          return { success: true, promoted: true };
        } catch (err) {
          if (err.code === '23505') {
            // Already exists
            return { success: true, promoted: false, reason: 'Already in Q&A bank' };
          }
          throw err;
        }
      }
      
      return { success: true, promoted: false, reason: 'Effectiveness score too low' };
    } catch (error) {
      console.error('[VeraLearning] Error promoting variant:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get performance stats on responses
   * @param {string} tenantId - Tenant ID
   */
  async getResponseStats(tenantId = DEFAULT_TENANT_ID) {
    try {
      const stats = await queryEdcatAI(`
        SELECT 
          COUNT(*) as total_variants,
          AVG(effectiveness_score) as avg_effectiveness,
          SUM(usage_count) as total_usage,
          COUNT(CASE WHEN is_approved THEN 1 END) as approved_count,
          COUNT(CASE WHEN is_active THEN 1 END) as active_count
        FROM edcat.vera_response_variants
        WHERE tenant_id = $1 OR tenant_id = $2
      `, [tenantId, DEFAULT_TENANT_ID]);
      
      const learningStats = await queryEdcatAI(`
        SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN user_feedback = 'positive' THEN 1 END) as positive_feedback,
          COUNT(CASE WHEN user_feedback = 'negative' THEN 1 END) as negative_feedback,
          AVG(feedback_score) as avg_feedback_score
        FROM edcat.vera_learning_events
        WHERE tenant_id = $1 OR tenant_id = $2
      `, [tenantId, DEFAULT_TENANT_ID]);
      
      return {
        variants: stats.rows[0] || {},
        learning: learningStats.rows[0] || {}
      };
    } catch (error) {
      console.error('[VeraLearning] Error getting stats:', error);
      return { variants: {}, learning: {}, error: error.message };
    }
  }

  /**
   * Create a new response variant
   * @param {Object} params
   */
  async createVariant({
    tenantId = DEFAULT_TENANT_ID,
    questionText,
    responseText,
    responseType = 'explanatory',
    category = 'general',
    createdVia = 'vera_generated',
    createdBy = 'vera',
    baseQuestionId = null
  }) {
    try {
      const result = await queryEdcatAI(`
        INSERT INTO edcat.vera_response_variants 
        (tenant_id, base_question_id, question_text, response_text, response_type, 
         category, created_via, created_by, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        RETURNING id
      `, [
        tenantId,
        baseQuestionId,
        questionText,
        responseText,
        responseType,
        category,
        createdVia,
        createdBy
      ]);
      
      // Record creation event
      await queryEdcatAI(`
        INSERT INTO edcat.vera_learning_events 
        (tenant_id, variant_id, event_type)
        VALUES ($1, $2, 'variant_created')
      `, [tenantId, result.rows[0].id]);
      
      return { success: true, variantId: result.rows[0].id };
    } catch (error) {
      console.error('[VeraLearning] Error creating variant:', error);
      throw error;
    }
  }
}

export default new VeraResponseLearningService();

