/**
 * Vera Conversation Context Service
 * Manages conversation state and context checking
 */

import { queryEdcatAI } from '../config/databases.js';

const VeraConversationContextService = {

  /**
   * Get conversation context for a session
   */
  async getConversationContext(sessionId, tenantId) {
    try {
      // Check if conversation state exists
      // FIX: Check if vera_introduced column exists, use context JSONB if not
      const stateResult = await queryEdcatAI(
        `SELECT 
          last_intent,
          last_topic,
          context,
          updated_at
         FROM edcat.ai_conversation_state
         WHERE session_id = $1 AND tenant_id = $2
         LIMIT 1`,
        [sessionId, tenantId]
      );

      if (stateResult.rows.length > 0) {
        const state = stateResult.rows[0];
        const contextData = state.context || {};
        return {
          vera_introduced: contextData.vera_introduced || false,
          message_count: contextData.message_count || 0,
          last_intent: state.last_intent || null,
          last_topic: state.last_topic || null,
          context: contextData,
          updated_at: state.updated_at
        };
      }

      // Return default context if no state exists
      return {
        vera_introduced: false,
        message_count: 0,
        last_intent: null,
        last_topic: null,
        context: {},
        updated_at: null
      };
    } catch (error) {
      console.error('[VeraConversationContextService] Error getting context:', error);
      // Return default on error
      return {
        vera_introduced: false,
        message_count: 0,
        last_intent: null,
        last_topic: null,
        context: {},
        updated_at: null
      };
    }
  },

  /**
   * Detect if this is a meta-question about Vera
   */
  isMetaQuestion(message) {
    if (!message) return false;

    const patterns = [
      // Timezone, location, hours
      /time zone|timezone|what time is it/i,
      /where are you|what hours|when can you/i,
      
      // About Vera
      /who created|who built|how were you made/i,
      /what model|what version|real person|human/i,
      /background|history|what are you/i,
      /where.*come from|where.*from|where are you/i,
      
      // Self-improvement
      /how.*improve|where.*improve/i,
      /weakness|limitation|could.*be better/i,
      /what else.*know|what else.*can/i,
      
      // Self-introduction
      /tell me about yourself|introduce yourself/i,
      /who are you|what do you do/i
    ];

    return patterns.some(pattern => pattern.test(message));
  },

  /**
   * Update conversation state
   */
  async updateConversationState(sessionId, tenantId, updates) {
    try {
      const {
        vera_introduced,
        message_count,
        last_intent,
        last_topic,
        context
      } = updates;

      // FIX: Store vera_introduced and message_count in context JSONB instead of separate columns
      const contextData = {
        ...(context || {}),
        vera_introduced: vera_introduced !== undefined ? vera_introduced : (context?.vera_introduced || false),
        message_count: message_count !== undefined ? message_count : ((context?.message_count || 0) + 1)
      };

      await queryEdcatAI(
        `INSERT INTO edcat.ai_conversation_state 
         (session_id, tenant_id, last_intent, last_topic, context, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (session_id, tenant_id, persona_code) DO UPDATE SET
           last_intent = COALESCE(EXCLUDED.last_intent, edcat.ai_conversation_state.last_intent),
           last_topic = COALESCE(EXCLUDED.last_topic, edcat.ai_conversation_state.last_topic),
           context = COALESCE(EXCLUDED.context, edcat.ai_conversation_state.context),
           updated_at = NOW()`,
        [sessionId, tenantId, last_intent, last_topic, JSON.stringify(contextData)]
      );
    } catch (error) {
      console.error('[VeraConversationContextService] Error updating state:', error);
    }
  }
};

export default VeraConversationContextService;

