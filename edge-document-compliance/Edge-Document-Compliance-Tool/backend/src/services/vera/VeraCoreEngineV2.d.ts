/**
 * VERA CORE ENGINE V2 - COMPLETE REWRITE
 *
 * The problem with V1:
 * - Intent detection fails → falls back to term matching
 * - When confused, tries same thing again (loop)
 * - No alternative decision paths
 *
 * V2 Solution:
 * - Intent detection is FIRST and MANDATORY
 * - When detection fails, try MULTIPLE interpretations
 * - Loop avoidance is intelligent (different approaches, not suppression)
 * - Every decision path is logged for debugging
 */
declare class VeraCoreEngineV2 {
    private conversationHistory;
    private sessionId;
    /**
     * Generate Vera response - compatible with V1 interface
     * @param request - V1-style request object OR (userQuery, sessionId, context)
     */
    generateVeraResponse(requestOrQuery: any, sessionId?: string, context?: any): Promise<any>;
    private generateVeraResponseInternal;
    /**
     * Static wrapper for compatibility with V1 import style
     */
    static generateVeraResponse(request: any): Promise<any>;
    private detectIntentRobust;
    private handleSpecializedIntent;
    private findAlternativeInterpretations;
    private findSimilarHistoricalQueries;
    private handleAlternatives;
    private askForClarification;
    private handleSelfDiagnostic;
    private checkDatabaseConnections;
    private checkTableStatus;
    private checkRetrievalPaths;
    private handleGapAnalysis;
    private handleTermDefinition;
    private handleRegulatoryQuestion;
    private handleProcedureDraft;
    private handleComparison;
    private buildSemanticContextResponse;
}
export default VeraCoreEngineV2;
//# sourceMappingURL=VeraCoreEngineV2.d.ts.map