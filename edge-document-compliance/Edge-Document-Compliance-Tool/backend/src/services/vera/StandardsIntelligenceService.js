/**
 * Standards Intelligence Service
 * Provides intelligent access to standards and requirements using embeddings and blueprints
 */

import VeraRepository from './VeraRepository.js';
import { queryPostgres } from '../../config/databases.js';

const StandardsIntelligenceService = {
  /**
   * Get requirement by clause reference
   * Supports various clause formats: "8.7", "8.7.1", "8.7.1.2", etc.
   */
  async getRequirementByClause(standardId, clauseRef) {
    try {
      // Try exact match first
      let requirement = await VeraRepository.Standards.getRequirementByClause(standardId, clauseRef);
      
      if (requirement) {
        return requirement;
      }

      // Try partial matches (e.g., "8.7" should match "8.7.1", "8.7.2")
      const clauseParts = clauseRef.split('.');
      if (clauseParts.length > 1) {
        // Try matching parent clause
        const parentClause = clauseParts.slice(0, -1).join('.');
        requirement = await VeraRepository.Standards.getRequirementByClause(standardId, parentClause);
        if (requirement) {
          return requirement;
        }
      }

      // Try with leading zeros removed
      const normalizedClause = clauseRef.replace(/^0+/, '');
      if (normalizedClause !== clauseRef) {
        requirement = await VeraRepository.Standards.getRequirementByClause(standardId, normalizedClause);
        if (requirement) {
          return requirement;
        }
      }

      return null;
    } catch (error) {
      console.error('[StandardsIntelligenceService] Error getting requirement by clause:', error);
      return null;
    }
  },

  /**
   * Find similar requirements using embeddings
   */
  async findSimilarRequirements(requirementId, limit = 5) {
    try {
      // Get similar requirements from embeddings
      const similar = await VeraRepository.Standards.findSimilarRequirements(requirementId, limit);
      
      if (similar.length > 0) {
        return similar;
      }

      // Fallback: Find requirements with similar text patterns
      const requirement = await VeraRepository.Standards.getRequirementEmbeddings(requirementId);
      if (!requirement) {
        return [];
      }

      // Could add semantic search here if embeddings are available
      return [];
    } catch (error) {
      console.error('[StandardsIntelligenceService] Error finding similar requirements:', error);
      return [];
    }
  },

  /**
   * Get crosswalk mapping between standards
   */
  async getCrosswalkMapping(sourceStandard, targetStandard, clauseNumber, tenantId = '00000000-0000-0000-0000-000000000000') {
    try {
      // Get source standard
      const sourceStandardData = await VeraRepository.Standards.getStandardByCode(sourceStandard);
      if (!sourceStandardData) {
        return null;
      }

      // Get target standard
      const targetStandardData = await VeraRepository.Standards.getStandardByCode(targetStandard);
      if (!targetStandardData) {
        return null;
      }

      // Get crosswalk mapping
      const mappings = await VeraRepository.Standards.getCrosswalkMapping(
        sourceStandard,
        targetStandard,
        clauseNumber,
        tenantId
      );

      if (mappings.length > 0) {
        return {
          sourceStandard: sourceStandardData,
          targetStandard: targetStandardData,
          sourceClause: clauseNumber,
          mappings: mappings
        };
      }

      // Fallback: Try to find equivalent clauses by name/pattern
      const sourceRequirement = await this.getRequirementByClause(sourceStandardData.id, clauseNumber);
      if (!sourceRequirement) {
        return null;
      }

      // Could add intelligent matching here
      return {
        sourceStandard: sourceStandardData,
        targetStandard: targetStandardData,
        sourceClause: clauseNumber,
        mappings: [],
        note: 'No explicit crosswalk mapping found. Manual review recommended.'
      };
    } catch (error) {
      console.error('[StandardsIntelligenceService] Error getting crosswalk mapping:', error);
      return null;
    }
  },

  /**
   * Get all requirements for a clause in table format (matching user's format)
   * Returns requirements with: Clause, Clause Name, Paragraph number, Requirement
   * Only includes "shall" requirements (strict filtering)
   */
  async getRequirementsForClauseTable(standardId, clauseNumber) {
    try {
      // Get all requirements for this clause and its subclauses
      // Use clause_ref, clause_number, or full_ref to match the clause
      const result = await queryPostgres(
        `SELECT * FROM public.parsed_requirements 
         WHERE standard_id = $1 
         AND (
           clause_ref = $2 
           OR clause_number = $2 
           OR full_ref = $2
           OR clause_ref LIKE $3
           OR clause_number LIKE $3
           OR full_ref LIKE $3
         )
         ORDER BY clause_ref, clause_number, full_ref, paragraph`,
        [standardId, clauseNumber, `${clauseNumber}.%`]
      );
      const requirements = result.rows;

      // Filter to only "shall" requirements (strict filtering per user requirement)
      const shallRequirements = requirements.filter(req => {
        const text = (req.requirement_text || req.requirement || '').toLowerCase();
        return /\bshall\b/.test(text);
      });

      // Format as table matching user's format
      const tableRows = shallRequirements.map(req => ({
        clause: req.clause_ref || req.clause_number || req.full_ref || clauseNumber,
        clause_name: req.clause_title || 'N/A',
        paragraph: req.paragraph || req.sub_ref || 'P1',
        requirement: req.requirement_text || req.requirement || 'N/A'
      }));

      return tableRows;
    } catch (error) {
      console.error('[StandardsIntelligenceService] Error getting requirements table:', error);
      return [];
    }
  },

  /**
   * Get all requirements for a standard with optional filtering
   */
  async getRequirementsForStandard(standardId, filters = {}) {
    try {
      let requirements = await VeraRepository.Standards.getRequirementsForStandard(
        standardId,
        filters.clauseNumber
      );

      // Apply additional filters
      if (filters.requirementType) {
        requirements = requirements.filter(r => r.requirement_type === filters.requirementType);
      }

      if (filters.isInScope !== undefined) {
        requirements = requirements.filter(r => r.is_in_scope === filters.isInScope);
      }

      if (filters.isRecommendation !== undefined) {
        requirements = requirements.filter(r => r.is_recommendation === filters.isRecommendation);
      }

      return requirements;
    } catch (error) {
      console.error('[StandardsIntelligenceService] Error getting requirements:', error);
      return [];
    }
  },

  /**
   * Search requirements by text (simple text search)
   */
  async searchRequirements(standardId, searchText) {
    try {
      const allRequirements = await VeraRepository.Standards.getRequirementsForStandard(standardId);
      
      const lowerSearch = searchText.toLowerCase();
      const matches = allRequirements.filter(req => {
        const text = (req.requirement_text || '').toLowerCase();
        const clause = (req.clause_ref || req.full_ref || '').toLowerCase();
        return text.includes(lowerSearch) || clause.includes(lowerSearch);
      });

      return matches;
    } catch (error) {
      console.error('[StandardsIntelligenceService] Error searching requirements:', error);
      return [];
    }
  },

  /**
   * Get clause blueprint for a standard
   */
  async getClauseBlueprint(standardCode, clauseNumber, tenantId = '00000000-0000-0000-0000-000000000000') {
    try {
      return await VeraRepository.Standards.getClauseBlueprint(standardCode, clauseNumber, tenantId);
    } catch (error) {
      console.error('[StandardsIntelligenceService] Error getting clause blueprint:', error);
      return null;
    }
  }
};

export default StandardsIntelligenceService;

