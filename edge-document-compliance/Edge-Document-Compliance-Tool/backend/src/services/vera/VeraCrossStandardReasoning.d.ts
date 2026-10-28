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
    alignmentScore: number;
    recommendations: string[];
}
export declare class VeraCrossStandardReasoning {
    /**
     * Compare two standards/clauses
     */
    static compareStandards(params: {
        standardA: string;
        clauseA?: string;
        standardB: string;
        clauseB?: string;
        tenantId?: string;
    }): Promise<StandardComparison>;
    /**
     * Get requirements for a standard/clause
     * ITERATION 8: Enhanced with regulatory repository support
     */
    private static getRequirements;
    /**
     * Get relationships between standards/clauses
     */
    private static getRelationships;
    /**
     * Find similarities between requirements
     */
    private static findSimilarities;
    /**
     * Find differences between requirements
     */
    private static findDifferences;
    /**
     * Identify which standard is stricter
     */
    private static identifyStricterPoints;
    /**
     * Calculate alignment score
     */
    private static calculateAlignmentScore;
    /**
     * Generate recommendations
     */
    private static generateRecommendations;
    /**
     * Calculate text similarity (simple Jaccard-like)
     */
    private static calculateTextSimilarity;
    /**
     * Extract key concept from text
     */
    private static extractKeyConcept;
    /**
     * Find common terms between two texts
     */
    private static findCommonTerms;
    /**
     * Format comparison as user-friendly text
     */
    static formatComparison(comparison: StandardComparison): string;
}
//# sourceMappingURL=VeraCrossStandardReasoning.d.ts.map