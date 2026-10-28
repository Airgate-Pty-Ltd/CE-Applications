/**
 * VeraKnowledgeRetrievalService
 *
 * Single place to pull "evidence" from all knowledge sources.
 * This does NOT format the final answer; it just returns raw material.
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';

class VeraKnowledgeRetrievalService {
  /**
   * @param {Object} params
   * @param {string} params.tenantId
   * @param {string} params.intent
   * @param {Object} params.entities
   * @param {string} params.message
   * @returns {Promise<{
   *   standardClauses: Array,
   *   queryResponses: Array,
   *   learnedDocs: Array,
   *   websiteSnippets: Array,
   *   semanticMemory: Array
   * }>}
   */
  static async getEvidence({ tenantId, intent, entities = {}, message }) {
    const standardClauses = await this._fetchStandardClauses({ tenantId, entities, message });
    const queryResponses = await this._fetchQueryResponseBank({ tenantId, intent, entities, message });
    const learnedDocs = await this._fetchLearnedDocuments({ tenantId, entities, message });
    const websiteSnippets = await this._fetchWebsiteSnippets({ tenantId, entities, message });
    const semanticMemory = await this._fetchSemanticMemory({ tenantId, intent, entities, message });

    return {
      standardClauses,
      queryResponses,
      learnedDocs,
      websiteSnippets,
      semanticMemory
    };
  }

  static async _fetchStandardClauses({ tenantId, entities, message }) {
    const { standard, clauseRef } = entities;
    const results = [];

    try {
      // Try exact clause match if we have one
      if (clauseRef) {
        const res = await queryPostgres(
          `
          SELECT pr.standard_id, pr.full_ref, pr.clause_number, pr.clause_ref, pr.clause_title, 
                 pr.requirement_text, pr.requirement_type, pr.confidence,
                 s.code as standard_code, s.name as standard_name
          FROM public.parsed_requirements pr
          JOIN public.standards s ON s.id = pr.standard_id
          WHERE pr.is_in_scope = true
            AND (pr.full_ref ILIKE $1 OR pr.clause_number ILIKE $1 OR pr.clause_ref ILIKE $1)
          ORDER BY pr.clause_number ASC, pr.full_ref ASC
          LIMIT 10
          `,
          [clauseRef.replace(/\s+/g, '') + '%']
        );

        results.push(...res.rows);
      }

      // If we have a standard but no specific clause, pull a few top-level clauses as context
      if (standard && !clauseRef) {
        const res = await queryPostgres(
          `
          SELECT pr.standard_id, pr.full_ref, pr.clause_number, pr.clause_ref, pr.clause_title,
                 pr.requirement_text, pr.requirement_type, pr.confidence,
                 s.code as standard_code, s.name as standard_name
          FROM public.parsed_requirements pr
          JOIN public.standards s ON s.id = pr.standard_id
          WHERE pr.is_in_scope = true
            AND (UPPER(s.code) = $1 OR UPPER(s.code) LIKE $2 OR UPPER(s.name) LIKE $3)
          ORDER BY pr.clause_number ASC, pr.full_ref ASC
          LIMIT 20
          `,
          [standard.toUpperCase(), `%${standard.toUpperCase()}%`, `%${standard}%`]
        );

        results.push(...res.rows);
      }

      // If no standard/clause but message contains quality/compliance terms, do text search
      if (!standard && !clauseRef && message) {
        const searchTerms = message.substring(0, 200).trim();
        if (searchTerms.length > 10) {
          const res = await queryPostgres(
            `
            SELECT pr.standard_id, pr.full_ref, pr.clause_number, pr.clause_ref, pr.clause_title,
                   pr.requirement_text, pr.requirement_type, pr.confidence,
                   s.code as standard_code, s.name as standard_name
            FROM public.parsed_requirements pr
            JOIN public.standards s ON s.id = pr.standard_id
            WHERE pr.is_in_scope = true
              AND (pr.requirement_text ILIKE $1 OR pr.clause_title ILIKE $1)
            ORDER BY pr.clause_number ASC
            LIMIT 10
            `,
            [`%${searchTerms}%`]
          );

          results.push(...res.rows);
        }
      }

      return results;
    } catch (err) {
      console.error('[VeraKnowledgeRetrievalService] Error fetching standard clauses:', err);
      return [];
    }
  }

  static async _fetchQueryResponseBank({ tenantId, intent, entities, message }) {
    try {
      const topic = (entities.topic || message || '').slice(0, 300);

      // Simple text search in Vera's query-response bank
      const res = await queryEdcatAI(
        `
        SELECT id, user_query_pattern, response_text, category, confidence_score, tags, domain
        FROM edcat.vera_query_response_bank
        WHERE (to_tsvector('english', user_query_pattern) @@ plainto_tsquery('english', $1)
           OR  to_tsvector('english', response_text) @@ plainto_tsquery('english', $1)
           OR user_query_pattern ILIKE $2
           OR response_text ILIKE $2)
        ORDER BY confidence_score DESC NULLS LAST, created_at DESC
        LIMIT 10
        `,
        [topic, `%${topic}%`]
      );

      return res.rows || [];
    } catch (err) {
      console.error('[VeraKnowledgeRetrievalService] Error fetching query responses:', err);
      return [];
    }
  }

  static async _fetchLearnedDocuments({ tenantId, entities, message }) {
    try {
      const topic = (entities.topic || message || '').slice(0, 300);

      // Check if document_content_for_learning table exists
      const res = await queryEdcatAI(
        `
        SELECT id, document_id, content, metadata, source_type, source_name
        FROM edcat.document_content_for_learning
        WHERE (to_tsvector('english', content) @@ plainto_tsquery('english', $1)
           OR content ILIKE $2)
        ORDER BY created_at DESC
        LIMIT 10
        `,
        [topic, `%${topic}%`]
      );

      return res.rows || [];
    } catch (err) {
      // Table may not exist, that's okay
      if (err.code !== '42P01') {
        console.error('[VeraKnowledgeRetrievalService] Error fetching learned documents:', err);
      }
      return [];
    }
  }

  static async _fetchWebsiteSnippets({ tenantId, entities, message }) {
    try {
      const topic = (entities.topic || message || '').slice(0, 300);

      // Table name based on migrations (020_vera_website_learning.sql)
      const res = await queryEdcatAI(
        `
        SELECT id, url, authority, cleaned_text as snippet, metadata
        FROM edcat.website_content_for_learning
        WHERE is_active = true
          AND (to_tsvector('english', cleaned_text) @@ plainto_tsquery('english', $1)
           OR cleaned_text ILIKE $2)
        ORDER BY created_at DESC
        LIMIT 10
        `,
        [topic, `%${topic}%`]
      );

      return res.rows || [];
    } catch (err) {
      // Table may not exist, that's okay
      if (err.code !== '42P01') {
        console.error('[VeraKnowledgeRetrievalService] Error fetching website snippets:', err);
      }
      return [];
    }
  }

  static async _fetchSemanticMemory({ tenantId, intent, entities, message }) {
    // Placeholder for vector/embedding search.
    // Use whatever embedding/semantic memory utilities already exist in the repo.
    try {
      const VeraSemanticMemory = (await import('./VeraSemanticMemory.js')).default;
      if (VeraSemanticMemory && VeraSemanticMemory.semanticSearch) {
        const topic = (entities.topic || message || '').slice(0, 300);
        const results = await VeraSemanticMemory.semanticSearch({
          tenantId,
          query: topic,
          topK: 10,
          minSimilarity: 0.5
        });

        return results || [];
      }
      return [];
    } catch (err) {
      // Semantic memory may not be available, that's okay
      if (err.code !== '42P01') {
        console.error('[VeraKnowledgeRetrievalService] Error fetching semantic memory:', err);
      }
      return [];
    }
  }
}

export default VeraKnowledgeRetrievalService;

