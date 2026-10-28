/**
 * GAP Analysis Engine
 * 
 * Compares source requirements against target document coverage.
 * Determines coverage status and generates audit-ready gap matrix.
 * 
 * © 2025 Conform-Edge Quality Consulting. All rights reserved. CEQC-OQCQMS
 */

import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import embeddingService from './embeddingService.js';
import llmBoundedService from './llmBoundedService.js';

/**
 * Determine coverage status for a requirement using RAG + GAP profile
 * Uses semantic search with gap profile embeddings
 */
async function determineCoverageWithRAG(clause, gapProfile, targetDocumentIds, tenantId) {
  if (!gapProfile) {
    return {
      status: 'NOT_MODELED',
      score: 0.0,
      evidence: [],
      reason: 'No GAP profile defined for this clause'
    };
  }
  
  // Use semantic search with gap profile embedding
  let candidateMatches = [];
  
  try {
    candidateMatches = await embeddingService.searchWithGapProfile(
      gapProfile.id,
      tenantId,
      targetDocumentIds,
      10
    );
  } catch (error) {
    console.warn(`[GAP Engine] Semantic search failed, using text fallback:`, error);
    
    // Fallback to text search
    const fallbackResult = await query(
      `SELECT dc.id, dc.text, dc.section_label, dc.document_id, d.document_name
       FROM document_chunks dc
       JOIN documents d ON d.id = dc.document_id
       WHERE dc.document_id = ANY($1::uuid[]) AND dc.tenant_id = $2
         AND (dc.text ILIKE $3 OR dc.text ILIKE $4)
       LIMIT 10`,
      [
        targetDocumentIds,
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
      score: 0.6
    }));
  }
  
  if (candidateMatches.length === 0) {
    return {
      status: 'NOT_COVERED',
      score: 0.0,
      evidence: [],
      reason: 'No matching content found in target documents'
    };
  }
  
  // Use bounded LLM service for analysis
  const task = {
    tenantId,
    standardCode: clause.standard_code || '',
    clauseRef: clause.clause_ref,
    gapProfile: {
      id: gapProfile.id,
      requirement_text: clause.requirement_text,
      interpretation: gapProfile.interpretation,
      expected_evidence: gapProfile.expected_evidence,
      risk_level: gapProfile.risk_level
    },
    candidateMatches
  };
  
  const analysisResult = await llmBoundedService.runGapAnalysisTask(task);
  
  // Map status to database enum values
  const statusMap = {
    'covered': 'FULL_COVERED',
    'partially_covered': 'PARTIAL_COVERED',
    'not_covered': 'NOT_COVERED',
    'not_modeled': 'NOT_MODELED',
    'insufficient_data': 'NOT_COVERED'
  };
  
  return {
    status: statusMap[analysisResult.status] || 'NOT_COVERED',
    score: candidateMatches.length > 0 ? candidateMatches[0].score || 0.7 : 0.0,
    evidence: analysisResult.target_matches || candidateMatches.slice(0, 3),
    reason: analysisResult.gap_reason || 'Analysis completed'
  };
}

/**
 * Create GAP analysis assessment
 * @param {Object} params
 * @param {string} params.tenantId - Tenant ID
 * @param {string} params.assessmentName - Assessment name
 * @param {Array<string>} params.sourceDocIds - Source document IDs
 * @param {Array<string>} params.targetDocIds - Target document IDs
 * @param {string} params.notes - Optional notes
 * @param {string} params.createdBy - User ID
 */
export async function createGapAnalysis({ tenantId, assessmentName, sourceDocIds, targetDocIds, notes, createdBy }) {
  if (!tenantId || !assessmentName || !sourceDocIds || !targetDocIds) {
    throw new Error('Missing required parameters');
  }
  
  // Verify documents belong to tenant
  const sourceDocs = await query(
    `SELECT id, document_name FROM documents 
     WHERE id = ANY($1::uuid[]) AND customer_id = $2 AND is_deleted = FALSE`,
    [sourceDocIds, tenantId]
  );
  
  const targetDocs = await query(
    `SELECT id, document_name FROM documents 
     WHERE id = ANY($1::uuid[]) AND customer_id = $2 AND is_deleted = FALSE`,
    [targetDocIds, tenantId]
  );
  
  if (sourceDocs.rows.length === 0 || targetDocs.rows.length === 0) {
    throw new Error('Documents not found or access denied');
  }
  
  // Create analysis record
  const analysisId = uuidv4();
  await query(
    `INSERT INTO gap_analyses 
     (id, tenant_id, assessment_name, description, status, created_by, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      analysisId,
      tenantId,
      assessmentName,
      notes || null,
      'running',
      createdBy || null,
      JSON.stringify({
        source_document_ids: sourceDocIds,
        target_document_ids: targetDocIds,
        source_count: sourceDocs.rows.length,
        target_count: targetDocs.rows.length
      })
    ]
  );
  
  // Get source requirements
  const sourceReqs = await query(
    `SELECT id, requirement_text, clause_reference, type, confidence, document_id
     FROM requirement_extractions
     WHERE document_id = ANY($1::uuid[]) AND tenant_id = $2
     ORDER BY clause_reference, line_number`,
    [sourceDocIds, tenantId]
  );
  
  if (sourceReqs.rows.length === 0) {
    await query(
      `UPDATE gap_analyses SET status = 'failed', metadata = jsonb_set(metadata, '{error}', '"No requirements found in source documents"')
       WHERE id = $1`,
      [analysisId]
    );
    throw new Error('No requirements found in source documents. Extract requirements first.');
  }
  
  // Get target document segments
  const targetSegments = await query(
    `SELECT id, text, section_label, document_id, position
     FROM document_chunks
     WHERE document_id = ANY($1::uuid[]) AND tenant_id = $2
     ORDER BY document_id, position`,
    [targetDocIds, tenantId]
  );
  
  // Get clauses with gap profiles for RAG analysis
  const clausesWithProfiles = await query(
    `SELECT c.id, c.clause_ref, c.requirement_text, c.category,
            gp.id as gap_profile_id, gp.interpretation, gp.expected_evidence,
            gp.risk_level, s.code as standard_code
     FROM clauses c
     JOIN standards s ON s.id = c.standard_id
     LEFT JOIN gap_profiles gp ON gp.clause_id = c.id AND gp.is_active = TRUE
     WHERE c.id IN (
       SELECT DISTINCT clause_id FROM requirement_extractions 
       WHERE document_id = ANY($1::uuid[]) AND tenant_id = $2
     )
     ORDER BY c.clause_ref`,
    [sourceDocIds, tenantId]
  );
  
  // Analyze each clause using RAG + GAP profiles
  const findings = [];
  let fullCoverage = 0;
  let partialCoverage = 0;
  let notCovered = 0;
  
  for (const clause of clausesWithProfiles.rows) {
    // Get gap profile
    const gapProfile = clause.gap_profile_id ? {
      id: clause.gap_profile_id,
      interpretation: clause.interpretation,
      expected_evidence: clause.expected_evidence,
      risk_level: clause.risk_level
    } : null;
    
    const coverage = await determineCoverageWithRAG(
      clause,
      gapProfile,
      targetDocIds,
      tenantId
    );
    
    // Find corresponding requirement extraction
    const reqResult = await query(
      `SELECT id FROM requirement_extractions 
       WHERE clause_reference = $1 AND document_id = ANY($2::uuid[]) AND tenant_id = $3
       LIMIT 1`,
      [clause.clause_ref, sourceDocIds, tenantId]
    );
    
    const reqId = reqResult.rows.length > 0 ? reqResult.rows[0].id : null;
    
    const findingId = uuidv4();
    await query(
      `INSERT INTO gap_findings
       (id, analysis_id, tenant_id, source_requirement_id, coverage_status, 
        confidence_score, source_clause_ref, source_document_id, 
        target_document_ids, evidence_mappings, recommended_action)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        findingId,
        analysisId,
        tenantId,
        reqId,
        coverage.status,
        coverage.score,
        clause.clause_ref,
        sourceDocIds[0], // Use first source doc
        coverage.evidence.map(e => e.document_id),
        JSON.stringify(coverage.evidence),
        coverage.status === 'NOT_COVERED' 
          ? `Add requirement coverage for ${clause.clause_ref}`
          : null
      ]
    );
    
    findings.push({
      id: findingId,
      requirement_id: reqId,
      clause: clause.clause_ref,
      requirement_text: clause.requirement_text,
      coverage_status: coverage.status,
      confidence_score: coverage.score,
      evidence: coverage.evidence,
      gap_reason: coverage.reason
    });
    
    if (coverage.status === 'FULL_COVERED') fullCoverage++;
    else if (coverage.status === 'PARTIAL_COVERED') partialCoverage++;
    else notCovered++;
  }
  
  // Update analysis status
  const total = sourceReqs.rows.length;
  const coveragePercentage = total > 0 ? ((fullCoverage / total) * 100).toFixed(1) : 0;
  
  await query(
    `UPDATE gap_analyses 
     SET status = 'success', 
         completed_at = NOW(),
         metadata = jsonb_set(metadata, '{summary}', $1::jsonb)
     WHERE id = $2`,
    [
      JSON.stringify({
        total_clauses: total,
        full_coverage: fullCoverage,
        partial_coverage: partialCoverage,
        not_covered: notCovered,
        coverage_percentage: parseFloat(coveragePercentage)
      }),
      analysisId
    ]
  );
  
  // Create audit trail entry
  await query(
    `INSERT INTO gap_analysis_audit_trail
     (id, analysis_id, tenant_id, action, user_id, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      uuidv4(),
      analysisId,
      tenantId,
      'ANALYSIS_CREATED',
      createdBy || null,
      JSON.stringify({
        assessment_name: assessmentName,
        source_documents: sourceDocIds,
        target_documents: targetDocIds,
        findings_count: findings.length
      })
    ]
  );
  
  return {
    analysis_id: analysisId,
    tenant_id: tenantId,
    assessment_name: assessmentName,
    status: 'success',
    created_at: new Date().toISOString(),
    summary: {
      total_clauses: total,
      full_coverage: fullCoverage,
      partial_coverage: partialCoverage,
      not_covered: notCovered,
      coverage_percentage: parseFloat(coveragePercentage)
    },
    findings: findings.slice(0, 100) // Return first 100 for preview
  };
}

/**
 * Get GAP analysis results
 */
export async function getGapAnalysis(analysisId, tenantId) {
  // Verify tenant access
  const analysis = await query(
    `SELECT * FROM gap_analyses WHERE id = $1 AND tenant_id = $2`,
    [analysisId, tenantId]
  );
  
  if (analysis.rows.length === 0) {
    throw new Error('Analysis not found or access denied');
  }
  
  const analysisData = analysis.rows[0];
  
  // Get all findings
  const findings = await query(
    `SELECT gf.*, re.requirement_text, re.clause_reference, re.type as requirement_type
     FROM gap_findings gf
     JOIN requirement_extractions re ON re.id = gf.source_requirement_id
     WHERE gf.analysis_id = $1 AND gf.tenant_id = $2
     ORDER BY re.clause_reference, gf.confidence_score DESC`,
    [analysisId, tenantId]
  );
  
  // Get source and target documents
  const metadata = analysisData.metadata || {};
  const sourceDocIds = metadata.source_document_ids || [];
  const targetDocIds = metadata.target_document_ids || [];
  
  const sourceDocs = await query(
    `SELECT id, document_name FROM documents WHERE id = ANY($1::uuid[])`,
    [sourceDocIds]
  );
  
  const targetDocs = await query(
    `SELECT id, document_name FROM documents WHERE id = ANY($1::uuid[])`,
    [targetDocIds]
  );
  
  return {
    analysis_id: analysisId,
    assessment_name: analysisData.assessment_name,
    description: analysisData.description,
    status: analysisData.status,
    created_at: analysisData.created_at,
    completed_at: analysisData.completed_at,
    source_set: {
      documents: sourceDocs.rows,
      requirement_count: findings.rows.length
    },
    target_set: {
      documents: targetDocs.rows
    },
    gaps: findings.rows.map(f => ({
      clause: f.clause_reference,
      requirement_id: f.source_requirement_id,
      requirement_text: f.requirement_text,
      coverage: f.coverage_status,
      score: f.confidence_score,
      evidence: f.evidence_mappings || [],
      recommended_action: f.recommended_action
    })),
    summary: metadata.summary || {}
  };
}

export default {
  createGapAnalysis,
  getGapAnalysis
};

