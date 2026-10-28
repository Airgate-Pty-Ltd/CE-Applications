/**
 * VERA Companion Middleware
 * Integrates emotional intelligence into chat responses
 */

import { processCompanionMessage, generatePersonalizedGreeting } from './VeraCompanionService.js';
import { detectEmotion } from './VeraEmotionalIntelligence.js';
import { queryEdcatAI } from '../../config/databases.js';

/**
 * Enhance response with companion intelligence
 */
export async function enhanceWithCompanionIntelligence(userMessage, technicalResponse, userContext = {}) {
  try {
    // Detect emotion
    const emotion = detectEmotion(userMessage);
    
    // If emotion is strong (frustration, fear, burnout), enhance response
    if (emotion.confidence > 1.5 && ['frustration', 'fear', 'burnout', 'anger'].includes(emotion.dominant)) {
      const companionResult = await processCompanionMessage(userMessage, {
        ...userContext,
        technical_response: technicalResponse
      });
      
      // Combine empathetic opening with technical response
      return {
        ...technicalResponse,
        answer: `${companionResult.response}\n\n${technicalResponse.answer || technicalResponse.response || ''}`,
        companion: {
          emotion: emotion.dominant,
          needs_self_care: companionResult.needs_self_care,
          coaching_questions: companionResult.coaching_questions
        }
      };
    }
    
    // For calm/analytical messages, return technical response as-is
    return technicalResponse;
  } catch (error) {
    console.error('[VERA Companion] Error enhancing response:', error);
    // Return technical response if companion enhancement fails
    return technicalResponse;
  }
}

/**
 * Get user context for companion intelligence
 */
export async function getUserContext(userId, sessionId) {
  try {
    // Get user profile
    const profileResult = await queryEdcatAI(
      `SELECT * FROM edcat.vera_user_profiles WHERE user_id = $1`,
      [userId]
    );
    
    // Get recent conversation history
    const historyResult = await queryEdcatAI(
      `SELECT message, emotion_detected, created_at
       FROM edcat.vera_companion_interactions
       WHERE user_id = $1 OR conversation_id = $2
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId, sessionId]
    );
    
    return {
      profile: profileResult.rows[0] || null,
      conversationHistory: historyResult.rows.map(r => r.message),
      recentEmotions: historyResult.rows.map(r => r.emotion_detected)
    };
  } catch (error) {
    console.error('[VERA Companion] Error getting user context:', error);
    return {
      profile: null,
      conversationHistory: [],
      recentEmotions: []
    };
  }
}

/**
 * Check if message needs companion response (emotional vs. technical)
 */
export function needsCompanionResponse(userMessage, emotion) {
  // Strong emotions need companion response
  if (emotion.confidence > 1.5 && ['frustration', 'fear', 'burnout', 'anger', 'shame'].includes(emotion.dominant)) {
    return true;
  }
  
  // Personal/emotional language
  if (userMessage.match(/\b(feel|feeling|frustrated|worried|scared|tired|exhausted|angry|ashamed)\b/i)) {
    return true;
  }
  
  // Questions about self/feelings
  if (userMessage.match(/\b(am i|should i|can i|do i|am i doing|am i good|did i)\b/i)) {
    return true;
  }
  
  return false;
}

