import express from 'express';
import TrainingManagement from '../services/trainingManagement.js';

const router = express.Router();
const training = new TrainingManagement();

// Create training from procedure
router.post('/from-procedure', async (req, res) => {
  try {
    const { procedureId, audience, customerId } = req.body;
    if (!procedureId || !customerId) {
      return res.status(400).json({ success: false, error: 'procedureId and customerId are required' });
    }
    const plan = await training.createTrainingFromProcedure(procedureId, audience, customerId);
    res.json({ success: true, training: plan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Competency matrix
router.get('/competency-matrix/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const matrix = await training.getCompetencyMatrix(customerId);
    res.json({ success: true, matrix });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Training gaps
router.get('/gaps/:customerId/:standardId', async (req, res) => {
  try {
    const { customerId, standardId } = req.params;
    const gaps = await training.identifyTrainingGaps(customerId, standardId);
    res.json({ success: true, trainingGapsFound: gaps.length, gaps });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


