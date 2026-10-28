import express from 'express';
import { query } from '../database/connection.js';
import { Document, ParsedContent } from '../models/index.js';
import DocumentParser from '../services/parser.js';
import RequirementExtractor from '../services/nlp.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM documents ORDER BY uploaded_at DESC');
    res.json({ success: true, documents: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customer_id, assessment_id, document_name, document_type, file_path, file_size, uploaded_by } = req.body;
    const result = await query(
      `INSERT INTO documents (customer_id, assessment_id, document_name, document_type, file_path, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        customer_id,
        assessment_id || null,
        document_name,
        document_type || null,
        file_path,
        file_size || null,
        uploaded_by || 'system'
      ]
    );
    res.status(201).json({ success: true, document: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/parse-pending', async (_req, res) => {
  try {
    const pending = await Document.getPending(20);
    if (!pending.length) {
      return res.json({ success: true, parsed: 0, message: 'No pending documents' });
    }

    const extractor = new RequirementExtractor();
    let parsedCount = 0;

    for (const doc of pending) {
      try {
        const parsed = await DocumentParser.parse(doc.file_path, doc.document_type);
        const text = parsed.text || '';
        await ParsedContent.insert(doc.id, DocumentParser.chunkText(text));
        await Document.updateParseStatus(doc.id, 'complete', text, null);
        const extracted = extractor.extract(text);
        parsedCount += 1;
        doc.extracted = extracted.length;
      } catch (error) {
        await Document.updateParseStatus(doc.id, 'error', null, error.message);
      }
    }

    res.json({ success: true, parsed: parsedCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    res.json({ success: true, document: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

