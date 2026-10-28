/**
 * EDCAT Parser Module (Extension)
 * Extracts requirements with clauses from standards
 * This is part of EDCAT AI's parsing extension
 */

import { ClauseAwareParser } from '../../services/clauseAwareParser.js';
import { queryEdcatAI } from '../../database/connection.js';
import auditTrail from '../auditTrail.js';

class ClauseParser {
  /**
   * Extract requirements with clauses from a standard
   * @param {string} standardId - Standard ID
   * @param {Object} options - Options including analysisId for audit trail
   * @returns {Promise<Array>} Requirements with clause information
   */
  async extractRequirementsWithClauses(standardId, options = {}) {
    const { analysisId, logEvent } = options;
    const startTime = Date.now();

    try {
      // Get standard metadata from EDCAT AI DB
      const standardResult = await queryEdcatAI(
        `SELECT id, code, name FROM standards WHERE id = $1`,
        [standardId]
      );

      if (standardResult.rows.length === 0) {
        throw new Error(`Standard not found: ${standardId}`);
      }

      const standard = standardResult.rows[0];

      // Get all requirements for this standard from EDCAT AI DB
      const requirementsResult = await queryEdcatAI(
        `SELECT 
          id, clause_number, requirement_text, clause_title,
          requirement_type, requirement_subtype, full_ref,
          clause_ref, sub_ref, confidence, keywords,
          aerospace_addition, requires_maintained_di, requires_retained_di
        FROM parsed_requirements
        WHERE standard_id = $1
        AND is_in_scope = true
        ORDER BY clause_number, full_ref`,
        [standardId]
      );

      const requirements = requirementsResult.rows.map(row => ({
        requirementId: row.id,
        clauseNumber: row.clause_number,
        clauseTitle: row.clause_title,
        requirementText: row.requirement_text,
        requirementType: row.requirement_type,
        requirementSubtype: row.requirement_subtype,
        fullRef: row.full_ref,
        clauseRef: row.clause_ref,
        subRef: row.sub_ref,
        confidence: row.confidence || 0.8,
        keywords: Array.isArray(row.keywords) ? row.keywords : (row.keywords ? row.keywords.split(',') : []),
        aerospaceAddition: row.aerospace_addition || false,
        requiresMaintainedDI: row.requires_maintained_di || false,
        requiresRetainedDI: row.requires_retained_di || false
      }));

      const executionTime = Date.now() - startTime;

      // Log to audit trail
      if (analysisId) {
        await auditTrail.log({
          analysisId,
          actor: 'PARSER',
          action: 'EXTRACT_REQUIREMENTS',
          details: `Extracted ${requirements.length} requirements from ${standard.code}`,
          reasoning: {
            standardId,
            standardCode: standard.code,
            method: 'database_query',
            inScopeFilter: true
          },
          status: 'success',
          standardId,
          executionTimeMs: executionTime,
          confidenceScore: this.calculateConfidence(requirements)
        });
      }

      return requirements;

    } catch (error) {
      console.error('[ClauseParser] ❌ Error extracting requirements:', error);
      
      if (options.analysisId) {
        await auditTrail.log({
          analysisId: options.analysisId,
          actor: 'PARSER',
          action: 'EXTRACT_REQUIREMENTS',
          details: `Failed to extract requirements: ${error.message}`,
          status: 'failed',
          standardId,
          metadata: { error: error.message }
        });
      }

      throw error;
    }
  }

  /**
   * Calculate average confidence for extracted requirements
   */
  calculateConfidence(requirements) {
    if (requirements.length === 0) return 0;
    const avgConfidence = requirements.reduce((sum, r) => sum + (r.confidence || 0.8), 0) / requirements.length;
    return Math.min(1.0, avgConfidence);
  }
}

export default new ClauseParser();


