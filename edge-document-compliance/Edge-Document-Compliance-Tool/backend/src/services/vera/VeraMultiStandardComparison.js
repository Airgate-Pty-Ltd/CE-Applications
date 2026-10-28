/**
 * Vera Multi-Standard Comparison Service
 * Enhanced capability for simultaneous comparison of multiple standards
 * Implements Vera's improvement: "Better multi-standard comparison (simultaneous)"
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';

class VeraMultiStandardComparison {
  /**
   * Compare multiple standards simultaneously
   * @param {Array<string>} standardCodes - Array of standard codes to compare
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Comparison options
   * @returns {Promise<Object>} Comparison results
   */
  async compareStandards(standardCodes, tenantId, options = {}) {
    const {
      includeUniqueRequirements = true,
      includeCommonRequirements = true,
      includeDifferences = true,
      clauseLevel = false
    } = options;

    try {
      // Get all standards
      const standards = await this.getStandards(standardCodes, tenantId);
      if (standards.length < 2) {
        return {
          success: false,
          error: 'Need at least 2 standards to compare'
        };
      }

      // Get requirements for each standard
      const requirementsByStandard = {};
      for (const standard of standards) {
        const requirements = await this.getRequirementsForStandard(standard.id, tenantId);
        requirementsByStandard[standard.code] = {
          standard,
          requirements
        };
      }

      // Perform simultaneous comparison
      const comparison = {
        standards: standards.map(s => ({ code: s.code, name: s.name, id: s.id })),
        comparison_date: new Date().toISOString(),
        results: {}
      };

      if (includeCommonRequirements) {
        comparison.results.common_requirements = this.findCommonRequirements(requirementsByStandard);
      }

      if (includeUniqueRequirements) {
        comparison.results.unique_requirements = this.findUniqueRequirements(requirementsByStandard);
      }

      if (includeDifferences) {
        comparison.results.differences = this.findDifferences(requirementsByStandard);
      }

      if (clauseLevel) {
        comparison.results.clause_mapping = this.createClauseMapping(requirementsByStandard);
      }

      // Calculate coverage metrics
      comparison.metrics = this.calculateMetrics(requirementsByStandard, comparison.results);

      return {
        success: true,
        comparison
      };
    } catch (error) {
      console.error('[VeraMultiStandardComparison] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get standards by codes
   */
  async getStandards(standardCodes, tenantId) {
    const codes = standardCodes.map(code => code.toUpperCase().replace(/\s+/g, '-'));
    const placeholders = codes.map((_, i) => `$${i + 1}`).join(', ');
    
    const result = await queryPostgres(
      `SELECT id, code, name, revision, total_requirements as requirements_count
       FROM standards
       WHERE code = ANY(ARRAY[${placeholders}])
       AND is_active = TRUE
       ORDER BY code`,
      codes
    );

    return result.rows;
  }

  /**
   * Get requirements for a standard
   */
  async getRequirementsForStandard(standardId, tenantId) {
    const result = await queryPostgres(
      `SELECT id, clause_ref, clause_number, requirement_text, requirement_type,
              keywords, requirement_subtype
       FROM parsed_requirements
       WHERE standard_id = $1
       ORDER BY clause_number`,
      [standardId]
    );

    return result.rows;
  }

  /**
   * Find common requirements across standards
   */
  findCommonRequirements(requirementsByStandard) {
    const standardCodes = Object.keys(requirementsByStandard);
    if (standardCodes.length < 2) return [];

    // Group requirements by clause number
    const clauseGroups = {};
    for (const [code, data] of Object.entries(requirementsByStandard)) {
      for (const req of data.requirements) {
        const clauseKey = req.clause_number || req.clause_ref || 'unknown';
        if (!clauseGroups[clauseKey]) {
          clauseGroups[clauseKey] = {};
        }
        if (!clauseGroups[clauseKey][code]) {
          clauseGroups[clauseKey][code] = [];
        }
        clauseGroups[clauseKey][code].push(req);
      }
    }

    // Find clauses that exist in all standards
    const common = [];
    for (const [clauseKey, standards] of Object.entries(clauseGroups)) {
      if (Object.keys(standards).length === standardCodes.length) {
        common.push({
          clause: clauseKey,
          requirements: standards
        });
      }
    }

    return common;
  }

  /**
   * Find unique requirements (only in one standard)
   */
  findUniqueRequirements(requirementsByStandard) {
    const unique = {};
    const standardCodes = Object.keys(requirementsByStandard);

    for (const [code, data] of Object.entries(requirementsByStandard)) {
      unique[code] = [];
      
      for (const req of data.requirements) {
        const clauseKey = req.clause_number || req.clause_ref || 'unknown';
        
        // Check if this clause exists in other standards
        let isUnique = true;
        for (const otherCode of standardCodes) {
          if (otherCode === code) continue;
          
          const otherReqs = requirementsByStandard[otherCode].requirements;
          const hasClause = otherReqs.some(r => 
            (r.clause_number || r.clause_ref) === clauseKey
          );
          
          if (hasClause) {
            isUnique = false;
            break;
          }
        }
        
        if (isUnique) {
          unique[code].push(req);
        }
      }
    }

    return unique;
  }

  /**
   * Find differences between standards
   */
  findDifferences(requirementsByStandard) {
    const differences = [];
    const standardCodes = Object.keys(requirementsByStandard);

    // Compare each pair of standards
    for (let i = 0; i < standardCodes.length; i++) {
      for (let j = i + 1; j < standardCodes.length; j++) {
        const code1 = standardCodes[i];
        const code2 = standardCodes[j];
        
        const diff = this.compareTwoStandards(
          requirementsByStandard[code1],
          requirementsByStandard[code2],
          code1,
          code2
        );
        
        differences.push({
          standards: [code1, code2],
          differences: diff
        });
      }
    }

    return differences;
  }

  /**
   * Compare two standards
   */
  compareTwoStandards(standard1, standard2, code1, code2) {
    const differences = {
      only_in_first: [],
      only_in_second: [],
      different_requirements: []
    };

    // Create clause maps
    const map1 = new Map();
    const map2 = new Map();

    standard1.requirements.forEach(req => {
      const key = req.clause_number || req.clause_ref;
      if (key) map1.set(key, req);
    });

    standard2.requirements.forEach(req => {
      const key = req.clause_number || req.clause_ref;
      if (key) map2.set(key, req);
    });

    // Find requirements only in first
    for (const [key, req] of map1.entries()) {
      if (!map2.has(key)) {
        differences.only_in_first.push(req);
      } else {
        // Check if requirements differ
        const req2 = map2.get(key);
        if (this.requirementsDiffer(req, req2)) {
          differences.different_requirements.push({
            clause: key,
            [code1]: req,
            [code2]: req2
          });
        }
      }
    }

    // Find requirements only in second
    for (const [key, req] of map2.entries()) {
      if (!map1.has(key)) {
        differences.only_in_second.push(req);
      }
    }

    return differences;
  }

  /**
   * Check if two requirements differ significantly
   */
  requirementsDiffer(req1, req2) {
    const text1 = (req1.requirement_text || '').toLowerCase().trim();
    const text2 = (req2.requirement_text || '').toLowerCase().trim();
    
    // Simple similarity check (can be enhanced with semantic similarity)
    if (text1 === text2) return false;
    
    // Check if they're substantially different (more than 30% difference)
    const similarity = this.calculateTextSimilarity(text1, text2);
    return similarity < 0.7;
  }

  /**
   * Calculate text similarity (simple Jaccard similarity)
   */
  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Create clause mapping across standards
   */
  createClauseMapping(requirementsByStandard) {
    const mapping = {};
    const standardCodes = Object.keys(requirementsByStandard);

    // Group by clause number
    for (const [code, data] of Object.entries(requirementsByStandard)) {
      for (const req of data.requirements) {
        const clauseKey = req.clause_number || req.clause_ref;
        if (!mapping[clauseKey]) {
          mapping[clauseKey] = {};
        }
        mapping[clauseKey][code] = req;
      }
    }

    return mapping;
  }

  /**
   * Calculate comparison metrics
   */
  calculateMetrics(requirementsByStandard, results) {
    const standardCodes = Object.keys(requirementsByStandard);
    const totalRequirements = standardCodes.reduce((sum, code) => 
      sum + requirementsByStandard[code].requirements.length, 0
    );

    const commonCount = results.common_requirements?.length || 0;
    const uniqueCounts = {};
    let totalUnique = 0;

    if (results.unique_requirements) {
      for (const [code, reqs] of Object.entries(results.unique_requirements)) {
        uniqueCounts[code] = reqs.length;
        totalUnique += reqs.length;
      }
    }

    return {
      total_standards: standardCodes.length,
      total_requirements_analyzed: totalRequirements,
      common_requirements_count: commonCount,
      unique_requirements_count: totalUnique,
      unique_by_standard: uniqueCounts,
      common_percentage: totalRequirements > 0 
        ? ((commonCount / totalRequirements) * 100).toFixed(2) 
        : 0
    };
  }

  /**
   * Generate comparison report text
   */
  generateReport(comparison) {
    if (!comparison.success) {
      return `Comparison failed: ${comparison.error}`;
    }

    const { standards, results, metrics } = comparison.comparison;
    let report = `**Multi-Standard Comparison Report**\n\n`;
    report += `**Standards Compared:** ${standards.map(s => s.code).join(', ')}\n\n`;

    if (metrics) {
      report += `**Summary:**\n`;
      report += `• Total requirements analyzed: ${metrics.total_requirements_analyzed}\n`;
      report += `• Common requirements: ${metrics.common_requirements_count} (${metrics.common_percentage}%)\n`;
      report += `• Unique requirements: ${metrics.unique_requirements_count}\n\n`;
    }

    if (results.common_requirements && results.common_requirements.length > 0) {
      report += `**Common Requirements:**\n`;
      results.common_requirements.slice(0, 5).forEach(item => {
        report += `• Clause ${item.clause}: Found in all standards\n`;
      });
      if (results.common_requirements.length > 5) {
        report += `... and ${results.common_requirements.length - 5} more\n`;
      }
      report += `\n`;
    }

    if (results.unique_requirements) {
      report += `**Unique Requirements:**\n`;
      for (const [code, reqs] of Object.entries(results.unique_requirements)) {
        if (reqs.length > 0) {
          report += `• ${code}: ${reqs.length} unique requirement(s)\n`;
        }
      }
      report += `\n`;
    }

    if (results.differences && results.differences.length > 0) {
      report += `**Key Differences:**\n`;
      results.differences.forEach(diff => {
        report += `• ${diff.standards.join(' vs ')}: `;
        report += `${diff.differences.only_in_first.length} unique to first, `;
        report += `${diff.differences.only_in_second.length} unique to second\n`;
      });
    }

    return report;
  }
}

export default new VeraMultiStandardComparison();

