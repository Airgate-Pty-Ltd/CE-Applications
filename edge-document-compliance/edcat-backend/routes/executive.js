import express from 'express';
import ExecutiveIntelligenceService from '../services/ExecutiveIntelligenceService.js';
import PredictiveRiskScoringEngine from '../services/PredictiveRiskScoringEngine.js';
import ERPConnectorService from '../services/ERPConnectorService.js';
import LocalizationService from '../services/LocalizationService.js';

const router = express.Router();

router.get('/dashboard', async (req, res) => {
  try {
    const { customerId } = req.query;
    const data = await ExecutiveIntelligenceService.getExecutiveDashboard(customerId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/board-report', async (req, res) => {
  try {
    const { customerId, period } = req.query;
    const data = await ExecutiveIntelligenceService.generateBoardReport(customerId, period);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/risk-score/:assessmentId', async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const data = await PredictiveRiskScoringEngine.calculateRiskScore(req.query.customerId, assessmentId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/risk-anomalies/:customerId', async (req, res) => {
  try {
    const data = await PredictiveRiskScoringEngine.detectAnomalies(req.params.customerId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/erp/connect', async (req, res) => {
  try {
    const { customerId, erpType, credentials } = req.body;
    const data = await ERPConnectorService.registerERPConnection(customerId, erpType, credentials || {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/erp/sync/:connectionId', async (req, res) => {
  try {
    const data = await ERPConnectorService.syncFromERP(req.params.connectionId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/localization/content/:resourceType/:resourceId', async (req, res) => {
  try {
    const data = await LocalizationService.getLocalizedContent(
      req.params.resourceType,
      req.params.resourceId,
      req.query.language || 'en-US'
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/localization/regional-variant/:framework/:region', async (req, res) => {
  try {
    const data = await LocalizationService.getRegionalVariant(req.params.framework, req.params.region);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
