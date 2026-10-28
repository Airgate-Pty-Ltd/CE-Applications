/**
 * Semantic Matcher Service
 * Matches procedures to clauses using multiple signals (keywords, n-grams, intent, structure)
 */

class SemanticMatcher {
  /**
   * Match a procedure to a clause
   * @param {Object} procedure - Procedure record {procedure_text, ...}
   * @param {Object} clause - Clause record {clause_text, intent, ...}
   * @returns {Promise<Object>} Match result with confidence, status, reasoning, gaps
   */
  async matchProcedureToClause(procedure, clause) {
    const signals = {
      keywordOverlap: this.calculateKeywordOverlap(procedure.procedure_text, clause.clause_text),
      ngramSimilarity: this.calculateNgramSimilarity(procedure.procedure_text, clause.clause_text),
      intentAlignment: this.calculateIntentAlignment(procedure.procedure_text, clause.intent),
      structureMatch: this.calculateStructureMatch(procedure.procedure_text, clause)
    };

    // Weighted combination (intent is most important)
    const confidence = (
      (signals.keywordOverlap * 0.25) +
      (signals.ngramSimilarity * 0.20) +
      (signals.intentAlignment * 0.35) +
      (signals.structureMatch * 0.20)
    );

    const reasoning = this.generateReasoning(signals, procedure, clause);
    const gaps = this.identifyGaps(clause, procedure, confidence);

    return {
      confidence: Math.min(Math.max(confidence, 0), 1),
      status: confidence > 0.75 ? 'full' : confidence > 0.50 ? 'partial' : 'none',
      reasoning,
      gaps,
      signals
    };
  }

  calculateKeywordOverlap(procText, clauseText) {
    const procTerms = this.extractKeyTerms(procText);
    const clauseTerms = this.extractKeyTerms(clauseText);

    if (clauseTerms.length === 0) return 0;

    const matches = procTerms.filter(t => clauseTerms.includes(t));
    const overlap = matches.length / clauseTerms.length;

    return Math.min(overlap, 1);
  }

  calculateNgramSimilarity(procText, clauseText) {
    const procNgrams = this.extractNgrams(procText, 2);
    const clauseNgrams = this.extractNgrams(clauseText, 2);

    if (clauseNgrams.length === 0) return 0;

    const matches = procNgrams.filter(ng => clauseNgrams.includes(ng));
    return matches.length / clauseNgrams.length;
  }

  calculateIntentAlignment(procText, intent) {
    if (!intent) return 0.5;

    const intentKeywords = this.extractKeyTerms(intent);
    const procTerms = this.extractKeyTerms(procText);

    const matches = intentKeywords.filter(k => procTerms.includes(k));
    return matches.length / Math.max(intentKeywords.length, 1);
  }

  calculateStructureMatch(procText, clause) {
    let score = 0;

    if (procText.toLowerCase().includes('step') || procText.toLowerCase().includes('procedure')) {
      score += 0.20;
    }

    if (/^\s*\d+\./m.test(procText)) {
      score += 0.15;
    }

    const procShalls = (procText.match(/shall/gi) || []).length;
    const clauseShalls = (clause.clause_text.match(/shall/gi) || []).length;

    if (procShalls > 0 && clauseShalls > 0) {
      score += 0.15;
    }

    if (procText.toLowerCase().includes('responsible')) {
      score += 0.15;
    }

    return Math.min(score, 1);
  }

  extractKeyTerms(text) {
    const stopwords = [
      'the', 'this', 'that', 'from', 'with', 'have', 'will', 'must', 'shall',
      'should', 'are', 'and', 'but', 'for', 'not', 'all', 'can', 'may'
    ];

    const words = text
      .toLowerCase()
      .match(/\b\w+\b/g) || [];

    return [...new Set(
      words.filter(w => w.length > 4 && !stopwords.includes(w))
    )];
  }

  extractNgrams(text, n) {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const ngrams = [];

    for (let i = 0; i < words.length - n + 1; i++) {
      ngrams.push(words.slice(i, i + n).join(' '));
    }

    return [...new Set(ngrams)];
  }

  generateReasoning(signals, procedure, clause) {
    let reasoning = '';

    if (signals.intentAlignment > 0.80) {
      reasoning = `✓ Procedure clearly addresses the intent: ${clause.intent || 'requirement'}`;
    } else if (signals.intentAlignment > 0.50) {
      reasoning = `~ Procedure partially addresses the intent`;
    } else {
      reasoning = `✗ Procedure does not clearly address the intent`;
    }

    if (signals.keywordOverlap > 0.70) {
      reasoning += `\n✓ Strong keyword alignment (${Math.round(signals.keywordOverlap * 100)}%)`;
    }

    if (signals.structureMatch > 0.50) {
      reasoning += `\n✓ Procedure is well-structured`;
    }

    return reasoning;
  }

  identifyGaps(clause, procedure, confidence) {
    const gaps = [];

    if (clause.requirement_type === 'Record' && !procedure.procedure_text.toLowerCase().includes('record')) {
      gaps.push({
        gap: 'Missing reference to records/documentation',
        severity: 'major',
        recommendation: 'Add section defining what records are required'
      });
    }

    if (clause.requirement_type === 'Responsibility' && !procedure.procedure_text.toLowerCase().includes('responsible')) {
      gaps.push({
        gap: 'Missing role/responsibility assignments',
        severity: 'major',
        recommendation: 'Clearly define who is responsible for each step'
      });
    }

    if (!procedure.procedure_text.toLowerCase().includes('approval') &&
        (clause.clause_text.toLowerCase().includes('approve') ||
         clause.clause_text.toLowerCase().includes('authorization'))) {
      gaps.push({
        gap: 'Missing approval/authorization step',
        severity: 'major',
        recommendation: 'Add approval step to procedure'
      });
    }

    if (confidence < 0.55) {
      gaps.push({
        gap: 'Unclear connection to requirement',
        severity: 'minor',
        recommendation: 'Review and clarify procedure language'
      });
    }

    return gaps;
  }
}

export default SemanticMatcher;

