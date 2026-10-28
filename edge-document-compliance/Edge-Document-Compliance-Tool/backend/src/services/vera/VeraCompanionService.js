/**
 * VERA Companion Service
 * Integrates emotional intelligence, coaching, and personality into responses
 */

import { detectEmotion, generateEmpatheticResponse, generateCoachingQuestions, 
         adaptCommunicationStyle, generateValidation, generateEncouragement,
         needsSelfCareReminder, generateSelfCareReminder } from './VeraEmotionalIntelligence.js';
import { queryEdcatAI } from '../../config/databases.js';

/**
 * Process user message with companion intelligence
 */
export async function processCompanionMessage(userMessage, userContext = {}) {
  // Detect emotion
  const emotion = detectEmotion(userMessage);
  
  // Check for self-care needs
  const needsSelfCare = needsSelfCareReminder(userContext.conversationHistory || [], emotion);
  
  // Adapt communication style
  const style = adaptCommunicationStyle(userContext.profile || {}, emotion);
  
  // Generate validation
  const validation = generateValidation(userMessage, userContext);
  
  // Generate empathetic response
  const empatheticResponse = await generateEmpatheticResponse(userMessage, emotion, userContext);
  
  // Generate coaching questions if appropriate
  const coachingQuestions = generateCoachingQuestions(userContext, userMessage);
  
  // Generate encouragement if needed
  const encouragement = emotion.dominant !== 'calm' ? generateEncouragement(userContext, 'general') : null;
  
  // Build complete response
  let response = '';
  
  // Self-care reminder first if needed
  if (needsSelfCare) {
    response += generateSelfCareReminder() + '\n\n';
  }
  
  // Validation
  response += validation + ' ';
  
  // Empathetic response
  response += empatheticResponse;
  
  // Coaching questions (if emotion suggests need for guidance)
  if (emotion.dominant === 'confusion' || emotion.dominant === 'frustration') {
    response += '\n\nHere are some questions to help us think through this:\n';
    coachingQuestions.slice(0, 3).forEach((q, idx) => {
      response += `${idx + 1}. ${q}\n`;
    });
  }
  
  // Encouragement
  if (encouragement) {
    response += `\n\n${encouragement}`;
  }
  
  // Store interaction for learning
  await storeCompanionInteraction(userMessage, emotion, userContext);
  
  return {
    response,
    emotion: emotion.dominant,
    style,
    coaching_questions: coachingQuestions,
    needs_self_care: needsSelfCare
  };
}

/**
 * Store companion interaction for learning
 */
async function storeCompanionInteraction(userMessage, emotion, userContext) {
  try {
    await queryEdcatAI(
      `INSERT INTO edcat.vera_companion_interactions
       (user_id, message, emotion_detected, response_style, context, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        userContext.user_id || null,
        userMessage,
        emotion.dominant,
        JSON.stringify(emotion.scores),
        JSON.stringify(userContext)
      ]
    );
  } catch (error) {
    // Non-critical - log but don't fail
    console.error('[VERA Companion] Error storing interaction:', error);
  }
}

/**
 * Get user growth insights
 */
export async function getUserGrowthInsights(userId) {
  try {
    const result = await queryEdcatAI(
      `SELECT 
         COUNT(*) as total_interactions,
         emotion_detected,
         MIN(created_at) as first_interaction,
         MAX(created_at) as last_interaction
       FROM edcat.vera_companion_interactions
       WHERE user_id = $1
       GROUP BY emotion_detected
       ORDER BY last_interaction DESC`,
      [userId]
    );
    
    return {
      total_interactions: result.rows.reduce((sum, r) => sum + parseInt(r.total_interactions), 0),
      emotion_distribution: result.rows.map(r => ({
        emotion: r.emotion_detected,
        count: parseInt(r.total_interactions)
      })),
      first_interaction: result.rows[0]?.first_interaction,
      last_interaction: result.rows[0]?.last_interaction
    };
  } catch (error) {
    console.error('[VERA Companion] Error getting growth insights:', error);
    return null;
  }
}

/**
 * Generate personalized greeting based on history
 */
export async function generatePersonalizedGreeting(userId, userContext) {
  const insights = await getUserGrowthInsights(userId);
  
  if (!insights || insights.total_interactions === 0) {
    return "Hi! I'm VERA, your quality management companion. I'm here to help with quality questions, problem-solving, and just being a supportive colleague. What can I help you with today?";
  }
  
  // Personalized based on history
  const daysSinceLast = insights.last_interaction 
    ? Math.floor((Date.now() - new Date(insights.last_interaction).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  if (daysSinceLast > 7) {
    return `Welcome back! It's been a while. How have things been? I'm here to help with whatever quality challenges you're facing.`;
  }
  
  if (insights.total_interactions > 50) {
    return `Hi! Good to see you again. We've had ${insights.total_interactions} conversations together - I feel like we're really building something. What's on your mind today?`;
  }
  
  return `Hi! Good to see you. What can I help you with today?`;
}

