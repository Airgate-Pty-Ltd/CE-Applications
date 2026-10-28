/**
 * Vera Interactive Clarification Engine
 * 
 * Detects ambiguity and asks clarifying questions before answering.
 * Prevents guessing and ensures accurate, context-aware responses.
 */

import { queryEdcatAI } from '../../config/databases.js';

export interface ClarificationResult {
  needsClarification: boolean;
  clarificationQuestions?: string[];
  ambiguities?: Ambiguity[];
  userQuerySummary?: string;
}

export interface Ambiguity {
  type: 'term_ambiguity' | 'context_gap' | 'scope_ambiguity';
  term?: string;
  possibleMeanings?: string[];
  question?: string;
  missing?: string;
  keyword?: string;
}

export class VeraInteractiveClarificationEngine {
  /**
   * Detects ambiguity and asks clarifying questions
   * Doesn't guess—clarifies first, then answers
   */
  async detectAmbiguityAndClarify(
    userQuery: string,
    context: any
  ): Promise<ClarificationResult> {
    const ambiguities: Ambiguity[] = [];

    try {
      // Check 1: Multiple interpretations of same term
      const termAmbiguities = await this.detectTermAmbiguity(userQuery);
      if (termAmbiguities.length > 0) {
        ambiguities.push(...termAmbiguities);
      }

      // Check 2: Missing context
      const contextGaps = await this.detectContextGaps(userQuery, context);
      if (contextGaps.length > 0) {
        ambiguities.push(...contextGaps);
      }

      // Check 3: Vague scope
      const scopeIssues = await this.detectScopeAmbiguity(userQuery);
      if (scopeIssues.length > 0) {
        ambiguities.push(...scopeIssues);
      }

      // If ambiguities found, generate clarifying questions
      if (ambiguities.length > 0) {
        const questions = await this.generateClarifyingQuestions(ambiguities);
        return {
          needsClarification: true,
          clarificationQuestions: questions,
          ambiguities: ambiguities,
          userQuerySummary: userQuery
        };
      }

      return { needsClarification: false };
    } catch (error: any) {
      console.error('[VeraInteractiveClarification] Error detecting ambiguity:', error);
      // On error, don't block - allow normal flow
      return { needsClarification: false };
    }
  }

  /**
   * Detect ambiguous terms with multiple meanings
   */
  private async detectTermAmbiguity(query: string): Promise<Ambiguity[]> {
    const ambiguities: Ambiguity[] = [];
    const terms = await this.extractKeyTerms(query);

    for (const term of terms) {
      try {
        // Check if term has multiple definitions in different contexts
        const definitions = await queryEdcatAI(
          `SELECT DISTINCT definition, context, category, source_standard
           FROM edcat.terms_and_definitions 
           WHERE term ILIKE $1
           LIMIT 5`,
          [term]
        );

        if (definitions.rows.length > 1) {
          // Check if definitions are significantly different
          const uniqueDefinitions = new Set(
            definitions.rows.map((r: any) => r.definition?.substring(0, 100) || '')
          );

          if (uniqueDefinitions.size > 1) {
            ambiguities.push({
              type: 'term_ambiguity',
              term: term,
              possibleMeanings: definitions.rows.map((r: any) => ({
                definition: r.definition?.substring(0, 150),
                context: r.context || r.category,
                source: r.source_standard
              }))
            });
          }
        }
      } catch (err: any) {
        // Non-fatal - continue checking other terms
        console.warn(`[VeraInteractiveClarification] Error checking term ${term}:`, err.message);
      }
    }

    return ambiguities;
  }

  /**
   * Detect missing context (vague references)
   */
  private async detectContextGaps(query: string, context: any): Promise<Ambiguity[]> {
    const gaps: Ambiguity[] = [];
    const lowerQuery = query.toLowerCase();

    // Common vague phrases that need clarification
    const vaguePhrases = [
      { phrase: 'the document', needs: 'Which document are you referring to?', type: 'document' },
      { phrase: 'the standard', needs: 'Which standard (ISO, AS, FAA, etc.)?', type: 'standard' },
      { phrase: 'our procedures', needs: 'Which procedures or which department?', type: 'procedure' },
      { phrase: 'this requirement', needs: 'Which requirement or clause?', type: 'requirement' },
      { phrase: 'the gap', needs: 'Gap in what? Which standard or document?', type: 'gap' },
      { phrase: 'it', needs: 'What specifically are you referring to?', type: 'pronoun' },
      { phrase: 'that', needs: 'What specifically are you referring to?', type: 'pronoun' }
    ];

    for (const { phrase, needs, type } of vaguePhrases) {
      if (lowerQuery.includes(phrase)) {
        // Check if context provides the missing information
        const hasContext = this.checkContextAvailability(phrase, type, context);

        if (!hasContext) {
          gaps.push({
            type: 'context_gap',
            missing: phrase,
            question: needs
          });
        }
      }
    }

    return gaps;
  }

  /**
   * Detect scope ambiguity (unclear boundaries)
   */
  private async detectScopeAmbiguity(query: string): Promise<Ambiguity[]> {
    const ambiguities: Ambiguity[] = [];
    const lowerQuery = query.toLowerCase();

    const scopeKeywords = [
      { keyword: 'gaps', question: 'What would you like me to analyze for gaps? (all documents, specific standard, specific procedure?)' },
      { keyword: 'issues', question: 'What scope should I analyze for issues? (entire system, specific process, specific standard?)' },
      { keyword: 'problems', question: 'What scope should I analyze for problems? (all procedures, specific department, specific standard?)' },
      { keyword: 'requirements', question: 'Which requirements? (all standards, specific standard, specific clause?)' },
      { keyword: 'compliance', question: 'Compliance with what? (all standards, specific standard, specific regulation?)' }
    ];

    for (const { keyword, question } of scopeKeywords) {
      if (lowerQuery.includes(keyword)) {
        // Check if scope is defined (look for "in", "for", "against", "with" + specific reference)
        const hasScope = /\b(in|for|against|with|under|per)\s+([A-Z][^\s]+(?:\s+[A-Z][^\s]+)*)/gi.test(query);

        if (!hasScope) {
          ambiguities.push({
            type: 'scope_ambiguity',
            keyword: keyword,
            question: question
          });
        }
      }
    }

    return ambiguities;
  }

  /**
   * Generate human-readable clarifying questions from ambiguities
   */
  private async generateClarifyingQuestions(ambiguities: Ambiguity[]): Promise<string[]> {
    const questions: string[] = [];

    for (const ambiguity of ambiguities) {
      if (ambiguity.type === 'term_ambiguity' && ambiguity.possibleMeanings) {
        const meanings = ambiguity.possibleMeanings.slice(0, 3); // Limit to 3 options
        questions.push(
          `When you say "${ambiguity.term}", do you mean:\n` +
          meanings.map((m: any, i: number) => 
            `${i + 1}) ${m.definition} (from ${m.source || m.context || 'general'})`
          ).join('\n') +
          `?`
        );
      } else if (ambiguity.type === 'context_gap' && ambiguity.question) {
        questions.push(ambiguity.question);
      } else if (ambiguity.type === 'scope_ambiguity' && ambiguity.question) {
        questions.push(ambiguity.question);
      }
    }

    // Limit to 3 questions to avoid overwhelming the user
    return questions.slice(0, 3);
  }

  /**
   * Extract key terms from query (simple NLP)
   */
  private async extractKeyTerms(query: string): Promise<string[]> {
    // Extract capitalized words/phrases (likely proper nouns or technical terms)
    const capitalizedTerms = query.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    
    // Extract common compliance/quality terms
    const qualityTerms = [
      'procedure', 'process', 'requirement', 'standard', 'clause', 'compliance',
      'audit', 'gap', 'nonconformance', 'corrective action', 'preventive action',
      'document control', 'change control', 'risk management', 'quality management'
    ];
    
    const foundQualityTerms = qualityTerms.filter(term => 
      query.toLowerCase().includes(term)
    );

    // Combine and deduplicate
    const allTerms = [...capitalizedTerms, ...foundQualityTerms];
    return Array.from(new Set(allTerms)).filter(term => term.length > 2);
  }

  /**
   * Check if context provides the missing information
   */
  private checkContextAvailability(phrase: string, type: string, context: any): boolean {
    switch (type) {
      case 'document':
        return !!(context.specificDocument || context.customerDocuments?.length > 0);
      case 'standard':
        return !!(context.standards?.length > 0 || context.detectedStandardCode);
      case 'procedure':
        return !!(context.procedures?.length > 0 || context.customerDocuments?.some((d: any) => 
          d.type?.toLowerCase().includes('procedure')
        ));
      case 'requirement':
        return !!(context.clauses?.length > 0 || context.requirements?.length > 0);
      case 'gap':
        return !!(context.gapAnalyses?.length > 0 || context.standards?.length > 0);
      default:
        return false;
    }
  }
}

