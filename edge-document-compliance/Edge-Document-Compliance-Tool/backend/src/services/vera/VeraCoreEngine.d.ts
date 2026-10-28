/**
 * Vera Core Engine - Self-Contained Internal Reasoning
 *
 * Vera is her own LLM. All reasoning and text generation uses:
 * - EDCAT AI database (edcat.* tables)
 * - Customer DB (public.* tables)
 * - Internal routing, templates, and logic
 *
 * NO external AI providers (OpenAI, Anthropic, etc.)
 */
import { type LearningDoc, type ExampleDoc } from './VeraLearningRepository.js';
export interface VeraRequest {
    message: string;
    sessionId?: string;
    userId?: string;
    tenantId?: string;
    debugMode?: boolean;
}
export interface VeraResponse {
    answer: string;
    mode: 'normal' | 'fallback' | 'error';
    intent?: string;
    topic?: string;
    subIntent?: string;
    metadata?: {
        templateUsed?: string;
        clausesReferenced?: string[];
        standardsReferenced?: string[];
        confidence?: number;
        [key: string]: any;
    };
}
export interface SemanticContext {
    standards: Array<{
        code: string;
        revision: string;
        title: string;
    }>;
    clauses: Array<{
        standardCode: string;
        clauseId: string;
        label: string;
        requirementText?: string;
    }>;
    customerDocuments: Array<{
        id: string;
        name: string;
        type: string;
    }>;
    gapAnalyses: Array<{
        id: string;
        standardCode: string;
        status: string;
    }>;
    conversationState?: {
        lastIntent?: string;
        lastTopic?: string;
        context?: any;
    };
    documentContent: Array<{
        contentText: string;
        standardCode: string;
        quality?: string;
        metadata?: any;
        wordCount?: number;
    }>;
    examples: Array<{
        fileName: string;
        contentText: string;
        qualityScore: number;
        standardCode: string;
    }>;
    learningDocs?: LearningDoc[];
    approvedExamples?: ExampleDoc[];
    badExamples?: ExampleDoc[];
    detectedStandardCode?: string;
    termsAndDefinitions?: Array<{
        term: string;
        acronym?: string;
        definition: string;
        source_standard?: string;
        category?: string;
    }>;
}
export declare class VeraCoreEngine {
    /**
     * Generate Vera response using internal reasoning pipeline
     */
    static generateVeraResponse(req: VeraRequest): Promise<VeraResponse>;
    /**
     * Determine industry context from message, standard code, and standards list
     * Returns industry priorities and standard codes for context-aware term selection
     */
    private static determineIndustryContext;
    /**
     * Extract standard code from message
     * Handles patterns like: AS9100D, CASA CASRS Volume 1, EASA 1321/2014, FAA 14 CFR 21.137, etc.
     */
    /**
     * Extract topic from message (for template variable filling)
     */
    private static extractTopicFromMessage;
    private static extractStandardCode;
    /**
     * Format terminology definition for response
     * @param {any} termDef - Term definition from database
     * @returns {string} Formatted response
     */
    private static formatTermDefinition;
    /**
     * Format Q&A response for output
     * @param {any} qnaEntry - Q&A entry from database
     * @returns {string} Formatted response
     */
    private static formatQnAResponse;
    /**
     * Check if message is a self-diagnostic question
     */
    private static isSelfDiagnosticQuestion;
    /**
     * Check if message is a self-triage question
     */
    private static isSelfTriageQuestion;
    /**
     * Check if message is a debug history question
     */
    private static isSelfDebugHistoryQuestion;
    /**
     * Check if message is a remedy/recommendation question
     */
    private static isSelfRemedyQuestion;
    /**
     * Check if message is a self-test request
     */
    private static isSelfTestQuestion;
    /**
     * Check if message is a remedy application recording
     */
    private static isRemedyApplicationMessage;
    /**
     * Check if message is asking for remedy effectiveness
     */
    private static isRemedyEffectivenessQuestion;
    /**
     * Detect specialized intents for fast-path routing
     * These intents have high confidence and route to specific handlers
     * RUNS BEFORE generic intent classification
     *
     * @param {string} userMessage - User's message
     * @returns {Object} Intent with confidence and routing info, or null
     */
    private static detectSpecializedIntent;
    private static detectIntentAndTopic;
    private static buildSemanticContext;
    private static selectAnswerTemplate;
    private static getDefaultTemplate;
    private static fillTemplate;
    /**
     * Calculate text similarity between two strings (simple Jaccard-based)
     */
    private static calculateTextSimilarity;
    /**
     * Calculate confidence score for response
     */
    private static calculateConfidence;
    /**
     * Adjust confidence based on health status
     */
    private static adjustConfidenceForHealth;
    /**
     * Build response when knowledge gap is detected
     */
    private static buildKnowledgeGapResponse;
    /**
     * Extract relevant snippet from text around a keyword/clause reference
     */
    private static extractRelevantSnippet;
    /**
     * Handle self-diagnostic questions
     * Returns a formatted response listing all current issues
     */
    private static handleSelfDiagnostic;
    /**
     * Get time-of-day greeting
     */
    private static getTimeOfDayGreeting;
    /**
     * Handle self-triage questions
     * Returns prioritized list of issues with recommendations
     */
    private static handleSelfTriage;
    /**
     * Explain an issue in human-friendly terms
     */
    private static explainIssueForHumans;
    /**
     * Short label for an issue (for ordered lists)
     */
    private static shortLabelForIssue;
    /**
     * Handle self-debug-history questions
     * Returns summary of recent issues from both in-memory and database
     */
    private static handleSelfDebugHistory;
    /**
     * Handle self-remedy questions
     * Returns actionable remediation steps for the highest-priority issue
     */
    private static handleSelfRemedy;
    /**
     * Handle self-test requests
     * Runs diagnostic tests and reports results
     */
    private static handleSelfTest;
    /**
     * Handle remedy application recording
     * Records when user applies a remedy so Vera can learn
     */
    private static handleRemedyApplication;
    /**
     * Handle remedy effectiveness questions
     * Shows which remedies have worked best historically
     */
    private static handleRemedyEffectiveness;
    /**
     * Handle cross-standard comparison
     */
    private static handleCrossStandardComparison;
    /**
     * Build procedure draft from approved and bad examples using template generator
     */
    private static buildProcedureDraftFromExamples;
    /**
     * Summarize approved example content
     */
    private static summarizeExample;
    /**
     * Summarize bad patterns from bad examples
     */
    private static summarizeBadPatterns;
    private static generateFallbackResponse;
    private static recordConversationTurn;
    private static applyLearningFromFeedback;
    private static createLearningEventTable;
}
export declare function generateVeraResponse(req: VeraRequest): Promise<VeraResponse>;
export default VeraCoreEngine;
//# sourceMappingURL=VeraCoreEngine.d.ts.map