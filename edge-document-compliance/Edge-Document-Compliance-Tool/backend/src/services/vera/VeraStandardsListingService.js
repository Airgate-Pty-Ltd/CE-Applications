/**
 * Vera Standards Listing Service
 * 
 * Handles queries to list standards from the database
 * Returns actual data from public.standards, not architecture templates
 */

import { queryPostgres } from '../../config/databases.js';

class VeraStandardsListingService {
  /**
   * List all standards in the database
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  static async listKnownStandards({ tenantId = null, includeParsedCount = true }) {
    try {
      // Query public.standards for all active standards
      const standardsQuery = `
        SELECT 
          id,
          code,
          name,
          short_name,
          file_category,
          sector,
          uploaded_at,
          total_requirements,
          is_active
        FROM public.standards
        WHERE is_active = TRUE OR is_active IS NULL
        ORDER BY code, name
      `;
      
      const standardsResult = await queryPostgres(standardsQuery, []);
      const standards = standardsResult.rows || [];
      
      // If requested, get parsed requirements count for each standard
      let standardsWithCounts = standards;
      if (includeParsedCount && standards.length > 0) {
        const standardIds = standards.map(s => s.id);
        const reqCountsQuery = `
          SELECT 
            standard_id,
            COUNT(*) as parsed_count
          FROM public.parsed_requirements
          WHERE standard_id = ANY($1)
          GROUP BY standard_id
        `;
        
        const reqCountsResult = await queryPostgres(reqCountsQuery, [standardIds]);
        const countsByStandardId = {};
        reqCountsResult.rows.forEach(row => {
          countsByStandardId[row.standard_id] = parseInt(row.parsed_count || 0);
        });
        
        standardsWithCounts = standards.map(s => ({
          ...s,
          parsed_requirements_count: countsByStandardId[s.id] || 0
        }));
      }
      
      return {
        standards: standardsWithCounts,
        total: standards.length
      };
    } catch (error) {
      console.error('[VeraStandardsListingService] Error listing standards:', error.message);
      return {
        standards: [],
        total: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Format standards list as readable text
   * @param {Object} result - Result from listKnownStandards
   * @returns {string}
   */
  static formatStandardsList(result) {
    if (!result.standards || result.standards.length === 0) {
      return "I don't currently have any standards loaded in my database. You can upload and parse standards to make them available for clause lookups and gap analysis.";
    }
    
    let text = `I can see ${result.total} standard(s) in my database:\n\n`;
    
    for (const std of result.standards) {
      text += `**${std.code || std.short_name || 'Unknown'}** - ${std.name || 'No name'}\n`;
      text += `  • ID: ${std.id}\n`;
      if (std.parsed_requirements_count !== undefined) {
        text += `  • Parsed requirements: ${std.parsed_requirements_count}\n`;
      }
      if (std.sector) {
        text += `  • Sector: ${std.sector}\n`;
      }
      text += '\n';
    }
    
    text += `\nTo query a specific clause, use: "Tell me what clause X.X in [STANDARD] covers" or "What does clause X.X require in [STANDARD]?"`;
    
    return text;
  }
}

export default VeraStandardsListingService;

