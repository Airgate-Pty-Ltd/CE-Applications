/**
 * Vera Query-Response Service
 * Manages Q&A knowledge base and "I don't know, teach me" learning loop
 */

import { queryEdcatAI } from '../../config/databases.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

class VeraQueryResponseService {
  /**
   * Helper: Extract meaningful keywords from message
   * @param {string} message - User message
   * @returns {Array<string>} Key terms
   */
  /**
   * EXTRACT KEY TERMS: Remove stopwords, extract meaningful terms
   * Input: "can you tell me the time?" → ["tell", "time"]
   * Input: "what is ISO 9001?" → ["iso", "9001"]
   * Input: "14971" → ["14971"]
   */
  static extractKeyTerms(message) {
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'is', 'are', 'was', 'were', 'be', 'have', 'has', 'had', 'do',
      'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'can', 'you', 'me', 'i', 'we', 'they', 'what', 'when', 'where', 'why',
      'how', 'as', 'if', 'with', 'by', 'from', 'up', 'about', 'that', 'this',
      'it', 'there', 'here', 'your', 'my', 'his', 'her', 'our', 'their',
      'vera', 'please', 'help', 'tell', 'give', 'show'
    ]);

    // Split on whitespace and punctuation
    const words = (message || '')
      .toLowerCase()
      .split(/[\s\-_.,!?;:'"()]+/)
      .filter(w => w.length > 0 && !stopwords.has(w));

    return [...new Set(words)];  // Remove duplicates, return array
  }

  /**
   * Helper: Calculate how much key terms overlap with text
   * @param {Array<string>} keyTerms - Key terms to search for
   * @param {string} text - Text to search in
   * @returns {number} Overlap score (0.0 to 1.0)
   */
  static calculateTermOverlap(keyTerms, text) {
    if (!text || keyTerms.length === 0) return 0;

    const lowerText = text.toLowerCase();
    const matches = keyTerms.filter(term => lowerText.includes(term)).length;
    
    return matches / keyTerms.length;
  }

  /**
   * VERA CRITICAL FIX: Intelligent matching with NO false positives
   * 
   * Priority system:
   * 1. Exact term match (highest priority)
   * 2. Acronym match (ISO 9001, AS9100D, etc.)
   * 3. Term overlap (70%+ words match)
   * 4. Intent-aware routing (definition questions to terminology)
   * 5. NULL if nothing good (forces clarifying question)
   * 
   * @param {Object} options
   * @param {string} options.tenantId - Tenant ID
   * @param {string} options.personaCode - Persona code (default 'vera')
   * @param {string} options.message - User message
   * @param {string} options.intent - Detected intent
   * @param {string} options.category - Optional category filter
   * @returns {Promise<Object|null>} Best matching Q&A entry or null
   */
  static async findBestMatch({ tenantId = DEFAULT_TENANT_ID, personaCode = 'vera', message, intent = null, category = null }) {
    try {
      const lowerInput = (message || '').toLowerCase().trim();
      
      if (!lowerInput) {
        console.log('[QA-LOOKUP] ⚠️ Empty message, returning null');
        return null;
      }

      console.log(`[QA-LOOKUP] STEP 1: EXACT MATCH CHECK for: "${lowerInput}"`);
      
      // STEP 1: EXACT MATCH CHECK
      const exactMatch = await this.getExactTermMatch(lowerInput, tenantId, personaCode);
      if (exactMatch && parseFloat(exactMatch.confidence_score || 0) >= 0.85) {
        console.log(`[QA-LOOKUP] ✅ EXACT MATCH: ${exactMatch.question_text || exactMatch.user_query_pattern}`);
        return exactMatch;
      }
      
      console.log(`[QA-LOOKUP] STEP 2: ACRONYM/STANDARD CODE MATCH`);
      
      // STEP 2: ACRONYM/STANDARD CODE MATCH
      const standardMatch = await this.findStandardMatch(lowerInput, tenantId, personaCode);
      if (standardMatch && parseFloat(standardMatch.confidence_score || 0) >= 0.80) {
        console.log(`[QA-LOOKUP] ✅ STANDARD MATCH: ${standardMatch.question_text || standardMatch.user_query_pattern}`);
        return standardMatch;
      }
      
      console.log(`[QA-LOOKUP] STEP 3: TERM OVERLAP SCORING`);
      
      // STEP 3: TERM OVERLAP SCORING
      const terms = this.extractKeyTerms(lowerInput);
      const scoredMatches = await this.scoreByTermOverlap(terms, tenantId, personaCode);
      
      if (scoredMatches.length > 0) {
        const bestMatch = scoredMatches[0];
        if (bestMatch.score >= 0.70) {
          console.log(`[QA-LOOKUP] ✅ TERM MATCH: ${bestMatch.question_text || bestMatch.user_query_pattern} (score: ${bestMatch.score})`);
          return bestMatch;
        }
      }
      
      console.log(`[QA-LOOKUP] STEP 4: INTENT-AWARE ROUTING`);
      
      // STEP 4: INTENT-AWARE ROUTING
      if (intent === 'definition_question') {
        const termMatch = await this.findInTerminology(terms, tenantId);
        if (termMatch) {
          console.log(`[QA-LOOKUP] ✅ TERMINOLOGY MATCH: ${termMatch.term}`);
          return this.formatTerminologyAsQA(termMatch);
        }
      }
      
      // STEP 5: NO GOOD MATCH FOUND
      console.log(`[QA-LOOKUP] ❌ NO GOOD MATCH: Input "${message}" (score threshold not met)`);
      return null;

    } catch (error) {
      console.error('[QA-LOOKUP] Error in findBestMatch:', error.message);
      return null;
    }
  }

  /**
   * STEP 1: EXACT MATCH - User input exactly matches a Q&A question or pattern
   */
  static async getExactTermMatch(lowerInput, tenantId, personaCode) {
    const query = `
      SELECT id, tenant_id, persona_code, category, 
             COALESCE(question_text, user_query_pattern) as question_text, 
             response_text as response,
             confidence_score, usage_count
      FROM edcat.vera_query_response_bank
      WHERE tenant_id = $1 
        AND persona_code = $2
        AND is_active = TRUE
        AND (
          LOWER(COALESCE(question_text, user_query_pattern)) = $3
          OR LOWER(user_query_pattern) = $3
        )
      LIMIT 1
    `;
    
    const result = await queryEdcatAI(query, [tenantId, personaCode, lowerInput]);
    return result.rows[0] || null;
  }

  /**
   * STEP 2: STANDARD CODE MATCH - Extract ISO/AS/FAA codes from input
   */
  static async findStandardMatch(lowerInput, tenantId, personaCode) {
    // Extract possible standard codes
    const codePatterns = [
      /(\d{4,5})/,  // 9001, 14971, 27001, etc.
      /iso[\s-]*(\d{4,5})/i,  // ISO 9001, ISO-27001
      /as[\s-]*(\d+[a-z]?)/i,  // AS9100D, AS6500
      /faa[\s-]*part[\s-]*(\d+)/i,  // FAA Part 120
    ];
    
    for (const pattern of codePatterns) {
      const match = lowerInput.match(pattern);
      if (match) {
        const code = match[1] || match[0];
        
        // Search for this code in Q&A bank
        const query = `
          SELECT id, 
                 COALESCE(question_text, user_query_pattern) as question_text,
                 response_text as response,
                 confidence_score
          FROM edcat.vera_query_response_bank
          WHERE tenant_id = $1 
            AND persona_code = $2
            AND is_active = TRUE
            AND (
              COALESCE(question_text, user_query_pattern) ILIKE '%' || $3 || '%'
              OR response_text ILIKE '%' || $3 || '%'
            )
          ORDER BY confidence_score DESC
          LIMIT 1
        `;
        
        const result = await queryEdcatAI(query, [tenantId, personaCode, code]);
        if (result.rows[0]) {
          console.log(`[QA-LOOKUP] Found standard: ${code}`);
          return result.rows[0];
        }
      }
    }
    
    return null;
  }

  /**
   * STEP 3: TERM OVERLAP SCORING - How many meaningful terms overlap?
   */
  static async scoreByTermOverlap(inputTerms, tenantId, personaCode) {
    const query = `
      SELECT id, 
             COALESCE(question_text, user_query_pattern) as question_text,
             response_text as response,
             confidence_score,
             LOWER(COALESCE(question_text, user_query_pattern)) as q_lower
      FROM edcat.vera_query_response_bank
      WHERE tenant_id = $1 
        AND persona_code = $2
        AND is_active = TRUE
    `;
    
    const result = await queryEdcatAI(query, [tenantId, personaCode]);
    
    const scored = result.rows.map(row => {
      // Extract terms from Q&A question
      const qaTerms = new Set(
        (row.q_lower || '')
          .split(/[\s\-_.,!?;:'"()]+/)
          .filter(w => w.length > 2)
      );
      
      // Calculate overlap
      const overlap = inputTerms.filter(t => qaTerms.has(t)).length;
      const score = inputTerms.length > 0 ? overlap / inputTerms.length : 0;
      
      return {
        ...row,
        score: parseFloat(score.toFixed(2))
      };
    });
    
    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * STEP 4: TERMINOLOGY LOOKUP - For "What is ISO 9001?" questions
   */
  static async findInTerminology(terms, tenantId) {
    if (terms.length === 0) return null;
    
    // Search first term in terminology
    const query = `
      SELECT term, definition, acronym
      FROM edcat.terms_and_definitions
      WHERE (tenant_id = $1 OR tenant_id IS NULL)
        AND (
          LOWER(term) ILIKE $2
          OR LOWER(acronym) ILIKE $2
        )
      LIMIT 1
    `;
    
    const result = await queryEdcatAI(query, [tenantId, `%${terms[0]}%`]);
    return result.rows[0] || null;
  }

  /**
   * FORMAT TERMINOLOGY AS Q&A - Convert term to Q&A response format
   */
  static formatTerminologyAsQA(term) {
    return {
      id: null,
      question_text: `What is ${term.term}?`,
      response_text: `${term.definition}${term.acronym ? ` (${term.acronym})` : ''}`,
      confidence_score: 0.85,
      category: 'terminology'
    };
  }

  /**
   * Log a missing knowledge event
   * @param {Object} options
   * @param {string} options.tenantId - Tenant ID
   * @param {string} options.personaCode - Persona code
   * @param {string} options.sessionId - Session ID
   * @param {string} options.message - User query
   * @param {string} options.intent - Detected intent
   * @param {Object} options.context - Conversation context
   * @param {string} options.userId - User ID who asked
   * @returns {Promise<Object>} Created log entry
   */
  static async logMissingKnowledge({ tenantId = DEFAULT_TENANT_ID, personaCode = 'vera', sessionId = null, message, intent = null, context = {}, userId = null }) {
    try {
      const result = await queryEdcatAI(
        `INSERT INTO edcat.vera_missing_knowledge_log 
         (tenant_id, persona_code, session_id, user_query, detected_intent, context, created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'awaiting_training')
         RETURNING id, created_at`,
        [tenantId, personaCode, sessionId, message, intent, JSON.stringify(context), userId]
      );

      if (result.rows.length > 0) {
        console.log(`[VeraQueryResponseService] Logged missing knowledge: ${message.substring(0, 50)}...`);
        return result.rows[0];
      }

      return null;
    } catch (error) {
      console.error('[VeraQueryResponseService] Error logging missing knowledge:', error);
      return null;
    }
  }

  /**
   * Create a new Q&A entry
   * @param {Object} options
   * @param {string} options.tenantId - Tenant ID (null for global)
   * @param {string} options.personaCode - Persona code
   * @param {string} options.category - Category
   * @param {string} options.userQueryPattern - Query pattern (regex)
   * @param {Array} options.examples - Representative examples
   * @param {string} options.responseTemplate - Response template
   * @param {Object} options.learningNotes - Learning notes
   * @param {number} options.confidenceScore - Confidence score (0.0-1.0)
   * @param {string} options.userId - User who created this
   * @returns {Promise<Object>} Created entry
   */
  static async createQueryResponseEntry({ tenantId = null, personaCode = 'vera', category, userQueryPattern, examples = [], responseText, responseTemplate, learningNotes = null, confidenceScore = 0.8, userId = null }) {
    // Support both responseText (new) and responseTemplate (legacy) for backward compatibility
    const actualResponseText = responseText || responseTemplate || '';
    
    // Auto-index after creation
    let qnaId = null;
    try {
      const result = await queryEdcatAI(
        `INSERT INTO edcat.vera_query_response_bank 
         (tenant_id, persona_code, category, user_query_pattern, representative_examples, response_text, learning_notes, confidence_score, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, created_at`,
        [
          tenantId,
          personaCode,
          category,
          userQueryPattern,
          JSON.stringify(examples),
          actualResponseText,
          learningNotes ? JSON.stringify(learningNotes) : null,
          confidenceScore,
          userId
        ]
      );

      if (result.rows.length > 0) {
        const qnaEntry = result.rows[0];
        console.log(`[VeraQueryResponseService] Created Q&A entry: ${category} - ${userQueryPattern.substring(0, 30)}...`);
        
        // Auto-index the new Q&A entry
        try {
          const VeraAutoIndexingService = (await import('./VeraAutoIndexingService.js')).default;
          await VeraAutoIndexingService.indexQAPair({
            qnaId: qnaEntry.id,
            tenantId
          });
        } catch (indexError) {
          console.warn('[VeraQueryResponseService] Could not auto-index Q&A entry:', indexError.message);
        }
        
        return qnaEntry;
      }

      return null;
    } catch (error) {
      console.error('[VeraQueryResponseService] Error creating Q&A entry:', error);
      throw error;
    }
  }

  /**
   * Resolve a missing knowledge entry by linking it to a Q&A entry
   * @param {string} missingKnowledgeId - Missing knowledge log ID
   * @param {string} queryResponseId - Q&A entry ID
   * @param {string} trainingNotes - Optional training notes
   * @returns {Promise<boolean>} Success
   */
  static async resolveMissingKnowledgeEntry(missingKnowledgeId, queryResponseId, trainingNotes = null) {
    try {
      await queryEdcatAI(
        `SELECT edcat.resolve_missing_knowledge($1, $2, $3)`,
        [missingKnowledgeId, queryResponseId, trainingNotes]
      );
      console.log(`[VeraQueryResponseService] Resolved missing knowledge entry: ${missingKnowledgeId}`);
      return true;
    } catch (error) {
      console.error('[VeraQueryResponseService] Error resolving missing knowledge:', error);
      return false;
    }
  }

  /**
   * Get pending missing knowledge entries
   * @param {Object} options
   * @param {string} options.tenantId - Tenant ID
   * @param {number} options.limit - Limit results
   * @returns {Promise<Array>} Pending entries
   */
  static async getPendingMissingKnowledge({ tenantId = DEFAULT_TENANT_ID, limit = 50 }) {
    try {
      const result = await queryEdcatAI(
        `SELECT 
          id,
          user_query,
          detected_intent,
          context,
          created_at
         FROM edcat.vera_missing_knowledge_log
         WHERE status = 'awaiting_training'
           AND (tenant_id = $1 OR tenant_id IS NULL)
         ORDER BY created_at DESC
         LIMIT $2`,
        [tenantId, limit]
      );

      return result.rows || [];
    } catch (error) {
      console.error('[VeraQueryResponseService] Error getting pending missing knowledge:', error);
      return [];
    }
  }

  /**
   * Get Q&A entries by category
   * @param {Object} options
   * @param {string} options.category - Category
   * @param {string} options.tenantId - Tenant ID
   * @param {number} options.limit - Limit results
   * @returns {Promise<Array>} Q&A entries
   */
  static async getByCategory({ category, tenantId = DEFAULT_TENANT_ID, limit = 20 }) {
    try {
      const result = await queryEdcatAI(
        `SELECT 
          id,
          category,
          user_query_pattern,
          representative_examples,
          response_text,
          usage_count,
          last_used_at
         FROM edcat.vera_active_query_responses
         WHERE category = $1
           AND (tenant_id = $2 OR tenant_id IS NULL)
         ORDER BY usage_count DESC, last_used_at DESC
         LIMIT $3`,
        [category, tenantId, limit]
      );

      return result.rows || [];
    } catch (error) {
      console.error('[VeraQueryResponseService] Error getting by category:', error);
      return [];
    }
  }
}

export default VeraQueryResponseService;

