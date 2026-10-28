/**
 * Vera Semantic Search Service
 * 
 * Uses text similarity to find semantically similar content
 * even when phrased differently
 * 
 * Note: Can be enhanced with embeddings/vector search if pgvector is available
 */

class VeraSemanticSearch {
  /**
   * Calculate text similarity using word overlap
   */
  static calculateSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = new Set(
      text1.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2)
    );
    
    const words2 = new Set(
      text2.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2)
    );

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = [...words1].filter(w => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;

    return union > 0 ? intersection / union : 0;
  }

  /**
   * Extract key terms from query
   */
  static extractKeyTerms(query) {
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'what', 'is', 'are', 'do', 'does', 'can', 'could', 'will', 'would',
      'vera', 'please', 'help', 'tell', 'give', 'show', 'me', 'you', 'about',
      'how', 'when', 'where', 'why', 'which', 'who'
    ]);

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopwords.has(word))
      .slice(0, 10);
  }

  /**
   * Semantic search across Q&A bank
   */
  static async semanticSearchQA(query, limit = 5) {
    try {
      const { queryEdcatAI } = await import('../../config/databases.js');
      
      // Get all Q&A entries
      const allQA = await queryEdcatAI(
        `SELECT 
          id, 
          COALESCE(question_text, user_query_pattern) as question,
          response_text as response,
          representative_examples,
          confidence_score
         FROM edcat.vera_query_response_bank
         WHERE persona_code = 'vera'
           AND is_active = TRUE
         LIMIT 5000`
      );

      if (allQA.rows.length === 0) return [];

      const queryTerms = this.extractKeyTerms(query);
      const queryText = queryTerms.join(' ');

      // Calculate similarity for each entry
      const scored = allQA.rows.map(row => {
        const questionText = `${row.question || ''} ${row.representative_examples || ''}`;
        const similarity = this.calculateSimilarity(queryText, questionText);
        
        return {
          id: row.id,
          question: row.question,
          response: row.response,
          similarity: similarity,
          confidence: parseFloat(row.confidence_score || 0.5)
        };
      });

      // Sort by similarity and return top matches
      return scored
        .filter(item => item.similarity > 0.1)  // Minimum 10% similarity
        .sort((a, b) => {
          // Sort by similarity first, then confidence
          if (Math.abs(a.similarity - b.similarity) > 0.05) {
            return b.similarity - a.similarity;
          }
          return b.confidence - a.confidence;
        })
        .slice(0, limit)
        .map(item => ({
          id: item.id,
          question: item.question,
          response: item.response,
          semanticScore: item.similarity,
          confidence: item.confidence
        }));

    } catch (error) {
      console.error('[SemanticSearch] Error:', error);
      return [];
    }
  }

  /**
   * Semantic search across requirements
   */
  static async semanticSearchRequirements(query, limit = 5) {
    try {
      const { queryPostgres } = await import('../../config/databases.js');
      
      const result = await queryPostgres(
        `SELECT 
          id, 
          clause_number, 
          requirement_text, 
          standard_id
         FROM public.parsed_requirements
         WHERE requirement_text IS NOT NULL
           AND LENGTH(requirement_text) > 20
         LIMIT 3000`
      );

      if (result.rows.length === 0) return [];

      const queryTerms = this.extractKeyTerms(query);
      const queryText = queryTerms.join(' ');

      // Calculate similarity for each requirement
      const scored = result.rows.map(row => {
        const similarity = this.calculateSimilarity(queryText, row.requirement_text || '');
        return {
          clause: row.clause_number,
          requirement: row.requirement_text,
          similarity: similarity,
          id: row.id
        };
      });

      return scored
        .filter(item => item.similarity > 0.15)  // Minimum 15% similarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => ({
          clause: item.clause,
          requirement: item.requirement,
          semanticScore: item.similarity
        }));

    } catch (error) {
      console.error('[SemanticSearch] Error:', error);
      return [];
    }
  }

  /**
   * Semantic search across terms
   */
  static async semanticSearchTerms(query, limit = 5) {
    try {
      const { queryEdcatAI } = await import('../../config/databases.js');
      
      const result = await queryEdcatAI(
        `SELECT 
          term, 
          acronym,
          definition,
          category
         FROM edcat.terms_and_definitions
         WHERE definition IS NOT NULL
         LIMIT 2000`
      );

      if (result.rows.length === 0) return [];

      const queryTerms = this.extractKeyTerms(query);
      const queryText = queryTerms.join(' ');

      // Calculate similarity for each term
      const scored = result.rows.map(row => {
        const termText = `${row.term || ''} ${row.definition || ''}`;
        const similarity = this.calculateSimilarity(queryText, termText);
        return {
          term: row.term,
          acronym: row.acronym,
          definition: row.definition,
          category: row.category,
          similarity: similarity
        };
      });

      return scored
        .filter(item => item.similarity > 0.1)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => ({
          term: item.term,
          acronym: item.acronym,
          definition: item.definition,
          semanticScore: item.similarity
        }));

    } catch (error) {
      console.error('[SemanticSearch] Error:', error);
      return [];
    }
  }
}

export default VeraSemanticSearch;

