/**
 * EDCAT Clarification Engine Module
 * Generates clarification questions for ambiguous mappings
 * This is part of EDCAT AI's clarification system
 */

import { v4 as uuidv4 } from 'uuid';
import auditTrail from '../auditTrail.js';

class ClarificationEngine {
  /**
   * Generate clarification questions for uncertain mappings
   * @param {Array} flaggedMappings - Mappings that need clarification
   * @param {Object} options - Options including analysisId, requirements, procedures
   * @returns {Promise<Array>} Clarification questions
   */
  async generateQuestions(flaggedMappings, options = {}) {
    const { analysisId, requirements = [], procedures = [] } = options;
    const startTime = Date.now();

    try {
      const clarifications = [];

      for (const mapping of flaggedMappings) {
        const { requirement, procedure, confidence } = mapping;
        
        // Generate contextual question
        const question = this.buildQuestion(requirement, procedure, confidence);
        
        clarifications.push({
          clarificationId: uuidv4(),
          requirementId: requirement.requirementId,
          requirementText: requirement.requirementText,
          clauseNumber: requirement.clauseNumber,
          clauseTitle: requirement.clauseTitle,
          procedureId: procedure?.id,
          procedureName: procedure?.name,
          confidence,
          question,
          context: {
            requirementFullText: requirement.requirementText,
            procedureText: procedure?.text?.substring(0, 500) || '',
            confidenceLevel: confidence < 0.65 ? 'low' : 'medium',
            requirementType: requirement.requirementType,
            requirementSubtype: requirement.requirementSubtype
          },
          suggestedAnswers: ['Yes', 'No', 'Partially', 'Need More Information']
        });
      }

      const executionTime = Date.now() - startTime;

      // Log to audit trail
      if (analysisId) {
        await auditTrail.log({
          analysisId,
          actor: 'CLARIFIER',
          action: 'GENERATE_QUESTIONS',
          details: `Generated ${clarifications.length} clarification questions`,
          reasoning: {
            strategy: 'contextual_question_generation',
            uncertainMappings: flaggedMappings.length,
            confidenceRange: {
              min: Math.min(...flaggedMappings.map(m => m.confidence)),
              max: Math.max(...flaggedMappings.map(m => m.confidence))
            }
          },
          status: 'success',
          metadata: {
            clarificationCount: clarifications.length
          },
          executionTimeMs: executionTime
        });
      }

      return clarifications;

    } catch (error) {
      console.error('[ClarificationEngine] ❌ Error generating questions:', error);
      
      if (analysisId) {
        await auditTrail.log({
          analysisId,
          actor: 'CLARIFIER',
          action: 'GENERATE_QUESTIONS',
          details: `Failed to generate questions: ${error.message}`,
          status: 'failed',
          metadata: { error: error.message }
        });
      }

      throw error;
    }
  }

  /**
   * Build a contextual clarification question
   */
  buildQuestion(requirement, procedure, confidence) {
    const reqPreview = requirement.requirementText.substring(0, 150);
    const procName = procedure?.name || 'your procedure';
    
    if (confidence < 0.65) {
      return `Does "${procName}" address the requirement: "${reqPreview}..."? The system found a low-confidence match (${(confidence * 100).toFixed(0)}%).`;
    } else {
      return `Does "${procName}" fully satisfy the requirement: "${reqPreview}..."? The system found a medium-confidence match (${(confidence * 100).toFixed(0)}%).`;
    }
  }
}

export default new ClarificationEngine();


