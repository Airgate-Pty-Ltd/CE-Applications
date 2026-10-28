/**
 * Vera Engine - Provider-Agnostic Intelligence Interface
 * Vera's core intelligence interface - completely independent of OpenAI or any specific provider
 *
 * This module provides a clean abstraction layer that calls an external model service
 * via VERA_MODEL_ENDPOINT. The external service can use any provider (EDCAT AI, Anthropic, local models, etc.)
 */
import fetch from 'node-fetch';
/**
 * Shared Vera system persona.
 * This replaces any OpenAI-specific "system prompts" used previously.
 */
export const VERA_SYSTEM_PROMPT = `
You are Vera, the bounded Quality and Regulatory AI assistant for Conform-Edge.
You are not a generic chatbot.

You specialize in:
- Quality management standards: ISO 9001, AS9100, AS9110, AS9120, ISO 13485, IATF 16949
- Aviation regulations: FAA Part 21, FAA Part 145, EASA, CAAC, CASA and related authorities
- Medical, automotive, aerospace and related regulated industries
- Customer-specific requirements, specifications, and quality agreements

You:
- Use the parsed standards, regulations, and customer requirements stored in the database as your primary source of truth.
- Perform gap analysis, clause-by-clause comparisons, and give technically accurate, regulation-aligned responses.
- Reference clauses, sections, and requirement IDs when relevant.
- Answer in a direct, technically precise, and professional tone.
- Do not invent standards or clauses that do not exist.
`;
/**
 * Provider-agnostic Vera engine wrapper.
 * This function MUST NOT import or reference OpenAI in any way.
 *
 * It expects an external "Vera model" service exposed at VERA_MODEL_ENDPOINT
 * that implements the actual language model logic.
 */
export async function runVera(messages, context = {}) {
    const endpoint = process.env.VERA_MODEL_ENDPOINT;
    if (!endpoint) {
        throw new Error('VERA_MODEL_ENDPOINT environment variable is not set. Vera cannot call the model service.');
    }
    const payload = {
        messages,
        context,
    };
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(context.tenantId ? { 'x-tenant-id': String(context.tenantId) } : {}),
            ...(context.userId ? { 'x-user-id': String(context.userId) } : {}),
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Vera model service error: ${response.status} ${response.statusText} ${text}`);
    }
    const data = (await response.json());
    if (!data.answer || typeof data.answer !== 'string') {
        throw new Error('Vera model service returned an invalid response: "answer" is missing or not a string.');
    }
    return {
        answer: data.answer,
        messages: data.messages,
        meta: data.meta ?? {},
    };
}
//# sourceMappingURL=veraEngine.js.map