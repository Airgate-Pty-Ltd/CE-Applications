import express from 'express';
import MobileSyncService from '../services/MobileSyncService.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const device = await MobileSyncService.registerDevice(req.body.userId || null, req.body || {});
    res.status(201).json({ success: true, device });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/sync', async (_req, res) => {
  try {
    const payload = await MobileSyncService.getSyncData();
    res.json({ success: true, data: payload });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
