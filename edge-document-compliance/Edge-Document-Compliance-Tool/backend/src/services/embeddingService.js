/**
 * Embedding Service
 * Converts learning blocks and text into embeddings for semantic search and AI context
 * Supports multiple embedding strategies: TF-IDF (local), OpenAI, or custom models
 */

import crypto from 'crypto';

/**
 * Simple TF-IDF based embedding (for local use without external APIs)
 * This creates a vector representation based on term frequency
 */
class TFIDFEmbedding {
  constructor() {
    this.vocabulary = new Map();
    this.documentFrequencies = new Map();
    this.totalDocuments = 0;
  }

  /**
   * Build vocabulary from a collection of texts
   * @param {Array<string>} texts - Array of text documents
   */
  buildVocabulary(texts) {
    this.vocabulary.clear();
    this.documentFrequencies.clear();
    this.totalDocuments = texts.length;

    texts.forEach((text, docIndex) => {
      const words = this.tokenize(text);
      const uniqueWords = new Set(words);
      
      uniqueWords.forEach(word => {
        if (!this.vocabulary.has(word)) {
          this.vocabulary.set(word, this.vocabulary.size);
        }
        this.documentFrequencies.set(
          word,
          (this.documentFrequencies.get(word) || 0) + 1
        );
      });
    });

    console.log(`✓ Built vocabulary with ${this.vocabulary.size} unique terms`);
  }

  /**
   * Tokenize text into words
   * @param {string} text - Input text
   * @returns {Array<string>} Array of tokens
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  /**
   * Calculate TF-IDF vector for a text
   * @param {string} text - Input text
   * @returns {Array<number>} TF-IDF vector
   */
  embed(text) {
    const words = this.tokenize(text);
    const termFrequencies = new Map();
    
    // Calculate term frequency
    words.forEach(word => {
      termFrequencies.set(word, (termFrequencies.get(word) || 0) + 1);
    });

    // Calculate TF-IDF
    const vector = new Array(this.vocabulary.size).fill(0);
    const maxFreq = Math.max(...Array.from(termFrequencies.values()));

    termFrequencies.forEach((freq, word) => {
      const wordIndex = this.vocabulary.get(word);
      if (wordIndex !== undefined) {
        const tf = freq / maxFreq;
        const df = this.documentFrequencies.get(word) || 1;
        const idf = Math.log(this.totalDocuments / df);
        vector[wordIndex] = tf * idf;
      }
    });

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return vector.map(val => val / magnitude);
    }

    return vector;
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Array<number>} vec1 - First vector
   * @param {Array<number>} vec2 - Second vector
   * @returns {number} Similarity score (0-1)
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      return 0;
    }

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }
}

/**
 * OpenAI Embedding Service - REMOVED
 * Vera now uses only local TF-IDF embeddings - no external dependencies
 */

/**
 * Main Embedding Service
 */
class EmbeddingService {
  constructor(strategy = 'tfidf', options = {}) {
    // Vera now uses only local TF-IDF embeddings - no external dependencies
    this.strategy = 'tfidf'; // Force TF-IDF only
    this.embedder = new TFIDFEmbedding();
    
    if (strategy !== 'tfidf') {
      console.warn('[EmbeddingService] OpenAI embeddings removed. Using TF-IDF only.');
    }
  }

  /**
   * Build vocabulary from learning blocks (for TF-IDF)
   * @param {Array<Object>} learningBlocks - Array of learning blocks
   */
  buildVocabulary(learningBlocks) {
    if (this.strategy === 'tfidf' && this.embedder instanceof TFIDFEmbedding) {
      const texts = learningBlocks.map(block => 
        `${block.requirement_text} ${block.keywords?.join(' ') || ''}`
      );
      this.embedder.buildVocabulary(texts);
    }
  }

  /**
   * Generate embedding for a learning block
   * @param {Object} learningBlock - Learning block object
   * @returns {Promise<Array<number>>} Embedding vector
   */
  async embedLearningBlock(learningBlock) {
    const text = this.buildEmbeddingText(learningBlock);
    return await this.embed(text);
  }

  /**
   * Generate embedding for raw text
   * @param {string} text - Input text
   * @returns {Promise<Array<number>>} Embedding vector
   */
  async embed(text) {
    // Always use TF-IDF - no external dependencies
    return this.embedder.embed(text);
  }

  /**
   * Build text representation of learning block for embedding
   * @param {Object} learningBlock - Learning block
   * @returns {string} Combined text
   */
  buildEmbeddingText(learningBlock) {
    const parts = [
      learningBlock.requirement_text || '',
      learningBlock.clause_number || '',
      learningBlock.standard_code || '',
      ...(learningBlock.keywords || []),
      learningBlock.requirement_type || '',
      ...(learningBlock.context?.tags || [])
    ].filter(Boolean);

    return parts.join(' ');
  }

  /**
   * Find similar learning blocks using cosine similarity
   * @param {string} queryText - Query text
   * @param {Array<Object>} learningBlocks - Array of learning blocks with embeddings
   * @param {number} topK - Number of top results to return
   * @returns {Promise<Array<Object>>} Array of similar learning blocks with similarity scores
   */
  async findSimilar(queryText, learningBlocks, topK = 5) {
    const queryEmbedding = await this.embed(queryText);
    const similarities = [];

    for (const block of learningBlocks) {
      if (!block.embedding || block.embedding.length === 0) {
        continue;
      }

      // Always use TF-IDF cosine similarity - no external dependencies
      const similarity = this.embedder.cosineSimilarity(queryEmbedding, block.embedding);

      similarities.push({
        block,
        similarity
      });
    }

    // Sort by similarity (descending) and return top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Array<number>} vec1 - First vector
   * @param {Array<number>} vec2 - Second vector
   * @returns {number} Similarity score (0-1)
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      return 0;
    }

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  /**
   * Generate hash for caching embeddings
   * @param {string} text - Input text
   * @returns {string} Hash string
   */
  generateHash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}

// Export singleton instance
let embeddingServiceInstance = null;

export function getEmbeddingService(strategy = null, options = {}) {
  if (!embeddingServiceInstance || strategy) {
    const selectedStrategy = strategy || process.env.EMBEDDING_STRATEGY || 'tfidf';
    embeddingServiceInstance = new EmbeddingService(selectedStrategy, options);
  }
  return embeddingServiceInstance;
}

export default EmbeddingService;

