/**
 * Bounded LLM Service
 * 
 * Deterministic requirement extraction with strict safety guardrails.
 * Dual engine architecture: Bounded AI (rule-based) and Advanced (GPT-4).
 * 
 * © 2025 Conform-Edge Quality Consulting. All rights reserved. CEQC-OQCQMS
 */

import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

// System prompt for bounded AI (non-negotiable)
const BOUNDED_SYSTEM_PROMPT = `You are the EDCAT Bounded Compliance Engine, created by Conform-Edge Quality Consulting.

OPERATIONAL CONSTRAINTS:
1. You ONLY use the document text provided in this prompt.
2. You NEVER search the internet, use external tools, or reference knowledge outside this context.
3. You NEVER invent, fabricate, or hallucinate requirements, standards, or regulations.
4. If information is insufficient in the provided context, you respond with: 
   "Insufficient data in provided documents to determine [specific answer]."

TASK: Extract regulatory requirements from the provided text.

Requirements are statements containing SHALL, MUST, SHOULD, WILL, or imperative verbs.
Non-requirements include: Table of Contents, headers, descriptive text, references sections.

For each requirement found:
- Identify the exact text
- Classify as: mandatory (shall/must), conditional (should), or directive (will)
- Note section number and line numbers
- Provide confidence (0.0-1.0) based on keyword clarity

OUTPUT ONLY JSON. NO EXPLANATIONS OUTSIDE JSON.`;

/**
 * Rule-based requirement extraction (Bounded AI Engine)
 * No external API calls, 100% deterministic
 */
function extractRequirementsBounded(text, documentName = '') {
  const requirements = [];
  const lines = text.split('\n');
  
  // Keywords that indicate requirements
  const mandatoryKeywords = /\b(shall|must|is required to|are required to)\b/gi;
  const conditionalKeywords = /\b(should|may|can|might)\b/gi;
  const directiveKeywords = /\b(will|shall be|must be)\b/gi;
  
  // Pattern to detect clause references (e.g., "8.3.2", "21.137(e)", "Section 4.4")
  const clausePattern = /(?:section|clause|paragraph|subpart|part)\s*([\d.]+[a-z]?)/i;
  
  let currentClause = null;
  let lineNumber = 0;
  
  for (let i = 0; i < lines.length; i++) {
    lineNumber = i + 1;
    const line = lines[i].trim();
    
    // Skip empty lines, headers, TOC
    if (!line || line.length < 10) continue;
    if (line.match(/^(table of contents|contents|index|references?|bibliography)/i)) continue;
    if (line.match(/^page\s+\d+/i)) continue;
    
    // Detect clause references
    const clauseMatch = line.match(clausePattern);
    if (clauseMatch) {
      currentClause = clauseMatch[1];
    }
    
    // Check for requirement keywords
    const hasMandatory = mandatoryKeywords.test(line);
    const hasConditional = conditionalKeywords.test(line);
    const hasDirective = directiveKeywords.test(line);
    
    if (hasMandatory || hasConditional || hasDirective) {
      // Determine type and confidence
      let type = 'directive';
      let keyword = 'will';
      let confidence = 0.7;
      
      if (hasMandatory) {
        type = 'mandatory';
        keyword = line.match(/\b(shall|must)\b/i)?.[0]?.toLowerCase() || 'shall';
        confidence = keyword === 'must' ? 0.95 : 0.90;
      } else if (hasConditional) {
        type = 'conditional';
        keyword = line.match(/\b(should|may)\b/i)?.[0]?.toLowerCase() || 'should';
        confidence = keyword === 'should' ? 0.85 : 0.70;
      } else if (hasDirective) {
        type = 'directive';
        keyword = 'will';
        confidence = 0.75;
      }
      
      // Extract requirement text (current line + next 2 lines if they continue the sentence)
      let requirementText = line;
      if (i + 1 < lines.length && !lines[i + 1].match(/^[A-Z]/)) {
        requirementText += ' ' + lines[i + 1].trim();
      }
      if (i + 2 < lines.length && !lines[i + 2].match(/^[A-Z]/)) {
        requirementText += ' ' + lines[i + 2].trim();
      }
      
      // Clean up requirement text
      requirementText = requirementText
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 1000); // Limit length
      
      if (requirementText.length > 20) {
        requirements.push({
          id: `req-${uuidv4().substring(0, 8)}`,
          text: requirementText,
          clause_reference: currentClause || null,
          line_number: lineNumber,
          keyword,
          type,
          confidence,
          engine: 'bounded',
          context_before: i > 0 ? lines[i - 1].trim().substring(0, 100) : null,
          context_after: i + 1 < lines.length ? lines[i + 1].trim().substring(0, 100) : null
        });
      }
    }
  }
  
  return requirements;
}

/**
 * Advanced GPT-4 requirement extraction
 * Uses OpenAI API with strict grounding constraints
 */
async function extractRequirementsAdvanced(text, documentName = '') {
  const provider = process.env.LLM_PROVIDER || 'bounded';
  
  if (provider !== 'openai' || !process.env.OPENAI_API_KEY) {
    console.warn('[LLM] OpenAI not configured, falling back to Bounded AI');
    return extractRequirementsBounded(text, documentName);
  }
  
  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const prompt = `${BOUNDED_SYSTEM_PROMPT}

DOCUMENT: ${documentName}

TEXT TO ANALYZE:
${text.substring(0, 15000)}  // Limit to avoid token limits

Extract all requirements and return as JSON array:
[
  {
    "text": "exact requirement text",
    "clause_reference": "8.3.2",
    "line_number": 42,
    "keyword": "shall",
    "type": "mandatory",
    "confidence": 0.95
  }
]`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: BOUNDED_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),
      max_tokens: parseInt(process.env.LLM_MAX_TOKENS || '2000'),
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }
    
    const parsed = JSON.parse(content);
    const requirements = Array.isArray(parsed.requirements) 
      ? parsed.requirements 
      : Array.isArray(parsed) 
        ? parsed 
        : [];
    
    // Add engine metadata
    return requirements.map(req => ({
      ...req,
      engine: 'advanced',
      extracted_at: new Date().toISOString()
    }));
    
  } catch (error) {
    console.error('[LLM] Advanced extraction failed, falling back to Bounded:', error);
    return extractRequirementsBounded(text, documentName);
  }
}

/**
 * Extract requirements from documents
 * @param {Array<string>} documentIds - Array of document UUIDs
 * @param {string} tenantId - Tenant ID for scoping
 * @param {string} engine - 'bounded' or 'advanced'
 */
export async function extractRequirements(documentIds, tenantId, engine = 'bounded') {
  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    throw new Error('Document IDs required');
  }
  
  if (!tenantId) {
    throw new Error('Tenant ID required');
  }
  
  // Fetch documents (tenant-scoped)
  const docsResult = await query(
    `SELECT id, document_name, raw_text, extracted_text, document_type
     FROM documents
     WHERE id = ANY($1::uuid[]) AND customer_id = $2 AND is_deleted = FALSE`,
    [documentIds, tenantId]
  );
  
  if (docsResult.rows.length === 0) {
    throw new Error('No documents found or access denied');
  }
  
  const documents = docsResult.rows;
  const allRequirements = [];
  const extractionId = uuidv4();
  
  for (const doc of documents) {
    const text = doc.extracted_text || doc.raw_text || '';
    if (!text || text.trim().length === 0) {
      console.warn(`[LLM] Document ${doc.id} has no extractable text`);
      continue;
    }
    
    // Extract requirements based on engine
    let requirements;
    const startTime = Date.now();
    
    if (engine === 'advanced') {
      requirements = await extractRequirementsAdvanced(text, doc.document_name);
    } else {
      requirements = extractRequirementsBounded(text, doc.document_name);
    }
    
    const processingTime = Date.now() - startTime;
    
    // Store requirements in database
    for (const req of requirements) {
      const reqId = uuidv4();
      await query(
        `INSERT INTO requirement_extractions 
         (id, tenant_id, document_id, requirement_text, clause_reference, line_number,
          keyword, type, confidence, engine, extracted_at, audit_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)`,
        [
          reqId,
          tenantId,
          doc.id,
          req.text,
          req.clause_reference || null,
          req.line_number || null,
          req.keyword || null,
          req.type || 'mandatory',
          req.confidence || 0.8,
          engine,
          JSON.stringify({
            extraction_id: extractionId,
            processing_time_ms: processingTime,
            document_name: doc.document_name,
            document_type: doc.document_type
          })
        ]
      );
      
      allRequirements.push({
        id: reqId,
        ...req,
        document_id: doc.id,
        document_name: doc.document_name
      });
    }
  }
  
  // Calculate summary
  const mandatory = allRequirements.filter(r => r.type === 'mandatory').length;
  const conditional = allRequirements.filter(r => r.type === 'conditional').length;
  const directive = allRequirements.filter(r => r.type === 'directive').length;
  const avgConfidence = allRequirements.length > 0
    ? allRequirements.reduce((sum, r) => sum + (r.confidence || 0), 0) / allRequirements.length
    : 0;
  
  return {
    extraction_id: extractionId,
    tenant_id: tenantId,
    engine,
    status: 'success',
    extracted_at: new Date().toISOString(),
    document_count: documents.length,
    requirements: allRequirements,
    summary: {
      total: allRequirements.length,
      mandatory,
      conditional,
      directive,
      average_confidence: avgConfidence
    }
  };
}

/**
 * Run GAP analysis task using bounded LLM
 * This is the central reasoning layer - only place LLMs are called
 * 
 * @param {Object} task - GapAnalysisTask
 * @returns {Promise<GapAnalysisResult>}
 */
export async function runGapAnalysisTask(task) {
  const {
    tenantId,
    standardCode,
    clauseRef,
    gapProfile,
    candidateMatches
  } = task;
  
  if (!gapProfile) {
    return {
      clause: clauseRef,
      status: 'not_modeled',
      source_requirement: null,
      gap_profile_id: null,
      target_matches: [],
      gap_reason: 'No GAP profile defined for this clause.',
      risk_level: null
    };
  }
  
  if (!candidateMatches || candidateMatches.length === 0) {
    return {
      clause: clauseRef,
      status: 'not_covered',
      source_requirement: gapProfile.requirement_text || '',
      gap_profile_id: gapProfile.id,
      target_matches: [],
      gap_reason: 'No matching content found in target documents.',
      risk_level: gapProfile.risk_level || 'Medium'
    };
  }
  
  // Build system prompt (bounded, document-only)
  const systemPrompt = `You are the EDCAT Bounded Compliance Engine created by Conform-Edge Quality Consulting.

OPERATIONAL CONSTRAINTS:
1. You ONLY use the provided text and metadata in this prompt.
2. You NEVER search the internet, use external tools, or reference knowledge outside this context.
3. You NEVER invent, fabricate, or hallucinate requirements, standards, or regulations.
4. If information is insufficient in the provided context, respond with status: "insufficient_data".

TASK: Analyze coverage of a regulatory requirement against client documents.

You will receive:
- A clause requirement text
- A GAP profile (interpretation and expected evidence)
- Candidate document excerpts from the client's documents

Decide coverage status:
- "covered": All key expectations clearly satisfied by target documents
- "partially_covered": Some but not all expectations satisfied
- "not_covered": No meaningful alignment found
- "insufficient_data": Cannot support a conclusion from provided text

OUTPUT ONLY JSON matching this structure:
{
  "status": "covered" | "partially_covered" | "not_covered" | "insufficient_data",
  "gap_reason": "Brief explanation referencing specific document sections",
  "risk_level": "High" | "Medium" | "Low" | null
}`;

  // Build user prompt with context
  const requirementText = gapProfile.requirement_text || '';
  const interpretation = gapProfile.interpretation || '';
  const expectedEvidence = gapProfile.expected_evidence || '';
  
  const matchesText = candidateMatches.map((match, idx) => 
    `Document ${idx + 1} (${match.document_name || 'Unknown'}):
Section: ${match.section_label || 'N/A'}
Excerpt: ${match.text.substring(0, 500)}`
  ).join('\n\n');
  
  const userPrompt = `CLAUSE: ${clauseRef}
STANDARD: ${standardCode}

REQUIREMENT TEXT:
${requirementText}

GAP PROFILE INTERPRETATION:
${interpretation}

EXPECTED EVIDENCE:
${expectedEvidence}

CANDIDATE MATCHES FROM CLIENT DOCUMENTS:
${matchesText}

Analyze whether the client documents satisfy the requirement expectations.`;

  // Call LLM provider
  const provider = process.env.LLM_PROVIDER || 'bounded';
  
  if (provider === 'bounded' || !process.env.OPENAI_API_KEY) {
    // Use rule-based heuristic (no LLM call)
    return analyzeCoverageHeuristic(gapProfile, candidateMatches, clauseRef);
  }
  
  // Use OpenAI GPT-4
  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const response = await openai.chat.completions.create({
      model: process.env.LLM_MODEL || 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),
      max_tokens: parseInt(process.env.LLM_MAX_TOKENS || '500'),
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from LLM');
    }
    
    const parsed = JSON.parse(content);
    
    return {
      clause: clauseRef,
      status: parsed.status || 'insufficient_data',
      source_requirement: requirementText,
      gap_profile_id: gapProfile.id,
      target_matches: candidateMatches.map(m => ({
        document_id: m.document_id,
        section_label: m.section_label,
        excerpt: m.text.substring(0, 300),
        score: m.score || 0.8
      })),
      gap_reason: parsed.gap_reason || 'Analysis completed',
      risk_level: parsed.risk_level || gapProfile.risk_level || 'Medium'
    };
    
  } catch (error) {
    console.error('[LLM] GAP analysis task failed, using heuristic:', error);
    return analyzeCoverageHeuristic(gapProfile, candidateMatches, clauseRef);
  }
}

/**
 * Heuristic-based coverage analysis (fallback when LLM unavailable)
 */
function analyzeCoverageHeuristic(gapProfile, candidateMatches, clauseRef) {
  if (!candidateMatches || candidateMatches.length === 0) {
    return {
      clause: clauseRef,
      status: 'not_covered',
      source_requirement: gapProfile.requirement_text || '',
      gap_profile_id: gapProfile.id,
      target_matches: [],
      gap_reason: 'No matching content found in target documents.',
      risk_level: gapProfile.risk_level || 'Medium'
    };
  }
  
  // Count keyword matches from expected evidence
  const expectedKeywords = (gapProfile.expected_evidence || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 4)
    .slice(0, 10);
  
  let totalMatches = 0;
  const allText = candidateMatches.map(m => m.text.toLowerCase()).join(' ');
  
  expectedKeywords.forEach(keyword => {
    if (allText.includes(keyword)) {
      totalMatches++;
    }
  });
  
  const matchRatio = expectedKeywords.length > 0 ? totalMatches / expectedKeywords.length : 0;
  
  let status = 'not_covered';
  let gapReason = 'Limited alignment found between requirement and target documents.';
  
  if (matchRatio >= 0.7 && candidateMatches.length >= 2) {
    status = 'covered';
    gapReason = 'Target documents appear to satisfy key requirement expectations.';
  } else if (matchRatio >= 0.4 || candidateMatches.length >= 1) {
    status = 'partially_covered';
    gapReason = 'Some requirement expectations addressed, but gaps may remain.';
  }
  
  return {
    clause: clauseRef,
    status,
    source_requirement: gapProfile.requirement_text || '',
    gap_profile_id: gapProfile.id,
    target_matches: candidateMatches.map(m => ({
      document_id: m.document_id,
      section_label: m.section_label,
      excerpt: m.text.substring(0, 300),
      score: m.score || 0.8
    })),
    gap_reason: gapReason,
    risk_level: gapProfile.risk_level || 'Medium'
  };
}

/**
 * Compare documents to find coverage (legacy function, kept for compatibility)
 */
export async function compareDocuments(sourceDocIds, targetDocIds, tenantId) {
  // Get source requirements
  const sourceReqs = await query(
    `SELECT id, requirement_text, clause_reference, type, confidence
     FROM requirement_extractions
     WHERE document_id = ANY($1::uuid[]) AND tenant_id = $2`,
    [sourceDocIds, tenantId]
  );
  
  // Get target document segments
  const targetSegments = await query(
    `SELECT id, text, section_label, document_id
     FROM document_chunks
     WHERE document_id = ANY($1::uuid[]) AND tenant_id = $2`,
    [targetDocIds, tenantId]
  );
  
  // Simple text matching (will be enhanced with semantic search)
  const coverage = sourceReqs.rows.map(req => {
    const reqText = req.requirement_text.toLowerCase();
    const matches = targetSegments.rows.filter(seg => 
      seg.text.toLowerCase().includes(reqText.substring(0, 50))
    );
    
    let coverageStatus = 'NOT_COVERED';
    let score = 0.0;
    
    if (matches.length > 0) {
      coverageStatus = matches.length > 1 ? 'FULL_COVERED' : 'PARTIAL_COVERED';
      score = matches.length > 1 ? 0.85 : 0.65;
    }
    
    return {
      requirement_id: req.id,
      requirement_text: req.requirement_text,
      clause_reference: req.clause_reference,
      coverage_status: coverageStatus,
      confidence_score: score,
      evidence_mappings: matches.map(m => ({
        document_id: m.document_id,
        segment_id: m.id,
        text: m.text.substring(0, 200),
        match_score: 0.8
      }))
    };
  });
  
  return {
    source_documents: sourceDocIds,
    target_documents: targetDocIds,
    coverage
  };
}

export default {
  extractRequirements,
  compareDocuments
};

