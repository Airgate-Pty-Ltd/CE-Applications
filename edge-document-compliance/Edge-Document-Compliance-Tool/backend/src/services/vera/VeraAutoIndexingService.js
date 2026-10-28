/**
 * Vera Auto-Indexing Service
 * 
 * Automatically indexes all knowledge when added:
 * - Standards are parsed → embed and store
 * - Documents are uploaded → embed and store
 * - Websites are learned → embed and store
 * - Q&A pairs created → embed and store
 */

import VeraSemanticMemory from './VeraSemanticMemory.js';
import { queryPostgres, queryEdcatAI } from '../../config/databases.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

class VeraAutoIndexingService {
  /**
   * Auto-index a parsed requirement (called after parsing)
   * @param {Object} params
   * @param {string} params.requirementId - Parsed requirement ID
   * @param {string} [params.tenantId] - Tenant ID
   */
  static async indexParsedRequirement({ requirementId, tenantId = DEFAULT_TENANT_ID }) {
    try {
      const result = await queryPostgres(
        `SELECT pr.id, pr.standard_id, pr.clause_ref, pr.requirement_text, s.code as standard_code
         FROM public.parsed_requirements pr
         JOIN public.standards s ON s.id = pr.standard_id
         WHERE pr.id = $1`,
        [requirementId]
      );

      if (result.rows.length === 0) {
        return;
      }

      const req = result.rows[0];
      const text = `${req.clause_ref || ''} ${req.requirement_text}`.trim();

      await VeraSemanticMemory.storeEmbedding({
        sourceType: 'standard_clause',
        sourceId: req.id,
        text,
        metadata: {
          standard_id: req.standard_id,
          standard_code: req.standard_code,
          clause_ref: req.clause_ref
        },
        tenantId
      });

      console.log(`[VeraAutoIndexing] Indexed parsed requirement ${requirementId}`);
    } catch (error) {
      console.error(`[VeraAutoIndexing] Error indexing requirement ${requirementId}:`, error);
    }
  }

  /**
   * Auto-index a customer document (called after upload/parsing)
   * @param {Object} params
   * @param {string} params.documentId - Customer document ID
   * @param {string} [params.tenantId] - Tenant ID
   */
  static async indexCustomerDocument({ documentId, tenantId = DEFAULT_TENANT_ID }) {
    try {
      const result = await queryPostgres(
        `SELECT id, name, extracted_text
         FROM public.customer_documents
         WHERE id = $1 AND extracted_text IS NOT NULL AND extracted_text != ''`,
        [documentId]
      );

      if (result.rows.length === 0) {
        return;
      }

      const doc = result.rows[0];
      const chunks = VeraSemanticMemory.chunkText(doc.extracted_text, 2000);

      for (let i = 0; i < chunks.length; i++) {
        await VeraSemanticMemory.storeEmbedding({
          sourceType: 'customer_doc',
          sourceId: `${doc.id}-chunk-${i}`,
          text: chunks[i],
          metadata: {
            document_id: doc.id,
            document_name: doc.name,
            chunk_index: i,
            total_chunks: chunks.length
          },
          tenantId
        });
      }

      console.log(`[VeraAutoIndexing] Indexed customer document ${documentId} (${chunks.length} chunks)`);
    } catch (error) {
      console.error(`[VeraAutoIndexing] Error indexing document ${documentId}:`, error);
    }
  }

  /**
   * Auto-index a Q&A pair (called after Q&A creation)
   * @param {Object} params
   * @param {string} params.qnaId - Q&A entry ID
   * @param {string} [params.tenantId] - Tenant ID
   */
  static async indexQAPair({ qnaId, tenantId = DEFAULT_TENANT_ID }) {
    try {
      const result = await queryEdcatAI(
        `SELECT id, user_query_pattern, response_text, category
         FROM edcat.vera_query_response_bank
         WHERE id = $1`,
        [qnaId]
      );

      if (result.rows.length === 0) {
        return;
      }

      const qna = result.rows[0];
      const text = `${qna.user_query_pattern} ${qna.response_text}`.trim();

      await VeraSemanticMemory.storeEmbedding({
        sourceType: 'qna',
        sourceId: qna.id,
        text,
        metadata: {
          category: qna.category
        },
        tenantId
      });

      console.log(`[VeraAutoIndexing] Indexed Q&A pair ${qnaId}`);
    } catch (error) {
      console.error(`[VeraAutoIndexing] Error indexing Q&A ${qnaId}:`, error);
    }
  }

  /**
   * Auto-index website content (called after learning from URL)
   * @param {Object} params
   * @param {string} params.websiteId - Website content ID
   * @param {string} [params.tenantId] - Tenant ID
   */
  static async indexWebsiteContent({ websiteId, tenantId = DEFAULT_TENANT_ID }) {
    try {
      const result = await queryEdcatAI(
        `SELECT id, url, cleaned_text, authority, metadata
         FROM edcat.website_content_for_learning
         WHERE id = $1 AND cleaned_text IS NOT NULL AND cleaned_text != ''`,
        [websiteId]
      );

      if (result.rows.length === 0) {
        return;
      }

      const site = result.rows[0];
      const chunks = VeraSemanticMemory.chunkText(site.cleaned_text, 2000);

      for (let i = 0; i < chunks.length; i++) {
        await VeraSemanticMemory.storeEmbedding({
          sourceType: 'website',
          sourceId: `${site.id}-chunk-${i}`,
          text: chunks[i],
          metadata: {
            website_id: site.id,
            url: site.url,
            authority: site.authority,
            chunk_index: i,
            total_chunks: chunks.length,
            ...(typeof site.metadata === 'string' ? JSON.parse(site.metadata) : (site.metadata || {}))
          },
          tenantId
        });
      }

      console.log(`[VeraAutoIndexing] Indexed website content ${websiteId} (${chunks.length} chunks)`);
    } catch (error) {
      console.error(`[VeraAutoIndexing] Error indexing website ${websiteId}:`, error);
    }
  }

  /**
   * Auto-index a conversation message (called after message storage)
   * @param {Object} params
   * @param {string} params.messageId - Conversation memory message ID
   * @param {string} [params.tenantId] - Tenant ID
   */
  static async indexConversationMessage({ messageId, tenantId = DEFAULT_TENANT_ID }) {
    try {
      const result = await queryEdcatAI(
        `SELECT id, message_text, intent
         FROM edcat.conversation_memory
         WHERE id = $1`,
        [messageId]
      );

      if (result.rows.length === 0) {
        return;
      }

      const msg = result.rows[0];
      
      await VeraSemanticMemory.storeEmbedding({
        sourceType: 'conversation',
        sourceId: msg.id,
        text: msg.message_text,
        metadata: {
          intent: msg.intent
        },
        tenantId
      });

      console.log(`[VeraAutoIndexing] Indexed conversation message ${messageId}`);
    } catch (error) {
      console.error(`[VeraAutoIndexing] Error indexing conversation ${messageId}:`, error);
    }
  }
}

export default VeraAutoIndexingService;

