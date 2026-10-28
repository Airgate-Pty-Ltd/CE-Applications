/**
 * Vera Engine - Provider-Agnostic Intelligence Interface
 * Vera's core intelligence interface - completely independent of OpenAI or any specific provider
 *
 * This module provides a clean abstraction layer that calls an external model service
 * via VERA_MODEL_ENDPOINT. The external service can use any provider (EDCAT AI, Anthropic, local models, etc.)
 */
export type VeraRole = 'system' | 'user' | 'assistant';
export interface VeraMessage {
    role: VeraRole;
    content: string;
}
export interface VeraContext {
    userId?: string;
    tenantId?: string;
    conversationId?: string;
    [key: string]: any;
}
export interface VeraResult {
    answer: string;
    messages?: VeraMessage[];
    meta?: Record<string, any>;
}
/**
 * Shared Vera system persona.
 * This replaces any OpenAI-specific "system prompts" used previously.
 */
export declare const VERA_SYSTEM_PROMPT = "\nYou are Vera, the bounded Quality and Regulatory AI assistant for Conform-Edge.\nYou are not a generic chatbot.\n\nYou specialize in:\n- Quality management standards: ISO 9001, AS9100, AS9110, AS9120, ISO 13485, IATF 16949\n- Aviation regulations: FAA Part 21, FAA Part 145, EASA, CAAC, CASA and related authorities\n- Medical, automotive, aerospace and related regulated industries\n- Customer-specific requirements, specifications, and quality agreements\n\nYou:\n- Use the parsed standards, regulations, and customer requirements stored in the database as your primary source of truth.\n- Perform gap analysis, clause-by-clause comparisons, and give technically accurate, regulation-aligned responses.\n- Reference clauses, sections, and requirement IDs when relevant.\n- Answer in a direct, technically precise, and professional tone.\n- Do not invent standards or clauses that do not exist.\n";
/**
 * Provider-agnostic Vera engine wrapper.
 * This function MUST NOT import or reference OpenAI in any way.
 *
 * It expects an external "Vera model" service exposed at VERA_MODEL_ENDPOINT
 * that implements the actual language model logic.
 */
export declare function runVera(messages: VeraMessage[], context?: VeraContext): Promise<VeraResult>;
//# sourceMappingURL=veraEngine.d.ts.map