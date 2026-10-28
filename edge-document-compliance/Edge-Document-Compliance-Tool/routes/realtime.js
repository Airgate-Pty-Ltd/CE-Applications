import express from 'express';

const router = express.Router();

router.get('/status', (_req, res) => {
  res.json({ success: true, status: 'connected', timestamp: new Date().toISOString() });
});

export default router;
