/**
 * Vera Conversation Context Builder
 *
 * Builds rich conversation context including:
 * - Recent messages and topics
 * - Active standards and clauses
 * - User goals and preferences
 * - Pronoun resolution ("it", "that clause", etc.)
 *
 * 100% internal - no external LLM calls.
 */
import { queryEdcatAI } from '../../config/databases.js';
import { VeraClauseMatcher } from './VeraClauseMatcher.js';
import { VeraCacheService, CacheKeys } from './VeraCacheService.js';
export class VeraConversationContextBuilder {
    /**
     * Build comprehensive conversation context
     */
    static async buildContext(params) {
        const { tenantId, sessionId, userId, currentMessage, messageLimit = 10 } = params;
        const cacheKey = CacheKeys.conversationHistory(sessionId, messageLimit);
        return VeraCacheService.getOrSet(cacheKey, async () => {
            try {
                // Get recent conversation history
                const historyResult = await queryEdcatAI(`SELECT role, message_text, intent, metadata, created_at
           FROM edcat.ai_conversation_history
           WHERE tenant_id = $1 AND session_id = $2
           ORDER BY created_at DESC
           LIMIT $3`, [tenantId, sessionId, messageLimit]);
                const recentMessages = historyResult.rows.map((r) => ({
                    role: r.role,
                    message: r.message_text,
                    intent: r.intent,
                    topic: r.metadata?.topic,
                    timestamp: r.created_at
                })).reverse(); // Reverse to get chronological order
                // Extract topics, standards, and clauses
                const topics = new Set();
                const standards = new Set();
                const clauses = [];
                const goals = [];
                for (const msg of recentMessages) {
                    if (msg.topic)
                        topics.add(msg.topic);
                    // Extract standards from messages
                    const standardMatch = msg.message.match(/\b(AS9100|AS9110|AS9120|ISO\s*9001|ISO\s*13485|FAA|CASA|EASA|UK\s*CAA|IATF\s*16949)\b/i);
                    if (standardMatch) {
                        standards.add(standardMatch[1].toUpperCase());
                    }
                    // Extract clauses
                    const clauseRefs = VeraClauseMatcher.extractClauseReferences(msg.message);
                    for (const clause of clauseRefs) {
                        clauses.push({
                            ref: clause.fullReference,
                            normalized: clause.normalized,
                            standardCode: msg.metadata?.standardCode
                        });
                    }
                    // Detect user goals
                    const goalPatterns = [
                        /(?:i want to|i need to|we're|we are|goal is|trying to)\s+(?:prepare for|implement|get certified|achieve|comply with)\s+([A-Z0-9\s]+)/i,
                        /(?:preparing for|implementing|working on)\s+([A-Z0-9\s]+)/i
                    ];
                    for (const pattern of goalPatterns) {
                        const match = msg.message.match(pattern);
                        if (match && match[1]) {
                            goals.push(match[1].trim());
                        }
                    }
                }
                // Resolve pronouns in current message
                const resolvedPronouns = this.resolvePronouns(currentMessage, {
                    lastTopics: Array.from(topics),
                    lastStandards: Array.from(standards),
                    lastClauses: clauses
                });
                // Determine conversation flow
                const conversationFlow = this.determineConversationFlow(currentMessage, recentMessages);
                // Get active context (most recent standard/clause/topic)
                const activeContext = {
                    currentStandard: Array.from(standards).pop(),
                    currentClause: clauses.length > 0 ? clauses[clauses.length - 1].normalized : undefined,
                    currentTopic: Array.from(topics).pop(),
                    conversationFlow
                };
                return {
                    sessionId,
                    tenantId,
                    userId,
                    recentMessages,
                    lastTopics: Array.from(topics),
                    lastStandards: Array.from(standards),
                    lastClauses: clauses.slice(-5), // Last 5 clauses
                    lastUserGoals: goals,
                    activeContext,
                    resolvedPronouns
                };
            }
            catch (error) {
                console.error('[VeraConversationContextBuilder] Error building context:', error.message);
                return {
                    sessionId,
                    tenantId,
                    userId,
                    recentMessages: [],
                    lastTopics: [],
                    lastStandards: [],
                    lastClauses: [],
                    lastUserGoals: [],
                    activeContext: {
                        conversationFlow: 'new_topic'
                    },
                    resolvedPronouns: {}
                };
            }
        }, 1 * 60 * 1000); // 1 minute cache
    }
    /**
     * Resolve pronouns in message based on conversation history
     */
    static resolvePronouns(message, context) {
        const resolved = {};
        const lower = message.toLowerCase();
        // "it" - usually refers to last mentioned clause or standard
        if (lower.includes(' it ') || lower.startsWith('it ') || lower.endsWith(' it')) {
            if (context.lastClauses.length > 0) {
                resolved['it'] = context.lastClauses[context.lastClauses.length - 1].normalized;
            }
            else if (context.lastStandards.length > 0) {
                resolved['it'] = context.lastStandards[context.lastStandards.length - 1];
            }
            else if (context.lastTopics.length > 0) {
                resolved['it'] = context.lastTopics[context.lastTopics.length - 1];
            }
        }
        // "that" / "that clause" - refers to last clause
        if (lower.includes('that clause') || lower.includes('that requirement')) {
            if (context.lastClauses.length > 0) {
                resolved['that'] = context.lastClauses[context.lastClauses.length - 1].normalized;
                resolved['the clause'] = context.lastClauses[context.lastClauses.length - 1].normalized;
            }
        }
        // "this" - refers to current topic
        if (lower.includes(' this ') || lower.startsWith('this ')) {
            if (context.lastTopics.length > 0) {
                resolved['this'] = context.lastTopics[context.lastTopics.length - 1];
            }
        }
        // "the standard" - refers to last standard
        if (lower.includes('the standard')) {
            if (context.lastStandards.length > 0) {
                resolved['the standard'] = context.lastStandards[context.lastStandards.length - 1];
            }
        }
        return resolved;
    }
    /**
     * Determine conversation flow type
     */
    static determineConversationFlow(currentMessage, recentMessages) {
        const lower = currentMessage.toLowerCase();
        // Follow-up indicators
        if (lower.match(/(?:tell me more|explain|what about|how about|and|also|what else)/i)) {
            return 'followup';
        }
        // Clarification indicators
        if (lower.match(/(?:what do you mean|clarify|can you explain|i don't understand)/i)) {
            return 'clarification';
        }
        // Question indicators
        if (lower.match(/(?:what|how|why|when|where|which|who)\s+/i) || lower.includes('?')) {
            return 'question';
        }
        // If no recent messages, it's a new topic
        if (recentMessages.length === 0) {
            return 'new_topic';
        }
        // Default to question
        return 'question';
    }
    /**
     * Expand message with resolved pronouns
     */
    static expandMessageWithContext(message, context) {
        let expanded = message;
        // Replace pronouns with their resolved values
        if (context.resolvedPronouns['it']) {
            expanded = expanded.replace(/\bit\b/gi, context.resolvedPronouns['it']);
        }
        if (context.resolvedPronouns['that']) {
            expanded = expanded.replace(/\bthat\s+clause\b/gi, `clause ${context.resolvedPronouns['that']}`);
            expanded = expanded.replace(/\bthat\b/gi, context.resolvedPronouns['that']);
        }
        if (context.resolvedPronouns['this']) {
            expanded = expanded.replace(/\bthis\b/gi, context.resolvedPronouns['this']);
        }
        if (context.resolvedPronouns['the clause']) {
            expanded = expanded.replace(/\bthe\s+clause\b/gi, `clause ${context.resolvedPronouns['the clause']}`);
        }
        if (context.resolvedPronouns['the standard']) {
            expanded = expanded.replace(/\bthe\s+standard\b/gi, context.resolvedPronouns['the standard']);
        }
        return expanded;
    }
}
//# sourceMappingURL=VeraConversationContextBuilder.js.map