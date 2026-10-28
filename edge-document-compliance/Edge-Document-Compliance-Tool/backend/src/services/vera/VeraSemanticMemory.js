/**
 * Vera Semantic Memory Service
 * 
 * Provides semantic search and embedding storage across both databases.
 * Supports multiple embedding providers (TF-IDF, Ollama, Mistral, OpenAI-compatible).
 * 
 * This is the core brain of Vera v3.0 - enables reasoning even without explicit data.
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';
import { v4 as uuidv4 } from 'uuid';
import { veraEngineHealth } from './VeraEngineHealthService.js';

// Import existing embedding service
let EmbeddingService;
try {
  const embeddingModule = await import('../embeddingService.js');
  EmbeddingService = embeddingModule.default || embeddingModule.EmbeddingService;
} catch (e) {
  console.warn('[VeraSemanticMemory] Could not load embedding service, will use fallback');
}

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || process.env.VERA_EMBEDDING_PROVIDER || 'tfidf';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'tfidf-local';
const EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION || '1536', 10);
const VERA_MODEL_ENDPOINT = process.env.VERA_MODEL_ENDPOINT;

// Initialize embedding service
let embeddingService;
try {
  if (EmbeddingService) {
    embeddingService = new EmbeddingService(EMBEDDING_PROVIDER, {
      model: EMBEDDING_MODEL,
      dimension: EMBEDDING_DIMENSION
    });
  }
} catch (e) {
  console.warn('[VeraSemanticMemory] Embedding service initialization failed:', e.message);
}

/**
 * Generate embedding for text using configured provider
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector
 */
async function embedText(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text must be a non-empty string');
  }

  // Try to use existing embedding service
  if (embeddingService && typeof embeddingService.embed === 'function') {
    try {
      return await embeddingService.embed(text);
    } catch (e) {
      console.warn('[VeraSemanticMemory] Embedding service failed, trying fallback:', e.message);
    }
  }

  // Fallback: Try VERA_MODEL_ENDPOINT for embeddings
  if (VERA_MODEL_ENDPOINT && VERA_MODEL_ENDPOINT.includes('embedding')) {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(VERA_MODEL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.VERA_MODEL_API_KEY ? `Bearer ${process.env.VERA_MODEL_API_KEY}` : ''
        },
        body: JSON.stringify({
          input: text,
          model: EMBEDDING_MODEL
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.embedding || (data.data && data.data[0] && data.data[0].embedding)) {
          return data.embedding || data.data[0].embedding;
        }
      }
    } catch (e) {
      console.warn('[VeraSemanticMemory] VERA_MODEL_ENDPOINT embedding failed:', e.message);
    }
  }

  // Final fallback: Simple TF-IDF-like vector (very basic)
  console.warn('[VeraSemanticMemory] Using basic fallback embedding');
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const vector = new Array(EMBEDDING_DIMENSION).fill(0);
  words.forEach((word, idx) => {
    const hash = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    vector[hash % EMBEDDING_DIMENSION] += 1 / (words.length || 1);
  });
  return vector;
}

class VeraSemanticMemory {
  /**
   * Store embedding for a knowledge source
   * @param {Object} params
   * @param {string} params.sourceType - 'standard_clause', 'customer_doc', 'qna', 'website', 'conversation'
   * @param {string} params.sourceId - Source ID (UUID)
   * @param {string} params.text - Text content to embed
   * @param {Object} params.metadata - Additional metadata
   * @param {string} [params.tenantId] - Tenant ID
   * @returns {Promise<string>} Embedding ID
   */
  static async storeEmbedding({ sourceType, sourceId, text, metadata = {}, tenantId = DEFAULT_TENANT_ID }) {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      // Generate embedding
      const embedding = await embedText(text);
      const embeddingId = uuidv4();

      // Store in EDCAT AI DB
      await queryEdcatAI(
        `INSERT INTO edcat.knowledge_embeddings
         (id, tenant_id, source_type, source_id, text_content, embedding, metadata, model, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (source_type, source_id) 
         DO UPDATE SET 
           text_content = EXCLUDED.text_content,
           embedding = EXCLUDED.embedding,
           metadata = EXCLUDED.metadata,
           model = EXCLUDED.model,
           updated_at = NOW()`,
        [
          embeddingId,
          tenantId,
          sourceType,
          sourceId,
          text.substring(0, 10000), // Limit text storage
          JSON.stringify(embedding), // Store as JSONB
          JSON.stringify(metadata),
          EMBEDDING_MODEL
        ]
      );

      return embeddingId;
    } catch (error) {
      console.error('[VeraSemanticMemory] Error storing embedding:', error);
      throw error;
    }
  }

  /**
   * Semantic search across all knowledge sources
   * @param {Object} params
   * @param {string} params.query - Search query
   * @param {number} [params.topK=10] - Number of results
   * @param {string[]} [params.sourceTypes] - Filter by source types
   * @param {string} [params.tenantId] - Tenant ID
   * @param {number} [params.minSimilarity=0.5] - Minimum similarity threshold
   * @returns {Promise<Array>} Array of results with similarity scores
   */
  static async semanticSearch({ query, topK = 10, sourceTypes = null, tenantId = DEFAULT_TENANT_ID, minSimilarity = 0.5 }) {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      // Generate query embedding
      const queryEmbedding = await embedText(query);

      // Check if pgvector extension is available
      let useVectorOps = false;
      try {
        const extCheck = await queryEdcatAI(
          `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector`
        );
        useVectorOps = extCheck.rows[0]?.has_vector === true;
      } catch (e) {
        // Extension check failed, assume no pgvector
        useVectorOps = false;
      }

      // Build SQL query - use different approach based on whether pgvector is available
      let sql;
      const params = [JSON.stringify(queryEmbedding), tenantId];

      if (useVectorOps) {
        // Use pgvector distance operator if available
        sql = `
          SELECT 
            id,
            source_type,
            source_id,
            text_content,
            metadata,
            model,
            created_at,
            -- Calculate cosine similarity using pgvector
            (
              1.0 - (
                (embedding::vector <-> $1::vector) / 2.0
              )
            ) as similarity
          FROM edcat.knowledge_embeddings
          WHERE tenant_id = $2
            AND (
              1.0 - (
                (embedding::vector <-> $1::vector) / 2.0
              )
            ) >= $3
        `;
        params.push(minSimilarity);
      } else {
        // Fallback: Use keyword/LIKE search when pgvector not available
        console.warn('[VeraSemanticMemory] pgvector not available, using keyword fallback search');
        veraEngineHealth.recordIssue(
          'SEMANTIC_SEARCH_DISABLED',
          'My semantic search engine (pgvector) is not available. I can still answer questions, ' +
            'but I can\'t use deep similarity search across your standards and documents.',
          'warning',
          { source: 'VeraSemanticMemory', reason: 'pgvector_extension_not_available' }
        );
        return await this.fallbackKeywordSearch(query, topK, sourceTypes, tenantId, minSimilarity);
      }

      if (sourceTypes && sourceTypes.length > 0) {
        sql += ` AND source_type = ANY($${params.length + 1}::text[])`;
        params.push(sourceTypes);
      }

      sql += ` ORDER BY similarity DESC LIMIT $${params.length + 1}`;
      params.push(topK);

      const result = await queryEdcatAI(sql, params);

      return result.rows.map(row => ({
        id: row.id,
        sourceType: row.source_type,
        sourceId: row.source_id,
        text: row.text_content,
        metadata: row.metadata || {},
        similarity: parseFloat(row.similarity) || 0,
        model: row.model,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('[VeraSemanticMemory] Error in semantic search:', error);
      return [];
    }
  }

  /**
   * Fallback keyword search when pgvector is not available
   * Uses ILIKE pattern matching on document_content_for_learning
   * @param {string} query - Search query
   * @param {number} topK - Number of results
   * @param {string[]} sourceTypes - Filter by source types
   * @param {string} tenantId - Tenant ID
   * @param {number} minSimilarity - Minimum similarity (ignored for keyword search)
   * @returns {Promise<Array>} Array of results with similarity scores
   */
  static async fallbackKeywordSearch(query, topK = 10, sourceTypes = null, tenantId = DEFAULT_TENANT_ID, minSimilarity = 0.5) {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      // Extract keywords from query (remove common words)
      const keywords = query.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2 && !['the', 'is', 'are', 'what', 'how', 'when', 'where', 'why', 'this', 'that'].includes(word))
        .slice(0, 5); // Limit to 5 keywords

      if (keywords.length === 0) {
        // If no keywords, use full query
        keywords.push(query.toLowerCase().substring(0, 50));
      }

      // Build ILIKE conditions for each keyword
      const keywordConditions = keywords.map((_, idx) => 
        `(dcl.content_text ILIKE $${idx + 1} OR dcl.metadata::text ILIKE $${idx + 1})`
      ).join(' OR ');

      let sql = `
        SELECT DISTINCT
          dcl.file_id as source_id,
          'learning_doc' as source_type,
          dcl.content_text as text_content,
          dcl.standard_code,
          dcl.quality,
          dcl.metadata,
          dcl.word_count,
          -- Calculate a simple relevance score based on keyword matches
          (
            ${keywords.map((_, idx) => 
              `CASE WHEN dcl.content_text ILIKE $${idx + 1} THEN 1 ELSE 0 END`
            ).join(' + ')}
          )::float / ${keywords.length}::float as similarity,
          dcl.created_at
        FROM edcat.document_content_for_learning dcl
        WHERE (${keywordConditions})
          AND dcl.content_text IS NOT NULL
          AND LENGTH(dcl.content_text) > 50
      `;

      const params = keywords.map(kw => `%${kw}%`);

      // Filter by source types if provided
      if (sourceTypes && sourceTypes.length > 0) {
        // Map source types to document_content_for_learning categories
        const categoryMap = {
          'learning_doc': 'standard',
          'example': 'example'
        };
        const categories = sourceTypes
          .map(st => categoryMap[st])
          .filter(Boolean);
        
        if (categories.length > 0) {
          sql += ` AND dcl.category = ANY($${params.length + 1}::text[])`;
          params.push(categories);
        }
      }

      // Order by similarity (keyword matches) and quality, then limit
      sql += `
        ORDER BY 
          similarity DESC,
          CASE dcl.quality
            WHEN 'approved' THEN 1
            WHEN 'bad' THEN 3
            ELSE 2
          END,
          dcl.word_count DESC
        LIMIT $${params.length + 1}
      `;
      params.push(topK);

      const result = await queryEdcatAI(sql, params);

      return result.rows.map(row => ({
        id: row.source_id,
        sourceType: row.source_type || 'learning_doc',
        sourceId: row.source_id,
        text: row.text_content,
        metadata: {
          ...(row.metadata || {}),
          standard_code: row.standard_code,
          quality: row.quality,
          word_count: row.word_count
        },
        similarity: parseFloat(row.similarity) || 0.5, // Default to 0.5 for keyword matches
        model: 'keyword-fallback',
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('[VeraSemanticMemory] Error in fallback keyword search:', error);
      return [];
    }
  }

  /**
   * Bulk embed existing knowledge (for migration/backfill)
   * @param {Object} params
   * @param {string} [params.tenantId] - Tenant ID
   * @param {number} [params.batchSize=10] - Batch size
   * @returns {Promise<Object>} Summary of embedding operations
   */
  static async bulkEmbedExistingKnowledge({ tenantId = DEFAULT_TENANT_ID, batchSize = 10 } = {}) {
    const summary = {
      standards: 0,
      customerDocs: 0,
      qnaPairs: 0,
      websites: 0,
      errors: 0
    };

    try {
      // 1. Embed parsed requirements (standards)
      console.log('[VeraSemanticMemory] Embedding parsed requirements...');
      const requirements = await queryPostgres(
        `SELECT id, standard_id, clause_ref, requirement_text, metadata
         FROM public.parsed_requirements
         WHERE requirement_text IS NOT NULL AND requirement_text != ''
         LIMIT 1000`,
        []
      );

      for (const req of requirements.rows) {
        try {
          await this.storeEmbedding({
            sourceType: 'standard_clause',
            sourceId: req.id,
            text: `${req.clause_ref || ''} ${req.requirement_text}`,
            metadata: {
              standard_id: req.standard_id,
              clause_ref: req.clause_ref,
              ...(req.metadata || {})
            },
            tenantId
          });
          summary.standards++;
        } catch (e) {
          console.error(`[VeraSemanticMemory] Error embedding requirement ${req.id}:`, e.message);
          summary.errors++;
        }
      }

      // 2. Embed customer documents
      console.log('[VeraSemanticMemory] Embedding customer documents...');
      const docs = await queryPostgres(
        `SELECT id, name, extracted_text
         FROM public.customer_documents
         WHERE extracted_text IS NOT NULL AND extracted_text != ''
         LIMIT 500`,
        []
      );

      for (const doc of docs.rows) {
        try {
          // Chunk large documents
          const chunks = this.chunkText(doc.extracted_text, 2000);
          for (let i = 0; i < chunks.length; i++) {
            await this.storeEmbedding({
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
          summary.customerDocs += chunks.length;
        } catch (e) {
          console.error(`[VeraSemanticMemory] Error embedding document ${doc.id}:`, e.message);
          summary.errors++;
        }
      }

      // 3. Embed Q&A pairs
      console.log('[VeraSemanticMemory] Embedding Q&A pairs...');
      const qnaPairs = await queryEdcatAI(
        `SELECT id, user_query_pattern, response_text, category
         FROM edcat.vera_query_response_bank
         WHERE response_text IS NOT NULL AND response_text != ''
         LIMIT 500`,
        []
      );

      for (const qna of qnaPairs.rows) {
        try {
          await this.storeEmbedding({
            sourceType: 'qna',
            sourceId: qna.id,
            text: `${qna.user_query_pattern} ${qna.response_text}`,
            metadata: {
              category: qna.category
            },
            tenantId
          });
          summary.qnaPairs++;
        } catch (e) {
          console.error(`[VeraSemanticMemory] Error embedding Q&A ${qna.id}:`, e.message);
          summary.errors++;
        }
      }

      // 4. Embed website content
      console.log('[VeraSemanticMemory] Embedding website content...');
      const websites = await queryEdcatAI(
        `SELECT id, url, cleaned_text, authority
         FROM edcat.website_content_for_learning
         WHERE cleaned_text IS NOT NULL AND cleaned_text != '' AND is_active = TRUE
         LIMIT 200`,
        []
      );

      for (const site of websites.rows) {
        try {
          const chunks = this.chunkText(site.cleaned_text, 2000);
          for (let i = 0; i < chunks.length; i++) {
            await this.storeEmbedding({
              sourceType: 'website',
              sourceId: `${site.id}-chunk-${i}`,
              text: chunks[i],
              metadata: {
                website_id: site.id,
                url: site.url,
                authority: site.authority,
                chunk_index: i,
                total_chunks: chunks.length
              },
              tenantId
            });
          }
          summary.websites += chunks.length;
        } catch (e) {
          console.error(`[VeraSemanticMemory] Error embedding website ${site.id}:`, e.message);
          summary.errors++;
        }
      }

      console.log('[VeraSemanticMemory] Bulk embedding complete:', summary);
      return summary;
    } catch (error) {
      console.error('[VeraSemanticMemory] Error in bulk embedding:', error);
      throw error;
    }
  }

  /**
   * Chunk text into manageable pieces
   * @param {string} text - Text to chunk
   * @param {number} maxSize - Maximum chunk size
   * @returns {Array<string>} Array of text chunks
   */
  static chunkText(text, maxSize = 2000) {
    if (text.length <= maxSize) {
      return [text];
    }

    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Delete embedding by source
   * @param {Object} params
   * @param {string} params.sourceType - Source type
   * @param {string} params.sourceId - Source ID
   * @param {string} [params.tenantId] - Tenant ID
   */
  static async deleteEmbedding({ sourceType, sourceId, tenantId = DEFAULT_TENANT_ID }) {
    await queryEdcatAI(
      `DELETE FROM edcat.knowledge_embeddings
       WHERE source_type = $1 AND source_id = $2 AND tenant_id = $3`,
      [sourceType, sourceId, tenantId]
    );
  }
}

// Export embedText function for use by other services
VeraSemanticMemory.embedText = embedText;

export default VeraSemanticMemory;

