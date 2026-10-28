/**
 * Semantic Fetcher (RAG Engine)
 * Retrieves relevant context from embeddings, knowledge graph, and standard profiles
 */
interface SemanticContext {
    requirements: Array<{
        id: string;
        text: string;
        clauseNumber: string;
        standardCode: string;
        similarity: number;
    }>;
    procedures: Array<{
        id: string;
        text: string;
        documentName: string;
        similarity: number;
    }>;
    concepts: Array<{
        conceptName: string;
        description: string;
        relatedConcepts: string[];
    }>;
    standardProfiles: Array<{
        standardCode: string;
        summary: string;
        keyConcepts: string[];
    }>;
    reasoningChains: Array<{
        chainId: string;
        reasoning: string;
        confidence: number;
    }>;
}
/**
 * Main semantic fetch function
 * Combines all sources into a unified context
 */
export declare function fetchSemanticContext(query: string, options?: {
    maxRequirements?: number;
    maxProcedures?: number;
    maxConcepts?: number;
    maxProfiles?: number;
    maxChains?: number;
}): Promise<SemanticContext>;
/**
 * Format semantic context for response generation
 */
export declare function formatSemanticContext(context: SemanticContext): string;
declare const _default: {
    fetchSemanticContext: typeof fetchSemanticContext;
    formatSemanticContext: typeof formatSemanticContext;
};
export default _default;
//# sourceMappingURL=semanticFetcher.d.ts.map