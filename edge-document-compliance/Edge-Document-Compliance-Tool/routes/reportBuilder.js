import express from 'express';
import ReportBuilderService from '../services/ReportBuilderService.js';

const router = express.Router();

router.get('/templates', async (_req, res) => {
  try {
    const templates = await ReportBuilderService.listTemplates();
    res.json({ success: true, templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const template = await ReportBuilderService.createTemplate(req.body);
    res.status(201).json({ success: true, template });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const report = await ReportBuilderService.generateCustomReport(req.body);
    res.status(201).json({ success: true, report });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/', async (_req, res) => {
  try {
    const reports = await ReportBuilderService.listReports();
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
