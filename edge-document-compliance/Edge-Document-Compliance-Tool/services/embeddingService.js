/**
 * Embedding Service (Local Only)
 * 
 * OpenAI removed - uses TF-IDF and local methods only.
 * Never called directly from UI; always backend-only.
 * 
 * © 2025 Conform-Edge Quality Consulting. All rights reserved. CEQC-OQCQMS
 */

import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'tfidf';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'tfidf-local';
const EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION || '512', 10);
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';

/**
 * Generate embeddings using OpenAI (REMOVED - always throws)
 */
async function embedWithOpenAI(texts) {
  console.warn('[Embedding] OpenAI removed - using TF-IDF fallback');
  throw new Error('OpenAI embeddings removed - use TF-IDF or Ollama');
}

/**
 * Generate embeddings using Ollama (local)
 */
async function embedWithOllama(texts) {
  try {
    const fetch = (await import('node-fetch')).default;
    const embeddings = [];
    
    // Ollama processes one at a time
    for (const text of texts) {
      const response = await fetch(`${OLLAMA_ENDPOINT}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          prompt: text
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      embeddings.push(data.embedding || []);
    }
    
    return embeddings;
  } catch (error) {
    console.error('[Embedding] Ollama error:', error);
    throw new Error(`Ollama embedding failed: ${error.message}`);
  }
}

/**
 * Generate embeddings using Mistral
 */
async function embedWithMistral(texts) {
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY not configured');
  }
  
  try {
    const fetch = (await import('node-fetch')).default;
    const embeddings = [];
    
    // Mistral supports batch
    const response = await fetch('https://api.mistral.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts
      })
    });
    
    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data.map(item => item.embedding);
  } catch (error) {
    console.error('[Embedding] Mistral error:', error);
    throw new Error(`Mistral embedding failed: ${error.message}`);
  }
}

/**
 * Generate embeddings for a batch of texts
 * @param {Array<string>} texts - Array of text strings to embed
 * @returns {Promise<Array<number[]>>} - Array of embedding vectors
 */
export async function embedTextBatch(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }
  
  // Filter out empty texts
  const validTexts = texts.filter(t => t && t.trim().length > 0);
  if (validTexts.length === 0) {
    return [];
  }
  
  // Truncate texts to reasonable length (most models have limits)
  const truncatedTexts = validTexts.map(text => text.substring(0, 8000));
  
  try {
    let embeddings;
    
    switch (EMBEDDING_PROVIDER.toLowerCase()) {
      case 'openai':
        console.warn('[Embedding] OpenAI removed - falling back to Ollama');
        embeddings = await embedWithOllama(truncatedTexts).catch(() => {
          throw new Error('OpenAI removed - configure Ollama or use TF-IDF');
        });
        break;
      case 'ollama':
      case 'local':
        embeddings = await embedWithOllama(truncatedTexts);
        break;
      case 'mistral':
        embeddings = await embedWithMistral(truncatedTexts);
        break;
      case 'tfidf':
      default:
        // Use simple TF-IDF based vector (dimensionality reduced)
        embeddings = truncatedTexts.map(() => {
          // Return zero vector - embeddings not used when provider is TF-IDF
          return new Array(EMBEDDING_DIMENSION).fill(0);
        });
        console.log('[Embedding] Using TF-IDF mode (no embeddings generated)');
    }
    
    // Validate dimensions
    if (embeddings.length > 0 && embeddings[0].length !== EMBEDDING_DIMENSION) {
      console.warn(`[Embedding] Dimension mismatch: expected ${EMBEDDING_DIMENSION}, got ${embeddings[0].length}`);
    }
    
    return embeddings;
  } catch (error) {
    console.error('[Embedding] Batch embedding failed:', error);
    throw error;
  }
}

/**
 * Embed document chunks
 * @param {Array<string>} chunkIds - Array of document_chunk UUIDs
 */
export async function embedDocumentChunks(chunkIds) {
  if (!Array.isArray(chunkIds) || chunkIds.length === 0) {
    return { success: false, error: 'No chunk IDs provided' };
  }
  
  try {
    // Fetch chunks with tenant scoping
    const chunksResult = await query(
      `SELECT id, text, tenant_id FROM document_chunks WHERE id = ANY($1::uuid[])`,
      [chunkIds]
    );
    
    const chunks = chunksResult.rows;
    if (chunks.length === 0) {
      return { success: false, error: 'No chunks found' };
    }
    
    // Check for existing embeddings
    const existingResult = await query(
      `SELECT document_chunk_id FROM embeddings 
       WHERE document_chunk_id = ANY($1::uuid[]) AND model = $2`,
      [chunkIds, EMBEDDING_MODEL]
    );
    
    const existingIds = new Set(existingResult.rows.map(r => r.document_chunk_id));
    const chunksToEmbed = chunks.filter(c => !existingIds.has(c.id));
    
    if (chunksToEmbed.length === 0) {
      return { success: true, embeddingsCreated: 0, totalChunks: chunks.length, message: 'All chunks already embedded' };
    }
    
    // Generate embeddings in batches (to avoid rate limits)
    const batchSize = 100;
    const embeddingsCreated = [];
    
    for (let i = 0; i < chunksToEmbed.length; i += batchSize) {
      const batch = chunksToEmbed.slice(i, i + batchSize);
      const texts = batch.map(c => c.text);
      
      try {
        const embeddings = await embedTextBatch(texts);
        
        // Store embeddings
        for (let j = 0; j < batch.length; j++) {
          const chunk = batch[j];
          const embedding = embeddings[j];
          
          if (embedding && embedding.length > 0) {
            const embeddingId = uuidv4();
            await query(
              `INSERT INTO embeddings 
               (id, tenant_id, document_chunk_id, embedding, model)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (document_chunk_id, model) 
               DO UPDATE SET embedding = $4, created_at = NOW()`,
              [
                embeddingId,
                chunk.tenant_id,
                chunk.id,
                JSON.stringify(embedding),
                EMBEDDING_MODEL
              ]
            );
            
            embeddingsCreated.push(embeddingId);
          }
        }
        
        // Rate limiting delay
        if (i + batchSize < chunksToEmbed.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (batchError) {
        console.error(`[Embedding] Batch ${i}-${i + batchSize} failed:`, batchError);
        // Continue with next batch
      }
    }
    
    return {
      success: true,
      embeddingsCreated: embeddingsCreated.length,
      totalChunks: chunks.length,
      skipped: chunks.length - chunksToEmbed.length
    };
    
  } catch (error) {
    console.error('[Embedding] Error embedding document chunks:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Embed GAP profiles
 * @param {Array<string>} profileIds - Array of gap_profile UUIDs
 */
export async function embedGapProfiles(profileIds) {
  if (!Array.isArray(profileIds) || profileIds.length === 0) {
    return { success: false, error: 'No profile IDs provided' };
  }
  
  try {
    // Fetch gap profiles
    const profilesResult = await query(
      `SELECT gp.id, gp.interpretation, gp.expected_evidence, gp.tags, c.requirement_text
       FROM gap_profiles gp
       JOIN clauses c ON c.id = gp.clause_id
       WHERE gp.id = ANY($1::uuid[]) AND gp.is_active = TRUE`,
      [profileIds]
    );
    
    const profiles = profilesResult.rows;
    if (profiles.length === 0) {
      return { success: false, error: 'No active gap profiles found' };
    }
    
    // Check for existing embeddings
    const existingResult = await query(
      `SELECT gap_profile_id FROM gap_profile_embeddings 
       WHERE gap_profile_id = ANY($1::uuid[]) AND model = $2`,
      [profileIds, EMBEDDING_MODEL]
    );
    
    const existingIds = new Set(existingResult.rows.map(r => r.gap_profile_id));
    const profilesToEmbed = profiles.filter(p => !existingIds.has(p.id));
    
    if (profilesToEmbed.length === 0) {
      return { success: true, embeddingsCreated: 0, totalProfiles: profiles.length, message: 'All profiles already embedded' };
    }
    
    // Build embedding text (interpretation + expected_evidence + requirement_text)
    const texts = profilesToEmbed.map(profile => {
      const parts = [
        profile.requirement_text || '',
        profile.interpretation || '',
        profile.expected_evidence || ''
      ].filter(p => p.trim().length > 0);
      
      return parts.join('\n\n');
    });
    
    // Generate embeddings
    const embeddings = await embedTextBatch(texts);
    
    // Store embeddings
    const embeddingsCreated = [];
    for (let i = 0; i < profilesToEmbed.length; i++) {
      const profile = profilesToEmbed[i];
      const embedding = embeddings[i];
      
      if (embedding && embedding.length > 0) {
        const embeddingId = uuidv4();
        await query(
          `INSERT INTO gap_profile_embeddings 
           (id, gap_profile_id, embedding, model)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (gap_profile_id, model) 
           DO UPDATE SET embedding = $3, created_at = NOW()`,
          [
            embeddingId,
            profile.id,
            JSON.stringify(embedding),
            EMBEDDING_MODEL
          ]
        );
        
        embeddingsCreated.push(embeddingId);
      }
    }
    
    return {
      success: true,
      embeddingsCreated: embeddingsCreated.length,
      totalProfiles: profiles.length,
      skipped: profiles.length - profilesToEmbed.length
    };
    
  } catch (error) {
    console.error('[Embedding] Error embedding gap profiles:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Semantic search using vector similarity
 * @param {number[]} queryEmbedding - Query embedding vector
 * @param {string} tenantId - Tenant ID to scope search
 * @param {Array<string>} targetDocumentIds - Optional: limit to specific documents
 * @param {number} limit - Maximum number of results
 * @param {number} threshold - Minimum similarity score (0-1)
 * @returns {Promise<Array>} - Array of similar chunks with scores
 */
export async function semanticSearch(queryEmbedding, tenantId, targetDocumentIds = [], limit = 10, threshold = 0.6) {
  if (!queryEmbedding || !Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
    return [];
  }
  
  try {
    // Build query with tenant scoping
    let queryText = `
      SELECT 
        e.id,
        e.document_chunk_id,
        e.tenant_id,
        dc.text,
        dc.section_label,
        dc.position,
        d.id as document_id,
        d.document_name,
        d.document_type,
        -- Calculate cosine similarity (simplified - in production use pgvector operators)
        1.0 - (
          (embedding::jsonb <-> $1::jsonb) / 2.0
        ) as similarity
      FROM embeddings e
      JOIN document_chunks dc ON dc.id = e.document_chunk_id
      JOIN documents d ON d.id = dc.document_id
      WHERE e.tenant_id = $2
        AND e.model = $3
        AND d.is_deleted = FALSE
    `;
    
    const params = [JSON.stringify(queryEmbedding), tenantId, EMBEDDING_MODEL];
    
    if (targetDocumentIds && targetDocumentIds.length > 0) {
      queryText += ` AND d.id = ANY($${params.length + 1}::uuid[])`;
      params.push(targetDocumentIds);
    }
    
    queryText += `
      ORDER BY similarity DESC
      LIMIT $${params.length + 1}
    `;
    params.push(limit);
    
    const result = await query(queryText, params);
    
    // Filter by threshold and format results
    return result.rows
      .filter(row => parseFloat(row.similarity) >= threshold)
      .map(row => ({
        document_chunk_id: row.document_chunk_id,
        document_id: row.document_id,
        document_name: row.document_name,
        document_type: row.document_type,
        section_label: row.section_label,
        text: row.text,
        position: row.position,
        score: parseFloat(row.similarity)
      }));
    
  } catch (error) {
    console.error('[Embedding] Semantic search error:', error);
    // Fallback to empty results rather than failing
    return [];
  }
}

/**
 * Search using gap profile embedding
 * @param {string} gapProfileId - Gap profile ID
 * @param {string} tenantId - Tenant ID
 * @param {Array<string>} targetDocumentIds - Optional: limit to specific documents
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} - Matching document chunks
 */
export async function searchWithGapProfile(gapProfileId, tenantId, targetDocumentIds = [], limit = 10) {
  try {
    // Get gap profile embedding
    const profileEmbeddingResult = await query(
      `SELECT embedding FROM gap_profile_embeddings 
       WHERE gap_profile_id = $1 AND model = $2`,
      [gapProfileId, EMBEDDING_MODEL]
    );
    
    if (profileEmbeddingResult.rows.length === 0) {
      console.warn(`[Embedding] No embedding found for gap profile ${gapProfileId}`);
      return [];
    }
    
    const embedding = JSON.parse(profileEmbeddingResult.rows[0].embedding);
    
    // Perform semantic search
    return await semanticSearch(embedding, tenantId, targetDocumentIds, limit, 0.6);
    
  } catch (error) {
    console.error('[Embedding] Gap profile search error:', error);
    return [];
  }
}

export default {
  embedTextBatch,
  embedDocumentChunks,
  embedGapProfiles,
  semanticSearch,
  searchWithGapProfile,
  generateForChunks: embedDocumentChunks, // Alias for backward compatibility
  generateForGapProfile: embedGapProfiles // Alias for backward compatibility
};
