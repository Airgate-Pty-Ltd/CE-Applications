import express from 'express';
import { query } from '../database/connection.js';

const router = express.Router();

router.get('/documents', async (req, res) => {
  try {
    const term = `%${(req.query.q || '').toLowerCase()}%`;
    const result = await query(
      `SELECT id, document_name, parse_status, uploaded_at
       FROM documents
       WHERE LOWER(document_name) LIKE $1
       ORDER BY uploaded_at DESC
       LIMIT 50`,
      [term]
    );
    res.json({ success: true, documents: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/requirements', async (req, res) => {
  try {
    const term = `%${(req.query.q || '').toLowerCase()}%`;
    const result = await query(
      `SELECT requirement_ref, requirement_text
       FROM requirements
       WHERE LOWER(requirement_text) LIKE $1
       ORDER BY requirement_ref ASC
       LIMIT 50`,
      [term]
    );
    res.json({ success: true, requirements: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
