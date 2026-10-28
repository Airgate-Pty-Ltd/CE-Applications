import express from 'express';
import EdcatQMSIntegration from '../services/edcatQMSIntegration.js';

const router = express.Router();
const qms = new EdcatQMSIntegration();

// Execute complete remediation workflow
router.post('/remediation-workflow', async (req, res) => {
  try {
    const { customerId, standardId } = req.body;
    if (!customerId || !standardId) {
      return res.status(400).json({ success: false, error: 'customerId and standardId are required' });
    }
    const result = await qms.executeCompleteRemediationWorkflow(customerId, standardId);
    res.json({
      success: true,
      workflow: result,
      message: `Remediation workflow started: ${result.capasCreated} CAPAs, ${result.proceduresCreated} procedures, ${result.trainingsCreated} trainings created.`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get audit trail
router.get('/audit-trail/:customerId/:standardId', async (req, res) => {
  try {
    const { customerId, standardId } = req.params;
    const trail = await qms.generateAuditTrail(customerId, standardId);
    res.json({ success: true, auditTrail: trail });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


