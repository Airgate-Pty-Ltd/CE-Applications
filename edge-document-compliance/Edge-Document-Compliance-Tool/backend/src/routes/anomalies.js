/**
 * Anomaly Detection Routes
 */

import express from 'express';
import AnomalyDetectionEngine from '../services/advancedAI/anomalyDetectionEngine.js';

const router = express.Router();
const detector = new AnomalyDetectionEngine();

/**
 * GET /api/ai/anomalies/:customerId
 * Detect anomalies for a customer
 */
router.get('/anomalies/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const lookbackDays = parseInt(req.query.lookbackDays) || 90;

    const anomalies = await detector.detectAnomalies(customerId, lookbackDays);
    res.json({
      success: true,
      ...anomalies
    });
  } catch (error) {
    console.error('[Anomalies] Error detecting anomalies:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai/predictions/:customerId/:standardId
 * Predict future gaps for a customer/standard
 */
router.get('/predictions/:customerId/:standardId', async (req, res) => {
  try {
    const { customerId, standardId } = req.params;
    const horizonDays = parseInt(req.query.horizonDays) || 90;

    const predictions = await detector.predictFutureGaps(customerId, standardId, horizonDays);
    res.json({
      success: true,
      ...predictions
    });
  } catch (error) {
    console.error('[Anomalies] Error predicting gaps:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

