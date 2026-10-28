/**
 * Dynamic Standards API Routes
 * 
 * Handles ingestion of standards documents, regulatory crawling,
 * and dynamic GAP profile generation.
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { StandardsDocumentProcessor } from '../services/dynamicStandardsIngestion.js';
import { RegulatoryDocumentIngestor, REGULATORY_CRAWL_CONFIG } from '../services/regulatoryCrawler.js';
import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads', 'standards'),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

/**
 * POST /api/dynamic-standards/ingest
 * Upload and ingest a standards document (including customer requirements)
 */
router.post('/ingest', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'File required' });
    }

    const { standardCode, standardName, sourceType = 'standard', regulatorId, customerId } = req.body;

    if (!standardCode || !standardName) {
      return res.status(400).json({ 
        success: false, 
        error: 'standardCode and standardName are required' 
      });
    }

    // For customer requirements, set sourceType automatically if not provided
    const finalSourceType = sourceType === 'customer_req' ? 'customer_req' : sourceType;

    // Process the document
    const processed = await StandardsDocumentProcessor.processStandardDocument(
      req.file.path,
      standardCode,
      standardName,
      finalSourceType,
      regulatorId || null
    );

    // For customer requirements, link to customer if provided
    if (finalSourceType === 'customer_req' && customerId) {
      processed.document.customer_id = customerId;
    }

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
    console.error('Error ingesting standard:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/dynamic-standards/list
 * List all ingested standards
 */
router.get('/list', async (req, res) => {
  try {
    const result = await query(
      `SELECT s.id, s.name, s.code, s.version, s.source_type, s.sector,
              s.total_clauses, s.ingested_at, s.status,
              rs.regulator_name, rs.regulator_code
       FROM standards s
       LEFT JOIN regulatory_sources rs ON s.regulator_id = rs.source_id
       WHERE s.is_active = true
       ORDER BY s.ingested_at DESC`
    );

    res.json({ success: true, standards: result.rows });
  } catch (error) {
    console.error('Error listing standards:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dynamic-standards/:id/clauses
 * Get clauses for a specific standard
 */
router.get('/:id/clauses', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT c.id, c.clause_ref, c.title, c.requirement_text, 
              c.requirement_strength, c.clause_format, c.extraction_confidence
       FROM clauses c
       WHERE c.standard_id = $1
       ORDER BY c.clause_ref`,
      [id]
    );

    res.json({ success: true, clauses: result.rows });
  } catch (error) {
    console.error('Error fetching clauses:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dynamic-standards/:id/profiles
 * Get GAP profiles for a specific standard
 */
router.get('/:id/profiles', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT gp.id, gp.profile_code, gp.interpretation, gp.expected_evidence,
              gp.expected_documents, gp.audit_questions, gp.common_pitfalls,
              gp.risk_level, gp.generation_method, gp.generation_confidence,
              c.clause_ref, c.title as clause_title
       FROM gap_profiles gp
       JOIN clauses c ON gp.clause_id = c.id
       WHERE c.standard_id = $1
       ORDER BY c.clause_ref`,
      [id]
    );

    res.json({ success: true, profiles: result.rows });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/dynamic-standards/crawl/:regulatorCode
 * Crawl and ingest documents from a regulatory source
 */
router.post('/crawl/:regulatorCode', async (req, res) => {
  try {
    const { regulatorCode } = req.params;
    const config = REGULATORY_CRAWL_CONFIG[regulatorCode.toLowerCase()];

    if (!config) {
      return res.status(400).json({ 
        success: false, 
        error: `Unknown regulator code: ${regulatorCode}` 
      });
    }

    // Start ingestion in background
    const ingestor = new RegulatoryDocumentIngestor();
    ingestor.ingestRegulatorySource(config).then(result => {
      console.log(`Crawl completed for ${regulatorCode}:`, result);
    }).catch(error => {
      console.error(`Crawl failed for ${regulatorCode}:`, error);
    });

    res.json({
      success: true,
      message: `Started crawling ${config.regulator_name}. Check logs for progress.`
    });
  } catch (error) {
    console.error('Error starting crawl:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dynamic-standards/regulators
 * List available regulatory sources
 */
router.get('/regulators', async (req, res) => {
  try {
    const result = await query(
      `SELECT source_id, regulator_name, regulator_code, jurisdiction,
              authority_type, website, active, supported, last_crawl_at, next_crawl_due
       FROM regulatory_sources
       WHERE active = true
       ORDER BY regulator_name`
    );

    res.json({ success: true, regulators: result.rows });
  } catch (error) {
    console.error('Error fetching regulators:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

