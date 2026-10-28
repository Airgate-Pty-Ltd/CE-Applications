/**
 * Intent Classifier
 * Deterministic intent classification using Vera's own rule-based system
 * Completely independent - no external AI dependencies
 * NO OpenAI - uses only pattern matching and rule-based classification
 */
/**
 * Deterministic intent classification using rules
 */
export function classifyIntentDeterministic(message) {
    const lowerMessage = message.toLowerCase().trim();
    // Greeting patterns
    if (/^(hi|hello|hey|good morning|good afternoon|good evening|greetings)/i.test(lowerMessage) ||
        lowerMessage.includes('how are you') || lowerMessage.includes("what's up")) {
        return { intent: 'greeting', confidence: 0.95 };
    }
    // Clause lookup patterns
    const clausePattern = /(?:clause|section|requirement|paragraph)\s*([\d]+\.[\d]+(?:\.[\d]+)*)/i;
    const clauseMatch = message.match(clausePattern);
    const standardPattern = /(?:iso|as|iatf|faa|easa|casa|fda)[\s\-+]*(\d+)|(?:part\s+(\d+))/i;
    const standardMatch = message.match(standardPattern);
    if (clauseMatch || (lowerMessage.includes('clause') && standardMatch)) {
        return {
            intent: 'clause_lookup',
            confidence: 0.90,
            extractedData: {
                clauseNumber: clauseMatch?.[1],
                standardCode: standardMatch?.[1] || standardMatch?.[2] ? `PART-${standardMatch[2]}` : undefined
            }
        };
    }
    // Analysis patterns
    if (lowerMessage.includes('gap analysis') || lowerMessage.includes('gap check') ||
        lowerMessage.includes('compliance check') || lowerMessage.includes('compare')) {
        return {
            intent: 'analysis',
            confidence: 0.85,
            extractedData: {
                analysisType: lowerMessage.includes('gap') ? 'gap' : 'compare'
            }
        };
    }
    // Upload/parse related
    if (lowerMessage.includes('upload') || lowerMessage.includes('parse') ||
        lowerMessage.includes('extract requirements')) {
        return { intent: 'upload_related', confidence: 0.80 };
    }
    // Meta questions (about Vera herself)
    if (lowerMessage.includes('what can you do') || lowerMessage.includes('your capabilities') ||
        lowerMessage.includes('tell me about yourself') || lowerMessage.includes('who are you')) {
        return { intent: 'meta', confidence: 0.90 };
    }
    // Clarification requests
    if (lowerMessage.includes('clarify') || lowerMessage.includes('what do you mean') ||
        lowerMessage.includes('can you explain')) {
        return { intent: 'clarification', confidence: 0.75 };
    }
    // Question patterns (catch-all for "what is", "how does", etc.)
    if (lowerMessage.match(/^(what|how|why|when|where|who|which|can you|tell me|explain)/)) {
        return { intent: 'question', confidence: 0.70 };
    }
    return null;
}
/**
 * Enhanced deterministic classification for ambiguous cases
 * Uses pattern matching and keyword analysis - no external AI needed
 */
export function classifyIntentEnhanced(message) {
    const lowerMessage = message.toLowerCase().trim();
    // Enhanced pattern matching for ambiguous cases
    const patterns = [
        {
            pattern: /(?:what|how|why|when|where|who|which|can you|tell me|explain|describe|show me)/i,
            intent: 'question',
            confidence: 0.75
        },
        {
            pattern: /(?:help|assist|support|guide)/i,
            intent: 'question',
            confidence: 0.70
        },
        {
            pattern: /(?:need|want|looking for|searching)/i,
            intent: 'question',
            confidence: 0.65
        }
    ];
    for (const { pattern, intent, confidence } of patterns) {
        if (pattern.test(message)) {
            return { intent, confidence };
        }
    }
    // Default fallback
    return { intent: 'question', confidence: 0.60 };
}
/**
 * Main classification function - uses only deterministic and enhanced pattern matching
 * Completely independent - no external AI dependencies
 */
export async function classifyIntent(message) {
    // Try deterministic first
    const deterministic = classifyIntentDeterministic(message);
    if (deterministic && deterministic.confidence > 0.8) {
        return deterministic;
    }
    // For ambiguous cases, use enhanced pattern matching
    if (deterministic && deterministic.confidence < 0.7) {
        const enhanced = classifyIntentEnhanced(message);
        // Prefer enhanced if confidence is higher
        if (enhanced.confidence > deterministic.confidence) {
            return { ...enhanced, extractedData: deterministic.extractedData };
        }
    }
    // If no deterministic match, use enhanced
    if (!deterministic) {
        return classifyIntentEnhanced(message);
    }
    return deterministic;
}
export default { classifyIntent, classifyIntentDeterministic, classifyIntentEnhanced };
//# sourceMappingURL=intentClassifier.js.map