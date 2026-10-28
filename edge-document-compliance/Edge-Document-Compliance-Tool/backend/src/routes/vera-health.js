/**
 * VERA Health Check Route
 * Check if VERA-Core service is available
 */

import express from 'express';
import veraClient from '../clients/vera.js';

const router = express.Router();

/**
 * GET /api/vera/health
 * Check if VERA service is available
 */
router.get('/health', async (req, res) => {
  try {
    const health = await veraClient.health();
    const statusCode = health.status === 'ok' || health.ollama_connected === true ? 200 : 503;
    
    res.status(statusCode).json({
      status: health.status === 'ok' ? 'ok' : 'error',
      vera_connected: health.ollama_connected === true || health.status === 'ok',
      vera_url: veraClient.baseURL,
      details: health
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      vera_connected: false,
      vera_url: veraClient.baseURL,
      error: 'VERA health check failed',
      message: error.message
    });
  }
});

export default router;

