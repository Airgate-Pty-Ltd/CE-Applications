/**
 * Vera Chat Engine
 * Main orchestrator for all Vera conversations
 * Uses Vera's own intelligence systems - completely independent and standalone
 * NO OpenAI dependencies - uses provider-agnostic veraEngine
 */
import { Intent } from './intentClassifier.js';
interface ChatContext {
    documents?: any[];
    standards?: any[];
    regulatoryWebsites?: any[];
    customerRequirements?: any[];
    customerId?: string;
}
interface ChatOptions {
    message: string;
    userId?: string;
    tenantId?: string;
    sessionId?: string;
    conversationId?: string;
    context?: ChatContext;
    persona?: any;
}
interface ChatResponse {
    response: string;
    intent: Intent;
    usedTools?: string[];
    confidence?: number;
    metadata?: any;
}
declare class VeraChatEngine {
    private systemPrompt;
    private conversationalEngine;
    constructor();
    /**
     * Load VeraConversationalEngine for generating responses (fallback)
     */
    private loadConversationalEngine;
    /**
     * Main entry point for chat
     */
    chat(options: ChatOptions): Promise<ChatResponse>;
    /**
     * Load persona profile
     */
    private loadPersona;
    /**
     * Load system prompt (with persona overrides)
     */
    private loadSystemPrompt;
    /**
     * Load conversation history
     */
    private loadConversationHistory;
    /**
     * Route to appropriate tools based on intent
     */
    private routeToTools;
    /**
     * Lookup clause from database
     */
    private lookupClause;
    /**
     * Format tool results for response generation
     */
    private formatToolResults;
    /**
     * Generate response using provider-agnostic VeraEngine
     * Uses runVera() which calls VERA_MODEL_ENDPOINT or falls back to internal intelligence
     */
    private generateResponseWithVeraEngine;
    /**
     * Map VeraChatEngine intent to VeraConversationalEngine intent format
     */
    private mapIntentToVeraFormat;
    /**
     * Format tool result as a natural response
     */
    private formatToolResultAsResponse;
    /**
     * Build response from semantic context
     */
    private buildResponseFromSemanticContext;
    /**
     * Build generic intelligent response using Vera's reasoning
     */
    private buildGenericIntelligentResponse;
    /**
     * Save conversation to database
     */
    private saveConversation;
}
export declare function getVeraChatEngine(): VeraChatEngine;
export default VeraChatEngine;
//# sourceMappingURL=veraChatEngine.d.ts.map