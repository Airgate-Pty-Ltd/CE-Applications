/**
 * Vera Gap Hint Service
 *
 * Provides gap analysis hints and insights based on:
 * - Approved vs bad examples
 * - Previous gap analyses
 * - Common gap patterns
 * - Missing documentation
 *
 * 100% internal - no external LLM calls.
 */
export interface GapHint {
    type: 'missing_example' | 'previous_gap' | 'common_pattern' | 'missing_documentation';
    severity: 'high' | 'medium' | 'low';
    standardCode?: string;
    clauseRef?: string;
    description: string;
    recommendation: string;
    confidence: number;
}
export declare class VeraGapHintService {
    /**
     * Get gap hints for a standard/clause
     */
    static getGapHints(params: {
        tenantId: string;
        standardCode?: string;
        clauseRef?: string;
        topic?: string;
    }): Promise<GapHint[]>;
    /**
     * Analyze bad examples to find common patterns
     */
    private static analyzeBadExamplePatterns;
    /**
     * Format gap hints as user-friendly text
     */
    static formatGapHints(hints: GapHint[]): string;
}
//# sourceMappingURL=VeraGapHintService.d.ts.map