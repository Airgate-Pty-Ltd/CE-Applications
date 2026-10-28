import express from 'express';
import ConfigurationService from '../services/ConfigurationService.js';

const router = express.Router();

router.get('/tenant/:customerId', async (req, res) => {
  try {
    const config = await ConfigurationService.getTenantConfig(req.params.customerId);
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/tenant/:customerId', async (req, res) => {
  try {
    const config = await ConfigurationService.updateTenantConfig(
      req.params.customerId,
      req.body || {},
      req.body?.updatedBy || 'admin'
    );
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
