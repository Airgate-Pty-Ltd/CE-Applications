/**
 * Vera Context Orchestrator
 *
 * Builds comprehensive context from all Vera services for RAG (Retrieval-Augmented Generation).
 * This is the single place where all relevant data is gathered before being sent to the LLM.
 *
 * No final answer generation happens here - only data retrieval and structuring.
 */
export interface VeraContext {
    intent: string | null;
    userRole?: string;
    terms: Array<{
        term: string;
        definition: string;
        acronym?: string;
        category?: string;
        sourceStandard?: string;
    }>;
    qaSnippets: Array<{
        id: string;
        question: string;
        response: string;
        category: string;
        confidence: number;
    }>;
    standardClauses: Array<{
        standardCode: string;
        clauseNumber: string;
        requirementText: string;
        standardName?: string;
    }>;
    regulatorySections: Array<{
        standardCode: string;
        sectionRef: string;
        sectionText: string;
    }>;
    examples: Array<{
        title: string;
        content: string;
        standardCode?: string;
        isApproved: boolean;
    }>;
    gapHints: Array<{
        hint: string;
        standardCode?: string;
        clauseNumber?: string;
    }>;
    conversationHistory: Array<{
        role: 'user' | 'assistant';
        message: string;
        timestamp: Date;
    }>;
}
/**
 * Build comprehensive context for a user message
 *
 * Aggregates data from:
 * - Terminology service (term definitions)
 * - Q&A response bank (high-signal Q&A entries)
 * - Clause matcher + compliance requirements (relevant clauses)
 * - Regulatory repository (regulatory sections)
 * - Learning repository (examples, learning docs)
 * - Gap hint service (gap analysis hints)
 * - Conversation memory (recent context)
 */
export declare function buildContext(params: {
    tenantId?: string;
    userMessage: string;
    intent?: string | null;
    userRole?: string;
    sessionId?: string;
}): Promise<VeraContext>;
//# sourceMappingURL=VeraContextOrchestrator.d.ts.map