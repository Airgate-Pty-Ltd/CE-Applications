/**
 * Vera Context Manager
 * Manages real-time conversation context for Vera
 */

import { queryEdcatAI } from '../../config/databases.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

const VeraContextManager = {
  
  async initializeContext(conversationId, userId, tenantId = DEFAULT_TENANT_ID) {
    // When conversation starts, create or get existing context tracking
    try {
      // First, try to get existing context
      const existing = await queryEdcatAI(
        `SELECT * FROM edcat.vera_conversation_context 
         WHERE conversation_id = $1`,
        [conversationId]
      );
      
      if (existing.rows.length > 0) {
        return existing.rows[0];
      }
      
      // If not exists, create new context
      const result = await queryEdcatAI(
        `INSERT INTO edcat.vera_conversation_context 
         (conversation_id, user_id, tenant_id, active_task, current_phase, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (conversation_id) DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [conversationId, userId, tenantId, 'undefined', 'greeting']
      );
      return result.rows[0];
    } catch (error) {
      console.error('[VeraContextManager] Error initializing context:', error.message);
      throw error;
    }
  },

  async updateTaskProgress(contextId, task, progress) {
    try {
      // First, ensure the column exists
      await queryEdcatAI(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'edcat' 
            AND table_name = 'vera_conversation_context' 
            AND column_name = 'task_progress'
          ) THEN
            ALTER TABLE edcat.vera_conversation_context 
            ADD COLUMN task_progress DECIMAL(3,2) DEFAULT 0.00;
          END IF;
        END $$;
      `);
      
      const result = await queryEdcatAI(
        `UPDATE edcat.vera_conversation_context 
         SET active_task = $1, task_progress = $2, updated_at = NOW()
         WHERE context_id = $3
         RETURNING *`,
        [task, progress, contextId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('[VeraContextManager] Error updating task progress:', error.message);
      // Don't throw - allow conversation to continue
      return null;
    }
  },

  async updatePhase(contextId, phase) {
    try {
      const result = await queryEdcatAI(
        `UPDATE edcat.vera_conversation_context 
         SET current_phase = $1, phase_start_time = NOW(), messages_in_current_phase = 0, updated_at = NOW()
         WHERE context_id = $2
         RETURNING *`,
        [phase, contextId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('[VeraContextManager] Error updating phase:', error.message);
      throw error;
    }
  },

  async recordUserInput(contextId, input, inputType = 'message') {
    try {
      const result = await queryEdcatAI(
        `UPDATE edcat.vera_conversation_context 
         SET last_user_input = $1, messages_in_current_phase = messages_in_current_phase + 1, updated_at = NOW()
         WHERE context_id = $2
         RETURNING *`,
        [input, contextId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('[VeraContextManager] Error recording user input:', error.message);
      throw error;
    }
  },

  async recordVeraResponse(contextId, response) {
    try {
      const result = await queryEdcatAI(
        `UPDATE edcat.vera_conversation_context 
         SET last_vera_response = $1, updated_at = NOW()
         WHERE context_id = $2
         RETURNING *`,
        [response, contextId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('[VeraContextManager] Error recording Vera response:', error.message);
      throw error;
    }
  },

  async getContext(contextId) {
    try {
      const result = await queryEdcatAI(
        `SELECT * FROM edcat.vera_conversation_context WHERE context_id = $1`,
        [contextId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('[VeraContextManager] Error getting context:', error.message);
      return null;
    }
  },

  async getContextByConversation(conversationId) {
    try {
      const result = await queryEdcatAI(
        `SELECT * FROM edcat.vera_conversation_context 
         WHERE conversation_id = $1 
         ORDER BY created_at DESC
         LIMIT 1`,
        [conversationId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('[VeraContextManager] Error getting context by conversation:', error.message);
      return null;
    }
  },

  async getContextByConversationId(conversationId) {
    // Alias for getContextByConversation
    return this.getContextByConversation(conversationId);
  },

  async updateConfidenceLevel(contextId, newConfidence) {
    try {
      const result = await queryEdcatAI(
        `UPDATE edcat.vera_conversation_context 
         SET confidence_level = $1, updated_at = NOW()
         WHERE context_id = $2
         RETURNING *`,
        [newConfidence, contextId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('[VeraContextManager] Error updating confidence:', error.message);
      throw error;
    }
  },

  async updateUserState(contextId, userState) {
    try {
      const result = await queryEdcatAI(
        `UPDATE edcat.vera_conversation_context 
         SET user_is_expert = $1, 
             user_language_style = $2, 
             user_patience_level = $3,
             updated_at = NOW()
         WHERE context_id = $4
         RETURNING *`,
        [userState.isExpert, userState.languageStyle, userState.patienceLevel, contextId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('[VeraContextManager] Error updating user state:', error.message);
      throw error;
    }
  },

  async setClarificationNeeded(contextId, needed, missingDataType = null, missingDataDescription = null) {
    try {
      const result = await queryEdcatAI(
        `UPDATE edcat.vera_conversation_context 
         SET clarification_needed = $1, 
             missing_data_type = $2,
             missing_data_description = $3,
             updated_at = NOW()
         WHERE context_id = $4
         RETURNING *`,
        [needed, missingDataType, missingDataDescription, contextId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('[VeraContextManager] Error setting clarification needed:', error.message);
      throw error;
    }
  }
};

export default VeraContextManager;

