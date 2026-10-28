import express from 'express';
import RegulatoryIntelligenceHub from '../services/regulatoryIntelligenceHub.js';

const router = express.Router();
const hub = new RegulatoryIntelligenceHub();

// Manually trigger scan
router.post('/scan-now', async (req, res) => {
	try {
		const updates = await hub.monitorRegulatoryChanges();
		res.json({ success: true, updatesFound: updates.length, updates });
	} catch (e) {
		res.status(500).json({ success: false, error: e.message });
	}
});

// Refresh regulations endpoint (for frontend compatibility)
router.post('/refresh', async (req, res) => {
	try {
		const updates = await hub.monitorRegulatoryChanges();
		res.json({ 
			success: true, 
			updatesFound: updates.length, 
			updates,
			failures: 0,
			message: `Refreshed ${updates.length} regulatory sources`
		});
	} catch (e) {
		res.status(500).json({ success: false, error: e.message });
	}
});

export default router;


