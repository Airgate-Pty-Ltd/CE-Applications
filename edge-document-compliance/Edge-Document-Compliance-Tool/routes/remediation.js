import express from 'express';
import RemediationService from '../services/RemediationService.js';

const router = express.Router();

router.post('/document/:id', async (req, res) => {
  try {
    const suggestions = await RemediationService.suggestFromDocument(req.params.id);
    res.json({ success: true, suggestions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/text', (req, res) => {
  try {
    const suggestions = RemediationService.suggestFromText(req.body.text || '');
    res.json({ success: true, suggestions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
