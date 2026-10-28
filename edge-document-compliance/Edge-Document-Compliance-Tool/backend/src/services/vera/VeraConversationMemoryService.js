/**
 * Vera Conversation Memory Service
 * 
 * Handles:
 * 1. Storing conversation history
 * 2. Learning from corrections
 * 3. Building conversation context for next response
 * 4. Pronoun resolution (it, that, etc.)
 */

import { queryEdcatAI } from '../../config/databases.js';

class VeraConversationMemoryService {
  /**
   * Record a conversation turn with optional learning
   * 
   * @param {string} sessionId - Conversation session ID
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   * @param {string} userMessage - What user said
   * @param {object} veraResponse - What Vera responded
   * @param {object} userFeedback - Optional: correction/approval
   */
  static async recordConversationTurn(sessionId, tenantId, userId, userMessage, veraResponse, userFeedback = null) {
    try {
      // STEP 1: Save user message
      await queryEdcatAI(
        `INSERT INTO edcat.ai_conversation_history 
         (session_id, tenant_id, user_id, role, message_text, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT DO NOTHING`,
        [
          sessionId,
          tenantId,
          userId,
          'user',
          userMessage,
          JSON.stringify({ type: 'user_message' })
        ]
      );

      // STEP 2: Save Vera's response
      await queryEdcatAI(
        `INSERT INTO edcat.ai_conversation_history 
         (session_id, tenant_id, user_id, role, message_text, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT DO NOTHING`,
        [
          sessionId,
          tenantId,
          userId,
          'assistant',
          veraResponse.answer || veraResponse.message || '',
          JSON.stringify({
            type: 'vera_response',
            source: veraResponse.source || veraResponse.metadata?.source,
            confidence: veraResponse.confidence || veraResponse.metadata?.confidence,
            matchType: veraResponse.matchType || veraResponse.metadata?.matchType,
            qaId: veraResponse.qaId || veraResponse.metadata?.qaId
          })
        ]
      );

      // STEP 3: If user provided feedback, learn from it
      if (userFeedback) {
        await this.recordLearningEvent(sessionId, tenantId, userId, userMessage, veraResponse, userFeedback);
      }

      console.log(`[VeraMemory] ✅ Recorded turn in session ${sessionId}`);
      return true;

    } catch (error) {
      console.error('[VeraMemory] Error recording conversation:', error.message);
      return false;
    }
  }

  /**
   * Record a learning event from user feedback
   */
  static async recordLearningEvent(sessionId, tenantId, userId, userMessage, veraResponse, feedback) {
    try {
      let eventType = 'conversation_turn';
      let eventData = {};

      // User correction: "No, that's wrong. It should be..."
      if (feedback.type === 'correction') {
        eventType = 'correction';
        eventData = {
          original_response: veraResponse.answer || veraResponse.message,
          corrected_response: feedback.correctedAnswer,
          reason: feedback.reason || 'user_provided_correction'
        };

        // Update Q&A bank with better response
        const qaId = veraResponse.qaId || veraResponse.metadata?.qaId;
        if (qaId) {
          await queryEdcatAI(
            `UPDATE edcat.vera_query_response_bank 
             SET response_text = $1, 
                 confidence_score = LEAST(0.99, confidence_score + 0.05),
                 updated_at = NOW()
             WHERE id = $2`,
            [feedback.correctedAnswer, qaId]
          );
          console.log(`[VeraMemory] ✅ Updated Q&A entry ${qaId} based on correction`);
        }
      }

      // User approval: "Yes, that's right"
      if (feedback.type === 'approval') {
        eventType = 'approval';
        eventData = {
          approved_response: veraResponse.answer || veraResponse.message,
          confidence_boost: 0.02
        };

        // Boost this Q&A's confidence
        const qaId = veraResponse.qaId || veraResponse.metadata?.qaId;
        if (qaId) {
          await queryEdcatAI(
            `UPDATE edcat.vera_query_response_bank 
             SET usage_count = usage_count + 1, 
                 confidence_score = LEAST(0.99, confidence_score + 0.02),
                 updated_at = NOW()
             WHERE id = $1`,
            [qaId]
          );
          console.log(`[VeraMemory] ✅ Boosted confidence for Q&A ${qaId}`);
        }
      }

      // Log the learning event (if table exists)
      try {
        await queryEdcatAI(
          `INSERT INTO edcat.vera_learning_events 
           (session_id, tenant_id, user_id, event_type, event_data, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [sessionId, tenantId, userId, eventType, JSON.stringify(eventData)]
        );
      } catch (tableError) {
        // Table might not exist yet, that's OK
        console.warn('[VeraMemory] Learning events table not available:', tableError.message);
      }

      console.log(`[VeraMemory] ✅ Recorded learning event: ${eventType}`);
      return true;

    } catch (error) {
      console.error('[VeraMemory] Error recording learning event:', error.message);
      return false;
    }
  }

  /**
   * Build conversation context from recent messages
   * Used to resolve pronouns and understand topic continuity
   */
  static async buildConversationContext(sessionId, tenantId, depth = 5) {
    try {
      // Get last N messages
      const result = await queryEdcatAI(
        `SELECT role, message_text, metadata, created_at
         FROM edcat.ai_conversation_history
         WHERE session_id = $1 AND tenant_id = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [sessionId, tenantId, depth]
      );

      if (result.rows.length === 0) {
        return { isEmpty: true, messages: [] };
      }

      const messages = result.rows.reverse();

      // Extract conversation topics
      const topics = this.extractTopicsFromMessages(messages);
      
      // Get previous answer if this is a follow-up
      const lastVeraResponse = messages
        .filter(m => m.role === 'assistant')
        .slice(-1)[0];
      
      // Identify question type (new question vs follow-up)
      const lastUserMessage = messages
        .filter(m => m.role === 'user')
        .slice(-1)[0];
      
      const isFollowUp = lastUserMessage ? this.isFollowUpQuestion(lastUserMessage.message_text || '') : false;
      
      // Build context object
      const context = {
        isEmpty: false,
        messageCount: messages.length,
        messages: messages,
        topics: topics,
        topicHistory: topics,
        priorTopic: topics[0] || null,
        allTopics: topics,
        lastUserMessage: lastUserMessage?.message_text || null,
        lastVeraResponse: lastVeraResponse?.message_text || null,
        previousAnswer: lastVeraResponse?.message_text || null,
        isFollowUp: isFollowUp,
        suggestedContext: this.buildSuggestedContext(topics)
      };

      console.log(`[VeraMemory] ✅ Built context with ${messages.length} messages`);
      return context;

    } catch (error) {
      console.error('[VeraMemory] Error building context:', error.message);
      return { isEmpty: true, messages: [], error: error.message };
    }
  }

  /**
   * Resolve pronouns using conversation context
   * "it" → previous topic
   * "that" → previous topic
   * "compare it to X" → "compare [previous topic] to X"
   */
  static resolvePronounsInMessage(userMessage, context) {
    if (!context || context.isEmpty) {
      return userMessage;  // Can't resolve without context
    }

    const priorTopic = context.priorTopic;
    if (!priorTopic) {
      return userMessage;
    }

    let resolvedMessage = userMessage;

    // Replace "it" with prior topic
    resolvedMessage = resolvedMessage.replace(/\bit\b/gi, priorTopic);

    // Replace "that" with prior topic
    resolvedMessage = resolvedMessage.replace(/\bthat\b/gi, priorTopic);

    // Replace "this" with prior topic
    resolvedMessage = resolvedMessage.replace(/\bthis\b/gi, priorTopic);

    console.log(`[VeraMemory] Resolved: "${userMessage}" → "${resolvedMessage}"`);

    return resolvedMessage;
  }

  /**
   * Helper: Extract topics from conversation messages
   */
  static extractTopicsFromMessages(messages) {
    const topics = [];

    for (const msg of messages) {
      if (msg.role === 'assistant') {
        // Extract standards mentioned (ISO, AS, FAA, etc.)
        const standards = (msg.message_text || '').match(/\b(ISO\s*\d+|AS\s*\d+|FAA\s*Part\s*\d+|EASA|CASA|FDA)\b/gi);
        if (standards) {
          topics.push(...standards.map(s => s.toLowerCase()));
        }

        // Extract key terms
        const keyTerms = (msg.message_text || '').match(/\b(gap|analysis|requirement|compliance|procedure)\b/gi);
        if (keyTerms) {
          topics.push(...keyTerms.map(t => t.toLowerCase()));
        }
      }
    }

    return [...new Set(topics)];  // Unique topics
  }

  /**
   * Detect if this is a follow-up question
   */
  static isFollowUpQuestion(question) {
    if (!question) return false;
    
    const followUpPatterns = [
      /^(and|but|tell|show|explain|clarify|more|details)/i,
      /^(compare|contrast|vs|versus)/i,
      /^(how.*implement|how.*use|how.*do|how.*apply)/i,
      /^(what.*example|show.*example)/i,
      /^(what.*difference|what.*similar)/i
    ];

    return followUpPatterns.some(pattern => pattern.test(question));
  }

  /**
   * Build suggested context for synthesis engine
   */
  static buildSuggestedContext(topics) {
    if (!topics || topics.length === 0) return 'general compliance';
    
    const standards = topics.filter(t => /^(iso|as|faa|easa|casa|fda|iatf)/i.test(t));
    const concepts = topics.filter(t => !/^(iso|as|faa|easa|casa|fda|iatf)/i.test(t));

    let context = '';
    if (standards.length > 0) context += `Standards: ${standards.join(', ')}. `;
    if (concepts.length > 0) context += `Topics: ${concepts.join(', ')}`;

    return context || 'general compliance';
  }

  /**
   * Get a summary of conversation so far
   */
  static async getConversationSummary(sessionId, tenantId) {
    try {
      const result = await queryEdcatAI(
        `SELECT 
          COUNT(*) as message_count,
          SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_messages,
          SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as vera_responses,
          MAX(created_at) as last_message_at
         FROM edcat.ai_conversation_history
         WHERE session_id = $1 AND tenant_id = $2`,
        [sessionId, tenantId]
      );

      if (result.rows.length === 0) {
        return { sessionId, isEmpty: true };
      }

      const row = result.rows[0];
      return {
        sessionId,
        isEmpty: false,
        totalMessages: parseInt(row.message_count) || 0,
        userMessages: parseInt(row.user_messages) || 0,
        veraResponses: parseInt(row.vera_responses) || 0,
        lastActivityAt: row.last_message_at
      };

    } catch (error) {
      console.error('[VeraMemory] Error getting summary:', error.message);
      return { sessionId, error: error.message };
    }
  }

  /**
   * Store a conversation message in database
   * Supports both object parameter and individual parameters
   * @param {Object|string} paramsOrSessionId - Either params object or sessionId string
   * @param {string} [userId] - User ID (if first param is string)
   * @param {string} [message] - Message text (if first param is string)
   * @param {string} [response] - Response text (if first param is string)
   * @param {string} [intent] - Intent (if first param is string)
   * @param {object} [metadata] - Metadata (if first param is string)
   * @returns {Promise<Object|null>} Stored message record or null
   */
  static async storeMessage(paramsOrSessionId, userId, message, response, intent = null, metadata = {}) {
    try {
      // Handle both object parameter and individual parameters
      let sessionId, finalUserId, messageText, responseText, finalIntent, finalMetadata;
      
      if (typeof paramsOrSessionId === 'object' && paramsOrSessionId !== null) {
        // Object parameter style
        sessionId = paramsOrSessionId.sessionId;
        finalUserId = paramsOrSessionId.userId || '00000000-0000-0000-0000-000000000000';
        messageText = paramsOrSessionId.messageText || paramsOrSessionId.message;
        responseText = paramsOrSessionId.responseText || paramsOrSessionId.response;
        finalIntent = paramsOrSessionId.intent || null;
        finalMetadata = paramsOrSessionId.metadata || {};
      } else {
        // Individual parameters style
        sessionId = paramsOrSessionId;
        finalUserId = userId || '00000000-0000-0000-0000-000000000000';
        messageText = message;
        responseText = response;
        finalIntent = intent;
        finalMetadata = metadata;
      }
      
      if (!sessionId) {
        console.warn('[VeraMemory] storeMessage called without sessionId');
        return null;
      }
      
      const { v4: uuidv4 } = await import('uuid');
      
      // Store message (user or assistant based on metadata.role)
      const role = finalMetadata.role || (messageText && !responseText ? 'user' : 'assistant');
      const textToStore = messageText || responseText;
      
      if (!textToStore) {
        console.warn('[VeraMemory] storeMessage called without message or response text');
        return null;
      }
      
      const messageId = uuidv4();
      const query = `
        INSERT INTO edcat.ai_conversation_history 
        (id, session_id, user_id, role, message_text, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT DO NOTHING
        RETURNING id
      `;
      
      const result = await queryEdcatAI(query, [
        messageId,
        sessionId,
        finalUserId,
        role,
        textToStore,
        JSON.stringify({ intent: finalIntent, ...finalMetadata })
      ]);
      
      if (result.rows && result.rows.length > 0) {
        console.log(`[VeraMemory] Stored ${role} message: ${messageId}`);
        return { id: result.rows[0].id, messageId };
      }
      
      return { id: messageId, messageId };
      
    } catch (error) {
      console.error('[VeraMemory] Error storing message:', error.message);
      // Don't throw - allow conversation to continue even if memory fails
      return null;
    }
  }
}

export default VeraConversationMemoryService;
