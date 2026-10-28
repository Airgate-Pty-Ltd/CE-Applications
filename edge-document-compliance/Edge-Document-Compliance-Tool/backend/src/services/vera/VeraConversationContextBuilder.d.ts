/**
 * Vera Conversation Context Builder
 *
 * Builds rich conversation context including:
 * - Recent messages and topics
 * - Active standards and clauses
 * - User goals and preferences
 * - Pronoun resolution ("it", "that clause", etc.)
 *
 * 100% internal - no external LLM calls.
 */
export interface ConversationContext {
    sessionId: string;
    tenantId: string;
    userId: string;
    recentMessages: Array<{
        role: 'user' | 'assistant';
        message: string;
        intent?: string;
        topic?: string;
        timestamp: Date;
    }>;
    lastTopics: string[];
    lastStandards: string[];
    lastClauses: Array<{
        ref: string;
        normalized: string;
        standardCode?: string;
    }>;
    lastUserGoals: string[];
    activeContext: {
        currentStandard?: string;
        currentClause?: string;
        currentTopic?: string;
        conversationFlow: 'question' | 'clarification' | 'followup' | 'new_topic';
    };
    resolvedPronouns: {
        'it'?: string;
        'that'?: string;
        'this'?: string;
        'the clause'?: string;
        'the standard'?: string;
    };
}
export declare class VeraConversationContextBuilder {
    /**
     * Build comprehensive conversation context
     */
    static buildContext(params: {
        tenantId: string;
        sessionId: string;
        userId: string;
        currentMessage: string;
        messageLimit?: number;
    }): Promise<ConversationContext>;
    /**
     * Resolve pronouns in message based on conversation history
     */
    private static resolvePronouns;
    /**
     * Determine conversation flow type
     */
    private static determineConversationFlow;
    /**
     * Expand message with resolved pronouns
     */
    static expandMessageWithContext(message: string, context: ConversationContext): string;
}
//# sourceMappingURL=VeraConversationContextBuilder.d.ts.map