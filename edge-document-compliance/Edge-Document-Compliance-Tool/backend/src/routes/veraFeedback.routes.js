/**
 * Vera Feedback Routes
 * Handle user feedback on Vera's responses for learning
 */

import express from 'express';
import VeraResponseLearningService from '../services/vera/VeraResponseLearningService.js';

const router = express.Router();

/**
 * POST /api/vera/feedback
 * Record user feedback on a Vera response
 * 
 * Body:
 * {
 *   "variantId": "uuid", // Optional - ID of response variant
 *   "qaBankId": "uuid",  // Optional - ID of Q&A bank entry
 *   "messageId": "uuid", // Optional - Message ID from conversation
 *   "rating": 1-5,       // Required - User rating
 *   "feedback": "positive|negative|partial|irrelevant", // Optional
 *   "comment": "string", // Optional - User comment
 *   "userMessage": "string", // Optional - Original user message
 *   "veraResponse": "string" // Optional - Vera's response
 * }
 */
router.post('/feedback', async (req, res) => {
  try {
    const {
      variantId,
      qaBankId,
      messageId,
      rating,
      feedback,
      comment,
      userMessage,
      veraResponse
    } = req.body;

    // Validate required fields
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating is required and must be between 1 and 5'
      });
    }

    const sessionId = req.headers['x-session-id'] || req.body.sessionId || 'feedback-session';
    const userId = req.user?.id || req.headers['x-user-id'] || req.body.userId || 'anonymous';
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.body.tenantId || '00000000-0000-0000-0000-000000000000';

    // Record feedback
    const result = await VeraResponseLearningService.recordFeedback({
      variantId: variantId || messageId, // Use messageId as variantId if provided
      qaBankId,
      userFeedback: feedback || (rating >= 4 ? 'positive' : rating >= 2 ? 'partial' : 'negative'),
      score: rating,
      comment,
      userMessage,
      veraResponse,
      sessionId,
      userId,
      tenantId
    });

    // If good feedback, Vera might generate variations for learning
    if (rating >= 4 && veraResponse) {
      try {
        const variations = await VeraResponseLearningService.generateResponseVariation(
          'user_feedback_learning',
          userMessage || 'quality management',
          veraResponse,
          tenantId
        );
        
        if (variations.length > 0) {
          console.log('[VeraFeedback] 🧠 Vera learned these variations:', variations.length);
          result.variations_generated = variations.length;
        }
      } catch (variationError) {
        console.warn('[VeraFeedback] Could not generate variations:', variationError.message);
      }
    }

    res.json({
      success: true,
      message: 'Vera learned from your feedback!',
      feedback_type: result.feedback_type,
      rating: result.score,
      variations_generated: result.variations_generated || 0
    });
  } catch (error) {
    console.error('[VeraFeedback] Error recording feedback:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vera/learning/stats
 * Get Vera's learning statistics
 */
router.get('/learning/stats', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.body.tenantId || '00000000-0000-0000-0000-000000000000';
    
    const stats = await VeraResponseLearningService.getResponseStats(tenantId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[VeraFeedback] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

