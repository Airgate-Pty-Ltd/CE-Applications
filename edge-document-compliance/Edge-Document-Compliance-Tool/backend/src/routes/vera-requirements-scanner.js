/**
 * Vera Requirements Folder Scanner Routes
 * 
 * API endpoints for scanning and indexing documents from Requirements folder
 */

import express from 'express';
import { scanAndIndexRequirementsFolder, getRequirementsFolderSummary } from '../services/vera/VeraRequirementsFolderScanner.js';

const router = express.Router();

/**
 * POST /api/vera/scan-requirements
 * Scan Requirements folder and index all documents
 */
router.post('/scan-requirements', async (req, res) => {
  try {
    const { dryRun = false } = req.body;
    
    const result = await scanAndIndexRequirementsFolder({ 
      tenantId: req.tenantId || null,
      dryRun: dryRun === true || dryRun === 'true'
    });
    
    res.json(result);
  } catch (error) {
    console.error('[vera-requirements-scanner] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vera/requirements-summary
 * Get summary of indexed documents from Requirements folder
 */
router.get('/requirements-summary', async (req, res) => {
  try {
    const result = await getRequirementsFolderSummary();
    res.json(result);
  } catch (error) {
    console.error('[vera-requirements-scanner] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

