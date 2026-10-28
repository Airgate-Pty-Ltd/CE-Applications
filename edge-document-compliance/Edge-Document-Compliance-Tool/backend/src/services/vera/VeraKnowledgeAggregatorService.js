/**
 * Vera Knowledge Aggregator Service
 * 
 * Unified knowledge aggregation layer that collects and scores knowledge
 * from all sources (standards, documents, Q&A, websites, semantic memory).
 * 
 * This fixes the issue where Vera cannot reason unless the clause is literally present.
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';
import VeraSemanticMemory from './VeraSemanticMemory.js';
import VeraQueryResponseService from './VeraQueryResponseService.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * @typedef {Object} KnowledgeMatch
 * @property {string} sourceType - 'standard_clause', 'customer_doc', 'qna', 'website', 'semantic'
 * @property {string} sourceId - Source identifier
 * @property {string} text - Matched text content
 * @property {number} relevanceScore - 0-1 relevance score
 * @property {Object} metadata - Additional context
 * @property {string} [clauseRef] - Clause reference if applicable
 * @property {string} [standardCode] - Standard code if applicable
 */

class VeraKnowledgeAggregatorService {
  /**
   * Collect direct matches (exact clause references, standard codes)
   * @param {Object} params
   * @param {string} params.question - User question
   * @param {string} [params.tenantId] - Tenant ID
   * @returns {Promise<KnowledgeMatch[]>}
   */
  static async collectDirectMatches({ question, tenantId = DEFAULT_TENANT_ID }) {
    const matches = [];

    try {
      // Extract clause references (e.g., "8.7", "4.1.2", "AS9100 7.2")
      const clausePattern = /\b(\d+\.\d+(?:\.\d+)?)\b/g;
      const standardPattern = /\b(AS9100|AS9110|AS9120|ISO\s*9001|ISO\s*13485|IATF\s*16949|ISO\s*14971|FAA\s*21\.137|FAA\s*Part\s*\d+)\b/gi;
      
      const clauseRefs = [...question.matchAll(clausePattern)].map(m => m[1]);
      const standards = [...question.matchAll(standardPattern)].map(m => m[1].replace(/\s+/g, ''));

      // Search parsed requirements for clause matches
      if (clauseRefs.length > 0) {
        const clauseQuery = clauseRefs.map((ref, idx) => `clause_ref ILIKE $${idx + 1}`).join(' OR ');
        const params = clauseRefs.map(ref => `%${ref}%`);

        const result = await queryPostgres(
          `SELECT pr.id, pr.standard_id, pr.clause_ref, pr.requirement_text, 
                  s.code as standard_code, s.name as standard_name
           FROM public.parsed_requirements pr
           JOIN public.standards s ON s.id = pr.standard_id
           WHERE ${clauseQuery}
           LIMIT 20`,
          params
        );

        for (const row of result.rows) {
          matches.push({
            sourceType: 'standard_clause',
            sourceId: row.id,
            text: row.requirement_text,
            relevanceScore: 0.95, // High score for direct clause match
            metadata: {
              standard_id: row.standard_id,
              standard_code: row.standard_code,
              standard_name: row.standard_name
            },
            clauseRef: row.clause_ref,
            standardCode: row.standard_code
          });
        }
      }

      // Search for standard code matches
      if (standards.length > 0) {
        const standardCodes = standards.map(s => s.toUpperCase());
        const result = await queryPostgres(
          `SELECT id, code, name, total_requirements
           FROM public.standards
           WHERE code = ANY($1::text[])
           LIMIT 10`,
          [standardCodes]
        );

        for (const row of result.rows) {
          matches.push({
            sourceType: 'standard_metadata',
            sourceId: row.id,
            text: `${row.code}: ${row.name}`,
            relevanceScore: 0.9,
            metadata: {
              standard_code: row.code,
              standard_name: row.name,
              total_requirements: row.total_requirements
            },
            standardCode: row.code
          });
        }
      }
    } catch (error) {
      console.error('[VeraKnowledgeAggregator] Error collecting direct matches:', error);
    }

    return matches;
  }

  /**
   * Collect semantic matches using semantic memory
   * @param {Object} params
   * @param {string} params.question - User question
   * @param {string} [params.tenantId] - Tenant ID
   * @param {number} [params.topK=10] - Number of results
   * @returns {Promise<KnowledgeMatch[]>}
   */
  static async collectSemanticMatches({ question, tenantId = DEFAULT_TENANT_ID, topK = 10 }) {
    try {
      const semanticResults = await VeraSemanticMemory.semanticSearch({
        query: question,
        topK,
        tenantId,
        minSimilarity: 0.5
      });

      return semanticResults.map(result => ({
        sourceType: result.sourceType,
        sourceId: result.sourceId,
        text: result.text,
        relevanceScore: result.similarity,
        metadata: result.metadata || {}
      }));
    } catch (error) {
      console.error('[VeraKnowledgeAggregator] Error collecting semantic matches:', error);
      return [];
    }
  }

  /**
   * Collect related standards sections (neighbor clauses, related requirements)
   * @param {Object} params
   * @param {string} params.question - User question
   * @param {string[]} [params.knownClauses] - Known clause references
   * @param {string} [params.tenantId] - Tenant ID
   * @returns {Promise<KnowledgeMatch[]>}
   */
  static async collectRelatedStandardsSections({ question, knownClauses = [], tenantId = DEFAULT_TENANT_ID }) {
    const matches = [];

    try {
      // If we have known clauses, find neighbors (same standard, adjacent clauses)
      if (knownClauses.length > 0) {
        for (const clauseRef of knownClauses) {
          const parts = clauseRef.split('.');
          const topLevel = parts[0];
          
          // Find clauses in same section (e.g., if 8.7, find 8.1-8.10)
          const result = await queryPostgres(
            `SELECT pr.id, pr.standard_id, pr.clause_ref, pr.requirement_text,
                    s.code as standard_code
             FROM public.parsed_requirements pr
             JOIN public.standards s ON s.id = pr.standard_id
             WHERE pr.clause_ref LIKE $1
             ORDER BY pr.clause_ref
             LIMIT 10`,
            [`${topLevel}.%`]
          );

          for (const row of result.rows) {
            matches.push({
              sourceType: 'standard_clause',
              sourceId: row.id,
              text: row.requirement_text,
              relevanceScore: 0.7, // Medium score for related clauses
              metadata: {
                standard_id: row.standard_id,
                standard_code: row.standard_code
              },
              clauseRef: row.clause_ref,
              standardCode: row.standard_code
            });
          }
        }
      }

      // Also search by keywords in question
      const keywords = question.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3 && !['what', 'how', 'when', 'where', 'why', 'does', 'can', 'will'].includes(w))
        .slice(0, 5);

      if (keywords.length > 0) {
        const keywordQuery = keywords.map((kw, idx) => `requirement_text ILIKE $${idx + 1}`).join(' OR ');
        const params = keywords.map(kw => `%${kw}%`);

        const result = await queryPostgres(
          `SELECT pr.id, pr.standard_id, pr.clause_ref, pr.requirement_text,
                  s.code as standard_code
           FROM public.parsed_requirements pr
           JOIN public.standards s ON s.id = pr.standard_id
           WHERE ${keywordQuery}
           LIMIT 15`,
          params
        );

        for (const row of result.rows) {
          // Avoid duplicates
          if (!matches.find(m => m.sourceId === row.id)) {
            matches.push({
              sourceType: 'standard_clause',
              sourceId: row.id,
              text: row.requirement_text,
              relevanceScore: 0.6, // Lower score for keyword matches
              metadata: {
                standard_id: row.standard_id,
                standard_code: row.standard_code
              },
              clauseRef: row.clause_ref,
              standardCode: row.standard_code
            });
          }
        }
      }
    } catch (error) {
      console.error('[VeraKnowledgeAggregator] Error collecting related standards:', error);
    }

    return matches;
  }

  /**
   * Collect related customer requirements
   * @param {Object} params
   * @param {string} params.question - User question
   * @param {string} [params.tenantId] - Tenant ID
   * @returns {Promise<KnowledgeMatch[]>}
   */
  static async collectRelatedCustomerRequirements({ question, tenantId = DEFAULT_TENANT_ID }) {
    const matches = [];

    try {
      // Search customer documents
      const keywords = question.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 5);

      if (keywords.length > 0) {
        const keywordQuery = keywords.map((kw, idx) => `extracted_text ILIKE $${idx + 1}`).join(' OR ');
        const params = [tenantId, ...keywords.map(kw => `%${kw}%`)];

        const result = await queryPostgres(
          `SELECT id, COALESCE(original_name, file_name) as document_name, extracted_text
           FROM public.customer_documents
           WHERE tenant_id = $1 AND (${keywordQuery})
           LIMIT 10`,
          params
        );

        for (const row of result.rows) {
          // Extract relevant snippet
          const snippet = this.extractRelevantSnippet(row.extracted_text, question, 500);
          matches.push({
            sourceType: 'customer_doc',
            sourceId: row.id,
            text: snippet,
            relevanceScore: 0.65,
            metadata: {
              document_id: row.id,
              document_name: row.document_name
            }
          });
        }
      }
    } catch (error) {
      console.error('[VeraKnowledgeAggregator] Error collecting customer requirements:', error);
    }

    return matches;
  }

  /**
   * Collect learned Q&A pairs
   * @param {Object} params
   * @param {string} params.question - User question
   * @param {string} [params.tenantId] - Tenant ID
   * @returns {Promise<KnowledgeMatch[]>}
   */
  static async collectLearnedQAPairs({ question, tenantId = DEFAULT_TENANT_ID }) {
    try {
      const qnaMatch = await VeraQueryResponseService.findBestMatch({
        tenantId,
        message: question,
        intent: null
      });

      if (qnaMatch) {
        return [{
          sourceType: 'qna',
          sourceId: qnaMatch.id,
          text: qnaMatch.response_text,
          relevanceScore: 0.85,
          metadata: {
            category: qnaMatch.category,
            query_pattern: qnaMatch.user_query_pattern
          }
        }];
      }
    } catch (error) {
      console.error('[VeraKnowledgeAggregator] Error collecting Q&A pairs:', error);
    }

    return [];
  }

  /**
   * Collect website learned content
   * @param {Object} params
   * @param {string} params.question - User question
   * @param {string} [params.tenantId] - Tenant ID
   * @returns {Promise<KnowledgeMatch[]>}
   */
  static async collectWebsiteLearnedContent({ question, tenantId = DEFAULT_TENANT_ID }) {
    const matches = [];

    try {
      // Search website content using semantic memory
      const semanticResults = await VeraSemanticMemory.semanticSearch({
        query: question,
        topK: 5,
        sourceTypes: ['website'],
        tenantId,
        minSimilarity: 0.6
      });

      for (const result of semanticResults) {
        matches.push({
          sourceType: 'website',
          sourceId: result.sourceId,
          text: result.text,
          relevanceScore: result.similarity,
          metadata: result.metadata || {}
        });
      }
    } catch (error) {
      console.error('[VeraKnowledgeAggregator] Error collecting website content:', error);
    }

    return matches;
  }

  /**
   * Aggregate all knowledge into a unified context
   * @param {Object} params
   * @param {string} params.question - User question
   * @param {string} [params.tenantId] - Tenant ID
   * @param {Object} [params.options] - Options
   * @returns {Promise<Object>} Aggregated knowledge context
   */
  static async aggregateAllKnowledgeIntoContext({ question, tenantId = DEFAULT_TENANT_ID, options = {} }) {
    const {
      includeDirect = true,
      includeSemantic = true,
      includeRelated = true,
      includeCustomer = true,
      includeQNA = true,
      includeWebsites = true,
      maxResults = 30
    } = options;

    const allMatches = [];
    const traceability = [];

    try {
      // 1. Direct matches (clause refs, standard codes)
      if (includeDirect) {
        const direct = await this.collectDirectMatches({ question, tenantId });
        allMatches.push(...direct);
        traceability.push({ source: 'direct_matches', count: direct.length });
      }

      // 2. Semantic matches
      if (includeSemantic) {
        const semantic = await this.collectSemanticMatches({ question, tenantId, topK: 10 });
        allMatches.push(...semantic);
        traceability.push({ source: 'semantic_memory', count: semantic.length });
      }

      // 3. Related standards sections
      if (includeRelated) {
        const knownClauses = allMatches
          .filter(m => m.clauseRef)
          .map(m => m.clauseRef);
        const related = await this.collectRelatedStandardsSections({ question, knownClauses, tenantId });
        allMatches.push(...related);
        traceability.push({ source: 'related_standards', count: related.length });
      }

      // 4. Customer requirements
      if (includeCustomer) {
        const customer = await this.collectRelatedCustomerRequirements({ question, tenantId });
        allMatches.push(...customer);
        traceability.push({ source: 'customer_docs', count: customer.length });
      }

      // 5. Q&A pairs
      if (includeQNA) {
        const qna = await this.collectLearnedQAPairs({ question, tenantId });
        allMatches.push(...qna);
        traceability.push({ source: 'qna_bank', count: qna.length });
      }

      // 6. Website content
      if (includeWebsites) {
        const websites = await this.collectWebsiteLearnedContent({ question, tenantId });
        allMatches.push(...websites);
        traceability.push({ source: 'website_learning', count: websites.length });
      }

      // Deduplicate and sort by relevance
      const uniqueMatches = this.deduplicateMatches(allMatches);
      const sorted = uniqueMatches
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxResults);

      // Calculate uncertainty metrics
      const uncertainty = this.calculateUncertainty(sorted, question);

      // Build context block
      const contextBlock = this.buildContextBlock(sorted, question);

      return {
        matches: sorted,
        contextBlock,
        traceability,
        uncertainty,
        totalSources: sorted.length,
        topScore: sorted.length > 0 ? sorted[0].relevanceScore : 0
      };
    } catch (error) {
      console.error('[VeraKnowledgeAggregator] Error aggregating knowledge:', error);
      return {
        matches: [],
        contextBlock: '',
        traceability: [],
        uncertainty: { score: 1.0, reason: 'Error aggregating knowledge' },
        totalSources: 0,
        topScore: 0
      };
    }
  }

  /**
   * Deduplicate matches by sourceId
   * @param {KnowledgeMatch[]} matches
   * @returns {KnowledgeMatch[]}
   */
  static deduplicateMatches(matches) {
    const seen = new Set();
    const unique = [];

    for (const match of matches) {
      const key = `${match.sourceType}:${match.sourceId}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(match);
      } else {
        // If duplicate, keep the one with higher score
        const existing = unique.find(m => `${m.sourceType}:${m.sourceId}` === key);
        if (existing && match.relevanceScore > existing.relevanceScore) {
          const idx = unique.indexOf(existing);
          unique[idx] = match;
        }
      }
    }

    return unique;
  }

  /**
   * Calculate uncertainty metrics
   * @param {KnowledgeMatch[]} matches
   * @param {string} question
   * @returns {Object}
   */
  static calculateUncertainty(matches, question) {
    if (matches.length === 0) {
      return {
        score: 1.0,
        reason: 'No knowledge sources found',
        needsClarification: true
      };
    }

    const topScore = matches[0]?.relevanceScore || 0;
    const avgScore = matches.reduce((sum, m) => sum + m.relevanceScore, 0) / matches.length;

    let uncertainty = 0.5;
    let reason = '';

    if (topScore < 0.5) {
      uncertainty = 0.8;
      reason = 'Low relevance scores - knowledge may not directly address question';
    } else if (topScore < 0.7) {
      uncertainty = 0.6;
      reason = 'Moderate relevance - some knowledge found but may need clarification';
    } else if (topScore >= 0.8) {
      uncertainty = 0.2;
      reason = 'High relevance - confident knowledge match';
    }

    return {
      score: uncertainty,
      reason,
      needsClarification: uncertainty > 0.6,
      topScore,
      avgScore
    };
  }

  /**
   * Build formatted context block for LLM
   * @param {KnowledgeMatch[]} matches
   * @param {string} question
   * @returns {string}
   */
  static buildContextBlock(matches, question) {
    if (matches.length === 0) {
      return 'No relevant knowledge sources found.';
    }

    let context = 'Relevant Knowledge Sources:\n\n';

    // Group by source type
    const byType = {};
    for (const match of matches) {
      if (!byType[match.sourceType]) {
        byType[match.sourceType] = [];
      }
      byType[match.sourceType].push(match);
    }

    // Format each type
    for (const [type, typeMatches] of Object.entries(byType)) {
      context += `[${type.toUpperCase()}]\n`;
      for (const match of typeMatches.slice(0, 5)) { // Limit per type
        context += `- Relevance: ${(match.relevanceScore * 100).toFixed(0)}%\n`;
        if (match.clauseRef) {
          context += `  Clause: ${match.clauseRef}\n`;
        }
        if (match.standardCode) {
          context += `  Standard: ${match.standardCode}\n`;
        }
        context += `  Content: ${match.text.substring(0, 300)}${match.text.length > 300 ? '...' : ''}\n\n`;
      }
    }

    return context;
  }

  /**
   * Extract relevant snippet from text
   * @param {string} text
   * @param {string} query
   * @param {number} maxLength
   * @returns {string}
   */
  static extractRelevantSnippet(text, query, maxLength = 500) {
    if (!text || text.length <= maxLength) {
      return text || '';
    }

    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    // Find sentence with most query word matches
    let bestSentence = '';
    let bestScore = 0;

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      const score = queryWords.reduce((sum, word) => {
        return sum + (lower.includes(word) ? 1 : 0);
      }, 0);

      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence;
      }
    }

    // Return best sentence with context
    const bestIndex = text.indexOf(bestSentence);
    const start = Math.max(0, bestIndex - 100);
    const end = Math.min(text.length, bestIndex + bestSentence.length + maxLength - 200);

    return text.substring(start, end).trim();
  }
}

export default VeraKnowledgeAggregatorService;

