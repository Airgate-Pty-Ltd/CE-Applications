/**
 * Clause Mapping Routes
 * Compare standards and export mapping matrices
 */

import express from 'express';
import ClauseMappingExporter from '../services/clauseMappingExporter.js';

const router = express.Router();
const exporter = new ClauseMappingExporter();

/**
 * GET /api/mappings/compare
 * Compare two standards and download mapping Excel
 * Query params: standard1, standard2
 */
router.get('/compare', async (req, res) => {
  try {
    const { standard1, standard2 } = req.query;

    if (!standard1 || !standard2) {
      return res.status(400).json({
        success: false,
        error: 'standard1 and standard2 query parameters required'
      });
    }

    const mapping = await exporter.generateClauseMapping(standard1, standard2);

    res.download(mapping.filePath, mapping.fileName, (err) => {
      if (err) {
        console.error('[Mappings] Download error:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to download mapping file'
        });
      }
    });
  } catch (error) {
    console.error('[Mappings] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

