/**
 * ComplianceGap API Routes
 * Comprehensive API endpoints for ComplianceGap module
 */

import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as models from '../services/compliancegap/models.js';
import * as analyzerService from '../compliancegap/services/analyzer.js';
import { queryPostgres } from '../config/databases.js';
import path from 'path';
import fs from 'fs/promises';
import veraClient from '../clients/vera.js';
import veraClient from '../clients/vera.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/compliancegap/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, XLSX, and TXT files are allowed.'));
    }
  }
});

/**
 * POST /api/compliancegap/upload
 * Upload customer document (PDF, DOCX, XLSX)
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const customerId = req.body.customerId || req.headers['x-customer-id'];
    if (!customerId) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        error: 'customerId required (body or X-Customer-Id header)'
      });
    }

    // Determine file type
    const fileTypeMap = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'text/plain': 'txt'
    };
    const fileType = fileTypeMap[req.file.mimetype] || 'unknown';

    // Read file content for database storage (Railway compatibility)
    let fileContent = null;
    const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_ENVIRONMENT_NAME;
    if (isRailway || process.env.NODE_ENV === 'production') {
      const fileBuffer = await fs.readFile(req.file.path);
      fileContent = fileBuffer.toString('base64');
    }

    // Save document to database
    const document = await models.saveCustomerDocument(customerId, {
      filename: req.file.originalname,
      file_type: fileType,
      file_size: req.file.size,
      file_path: isRailway || process.env.NODE_ENV === 'production' ? 'database' : req.file.path,
      file_content: fileContent,
      metadata: {
        mimetype: req.file.mimetype,
        uploaded_via: 'compliancegap_api'
      }
    });

    // Update extraction status to processing
    await models.updateDocumentExtractionStatus(document.id, 'processing');

    // Extract procedures asynchronously (don't wait)
    extractProceduresFromFile(document.id, req.file.path, fileType).catch(err => {
      console.error(`[ComplianceGap] Error extracting procedures from ${document.id}:`, err);
      models.updateDocumentExtractionStatus(document.id, 'failed');
    });

    res.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        file_type: document.file_type,
        file_size: document.file_size,
        uploaded_at: document.uploaded_at
      }
    });
  } catch (error) {
    console.error('[ComplianceGap] Upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Extract procedures from uploaded file
 * This is called asynchronously after upload
 */
async function extractProceduresFromFile(documentId, filePath, fileType) {
  try {
    // For now, use a simple text extraction
    // In production, use proper PDF/DOCX parsers (pdf-parse, mammoth, etc.)
    let text = '';
    
    if (fileType === 'txt') {
      text = await fs.readFile(filePath, 'utf-8');
    } else {
      // For PDF/DOCX, we'd need proper parsers
      // For MVP, we'll extract basic text or mark as needing processing
      text = `[${fileType.toUpperCase()} file - extraction pending]`;
    }

    // Simple procedure extraction (split by sections)
    const sections = text.split(/\n\s*\n/).filter(s => s.trim().length > 50);
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const titleMatch = section.match(/^([A-Z][^\n]{0,100})/);
      const title = titleMatch ? titleMatch[1] : `Section ${i + 1}`;

      await models.saveCustomerProcedure(documentId, {
        procedure_title: title,
        procedure_text: section.substring(0, 5000), // Limit text length
        section_number: `${i + 1}`,
        confidence_score: 0.75,
        model_version: '1.0.0'
      });
    }

    // Update extraction status to completed
    await models.updateDocumentExtractionStatus(documentId, 'completed', new Date());
  } catch (error) {
    console.error(`[ComplianceGap] Procedure extraction error for ${documentId}:`, error);
    await models.updateDocumentExtractionStatus(documentId, 'failed');
    throw error;
  }
}

/**
 * POST /api/compliancegap/analyze
 * Start gap analysis using VERA-Core service
 */
router.post('/analyze', async (req, res) => {
  try {
    const { customerId, standardId, documentIds, standard, requirements, procedures } = req.body;

    // NEW: Support direct VERA-Core API call (preferred)
    if (standard && Array.isArray(requirements) && Array.isArray(procedures)) {
      const userId = req.user?.id || customerId || 'edcat-user';

      console.log('[ComplianceGap] Using VERA-Core service for gap analysis');

      const result = await veraClient.analyzeGap(standard, requirements, procedures, userId);

      return res.json({
        success: true,
        analysis: {
          analysis_id: result.analysis.id || uuidv4(),
          standard: standard,
          total_requirements: result.analysis.totalRequirements || requirements.length,
          gaps: result.analysis.gaps || result.analysis.gaps_identified || [],
          summary: result.analysis.analysis || result.analysis.summary || 'Gap analysis completed',
          confidence_score: result.analysis.confidence || 0.8,
          covered_count: result.analysis.coveredRequirements || 0,
          partially_covered_count: 0,
          not_covered_count: result.analysis.gapCount || result.analysis.gaps?.length || 0,
          gap_percentage: result.analysis.gapPercentage || 0
        },
        powered_by: 'VERA-Core'
      });
    }

    // LEGACY: Support old format (customerId + standardId + documentIds)
    // Try to convert to VERA-Core format if possible
    if (customerId && standardId) {
      try {
        // Get standard name from database
        const standardResult = await queryPostgres(
          `SELECT code, name FROM public.compliance_standards WHERE id = $1`,
          [standardId]
        );

        if (standardResult.rows.length > 0) {
          const standardName = standardResult.rows[0].name || standardResult.rows[0].code;
          
          // Get requirements from database
          const requirementsResult = await queryPostgres(
            `SELECT requirement_text FROM public.compliance_requirements WHERE standard_id = $1`,
            [standardId]
          );
          const requirements = requirementsResult.rows.map(r => r.requirement_text);

          // Get procedures from documents
          const documentsResult = await queryPostgres(
            `SELECT id FROM public.customer_documents WHERE customer_id = $1`,
            [customerId]
          );
          const docIds = documentsResult.rows.map(d => d.id);
          
          const proceduresResult = await queryPostgres(
            `SELECT procedure_text FROM public.customer_procedures WHERE document_id = ANY($1::uuid[])`,
            [docIds]
          );
          const procedures = proceduresResult.rows.map(p => p.procedure_text);

          if (requirements.length > 0 && procedures.length > 0) {
            // Use VERA-Core with converted data
            console.log('[ComplianceGap] Converting legacy format to VERA-Core');
            const userId = req.user?.id || customerId || 'edcat-user';
            const result = await veraClient.analyzeGap(standardName, requirements, procedures, userId);

            return res.json({
              success: true,
              analysis: {
                analysis_id: result.analysis.id || uuidv4(),
                standard: { code: standardResult.rows[0].code, name: standardName },
                total_requirements: result.analysis.totalRequirements || requirements.length,
                gaps: result.analysis.gaps || result.analysis.gaps_identified || [],
                summary: result.analysis.analysis || result.analysis.summary || 'Gap analysis completed',
                confidence_score: result.analysis.confidence || 0.8,
                covered_count: result.analysis.coveredRequirements || 0,
                partially_covered_count: 0,
                not_covered_count: result.analysis.gapCount || result.analysis.gaps?.length || 0,
                gap_percentage: result.analysis.gapPercentage || 0
              },
              powered_by: 'VERA-Core',
              clarifications_needed: false,
              next_clarification: null
            });
          }
        }
      } catch (conversionError) {
        console.warn('[ComplianceGap] Failed to convert legacy format, falling back to embedded analyzer:', conversionError.message);
      }

      // Fallback to embedded analyzer for legacy calls
      console.log('[ComplianceGap] Using embedded analyzer (legacy mode)');
      const analysis = await analyzerService.analyzeGaps(customerId, standardId, documentIds);

      // Get pending clarifications
      const clarifications = await analyzerService.getClarifications(analysis.analysis_id);
      const pendingClarifications = clarifications.filter(c => c.status === 'pending');

      return res.json({
        success: true,
        analysis: {
          analysis_id: analysis.analysis_id,
          standard: analysis.standard,
          total_requirements: analysis.total_requirements,
          gaps: analysis.gaps,
          summary: analysis.summary,
          confidence_score: analysis.confidence_score,
          covered_count: analysis.covered_count,
          partially_covered_count: analysis.partially_covered_count,
          not_covered_count: analysis.not_covered_count
        },
        clarifications_needed: pendingClarifications.length > 0,
        next_clarification: pendingClarifications.length > 0 ? pendingClarifications[0] : null,
        powered_by: 'embedded-analyzer'
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Missing required fields: Either (standard, requirements, procedures) OR (customerId and standardId)'
    });
  } catch (error) {
    console.error('[ComplianceGap] Analyze error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/compliancegap/clarification/answer
 * Answer a clarification question
 */
router.post('/clarification/answer', async (req, res) => {
  try {
    const { clarificationId, answer } = req.body;

    if (!clarificationId || !answer) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: clarificationId and answer'
      });
    }

    // Validate answer
    const validAnswers = ['yes', 'no', '?', 'partial'];
    const normalizedAnswer = answer.toLowerCase().trim();
    if (!validAnswers.includes(normalizedAnswer)) {
      return res.status(400).json({
        success: false,
        error: `Invalid answer. Must be one of: ${validAnswers.join(', ')}`
      });
    }

    // Answer the clarification
    const clarification = await analyzerService.answerClarification(clarificationId, normalizedAnswer);

    // Get analysis ID from clarification
    const analysisResult = await queryPostgres(
      `SELECT analysis_id FROM public.gap_analyses 
       WHERE id = (SELECT analysis_id FROM public.analysis_clarifications WHERE id = $1)`,
      [clarificationId]
    );

    if (analysisResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found for this clarification'
      });
    }

    const gapAnalysisId = analysisResult.rows[0].analysis_id;

    // Update confidence scores based on answer
    // This is simplified - in production, use more sophisticated scoring
    const confidenceAdjustment = normalizedAnswer === 'yes' ? 0.1 : normalizedAnswer === 'no' ? -0.1 : 0;

    // Get next pending clarification
    const allClarifications = await analyzerService.getClarifications(gapAnalysisId);
    const pendingClarifications = allClarifications.filter(c => c.status === 'pending');
    const nextClarification = pendingClarifications.length > 0 ? pendingClarifications[0] : null;

    // If no more clarifications, mark analysis as completed
    if (!nextClarification) {
      const analysis = await models.getGapAnalysis(gapAnalysisId);
      await models.updateGapAnalysis(gapAnalysisId, {
        status: 'completed',
        completed_at: new Date()
      });
    }

    res.json({
      success: true,
      clarification: clarification,
      next_clarification: nextClarification,
      analysis_complete: !nextClarification
    });
  } catch (error) {
    console.error('[ComplianceGap] Answer clarification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/compliancegap/feedback
 * Submit feedback on analysis
 */
router.post('/feedback', async (req, res) => {
  try {
    const { analysisId, rating, feedbackText, userId } = req.body;

    if (!analysisId || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: analysisId and rating'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    // Save feedback
    const feedbackResult = await queryPostgres(
      `INSERT INTO public.analysis_feedback
       (analysis_id, rating, feedback_text, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [analysisId, rating, feedbackText || null, userId || null]
    );

    // Get current model version
    const currentModel = await models.getCurrentModelVersion();

    // If rating is low (1-2), trigger learning event
    if (rating <= 2) {
      // Get analysis to find requirements that need improvement
      const analysis = await models.getGapAnalysis(analysisId);
      const analysisData = typeof analysis.analysis_data === 'string' 
        ? JSON.parse(analysis.analysis_data) 
        : analysis.analysis_data;

      // Create learning events for gaps with low confidence
      if (analysisData?.gaps) {
        for (const gap of analysisData.gaps) {
          if (gap.status === 'not_covered' || gap.confidence_score < 0.6) {
            await models.saveLearningEvent(
              gap.requirement_id,
              gap.confidence_score || 0.5,
              gap.confidence_score || 0.5, // No immediate improvement, but tracked
              {
                improvement_reason: `User feedback: rating ${rating} - ${feedbackText || 'Low confidence gap'}`,
                model_version_before: currentModel.version,
                model_version_after: currentModel.version,
                learning_event_type: 'user_feedback'
              }
            );
          }
        }
      }
    }

    // Get updated model version (may have been incremented by learning engine)
    const updatedModel = await models.getCurrentModelVersion();

    res.json({
      success: true,
      feedback: feedbackResult.rows[0],
      model_version: updatedModel.version,
      learning_triggered: rating <= 2
    });
  } catch (error) {
    console.error('[ComplianceGap] Feedback error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/compliancegap/report/:analysisId
 * Get full gap analysis report
 */
router.get('/report/:analysisId', async (req, res) => {
  try {
    const { analysisId } = req.params;

    const analysis = await models.getGapAnalysis(analysisId);
    const analysisData = typeof analysis.analysis_data === 'string' 
      ? JSON.parse(analysis.analysis_data) 
      : analysis.analysis_data;

    // Get requirement mappings
    const mappingsResult = await queryPostgres(
      `SELECT rm.*, 
              cr.clause_number, cr.requirement_text,
              cp.procedure_title, cp.procedure_text
       FROM public.requirement_mappings rm
       JOIN public.compliance_requirements cr ON rm.requirement_id = cr.id
       JOIN public.customer_procedures cp ON rm.procedure_id = cp.id
       WHERE rm.analysis_id = (SELECT id FROM public.gap_analyses WHERE analysis_id = $1)`,
      [analysisId]
    );

    res.json({
      success: true,
      report: {
        analysis_id: analysis.analysis_id,
        standard_code: analysis.standard_code,
        status: analysis.status,
        summary: analysis.summary,
        total_requirements: analysis.total_requirements,
        covered_count: analysis.covered_count,
        partially_covered_count: analysis.partially_covered_count,
        not_covered_count: analysis.not_covered_count,
        confidence_score: analysis.confidence_score,
        model_version: analysis.model_version,
        started_at: analysis.started_at,
        completed_at: analysis.completed_at,
        gaps: analysisData?.gaps || [],
        mappings: mappingsResult.rows
      }
    });
  } catch (error) {
    console.error('[ComplianceGap] Get report error:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/compliancegap/analyses
 * List all analyses for a customer
 */
router.get('/analyses', async (req, res) => {
  try {
    const customerId = req.query.customerId || req.headers['x-customer-id'];
    const limit = parseInt(req.query.limit || '50', 10);

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'customerId required (query param or X-Customer-Id header)'
      });
    }

    const analyses = await models.listGapAnalyses(customerId, limit);

    res.json({
      success: true,
      analyses: analyses,
      count: analyses.length
    });
  } catch (error) {
    console.error('[ComplianceGap] List analyses error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

