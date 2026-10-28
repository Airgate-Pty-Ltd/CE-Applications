/**
 * Vera Learning Event Service
 *
 * Records learning events when Vera struggles, fails, or receives corrections.
 * These events become training data for future improvement.
 */
export interface VeraLearningEventInput {
    tenantId?: string;
    sessionId?: string;
    userQuestion: string;
    intent?: string | null;
    userRole?: string;
    confidenceScore?: number;
    llmAnswer?: string;
    legacyAnswer?: string;
    failureType?: "LOW_CONFIDENCE" | "USER_CORRECTION" | "NO_KNOWLEDGE" | "REMEDY_APPLIED" | "SELF_EVAL_LOW" | "SELF_EVAL_ISSUES";
    metadata?: Record<string, any>;
}
/**
 * Record a learning event in the database
 */
export declare function recordLearningEvent(input: VeraLearningEventInput): Promise<void>;
/**
 * Get learning events for analysis
 */
export declare function getLearningEvents(params: {
    tenantId?: string;
    failureType?: string;
    limit?: number;
    offset?: number;
}): Promise<any[]>;
/**
 * Get learning statistics
 */
export declare function getLearningStats(params: {
    tenantId?: string;
}): Promise<any>;
//# sourceMappingURL=VeraLearningEventService.d.ts.map