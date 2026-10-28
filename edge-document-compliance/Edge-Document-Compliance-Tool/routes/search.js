import express from 'express';
import SearchService from '../services/SearchService.js';

const router = express.Router();

router.get('/documents', async (req, res) => {
  try {
    const term = req.query.q || '';
    const results = await SearchService.searchDocuments(term);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/requirements', async (req, res) => {
  try {
    const term = req.query.q || '';
    const results = await SearchService.searchRequirements(term);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
