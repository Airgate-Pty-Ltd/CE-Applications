/**
 * Vera Cross-Standard Reasoning Service
 * 
 * Compares and reasons across multiple standards/regulations.
 * Answers questions like:
 * - "What's the difference between AS9100D 8.7 and ISO 9001 8.7?"
 * - "How do I satisfy both ISO 13485 and AS9100D for design control?"
 * - "How do FAA 21.137 and AS9100D align?"
 * 
 * 100% internal - no external LLM calls.
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';
import { VeraKnowledgeGraph } from './VeraKnowledgeGraph.js';
import {
  getLearningDocsByStandardCode,
  semanticSearchLearningDocs,
  findClauseInLearningDocs
} from './VeraLearningRepository.js';
import { VeraClauseMatcher } from './VeraClauseMatcher.js';
import { VeraRegulatoryRepository } from './VeraRegulatoryRepository.js';

export interface StandardComparison {
  standardA: string;
  clauseA?: string;
  standardB: string;
  clauseB?: string;
  similarities: string[];
  differences: string[];
  stricterPoints: {
    standard: string;
    items: string[];
  };
  alignmentScore: number; // 0-1, how well they align
  recommendations: string[];
}

export class VeraCrossStandardReasoning {
  /**
   * Compare two standards/clauses
   */
  static async compareStandards(params: {
    standardA: string;
    clauseA?: string;
    standardB: string;
    clauseB?: string;
    tenantId?: string;
  }): Promise<StandardComparison> {
    const { standardA, clauseA, standardB, clauseB, tenantId } = params;

    try {
      // Get requirements for each standard/clause
      const [requirementsA, requirementsB] = await Promise.all([
        this.getRequirements(standardA, clauseA),
        this.getRequirements(standardB, clauseB)
      ]);

      // Get learning docs for each
      const [docsA, docsB] = await Promise.all([
        clauseA 
          ? findClauseInLearningDocs(clauseA, standardA, 5)
          : getLearningDocsByStandardCode(standardA, 5),
        clauseB
          ? findClauseInLearningDocs(clauseB, standardB, 5)
          : getLearningDocsByStandardCode(standardB, 5)
      ]);

      // Get knowledge graph relationships
      const relationships = await this.getRelationships(standardA, clauseA, standardB, clauseB);

      // Build comparison
      const similarities = this.findSimilarities(requirementsA, requirementsB, docsA, docsB);
      const differences = this.findDifferences(requirementsA, requirementsB, docsA, docsB);
      const stricterPoints = this.identifyStricterPoints(requirementsA, requirementsB, standardA, standardB);
      const alignmentScore = this.calculateAlignmentScore(similarities, differences, relationships);
      const recommendations = this.generateRecommendations(similarities, differences, stricterPoints, standardA, standardB);

      return {
        standardA,
        clauseA,
        standardB,
        clauseB,
        similarities,
        differences,
        stricterPoints,
        alignmentScore,
        recommendations
      };
    } catch (error: any) {
      console.error('[VeraCrossStandardReasoning] Error comparing standards:', error.message);
      return {
        standardA,
        clauseA,
        standardB,
        clauseB,
        similarities: [],
        differences: [],
        stricterPoints: { standard: standardA, items: [] },
        alignmentScore: 0.5,
        recommendations: ['Unable to complete comparison. Please ensure both standards are ingested.']
      };
    }
  }

  /**
   * Get requirements for a standard/clause
   * ITERATION 8: Enhanced with regulatory repository support
   */
  private static async getRequirements(
    standardCode: string,
    clauseRef?: string
  ): Promise<Array<{ text: string; clauseRef: string }>> {
    try {
      // Check if this is a regulatory standard (FAA, CASA, EASA, UK CAA)
      const isRegulatory = standardCode.startsWith('FAA_') || 
                          standardCode.startsWith('CASA_') || 
                          standardCode.startsWith('EASA_') || 
                          standardCode.startsWith('UKCAA_') ||
                          standardCode.startsWith('FDA_') ||
                          standardCode.startsWith('DOT_');

      if (isRegulatory) {
        // Use regulatory repository
        const regRepo = new VeraRegulatoryRepository();
        const sections = clauseRef 
          ? await regRepo.findRegSectionText(standardCode, clauseRef)
          : await regRepo.findRegSectionText(standardCode, ''); // Empty clauseRef gets all sections
        
        return sections.map(s => ({
          text: s.contentText || '',
          clauseRef: s.sectionRef || clauseRef || ''
        }));
      }

      // Standard compliance requirements lookup
      let query = `
        SELECT requirement_text, clause_reference
        FROM public.compliance_requirements
        WHERE standard_code = $1
      `;
      const params: any[] = [standardCode];

      if (clauseRef) {
        const normalized = VeraClauseMatcher.normalizeClauseRef(clauseRef);
        const { patterns, params: clauseParams } = VeraClauseMatcher.buildClauseMatchQuery(normalized);
        query += ` AND (${patterns.join(' OR ')})`;
        params.push(...clauseParams);
      }

      query += ` LIMIT 10`;

      const result = await queryPostgres(query, params);
      return result.rows.map((r: any) => ({
        text: r.requirement_text || '',
        clauseRef: r.clause_reference || ''
      }));
    } catch (error: any) {
      console.error('[VeraCrossStandardReasoning] Error getting requirements:', error.message);
      return [];
    }
  }

  /**
   * Get relationships between standards/clauses
   */
  private static async getRelationships(
    standardA: string,
    clauseA: string | undefined,
    standardB: string,
    clauseB: string | undefined
  ): Promise<any[]> {
    try {
      const codeA = clauseA ? `${standardA}:${clauseA}` : standardA;
      const codeB = clauseB ? `${standardB}:${clauseB}` : standardB;

      const result = await VeraKnowledgeGraph.findAllRelationships(codeA);
      return [...result.asSource, ...result.asTarget].filter(r => 
        r.sourceCode === codeB || r.targetCode === codeB
      );
    } catch (error: any) {
      console.error('[VeraCrossStandardReasoning] Error getting relationships:', error.message);
      return [];
    }
  }

  /**
   * Find similarities between requirements
   */
  private static findSimilarities(
    reqsA: Array<{ text: string; clauseRef: string }>,
    reqsB: Array<{ text: string; clauseRef: string }>,
    docsA: any[],
    docsB: any[]
  ): string[] {
    const similarities: string[] = [];

    // Compare requirement texts for similar concepts
    for (const reqA of reqsA) {
      for (const reqB of reqsB) {
        const similarity = this.calculateTextSimilarity(reqA.text, reqB.text);
        if (similarity > 0.6) {
          similarities.push(`Both standards require: ${this.extractKeyConcept(reqA.text)}`);
          break;
        }
      }
    }

    // Compare document content
    if (docsA.length > 0 && docsB.length > 0) {
      const commonTerms = this.findCommonTerms(
        docsA.map(d => d.content_text).join(' '),
        docsB.map(d => d.content_text).join(' ')
      );
      if (commonTerms.length > 0) {
        similarities.push(`Both standards address: ${commonTerms.slice(0, 3).join(', ')}`);
      }
    }

    return similarities.slice(0, 5);
  }

  /**
   * Find differences between requirements
   */
  private static findDifferences(
    reqsA: Array<{ text: string; clauseRef: string }>,
    reqsB: Array<{ text: string; clauseRef: string }>,
    docsA: any[],
    docsB: any[]
  ): string[] {
    const differences: string[] = [];

    // Find requirements in A but not in B
    for (const reqA of reqsA) {
      let found = false;
      for (const reqB of reqsB) {
        if (this.calculateTextSimilarity(reqA.text, reqB.text) > 0.7) {
          found = true;
          break;
        }
      }
      if (!found && reqA.text.length > 30) {
        differences.push(`Standard A requires: ${this.extractKeyConcept(reqA.text)}`);
      }
    }

    // Find requirements in B but not in A
    for (const reqB of reqsB) {
      let found = false;
      for (const reqA of reqsA) {
        if (this.calculateTextSimilarity(reqA.text, reqB.text) > 0.7) {
          found = true;
          break;
        }
      }
      if (!found && reqB.text.length > 30) {
        differences.push(`Standard B requires: ${this.extractKeyConcept(reqB.text)}`);
      }
    }

    return differences.slice(0, 5);
  }

  /**
   * Identify which standard is stricter
   */
  private static identifyStricterPoints(
    reqsA: Array<{ text: string; clauseRef: string }>,
    reqsB: Array<{ text: string; clauseRef: string }>,
    standardA: string,
    standardB: string
  ): { standard: string; items: string[] } {
    const stricterA: string[] = [];
    const stricterB: string[] = [];

    // Heuristic: More requirements = stricter
    if (reqsA.length > reqsB.length * 1.2) {
      stricterA.push(`Has ${reqsA.length} requirements vs ${reqsB.length} in the other standard`);
    } else if (reqsB.length > reqsA.length * 1.2) {
      stricterB.push(`Has ${reqsB.length} requirements vs ${reqsA.length} in the other standard`);
    }

    // Look for stricter language
    const strictWords = ['must', 'shall', 'required', 'mandatory', 'prohibited'];
    for (const req of reqsA) {
      const strictCount = strictWords.filter(w => req.text.toLowerCase().includes(w)).length;
      if (strictCount >= 3) {
        stricterA.push(`Uses stronger mandatory language: ${this.extractKeyConcept(req.text)}`);
      }
    }

    for (const req of reqsB) {
      const strictCount = strictWords.filter(w => req.text.toLowerCase().includes(w)).length;
      if (strictCount >= 3) {
        stricterB.push(`Uses stronger mandatory language: ${this.extractKeyConcept(req.text)}`);
      }
    }

    if (stricterA.length > stricterB.length) {
      return { standard: standardA, items: stricterA };
    } else if (stricterB.length > stricterA.length) {
      return { standard: standardB, items: stricterB };
    }

    return { standard: standardA, items: [] };
  }

  /**
   * Calculate alignment score
   */
  private static calculateAlignmentScore(
    similarities: string[],
    differences: string[],
    relationships: any[]
  ): number {
    let score = 0.5; // Base score

    // Boost for similarities
    score += Math.min(similarities.length * 0.1, 0.3);

    // Reduce for differences
    score -= Math.min(differences.length * 0.05, 0.2);

    // Boost for relationships
    if (relationships.length > 0) {
      const avgConfidence = relationships.reduce((sum, r) => sum + (r.confidence || 0.8), 0) / relationships.length;
      score += avgConfidence * 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(
    similarities: string[],
    differences: string[],
    stricterPoints: { standard: string; items: string[] },
    standardA: string,
    standardB: string
  ): string[] {
    const recommendations: string[] = [];

    if (similarities.length > 0) {
      recommendations.push(`Both standards share common requirements. You can use a unified approach for: ${similarities.slice(0, 2).join(', ')}`);
    }

    if (stricterPoints.items.length > 0) {
      recommendations.push(`${stricterPoints.standard} appears stricter. Ensure your procedures meet the higher standard to satisfy both.`);
    }

    if (differences.length > 0) {
      recommendations.push(`Address the unique requirements in each standard separately. Consider creating standard-specific sections in your procedures.`);
    }

    if (recommendations.length === 0) {
      recommendations.push(`Review both standards carefully to ensure all requirements are addressed in your quality system.`);
    }

    return recommendations;
  }

  /**
   * Calculate text similarity (simple Jaccard-like)
   */
  private static calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Extract key concept from text
   */
  private static extractKeyConcept(text: string): string {
    // Extract first meaningful sentence or phrase
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 20);
    if (sentences.length > 0) {
      return sentences[0].trim().substring(0, 100);
    }
    return text.substring(0, 100);
  }

  /**
   * Find common terms between two texts
   */
  private static findCommonTerms(text1: string, text2: string): string[] {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 4));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 4));

    const common = [...words1].filter(w => words2.has(w));
    return common.slice(0, 10);
  }

  /**
   * Format comparison as user-friendly text
   */
  static formatComparison(comparison: StandardComparison): string {
    const parts: string[] = [];

    parts.push(`## Comparison: ${comparison.standardA}${comparison.clauseA ? ` ${comparison.clauseA}` : ''} vs ${comparison.standardB}${comparison.clauseB ? ` ${comparison.clauseB}` : ''}`);
    parts.push('');
    parts.push(`**Alignment Score:** ${(comparison.alignmentScore * 100).toFixed(0)}%`);
    parts.push('');

    if (comparison.similarities.length > 0) {
      parts.push('### Similarities:');
      comparison.similarities.forEach((sim, idx) => {
        parts.push(`${idx + 1}. ${sim}`);
      });
      parts.push('');
    }

    if (comparison.differences.length > 0) {
      parts.push('### Key Differences:');
      comparison.differences.forEach((diff, idx) => {
        parts.push(`${idx + 1}. ${diff}`);
      });
      parts.push('');
    }

    if (comparison.stricterPoints.items.length > 0) {
      parts.push(`### ${comparison.stricterPoints.standard} is Stricter:`);
      comparison.stricterPoints.items.forEach((item, idx) => {
        parts.push(`${idx + 1}. ${item}`);
      });
      parts.push('');
    }

    if (comparison.recommendations.length > 0) {
      parts.push('### Recommendations:');
      comparison.recommendations.forEach((rec, idx) => {
        parts.push(`${idx + 1}. ${rec}`);
      });
    }

    return parts.join('\n');
  }
}

