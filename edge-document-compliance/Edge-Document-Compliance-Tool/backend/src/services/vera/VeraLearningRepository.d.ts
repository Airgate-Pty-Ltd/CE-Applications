/**
 * Vera Learning Repository
 *
 * Centralized query helpers for accessing Vera's ingested learning content:
 * - edcat.document_content_for_learning
 * - edcat.example_documents
 * - public.standards
 *
 * All queries use the internal EDCAT AI database - NO external LLM calls.
 */
export interface LearningDoc {
    content_text: string;
    quality: string | null;
    metadata: any;
    standard_code: string | null;
    word_count?: number;
    file_id?: string;
}
export interface ExampleDoc extends LearningDoc {
    file_name: string;
    quality_score: number | null;
}
export interface StandardInfo {
    id: string;
    code: string;
    name: string;
    authority_source: string | null;
    sector: string | null;
}
/**
 * Get learning documents by standard code
 * Prioritizes approved examples, then neutral, then bad examples
 */
export declare function getLearningDocsByStandardCode(standardCode: string, limit?: number): Promise<LearningDoc[]>;
/**
 * Search learning documents by topic/keyword
 * Searches both content_text and standard_code
 */
export declare function searchLearningDocsByTopic(topic: string, limit?: number): Promise<LearningDoc[]>;
/**
 * Semantic search for learning documents using embeddings
 * Uses VeraSemanticMemory for similarity-based retrieval
 */
export declare function semanticSearchLearningDocs(query: string, options?: {
    standardCode?: string;
    limit?: number;
    includeExamples?: boolean;
    minQualityScore?: number;
    minSimilarity?: number;
}): Promise<Array<LearningDoc & {
    similarityScore: number;
}>>;
/**
 * Get approved examples for a standard (quality_score >= 0.8)
 */
export declare function getApprovedExamplesForStandard(standardCode: string, limit?: number): Promise<ExampleDoc[]>;
/**
 * Get bad examples for a standard (quality_score <= 0.4)
 */
export declare function getBadExamplesForStandard(standardCode: string, limit?: number): Promise<ExampleDoc[]>;
/**
 * Get standard information from public.standards
 */
export declare function getStandardInfo(standardCode: string): Promise<StandardInfo | null>;
/**
 * Search for clause references in learning documents
 */
export declare function findClauseInLearningDocs(clauseRef: string, standardCode?: string, limit?: number): Promise<LearningDoc[]>;
/**
 * Get debug information for a standard
 */
export declare function debugLearningForStandard(standardCode: string): Promise<{
    standardCode: string;
    standardInfo: StandardInfo | null;
    learningDocsCount: number;
    approvedExamplesCount: number;
    badExamplesCount: number;
    sampleApproved: Array<{
        file_name: string;
        quality_score: number | null;
        preview: string;
    }>;
    sampleBad: Array<{
        file_name: string;
        quality_score: number | null;
        preview: string;
    }>;
}>;
//# sourceMappingURL=VeraLearningRepository.d.ts.map