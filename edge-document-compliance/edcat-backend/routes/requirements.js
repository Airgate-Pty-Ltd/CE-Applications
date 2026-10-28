/**
 * Requirements API Routes
 * 
 * Endpoints for requirement extraction and management.
 * All operations are tenant-scoped and bounded to EDCAT documents.
 * 
 * © 2025 Conform-Edge Quality Consulting. All rights reserved. CEQC-OQCQMS
 */

import express from 'express';
import { query } from '../database/connection.js';
import llmBoundedService from '../services/llmBoundedService.js';
import tenantIsolationMiddleware from '../middleware/tenantIsolation.js';
import auditLoggingMiddleware from '../middleware/auditLogging.js';

const router = express.Router();

// Apply tenant isolation and audit logging
router.use(tenantIsolationMiddleware);
router.use(auditLoggingMiddleware);

/**
 * POST /api/requirements/extract
 * Extract requirements from documents using AI
 */
router.post('/extract', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { documentIds, engine = 'bounded' } = req.body;
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'documentIds array is required' 
      });
    }
    
    if (!['bounded', 'advanced'].includes(engine)) {
      return res.status(400).json({ 
        success: false, 
        error: 'engine must be "bounded" or "advanced"' 
      });
    }
    
    const result = await llmBoundedService.extractRequirements(
      documentIds,
      tenantId,
      engine
    );
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('[Requirements] Extraction error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/requirements/:documentId
 * Get extracted requirements for a document
 */
router.get('/:documentId', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { documentId } = req.params;
    const { type, minConfidence } = req.query;
    
    let queryText = `
      SELECT id, requirement_text, clause_reference, line_number,
             keyword, type, confidence, engine, extracted_at
      FROM requirement_extractions
      WHERE document_id = $1 AND tenant_id = $2
    `;
    const params = [documentId, tenantId];
    
    if (type) {
      queryText += ` AND type = $3`;
      params.push(type);
    }
    
    if (minConfidence) {
      const confidenceIndex = params.length + 1;
      queryText += ` AND confidence >= $${confidenceIndex}`;
      params.push(parseFloat(minConfidence));
    }
    
    queryText += ` ORDER BY clause_reference, line_number`;
    
    const result = await query(queryText, params);
    
    res.json({
      success: true,
      requirements: result.rows
    });
    
  } catch (error) {
    console.error('[Requirements] Get error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/requirements
 * List all requirements for tenant (with filters)
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { documentId, type, minConfidence, search } = req.query;
    
    let queryText = `
      SELECT re.id, re.requirement_text, re.clause_reference, re.line_number,
             re.keyword, re.type, re.confidence, re.engine, re.extracted_at,
             d.document_name, d.document_type
      FROM requirement_extractions re
      JOIN documents d ON d.id = re.document_id
      WHERE re.tenant_id = $1
    `;
    const params = [tenantId];
    
    if (documentId) {
      queryText += ` AND re.document_id = $${params.length + 1}`;
      params.push(documentId);
    }
    
    if (type) {
      queryText += ` AND re.type = $${params.length + 1}`;
      params.push(type);
    }
    
    if (minConfidence) {
      queryText += ` AND re.confidence >= $${params.length + 1}`;
      params.push(parseFloat(minConfidence));
    }
    
    if (search) {
      queryText += ` AND re.requirement_text ILIKE $${params.length + 1}`;
      params.push(`%${search}%`);
    }
    
    queryText += ` ORDER BY re.extracted_at DESC LIMIT 500`;
    
    const result = await query(queryText, params);
    
    res.json({
      success: true,
      requirements: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('[Requirements] List error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;

