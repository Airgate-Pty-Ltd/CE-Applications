/**
 * Vera Terminology Access Service
 * 
 * Enables Vera to query her 3000+ term library from edcat.terms_and_definitions
 * Provides fast access to terminology for intent detection and response generation
 */

import { queryEdcatAI } from '../../config/databases.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

class VeraTerminologyAccess {
  /**
   * Get term definition by exact term match
   * @param {string} term - Term to look up
   * @param {Object} options - Options for context-aware selection
   * @returns {Promise<Object|null>} Term definition or null
   */
  async getTermDefinition(term, options = {}) {
    try {
      const { industry, standardCode, tenantId = DEFAULT_TENANT_ID } = options;
      
      let query = `
        SELECT 
          term, 
          acronym, 
          definition, 
          short_definition,
          category, 
          subcategory,
          source_standard, 
          source_document,
          is_acronym,
          is_standard_term,
          related_terms,
          synonyms,
          industry
        FROM edcat.terms_and_definitions 
        WHERE LOWER(term) = LOWER($1)
          AND (tenant_id = $2 OR tenant_id IS NULL)
      `;
      
      const params = [term, tenantId];
      
      // Context-aware filtering
      if (industry) {
        query += ` AND ($3 = ANY(industry) OR array_length(industry, 1) IS NULL)`;
        params.push(industry);
      }
      
      if (standardCode) {
        query += ` AND (source_standard = $${params.length + 1} OR source_standard IS NULL)`;
        params.push(standardCode);
      }
      
      query += ` ORDER BY 
        CASE WHEN tenant_id = $2 THEN 0 ELSE 1 END,
        CASE WHEN source_standard = $${params.length} THEN 0 ELSE 1 END
        LIMIT 1`;
      
      const result = await queryEdcatAI(query, params);
      
      if (result && result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
      return null;
    } catch (err) {
      console.error('[VeraTerminologyAccess] Error looking up term:', err.message);
      return null;
    }
  }
  
  /**
   * Search terms by text (definition or term name)
   * @param {string} searchText - Text to search for
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching terms
   */
  async searchTerms(searchText, options = {}) {
    try {
      const { limit = 20, tenantId = DEFAULT_TENANT_ID } = options;
      
      const result = await queryEdcatAI(
        `SELECT 
          term, 
          acronym,
          definition, 
          short_definition,
          category, 
          source_standard,
          ts_rank(
            to_tsvector('english', COALESCE(definition, '') || ' ' || COALESCE(term, '')),
            plainto_tsquery('english', $1)
          ) as relevance
        FROM edcat.terms_and_definitions 
        WHERE (
          to_tsvector('english', COALESCE(definition, '') || ' ' || COALESCE(term, '')) 
          @@ plainto_tsquery('english', $1)
          OR LOWER(term) LIKE LOWER($2)
          OR LOWER(acronym) LIKE LOWER($2)
        )
        AND (tenant_id = $3 OR tenant_id IS NULL)
        ORDER BY 
          CASE WHEN tenant_id = $3 THEN 0 ELSE 1 END,
          relevance DESC,
          term ASC
        LIMIT $4`,
        [searchText, `%${searchText}%`, tenantId, limit]
      );
      
      return result.rows || [];
    } catch (err) {
      console.error('[VeraTerminologyAccess] Error searching terms:', err.message);
      return [];
    }
  }
  
  /**
   * Get terms count by standard
   * @param {string} standardCode - Standard code (e.g., 'AS9100', 'ISO9001')
   * @returns {Promise<number>} Count of terms
   */
  async getTermsByStandard(standardCode) {
    try {
      const result = await queryEdcatAI(
        `SELECT COUNT(*) as total 
         FROM edcat.terms_and_definitions 
         WHERE source_standard = $1
           AND (tenant_id = $2 OR tenant_id IS NULL)`,
        [standardCode, DEFAULT_TENANT_ID]
      );
      
      return parseInt(result.rows[0]?.total || '0', 10);
    } catch (err) {
      console.error('[VeraTerminologyAccess] Error counting terms by standard:', err.message);
      return 0;
    }
  }
  
  /**
   * Get total count of all terms
   * @returns {Promise<number>} Total count
   */
  async getAllTermsCount() {
    try {
      const result = await queryEdcatAI(
        `SELECT COUNT(*) as total 
         FROM edcat.terms_and_definitions 
         WHERE tenant_id = $1 OR tenant_id IS NULL`,
        [DEFAULT_TENANT_ID]
      );
      
      return parseInt(result.rows[0]?.total || '0', 10);
    } catch (err) {
      console.error('[VeraTerminologyAccess] Error counting all terms:', err.message);
      return 0;
    }
  }
  
  /**
   * Get terms by category
   * @param {string} category - Category name
   * @returns {Promise<Array>} Array of terms
   */
  async getTermsByCategory(category) {
    try {
      const result = await queryEdcatAI(
        `SELECT term, definition, short_definition, source_standard
         FROM edcat.terms_and_definitions 
         WHERE LOWER(category) = LOWER($1)
           AND (tenant_id = $2 OR tenant_id IS NULL)
         ORDER BY term ASC
         LIMIT 100`,
        [category, DEFAULT_TENANT_ID]
      );
      
      return result.rows || [];
    } catch (err) {
      console.error('[VeraTerminologyAccess] Error getting terms by category:', err.message);
      return [];
    }
  }
}

export default new VeraTerminologyAccess();

