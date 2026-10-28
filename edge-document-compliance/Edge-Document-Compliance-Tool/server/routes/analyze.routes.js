import { Router } from "express";
import { Pool } from "pg";
import { runGapAnalysis } from "../../backend/src/vera/VeraCoreEngine.js";
// Import analyzeExcel function with proper error handling
import * as ExcelAnalyzerModule from "../services/ExcelAnalyzer.js";
const analyzeExcel = ExcelAnalyzerModule.analyzeExcel || ExcelAnalyzerModule.default?.analyzeExcel;
if (!analyzeExcel || typeof analyzeExcel !== 'function') {
  throw new Error('analyzeExcel function not found in ExcelAnalyzer module');
}

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Gap analysis endpoint
router.post("/", async (req, res) => {
  try {
    const { standardId, customerDocumentId, options } = req.body || {};
    const tenantId = req.tenant?.id || req.body?.tenantId || null;
    const userId = req.user?.id || req.body?.userId || null;

    if (!standardId || !customerDocumentId) {
      return res.status(400).json({ error: "STANDARD_ID_AND_DOCUMENT_ID_REQUIRED" });
    }

    const result = await runGapAnalysis({
      tenantId,
      userId,
      standardId,
      customerDocumentId,
      options
    });

    res.json(result);
  } catch (error) {
    console.error('[analyze.routes] Error:', error);
    const errorId = `analyze-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.status(500).json({ 
      error: {
        type: "ANALYZE_FAILED",
        message: "Gap analysis failed.",
        contextId: errorId,
        detail: process.env.NODE_ENV === 'development' ? (error?.message || String(error)) : undefined
      }
    });
  }
});

// Excel analysis endpoint (keep existing functionality)
router.post("/excel", async (req, res) => {
  try {
    const { fileId } = req.body || {};
    if (!fileId) {
      return res.status(400).json({ 
        error: {
          type: "FILE_ID_REQUIRED",
          message: "File ID is required for Excel analysis."
        }
      });
    }

    const r = await pool.query(`select parsed_json, filename, created_at from edcat.uploaded_files where id=$1`, [fileId]);
    if (!r.rowCount) {
      return res.status(404).json({ 
        error: {
          type: "FILE_NOT_FOUND",
          message: "The specified file was not found."
        }
      });
    }

    const { parsed_json, filename, created_at } = r.rows[0];
    if (!parsed_json) {
      return res.status(400).json({ 
        error: {
          type: "NOT_EXCEL_JSON",
          message: "The file does not contain valid Excel JSON data."
        }
      });
    }

    const result = analyzeExcel(parsed_json, filename, created_at);
    res.json(result);
  } catch (error) {
    console.error('[analyze.routes] Excel analysis error:', error);
    const errorId = `analyze-excel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.status(500).json({ 
      error: {
        type: "EXCEL_ANALYSIS_FAILED",
        message: "Excel analysis failed.",
        contextId: errorId,
        detail: process.env.NODE_ENV === 'development' ? (error?.message || String(error)) : undefined
      }
    });
  }
});

export default router;

