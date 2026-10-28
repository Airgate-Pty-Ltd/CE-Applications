import express from 'express';
import KPIMetrics from '../services/kpiMetrics.js';

const router = express.Router();
const kpi = new KPIMetrics();

// GET /api/kpi/dashboard/:customerId
router.get('/dashboard/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const kpis = await kpi.calculateQMSKPIs(customerId);
    res.json({ success: true, kpis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


