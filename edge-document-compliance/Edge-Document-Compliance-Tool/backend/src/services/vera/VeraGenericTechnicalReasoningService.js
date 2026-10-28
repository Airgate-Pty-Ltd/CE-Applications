/**
 * Vera Generic Technical Reasoning Service
 * 
 * Handles generic technical questions that don't fit into quality_eng or regulatory domains
 * Uses general LLM knowledge + any available KB content
 */

import { queryEdcatAI } from '../../config/databases.js';
import { runVera } from '../../vera/veraEngine.js';
import VeraQueryResponseService from './VeraQueryResponseService.js';

const GENERIC_TECHNICAL_ANSWER_TEMPLATE = `You are Vera, a British/Scottish-flavoured Compliance & Quality Engineer.

You are assisting a senior quality leader with technical questions.

When answering technical questions:

1) Start with a crisp definition or direct answer (1–2 sentences).

2) Expand with 2–4 short paragraphs explaining the concept, its importance, and practical applications.

3) Provide at least one concrete example from manufacturing, repair, or engineering contexts.

4) End with exactly ONE short follow-up question that helps move the conversation forward.

You may use your general knowledge of quality engineering, compliance, manufacturing, and engineering practices.

Use a professional tone with occasional subtle British/Scottish turns of phrase, but never at the expense of clarity.

Do NOT respond with greetings only when the user clearly asks a technical question.`;

class VeraGenericTechnicalReasoningService {
  /**
   * Answer generic technical question
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  static async answerGenericTechnicalQuestion({ tenantId, userId, messageText, conversationContext = {}, debugMode = false }) {
    try {
      // Try Q&A bank first
      const qaMatch = await VeraQueryResponseService.findBestMatch(messageText, tenantId);
      
      let knowledgeText = '';
      if (qaMatch && qaMatch.score > 0.3) {
        knowledgeText += `Relevant Knowledge Base Entry:\n${qaMatch.response_text || ''}\n\n`;
      }

      // Build prompt
      const userPrompt = `User question: ${messageText}

${knowledgeText ? `${knowledgeText}Use the knowledge base entry above as context, but feel free to expand with your general knowledge.\n\n` : ''}Answer the question using your general knowledge of quality engineering, compliance, and manufacturing practices.`;

      // Use VeraCoreEngine instead of external LLM (self-contained)
      try {
        const { generateVeraResponse } = await import('./VeraCoreEngine.js');
        const veraResponse = await generateVeraResponse({
          message: messageText,
          sessionId: `session-${Date.now()}`,
          userId: userId || 'system',
          tenantId: tenantId || '00000000-0000-0000-0000-000000000000',
          debugMode: debugMode || false
        });
        
        const answer = veraResponse.answer || '';
        
        if (answer && veraResponse.mode !== 'error') {
          return {
            text: answer.trim(),
            usedQABank: qaMatch && qaMatch.score > 0.3
          };
        }
      } catch (veraError) {
        console.warn('[VeraGenericTechnicalReasoningService] VeraCoreEngine failed, trying legacy LLM:', veraError.message);
      }

      // Legacy fallback: Try external LLM (will fail if VERA_MODEL_ENDPOINT not set, but that's expected)
      try {
        const llmResponse = await runVera(
          [
            { role: 'system', content: GENERIC_TECHNICAL_ANSWER_TEMPLATE },
            { role: 'user', content: userPrompt }
          ],
          {
            tenantId,
            userId,
            mode: 'reasoning'
          }
        );

        const answer = llmResponse.answer || llmResponse.content || '';

      return {
        text: answer.trim(),
        usedQABank: qaMatch && qaMatch.score > 0.3
      };
    } catch (error) {
      console.error('[VeraGenericTechnicalReasoningService] Error:', error.message);
      return {
        text: "I encountered an error while processing your question. Could you try rephrasing it?",
        usedQABank: false
      };
    }
  }
}

export default VeraGenericTechnicalReasoningService;

