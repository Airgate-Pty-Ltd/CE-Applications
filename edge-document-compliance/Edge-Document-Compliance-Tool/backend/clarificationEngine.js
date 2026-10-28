/**
 * Clarification Engine
 * Identifies ambiguous areas and generates clarification questions
 */

import { customerDB, complianceDB } from './database.js';

/**
 * Generate clarification questions for ambiguous matches
 */
export async function generateClarifications(analysisId, ambiguousMatches) {
  const clarifications = [];
  
  for (let i = 0; i < ambiguousMatches.length; i++) {
    const match = ambiguousMatches[i];
    const question = await generateClarificationQuestion(match);
    
    const clarification = await customerDB.createClarification({
      analysis_id: analysisId,
      requirement_id: match.requirement.requirement_id,
      procedure_id: match.procedure?.procedure_id || null,
      clarification_question: question,
      ai_confidence_before: match.confidence,
      user_response: null,
      ai_confidence_after: null,
    });
    
    clarifications.push(clarification);
  }
  
  return clarifications;
}

/**
 * Generate a clarification question for an ambiguous match
 */
async function generateClarificationQuestion(match) {
  const { requirement, procedure, confidence } = match;
  
  // Format question based on match type
  let question;
  
  if (procedure) {
    // Type 1: Explicit Match - asking if procedure covers requirement
    question = `ISO Requirement: "${requirement.requirement_text}"\n\n` +
               `Customer Document: "${procedure.procedure_text}"\n\n` +
               `Does this procedure COVER the requirement?`;
  } else {
    // Type 4: Missing Documentation - asking if requirement is covered elsewhere
    question = `ISO Requirement: "${requirement.requirement_text}"\n\n` +
               `We didn't find explicit coverage in the uploaded documents.\n\n` +
               `Is this requirement covered by your procedures (even if not mentioned in these docs)?`;
  }
  
  return question;
}

/**
 * Identify ambiguous areas from analysis results
 * Returns matches with confidence between 0.55 and 0.80
 */
export function identifyAmbiguousAreas(matches, confidenceThreshold = { min: 0.55, max: 0.80 }) {
  return matches.filter(match => 
    match.confidence >= confidenceThreshold.min && 
    match.confidence <= confidenceThreshold.max &&
    match.is_covered === null
  );
}

/**
 * Process user response to a clarification
 */
export async function processClarificationResponse(clarificationId, userResponse) {
  // Get the clarification by ID
  const clarification = await customerDB.getClarificationById(clarificationId);
  
  if (!clarification) {
    throw new Error(`Clarification not found: ${clarificationId}`);
  }
  
  // Update confidence based on response
  let newConfidence;
  
  if (userResponse === 'yes') {
    // User confirms coverage - boost confidence
    newConfidence = Math.min(1.0, clarification.ai_confidence_before + 0.15);
  } else if (userResponse === 'no') {
    // User denies coverage - lower confidence
    newConfidence = Math.max(0.0, clarification.ai_confidence_before - 0.20);
  } else {
    // Not sure - keep similar confidence but mark as uncertain
    newConfidence = clarification.ai_confidence_before;
  }
  
  // Update clarification record
  await customerDB.updateClarification(clarificationId, {
    user_response: userResponse,
    ai_confidence_after: newConfidence,
  });
  
  // Update requirement mapping if procedure exists
  if (clarification.procedure_id) {
    // Find or create mapping
    const mappings = await customerDB.getMappingsByAnalysis(clarification.analysis_id);
    const mapping = mappings.find(m => 
      m.requirement_id === clarification.requirement_id &&
      m.procedure_id === clarification.procedure_id
    );
    
    if (mapping) {
      await customerDB.updateMapping(mapping.mapping_id, {
        match_confidence: newConfidence,
        is_covered: userResponse === 'yes',
      });
    } else {
      await customerDB.createMapping({
        requirement_id: clarification.requirement_id,
        procedure_id: clarification.procedure_id,
        match_confidence: newConfidence,
        is_covered: userResponse === 'yes',
      });
    }
  }
  
  // Update requirement confidence in compliance library
  if (userResponse === 'yes') {
    await complianceDB.updateRequirementConfidence(
      clarification.requirement_id,
      newConfidence
    );
    
    // Record extraction history
    await complianceDB.recordExtraction({
      requirement_id: clarification.requirement_id,
      extraction_event: 'clarification_feedback',
      confidence_before: clarification.ai_confidence_before,
      confidence_after: newConfidence,
    });
  }
  
  return {
    clarificationId,
    newConfidence,
    isCovered: userResponse === 'yes',
  };
}

/**
 * Get next clarification question for an analysis
 */
export async function getNextClarification(analysisId) {
  const clarifications = await customerDB.getClarificationsByAnalysis(analysisId);
  
  // Find first unanswered clarification
  const next = clarifications.find(c => !c.user_response);
  
  if (!next) {
    return null; // All clarifications answered
  }
  
  // Get requirement details for better question formatting
  const requirement = await complianceDB.getRequirementById(next.requirement_id);
  
  return {
    clarificationId: next.clarification_id,
    question: next.clarification_question,
    questionNumber: clarifications.indexOf(next) + 1,
    totalQuestions: clarifications.length,
    requirementId: next.requirement_id,
    procedureId: next.procedure_id,
    requirement: requirement,
  };
}

/**
 * Check if analysis has pending clarifications
 */
export async function hasPendingClarifications(analysisId) {
  const clarifications = await customerDB.getClarificationsByAnalysis(analysisId);
  return clarifications.some(c => !c.user_response);
}

