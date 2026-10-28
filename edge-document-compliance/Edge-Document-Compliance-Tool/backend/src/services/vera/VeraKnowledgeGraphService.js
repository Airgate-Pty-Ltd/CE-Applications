/**
 * Vera Knowledge Graph Service
 * 
 * Understands relationships between:
 * - Standards (ISO 9001 ← AS9100D extends it)
 * - Clauses (same clause across different standards)
 * - Requirements (overlapping vs. unique requirements)
 */

import { queryEdcatAI, queryPostgres } from '../../config/databases.js';

class VeraKnowledgeGraphService {
  /**
   * Compare two standards
   */
  static async compareStandards(standard1, standard2) {
    try {
      console.log(`[KnowledgeGraph] Comparing ${standard1} vs ${standard2}`);

      // Get requirements for each standard
      const reqs1 = await this.getStandardRequirements(standard1);
      const reqs2 = await this.getStandardRequirements(standard2);

      if (reqs1.length === 0 || reqs2.length === 0) {
        return {
          error: 'Could not find requirements for one or both standards',
          standard1Count: reqs1.length,
          standard2Count: reqs2.length
        };
      }

      // Find overlaps
      const overlaps = this.findOverlappingRequirements(reqs1, reqs2);
      const unique1 = reqs1.filter(r => !overlaps.some(o => o.req1Id === r.id));
      const unique2 = reqs2.filter(r => !overlaps.some(o => o.req2Id === r.id));

      // Determine relationship
      const relationship = this.determineRelationship(standard1, standard2, overlaps.length, unique1.length, unique2.length);

      return {
        standard1: standard1,
        standard2: standard2,
        relationship: relationship,
        totalRequirements1: reqs1.length,
        totalRequirements2: reqs2.length,
        overlappingRequirements: overlaps.length,
        uniqueTo1: unique1.length,
        uniqueTo2: unique2.length,
        overlapPercentage: Math.round((overlaps.length / Math.min(reqs1.length, reqs2.length)) * 100),
        summary: this.generateComparisonSummary(standard1, standard2, relationship, overlaps.length)
      };

    } catch (error) {
      console.error('[KnowledgeGraph] Error comparing standards:', error);
      return { error: error.message };
    }
  }

  /**
   * Get all requirements for a standard
   */
  static async getStandardRequirements(standardCode) {
    try {
      // First find the standard ID
      const standardResult = await queryPostgres(
        `SELECT standard_id, code, name
         FROM public.standards 
         WHERE code ILIKE $1 OR name ILIKE $1
         LIMIT 1`,
        [`%${standardCode}%`]
      );

      if (standardResult.rows.length === 0) {
        console.log(`[KnowledgeGraph] Standard not found: ${standardCode}`);
        return [];
      }

      const standardId = standardResult.rows[0].standard_id;

      // Get requirements
      const result = await queryPostgres(
        `SELECT id, clause_number, requirement_text, clause_ref
         FROM public.parsed_requirements
         WHERE standard_id = $1
         LIMIT 500`,
        [standardId]
      );

      return result.rows || [];

    } catch (error) {
      console.error('[KnowledgeGraph] Error fetching requirements:', error);
      return [];
    }
  }

  /**
   * Find overlapping requirements using semantic similarity
   */
  static findOverlappingRequirements(reqs1, reqs2) {
    const overlaps = [];

    for (const r1 of reqs1) {
      for (const r2 of reqs2) {
        const similarity = this.calculateSimilarity(
          r1.requirement_text || '',
          r2.requirement_text || ''
        );
        
        if (similarity > 0.7) {  // 70% similarity threshold
          overlaps.push({
            req1Id: r1.id,
            req1Clause: r1.clause_number || r1.clause_ref,
            req2Id: r2.id,
            req2Clause: r2.clause_number || r2.clause_ref,
            similarity: similarity
          });
          break;  // Don't match same requirement multiple times
        }
      }
    }

    return overlaps;
  }

  /**
   * Calculate text similarity (simple implementation)
   */
  static calculateSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = [...words1].filter(w => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;

    return union > 0 ? intersection / union : 0;
  }

  /**
   * Determine relationship between standards
   */
  static determineRelationship(s1, s2, overlaps, unique1, unique2) {
    const s1Lower = s1.toLowerCase();
    const s2Lower = s2.toLowerCase();
    
    // AS9100D extends ISO 9001
    if ((s2Lower.includes('as9100') || s2Lower.includes('9100')) && s1Lower.includes('9001')) {
      return 'AS9100D extends ISO 9001';
    }
    if ((s1Lower.includes('as9100') || s1Lower.includes('9100')) && s2Lower.includes('9001')) {
      return 'AS9100D extends ISO 9001';
    }

    // ISO 13485 (medical) is similar to ISO 9001 but specialized
    if ((s1Lower.includes('13485') && s2Lower.includes('9001')) || (s1Lower.includes('9001') && s2Lower.includes('13485'))) {
      return 'ISO 13485 is a specialized derivative of ISO 9001 for medical devices';
    }

    // Generic overlap/difference relationship
    const totalReqs = overlaps + unique1 + unique2;
    if (totalReqs === 0) {
      return 'No relationship data available';
    }
    
    const overlapRatio = overlaps / totalReqs;
    if (overlapRatio > 0.8) {
      return 'These standards are highly related with significant overlap';
    } else if (overlapRatio > 0.4) {
      return 'These standards have moderate overlap with distinct differences';
    } else {
      return 'These standards cover different aspects with minimal overlap';
    }
  }

  /**
   * Generate human-readable comparison summary
   */
  static generateComparisonSummary(s1, s2, relationship, overlaps) {
    return `${s1} and ${s2}: ${relationship}. They share ${overlaps} common requirements.`;
  }

  /**
   * Find clause mapping across standards
   * "Does AS9100D have a clause equivalent to ISO 9001 8.5?"
   */
  static async findClauseMapping(fromStandard, fromClause, toStandard) {
    try {
      // Get the requirement from source standard
      const sourceReqs = await this.getStandardRequirements(fromStandard);
      const sourceReq = sourceReqs.find(r => 
        (r.clause_number && r.clause_number.includes(fromClause)) ||
        (r.clause_ref && r.clause_ref.includes(fromClause))
      );

      if (!sourceReq) {
        return { error: `Clause ${fromClause} not found in ${fromStandard}` };
      }

      const sourceText = sourceReq.requirement_text || '';

      // Find similar requirement in target standard
      const targetReqs = await this.getStandardRequirements(toStandard);

      let bestMatch = null;
      let bestSimilarity = 0;

      for (const req of targetReqs) {
        const similarity = this.calculateSimilarity(sourceText, req.requirement_text || '');
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = req;
        }
      }

      if (bestMatch && bestSimilarity > 0.5) {
        return {
          sourceStandard: fromStandard,
          sourceClause: fromClause,
          targetStandard: toStandard,
          targetClause: bestMatch.clause_number || bestMatch.clause_ref || 'unknown',
          similarity: Math.round(bestSimilarity * 100),
          message: `${fromClause} in ${fromStandard} maps to ${bestMatch.clause_number || bestMatch.clause_ref} in ${toStandard} (${Math.round(bestSimilarity * 100)}% similar)`
        };
      } else {
        return { message: `No similar requirement found in ${toStandard} (best similarity: ${Math.round(bestSimilarity * 100)}%)` };
      }

    } catch (error) {
      console.error('[KnowledgeGraph] Error mapping clauses:', error);
      return { error: error.message };
    }
  }
}

export default VeraKnowledgeGraphService;

