/**
 * Vera Loop Avoidance Service
 * 
 * Prevents Vera from repeating the same responses in conversation.
 * Detects duplicate questions and varies responses or acknowledges repetition.
 */

import { queryEdcatAI } from '../../config/databases.js';
import { veraEngineHealth } from './VeraEngineHealthService.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

class VeraLoopAvoidanceService {
  /**
   * Check if the current question is similar to a recent question
   * @param {Object} params
   * @param {string} params.tenantId
   * @param {string} params.sessionId
   * @param {string} params.userMessage - Current user message
   * @param {string} params.proposedResponse - Response Vera is about to give
   * @param {number} [params.lookbackLimit=5] - Number of recent messages to check
   * @param {number} [params.similarityThreshold=0.85] - Similarity threshold (0-1)
   * @returns {Promise<Object>} { isDuplicate: boolean, previousResponse: string|null, variation: string|null }
   */
  static async checkForDuplicateResponse({ 
    tenantId, 
    sessionId, 
    userMessage, 
    proposedResponse,
    lookbackLimit = 5,
    similarityThreshold = 0.85 
  }) {
    try {
      // Get recent conversation history
      // ✅ FIX: Use message_text (new column) with fallback to message (legacy)
      const recentHistory = await queryEdcatAI(
        `SELECT role, COALESCE(message_text, message) as message, created_at
         FROM edcat.ai_conversation_history
         WHERE tenant_id = $1 
           AND session_id = $2
           AND persona_code = 'vera'
         ORDER BY created_at DESC
         LIMIT $3`,
        [tenantId || DEFAULT_TENANT_ID, sessionId, lookbackLimit * 2] // Get more to account for user/assistant pairs
      );

      if (recentHistory.rows.length === 0) {
        return { isDuplicate: false, previousResponse: null, variation: null };
      }

      // Check for similar user questions
      const userMessages = recentHistory.rows.filter(r => r.role === 'user');
      const assistantResponses = recentHistory.rows.filter(r => r.role === 'assistant');

      // Simple text similarity check (normalized)
      const normalizedUserMessage = this._normalizeText(userMessage);
      
      for (const prevUserMsg of userMessages.slice(0, lookbackLimit)) {
        const normalizedPrev = this._normalizeText(prevUserMsg.message);
        const similarity = this._calculateSimilarity(normalizedUserMessage, normalizedPrev);
        
        if (similarity >= similarityThreshold) {
          // Find the corresponding assistant response
          const responseIndex = recentHistory.rows.findIndex(r => 
            r.role === 'assistant' && 
            new Date(r.created_at) > new Date(prevUserMsg.created_at) &&
            recentHistory.rows.indexOf(r) < recentHistory.rows.indexOf(prevUserMsg)
          );
          
          let previousResponse = null;
          if (responseIndex >= 0) {
            previousResponse = recentHistory.rows[responseIndex].message;
          } else {
            // Try to find the next assistant response after this user message
            const afterIndex = recentHistory.rows.findIndex(r => 
              r.role === 'assistant' && 
              new Date(r.created_at) > new Date(prevUserMsg.created_at)
            );
            if (afterIndex >= 0) {
              previousResponse = recentHistory.rows[afterIndex].message;
            }
          }

          // Check if proposed response is also similar to previous response
          if (previousResponse) {
            const responseSimilarity = this._calculateSimilarity(
              this._normalizeText(proposedResponse),
              this._normalizeText(previousResponse)
            );

            // Only treat as duplicate if:
            // 1. User question is very similar (>= 0.98)
            // 2. Response is very similar (>= 0.98)
            // 3. Within short time window (30 seconds)
            const timeDiff = Date.now() - new Date(prevUserMsg.created_at).getTime();
            const withinShortWindow = timeDiff < 30000; // 30 seconds
            
            if (responseSimilarity >= 0.98 && similarity >= 0.98 && withinShortWindow) {
              // Genuine loop - record issue and generate a variation
              veraEngineHealth.recordIssue(
                'RESPONSE_LOOP_DETECTED',
                'I have detected that I am repeating the same answer to the same question. ' +
                  'This usually means I\'m missing context or something is misconfigured.',
                'warning',
                {
                  userSimilarity: similarity,
                  responseSimilarity: responseSimilarity,
                  timeWindow: timeDiff,
                  source: 'VeraLoopAvoidanceService'
                }
              );
              const variation = this._generateVariation(proposedResponse, previousResponse);
              return {
                isDuplicate: true,
                previousResponse,
                variation,
                similarity: Math.max(similarity, responseSimilarity)
              };
            }
            // If outside time window or similarity is lower, allow the response
            // This prevents blocking improved responses after fixes
          }

          return {
            isDuplicate: true,
            previousResponse: previousResponse || 'I previously answered a similar question.',
            variation: null,
            similarity
          };
        }
      }

      // Check if proposed response is too similar to recent responses
      const normalizedProposed = this._normalizeText(proposedResponse);
      for (const prevResponse of assistantResponses.slice(0, lookbackLimit)) {
        const normalizedPrev = this._normalizeText(prevResponse.message);
        const similarity = this._calculateSimilarity(normalizedProposed, normalizedPrev);
        
        if (similarity >= similarityThreshold) {
          const variation = this._generateVariation(proposedResponse, prevResponse.message);
          return {
            isDuplicate: true,
            previousResponse: prevResponse.message,
            variation,
            similarity
          };
        }
      }

      return { isDuplicate: false, previousResponse: null, variation: null };
    } catch (error) {
      console.error('[VeraLoopAvoidance] Error checking for duplicates:', error);
      // Fail open - don't block responses if check fails
      return { isDuplicate: false, previousResponse: null, variation: null };
    }
  }

  /**
   * Normalize text for comparison (lowercase, remove extra whitespace, remove punctuation)
   * @param {string} text
   * @returns {string}
   */
  static _normalizeText(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  }

  /**
   * Calculate simple similarity between two texts (Jaccard similarity on words)
   * @param {string} text1
   * @param {string} text2
   * @returns {number} Similarity score 0-1
   */
  static _calculateSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));
    
    if (words1.size === 0 && words2.size === 0) return 1;
    if (words1.size === 0 || words2.size === 0) return 0;
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Generate a variation of the response to avoid exact repetition
   * @param {string} proposedResponse
   * @param {string} previousResponse
   * @returns {string}
   */
  static _generateVariation(proposedResponse, previousResponse) {
    // If responses are very similar, add an acknowledgment
    const normalizedProposed = this._normalizeText(proposedResponse);
    const normalizedPrevious = this._normalizeText(previousResponse);
    const similarity = this._calculateSimilarity(normalizedProposed, normalizedPrevious);

    if (similarity >= 0.9) {
      // Very similar - acknowledge and offer to elaborate
      return `As I mentioned before, ${proposedResponse}\n\nWould you like me to elaborate on any specific aspect, or do you have a follow-up question?`;
    } else if (similarity >= 0.7) {
      // Somewhat similar - add a brief acknowledgment
      return `${proposedResponse}\n\n(Note: I've covered similar ground before. Let me know if you need more detail on any particular point.)`;
    }

    // Not similar enough to need variation
    return proposedResponse;
  }

  /**
   * Apply loop avoidance to a response
   * @param {Object} params
   * @param {string} params.tenantId
   * @param {string} params.sessionId
   * @param {string} params.userMessage
   * @param {string} params.proposedResponse
   * @returns {Promise<string>} Final response (may be modified to avoid loops)
   */
  static async applyLoopAvoidance({ tenantId, sessionId, userMessage, proposedResponse }) {
    try {
      // Get recent conversation history - check BOTH tables
      const [historyResult, memoryResult] = await Promise.all([
        queryEdcatAI(
          `SELECT role, COALESCE(message_text, message) as message, created_at
           FROM edcat.ai_conversation_history
           WHERE tenant_id = $1 
             AND session_id = $2
             AND persona_code = 'vera'
           ORDER BY created_at DESC
           LIMIT 10`,
          [tenantId || DEFAULT_TENANT_ID, sessionId]
        ).catch(() => ({ rows: [] })),
        queryEdcatAI(
          `SELECT 
             CASE WHEN metadata->>'role' = 'user' THEN 'user' ELSE 'assistant' END as role,
             message_text as message, 
             created_at
           FROM edcat.conversation_memory
           WHERE tenant_id = $1 
             AND session_id = $2
           ORDER BY created_at DESC
           LIMIT 10`,
          [tenantId || DEFAULT_TENANT_ID, sessionId]
        ).catch(() => ({ rows: [] }))
      ]);

      const allHistory = [...(historyResult.rows || []), ...(memoryResult.rows || [])]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);

      const normalizedUserMessage = this._normalizeText(userMessage);
      const normalizedProposedResponse = this._normalizeText(proposedResponse);

      // Check for duplicate user questions
      // CRITICAL: Only flag as duplicate if BOTH question AND response are very similar AND within short time window
      for (let i = 0; i < allHistory.length; i++) {
        const entry = allHistory[i];
        if (entry.role === 'user') {
          const normalizedHistory = this._normalizeText(entry.message);
          const userSimilarity = this._calculateSimilarity(normalizedUserMessage, normalizedHistory);
          
          // Only check if user question is VERY similar (>= 0.98) to prevent false positives
          if (userSimilarity >= 0.98) {
            // Check time window - only flag if within 30 seconds
            const timeDiff = Date.now() - new Date(entry.created_at).getTime();
            const withinShortWindow = timeDiff < 30000; // 30 seconds
            
            if (!withinShortWindow) {
              continue; // Outside time window, not a loop
            }
            
            // Find the assistant response that came after this user message
            const assistantResponse = allHistory.find((e, idx) => 
              idx < i && e.role === 'assistant' && new Date(e.created_at) > new Date(entry.created_at)
            );
            
            if (assistantResponse) {
              const responseSimilarity = this._calculateSimilarity(
                normalizedProposedResponse,
                this._normalizeText(assistantResponse.message)
              );
              
              // Check if message is too recent (likely a retry, not a real loop)
              const timeSinceLastMessage = Date.now() - new Date(entry.created_at).getTime();
              if (timeSinceLastMessage < 200) {
                // Message within 200ms = likely retry, not real loop
                return proposedResponse; // Return original response without loop warning
              }
              
              // Only flag as loop if it's a repeated message with high similarity AND enough time has passed
              const lastMessage = normalizedHistory;
              const currentMessage = normalizedUserMessage;
              if (lastMessage === currentMessage && timeSinceLastMessage > 2000) {
                // Genuine loop - same message repeated after 2+ seconds
                console.log(`[VeraLoopAvoidance] ⚠️  Detected potential loop (user: ${(userSimilarity * 100).toFixed(1)}%, response: ${(responseSimilarity * 100).toFixed(1)}%, time: ${timeDiff}ms)`);
                // Don't block, but add a note
                return `${proposedResponse}\n\n*Note: I've provided similar information recently. If you need more detail, please let me know what specific aspect you'd like me to focus on.*`;
              }
              
              // Only flag if BOTH question AND response are >= 98% similar AND within time window
              if (responseSimilarity >= 0.98 && withinShortWindow && timeSinceLastMessage > 2000) {
                console.log(`[VeraLoopAvoidance] ⚠️  Detected potential loop (user: ${(userSimilarity * 100).toFixed(1)}%, response: ${(responseSimilarity * 100).toFixed(1)}%, time: ${timeDiff}ms)`);
                // Don't block, but add a note
                return `${proposedResponse}\n\n*Note: I've provided similar information recently. If you need more detail, please let me know what specific aspect you'd like me to focus on.*`;
              }
            }
          }
        }
      }

      // Check for duplicate assistant responses (even if question is different)
      // CRITICAL: Only flag if response is >= 98% similar AND within 30 seconds
      for (const entry of allHistory) {
        if (entry.role === 'assistant') {
          const timeDiff = Date.now() - new Date(entry.created_at).getTime();
          const withinShortWindow = timeDiff < 30000; // 30 seconds
          
          if (!withinShortWindow) {
            continue; // Outside time window, not a loop
          }
          
          const normalizedHistory = this._normalizeText(entry.message);
          const responseSimilarity = this._calculateSimilarity(normalizedProposedResponse, normalizedHistory);
          
          // Only flag if >= 98% similar AND within time window
          if (responseSimilarity >= 0.98 && withinShortWindow) {
            console.log(`[VeraLoopAvoidance] ⚠️  Detected duplicate response (${(responseSimilarity * 100).toFixed(1)}% similar, time: ${timeDiff}ms)`);
            // Don't block, but add a note
            return `${proposedResponse}\n\n*Note: I've provided similar information recently. If you need more detail, please let me know what specific aspect you'd like me to focus on.*`;
          }
        }
      }

      return proposedResponse;
    } catch (error) {
      console.error('[VeraLoopAvoidance] Error applying loop avoidance:', error.message);
      return proposedResponse; // Fail-open: return original response on error
    }
  }
}

export default VeraLoopAvoidanceService;

