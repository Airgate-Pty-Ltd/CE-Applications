/**
 * Vera Interactive Clarification Engine
 *
 * Detects ambiguity and asks clarifying questions before answering.
 * Prevents guessing and ensures accurate, context-aware responses.
 */
export interface ClarificationResult {
    needsClarification: boolean;
    clarificationQuestions?: string[];
    ambiguities?: Ambiguity[];
    userQuerySummary?: string;
}
export interface Ambiguity {
    type: 'term_ambiguity' | 'context_gap' | 'scope_ambiguity';
    term?: string;
    possibleMeanings?: string[];
    question?: string;
    missing?: string;
    keyword?: string;
}
export declare class VeraInteractiveClarificationEngine {
    /**
     * Detects ambiguity and asks clarifying questions
     * Doesn't guess—clarifies first, then answers
     */
    detectAmbiguityAndClarify(userQuery: string, context: any): Promise<ClarificationResult>;
    /**
     * Detect ambiguous terms with multiple meanings
     */
    private detectTermAmbiguity;
    /**
     * Detect missing context (vague references)
     */
    private detectContextGaps;
    /**
     * Detect scope ambiguity (unclear boundaries)
     */
    private detectScopeAmbiguity;
    /**
     * Generate human-readable clarifying questions from ambiguities
     */
    private generateClarifyingQuestions;
    /**
     * Extract key terms from query (simple NLP)
     */
    private extractKeyTerms;
    /**
     * Check if context provides the missing information
     */
    private checkContextAvailability;
}
//# sourceMappingURL=VeraInteractiveClarificationEngine.d.ts.map