/**
 * VERA Context Service
 * 
 * Manages user sessions, preferences, conversations, and messages.
 * Builds complete user context for every VERA response.
 * 
 * Uses new database tables:
 * - vera_user_sessions (active sessions)
 * - vera_user_preferences (user settings)
 * - vera_conversations (conversation threads)
 * - vera_conversation_messages (all messages)
 * - vera_notifications (alerts)
 */

import { queryPostgres } from '../../config/databases.js';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Create or update user session
 * @param {Object} params - Session parameters
 * @returns {Promise<Object>} Session object
 */
export async function createOrUpdateSession(params = {}) {
  const {
    userId,
    sessionToken,
    ipAddress,
    userAgent,
    timezone,
    language = 'en',
    expiresInHours = 24
  } = params;

  if (!userId || !sessionToken) {
    throw new Error('userId and sessionToken are required');
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  try {
    // Check if session exists
    const existing = await queryPostgres(
      `SELECT id FROM public.vera_user_sessions
       WHERE session_token = $1 AND active = true`,
      [sessionToken]
    );

    if (existing.rows.length > 0) {
      // Update existing session
      const result = await queryPostgres(
        `UPDATE public.vera_user_sessions
         SET last_activity = NOW(),
             expires_at = $1,
             ip_address = COALESCE($2, ip_address),
             user_agent = COALESCE($3, user_agent),
             timezone = COALESCE($4, timezone),
             language = COALESCE($5, language)
         WHERE session_token = $6
         RETURNING *`,
        [expiresAt, ipAddress, userAgent, timezone, language, sessionToken]
      );
      return result.rows[0];
    } else {
      // Create new session
      const result = await queryPostgres(
        `INSERT INTO public.vera_user_sessions
         (user_id, session_token, expires_at, ip_address, user_agent, timezone, language)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [userId, sessionToken, expiresAt, ipAddress, userAgent, timezone, language]
      );
      return result.rows[0];
    }
  } catch (error) {
    console.error('[VeraContextService] Error creating/updating session:', error);
    throw error;
  }
}

/**
 * Get active session by token
 * @param {string} sessionToken - Session token
 * @returns {Promise<Object|null>} Session object or null
 */
export async function getSession(sessionToken) {
  try {
    const result = await queryPostgres(
      `SELECT * FROM public.vera_user_sessions
       WHERE session_token = $1 
         AND active = true 
         AND expires_at > NOW()`,
      [sessionToken]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('[VeraContextService] Error getting session:', error);
    return null;
  }
}

/**
 * End session (set active = false)
 * @param {string} sessionToken - Session token
 * @returns {Promise<boolean>} Success status
 */
export async function endSession(sessionToken) {
  try {
    await queryPostgres(
      `UPDATE public.vera_user_sessions
       SET active = false
       WHERE session_token = $1`,
      [sessionToken]
    );
    return true;
  } catch (error) {
    console.error('[VeraContextService] Error ending session:', error);
    return false;
  }
}

/**
 * Get or create user preferences
 * @param {string} userId - User ID
 * @param {Object} defaults - Default preferences
 * @returns {Promise<Object>} User preferences
 */
export async function getUserPreferences(userId, defaults = {}) {
  try {
    const result = await queryPostgres(
      `SELECT * FROM public.vera_user_preferences
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    } else {
      // Create default preferences
      const preferences = {
        user_id: userId,
        timezone: defaults.timezone || 'UTC',
        communication_style: defaults.communication_style || 'balanced',
        preferred_tone: defaults.preferred_tone || 'professional',
        language: defaults.language || 'en',
        notification_email: defaults.notification_email !== false,
        notification_sms: defaults.notification_sms || false,
        notification_push: defaults.notification_push !== false,
        role: defaults.role || null,
        experience_years: defaults.experience_years || 0,
        industry: defaults.industry || null
      };

      const insertResult = await queryPostgres(
        `INSERT INTO public.vera_user_preferences
         (user_id, timezone, communication_style, preferred_tone, language,
          notification_email, notification_sms, notification_push,
          role, experience_years, industry)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          preferences.user_id,
          preferences.timezone,
          preferences.communication_style,
          preferences.preferred_tone,
          preferences.language,
          preferences.notification_email,
          preferences.notification_sms,
          preferences.notification_push,
          preferences.role,
          preferences.experience_years,
          preferences.industry
        ]
      );
      return insertResult.rows[0];
    }
  } catch (error) {
    console.error('[VeraContextService] Error getting user preferences:', error);
    // Return defaults on error
    return {
      user_id: userId,
      timezone: 'UTC',
      communication_style: 'balanced',
      preferred_tone: 'professional',
      language: 'en',
      notification_email: true,
      notification_sms: false,
      notification_push: true,
      role: null,
      experience_years: 0,
      industry: null
    };
  }
}

/**
 * Update user preferences
 * @param {string} userId - User ID
 * @param {Object} updates - Preference updates
 * @returns {Promise<Object>} Updated preferences
 */
export async function updateUserPreferences(userId, updates = {}) {
  try {
    const allowedFields = [
      'timezone', 'communication_style', 'preferred_tone', 'language',
      'notification_email', 'notification_sms', 'notification_push',
      'role', 'experience_years', 'industry'
    ];

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return await getUserPreferences(userId);
    }

    updateValues.push(userId);
    updateFields.push('updated_at = NOW()');

    const result = await queryPostgres(
      `UPDATE public.vera_user_preferences
       SET ${updateFields.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      updateValues
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    } else {
      // Create if doesn't exist
      return await getUserPreferences(userId, updates);
    }
  } catch (error) {
    console.error('[VeraContextService] Error updating preferences:', error);
    throw error;
  }
}

/**
 * Get or create active conversation
 * @param {string} userId - User ID
 * @param {string} tenantId - Tenant ID
 * @param {string} topic - Conversation topic
 * @returns {Promise<Object>} Conversation object
 */
export async function getOrCreateConversation(userId, tenantId = DEFAULT_TENANT_ID, topic = 'general') {
  try {
    // Try to get active conversation for this topic
    const existing = await queryPostgres(
      `SELECT * FROM public.vera_conversations
       WHERE user_id = $1 
         AND tenant_id = $2
         AND topic = $3
         AND status = 'active'
       ORDER BY last_message_at DESC
       LIMIT 1`,
      [userId, tenantId, topic]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Create new conversation
    const conversationTitle = topic === 'general' 
      ? `Conversation ${new Date().toLocaleDateString()}`
      : `${topic.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${new Date().toLocaleDateString()}`;

    const result = await queryPostgres(
      `INSERT INTO public.vera_conversations
       (user_id, tenant_id, conversation_title, topic, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [userId, tenantId, conversationTitle, topic]
    );

    return result.rows[0];
  } catch (error) {
    console.error('[VeraContextService] Error getting/creating conversation:', error);
    throw error;
  }
}

/**
 * Get last conversation for user
 * @param {string} userId - User ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object|null>} Last conversation or null
 */
export async function getLastConversation(userId, tenantId = DEFAULT_TENANT_ID) {
  try {
    const result = await queryPostgres(
      `SELECT * FROM public.vera_conversations
       WHERE user_id = $1 AND tenant_id = $2
       ORDER BY last_message_at DESC
       LIMIT 1`,
      [userId, tenantId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('[VeraContextService] Error getting last conversation:', error);
    return null;
  }
}

/**
 * Add message to conversation
 * @param {Object} params - Message parameters
 * @returns {Promise<Object>} Message object
 */
export async function addMessageToConversation(params = {}) {
  const {
    conversationId,
    userId,
    role, // 'user' or 'vera'
    content,
    emotionalTone = null,
    responseStyleUsed = null,
    contextUsed = null,
    modelVersion = null,
    tenantId = DEFAULT_TENANT_ID
  } = params;

  if (!conversationId || !userId || !role || !content) {
    throw new Error('conversationId, userId, role, and content are required');
  }

  try {
    // Insert message
    const messageResult = await queryPostgres(
      `INSERT INTO public.vera_conversation_messages
       (conversation_id, user_id, role, content, emotional_tone,
        response_style_used, context_used, model_version, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        conversationId,
        userId,
        role,
        content,
        emotionalTone,
        responseStyleUsed,
        contextUsed ? JSON.stringify(contextUsed) : null,
        modelVersion,
        tenantId
      ]
    );

    // Update conversation last_message_at and message_count
    await queryPostgres(
      `UPDATE public.vera_conversations
       SET last_message_at = NOW(),
           message_count = message_count + 1
       WHERE id = $1`,
      [conversationId]
    );

    return messageResult.rows[0];
  } catch (error) {
    console.error('[VeraContextService] Error adding message:', error);
    throw error;
  }
}

/**
 * Get conversation messages
 * @param {string} conversationId - Conversation ID
 * @param {number} limit - Maximum messages to return
 * @returns {Promise<Array>} Array of messages
 */
export async function getConversationMessages(conversationId, limit = 50) {
  try {
    const result = await queryPostgres(
      `SELECT * FROM public.vera_conversation_messages
       WHERE conversation_id = $1
       ORDER BY timestamp ASC
       LIMIT $2`,
      [conversationId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('[VeraContextService] Error getting messages:', error);
    return [];
  }
}

/**
 * Get active notifications for user
 * @param {string} userId - User ID
 * @param {string} tenantId - Tenant ID
 * @param {number} limit - Maximum notifications
 * @returns {Promise<Array>} Array of notifications
 */
export async function getActiveNotifications(userId, tenantId = DEFAULT_TENANT_ID, limit = 10) {
  try {
    const result = await queryPostgres(
      `SELECT * FROM public.vera_notifications
       WHERE user_id = $1 
         AND tenant_id = $2
         AND (read_at IS NULL OR read_at > NOW() - INTERVAL '7 days')
       ORDER BY created_at DESC
       LIMIT $3`,
      [userId, tenantId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('[VeraContextService] Error getting notifications:', error);
    return [];
  }
}

/**
 * Build complete user context for VERA responses
 * @param {string} userId - User ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Complete user context
 */
export async function buildUserContext(userId, options = {}) {
  const {
    tenantId = DEFAULT_TENANT_ID,
    sessionToken = null,
    includeNotifications = true,
    includeLastConversation = true
  } = options;

  try {
    // 1. Get user preferences (timezone, language, communication style, role)
    const preferences = await getUserPreferences(userId);
    
    // 2. Get active session if sessionToken provided
    let session = null;
    if (sessionToken) {
      session = await getSession(sessionToken);
    }

    // 3. Get last conversation for continuity
    let lastConversation = null;
    let lastMessages = [];
    if (includeLastConversation) {
      lastConversation = await getLastConversation(userId, tenantId);
      if (lastConversation) {
        lastMessages = await getConversationMessages(lastConversation.id, 10);
      }
    }

    // 4. Get active notifications/alerts
    let notifications = [];
    if (includeNotifications) {
      notifications = await getActiveNotifications(userId, tenantId, 10);
    }

    // 5. Build context object
    const context = {
      // User identity
      userId,
      tenantId,
      
      // Preferences
      preferences: {
        timezone: session?.timezone || preferences.timezone || 'UTC',
        language: session?.language || preferences.language || 'en',
        communicationStyle: preferences.communication_style || 'balanced',
        preferredTone: preferences.preferred_tone || 'professional',
        role: preferences.role || null,
        experienceYears: preferences.experience_years || 0,
        industry: preferences.industry || null
      },

      // Session info
      session: session ? {
        id: session.id,
        startedAt: session.started_at,
        lastActivity: session.last_activity,
        expiresAt: session.expires_at,
        timezone: session.timezone,
        language: session.language
      } : null,

      // Conversation continuity
      conversation: lastConversation ? {
        id: lastConversation.id,
        title: lastConversation.conversation_title,
        topic: lastConversation.topic,
        startedAt: lastConversation.started_at,
        lastMessageAt: lastConversation.last_message_at,
        messageCount: lastConversation.message_count,
        summary: lastConversation.summary,
        keyInsights: lastConversation.key_insights,
        actionItems: lastConversation.action_items,
        recentMessages: lastMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          emotionalTone: msg.emotional_tone,
          responseStyleUsed: msg.response_style_used
        }))
      } : null,

      // Notifications
      notifications: notifications.map(notif => ({
        id: notif.id,
        type: notif.notification_type,
        title: notif.title,
        message: notif.message,
        relatedToId: notif.related_to_id,
        actionUrl: notif.action_url,
        createdAt: notif.created_at,
        readAt: notif.read_at
      })),

      // Context metadata
      metadata: {
        hasActiveSession: !!session,
        hasActiveConversation: !!lastConversation,
        notificationCount: notifications.length,
        unreadNotificationCount: notifications.filter(n => !n.read_at).length,
        lastMessageAt: lastConversation?.last_message_at || null
      }
    };

    return context;
  } catch (error) {
    console.error('[VeraContextService] Error building user context:', error);
    // Return minimal context on error
    return {
      userId,
      tenantId,
      preferences: {
        timezone: 'UTC',
        language: 'en',
        communicationStyle: 'balanced',
        preferredTone: 'professional',
        role: null,
        experienceYears: 0,
        industry: null
      },
      session: null,
      conversation: null,
      notifications: [],
      metadata: {
        hasActiveSession: false,
        hasActiveConversation: false,
        notificationCount: 0,
        unreadNotificationCount: 0,
        lastMessageAt: null
      }
    };
  }
}

/**
 * Archive conversation
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<boolean>} Success status
 */
export async function archiveConversation(conversationId) {
  try {
    await queryPostgres(
      `UPDATE public.vera_conversations
       SET status = 'archived'
       WHERE id = $1`,
      [conversationId]
    );
    return true;
  } catch (error) {
    console.error('[VeraContextService] Error archiving conversation:', error);
    return false;
  }
}

/**
 * Update conversation summary
 * @param {string} conversationId - Conversation ID
 * @param {string} summary - Conversation summary
 * @param {string} keyInsights - Key insights
 * @param {string} actionItems - Action items
 * @returns {Promise<boolean>} Success status
 */
export async function updateConversationSummary(conversationId, summary, keyInsights = null, actionItems = null) {
  try {
    await queryPostgres(
      `UPDATE public.vera_conversations
       SET summary = $1,
           key_insights = $2,
           action_items = $3
       WHERE id = $4`,
      [summary, keyInsights, actionItems, conversationId]
    );
    return true;
  } catch (error) {
    console.error('[VeraContextService] Error updating conversation summary:', error);
    return false;
  }
}

export default {
  createOrUpdateSession,
  getSession,
  endSession,
  getUserPreferences,
  updateUserPreferences,
  getOrCreateConversation,
  getLastConversation,
  addMessageToConversation,
  getConversationMessages,
  getActiveNotifications,
  buildUserContext,
  archiveConversation,
  updateConversationSummary
};

