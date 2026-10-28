/**
 * Document Drafting Routes
 * Generate procedures, work instructions, forms from clauses
 */

import express from 'express';
import DocumentDraftingEngine from '../services/documentDraftingEngine.js';

const router = express.Router();
const engine = new DocumentDraftingEngine();

/**
 * POST /api/documents/draft
 * Generate a document draft from a clause
 * Body: { clauseId, documentType, companyName? }
 */
router.post('/draft', async (req, res) => {
  try {
    const { clauseId, documentType, companyName } = req.body;

    if (!clauseId || !documentType) {
      return res.status(400).json({
        success: false,
        error: 'clauseId and documentType required'
      });
    }

    const validTypes = ['procedure', 'workInstruction', 'form', 'policy'];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        error: `documentType must be one of: ${validTypes.join(', ')}`
      });
    }

    const doc = await engine.generateDocument(
      clauseId,
      documentType,
      companyName || 'Your Organization'
    );

    res.download(doc.filePath, doc.fileName, (err) => {
      if (err) {
        console.error('[Documents] Download error:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to download document'
        });
      }
    });
  } catch (error) {
    console.error('[Documents] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

