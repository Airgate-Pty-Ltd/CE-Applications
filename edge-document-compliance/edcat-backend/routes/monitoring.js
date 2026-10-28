import express from 'express';
import MonitoringService from '../services/MonitoringService.js';

const router = express.Router();

router.get('/metrics', async (_req, res) => {
  try {
    const metrics = await MonitoringService.latestMetrics();
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/snapshot', async (_req, res) => {
  try {
    const snapshot = await MonitoringService.recordSnapshot();
    res.json({ success: true, snapshot });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/alerts', async (_req, res) => {
  try {
    const alerts = await MonitoringService.latestAlerts();
    res.json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
