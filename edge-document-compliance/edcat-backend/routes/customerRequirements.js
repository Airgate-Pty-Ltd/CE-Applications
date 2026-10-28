/**
 * Customer Requirements API Routes
 * 
 * Handles ingestion of customer/OEM requirements documents
 * Extends dynamic standards ingestion for customer-specific needs
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { StandardsDocumentProcessor } from '../services/dynamicStandardsIngestion.js';
import { query } from '../database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads', 'customer-requirements'),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

/**
 * POST /api/customer-requirements/ingest
 * Upload and ingest a customer requirement document
 */
router.post('/ingest', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'File required' });
    }

    const { customerId, customerName, requirementCode, requirementName, oemName } = req.body;

    if (!customerId || !requirementCode || !requirementName) {
      return res.status(400).json({ 
        success: false, 
        error: 'customerId, requirementCode, and requirementName are required' 
      });
    }

    // Generate standard code from customer and requirement
    const standardCode = `${oemName || customerName}_${requirementCode}`.replace(/\s+/g, '_').toUpperCase();
    const standardName = `${oemName || customerName} - ${requirementName}`;

    // Process the document
    const processed = await StandardsDocumentProcessor.processStandardDocument(
      req.file.path,
      standardCode,
      standardName,
      'customer_req',
      null // No regulator for customer requirements
    );

    // Link to customer
    processed.document.customer_id = customerId;

    // Store in database
    const stored = await StandardsDocumentProcessor.storeStandard(
      processed.document,
      processed.clauses,
      processed.profiles
    );

    res.json({
      success: true,
      standardId: stored.standardId,
      clausesExtracted: stored.clausesInserted,
      profilesGenerated: stored.profilesInserted,
      message: `Successfully ingested ${standardName}`
    });
  } catch (error) {
    console.error('Error ingesting customer requirement:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/customer-requirements/:customerId
 * Get all customer requirements for a specific customer
 */
router.get('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const result = await query(
      `SELECT s.id, s.name, s.code, s.version, s.source_type,
              s.total_clauses, s.ingested_at, s.status
       FROM standards s
       WHERE s.source_type = 'customer_req'
       AND (s.metadata->>'customer_id')::uuid = $1
       ORDER BY s.ingested_at DESC`,
      [customerId]
    );

    res.json({ success: true, requirements: result.rows });
  } catch (error) {
    console.error('Error fetching customer requirements:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

