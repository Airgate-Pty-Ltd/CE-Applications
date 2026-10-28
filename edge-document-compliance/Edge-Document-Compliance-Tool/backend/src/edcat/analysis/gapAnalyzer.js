/**
 * EDCAT Gap Analyzer Module
 * Matches requirements to customer procedures and identifies gaps
 * This is part of EDCAT AI's gap analysis engine
 */

import { semanticMatcher } from '../../services/semanticMatcher.js';
import auditTrail from '../auditTrail.js';

class GapAnalyzer {
  /**
   * Find gaps between requirements and customer procedures
   * @param {Array} requirements - Requirements from standard
   * @param {Array} procedures - Customer procedures/documents
   * @param {Object} options - Options including analysisId, confidence thresholds
   * @returns {Promise<Array>} Mappings with confidence scores
   */
  async findGaps(requirements, procedures, options = {}) {
    const { analysisId, minConfidence = 0.55, maxConfidence = 0.75 } = options;
    const startTime = Date.now();

    try {
      const mappings = [];

      for (const requirement of requirements) {
        let bestMatch = null;
        let bestConfidence = 0;
        let bestProcedure = null;

        // Try to match against each procedure
        for (const procedure of procedures) {
          let confidence = 0;

          // Use semantic matcher if available
          if (semanticMatcher && typeof semanticMatcher.calculateSimilarity === 'function') {
            confidence = await semanticMatcher.calculateSimilarity(
              requirement.requirementText,
              procedure.text || procedure.name || ''
            );
          } else {
            // Fallback: keyword-based matching
            confidence = this.calculateKeywordMatch(
              requirement.requirementText,
              procedure.text || procedure.name || '',
              requirement.keywords || []
            );
          }

          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestMatch = {
              requirementId: requirement.requirementId,
              procedureId: procedure.id,
              confidence,
              requirement,
              procedure
            };
            bestProcedure = procedure;
          }
        }

        mappings.push({
          ...bestMatch,
          isMapping: bestConfidence >= minConfidence,
          isCovered: bestConfidence > maxConfidence,
          needsClarification: bestConfidence >= minConfidence && bestConfidence <= maxConfidence,
          isGap: bestConfidence < minConfidence
        });
      }

      const executionTime = Date.now() - startTime;

      // Log to audit trail
      if (analysisId) {
        const covered = mappings.filter(m => m.isCovered).length;
        const gaps = mappings.filter(m => m.isGap).length;
        const flagged = mappings.filter(m => m.needsClarification).length;

        await auditTrail.log({
          analysisId,
          actor: 'GAP_ANALYZER',
          action: 'FIND_GAPS',
          details: `Analyzed ${requirements.length} requirements against ${procedures.length} procedures: ${covered} covered, ${gaps} gaps, ${flagged} flagged`,
          reasoning: {
            matchingMethod: semanticMatcher ? 'semantic_similarity' : 'keyword_matching',
            confidenceThresholds: { min: minConfidence, max: maxConfidence },
            totalRequirements: requirements.length,
            totalProcedures: procedures.length
          },
          status: 'success',
          metadata: {
            covered,
            gaps,
            flagged,
            totalMappings: mappings.length
          },
          executionTimeMs: executionTime,
          confidenceScore: this.calculateAverageConfidence(mappings)
        });
      }

      return mappings;

    } catch (error) {
      console.error('[GapAnalyzer] ❌ Error finding gaps:', error);
      
      if (analysisId) {
        await auditTrail.log({
          analysisId,
          actor: 'GAP_ANALYZER',
          action: 'FIND_GAPS',
          details: `Failed to find gaps: ${error.message}`,
          status: 'failed',
          metadata: { error: error.message }
        });
      }

      throw error;
    }
  }

  /**
   * Calculate keyword-based match confidence (fallback)
   */
  calculateKeywordMatch(reqText, procText, keywords = []) {
    if (!procText) return 0;
    
    const reqLower = reqText.toLowerCase();
    const procLower = procText.toLowerCase();
    
    // Check keyword matches
    let keywordMatches = 0;
    for (const keyword of keywords) {
      if (procLower.includes(keyword.toLowerCase())) {
        keywordMatches++;
      }
    }
    
    // Check text overlap
    const reqWords = reqLower.split(/\s+/).filter(w => w.length > 3);
    const procWords = procLower.split(/\s+/).filter(w => w.length > 3);
    const commonWords = reqWords.filter(w => procWords.includes(w));
    
    const keywordScore = keywords.length > 0 ? keywordMatches / keywords.length : 0;
    const wordOverlapScore = reqWords.length > 0 ? commonWords.length / reqWords.length : 0;
    
    return Math.min(1.0, (keywordScore * 0.6 + wordOverlapScore * 0.4));
  }

  /**
   * Calculate average confidence for mappings
   */
  calculateAverageConfidence(mappings) {
    if (mappings.length === 0) return 0;
    const avgConfidence = mappings.reduce((sum, m) => sum + (m.confidence || 0), 0) / mappings.length;
    return Math.min(1.0, avgConfidence);
  }
}

export default new GapAnalyzer();


