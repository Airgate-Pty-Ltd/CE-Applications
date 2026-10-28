/**
 * Vera Conversation Learner
 *
 * Implements few-shot learning within a conversation session.
 * Learns from examples and user feedback immediately, without batch processing.
 */
export interface ConversationExample {
    intent: string;
    query: string;
    response: string;
    feedback?: string;
    timestamp: number;
    similarity?: number;
}
export declare class VeraConversationLearner {
    private conversationExamples;
    private sessionId;
    constructor(sessionId: string);
    /**
     * Record an example from this conversation for immediate learning
     */
    recordExample(intent: string, query: string, response: string, userFeedback?: string): Promise<void>;
    /**
     * Get relevant examples from THIS conversation that match the current query
     */
    getRelevantExamplesForQuery(currentQuery: string, limit?: number): Promise<ConversationExample[]>;
    /**
     * Apply learned patterns from examples to improve response
     */
    applyLearnedPatterns(currentQuery: string, baseResponse: string, intent: string): Promise<string>;
    /**
     * Record user feedback/correction for learning
     */
    recordFeedback(query: string, originalResponse: string, feedback: string, isCorrection?: boolean): Promise<void>;
    /**
     * Calculate similarity between two strings (Jaccard similarity)
     */
    private calculateSimilarity;
    /**
     * Incorporate user feedback into response
     */
    private incorporateFeedback;
    /**
     * Adapt response structure based on similar example
     */
    private adaptResponseStructure;
    /**
     * Clear conversation examples (for new session)
     */
    clearExamples(): void;
    /**
     * Get all examples for this conversation
     */
    getAllExamples(): ConversationExample[];
}
//# sourceMappingURL=VeraConversationLearner.d.ts.map