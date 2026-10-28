/**
 * COMPLIANCE GAP ANALYZER
 * Matches requirements to procedures and identifies gaps
 * 5-signal matching algorithm with confidence scoring and audit trails
 */

/**
 * Main Analyzer Class
 */
export class ComplianceGapAnalyzer {
  constructor(options = {}) {
    this.options = {
      minMatchConfidence: options.minMatchConfidence || 0.70,
      ambiguousMin: options.ambiguousMin || 0.55,
      ambiguousMax: options.ambiguousMax || 0.80,
      ...options
    };

    this.results = {
      coveredRequirements: [],
      ambiguousRequirements: [],
      gapRequirements: [],
      allMatches: []
    };
  }

  /**
   * Main analyze function
   * @param {Array} standardRequirements - From Parser
   * @param {Array} customerProcedures - Extracted from customer QMS
   * @returns {Object} Gap analysis with covered, ambiguous, gaps
   */
  analyze(standardRequirements, customerProcedures) {
    console.log(`\n🔍 ANALYZER: Starting gap analysis`);
    console.log(`   Requirements: ${standardRequirements.length}`);
    console.log(`   Procedures: ${customerProcedures.length}`);

    try {
      // Reset results
      this.results = {
        coveredRequirements: [],
        ambiguousRequirements: [],
        gapRequirements: [],
        allMatches: []
      };

      // Match each requirement to procedures
      for (const requirement of standardRequirements) {
        const match = this.findBestMatch(requirement, customerProcedures);
        const classified = this.classifyMatch(requirement, match);

        this.results.allMatches.push(classified);

        // Classify into covered, ambiguous, or gap
        if (classified.matchConfidence >= this.options.minMatchConfidence) {
          this.results.coveredRequirements.push(classified);
        } else if (
          classified.matchConfidence >= this.options.ambiguousMin &&
          classified.matchConfidence < this.options.ambiguousMax
        ) {
          this.results.ambiguousRequirements.push(classified);
        } else {
          this.results.gapRequirements.push(classified);
        }
      }

      // Calculate summary
      const summary = this.calculateSummary(standardRequirements);

      console.log(`\n✅ ANALYSIS COMPLETE`);
      console.log(`   Covered: ${this.results.coveredRequirements.length} (${summary.coveragePercentage}%)`);
      console.log(`   Ambiguous: ${this.results.ambiguousRequirements.length}`);
      console.log(`   Gaps: ${this.results.gapRequirements.length}`);
      console.log(`   Avg match confidence: ${(summary.averageMatchConfidence * 100).toFixed(1)}%`);

      return {
        success: true,
        coveredRequirements: this.results.coveredRequirements,
        ambiguousRequirements: this.results.ambiguousRequirements,
        gapRequirements: this.results.gapRequirements,
        summary
      };

    } catch (error) {
      console.error(`❌ Analyzer error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find best matching procedure for a requirement
   */
  findBestMatch(requirement, procedures) {
    let bestMatch = {
      procedure: null,
      confidence: 0,
      signals: {}
    };

    for (const procedure of procedures) {
      const match = this.calculateMatchConfidence(requirement, procedure);

      if (match.totalConfidence > bestMatch.confidence) {
        bestMatch = {
          procedure,
          confidence: match.totalConfidence,
          signals: match.signals,
          reasoning: match.reasoning
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate match confidence using 5 signals
   */
  calculateMatchConfidence(requirement, procedure) {
    const signals = {
      keyword: this.signalKeywordMatch(requirement, procedure),
      ngram: this.signalNgramMatch(requirement, procedure),
      semantic: this.signalSemanticSimilarity(requirement, procedure),
      context: this.signalContextMatch(requirement, procedure),
      clauseRef: this.signalClauseReference(requirement, procedure)
    };

    const weights = {
      keyword: 0.40,
      ngram: 0.30,
      semantic: 0.20,
      context: 0.10,
      clauseRef: 0.10
    };

    // Calculate weighted total
    let totalConfidence = 0;
    const reasoning = [];

    for (const [signal, value] of Object.entries(signals)) {
      const weighted = value * weights[signal];
      totalConfidence += weighted;

      if (value > 0) {
        reasoning.push(`${signal}: ${(value * 100).toFixed(0)}%`);
      }
    }

    return {
      totalConfidence: Math.min(1.0, totalConfidence),
      signals,
      reasoning
    };
  }

  /**
   * Signal 1: Keyword Matching (0-0.40)
   */
  signalKeywordMatch(requirement, procedure) {
    const reqKeywords = this.extractKeywords(requirement.text);
    const procKeywords = this.extractKeywords(procedure.text || procedure.procedureText || '');

    if (reqKeywords.length === 0 || procKeywords.length === 0) return 0;

    // Count keyword matches
    const matches = reqKeywords.filter(kw => 
      procKeywords.some(pkw => this.wordsMatch(kw, pkw))
    );

    // Score: matches / total keywords
    const score = Math.min(matches.length / reqKeywords.length, 1.0);

    return score * 0.40;
  }

  /**
   * Signal 2: N-gram Matching (0-0.30)
   */
  signalNgramMatch(requirement, procedure) {
    const reqText = requirement.text.toLowerCase();
    const procText = (procedure.text || procedure.procedureText || '').toLowerCase();

    if (!reqText || !procText) return 0;

    // Extract 2-grams and 3-grams
    const reqGrams = this.extractNgrams(reqText, 3);
    const procGrams = this.extractNgrams(procText, 3);

    if (reqGrams.length === 0) return 0;

    // Count matching n-grams
    const matches = reqGrams.filter(gram => procGrams.includes(gram)).length;

    const score = Math.min(matches / reqGrams.length, 1.0);

    return score * 0.30;
  }

  /**
   * Signal 3: Semantic Similarity (0-0.20)
   */
  signalSemanticSimilarity(requirement, procedure) {
    const reqText = requirement.text.toLowerCase();
    const procText = (procedure.text || procedure.procedureText || '').toLowerCase();

    // Check if requirement intent is present in procedure
    const intentKeywords = {
      manage: ['manage', 'control', 'oversee', 'coordinate'],
      document: ['document', 'record', 'maintain', 'keep'],
      ensure: ['ensure', 'verify', 'confirm', 'validate'],
      define: ['define', 'establish', 'create', 'set'],
      monitor: ['monitor', 'track', 'measure', 'assess'],
      review: ['review', 'examine', 'assess', 'check'],
      control: ['control', 'manage', 'govern', 'regulate']
    };

    let semanticScore = 0;
    for (const [intent, keywords] of Object.entries(intentKeywords)) {
      const hasIntentInReq = keywords.some(kw => reqText.includes(kw));
      const hasIntentInProc = keywords.some(kw => procText.includes(kw));

      if (hasIntentInReq && hasIntentInProc) {
        semanticScore += 0.03; // +0.03 per matched intent
      }
    }

    return Math.min(semanticScore, 1.0) * 0.20;
  }

  /**
   * Signal 4: Context Matching (0-0.10)
   */
  signalContextMatch(requirement, procedure) {
    const reqTitle = (requirement.clauseTitle || '').toLowerCase();
    const procTitle = (procedure.title || procedure.procedureTitle || '').toLowerCase();

    // Type matching
    const typeMatches = {
      policy: ['policy', 'procedure', 'process', 'guideline'],
      procedure: ['procedure', 'process', 'workflow'],
      record: ['record', 'document', 'log', 'register'],
      evidence: ['evidence', 'proof', 'documentation']
    };

    let contextScore = 0;
    for (const keywords of Object.values(typeMatches)) {
      const hasInReq = keywords.some(kw => reqTitle.includes(kw));
      const hasInProc = keywords.some(kw => procTitle.includes(kw));

      if (hasInReq && hasInProc) {
        contextScore = 0.08; // Strong context match
        break;
      }
    }

    return contextScore * 0.10;
  }

  /**
   * Signal 5: Clause Reference (0-0.10)
   */
  signalClauseReference(requirement, procedure) {
    const clauseNum = requirement.clauseNumber;
    const procText = (procedure.text || procedure.procedureText || '').toLowerCase();

    // Check if procedure explicitly references the clause
    const patterns = [
      new RegExp(`clause\\s+${clauseNum.replace(/\./g, '\\.')}\\b`, 'i'),
      new RegExp(`\\b${clauseNum.replace(/\./g, '\\.')}\\b`, 'i'),
      new RegExp(`per\\s+${clauseNum.replace(/\./g, '\\.').replace(/\d+\.\d+/, '\\d+\\.\\d+')}`, 'i'),
      new RegExp(`iac\\s+${clauseNum.replace(/\./g, '\\.').replace(/\d+\.\d+/, '\\d+\\.\\d+')}`, 'i')
    ];

    const hasExplicitRef = patterns.some(p => p.test(procText));

    return hasExplicitRef ? 0.10 : 0;
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text) {
    if (!text) return [];

    const commonKeywords = [
      'shall', 'must', 'will', 'should',
      'process', 'procedure', 'policy', 'control', 'manage',
      'document', 'record', 'maintain', 'ensure', 'verify',
      'audit', 'review', 'define', 'establish', 'implement'
    ];

    const keywords = new Set();
    const lower = text.toLowerCase();

    for (const keyword of commonKeywords) {
      if (lower.includes(keyword)) {
        keywords.add(keyword);
      }
    }

    // Extract significant words (4+ chars, not too common)
    const words = text.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4 && !this.isCommonWord(w))
      .slice(0, 10);

    words.forEach(w => keywords.add(w));

    return Array.from(keywords);
  }

  /**
   * Extract n-grams from text
   */
  extractNgrams(text, size = 3) {
    const words = text.split(/\s+/).filter(w => w.length > 2);
    const ngrams = new Set();

    for (let i = 0; i < words.length - size + 1; i++) {
      const ngram = words.slice(i, i + size).join(' ');
      if (ngram.length > 5) {
        ngrams.add(ngram);
      }
    }

    return Array.from(ngrams);
  }

  /**
   * Check if two words match (exact or similar)
   */
  wordsMatch(word1, word2) {
    if (word1 === word2) return true;

    // Stemming for common variations
    const stem1 = this.stem(word1);
    const stem2 = this.stem(word2);

    return stem1 === stem2;
  }

  /**
   * Simple stemming
   */
  stem(word) {
    // Remove common endings
    return word
      .replace(/ing$/, '')
      .replace(/ed$/, '')
      .replace(/tion$/, '')
      .replace(/ment$/, '')
      .replace(/ness$/, '')
      .replace(/ity$/, '');
  }

  /**
   * Check if word is too common
   */
  isCommonWord(word) {
    const common = new Set([
      'the', 'and', 'that', 'this', 'with', 'from', 'have', 'been',
      'are', 'was', 'were', 'than', 'for', 'will', 'be', 'to', 'or',
      'by', 'on', 'in', 'at', 'it', 'an', 'as', 'is', 'can', 'may'
    ]);

    return common.has(word.toLowerCase());
  }

  /**
   * Classify a match result
   */
  classifyMatch(requirement, match) {
    let severity = 'LOW';

    // Determine severity based on requirement importance
    const criticalKeywords = ['critical', 'design', 'quality', 'safety', 'risk', 'audit'];
    const isCritical = criticalKeywords.some(kw => requirement.clauseTitle.toLowerCase().includes(kw));

    if (isCritical) {
      severity = 'HIGH';
    } else if (requirement.mandatory) {
      severity = 'MEDIUM';
    }

    return {
      requirementId: requirement.id,
      requirementClause: requirement.clauseNumber,
      requirementTitle: requirement.clauseTitle,
      requirementText: requirement.text,
      matchedProcedureId: match.procedure?.id || null,
      matchedProcedureTitle: match.procedure?.title || match.procedure?.procedureTitle || 'No match',
      matchedProcedureText: match.procedure?.text || match.procedure?.procedureText || '',
      matchConfidence: match.confidence,
      matchSignals: match.signals,
      matchReasoning: match.reasoning || [],
      severity: severity,
      auditTrail: {
        algorithm: '5-signal semantic matcher',
        signals: match.signals,
        reasoning: match.reasoning || [],
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(requirements) {
    const total = requirements.length;
    const covered = this.results.coveredRequirements.length;
    const ambiguous = this.results.ambiguousRequirements.length;
    const gaps = this.results.gapRequirements.length;

    const avgMatchConfidence = this.results.coveredRequirements.length > 0
      ? this.results.coveredRequirements.reduce((sum, r) => sum + r.matchConfidence, 0) / this.results.coveredRequirements.length
      : 0;

    return {
      totalRequirements: total,
      coveredRequirements: covered,
      ambiguousRequirements: ambiguous,
      gapRequirements: gaps,
      coveragePercentage: Math.round((covered / total) * 100),
      coveragePercentageDetailed: ((covered / total) * 100).toFixed(1),
      gapPercentage: Math.round((gaps / total) * 100),
      ambiguityRate: ((ambiguous / total) * 100).toFixed(1),
      averageMatchConfidence: Math.round(avgMatchConfidence * 100) / 100,
      highSeverityGaps: this.results.gapRequirements.filter(g => g.severity === 'HIGH').length,
      mediumSeverityGaps: this.results.gapRequirements.filter(g => g.severity === 'MEDIUM').length,
      lowSeverityGaps: this.results.gapRequirements.filter(g => g.severity === 'LOW').length,
      analysisCompleted: new Date().toISOString()
    };
  }

  /**
   * Get gaps sorted by severity
   */
  getGapsBySerevity() {
    const gaps = {
      HIGH: this.results.gapRequirements.filter(g => g.severity === 'HIGH'),
      MEDIUM: this.results.gapRequirements.filter(g => g.severity === 'MEDIUM'),
      LOW: this.results.gapRequirements.filter(g => g.severity === 'LOW')
    };

    return gaps;
  }

  /**
   * Get recommendations for closing gaps
   */
  getRecommendations() {
    const gaps = this.getGapsBySerevity();
    const recommendations = [];

    // High severity gaps
    if (gaps.HIGH.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        count: gaps.HIGH.length,
        action: 'Address immediately',
        timeframe: '0-30 days',
        gaps: gaps.HIGH
      });
    }

    // Medium severity gaps
    if (gaps.MEDIUM.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        count: gaps.MEDIUM.length,
        action: 'Address in next cycle',
        timeframe: '30-60 days',
        gaps: gaps.MEDIUM
      });
    }

    // Low severity gaps
    if (gaps.LOW.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        count: gaps.LOW.length,
        action: 'Address as resources allow',
        timeframe: '60-90 days',
        gaps: gaps.LOW
      });
    }

    return recommendations;
  }
}

export default ComplianceGapAnalyzer;

