import express from 'express';
import ReportGenerator from '../services/reportGenerator.js';
import { query } from '../database/connection.js';

const router = express.Router();
const reportGen = new ReportGenerator();

// GET /api/reports/:analysisId/:format
router.get('/:analysisId/:format', async (req, res) => {
	try {
		const { analysisId, format } = req.params;
		const customerId = req.headers['x-tenant-id'] || req.headers['x-customer-id'];
		const standardId = req.query.standardId;

		if (!customerId || !standardId) {
			return res.status(400).json({ success: false, error: 'x-tenant-id header and standardId query are required' });
		}

		const reports = await reportGen.generateGapReport(customerId, standardId, analysisId);
		const selected = reports[format];
		if (!selected) {
			return res.status(400).json({ success: false, error: 'Invalid format. Use: word, excel, pdf' });
		}
		return res.download(selected.filePath, selected.fileName);
	} catch (e) {
		return res.status(500).json({ success: false, error: e.message });
	}
});

export default router;


