/**
 * Clause Correlation Engine
 * Generates gap analysis matrix by matching procedures to clauses
 */

import { query } from '../database/connection.js';
import SemanticMatcher from './semanticMatcher.js';

class ClauseCorrelationEngine {
  constructor() {
    this.matcher = new SemanticMatcher();
  }

  /**
   * Generate correlation matrix for a standard and tenant
   * @param {string} standardId - Standard UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} Matrix with coverage stats and correlations
   */
  async generateCorrelationMatrix(standardId, tenantId) {
    try {
      console.log(`[CORRELATION] Generating matrix for standard: ${standardId}`);

      // Get all clauses for this standard
      const clausesResult = await query(
        'SELECT * FROM parsed_clauses WHERE standard_id = $1 ORDER BY clause_number',
        [standardId]
      );

      if (!clausesResult.rows.length) {
        console.log('[CORRELATION] No clauses found');
        return {
          total_requirements: 0,
          covered: 0,
          partial: 0,
          gaps: 0,
          correlations: []
        };
      }

      const clauses = clausesResult.rows;
      console.log(`[CORRELATION] Found ${clauses.length} clauses`);

      // Get all procedures for this tenant
      const proceduresResult = await query(
        `SELECT cp.* FROM customer_procedures cp
         JOIN customer_documents cd ON cp.document_id = cd.id
         WHERE cd.tenant_id = $1
         AND cp.is_active = true`,
        [tenantId]
      );

      const procedures = proceduresResult.rows || [];
      console.log(`[CORRELATION] Found ${procedures.length} procedures`);

      // Match each clause to procedures
      const matrix = [];
      let covered = 0;
      let partial = 0;
      let gaps = 0;

      for (const clause of clauses) {
        let bestMatch = null;
        let bestScore = 0;
        let allGaps = [];

        // Try to match against all procedures
        for (const procedure of procedures) {
          const match = await this.matcher.matchProcedureToClause(procedure, clause);

          if (match.confidence > bestScore) {
            bestScore = match.confidence;
            bestMatch = {
              procedure_id: procedure.id,
              procedure_name: procedure.procedure_name || `Procedure ${procedure.id}`,
              reasoning: match.reasoning,
              gaps: match.gaps
            };
          }

          allGaps.push(...match.gaps);
        }

        // Determine status
        let status = 'none';
        if (bestScore > 0.75) {
          status = 'full';
          covered++;
        } else if (bestScore > 0.50) {
          status = 'partial';
          partial++;
        } else {
          gaps++;
        }

        // Store correlation
        const correlationRecord = {
          clause_id: clause.id,
          standard_id: standardId,
          tenant_id: tenantId,
          compliance_status: status,
          confidence_score: bestScore,
          procedure_id: bestMatch?.procedure_id || null,
          evidence_text: bestMatch ? bestMatch.reasoning.substring(0, 200) : null,
          reasoning: bestMatch?.reasoning || null,
          gap_description: allGaps.length > 0 ? allGaps[0].gap : `No clear match found`,
          gap_severity: allGaps.length > 0 ? allGaps[0].severity : 'minor',
          recommendation: allGaps.length > 0 ? allGaps[0].recommendation :
                         `Create procedure to address ${clause.clause_number}`,
          recommendation_effort: bestScore < 0.5 ? 'complex' : 'medium'
        };

        // Save to database
        try {
          await query(
            `INSERT INTO clause_correlation_matrix 
             (clause_id, standard_id, tenant_id, procedure_id, compliance_status,
              confidence_score, reasoning, gap_description, gap_severity, 
              recommendation, recommendation_effort, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
             ON CONFLICT (clause_id, tenant_id) 
             DO UPDATE SET 
               compliance_status = EXCLUDED.compliance_status,
               confidence_score = EXCLUDED.confidence_score,
               reasoning = EXCLUDED.reasoning`,
            [
              correlationRecord.clause_id,
              correlationRecord.standard_id,
              correlationRecord.tenant_id,
              correlationRecord.procedure_id,
              correlationRecord.compliance_status,
              correlationRecord.confidence_score,
              correlationRecord.reasoning,
              correlationRecord.gap_description,
              correlationRecord.gap_severity,
              correlationRecord.recommendation,
              correlationRecord.recommendation_effort
            ]
          );
        } catch (err) {
          console.warn(`[CORRELATION] Could not save correlation for clause ${clause.clause_number}:`, err.message);
        }

        matrix.push({
          ...clause,
          ...correlationRecord
        });
      }

      console.log(`[CORRELATION] Complete: ${covered} covered, ${partial} partial, ${gaps} gaps`);

      return {
        total_requirements: clauses.length,
        covered,
        partial,
        gaps,
        coverage_percentage: Math.round((covered / clauses.length) * 100),
        correlations: matrix
      };

    } catch (error) {
      console.error('[CORRELATION] Error:', error.message);
      throw error;
    }
  }

  /**
   * Get stored correlation matrix for display
   * @param {string} standardId - Standard UUID
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Array>} Array of correlation records
   */
  async getMatrixForDisplay(standardId, tenantId) {
    const result = await query(
      `SELECT 
        pc.clause_number,
        pc.clause_title,
        pc.intent,
        ccm.compliance_status,
        ccm.confidence_score,
        ccm.reasoning,
        ccm.gap_description,
        ccm.gap_severity,
        ccm.recommendation,
        ccm.recommendation_effort
       FROM clause_correlation_matrix ccm
       JOIN parsed_clauses pc ON ccm.clause_id = pc.id
       WHERE ccm.standard_id = $1 AND ccm.tenant_id = $2
       ORDER BY pc.clause_number`,
      [standardId, tenantId]
    );

    return result.rows || [];
  }
}

export default ClauseCorrelationEngine;

