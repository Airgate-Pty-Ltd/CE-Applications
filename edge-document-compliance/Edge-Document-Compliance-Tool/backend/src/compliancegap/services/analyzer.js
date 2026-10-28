/**
 * ComplianceGap Analyzer Service
 * Performs gap analysis between customer documents and compliance standards
 * Uses Ollama for AI-powered analysis
 */

import { queryPostgres } from '../../config/databases.js';
import { v4 as uuidv4 } from 'uuid';

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2';

/**
 * Initialize Ollama client
 */
async function callOllama(prompt, systemPrompt = null) {
  try {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || '';
  } catch (error) {
    console.error('[ComplianceGap] Ollama error:', error);
    throw new Error(`Ollama request failed: ${error.message}`);
  }
}

/**
 * Analyze compliance gaps between customer documents and a standard
 * @param {string} customerId - Customer/tenant ID
 * @param {string} standardId - Compliance standard ID
 * @param {Array<string>} documentIds - Optional document IDs to analyze
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeGaps(customerId, standardId, documentIds = null) {
  try {
    // Get standard information
    const standardResult = await queryPostgres(
      `SELECT id, code, name, description 
       FROM public.compliance_standards 
       WHERE id = $1 AND is_active = TRUE`,
      [standardId]
    );

    if (standardResult.rows.length === 0) {
      throw new Error(`Standard not found: ${standardId}`);
    }

    const standard = standardResult.rows[0];

    // Get customer documents from customer_documents table
    let documentsQuery = `
      SELECT id, filename as name, file_type, file_size, uploaded_at
      FROM public.customer_documents
      WHERE customer_id = $1 AND extraction_status = 'completed'
    `;
    const queryParams = [customerId];

    if (documentIds && documentIds.length > 0) {
      documentsQuery += ` AND id = ANY($2::uuid[])`;
      queryParams.push(documentIds);
    }

    documentsQuery += ` ORDER BY uploaded_at DESC`;

    const documentsResult = await queryPostgres(documentsQuery, queryParams);
    const documents = documentsResult.rows;

    if (documents.length === 0) {
      throw new Error('No customer documents found for analysis. Please upload documents first.');
    }

    // Get compliance requirements for the standard
    const requirementsResult = await queryPostgres(
      `SELECT id, clause_number, requirement_text as text, requirement_type, standard_id, confidence_score
       FROM public.compliance_requirements
       WHERE standard_id = $1
       ORDER BY clause_number`,
      [standardId]
    );

    const requirements = requirementsResult.rows;

    if (requirements.length === 0) {
      throw new Error(`No parsed requirements found for standard: ${standard.code}`);
    }

    // Perform gap analysis using Ollama
    const analysisResults = await performGapAnalysis(
      standard,
      documents,
      requirements
    );

    // Generate analysis ID
    const analysisId = `gap_${Date.now()}_${uuidv4().substring(0, 8)}`;

    // Get customer procedures for the documents
    const documentIds = documents.map(d => d.id);
    const proceduresResult = await queryPostgres(
      `SELECT cp.*, cd.filename as document_name
       FROM public.customer_procedures cp
       JOIN public.customer_documents cd ON cp.document_id = cd.id
       WHERE cp.document_id = ANY($1::uuid[])
       ORDER BY cp.section_number, cp.page_number`,
      [documentIds]
    );
    const procedures = proceduresResult.rows;

    // Save analysis to database using models
    const analysisData = {
      standard: {
        id: standard.id,
        code: standard.code,
        name: standard.name
      },
      documents: documents.map(d => ({
        id: d.id,
        name: d.name,
        file_type: d.file_type
      })),
      requirements: requirements.map(r => ({
        id: r.id,
        clause_number: r.clause_number,
        text: r.text
      })),
      procedures: procedures.map(p => ({
        id: p.id,
        title: p.procedure_title,
        text: p.procedure_text.substring(0, 200)
      })),
      gaps: analysisResults.gaps,
      summary: analysisResults.summary
    };

    const coveredCount = analysisResults.gaps.filter(g => g.status === 'covered').length;
    const partiallyCoveredCount = analysisResults.gaps.filter(g => g.status === 'partially_covered').length;
    const notCoveredCount = analysisResults.gaps.filter(g => g.status === 'not_covered').length;

    const currentModel = await models.getCurrentModelVersion();

    await models.createGapAnalysis({
      analysis_id: analysisId,
      customer_id: customerId,
      standard_id: standard.id,
      standard_code: standard.code,
      status: 'completed',
      summary: analysisResults.summary,
      total_requirements: requirements.length,
      covered_count: coveredCount,
      partially_covered_count: partiallyCoveredCount,
      not_covered_count: notCoveredCount,
      confidence_score: analysisResults.confidence_score || 0.75,
      analysis_data: analysisData,
      model_version: currentModel.version
    });

    // Get the gap_analyses.id (UUID) for requirement mappings
    const gapAnalysisResult = await queryPostgres(
      `SELECT id FROM public.gap_analyses WHERE analysis_id = $1`,
      [analysisId]
    );
    const gapAnalysisUuid = gapAnalysisResult.rows[0]?.id;

    // Create requirement mappings
    if (gapAnalysisUuid) {
      for (const gap of analysisResults.gaps) {
        // Find matching procedure for this requirement
        const matchingProcedure = findMatchingProcedure(gap, procedures);
        if (matchingProcedure) {
          await models.createRequirementMapping(
            gap.requirement_id,
            matchingProcedure.id,
            gap.confidence_score || 0.75,
            gapAnalysisUuid, // Use UUID from gap_analyses table
            {
              match_type: gap.status,
              evidence_text: gap.evidence,
              gap_description: gap.gap_description,
              risk_level: gap.risk_level
            }
          );
        }
      }
    }

    return {
      analysis_id: analysisId,
      standard: standard,
      total_requirements: requirements.length,
      gaps: analysisResults.gaps,
      summary: analysisResults.summary,
      confidence_score: analysisResults.confidence_score,
      covered_count: coveredCount,
      partially_covered_count: partiallyCoveredCount,
      not_covered_count: notCoveredCount
    };
  } catch (error) {
    console.error('[ComplianceGap] Analysis error:', error);
    throw error;
  }
}

/**
 * Perform gap analysis using Ollama
 */
async function performGapAnalysis(standard, documents, requirements) {
  const systemPrompt = `You are a compliance expert analyzing gaps between customer documents and a compliance standard.
Analyze each requirement and determine if it is:
- "covered": Fully addressed in customer documents
- "partially_covered": Partially addressed but may need improvement
- "not_covered": Not addressed or missing

For each requirement, provide:
1. Status (covered/partially_covered/not_covered)
2. Evidence (quotes or references from documents)
3. Gap description (if not covered or partially covered)
4. Risk level (low/medium/high)

Respond in JSON format with an array of gap objects.`;

  const prompt = `
Standard: ${standard.name} (${standard.code})
${standard.description || ''}

Customer Documents:
${documents.map(d => `- ${d.name} (${d.code})`).join('\n')}

Requirements to Analyze:
${requirements.map((r, idx) => `${idx + 1}. [${r.clause_number}] ${r.text.substring(0, 200)}...`).join('\n')}

Analyze each requirement and provide gap analysis results in JSON format:
{
  "gaps": [
    {
      "requirement_id": "...",
      "clause_number": "...",
      "status": "covered|partially_covered|not_covered",
      "evidence": "...",
      "gap_description": "...",
      "risk_level": "low|medium|high"
    }
  ],
  "summary": "Overall analysis summary",
  "confidence_score": 0.85
}
`;

  try {
    const response = await callOllama(prompt, systemPrompt);
    
    // Try to extract JSON from response
    let jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback: create basic analysis
      return createFallbackAnalysis(requirements);
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    // Validate and normalize results
    if (!analysis.gaps || !Array.isArray(analysis.gaps)) {
      return createFallbackAnalysis(requirements);
    }

    // Map requirements to gaps
    const gaps = requirements.map((req, idx) => {
      const gapData = analysis.gaps[idx] || analysis.gaps.find(g => g.requirement_id === req.id);
      
      return {
        requirement_id: req.id,
        clause_number: req.clause_number || `REQ-${idx + 1}`,
        requirement_text: req.text,
        status: gapData?.status || 'not_covered',
        evidence: gapData?.evidence || 'No evidence found',
        gap_description: gapData?.gap_description || 'Requirement not analyzed',
        risk_level: gapData?.risk_level || 'medium'
      };
    });

    return {
      gaps,
      summary: analysis.summary || 'Gap analysis completed',
      confidence_score: analysis.confidence_score || 0.75
    };
  } catch (error) {
    console.error('[ComplianceGap] Ollama analysis failed, using fallback:', error);
    return createFallbackAnalysis(requirements);
  }
}

/**
 * Find matching procedure for a requirement gap
 */
function findMatchingProcedure(gap, procedures) {
  if (!procedures || procedures.length === 0) return null;
  
  // Simple matching: find procedure with highest text similarity
  const gapText = gap.requirement_text?.toLowerCase() || '';
  let bestMatch = null;
  let bestScore = 0;

  for (const procedure of procedures) {
    const procedureText = (procedure.procedure_text || '').toLowerCase();
    const procedureTitle = (procedure.procedure_title || '').toLowerCase();
    
    // Simple keyword matching score
    const gapWords = gapText.split(/\s+/).filter(w => w.length > 3);
    let score = 0;
    
    for (const word of gapWords) {
      if (procedureText.includes(word)) score += 1;
      if (procedureTitle.includes(word)) score += 2;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = procedure;
    }
  }

  return bestMatch;
}

/**
 * Extract requirements from file
 * This is a placeholder - in production, use proper PDF/DOCX parsers
 */
export async function extractRequirementsFromFile(file) {
  // This would use pdf-parse, mammoth, or similar libraries
  // For MVP, return placeholder
  return {
    procedures: [],
    confidence: 0.5,
    message: 'File extraction pending - requires PDF/DOCX parser libraries'
  };
}

/**
 * Generate clarification questions using Ollama
 */
export async function generateClarificationQuestions(gaps) {
  const ambiguousGaps = gaps.filter(g => 
    g.status === 'partially_covered' || g.confidence_score < 0.7
  );

  if (ambiguousGaps.length === 0) {
    return [];
  }

  const systemPrompt = `You are a compliance expert generating clarification questions for ambiguous gap analysis results.
Generate clear, concise questions that help determine if a requirement is truly covered or not.
Each question should be specific and actionable.`;

  const prompt = `
Ambiguous gaps that need clarification:
${ambiguousGaps.map((g, idx) => 
  `${idx + 1}. [${g.clause_number}] ${g.requirement_text.substring(0, 200)}...
   Current status: ${g.status}
   Evidence: ${g.evidence || 'None'}
`).join('\n')}

Generate 3-5 clarification questions in JSON format:
{
  "questions": [
    {
      "requirement_id": "...",
      "clause_number": "...",
      "question_text": "...",
      "requirement_reference": "..."
    }
  ]
}
`;

  try {
    const response = await callOllama(prompt, systemPrompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return data.questions || [];
    }
  } catch (error) {
    console.error('[ComplianceGap] Error generating clarification questions:', error);
  }

  // Fallback: generate simple questions
  return ambiguousGaps.slice(0, 5).map(gap => ({
    requirement_id: gap.requirement_id,
    clause_number: gap.clause_number,
    question_text: `Is requirement ${gap.clause_number} fully addressed in your procedures?`,
    requirement_reference: gap.clause_number
  }));
}

/**
 * Score match between requirement and procedure
 */
export function scoreMatch(requirement, procedure) {
  const reqText = (requirement.text || '').toLowerCase();
  const procText = (procedure.procedure_text || '').toLowerCase();
  const procTitle = (procedure.procedure_title || '').toLowerCase();

  // Simple keyword matching algorithm
  const reqWords = reqText.split(/\s+/).filter(w => w.length > 3);
  let matchCount = 0;
  let totalWords = reqWords.length;

  for (const word of reqWords) {
    if (procText.includes(word) || procTitle.includes(word)) {
      matchCount++;
    }
  }

  const baseScore = totalWords > 0 ? matchCount / totalWords : 0;
  
  // Boost score if title matches
  const titleMatch = reqWords.some(w => procTitle.includes(w));
  const finalScore = Math.min(0.95, baseScore + (titleMatch ? 0.1 : 0));

  return finalScore;
}

/**
 * Record learning event
 */
export async function recordLearningEvent(requirement_id, before_confidence, after_confidence, options = {}) {
  return await models.saveLearningEvent(requirement_id, before_confidence, after_confidence, options);
}

/**
 * Create fallback analysis when Ollama fails
 */
function createFallbackAnalysis(requirements) {
  return {
    gaps: requirements.map((req, idx) => ({
      requirement_id: req.id,
      clause_number: req.clause_number || `REQ-${idx + 1}`,
      requirement_text: req.text,
      status: 'not_covered',
      evidence: 'Analysis pending - AI service unavailable',
      gap_description: 'Requirement needs manual review',
      risk_level: 'medium'
    })),
    summary: 'Fallback analysis: AI service unavailable. Manual review recommended.',
    confidence_score: 0.5
  };
}

/**
 * Get analysis by ID
 */
export async function getAnalysis(analysisId) {
  const result = await queryPostgres(
    `SELECT * FROM public.gap_analyses WHERE analysis_id = $1`,
    [analysisId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Analysis not found: ${analysisId}`);
  }

  return result.rows[0];
}

/**
 * List analyses for a customer
 */
export async function listAnalyses(customerId, limit = 50) {
  const result = await queryPostgres(
    `SELECT analysis_id, standard_code, status, summary, 
            total_requirements, covered_count, partially_covered_count, not_covered_count,
            confidence_score, started_at, completed_at
     FROM public.gap_analyses
     WHERE customer_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [customerId, limit]
  );

  return result.rows;
}

/**
 * Get clarifications for an analysis
 */
export async function getClarifications(analysisId) {
  const result = await queryPostgres(
    `SELECT * FROM public.analysis_clarifications
     WHERE analysis_id = (SELECT id FROM public.gap_analyses WHERE analysis_id = $1)
     ORDER BY asked_at`,
    [analysisId]
  );

  return result.rows;
}

/**
 * Add clarification question
 */
export async function addClarification(analysisId, questionText, requirementReference = null) {
  const analysisResult = await queryPostgres(
    `SELECT id FROM public.gap_analyses WHERE analysis_id = $1`,
    [analysisId]
  );

  if (analysisResult.rows.length === 0) {
    throw new Error(`Analysis not found: ${analysisId}`);
  }

  const gapAnalysisId = analysisResult.rows[0].id;

  const result = await queryPostgres(
    `INSERT INTO public.analysis_clarifications
     (analysis_id, question_text, requirement_reference, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [gapAnalysisId, questionText, requirementReference]
  );

  return result.rows[0];
}

/**
 * Answer clarification
 */
export async function answerClarification(clarificationId, answerText) {
  const result = await queryPostgres(
    `UPDATE public.analysis_clarifications
     SET answer_text = $1, status = 'answered', answered_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [answerText, clarificationId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Clarification not found: ${clarificationId}`);
  }

  return result.rows[0];
}

