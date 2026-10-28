/**
 * Vera Correction Processor
 *
 * Processes user corrections and feedback to improve future responses.
 * Extracts corrected information and stores it for future use.
 *
 * 100% internal - no external LLM calls.
 */
export interface Correction {
    id: string;
    tenantId: string;
    sessionId: string;
    userId: string;
    originalQuestion: string;
    originalAnswer: string;
    correctedAnswer: string;
    correctionText: string;
    intent?: string;
    topic?: string;
    standardCode?: string;
    clauseRef?: string;
    errorType: 'misinterpretation' | 'outdated' | 'missing_context' | 'incorrect_fact' | 'other';
    confidence: number;
    createdAt: Date;
}
export declare class VeraCorrectionProcessor {
    /**
     * Process user correction/feedback
     */
    static processCorrection(params: {
        tenantId: string;
        sessionId: string;
        userId: string;
        previousQuestion: string;
        previousAnswer: string;
        correctionText: string;
        intent?: string;
        topic?: string;
        standardCode?: string;
        clauseRef?: string;
    }): Promise<Correction>;
    /**
     * Extract corrected answer from feedback text
     */
    private static extractCorrectedAnswer;
    /**
     * Detect error type from correction text
     */
    private static detectErrorType;
    /**
     * Calculate confidence in the correction
     */
    private static calculateCorrectionConfidence;
    /**
     * Store correction in vera_query_response_bank
     */
    private static storeInResponseBank;
    /**
     * Store learning event
     */
    private static storeLearningEvent;
    /**
     * Store embedding for semantic search
     */
    private static storeCorrectionEmbedding;
    /**
     * Get corrections for a similar question
     */
    static getCorrectionsForQuestion(params: {
        tenantId: string;
        question: string;
        limit?: number;
    }): Promise<Correction[]>;
    /**
     * Map database row to Correction object
     */
    private static mapRowToCorrection;
}
//# sourceMappingURL=VeraCorrectionProcessor.d.ts.map