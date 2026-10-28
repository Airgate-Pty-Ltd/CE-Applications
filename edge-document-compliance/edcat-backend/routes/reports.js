import express from 'express';
import { query } from '../database/connection.js';
import ReportService from '../services/ReportService.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM reports ORDER BY generated_at DESC LIMIT 100');
    res.json({ success: true, reports: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { assessment_id, report_type } = req.body;
    if (!assessment_id) {
      return res.status(400).json({ success: false, error: 'assessment_id required' });
    }

    if (report_type && report_type !== 'executive_summary') {
      return res.status(400).json({ success: false, error: 'Only executive_summary supported in Hour 4' });
    }

    const report = await ReportService.generateExecutiveSummary(assessment_id, req.body.generated_by || 'system');
    res.status(201).json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    res.json({ success: true, report: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/files', async (req, res) => {
  try {
    const files = await query('SELECT * FROM report_files WHERE report_id = $1', [req.params.id]);
    res.json({ success: true, files: files.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
