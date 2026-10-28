import express from 'express';
import { getDbIntrospectionReport } from '../services/dbIntrospectService.js';

const router = express.Router();

router.get('/__db/introspect', async (req, res) => {
  if (process.env.ENABLE_DB_INTROSPECTION !== '1') {
    return res.status(403).json({
      error: 'INTROSPECTION_DISABLED',
      message: 'Set ENABLE_DB_INTROSPECTION=1 to enable this route.'
    });
  }

  try {
    const report = await getDbIntrospectionReport();
    res.json(report);
  } catch (error) {
    console.error('[__db/introspect] Error:', error);
    res.status(500).json({
      error: 'INTROSPECTION_FAILED',
      message: error.message,
      context: error.context || null
    });
  }
});

export default router;

