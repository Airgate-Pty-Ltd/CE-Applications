/**
 * Audit API Routes
 * REST endpoints for audit management
 */

import express from 'express';
import { authenticate, requireRole, requireTenant } from '../../auth/authMiddleware.js';
import { createNewAudit, generateChecklist } from '../services/auditCreationService.js';
import {
  updateAuditStatus,
  assignAuditor,
  submitAudit,
  returnAudit,
  closeAudit,
  scheduleAudit,
  getAuditAssignments
} from '../services/auditLifecycleService.js';
import {
  createSourceDocument,
  getSourceDocument,
  listSourceDocuments,
  updateSourceExtraction
} from '../services/sourceDocumentService.js';
import { extractRequirementsFromSource } from '../services/requirementExtractionService.js';
import {
  getAuditById,
  listAudits,
  updateAudit,
  getAuditItems,
  getAuditHistory
} from '../storage/auditRepository.js';
import { query } from '../../../database/connection.js';
import { exportAuditJSON, exportAuditXLSX, exportAuditPDF } from '../services/exportService.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);
router.use(requireTenant);

// Multer configuration for file uploads
const uploadsDir = path.join(__dirname, '../../../../uploads/sources');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({ storage });

/**
 * POST /api/sources/upload
 * Upload source document (standard, regulation, customer requirement, checklist)
 */
router.post('/sources/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { sourceType, name, code, revision, authority, jurisdiction } = req.body;

    if (!sourceType || !['STANDARD', 'REGULATION', 'CUSTOMER', 'CHECKLIST'].includes(sourceType)) {
      return res.status(400).json({ error: 'Invalid source type' });
    }

    // Read file content (for text extraction - simplified)
    let extractedText = '';
    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    // Simple text extraction (can be enhanced with pdf-parse, mammoth, etc.)
    if (fileExt === '.txt') {
      extractedText = fs.readFileSync(filePath, 'utf-8');
    } else if (fileExt === '.pdf') {
      // For PDF, would use pdf-parse (placeholder)
      extractedText = '[PDF content extraction - implement with pdf-parse]';
    } else if (fileExt === '.docx' || fileExt === '.doc') {
      // For DOCX, would use mammoth (placeholder)
      extractedText = '[DOCX content extraction - implement with mammoth]';
    }

    const sourceDoc = await createSourceDocument({
      tenant_id: req.tenantId,
      source_type: sourceType,
      name: name || req.file.originalname,
      code: code || null,
      revision: revision || null,
      authority: authority || null,
      jurisdiction: jurisdiction || null,
      file_path: filePath,
      extracted_text: extractedText,
      metadata: {
        original_filename: req.file.originalname,
        mime_type: req.file.mimetype,
        size: req.file.size
      }
    });

    res.json(sourceDoc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/sources
 * List source documents
 */
router.get('/sources', async (req, res) => {
  try {
    const { sourceType } = req.query;
    const sources = await listSourceDocuments({
      tenant_id: req.tenantId,
      source_type: sourceType
    });
    res.json(sources);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/sources/:id
 * Get source document
 */
router.get('/sources/:id', async (req, res) => {
  try {
    const source = await getSourceDocument(req.params.id, req.tenantId);
    if (!source) {
      return res.status(404).json({ error: 'Source document not found' });
    }
    res.json(source);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/sources/:id/extract
 * Extract requirements from source document
 */
router.post('/sources/:id/extract', async (req, res) => {
  try {
    const requirements = await extractRequirementsFromSource(req.params.id, req.tenantId);
    
    // Update source extraction status
    const source = await getSourceDocument(req.params.id, req.tenantId);
    if (source && source.extracted_text) {
      await updateSourceExtraction(req.params.id, req.tenantId, source.extracted_text);
    }

    res.json({ 
      sourceId: req.params.id,
      requirementsCount: requirements.length,
      requirements 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/requirements/from-source/:sourceId
 * Extract and normalize requirements from source
 */
router.post('/requirements/from-source/:sourceId', async (req, res) => {
  try {
    const requirements = await extractRequirementsFromSource(req.params.sourceId, req.tenantId);
    res.json(requirements);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/audits
 * Create new audit (draft)
 */
router.post('/audits', async (req, res) => {
  try {
    const { title, description, auditType } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const audit = await createNewAudit({
      tenant_id: req.tenantId,
      title,
      description: description || null,
      audit_type: auditType || 'MIXED',
      created_by: req.user.userId
    });

    res.json(audit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/audits
 * List audits with filters
 */
router.get('/audits', async (req, res) => {
  try {
    const { status, assigned_to, date_from, date_to, limit, offset } = req.query;

    // If "My audits" filter, use current user
    const assignedTo = assigned_to === 'me' ? req.user.userId : assigned_to;

    const audits = await listAudits({
      tenant_id: req.tenantId,
      status: status || null,
      assigned_to: assignedTo || null,
      date_from: date_from ? new Date(date_from) : null,
      date_to: date_to ? new Date(date_to) : null,
      limit: limit ? parseInt(limit, 10) : null,
      offset: offset ? parseInt(offset, 10) : null
    });

    res.json(audits);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/audits/:id
 * Get audit by ID
 */
router.get('/audits/:id', async (req, res) => {
  try {
    const audit = await getAuditById(req.params.id, req.tenantId);
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }
    res.json(audit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /api/audits/:id
 * Update audit (title, scope, due date, schedule)
 */
router.patch('/audits/:id', async (req, res) => {
  try {
    const { title, description, due_date, scheduled_date } = req.body;
    const updates = {};
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (due_date) updates.due_date = new Date(due_date);
    if (scheduled_date) updates.scheduled_date = new Date(scheduled_date);

    const audit = await updateAudit(req.params.id, req.tenantId, updates);
    res.json(audit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/audits/:id/generate-checklist
 * Generate checklist from selected sources
 */
router.post('/audits/:id/generate-checklist', async (req, res) => {
  try {
    const { sourceIds, filters } = req.body;
    if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      return res.status(400).json({ error: 'sourceIds array is required' });
    }

    const auditPack = await generateChecklist(req.params.id, req.tenantId, {
      sourceIds,
      filters: filters || {}
    });

    res.json(auditPack);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/audits/:id/assign
 * Assign auditor to audit (Lead Auditor only)
 */
router.post('/audits/:id/assign', requireRole('Lead Auditor'), async (req, res) => {
  try {
    const { assigned_to, role } = req.body;
    if (!assigned_to || !role) {
      return res.status(400).json({ error: 'assigned_to and role are required' });
    }

    const assignment = await assignAuditor(
      req.params.id,
      req.tenantId,
      assigned_to,
      req.user.userId,
      role
    );

    res.json(assignment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/audits/:id/submit
 * Submit audit
 */
router.post('/audits/:id/submit', async (req, res) => {
  try {
    const audit = await submitAudit(req.params.id, req.tenantId, req.user.userId);
    res.json(audit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/audits/:id/return
 * Return audit for revision (Lead Auditor only)
 */
router.post('/audits/:id/return', requireRole('Lead Auditor'), async (req, res) => {
  try {
    const { reason } = req.body;
    const audit = await returnAudit(req.params.id, req.tenantId, req.user.userId, reason);
    res.json(audit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/audits/:id/close
 * Close audit (Lead Auditor only)
 */
router.post('/audits/:id/close', requireRole('Lead Auditor'), async (req, res) => {
  try {
    const audit = await closeAudit(req.params.id, req.tenantId, req.user.userId);
    res.json(audit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/audits/:id/history
 * Get audit state history
 */
router.get('/audits/:id/history', async (req, res) => {
  try {
    const history = await getAuditHistory(req.params.id);
    res.json(history);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/audits/:id/items
 * Get audit items (checklist)
 */
router.get('/audits/:id/items', async (req, res) => {
  try {
    const items = await getAuditItems(req.params.id, req.tenantId);
    res.json(items);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/audits/:id/items/:itemId/response
 * Submit response to audit item
 */
router.post('/audits/:id/items/:itemId/response', async (req, res) => {
  try {
    const { response_text, conformance_status } = req.body;
    if (!conformance_status) {
      return res.status(400).json({ error: 'conformance_status is required' });
    }

    const validStatuses = ['CONFORMANT', 'NON_CONFORMANT', 'PARTIAL', 'NOT_APPLICABLE', 'PENDING'];
    if (!validStatuses.includes(conformance_status)) {
      return res.status(400).json({ error: 'Invalid conformance_status' });
    }

    // Check if response exists
    const existingResult = await query(
      'SELECT * FROM audits.audit_responses WHERE audit_id = $1 AND audit_item_id = $2',
      [req.params.id, req.params.itemId]
    );

    let response;
    if (existingResult.rows.length > 0) {
      // Update existing
      const result = await query(
        `UPDATE audits.audit_responses
         SET response_text = $1, conformance_status = $2, response_by = $3, updated_at = NOW()
         WHERE audit_id = $4 AND audit_item_id = $5
         RETURNING *`,
        [response_text || null, conformance_status, req.user.userId, req.params.id, req.params.itemId]
      );
      response = result.rows[0];
    } else {
      // Create new
      const responseId = uuidv4();
      const result = await query(
        `INSERT INTO audits.audit_responses
         (id, audit_id, audit_item_id, tenant_id, response_text, conformance_status, response_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [responseId, req.params.id, req.params.itemId, req.tenantId, response_text || null, conformance_status, req.user.userId]
      );
      response = result.rows[0];
    }

    res.json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/audits/:id/items/:itemId/evidence/upload
 * Upload evidence for audit item
 */
router.post('/audits/:id/items/:itemId/evidence/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const evidenceId = uuidv4();
    const result = await query(
      `INSERT INTO audits.audit_evidence
       (id, audit_id, audit_item_id, tenant_id, file_name, file_path, file_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        evidenceId,
        req.params.id,
        req.params.itemId,
        req.tenantId,
        req.file.originalname,
        req.file.path,
        req.file.mimetype,
        req.user.userId
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/audits/:id/export
 * Export audit (JSON, XLSX, PDF)
 */
router.get('/audits/:id/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const audit = await getAuditById(req.params.id, req.tenantId);
    
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    const items = await getAuditItems(req.params.id, req.tenantId);
    const responsesResult = await query(
      'SELECT * FROM audits.audit_responses WHERE audit_id = $1',
      [req.params.id]
    );
    const responses = responsesResult.rows;

    if (format === 'json') {
      const jsonData = await exportAuditJSON(req.params.id, req.tenantId);
      res.json(jsonData);
    } else if (format === 'xlsx') {
      const buffer = await exportAuditXLSX(req.params.id, req.tenantId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="audit-${req.params.id}.xlsx"`);
      res.send(buffer);
    } else if (format === 'pdf') {
      try {
        const buffer = await exportAuditPDF(req.params.id, req.tenantId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="audit-${req.params.id}.pdf"`);
        res.send(buffer);
      } catch (error) {
        res.status(501).json({ error: error.message });
      }
    } else {
      res.status(400).json({ error: 'Invalid format. Use json, xlsx, or pdf' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
