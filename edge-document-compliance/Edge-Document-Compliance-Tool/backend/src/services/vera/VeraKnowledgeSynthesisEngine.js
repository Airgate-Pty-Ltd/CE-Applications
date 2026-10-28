/**
 * Vera Knowledge Synthesis Engine
 * 
 * Combines information from multiple sources to create comprehensive answers:
 * 1. Direct Q&A lookup (fastest)
 * 2. Document search (standards, requirements)
 * 3. Requirement matching (what standards apply)
 * 4. Terms and definitions search
 * 5. Synthesize into coherent response
 */

import { queryEdcatAI, queryPostgres } from '../../config/databases.js';
import VeraSemanticSearch from './VeraSemanticSearch.js';

class VeraKnowledgeSynthesisEngine {
  constructor() {
    // Pools are accessed via queryEdcatAI and queryPostgres functions
  }

  /**
   * Synthesize answer from multiple sources
   */
  async synthesizeAnswer(userQuery, context = {}) {
    try {
      console.log(`[Synthesis] Synthesizing answer for: "${userQuery}"`);
      
      // Get conversation context
      const conversationContext = context.conversationContext || {};
      
      // If this is a follow-up, enhance query with prior topic
      let enhancedQuery = userQuery;
      if (conversationContext.isFollowUp && conversationContext.topicHistory?.length > 0) {
        enhancedQuery = `${userQuery} related to ${conversationContext.topicHistory[0]}`;
        console.log(`[Synthesis] Follow-up detected. Enhanced query: ${enhancedQuery}`);
      }

      const sources = [];

      // STEP 1: Direct Q&A lookup (use enhanced query if available)
      const directMatch = await this.findDirectMatch(enhancedQuery || userQuery);
      if (directMatch) {
        sources.push(directMatch);
        console.log(`[Synthesis] ✅ Found direct Q&A match`);
      }

      // STEP 1.5: Semantic search for similar questions (use enhanced query)
      const semanticMatches = await VeraSemanticSearch.semanticSearchQA(enhancedQuery || userQuery, 3);
      if (semanticMatches.length > 0) {
        sources.push(...semanticMatches.map(m => ({
          type: 'semantic_qa',
          title: m.question,
          content: m.response,
          confidence: m.confidence * (m.semanticScore || 0.5)  // Adjust by semantic score
        })));
        console.log(`[Synthesis] ✅ Found ${semanticMatches.length} semantic matches`);
      }

      // STEP 2: Search relevant requirements (use enhanced query)
      const requirementMatches = await this.findApplicableRequirements(enhancedQuery || userQuery);
      if (requirementMatches.length > 0) {
        sources.push(...requirementMatches);
        console.log(`[Synthesis] ✅ Found ${requirementMatches.length} applicable requirements`);
      }

      // STEP 3: Search terms and definitions (use enhanced query)
      const termMatches = await this.searchTermsAndDefinitions(enhancedQuery || userQuery);
      if (termMatches.length > 0) {
        sources.push(...termMatches);
        console.log(`[Synthesis] ✅ Found ${termMatches.length} term definitions`);
      }

      // STEP 4: Find relevant standards (use enhanced query)
      const standardMatches = await this.findRelevantStandards(enhancedQuery || userQuery);
      if (standardMatches.length > 0) {
        sources.push(...standardMatches);
        console.log(`[Synthesis] ✅ Found ${standardMatches.length} relevant standards`);
      }

      // STEP 5: Synthesize all sources into coherent response
      if (sources.length === 0) {
        return {
          success: false,
          message: `I couldn't find information about "${userQuery}". Could you be more specific? For example: "What is ISO 9001?" or "Compare ISO 9001 to AS9100D"`,
          sourcesUsed: 0
        };
      }

      const synthesized = await this.combineSources(userQuery, sources, context);

      return {
        success: true,
        message: synthesized.message,
        sourcesUsed: sources.length,
        sources: sources.map(s => ({ type: s.type, title: s.title })),
        confidence: this.calculateConfidence(sources)
      };

    } catch (error) {
      console.error('[Synthesis] Error synthesizing answer:', error);
      return {
        success: false,
        message: `Error generating response: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * STEP 1: Direct Q&A lookup
   */
  async findDirectMatch(query) {
    try {
      const result = await queryEdcatAI(
        `SELECT 
          id, 
          COALESCE(question_text, user_query_pattern) as question_text, 
          response_text as response,
          category, 
          confidence_score
         FROM edcat.vera_query_response_bank
         WHERE persona_code = 'vera'
           AND is_active = TRUE
           AND (
             COALESCE(question_text, user_query_pattern) ILIKE $1 
             OR representative_examples::text ILIKE $1
           )
         ORDER BY confidence_score DESC
         LIMIT 1`,
        [`%${query}%`]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          type: 'qa_direct',
          title: row.question_text,
          content: row.response,
          category: row.category,
          confidence: parseFloat(row.confidence_score || 0.8)
        };
      }

      return null;

    } catch (error) {
      console.error('[Synthesis] Error in direct match:', error);
      return null;
    }
  }

  /**
   * STEP 2: Find applicable requirements
   */
  async findApplicableRequirements(query) {
    try {
      const result = await queryPostgres(
        `SELECT 
          pr.clause_number, 
          pr.requirement_text,
          pr.standard_id,
          s.code as standard_code,
          s.name as standard_name
         FROM public.parsed_requirements pr
         LEFT JOIN public.standards s ON pr.standard_id = s.id
         WHERE pr.requirement_text ILIKE $1
           AND pr.requirement_text IS NOT NULL
           AND LENGTH(pr.requirement_text) > 20
         LIMIT 5`,
        [`%${query}%`]
      );

      return result.rows.map(row => ({
        type: 'requirement',
        title: `${row.standard_code || 'Standard'} Clause ${row.clause_number || 'N/A'}`,
        content: row.requirement_text,
        standardCode: row.standard_code,
        clauseNumber: row.clause_number,
        confidence: 0.80
      }));

    } catch (error) {
      console.error('[Synthesis] Error finding requirements:', error);
      return [];
    }
  }

  /**
   * STEP 3: Search terms and definitions
   */
  async searchTermsAndDefinitions(query) {
    try {
      const result = await queryEdcatAI(
        `SELECT 
          term, 
          acronym,
          definition, 
          category,
          source_standard
         FROM edcat.terms_and_definitions
         WHERE term ILIKE $1 
           OR definition ILIKE $1 
           OR acronym ILIKE $1
         LIMIT 5`,
        [`%${query}%`]
      );

      return result.rows.map(row => ({
        type: 'term',
        title: row.term + (row.acronym ? ` (${row.acronym})` : ''),
        content: row.definition,
        category: row.category,
        sourceStandard: row.source_standard,
        confidence: 0.85
      }));

    } catch (error) {
      console.error('[Synthesis] Error searching terms:', error);
      return [];
    }
  }

  /**
   * STEP 4: Find relevant standards
   */
  async findRelevantStandards(query) {
    try {
      const result = await queryPostgres(
        `SELECT 
          id as standard_id,
          code,
          name,
          sector
         FROM public.standards
         WHERE code ILIKE $1 
           OR name ILIKE $1
         LIMIT 5`,
        [`%${query}%`]
      );

      return result.rows.map(row => ({
        type: 'standard',
        title: `${row.code} - ${row.name}`,
        content: `${row.code} (${row.name})${row.sector ? ` is a ${row.sector} standard` : ' is a compliance standard'}.`,
        standardCode: row.code,
        sector: row.sector,
        confidence: 0.82
      }));

    } catch (error) {
      console.error('[Synthesis] Error finding standards:', error);
      return [];
    }
  }

  /**
   * STEP 5: Combine multiple sources into coherent response
   */
  async combineSources(query, sources, context = {}) {
    try {
      // Sort by confidence
      sources.sort((a, b) => (b.confidence || 0.5) - (a.confidence || 0.5));

      let message = '';

      // Start with highest confidence source
      const primary = sources[0];
      if (primary.content) {
        message += `${primary.content}\n\n`;
      }

      // Add additional context from other sources
      if (sources.length > 1) {
        const secondary = sources.slice(1, 4);

        // Add related terms
        const terms = secondary.filter(s => s.type === 'term');
        if (terms.length > 0) {
          message += `**Related Terms:**\n`;
          terms.forEach(t => {
            message += `- ${t.title}: ${t.content ? t.content.substring(0, 150) : 'No definition available'}...\n`;
          });
          message += '\n';
        }

        // Add requirements
        const reqs = secondary.filter(s => s.type === 'requirement');
        if (reqs.length > 0) {
          message += `**Standards & Requirements:**\n`;
          reqs.forEach(r => {
            message += `- ${r.title}: ${r.content ? r.content.substring(0, 150) : 'No requirement text'}...\n`;
          });
          message += '\n';
        }

        // Add standards
        const standards = secondary.filter(s => s.type === 'standard');
        if (standards.length > 0) {
          message += `**Related Standards:**\n`;
          standards.forEach(s => {
            message += `- ${s.title}\n`;
          });
          message += '\n';
        }
      }

      // Add follow-up suggestion
      if (sources.length > 0) {
        message += `Would you like more details about any of these topics?`;
      }

      return { message };

    } catch (error) {
      console.error('[Synthesis] Error combining sources:', error);
      return {
        message: `I found relevant information about "${query}", but had trouble organizing it. Please ask more specifically.`
      };
    }
  }

  /**
   * Calculate overall confidence of answer
   */
  calculateConfidence(sources) {
    if (sources.length === 0) return 0;

    const avgConfidence = sources.reduce((sum, s) => sum + (s.confidence || 0.5), 0) / sources.length;
    const sourceBonus = Math.min(0.1, sources.length * 0.02);  // More sources = higher confidence

    return Math.min(0.99, avgConfidence + sourceBonus);
  }
}

export default VeraKnowledgeSynthesisEngine;

