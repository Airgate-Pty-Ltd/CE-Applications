import express from 'express';
import IntegrationService from '../services/IntegrationService.js';

const router = express.Router();

router.post('/webhooks', async (req, res) => {
  try {
    const webhook = await IntegrationService.registerWebhook(req.body);
    res.status(201).json({ success: true, webhook });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/webhooks/test', async (req, res) => {
  try {
    await IntegrationService.dispatchEvent(req.body.event_type, req.body.payload || {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/webhooks', async (_req, res) => {
  try {
    const webhooks = await IntegrationService.listWebhooks();
    res.json({ success: true, webhooks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
