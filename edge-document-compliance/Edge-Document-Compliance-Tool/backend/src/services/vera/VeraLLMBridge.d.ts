/**
 * Vera LLM Bridge
 *
 * Pluggable, provider-agnostic interface for calling generative language models.
 * Supports self-hosted/local deployment via HTTP and graceful degradation.
 *
 * This is the SINGLE entry point for all LLM calls in Vera.
 * No other service should directly call external LLM APIs.
 */
export interface VeraLLMContextBlock {
    label: string;
    text: string;
}
export interface VeraLLMRequest {
    systemPrompt: string;
    contextBlocks: VeraLLMContextBlock[];
    userMessage: string;
    intent?: string;
    tenantId?: string;
    userRole?: string;
}
export interface VeraLLMResponse {
    answer: string;
    reasoningNotes?: string;
    citations?: string[];
    rawModelResponse?: any;
}
/**
 * Call Vera's LLM with structured context
 *
 * Provider modes:
 * - "local_http": POST to VERA_LLM_ENDPOINT
 * - "noop": Return fallback message (LLM disabled)
 * - (future: "openai", "anthropic", etc.)
 */
export declare function callVeraLLM(req: VeraLLMRequest): Promise<VeraLLMResponse>;
/**
 * Check if LLM is available and configured
 */
export declare function isLLMConfigured(): boolean;
/**
 * Health check for LLM endpoint
 */
export declare function checkLLMHealth(): Promise<{
    available: boolean;
    error?: string;
}>;
//# sourceMappingURL=VeraLLMBridge.d.ts.map