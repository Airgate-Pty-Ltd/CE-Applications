/**
 * Vera LLM Bridge
 *
 * Pluggable, provider-agnostic interface for calling generative language models.
 * Supports self-hosted/local deployment via HTTP and graceful degradation.
 *
 * This is the SINGLE entry point for all LLM calls in Vera.
 * No other service should directly call external LLM APIs.
 */
/**
 * Call Vera's LLM with structured context
 *
 * Provider modes:
 * - "local_http": POST to VERA_LLM_ENDPOINT
 * - "noop": Return fallback message (LLM disabled)
 * - (future: "openai", "anthropic", etc.)
 */
export async function callVeraLLM(req) {
    const provider = process.env.VERA_LLM_PROVIDER || 'noop';
    const endpoint = process.env.VERA_LLM_ENDPOINT;
    const apiKey = process.env.VERA_LLM_API_KEY;
    // NOOP mode: LLM disabled
    if (provider === 'noop' || !endpoint) {
        console.warn('[VeraLLMBridge] LLM provider not configured (VERA_LLM_PROVIDER=noop or VERA_LLM_ENDPOINT not set)');
        return {
            answer: "[LLM_DISABLED] Vera's generative core is not configured. Falling back to legacy response pipeline.",
            reasoningNotes: 'LLM provider is disabled or not configured',
        };
    }
    // LOCAL_HTTP mode: Call self-hosted LLM endpoint
    if (provider === 'local_http') {
        try {
            return await callLocalHTTPLLM(req, endpoint, apiKey);
        }
        catch (error) {
            console.error('[VeraLLMBridge] Error calling local HTTP LLM:', error.message);
            return {
                answer: `[LLM_ERROR] Unable to generate response: ${error.message}. Falling back to legacy pipeline.`,
                reasoningNotes: `LLM call failed: ${error.message}`,
            };
        }
    }
    // Unknown provider
    console.warn(`[VeraLLMBridge] Unknown provider: ${provider}, falling back to noop`);
    return {
        answer: "[LLM_DISABLED] Unknown LLM provider configured. Falling back to legacy response pipeline.",
        reasoningNotes: `Unknown provider: ${provider}`,
    };
}
/**
 * Call a local HTTP-based LLM endpoint
 */
async function callLocalHTTPLLM(req, endpoint, apiKey) {
    const timeout = parseInt(process.env.VERA_LLM_TIMEOUT || '30000', 10); // Default 30s
    // Build combined context text from blocks
    const contextText = req.contextBlocks
        .map(block => `## ${block.label}\n\n${block.text}`)
        .join('\n\n---\n\n');
    // Build payload for LLM endpoint
    const payload = {
        system_prompt: req.systemPrompt,
        context: req.contextBlocks,
        user_message: req.userMessage,
        intent: req.intent || null,
        tenant_id: req.tenantId || null,
        user_role: req.userRole || null,
    };
    // Prepare headers
    const headers = {
        'Content-Type': 'application/json',
    };
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }
    // Make HTTP request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        const data = await response.json();
        // Expected response format (documented contract):
        // {
        //   "text": "Generated answer...",
        //   "reasoning"?: "Optional reasoning notes...",
        //   "citations"?: ["citation1", "citation2"]
        // }
        const answer = data.text || data.answer || data.response || '';
        if (!answer) {
            throw new Error('LLM response missing text/answer field');
        }
        return {
            answer,
            reasoningNotes: data.reasoning || data.reasoning_notes,
            citations: data.citations || [],
            rawModelResponse: data,
        };
    }
    catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`LLM request timed out after ${timeout}ms`);
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            throw new Error(`Cannot connect to LLM endpoint: ${endpoint}`);
        }
        throw error;
    }
}
/**
 * Check if LLM is available and configured
 */
export function isLLMConfigured() {
    const provider = process.env.VERA_LLM_PROVIDER || 'noop';
    const endpoint = process.env.VERA_LLM_ENDPOINT;
    return provider !== 'noop' && !!endpoint;
}
/**
 * Health check for LLM endpoint
 */
export async function checkLLMHealth() {
    if (!isLLMConfigured()) {
        return { available: false, error: 'LLM not configured' };
    }
    const endpoint = process.env.VERA_LLM_ENDPOINT;
    const timeout = 5000; // 5s for health check
    try {
        const fetch = (await import('node-fetch')).default;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        // Try a simple health endpoint or the main endpoint with a minimal request
        const healthEndpoint = endpoint.replace(/\/generate$/, '/health') || `${endpoint}/health`;
        const response = await fetch(healthEndpoint, {
            method: 'GET',
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.ok) {
            return { available: true };
        }
        else {
            return { available: false, error: `HTTP ${response.status}` };
        }
    }
    catch (error) {
        return { available: false, error: error.message };
    }
}
//# sourceMappingURL=VeraLLMBridge.js.map