/**
 * Core Compliance Analyzer
 * Handles requirement extraction and gap analysis
 */

import { complianceDB, customerDB } from './database.js';
import { generateClarifications } from './clarificationEngine.js';

/**
 * Parse requirements from a standard document
 * Uses bounded AI to extract structured requirements
 */
export async function parseRequirements(standardId, documentText) {
  // TODO: Implement bounded AI parsing using OpenAI
  // For now, returns mock structure
  
  const requirements = [];
  const clauses = extractClauses(documentText);
  
  for (const clause of clauses) {
    const requirement = await complianceDB.createRequirement({
      standard_id: standardId,
      clause_number: clause.number,
      requirement_text: clause.text,
      keyword: extractKeyword(clause.text),
      confidence: 0.85,
    });
    requirements.push(requirement);
  }
  
  return requirements;
}

/**
 * Find gaps between requirements and customer procedures
 */
export async function findGaps(standardId, customerId) {
  // Get all requirements for the standard
  const standard = await complianceDB.getStandardByCode(standardId);
  if (!standard) {
    throw new Error(`Standard not found: ${standardId}`);
  }
  
  const requirements = await complianceDB.getRequirementsByStandard(standard.standard_id);
  
  // Get all procedures for the customer
  const procedures = await customerDB.getProceduresByCustomer(customerId);
  
  // Perform matching
  const matches = [];
  const ambiguous = [];
  
  for (const requirement of requirements) {
    let bestMatch = null;
    let bestConfidence = 0;
    
    for (const procedure of procedures) {
      const confidence = calculateMatchConfidence(
        requirement.requirement_text,
        procedure.procedure_text
      );
      
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = { requirement, procedure, confidence };
      }
    }
    
    if (bestConfidence > 0.80) {
      // Clear match
      matches.push({
        ...bestMatch,
        is_covered: true,
      });
    } else if (bestConfidence >= 0.55 && bestConfidence <= 0.80) {
      // Ambiguous - needs clarification
      ambiguous.push({
        ...bestMatch,
        is_covered: null, // Unknown until clarified
      });
    } else {
      // Gap
      matches.push({
        requirement,
        procedure: null,
        confidence: bestConfidence,
        is_covered: false,
      });
    }
  }
  
  return {
    matches,
    ambiguous,
    totalRequirements: requirements.length,
  };
}

/**
 * Run complete analysis with clarifications
 */
export async function runAnalysis(customerId, standardId) {
  // Create analysis record
  const standard = await complianceDB.getStandardByCode(standardId);
  const modelVersion = await complianceDB.getCurrentModelVersion();
  
  const initialGapResult = await findGaps(standardId, customerId);
  
  const analysis = await customerDB.createAnalysis({
    customer_id: customerId,
    standard_id: standard.standard_id,
    total_requirements: initialGapResult.totalRequirements,
    model_version_used: modelVersion?.version || '1.0.0',
  });
  
  // Store initial mappings
  for (const match of initialGapResult.matches) {
    if (match.procedure) {
      await customerDB.createMapping({
        requirement_id: match.requirement.requirement_id,
        procedure_id: match.procedure.procedure_id,
        match_confidence: match.confidence,
        is_covered: match.is_covered,
      });
    }
  }
  
  // Generate clarifications for ambiguous areas
  const clarifications = await generateClarifications(
    analysis.analysis_id,
    initialGapResult.ambiguous
  );
  
  return {
    analysis,
    matches: initialGapResult.matches,
    clarifications,
    ambiguousCount: initialGapResult.ambiguous.length,
  };
}

/**
 * Calculate match confidence between requirement and procedure text
 * Uses keyword matching and semantic similarity
 */
function calculateMatchConfidence(requirementText, procedureText) {
  // Simple keyword-based matching (to be enhanced with embeddings)
  const reqLower = requirementText.toLowerCase();
  const procLower = procedureText.toLowerCase();
  
  // Extract key terms from requirement
  const reqKeywords = extractKeywords(reqLower);
  const procKeywords = extractKeywords(procLower);
  
  // Calculate overlap
  const intersection = reqKeywords.filter(k => procKeywords.includes(k));
  const union = [...new Set([...reqKeywords, ...procKeywords])];
  
  const jaccardSimilarity = intersection.length / union.length;
  
  // Boost confidence if key compliance terms match
  const complianceTerms = ['shall', 'must', 'ensure', 'establish', 'maintain', 'control'];
  const hasComplianceTerms = complianceTerms.some(term => 
    reqLower.includes(term) && procLower.includes(term)
  );
  
  let confidence = jaccardSimilarity;
  if (hasComplianceTerms) {
    confidence = Math.min(1.0, confidence + 0.2);
  }
  
  return Math.round(confidence * 100) / 100; // Round to 2 decimals
}

/**
 * Extract keywords from text
 */
function extractKeywords(text) {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
  ]);
  
  return text
    .split(/\s+/)
    .map(word => word.replace(/[^\w]/g, '').toLowerCase())
    .filter(word => word.length > 3 && !stopWords.has(word));
}

/**
 * Extract clause number from text
 */
function extractClauses(text) {
  // Simple regex-based clause extraction
  // TODO: Enhance with AI parsing
  const clausePattern = /(\d+\.\d+(?:\.\d+)?)\s+(.+?)(?=\d+\.\d+|$)/gs;
  const clauses = [];
  let match;
  
  while ((match = clausePattern.exec(text)) !== null) {
    clauses.push({
      number: match[1],
      text: match[2].trim(),
    });
  }
  
  return clauses;
}

/**
 * Extract keyword (shall, must, etc.) from requirement text
 */
function extractKeyword(text) {
  const keywords = ['shall', 'must', 'should', 'may', 'can'];
  const lowerText = text.toLowerCase();
  
  for (const keyword of keywords) {
    if (lowerText.includes(keyword)) {
      return keyword;
    }
  }
  
  return null;
}

