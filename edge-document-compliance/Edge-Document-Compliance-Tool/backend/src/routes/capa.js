import express from 'express';
import CAPASystem from '../services/capaSystem.js';

const router = express.Router();
const capa = new CAPASystem();

// Auto-generate CAPA from gap/clause
router.post('/from-gap', async (req, res) => {
  try {
    const { gapId, customerId, clauseId } = req.body;
    if (!customerId || !clauseId) {
      return res.status(400).json({ success: false, error: 'customerId and clauseId are required' });
    }
    const capaRecord = await capa.generateCAPAFromGap(gapId || null, customerId, clauseId);
    res.json({
      success: true,
      message: `CAPA ${capaRecord.capaNumber} created`,
      capa: capaRecord
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// CAPA dashboard
router.get('/dashboard/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const dashboard = await capa.getCAPADashboard(customerId);
    res.json({ success: true, dashboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update CAPA status
router.patch('/:capaId/status', async (req, res) => {
  try {
    const { capaId } = req.params;
    const { status, notes } = req.body;
    await capa.updateCAPAStatus(capaId, status, notes || '');
    res.json({ success: true, message: `CAPA updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


