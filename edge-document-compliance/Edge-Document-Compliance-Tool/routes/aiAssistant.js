/**
 * AI Assistant API Routes
 * © 2025 Conform-Edge Quality Consulting. All rights reserved.
 */

import express from 'express';
import { EDCATAIAssistant } from '../services/aiAssistant.js';

const router = express.Router();

// Global assistant instance
const assistant = new EDCATAIAssistant();

/**
 * POST /api/ai-assistant/query
 * Process user query
 */
router.post('/query', async (req, res) => {
  try {
    const { query, assessmentId, customerId, sector, regulators, standards } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    // Initialize session if assessment provided
    if (assessmentId && !assistant.currentSession) {
      assistant.initializeSession(
        assessmentId,
        customerId,
        sector || [],
        regulators || [],
        standards || []
      );
    }

    // Process query
    const response = await assistant.processQuery(query, {
      assessmentId,
      customerId
    });

    res.json({ success: true, data: response });
  } catch (error) {
    console.error('AI Assistant query error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai-assistant/initialize
 * Initialize assistant session
 */
router.post('/initialize', async (req, res) => {
  try {
    const { assessmentId, customerId, sector, regulators, standards } = req.body;

    if (!assessmentId || !customerId) {
      return res.status(400).json({ 
        success: false, 
        error: 'assessmentId and customerId are required' 
      });
    }

    const sessionId = assistant.initializeSession(
      assessmentId,
      customerId,
      sector || [],
      regulators || [],
      standards || []
    );

    res.json({ success: true, sessionId });
  } catch (error) {
    console.error('AI Assistant initialization error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ai-assistant/history
 * Get conversation history
 */
router.get('/history', async (req, res) => {
  try {
    const history = assistant.getConversationHistory();
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('AI Assistant history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai-assistant/end-session
 * End current session
 */
router.post('/end-session', async (req, res) => {
  try {
    const summary = assistant.endSession();
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('AI Assistant end session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

