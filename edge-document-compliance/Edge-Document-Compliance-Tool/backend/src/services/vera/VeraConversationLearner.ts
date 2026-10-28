/**
 * Vera Conversation Learner
 * 
 * Implements few-shot learning within a conversation session.
 * Learns from examples and user feedback immediately, without batch processing.
 */

export interface ConversationExample {
  intent: string;
  query: string;
  response: string;
  feedback?: string;
  timestamp: number;
  similarity?: number;
}

export class VeraConversationLearner {
  private conversationExamples: ConversationExample[] = [];
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Record an example from this conversation for immediate learning
   */
  async recordExample(
    intent: string,
    query: string,
    response: string,
    userFeedback?: string
  ): Promise<void> {
    const example: ConversationExample = {
      intent,
      query,
      response,
      feedback: userFeedback,
      timestamp: Date.now()
    };

    this.conversationExamples.push(example);
    console.log(`[VeraConversationLearner] Recorded example for intent: ${intent} (${this.conversationExamples.length} total)`);
  }

  /**
   * Get relevant examples from THIS conversation that match the current query
   */
  async getRelevantExamplesForQuery(currentQuery: string, limit: number = 3): Promise<ConversationExample[]> {
    if (this.conversationExamples.length === 0) {
      return [];
    }

    // Calculate similarity for each example
    const examplesWithSimilarity = this.conversationExamples.map(ex => ({
      ...ex,
      similarity: this.calculateSimilarity(currentQuery, ex.query)
    }));

    // Sort by similarity (highest first) and filter by threshold
    const relevant = examplesWithSimilarity
      .filter(ex => ex.similarity >= 0.5) // Minimum similarity threshold
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit);

    console.log(`[VeraConversationLearner] Found ${relevant.length} relevant examples (similarity >= 0.5)`);
    return relevant;
  }

  /**
   * Apply learned patterns from examples to improve response
   */
  async applyLearnedPatterns(
    currentQuery: string,
    baseResponse: string,
    intent: string
  ): Promise<string> {
    const relevantExamples = await this.getRelevantExamplesForQuery(currentQuery);

    if (relevantExamples.length === 0) {
      return baseResponse; // No examples to learn from
    }

    // If we have a highly similar example (similarity > 0.8), consider adapting the response
    const verySimilar = relevantExamples.find(ex => (ex.similarity || 0) > 0.8);

    if (verySimilar) {
      // If user provided feedback on this example, incorporate it
      if (verySimilar.feedback) {
        console.log(`[VeraConversationLearner] Applying feedback from similar example`);
        // Incorporate feedback into response style/structure
        return this.incorporateFeedback(baseResponse, verySimilar.feedback);
      }

      // If same intent and similar query, adapt response structure
      if (verySimilar.intent === intent) {
        console.log(`[VeraConversationLearner] Adapting response based on similar example`);
        return this.adaptResponseStructure(baseResponse, verySimilar.response);
      }
    }

    return baseResponse;
  }

  /**
   * Record user feedback/correction for learning
   */
  async recordFeedback(
    query: string,
    originalResponse: string,
    feedback: string,
    isCorrection: boolean = false
  ): Promise<void> {
    // Find the most recent example matching this query
    const matchingExample = this.conversationExamples
      .filter(ex => this.calculateSimilarity(query, ex.query) > 0.7)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (matchingExample) {
      matchingExample.feedback = feedback;
      console.log(`[VeraConversationLearner] Recorded feedback for example (correction: ${isCorrection})`);
    } else {
      // Create new example from feedback
      await this.recordExample('unknown', query, originalResponse, feedback);
    }
  }

  /**
   * Calculate similarity between two strings (Jaccard similarity)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const tokens1 = new Set(str1.toLowerCase().match(/\b\w+\b/g) || []);
    const tokens2 = new Set(str2.toLowerCase().match(/\b\w+\b/g) || []);

    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }

  /**
   * Incorporate user feedback into response
   */
  private incorporateFeedback(response: string, feedback: string): string {
    // Simple feedback incorporation - can be enhanced
    if (feedback.toLowerCase().includes('more detail')) {
      return response + '\n\nWould you like me to provide more detail on any specific aspect?';
    }
    if (feedback.toLowerCase().includes('simpler') || feedback.toLowerCase().includes('simplify')) {
      // Try to simplify response (basic implementation)
      return response.split('\n').slice(0, 3).join('\n') + '\n\nLet me know if you need more detail.';
    }
    if (feedback.toLowerCase().includes('example')) {
      return response + '\n\nWould you like me to provide a specific example?';
    }

    return response;
  }

  /**
   * Adapt response structure based on similar example
   */
  private adaptResponseStructure(baseResponse: string, exampleResponse: string): string {
    // If example response has a specific structure (e.g., numbered list, sections),
    // try to apply similar structure to base response
    if (exampleResponse.includes('1.') || exampleResponse.includes('•')) {
      // Example uses lists - try to structure base response similarly
      const lines = baseResponse.split('\n').filter(l => l.trim().length > 0);
      if (lines.length > 2) {
        return lines.map((line, idx) => `${idx + 1}. ${line}`).join('\n');
      }
    }

    return baseResponse; // No adaptation needed
  }

  /**
   * Clear conversation examples (for new session)
   */
  clearExamples(): void {
    this.conversationExamples = [];
    console.log(`[VeraConversationLearner] Cleared examples for session: ${this.sessionId}`);
  }

  /**
   * Get all examples for this conversation
   */
  getAllExamples(): ConversationExample[] {
    return [...this.conversationExamples];
  }
}

