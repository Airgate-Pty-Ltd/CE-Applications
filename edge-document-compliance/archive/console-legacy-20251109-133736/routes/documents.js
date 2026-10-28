const express = require('express');
const router = express.Router();
const path = require('path');
const { query, transaction } = require('../database/db');
const { uploadDocument, uploadDocuments, handleUploadError } = require('../middleware/upload');
const { parsePDFWithStructure } = require('../services/pdfParser');
const { parseDOCXWithStructure } = require('../services/docxParser');
const { findMatchingRequirements } = require('../services/requirementExtractor');

// GET all documents
router.get('/', async (req, res) => {
  try {
    const { customer_id, category } = req.query;
    let queryText = 'SELECT * FROM documents';
    const params = [];

    if (customer_id || category) {
      queryText += ' WHERE';
      if (customer_id) {
        params.push(customer_id);
        queryText += ` customer_id = $${params.length}`;
      }
      if (category) {
        if (params.length > 0) queryText += ' AND';
        params.push(category);
        queryText += ` category = $${params.length}`;
      }
    }

    queryText += ' ORDER BY upload_date DESC';

    const result = await query(queryText, params);
    res.json({ success: true, documents: result.rows });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST upload single document
router.post('/upload', uploadDocument, handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { customer_id, document_number, title, category, version } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Document title is required' });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    // Insert document record
    const result = await query(
      `INSERT INTO documents (customer_id, document_number, title, category, version, file_path, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [customer_id || null, document_number, title, category, version, filePath, req.file.size]
    );

    const document = result.rows[0];

    // Parse document content in background
    parseDocumentAsync(document.id, filePath, fileExt);

    res.json({
      success: true,
      document,
      message: 'Document uploaded successfully. Processing in background.'
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Background document parsing
async function parseDocumentAsync(documentId, filePath, fileExt) {
  try {
    console.log(`Parsing document ${documentId}...`);

    let parsedContent;
    if (fileExt === '.pdf') {
      parsedContent = await parsePDFWithStructure(filePath);
    } else if (fileExt === '.docx' || fileExt === '.doc') {
      parsedContent = await parseDOCXWithStructure(filePath);
    } else {
      console.error('Unsupported file format');
      return;
    }

    // Store parsed text
    await query(
      `UPDATE documents
       SET content_text = $1, parsed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [parsedContent.text, documentId]
    );

    console.log(`✅ Successfully parsed document ${documentId}`);
  } catch (error) {
    console.error(`Error parsing document ${documentId}:`, error);
  }
}

// POST map document to requirements for an assessment
router.post('/:id/map-requirements', async (req, res) => {
  try {
    const { assessment_id, requirement_set_id: requirementSetId } = req.body;

    if (!assessment_id || !requirementSetId) {
      return res.status(400).json({
        success: false,
        error: 'assessment_id and requirement_set_id are required'
      });
    }

    // Get document
    const docResult = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const document = docResult.rows[0];

    if (!document.content_text) {
      return res.status(400).json({
        success: false,
        error: 'Document has not been parsed yet. Please wait for processing to complete.'
      });
    }

    // Get all requirements for the standard
    const reqResult = await query(
      'SELECT * FROM requirements WHERE requirement_set_id = $1',
      [requirementSetId]
    );

    if (reqResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No requirements found for this standard'
      });
    }

    // Find matching requirements using NLP
    const matches = findMatchingRequirements(document.content_text, reqResult.rows);

    // Insert mappings
    const mappings = [];
    for (const match of matches) {
      const coverageType =
        match.coverage_score >= 80 ? 'FULL' :
        match.coverage_score >= 40 ? 'PARTIAL' : 'MINIMAL';

      const mappingResult = await query(
        `INSERT INTO document_requirement_mappings
         (document_id, requirement_id, assessment_id, coverage_score, coverage_type, confidence_score, matching_text)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (document_id, requirement_id, assessment_id)
         DO UPDATE SET
           coverage_score = $4,
           coverage_type = $5,
           confidence_score = $6,
           matching_text = $7
         RETURNING *`,
        [
          req.params.id,
          match.requirement_id,
          assessment_id,
          match.coverage_score,
          coverageType,
          match.confidence_score,
          match.matched_keywords.join(', ')
        ]
      );

      mappings.push(mappingResult.rows[0]);
    }

    res.json({
      success: true,
      mappings_created: mappings.length,
      mappings: mappings.slice(0, 10) // Return first 10 for preview
    });
  } catch (error) {
    console.error('Error mapping requirements:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET document with its requirement mappings
router.get('/:id', async (req, res) => {
  try {
    const docResult = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);

    if (docResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const mappingsResult = await query(
      `SELECT m.*, r.requirement_id, r.clause, r.requirement_text, r.category
       FROM document_requirement_mappings m
       JOIN requirements r ON m.requirement_id = r.id
       WHERE m.document_id = $1
       ORDER BY m.coverage_score DESC`,
      [req.params.id]
    );

    res.json({
      success: true,
      document: docResult.rows[0],
      mappings: mappingsResult.rows
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
