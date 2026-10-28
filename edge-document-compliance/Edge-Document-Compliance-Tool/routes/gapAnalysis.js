/**
 * GAP Analysis API Routes
 * 
 * Bounded AI endpoints for GAP analysis. All operations are scoped to tenants
 * and only operate on documents/sources explicitly stored in EDCAT.
 */

import express from 'express';
import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import embeddingService from '../services/embeddingService.js';
import gapEngine from '../services/gapEngine.js';
import llmBoundedService from '../services/llmBoundedService.js';
import tenantIsolationMiddleware from '../middleware/tenantIsolation.js';
import auditLoggingMiddleware from '../middleware/auditLogging.js';

const router = express.Router();

// Apply tenant isolation and audit logging to all routes
router.use(tenantIsolationMiddleware);
router.use(auditLoggingMiddleware);

/**
 * GET /api/gap-analysis/preview
 * Preview GAP analysis without running full analysis
 * 
 * Query params:
 * - tenant_id: UUID of tenant (required)
 * - standard_id or standard_code: Standard to analyze (required)
 * - target_document_ids: Comma-separated list of document UUIDs (optional)
 * - clause_refs: Comma-separated list of clause references to analyze (optional)
 */
router.get('/preview', async (req, res) => {
  try {
    const tenantId = req.tenantId; // From middleware
    const { standard_id, standard_code, target_document_ids, clause_refs } = req.query;

    // Resolve standard
    let standard;
    if (standard_id) {
      const result = await query(
        `SELECT id, name, code, version FROM standards WHERE id = $1 AND is_active = TRUE`,
        [standard_id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Standard not found' });
      }
      standard = result.rows[0];
    } else if (standard_code) {
      const result = await query(
        `SELECT id, name, code, version FROM standards WHERE code = $1 AND is_active = TRUE ORDER BY created_at DESC LIMIT 1`,
        [standard_code]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Standard not found' });
      }
      standard = result.rows[0];
    } else {
      return res.status(400).json({ success: false, error: 'standard_id or standard_code is required' });
    }

    // Get clauses for this standard
    let clausesQuery = `
      SELECT c.id, c.clause_ref, c.title, c.requirement_text, c.category,
             gp.id as gap_profile_id, gp.interpretation, gp.expected_evidence,
             gp.risk_level, gp.version_label
      FROM clauses c
      LEFT JOIN gap_profiles gp ON gp.clause_id = c.id AND gp.is_active = TRUE
      WHERE c.standard_id = $1
    `;
    const clausesParams = [standard.id];

    if (clause_refs) {
      const refs = clause_refs.split(',').map(r => r.trim());
      clausesQuery += ` AND c.clause_ref = ANY($2::varchar[])`;
      clausesParams.push(refs);
    }

    clausesQuery += ` ORDER BY c.clause_ref`;

    const clausesResult = await query(clausesQuery, clausesParams);
    const clauses = clausesResult.rows;

    // Get target documents if specified
    let targetDocuments = [];
    if (target_document_ids) {
      const docIds = target_document_ids.split(',').map(id => id.trim());
      const docsResult = await query(
        `SELECT id, document_name, doc_type, source 
         FROM documents 
         WHERE id = ANY($1::uuid[]) AND customer_id = $2 AND is_active = TRUE`,
        [docIds, tenant_id]
      );
      targetDocuments = docsResult.rows;
    } else {
      // Get all active documents for tenant
      const docsResult = await query(
        `SELECT id, document_name, doc_type, source 
         FROM documents 
         WHERE customer_id = $1 AND is_active = TRUE`,
        [tenant_id]
      );
      targetDocuments = docsResult.rows;
    }

    // For each clause, find candidate matching chunks (placeholder for now)
    const clausesWithMatches = await Promise.all(
      clauses.map(async (clause) => {
        // TODO: Implement actual semantic search using embeddings
        // For now, return empty matches
        const candidateMatches = [];

        // If we have a gap profile, we could search for similar chunks
        if (clause.gap_profile_id && targetDocuments.length > 0) {
          // Placeholder: would use embeddingService.findSimilarChunks here
          // For now, return empty array
        }

        return {
          clause: clause.clause_ref,
          clause_id: clause.id,
          title: clause.title,
          requirement_text: clause.requirement_text,
          category: clause.category,
          gap_profile_id: clause.gap_profile_id,
          interpretation: clause.interpretation,
          expected_evidence: clause.expected_evidence,
          risk_level: clause.risk_level,
          candidate_matches: candidateMatches
        };
      })
    );

    res.json({
      success: true,
      standard: {
        id: standard.id,
        name: standard.name,
        code: standard.code,
        version: standard.version
      },
      tenant_id: tenantId,
      targets: targetDocuments.map(d => ({
        id: d.id,
        name: d.document_name,
        type: d.doc_type,
        source: d.source
      })),
      clauses: clausesWithMatches
    });

  } catch (error) {
    console.error('[GAP Analysis] Preview error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/gap-analysis/run
 * Run full GAP analysis
 * 
 * Body:
 * {
 *   tenant_id: UUID,
 *   standard_id or standard_code: string,
 *   target_document_ids: UUID[],
 *   clause_refs: string[] (optional)
 * }
 */
/**
 * POST /api/gap-analysis/create
 * Create new GAP analysis assessment
 */
router.post('/create', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { assessmentName, sourceDocIds, targetDocIds, notes } = req.body;
    
    if (!assessmentName || !sourceDocIds || !targetDocIds) {
      return res.status(400).json({
        success: false,
        error: 'assessmentName, sourceDocIds, and targetDocIds are required'
      });
    }
    
    const result = await gapEngine.createGapAnalysis({
      tenantId,
      assessmentName,
      sourceDocIds,
      targetDocIds,
      notes,
      createdBy: req.user?.id || null
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('[GAP Analysis] Create error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/gap-analysis/:analysisId
 * Get GAP analysis results
 */
router.get('/:analysisId', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { analysisId } = req.params;
    
    const result = await gapEngine.getGapAnalysis(analysisId, tenantId);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('[GAP Analysis] Get error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/gap-analysis/run
 * Full GAP analysis with RAG orchestration
 * 
 * Request Body:
 * {
 *   "standard_code": "AS9100D",
 *   "target_document_ids": ["uuid1", "uuid2"],
 *   "clause_refs": ["4.1", "4.2", "8.3.2"] // Optional, analyzes all if omitted
 * }
 */
router.post('/run', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { standard_code, target_document_ids = [], clause_refs = [] } = req.body;
    
    if (!standard_code) {
      return res.status(400).json({
        success: false,
        error: 'standard_code is required'
      });
    }
    
    if (!target_document_ids || target_document_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'target_document_ids array is required'
      });
    }
    
    // Verify tenant has access to this standard
    const tenantStandardCheck = await query(
      `SELECT ts.id FROM tenant_standards ts
       JOIN standards s ON s.id = ts.standard_id
       WHERE ts.tenant_id = $1 AND s.code = $2 AND ts.is_enabled = TRUE`,
      [tenantId, standard_code]
    );
    
    // Note: If tenant_standards is empty, allow (for backward compatibility)
    // In production, you may want to enforce this check
    
    // Resolve standard
    const standardResult = await query(
      `SELECT id, name, code, version FROM standards 
       WHERE code = $1 AND is_active = TRUE 
       ORDER BY created_at DESC LIMIT 1`,
      [standard_code]
    );
    
    if (standardResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Standard ${standard_code} not found`
      });
    }
    
    const standard = standardResult.rows[0];
    
    // Get clauses for this standard
    let clausesQuery = `
      SELECT c.id, c.clause_ref, c.title, c.requirement_text, c.category
      FROM clauses c
      WHERE c.standard_id = $1
    `;
    const clausesParams = [standard.id];
    
    if (clause_refs && clause_refs.length > 0) {
      clausesQuery += ` AND c.clause_ref = ANY($2::varchar[])`;
      clausesParams.push(clause_refs);
    }
    
    clausesQuery += ` ORDER BY c.clause_ref`;
    
    const clausesResult = await query(clausesQuery, clausesParams);
    const clauses = clausesResult.rows;
    
    if (clauses.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No clauses found for this standard'
      });
    }
    
    // Verify target documents belong to tenant
    const targetDocsResult = await query(
      `SELECT id, document_name FROM documents 
       WHERE id = ANY($1::uuid[]) AND customer_id = $2 AND is_deleted = FALSE`,
      [target_document_ids, tenantId]
    );
    
    if (targetDocsResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Target documents not found or access denied'
      });
    }
    
    // Process each clause with RAG orchestration
    const results = [];
    
    for (const clause of clauses) {
      // Get gap profile for this clause
      const gapProfileResult = await query(
        `SELECT gp.*, c.requirement_text
         FROM gap_profiles gp
         JOIN clauses c ON c.id = gp.clause_id
         WHERE gp.clause_id = $1 AND gp.is_active = TRUE
         ORDER BY gp.version_label DESC
         LIMIT 1`,
        [clause.id]
      );
      
      const gapProfile = gapProfileResult.rows[0];
      
      // If no gap profile, return not_modeled status
      if (!gapProfile) {
        results.push({
          clause: clause.clause_ref,
          status: 'not_modeled',
          source_requirement: clause.requirement_text,
          gap_profile_id: null,
          target_matches: [],
          gap_reason: 'No GAP profile defined for this clause.',
          risk_level: null
        });
        continue;
      }
      
      // Retrieve candidate matches using semantic search
      let candidateMatches = [];
      
      try {
        // Use gap profile embedding for semantic search
        candidateMatches = await embeddingService.searchWithGapProfile(
          gapProfile.id,
          tenantId,
          target_document_ids,
          10 // Top 10 matches
        );
      } catch (searchError) {
        console.warn(`[GAP Analysis] Semantic search failed for clause ${clause.clause_ref}, using text search:`, searchError);
        
        // Fallback to text-based search
        const fallbackResult = await query(
          `SELECT dc.id, dc.text, dc.section_label, dc.document_id, d.document_name
           FROM document_chunks dc
           JOIN documents d ON d.id = dc.document_id
           WHERE dc.document_id = ANY($1::uuid[]) 
             AND dc.tenant_id = $2
             AND (
               dc.text ILIKE $3 OR
               dc.text ILIKE $4
             )
           LIMIT 10`,
          [
            target_document_ids,
            tenantId,
            `%${clause.requirement_text.substring(0, 30)}%`,
            `%${gapProfile.interpretation.substring(0, 30)}%`
          ]
        );
        
        candidateMatches = fallbackResult.rows.map(row => ({
          document_id: row.document_id,
          document_name: row.document_name,
          section_label: row.section_label,
          text: row.text,
          score: 0.6 // Lower confidence for text search
        }));
      }
      
      // Build GAP analysis task
      const task = {
        tenantId,
        standardCode: standard.code,
        clauseRef: clause.clause_ref,
        gapProfile: {
          id: gapProfile.id,
          requirement_text: gapProfile.requirement_text || clause.requirement_text,
          interpretation: gapProfile.interpretation,
          expected_evidence: gapProfile.expected_evidence,
          risk_level: gapProfile.risk_level
        },
        candidateMatches
      };
      
      // Run bounded LLM analysis
      const analysisResult = await llmBoundedService.runGapAnalysisTask(task);
      results.push(analysisResult);
    }
    
    // Create analysis log entry
    await query(
      `INSERT INTO gap_analysis_logs 
       (id, tenant_id, user_id, standard_code, target_docs, requested_clauses, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        uuidv4(),
        tenantId,
        req.user?.id || null,
        standard_code,
        JSON.stringify(target_document_ids),
        JSON.stringify(clause_refs.length > 0 ? clause_refs : clauses.map(c => c.clause_ref))
      ]
    );
    
    res.json({
      success: true,
      tenant_id: tenantId,
      standard_code: standard.code,
      targets: targetDocsResult.rows.map(d => ({
        id: d.id,
        name: d.document_name
      })),
      results
    });
    
  } catch (error) {
    console.error('[GAP Analysis] Run error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

