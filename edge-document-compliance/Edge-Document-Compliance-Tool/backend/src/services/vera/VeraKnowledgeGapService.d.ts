/**
 * Vera Knowledge Gap Service
 *
 * Detects when Vera is missing critical information needed to answer user requests.
 * Creates structured information requests that guide users to upload missing documents.
 *
 * 100% internal - no external LLM calls.
 */
export interface KnowledgeGapRequest {
    requestId: string;
    requestType: 'standard' | 'regulatory' | 'example_good' | 'example_bad' | 'customer_requirement' | 'training_material' | 'data_set' | 'clause_detail' | 'procedure_template';
    standardCode?: string | null;
    regulationRef?: string | null;
    topic?: string | null;
    description: string;
    suggestedFolder?: string | null;
    suggestedTag?: string | null;
    requestedArtifactType?: string | null;
}
export interface SemanticContext {
    standards?: Array<{
        code: string;
        name?: string;
        title?: string;
        revision?: string;
    }>;
    learningDocs?: Array<{
        standard_code?: string;
        standardCode?: string;
        content_text?: string;
        contentText?: string;
    }>;
    approvedExamples?: Array<{
        standard_code?: string;
        standardCode?: string;
        file_name?: string;
        fileName?: string;
    }>;
    badExamples?: Array<{
        standard_code?: string;
        standardCode?: string;
        file_name?: string;
        fileName?: string;
    }>;
    clauses?: Array<{
        standardCode?: string;
        standard_code?: string;
        clauseId?: string;
        clause_id?: string;
    }>;
    detectedStandardCode?: string;
}
export declare class VeraKnowledgeGapService {
    /**
     * Detect whether Vera is missing key information to properly respond.
     *
     * @param params - Detection parameters
     * @returns KnowledgeGapRequest if gap detected, null otherwise
     */
    static detectKnowledgeGap(params: {
        tenantId: string;
        sessionId: string;
        intent: string;
        topic?: string;
        standardCode?: string | null;
        clauseRef?: string | null;
        semanticContext: SemanticContext;
    }): Promise<KnowledgeGapRequest | null>;
    /**
     * Check if standard content exists in semantic context
     */
    private static _hasStandardContent;
    /**
     * Check if clause-specific content exists
     */
    private static _hasClauseContent;
    /**
     * Check if examples exist for standard
     */
    private static _hasExamples;
    /**
     * Check if standard is regulatory
     */
    private static _isRegulatoryStandard;
    /**
     * Get regulatory-specific information
     */
    private static _getRegulatoryInfo;
    /**
     * Create and store information request
     */
    private static _createAndReturnRequest;
    /**
     * Check if a request has been fulfilled
     */
    static checkRequestFulfillment(requestId: string): Promise<boolean>;
    /**
     * Get open requests for a tenant
     */
    static getOpenRequests(tenantId: string, limit?: number): Promise<KnowledgeGapRequest[]>;
}
//# sourceMappingURL=VeraKnowledgeGapService.d.ts.map