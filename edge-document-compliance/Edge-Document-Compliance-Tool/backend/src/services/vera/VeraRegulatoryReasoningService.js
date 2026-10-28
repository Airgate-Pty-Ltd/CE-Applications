/**
 * Vera Regulatory Reasoning Service
 * 
 * Handles technical questions about regulatory standards (AS9100, ISO 9001, etc.)
 * Strictly grounded in clause text and parsed requirements
 * Does NOT fabricate or reinterpret clause text
 */

import { queryPostgres } from '../../config/databases.js';
import { runVera } from '../../vera/veraEngine.js';
import { getStandardClause, findStandardByCode } from './VeraClauseLookupService.js';

const REGULATORY_ANSWER_TEMPLATE = `You are Vera, a British/Scottish-flavoured Compliance & Quality Engineer.

You are assisting a senior quality leader with regulatory and standards questions.

When answering technical questions about regulatory standards (AS9100, ISO 9001, ISO 13485, IATF 16949, FAA Part 21, Part 145, etc.):

1) Start with a crisp definition or direct answer based on the clause text provided (1–2 sentences).

2) Expand with 2–4 short paragraphs explaining the requirement, its intent, and practical implications.

3) Provide at least one concrete example from manufacturing, repair, or engineering contexts.

4) End with exactly ONE short follow-up question that helps move the conversation forward.

CRITICAL RULES:
- You MUST only answer from the clause text and parsed requirements provided.
- You MUST NOT fabricate or reinterpret specific regulatory clause numbers.
- You MUST NOT invent requirements that are not in the provided text.
- If the clause text is not provided or unclear, you must state that clearly and suggest looking up the specific clause.

Use a professional tone with occasional subtle British/Scottish turns of phrase, but never at the expense of clarity.

Do NOT respond with greetings only when the user clearly asks a technical question.`;

class VeraRegulatoryReasoningService {
  /**
   * Answer regulatory technical question
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  static async answerRegulatoryQuestion({ tenantId, userId, messageText, conversationContext = {}, debugMode = false }) {
    try {
      // Extract standard and clause from message
      const lower = messageText.toLowerCase();
      
      // Find standard mentioned
      const standardCodes = ['as9100', 'as9100d', 'iso 9001', 'iso9001', 'iso 13485', 'iso13485', 'iatf 16949', 'iatf16949', 'as9110', 'as9120'];
      let standardCode = null;
      for (const code of standardCodes) {
        if (lower.includes(code)) {
          standardCode = code.replace(/\s+/g, '').toUpperCase();
          break;
        }
      }

      // Extract clause reference if present - handle various patterns
      // Patterns: "clause 8.7", "8.7", "what does 8.7 require", "clause 7.4"
      const clausePatterns = [
        /\bclause\s+([4-9]\.\d+(\.\d+)?(\s*[a-z])?)\b/i,
        /\b([4-9]\.\d+(\.\d+)?(\s*[a-z])?)\b/,
        /what\s+does\s+([4-9]\.\d+(\.\d+)?(\s*[a-z])?)\s+require/i
      ];
      
      let clauseRef = null;
      for (const pattern of clausePatterns) {
        const match = message.match(pattern);
        if (match) {
          clauseRef = match[1] ? match[1].replace(/\s+/g, '') : match[0].replace(/\s+/g, '');
          break;
        }
      }
      
      // Also check if standard is mentioned without explicit clause (e.g., "AS9100D clause 8.7")
      if (!clauseRef) {
        const standardClauseMatch = lower.match(/(?:as9100|iso\s*9001|iso\s*13485).*?([4-9]\.\d+(\.\d+)?(\s*[a-z])?)/);
        if (standardClauseMatch) {
          clauseRef = standardClauseMatch[1].replace(/\s+/g, '');
        }
      }

      let clauseData = null;
      let standardInfo = null;

      // If we have a standard and clause, look it up
      if (standardCode && clauseRef) {
        standardInfo = await findStandardByCode(standardCode);
        if (standardInfo) {
          clauseData = await getStandardClause(standardInfo.id, clauseRef, { tenantId, diagnostic: debugMode });
          
          // If clause not found, check if standard has ANY parsed requirements
          if (!clauseData?.found) {
            const { queryPostgres } = await import('../../config/databases.js');
            const reqCount = await queryPostgres(
              `SELECT COUNT(*) as count FROM public.parsed_requirements WHERE standard_id = $1`,
              [standardInfo.id]
            );
            const totalReqs = parseInt(reqCount.rows[0]?.count || 0);
            
            if (totalReqs === 0) {
              // Standard exists but has no parsed requirements
              return {
                text: `I can see that ${standardInfo.code || standardInfo.name} is in my database, but it hasn't been parsed yet. I cannot answer questions about specific clauses until the standard is parsed. Please run the parser on this standard first, then I can tell you what clause ${clauseRef} requires.`,
                foundClause: false,
                standard: standardInfo.code || standardInfo.name,
                clauseRef: clauseRef,
                needsParsing: true
              };
            }
          }
        }
      } else if (standardCode) {
        // Just standard, no clause - get standard overview
        standardInfo = await findStandardByCode(standardCode);
      } else if (clauseRef) {
        // Clause mentioned but no standard - try to infer from context or use default
        // For now, if no standard mentioned, we can't look up the clause
        return {
          text: `I see you're asking about clause ${clauseRef}, but I need to know which standard you're referring to. Please specify the standard (e.g., "AS9100D clause 8.7" or "ISO 9001 clause 7.4").`,
          foundClause: false,
          clauseRef: clauseRef
        };
      }

      // Build knowledge context
      let knowledgeText = '';
      if (clauseData && clauseData.found) {
        knowledgeText += `Standard: ${clauseData.standard.code || clauseData.standard.name}\n`;
        knowledgeText += `Clause: ${clauseData.clause.clauseNumber} - ${clauseData.clause.clauseTitle || 'No title'}\n\n`;
        knowledgeText += `Clause Text:\n${clauseData.clause.requirementText}\n\n`;
        
        if (clauseData.children && clauseData.children.length > 0) {
          knowledgeText += `Sub-clauses:\n`;
          for (const child of clauseData.children.slice(0, 5)) { // Limit to 5 children
            knowledgeText += `- ${child.clauseNumber}: ${child.requirementText.substring(0, 200)}...\n`;
          }
          knowledgeText += '\n';
        }
      } else if (standardInfo) {
        knowledgeText += `Standard: ${standardInfo.code || standardInfo.name}\n`;
        knowledgeText += `Standard Name: ${standardInfo.name || 'N/A'}\n\n`;
        if (clauseRef) {
          knowledgeText += `Note: Clause ${clauseRef} was not found in parsed requirements. The standard may need to be re-parsed, or the clause may not exist.\n\n`;
        }
      } else {
        knowledgeText += `Note: Standard "${standardCode || 'unknown'}" was not found in the database. You may need to upload and parse the standard first.\n\n`;
      }

      // Build prompt
      const userPrompt = `User question: ${messageText}

${knowledgeText}

Use the clause text above as your reference. If clause text is not available, explain what you know about the standard in general terms, but make it clear that specific clause details are not available.`;

      // Call LLM
      const llmResponse = await runVera(
        [
          { role: 'system', content: REGULATORY_ANSWER_TEMPLATE },
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
        foundClause: clauseData?.found || false,
        standard: standardInfo?.code || null,
        clauseRef: clauseRef || null
      };
    } catch (error) {
      console.error('[VeraRegulatoryReasoningService] Error:', error.message);
      return {
        text: "I encountered an error while looking up regulatory information. Could you try rephrasing your question or specifying the standard and clause number?",
        foundClause: false
      };
    }
  }
}

export default VeraRegulatoryReasoningService;

