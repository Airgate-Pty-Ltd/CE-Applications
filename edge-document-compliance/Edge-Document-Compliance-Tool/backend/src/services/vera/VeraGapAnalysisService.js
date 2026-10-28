/**
 * Vera Gap Analysis Service
 * 
 * Handles gap analysis queries using actual gap_analyses and requirement_mappings tables
 * Returns unmapped clauses and gap information, not marketing blurbs
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';
import { findStandardByCode } from './VeraClauseLookupService.js';

class VeraGapAnalysisService {
  /**
   * Get unmapped clauses for a standard
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  static async getUnmappedClausesForStandard({ standardId, tenantId = null }) {
    try {
      // Get all parsed requirements for this standard
      const allClausesQuery = `
        SELECT DISTINCT 
          clause_ref,
          clause_number,
          full_ref
        FROM public.parsed_requirements
        WHERE standard_id = $1
          AND is_in_scope = TRUE
        ORDER BY clause_number
      `;
      
      const allClausesResult = await queryPostgres(allClausesQuery, [standardId]);
      const allClauses = allClausesResult.rows || [];
      
      if (allClauses.length === 0) {
        return {
          unmapped: [],
          total: 0,
          message: 'This standard has no parsed requirements yet. Please parse the standard first.'
        };
      }
      
      // Get mapped clauses (those with requirement_mappings)
      const mappedClausesQuery = `
        SELECT DISTINCT 
          clause_ref,
          clause_number
        FROM public.requirement_mappings
        WHERE standard_id = $1
      `;
      
      const mappedClausesResult = await queryPostgres(mappedClausesQuery, [standardId]);
      const mappedClauseRefs = new Set(
        (mappedClausesResult.rows || []).map(r => r.clause_ref || r.clause_number)
      );
      
      // Find unmapped clauses
      const unmapped = allClauses.filter(c => {
        const ref = c.clause_ref || c.clause_number || c.full_ref;
        return !mappedClauseRefs.has(ref);
      });
      
      return {
        unmapped: unmapped.map(c => ({
          clauseRef: c.clause_ref,
          clauseNumber: c.clause_number,
          fullRef: c.full_ref
        })),
        total: allClauses.length,
        mapped: mappedClauseRefs.size,
        unmappedCount: unmapped.length
      };
    } catch (error) {
      console.error('[VeraGapAnalysisService] Error getting unmapped clauses:', error.message);
      return {
        unmapped: [],
        total: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Run basic gap analysis for a standard
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  static async runBasicGapAnalysis({ standardCode, tenantId = null }) {
    try {
      // Resolve standard
      const standardInfo = await findStandardByCode(standardCode);
      if (!standardInfo) {
        return {
          text: `I don't have ${standardCode} in my database. Please upload and parse the standard first.`,
          standard: null
        };
      }
      
      // Get unmapped clauses
      const gapResult = await this.getUnmappedClausesForStandard({
        standardId: standardInfo.id,
        tenantId
      });
      
      if (gapResult.error || gapResult.message) {
        return {
          text: gapResult.message || `Error: ${gapResult.error}`,
          standard: standardInfo.code || standardInfo.name
        };
      }
      
      // Format response
      let text = `**Gap Analysis for ${standardInfo.code || standardInfo.name}**\n\n`;
      text += `Total parsed clauses: ${gapResult.total}\n`;
      text += `Mapped to procedures: ${gapResult.mapped}\n`;
      text += `Unmapped (gaps): ${gapResult.unmappedCount}\n\n`;
      
      if (gapResult.unmappedCount === 0) {
        text += `✅ All clauses appear to be mapped to procedures. This is a high-level view—you may want to review the mappings for completeness.`;
      } else {
        text += `**Unmapped Clauses (Gaps):**\n`;
        const topUnmapped = gapResult.unmapped.slice(0, 20); // Limit to 20 for readability
        for (const clause of topUnmapped) {
          text += `  • ${clause.clauseNumber || clause.clauseRef || clause.fullRef}\n`;
        }
        if (gapResult.unmappedCount > 20) {
          text += `  ... and ${gapResult.unmappedCount - 20} more\n`;
        }
        text += `\nTo address these gaps, you can:\n`;
        text += `1. Upload customer procedures that address these clauses\n`;
        text += `2. Create new procedures for unmapped clauses\n`;
        text += `3. Review existing procedures to ensure they cover these requirements\n\n`;
      }
      
      // Add reference to approved examples if available
      try {
        const approvedExamples = await queryEdcatAI(
          `SELECT COUNT(*) as count 
           FROM edcat.example_documents 
           WHERE standard_code = $1 
             AND category = 'approved_example'
             AND quality_score >= 0.8`,
          [standardInfo.code || standardInfo.name]
        );
        
        const approvedCount = parseInt(approvedExamples.rows[0]?.count || 0);
        if (approvedCount > 0) {
          text += `💡 **Tip:** I have ${approvedCount} approved example document(s) for ${standardInfo.code || standardInfo.name} that you can reference for guidance on addressing these gaps. You can ask me to show you approved examples for specific clauses.`;
        }
        
        // Also check for bad examples (to warn about common pitfalls)
        const badExamples = await queryEdcatAI(
          `SELECT COUNT(*) as count 
           FROM edcat.example_documents 
           WHERE standard_code = $1 
             AND category = 'bad_example'`,
          [standardInfo.code || standardInfo.name]
        );
        
        const badCount = parseInt(badExamples.rows[0]?.count || 0);
        if (badCount > 0) {
          text += `\n\n⚠️ **Note:** I also have ${badCount} example document(s) that failed audit for ${standardInfo.code || standardInfo.name}. These can help you understand common pitfalls to avoid.`;
        }
      } catch (e) {
        // Ignore errors in example lookup
      }
      
      return {
        text,
        standard: standardInfo.code || standardInfo.name,
        standardId: standardInfo.id,
        unmappedCount: gapResult.unmappedCount,
        totalClauses: gapResult.total
      };
    } catch (error) {
      console.error('[VeraGapAnalysisService] Error running gap analysis:', error.message);
      return {
        text: `I encountered an error while running the gap analysis: ${error.message}. Please try again or check that the standard is properly parsed.`,
        standard: standardCode
      };
    }
  }
}

export default VeraGapAnalysisService;

