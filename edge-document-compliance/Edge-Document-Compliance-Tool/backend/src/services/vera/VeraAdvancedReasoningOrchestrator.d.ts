/**
 * Vera Advanced Reasoning Orchestrator
 *
 * Implements Chain-of-Thought reasoning with visible intermediate steps.
 * Provides audit trail of logic for compliance verification.
 */
import type { SemanticContext } from './VeraCoreEngine.js';
export interface ReasoningStep {
    step: number;
    action: string;
    subQuestion?: string;
    result: any;
    timestamp: Date;
}
export interface ReasoningChainResult {
    finalAnswer: string;
    reasoningSteps: ReasoningStep[];
    confidence: number;
    citeableEvidence: any[];
    metadata?: any;
}
export declare class VeraAdvancedReasoningOrchestrator {
    /**
     * Implements multi-step reasoning with visible intermediate steps
     * Example: "To answer this, I need to: 1) Find the requirement, 2) Check our procedures, 3) Compare them"
     */
    executeReasoningChain(query: string, context: SemanticContext): Promise<ReasoningChainResult>;
    /**
     * Decompose complex query into sub-questions
     * Example: "What's the gap in our doc control?" →
     * ["What is doc control?", "What do we have?", "What's missing?"]
     */
    private decomposeQuery;
    /**
     * Gather evidence for a sub-question from multiple sources
     */
    private gatherEvidence;
    /**
     * Synthesize findings into a coherent narrative answer
     */
    private synthesizeFindings;
    /**
     * Verify answer against compliance logic
     */
    private verifyCompliance;
    /**
     * Calculate confidence score based on evidence quality and verification
     */
    private calculateConfidenceScore;
    /**
     * Helper: Extract key points from synthesized answer
     */
    private extractKeyPoints;
    /**
     * Helper: Generate summary from evidence
     */
    private generateSummary;
    /**
     * Helper: Detect conflicts between requirements
     */
    private detectConflicts;
}
//# sourceMappingURL=VeraAdvancedReasoningOrchestrator.d.ts.map