/**
 * Vera Intent Learner
 *
 * Learns intent patterns from conversation history.
 * Uses semantic similarity to find similar past questions and reuse successful intent patterns.
 *
 * 100% internal - no external LLM calls.
 */
export interface LearnedIntent {
    intent: string;
    topic?: string;
    subIntent?: string;
    confidence: number;
    source: 'history' | 'pattern';
    rationale?: string;
    similarQuestion?: string;
}
export declare class VeraIntentLearner {
    /**
     * Learn intent from conversation history
     */
    static learnIntentFromHistory(params: {
        message: string;
        tenantId: string;
        sessionId?: string;
        minSimilarity?: number;
    }): Promise<LearnedIntent | null>;
    /**
     * Store successful intent pattern for future use
     */
    static storeIntentPattern(params: {
        tenantId: string;
        message: string;
        intent: string;
        topic?: string;
        subIntent?: string;
        success: boolean;
    }): Promise<void>;
    /**
     * Get intent statistics for a tenant
     */
    static getIntentStatistics(tenantId: string, limit?: number): Promise<Array<{
        intent: string;
        count: number;
        avgConfidence: number;
        lastUsed: Date;
    }>>;
}
//# sourceMappingURL=VeraIntentLearner.d.ts.map