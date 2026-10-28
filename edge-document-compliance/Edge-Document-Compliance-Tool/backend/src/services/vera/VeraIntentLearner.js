/**
 * Vera Intent Learner
 *
 * Learns intent patterns from conversation history.
 * Uses semantic similarity to find similar past questions and reuse successful intent patterns.
 *
 * 100% internal - no external LLM calls.
 */
import { queryEdcatAI } from '../../config/databases.js';
import VeraSemanticMemory from './VeraSemanticMemory.js';
import { VeraCacheService } from './VeraCacheService.js';
export class VeraIntentLearner {
    /**
     * Learn intent from conversation history
     */
    static async learnIntentFromHistory(params) {
        const { message, tenantId, sessionId, minSimilarity = 0.75 } = params;
        const cacheKey = `intent:learn:${tenantId}:${message.substring(0, 50).toLowerCase()}`;
        return VeraCacheService.getOrSet(cacheKey, async () => {
            try {
                // Step 1: Try semantic search in conversation history
                const semanticResults = await VeraSemanticMemory.semanticSearch({
                    query: message,
                    topK: 5,
                    sourceTypes: ['conversation'],
                    tenantId,
                    minSimilarity
                });
                // Step 2: For each similar conversation, get the intent that was used
                for (const result of semanticResults) {
                    if (result.similarity >= minSimilarity && result.sourceId) {
                        // Get the conversation history entry
                        const historyResult = await queryEdcatAI(`SELECT intent, topic, sub_intent, message_text, metadata
               FROM edcat.ai_conversation_history
               WHERE id = $1 AND tenant_id = $2
               LIMIT 1`, [result.sourceId, tenantId]).catch(() => ({ rows: [] }));
                        if (historyResult.rows.length > 0) {
                            const row = historyResult.rows[0];
                            if (row.intent) {
                                return {
                                    intent: row.intent,
                                    topic: row.topic || undefined,
                                    subIntent: row.sub_intent || undefined,
                                    confidence: Math.min(result.similarity + 0.1, 0.95),
                                    source: 'history',
                                    rationale: `Similar to: "${row.message_text?.substring(0, 50)}..."`,
                                    similarQuestion: row.message_text
                                };
                            }
                        }
                    }
                }
                // Step 3: Fallback to text-based similarity in conversation history
                const textResults = await queryEdcatAI(`SELECT intent, topic, sub_intent, message_text, metadata
           FROM edcat.ai_conversation_history
           WHERE tenant_id = $1
             AND role = 'user'
             AND message_text ILIKE $2
             AND intent IS NOT NULL
           ORDER BY created_at DESC
           LIMIT 5`, [tenantId, `%${message.substring(0, 30)}%`]).catch(() => ({ rows: [] }));
                if (textResults.rows.length > 0) {
                    // Use the most recent similar question
                    const row = textResults.rows[0];
                    return {
                        intent: row.intent,
                        topic: row.topic || undefined,
                        subIntent: row.sub_intent || undefined,
                        confidence: 0.8,
                        source: 'history',
                        rationale: `Text match with previous question`,
                        similarQuestion: row.message_text
                    };
                }
                // Step 4: Check for intent patterns in ai_router
                const routerResult = await queryEdcatAI(`SELECT rules, patterns
           FROM edcat.ai_router
           WHERE tenant_id = $1
             AND (rules::text ILIKE $2 OR patterns::text ILIKE $2)
           ORDER BY updated_at DESC
           LIMIT 1`, [tenantId, `%${message.substring(0, 20)}%`]).catch(() => ({ rows: [] }));
                if (routerResult.rows.length > 0) {
                    const rules = routerResult.rows[0].rules;
                    if (rules && typeof rules === 'object') {
                        // Try to extract intent from rules
                        const intent = rules.intent;
                        if (intent) {
                            return {
                                intent,
                                confidence: 0.75,
                                source: 'pattern',
                                rationale: 'Matched stored intent pattern'
                            };
                        }
                    }
                }
                return null;
            }
            catch (error) {
                console.error('[VeraIntentLearner] Error learning intent:', error.message);
                return null;
            }
        }, 5 * 60 * 1000); // 5 minute cache
    }
    /**
     * Store successful intent pattern for future use
     */
    static async storeIntentPattern(params) {
        const { tenantId, message, intent, topic, subIntent, success } = params;
        if (!success) {
            return; // Don't store unsuccessful patterns
        }
        try {
            // Store in ai_router for pattern matching
            await queryEdcatAI(`INSERT INTO edcat.ai_router
         (tenant_id, name, rules, patterns, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (tenant_id, name)
         DO UPDATE SET
           rules = EXCLUDED.rules,
           patterns = EXCLUDED.patterns,
           updated_at = NOW()`, [
                tenantId,
                `intent:${intent}:${Date.now()}`,
                JSON.stringify({ intent, topic, subIntent }),
                JSON.stringify([message.substring(0, 100)])
            ]).catch(() => { }); // Non-fatal
            // Store embedding for semantic search
            try {
                await VeraSemanticMemory.storeEmbedding({
                    sourceType: 'conversation',
                    sourceId: `intent:${intent}`,
                    text: message,
                    metadata: { intent, topic, subIntent, success: true },
                    tenantId
                });
            }
            catch (embedError) {
                console.warn('[VeraIntentLearner] Could not store embedding:', embedError.message);
            }
        }
        catch (error) {
            console.warn('[VeraIntentLearner] Error storing intent pattern:', error.message);
        }
    }
    /**
     * Get intent statistics for a tenant
     */
    static async getIntentStatistics(tenantId, limit = 10) {
        try {
            const result = await queryEdcatAI(`SELECT 
           intent,
           COUNT(*) as count,
           AVG((metadata->>'confidence')::float) as avg_confidence,
           MAX(created_at) as last_used
         FROM edcat.ai_conversation_history
         WHERE tenant_id = $1
           AND intent IS NOT NULL
         GROUP BY intent
         ORDER BY count DESC, last_used DESC
         LIMIT $2`, [tenantId, limit]);
            return result.rows.map((r) => ({
                intent: r.intent,
                count: parseInt(r.count) || 0,
                avgConfidence: parseFloat(r.avg_confidence) || 0.5,
                lastUsed: r.last_used
            }));
        }
        catch (error) {
            console.error('[VeraIntentLearner] Error getting statistics:', error.message);
            return [];
        }
    }
}
//# sourceMappingURL=VeraIntentLearner.js.map