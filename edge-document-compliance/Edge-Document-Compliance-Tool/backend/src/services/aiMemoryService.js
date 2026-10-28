/**
 * AI Memory Service
 * Manages AI intelligence, learning, and memory
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Store learned knowledge
 */
export async function storeKnowledge(knowledgeType, knowledgeKey, knowledgeValue, options = {}) {
  const {
    customerId = null,
    standardCode = null,
    sourceType = 'conversation_analysis',
    sourceReference = null,
    confidenceScore = 0.5
  } = options;

  try {
    await queryPostgres(
      `INSERT INTO public.ai_intelligence 
       (knowledge_type, knowledge_key, knowledge_value, customer_id, standard_code, 
        source_type, source_reference, confidence_score, usage_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
       ON CONFLICT (knowledge_type, knowledge_key, customer_id, standard_code)
       DO UPDATE SET
         knowledge_value = EXCLUDED.knowledge_value,
         confidence_score = GREATEST(ai_intelligence.confidence_score, EXCLUDED.confidence_score),
         usage_count = ai_intelligence.usage_count + 1,
         updated_at = NOW(),
         last_used_at = NOW()`,
      [knowledgeType, knowledgeKey, JSON.stringify(knowledgeValue), customerId, standardCode, 
       sourceType, sourceReference, confidenceScore]
    );
    return true;
  } catch (error) {
    console.error('[aiMemory] Error storing knowledge:', error);
    return false;
  }
}

/**
 * Retrieve learned knowledge
 */
export async function getKnowledge(knowledgeType, knowledgeKey, options = {}) {
  const { customerId = null, standardCode = null } = options;

  try {
    const result = await queryPostgres(
      `SELECT knowledge_value, confidence_score, usage_count, success_count, failure_count
       FROM public.ai_intelligence
       WHERE knowledge_type = $1 
         AND knowledge_key = $2
         AND (customer_id = $3 OR customer_id IS NULL)
         AND (standard_code = $4 OR standard_code IS NULL)
       ORDER BY 
         CASE WHEN customer_id = $3 THEN 1 ELSE 2 END,
         CASE WHEN standard_code = $4 THEN 1 ELSE 2 END,
         confidence_score DESC,
         usage_count DESC
       LIMIT 1`,
      [knowledgeType, knowledgeKey, customerId, standardCode]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      // Update last_used_at
      await queryPostgres(
        `UPDATE public.ai_intelligence 
         SET last_used_at = NOW(), usage_count = usage_count + 1
         WHERE knowledge_type = $1 AND knowledge_key = $2`,
        [knowledgeType, knowledgeKey]
      );
      return {
        value: row.knowledge_value,
        confidence: parseFloat(row.confidence_score),
        usageCount: parseInt(row.usage_count),
        successCount: parseInt(row.success_count),
        failureCount: parseInt(row.failure_count)
      };
    }
    return null;
  } catch (error) {
    console.error('[aiMemory] Error retrieving knowledge:', error);
    return null;
  }
}

/**
 * Store conversation memory
 */
export async function storeConversationMemory(userQuestion, aiResponse, options = {}) {
  const {
    customerId = null,
    sessionId = null,
    questionIntent = null,
    questionKeywords = [],
    responseType = 'answer',
    standardsMentioned = [],
    documentsReferenced = []
  } = options;

  try {
    await queryPostgres(
      `INSERT INTO public.ai_conversation_memory
       (customer_id, session_id, user_question, question_intent, question_keywords,
        ai_response, response_type, standards_mentioned, documents_referenced)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [customerId, sessionId, userQuestion, questionIntent, questionKeywords,
       aiResponse, responseType, standardsMentioned, documentsReferenced]
    );
    return true;
  } catch (error) {
    console.error('[aiMemory] Error storing conversation memory:', error);
    return false;
  }
}

/**
 * Find similar past conversations
 */
export async function findSimilarConversations(userQuestion, options = {}) {
  const { customerId = null, limit = 5 } = options;

  try {
    const result = await queryPostgres(
      `SELECT user_question, ai_response, response_type, user_satisfaction, was_helpful
       FROM public.ai_conversation_memory
       WHERE (customer_id = $1 OR customer_id IS NULL)
         AND user_question % $2
       ORDER BY 
         similarity(user_question, $2) DESC,
         CASE WHEN user_satisfaction = TRUE THEN 1 ELSE 2 END,
         created_at DESC
       LIMIT $3`,
      [customerId, userQuestion, limit]
    );

    return result.rows.map(row => ({
      question: row.user_question,
      response: row.ai_response,
      responseType: row.response_type,
      wasHelpful: row.was_helpful,
      userSatisfaction: row.user_satisfaction
    }));
  } catch (error) {
    console.error('[aiMemory] Error finding similar conversations:', error);
    return [];
  }
}

/**
 * Record feedback on AI response
 */
export async function recordFeedback(memoryId, feedback) {
  const {
    satisfaction = null,
    helpful = null,
    feedbackText = null,
    rating = null
  } = feedback;

  try {
    // Update conversation memory
    await queryPostgres(
      `UPDATE public.ai_conversation_memory
       SET user_satisfaction = $1,
           was_helpful = $2,
           user_feedback = $3,
           updated_at = NOW()
       WHERE memory_id = $4`,
      [satisfaction, helpful, feedbackText, memoryId]
    );

    // Update intelligence based on feedback
    if (rating !== null) {
      // Find related intelligence entries and update them
      const memoryResult = await queryPostgres(
        `SELECT question_intent, standards_mentioned FROM public.ai_conversation_memory WHERE memory_id = $1`,
        [memoryId]
      );

      if (memoryResult.rows.length > 0) {
        const memory = memoryResult.rows[0];
        // Update pattern confidence based on feedback
        await queryPostgres(
          `UPDATE public.ai_learning_patterns
           SET match_count = match_count + 1,
               success_count = success_count + CASE WHEN $1 >= 3 THEN 1 ELSE 0 END,
               confidence = LEAST(1.0, GREATEST(0.0, 
                 (success_count + CASE WHEN $1 >= 3 THEN 1 ELSE 0 END)::DECIMAL / 
                 NULLIF(match_count + 1, 0)
               )),
               last_matched_at = NOW()
           WHERE pattern_type = 'question_pattern' 
             AND pattern_key = $2`,
          [rating, memory.question_intent]
        );
      }
    }

    return true;
  } catch (error) {
    console.error('[aiMemory] Error recording feedback:', error);
    return false;
  }
}

/**
 * Learn from successful patterns
 */
export async function learnPattern(patternType, patternKey, patternValue, options = {}) {
  const { customerId = null, standardCode = null } = options;

  try {
    await queryPostgres(
      `INSERT INTO public.ai_learning_patterns
       (pattern_type, pattern_key, pattern_value, customer_id, standard_code, match_count, success_count)
       VALUES ($1, $2, $3, $4, $5, 1, 1)
       ON CONFLICT DO NOTHING`,
      [patternType, patternKey, JSON.stringify(patternValue), customerId, standardCode]
    );
    return true;
  } catch (error) {
    console.error('[aiMemory] Error learning pattern:', error);
    return false;
  }
}

/**
 * Get best response pattern for a question type
 */
export async function getBestResponsePattern(questionIntent, options = {}) {
  const { customerId = null } = options;

  try {
    const result = await queryPostgres(
      `SELECT pattern_value, confidence, success_count, match_count
       FROM public.ai_learning_patterns
       WHERE pattern_type = 'response_pattern'
         AND pattern_key = $1
         AND (customer_id = $2 OR customer_id IS NULL)
       ORDER BY 
         CASE WHEN customer_id = $2 THEN 1 ELSE 2 END,
         confidence DESC,
         success_count DESC
       LIMIT 1`,
      [questionIntent, customerId]
    );

    if (result.rows.length > 0) {
      return {
        pattern: result.rows[0].pattern_value,
        confidence: parseFloat(result.rows[0].confidence),
        successCount: parseInt(result.rows[0].success_count),
        matchCount: parseInt(result.rows[0].match_count)
      };
    }
    return null;
  } catch (error) {
    console.error('[aiMemory] Error getting response pattern:', error);
    return null;
  }
}

/**
 * Get user preferences from conversation memory
 */
export async function getUserPreferences({ tenantId, userId }) {
  try {
    // Check vera_conversation_memory for user preferences
    const result = await queryEdcatAI(
      `SELECT user_preferences, preferred_response_tone, preferred_detail_level
       FROM edcat.vera_conversation_memory
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY last_updated DESC
       LIMIT 1`,
      [tenantId, userId]
    );

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0];
      return {
        preferred_response_tone: row.preferred_response_tone || 'friendly',
        preferred_detail_level: row.preferred_detail_level || 'intermediate',
        ...(typeof row.user_preferences === 'object' ? row.user_preferences : {})
      };
    }

    return {};
  } catch (error) {
    console.warn('[aiMemory] Could not get user preferences:', error.message);
    return {};
  }
}

/**
 * Update user preferences based on interaction patterns
 */
export async function updateUserPreferences({ tenantId, userId, conversationId, message, preferences = {} }) {
  try {
    // Detect preferences from message
    const lower = message.toLowerCase();
    const detectedPrefs = {};

    if (lower.includes('short') || lower.includes('brief')) {
      detectedPrefs.preferred_detail_level = 'concise';
    } else if (lower.includes('more detail') || lower.includes('explain more')) {
      detectedPrefs.preferred_detail_level = 'detailed';
    }

    if (lower.includes('formal') || lower.includes('businesslike')) {
      detectedPrefs.preferred_response_tone = 'formal';
    } else if (lower.includes('friendly') || lower.includes('casual')) {
      detectedPrefs.preferred_response_tone = 'friendly';
    }

    // Merge with provided preferences
    const mergedPrefs = { ...detectedPrefs, ...preferences };

    // Update or insert into vera_conversation_memory
    await queryEdcatAI(
      `INSERT INTO edcat.vera_conversation_memory (
        tenant_id, user_id, conversation_id, 
        user_preferences, preferred_response_tone, preferred_detail_level,
        last_updated
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (tenant_id, user_id, conversation_id)
      DO UPDATE SET
        user_preferences = COALESCE(EXCLUDED.user_preferences, vera_conversation_memory.user_preferences),
        preferred_response_tone = COALESCE(EXCLUDED.preferred_response_tone, vera_conversation_memory.preferred_response_tone),
        preferred_detail_level = COALESCE(EXCLUDED.preferred_detail_level, vera_conversation_memory.preferred_detail_level),
        last_updated = NOW()`,
      [
        tenantId,
        userId,
        conversationId,
        JSON.stringify(mergedPrefs),
        mergedPrefs.preferred_response_tone || null,
        mergedPrefs.preferred_detail_level || null
      ]
    );

    return mergedPrefs;
  } catch (error) {
    console.warn('[aiMemory] Could not update user preferences:', error.message);
    return preferences;
  }
}

