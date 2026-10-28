/**
 * Vera Debug Audit Routes
 * 
 * Provides diagnostic endpoints to audit Vera's information access
 */

import express from 'express';
import VeraInformationAudit from '../services/vera/VeraInformationAudit.js';

const router = express.Router();

/**
 * GET /api/vera/debug/audit
 * 
 * Runs a complete information audit to diagnose why Vera is stuck
 * 
 * Returns:
 * - Database connection status
 * - Data availability in each critical table
 * - Retrieval path test results
 * - Query logging status
 */
router.get('/debug/audit', async (req, res) => {
  try {
    console.log('[VeraDebugAudit] Starting full information audit...');
    
    const audit = new VeraInformationAudit();
    const report = await audit.runFullAudit();
    
    res.json({
      status: 'success',
      message: 'Information audit complete. Check console logs for detailed output.',
      report
    });
  } catch (error: any) {
    console.error('[VeraDebugAudit] Audit failed:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/vera/debug/audit/databases
 * 
 * Quick check of database connections only
 */
router.get('/debug/audit/databases', async (req, res) => {
  try {
    const audit = new VeraInformationAudit();
    const databases = await audit.auditDatabaseConnections();
    
    res.json({
      status: 'success',
      databases
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/vera/debug/audit/data
 * 
 * Check data availability in critical tables
 */
router.get('/debug/audit/data', async (req, res) => {
  try {
    const audit = new VeraInformationAudit();
    const dataAvailability = await audit.auditDataAvailability();
    
    res.json({
      status: 'success',
      dataAvailability
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/vera/debug/audit/retrieval
 * 
 * Test retrieval paths (terminology, Q&A, semantic search, etc.)
 */
router.get('/debug/audit/retrieval', async (req, res) => {
  try {
    const audit = new VeraInformationAudit();
    const retrievalPaths = await audit.auditRetrievalPaths();
    
    res.json({
      status: 'success',
      retrievalPaths
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

export default router;

