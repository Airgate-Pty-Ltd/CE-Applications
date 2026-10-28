import express from 'express';
import EmailService from '../services/EmailService.js';

const router = express.Router();

router.post('/test', async (req, res) => {
  try {
    const { recipient, subject, body } = req.body;
    if (!recipient || !subject || !body) {
      return res.status(400).json({ success: false, error: 'recipient, subject, and body required' });
    }

    const queued = await EmailService.queueEmail({ recipient, subject, body });
    res.status(201).json({ success: true, email: queued });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/process', async (_req, res) => {
  try {
    await EmailService.processQueue(10);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
