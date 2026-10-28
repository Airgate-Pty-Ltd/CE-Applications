/**
 * Vera Memory Manager
 * Vera remembers things and references context
 */

import { queryEdcatAI } from '../../config/databases.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

const VeraMemoryManager = {

  async recordShortTermMemory(conversationId, userId, facts) {
    try {
      const result = await queryEdcatAI(
        `INSERT INTO edcat.vera_conversation_memory
         (conversation_id, user_id, short_term_facts, short_term_learned_at, memory_confidence)
         VALUES ($1, $2, $3, NOW(), 0.85)
         ON CONFLICT (conversation_id) DO UPDATE
         SET short_term_facts = $3, short_term_learned_at = NOW(), updated_at = NOW()`,
        [conversationId, userId, JSON.stringify(facts)]
      );
      return result.rows[0];
    } catch (error) {
      // If conflict doesn't work, try update
      try {
        const updateResult = await queryEdcatAI(
          `UPDATE vera_conversation_memory
           SET short_term_facts = $1, short_term_learned_at = NOW(), updated_at = NOW()
           WHERE conversation_id = $2
           RETURNING *`,
          [JSON.stringify(facts), conversationId]
        );
        if (updateResult.rows.length > 0) {
          return updateResult.rows[0];
        }
        // If no existing record, insert
        return await queryEdcatAI(
          `INSERT INTO edcat.vera_conversation_memory
           (conversation_id, user_id, short_term_facts, short_term_learned_at, memory_confidence)
           VALUES ($1, $2, $3, NOW(), 0.85)
           RETURNING *`,
          [conversationId, userId, JSON.stringify(facts)]
        );
      } catch (updateError) {
        console.error('[VeraMemoryManager] Error recording short-term memory:', updateError.message);
        return null;
      }
    }
  },

  async recordLongTermMemory(userId, tenantId, patterns) {
    try {
      const result = await queryEdcatAI(
        `INSERT INTO edcat.vera_user_interaction_patterns
         (user_id, tenant_id, user_expertise_level, preferred_response_tone)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE
         SET user_expertise_level = $3, 
             preferred_response_tone = $4, 
             updated_at = NOW()`,
        [userId, tenantId || DEFAULT_TENANT_ID, patterns.expertise, patterns.tone]
      );
      return result.rows[0];
    } catch (error) {
      // If no unique constraint, try update
      try {
        const existing = await queryEdcatAI(
          `SELECT * FROM edcat.vera_user_interaction_patterns WHERE user_id = $1`,
          [userId]
        );
        if (existing.rows.length > 0) {
          return await queryEdcatAI(
            `UPDATE vera_user_interaction_patterns
             SET user_expertise_level = $1, preferred_response_tone = $2, updated_at = NOW()
             WHERE user_id = $3
             RETURNING *`,
            [patterns.expertise, patterns.tone, userId]
          );
        } else {
          return await queryEdcatAI(
            `INSERT INTO edcat.vera_user_interaction_patterns
             (user_id, tenant_id, user_expertise_level, preferred_response_tone)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [userId, tenantId || DEFAULT_TENANT_ID, patterns.expertise, patterns.tone]
          );
        }
      } catch (updateError) {
        console.error('[VeraMemoryManager] Error recording long-term memory:', updateError.message);
        return null;
      }
    }
  },

  async getConversationMemory(conversationId) {
    try {
      const result = await queryEdcatAI(
        `SELECT * FROM edcat.vera_conversation_memory 
         WHERE conversation_id = $1 AND is_active = TRUE
         ORDER BY created_at DESC
         LIMIT 1`,
        [conversationId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('[VeraMemoryManager] Error getting conversation memory:', error.message);
      return null;
    }
  },

  async getUserProfile(userId) {
    try {
      const result = await queryEdcatAI(
        `SELECT * FROM vera_user_interaction_patterns 
         WHERE user_id = $1`,
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('[VeraMemoryManager] Error getting user profile:', error.message);
      return null;
    }
  },

  async referenceMemoryInResponse(conversationId, memoryId) {
    try {
      // When Vera uses a memory, track that it was helpful
      const result = await queryEdcatAI(
        `UPDATE vera_conversation_memory 
         SET times_referenced = times_referenced + 1,
             last_referenced_at = NOW(),
             helped_improve_response = TRUE,
             updated_at = NOW()
         WHERE memory_id = $1
         RETURNING *`,
        [memoryId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('[VeraMemoryManager] Error referencing memory:', error.message);
      return null;
    }
  },

  async updateConversationSummary(conversationId, summary, insights) {
    try {
      const result = await queryEdcatAI(
        `UPDATE vera_conversation_memory
         SET conversation_summary = $1,
             key_insights_from_user = $2,
             updated_at = NOW()
         WHERE conversation_id = $3
         RETURNING *`,
        [summary, insights, conversationId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('[VeraMemoryManager] Error updating conversation summary:', error.message);
      return null;
    }
  }
};

export default VeraMemoryManager;

