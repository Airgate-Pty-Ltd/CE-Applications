/**
 * VERA Conversation Context Service
 * 
 * Builds conversation history context for multi-turn conversations.
 * Ensures VERA remembers previous messages in the conversation.
 */

import { queryPostgres } from '../../config/databases.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Build conversation context from recent messages
 * @param {string} conversationId - Conversation ID
 * @param {number} maxMessages - Maximum messages to include (default 5)
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<string>} Conversation context string
 */
export async function buildConversationContext(conversationId, maxMessages = 5, tenantId = DEFAULT_TENANT_ID) {
  try {
    const result = await queryPostgres(
      `SELECT role, content, timestamp 
       FROM public.vera_conversation_messages
       WHERE conversation_id = $1 AND tenant_id = $2
       ORDER BY timestamp DESC
       LIMIT $3`,
      [conversationId, tenantId, maxMessages]
    );

    if (result.rows.length === 0) {
      return '';
    }

    // Build context string from recent messages (oldest first)
    const messages = result.rows.reverse();
    let context = 'Previous conversation:\n\n';

    messages.forEach((msg, index) => {
      const roleLabel = msg.role === 'user' ? 'USER' : 'VERA';
      context += `${roleLabel}: ${msg.content}\n\n`;
    });

    return context;
  } catch (error) {
    console.error('[VeraConversationContext] Error building context:', error);
    return ''; // Return empty context on error
  }
}

/**
 * Get conversation summary for context
 * @param {string} conversationId - Conversation ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<string>} Conversation summary
 */
export async function getConversationSummary(conversationId, tenantId = DEFAULT_TENANT_ID) {
  try {
    const result = await queryPostgres(
      `SELECT summary, key_insights, action_items
       FROM public.vera_conversations
       WHERE id = $1 AND tenant_id = $2`,
      [conversationId, tenantId]
    );

    if (result.rows.length > 0) {
      const conv = result.rows[0];
      let summary = '';
      
      if (conv.summary) {
        summary += `Summary: ${conv.summary}\n`;
      }
      
      if (conv.key_insights) {
        summary += `Key Insights: ${conv.key_insights}\n`;
      }
      
      if (conv.action_items) {
        summary += `Action Items: ${conv.action_items}\n`;
      }
      
      return summary;
    }

    return '';
  } catch (error) {
    console.error('[VeraConversationContext] Error getting summary:', error);
    return '';
  }
}

/**
 * Build full context including conversation history and summary
 * @param {string} conversationId - Conversation ID
 * @param {number} maxMessages - Maximum messages to include
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<string>} Full conversation context
 */
export async function buildFullConversationContext(conversationId, maxMessages = 5, tenantId = DEFAULT_TENANT_ID) {
  const history = await buildConversationContext(conversationId, maxMessages, tenantId);
  const summary = await getConversationSummary(conversationId, tenantId);
  
  if (summary) {
    return `${summary}\n\n${history}`;
  }
  
  return history;
}

export default {
  buildConversationContext,
  getConversationSummary,
  buildFullConversationContext
};

