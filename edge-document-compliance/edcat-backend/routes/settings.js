import express from 'express';
import { SystemSettings } from '../models/index.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const settings = await SystemSettings.getAll();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const entries = req.body?.settings;
    if (typeof entries !== 'object' || entries === null) {
      return res.status(400).json({ success: false, error: 'settings object required' });
    }

    const updates = [];
    for (const [key, value] of Object.entries(entries)) {
      updates.push(SystemSettings.set(key, String(value ?? '')));
    }
    await Promise.all(updates);

    const settings = await SystemSettings.getAll();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

