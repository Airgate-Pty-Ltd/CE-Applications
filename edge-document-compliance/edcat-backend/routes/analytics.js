import express from 'express';
import AnalyticsService from '../services/AnalyticsService.js';

const router = express.Router();

router.get('/overview', async (_req, res) => {
  try {
    const data = await AnalyticsService.getOverview();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/trend', async (_req, res) => {
  try {
    const data = await AnalyticsService.getTrend();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/predictive', async (_req, res) => {
  try {
    const data = await AnalyticsService.getPredictiveScores();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/forecast', async (_req, res) => {
  try {
    const data = await AnalyticsService.getForecast();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/audit', async (_req, res) => {
  try {
    const data = await AnalyticsService.getAuditInsights();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
