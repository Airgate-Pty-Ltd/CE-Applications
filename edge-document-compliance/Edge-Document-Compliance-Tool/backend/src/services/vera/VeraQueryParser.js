/**
 * Vera Query Parser
 * Enhanced with comprehensive intent taxonomy and better query understanding
 * Completely self-contained - NO OpenAI dependencies
 */

// Intent taxonomy constants
const INTENT_TYPES = {
  CLAUSE_EXPLANATION: 'CLAUSE_EXPLANATION',
  GAP_ANALYSIS: 'GAP_ANALYSIS',
  IMPLEMENTATION_ADVICE: 'IMPLEMENTATION_ADVICE',
  REGULATORY_LOOKUP: 'REGULATORY_LOOKUP',
  STANDARD_COMPARISON: 'STANDARD_COMPARISON',
  TERM_DEFINITION: 'TERM_DEFINITION',
  AUDIT_PREPARATION: 'AUDIT_PREPARATION',
  ROOT_CAUSE_HELP: 'ROOT_CAUSE_HELP',
  TRAINING_GUIDANCE: 'TRAINING_GUIDANCE',
  META_QUESTION: 'META_QUESTION',
  RESEARCH: 'RESEARCH',
  GENERIC_QUESTION: 'GENERIC_QUESTION'
};

const VeraQueryParser = {

  /**
   * Main parse function - maps to the interface expected by VeraCoreEngine
   */
  async parse(userQuery) {
    const lowerQuery = userQuery.toLowerCase().trim();

    // First check for meta questions (about Vera herself)
    if (this.isMetaQuestion(lowerQuery)) {
      return {
        type: INTENT_TYPES.META_QUESTION,
        confidence: 0.95,
        metaType: this.detectMetaType(lowerQuery),
        rawQuery: userQuery
      };
    }

    // Parse the query comprehensively
    const result = await this.parseComprehensiveQuery(userQuery);
    
    return {
      type: result.intent || INTENT_TYPES.GENERIC_QUESTION,
      confidence: result.confidence || 0.7,
      ...result.parsedDetails
    };
  },

  /**
   * Detect meta questions (about Vera)
   */
  isMetaQuestion(lowerQuery) {
    const metaPatterns = [
      /what.*your.*name/i,
      /who.*are.*you/i,
      /what.*does.*vera.*mean/i,
      /what.*is.*vera/i,
      /tell.*me.*about.*yourself/i,
      /what.*can.*you.*do/i,
      /your.*capabilities/i,
      /your.*abilities/i
    ];

    return metaPatterns.some(pattern => pattern.test(lowerQuery));
  },

  /**
   * Detect what type of meta question
   */
  detectMetaType(lowerQuery) {
    if (/name|vera.*mean|what.*is.*vera/i.test(lowerQuery)) return 'NAME';
    if (/who.*are.*you|yourself/i.test(lowerQuery)) return 'IDENTITY';
    if (/capabilities|abilities|what.*can.*you.*do/i.test(lowerQuery)) return 'CAPABILITIES';
    return 'GENERAL';
  },

  /**
   * Parse query comprehensively with intent detection
   */
  async parseComprehensiveQuery(userQuery) {
    const lowerQuery = userQuery.toLowerCase();
    
    // Extract components first
    const components = this.extractComponents(userQuery);

    // Detect intent type
    const intent = this.detectIntent(lowerQuery, components);

    // Detect mode/subtype
    const mode = this.detectMode(lowerQuery, intent);

    return {
      intent,
      mode,
      confidence: this.calculateConfidence(intent, components),
      parsedDetails: {
        ...components,
        intent,
        mode
      }
    };
  },

  /**
   * Detect intent type using comprehensive taxonomy
   */
  detectIntent(lowerQuery, components) {
    // CLAUSE_EXPLANATION
    if (this.matchesIntent(lowerQuery, [
      'what does', 'what does clause', 'explain clause', 'tell me about clause',
      'what says', 'what requires', 'show me clause'
    ]) || components.clauseNumber) {
      return INTENT_TYPES.CLAUSE_EXPLANATION;
    }

    // GAP_ANALYSIS
    if (this.matchesIntent(lowerQuery, [
      'gap', 'gaps', 'where are we weak', 'compliance gaps', 'do we comply',
      'missing', 'non-compliance', 'findings', 'what are we missing'
    ])) {
      return INTENT_TYPES.GAP_ANALYSIS;
    }

    // IMPLEMENTATION_ADVICE
    if (this.matchesIntent(lowerQuery, [
      'how do i implement', 'how to implement', 'how should we', 'how can we',
      'implementation', 'best practice', 'recommendation for'
    ])) {
      return INTENT_TYPES.IMPLEMENTATION_ADVICE;
    }

    // REGULATORY_LOOKUP
    if (this.matchesIntent(lowerQuery, [
      'faa', 'easa', 'casa', 'caac', 'part 21', 'part 145', 'regulatory',
      'regulation', 'cfr'
    ]) || components.regulatoryCode) {
      return INTENT_TYPES.REGULATORY_LOOKUP;
    }

    // STANDARD_COMPARISON
    if (this.matchesIntent(lowerQuery, [
      'compare', 'difference between', 'versus', 'vs', 'what is the difference',
      'how does.*differ', 'similarities'
    ])) {
      return INTENT_TYPES.STANDARD_COMPARISON;
    }

    // TERM_DEFINITION
    if (this.matchesIntent(lowerQuery, [
      'what is', 'define', 'what does.*mean', 'explain.*term',
      'meaning of', 'definition of'
    ]) && !components.clauseNumber) {
      return INTENT_TYPES.TERM_DEFINITION;
    }

    // AUDIT_PREPARATION
    if (this.matchesIntent(lowerQuery, [
      'audit prep', 'prepare for audit', 'audit readiness', 'getting ready for audit',
      'audit checklist', 'what will auditors look for'
    ])) {
      return INTENT_TYPES.AUDIT_PREPARATION;
    }

    // ROOT_CAUSE_HELP
    if (this.matchesIntent(lowerQuery, [
      'root cause', 'why did', 'why is', 'troubleshoot', 'diagnose',
      'what went wrong', 'how to fix'
    ])) {
      return INTENT_TYPES.ROOT_CAUSE_HELP;
    }

    // TRAINING_GUIDANCE
    if (this.matchesIntent(lowerQuery, [
      'training', 'how to train', 'training material', 'competence',
      'who needs training', 'training requirements'
    ])) {
      return INTENT_TYPES.TRAINING_GUIDANCE;
    }

    // RESEARCH
    if (this.matchesIntent(lowerQuery, [
      'research', 'find', 'look up', 'search', 'tell me about'
    ])) {
      return INTENT_TYPES.RESEARCH;
    }

    return INTENT_TYPES.GENERIC_QUESTION;
  },

  /**
   * Check if query matches intent patterns
   */
  matchesIntent(query, patterns) {
    return patterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
      return regex.test(query);
    });
  },

  /**
   * Detect mode/subtype
   */
  detectMode(lowerQuery, intent) {
    if (intent === INTENT_TYPES.CLAUSE_EXPLANATION) {
      if (lowerQuery.includes('what does') || lowerQuery.includes('what says')) return 'what';
      if (lowerQuery.includes('explain') || lowerQuery.includes('tell me about')) return 'explain';
      if (lowerQuery.includes('how to implement') || lowerQuery.includes('implement')) return 'implementation';
      return 'general';
    }

    if (intent === INTENT_TYPES.GAP_ANALYSIS) {
      if (lowerQuery.includes('compare') || lowerQuery.includes('against')) return 'comparison';
      if (lowerQuery.includes('missing') || lowerQuery.includes('what are we')) return 'identification';
      return 'full_analysis';
    }

    return 'general';
  },

  /**
   * Extract comprehensive components from query
   */
  extractComponents(query) {
    const lowerQuery = query.toLowerCase();

    // Extract clause numbers (e.g., "8.7", "7.5.3.2", "21.137(j)")
    const clausePatterns = [
      /clause\s+([0-9]+(?:\.[0-9]+)*(?:\([a-z]\))?)/i,
      /section\s+([0-9]+(?:\.[0-9]+)*)/i,
      /\b([0-9]+\.[0-9]+(?:\.[0-9]+)*(?:\([a-z]\))?)\b/
    ];
    let clauseNumber = null;
    for (const pattern of clausePatterns) {
      const match = query.match(pattern);
      if (match) {
        clauseNumber = match[1];
        break;
      }
    }

    // Extract standard codes
    const standardPattern = /(?:iso|as|iatf|iso\/?iec)[\s\-]*(?:9001|9100|9110|13485|22000|16949|\d{4,5})/i;
    const standardMatch = query.match(standardPattern);
    let standardCode = null;
    if (standardMatch) {
      standardCode = standardMatch[0].replace(/\s+/g, '-').toUpperCase();
    }

    // Extract regulatory codes
    const regulatoryPattern = /(faa|easa|casa|caac|fda)(?:\s+part\s+(\d+))?/i;
    const regulatoryMatch = query.match(regulatoryPattern);
    let regulatoryCode = null;
    let partNumber = null;
    if (regulatoryMatch) {
      regulatoryCode = regulatoryMatch[1].toUpperCase();
      partNumber = regulatoryMatch[2];
    }

    // Extract terms/concepts
    const terms = this.extractTerms(query);

    return {
      clauseNumber,
      standardCode,
      regulatoryCode,
      partNumber,
      terms,
      rawQuery: query
    };
  },

  /**
   * Extract terms/concepts from query
   */
  extractTerms(query) {
    const commonTerms = [
      'management review', 'corrective action', 'preventive action', 'CAPA',
      'internal audit', 'document control', 'record control', 'competence',
      'training', 'supplier', 'design', 'development', 'production', 'monitoring'
    ];

    const foundTerms = [];
    const lowerQuery = query.toLowerCase();

    commonTerms.forEach(term => {
      if (lowerQuery.includes(term)) {
        foundTerms.push(term);
      }
    });

    return foundTerms;
  },

  /**
   * Calculate confidence based on intent and components
   */
  calculateConfidence(intent, components) {
    let confidence = 0.5;

    // Boost confidence if we found specific components
    if (components.clauseNumber) confidence += 0.2;
    if (components.standardCode) confidence += 0.15;
    if (components.regulatoryCode) confidence += 0.15;
    if (components.terms.length > 0) confidence += 0.1;

    // Boost for specific intents
    if (intent === INTENT_TYPES.CLAUSE_EXPLANATION && components.clauseNumber) {
      confidence = 0.95;
    }

    return Math.min(confidence, 0.95);
  },

  // Legacy methods for backward compatibility
  async parseResearchRequest(userQuery) {
    console.log(`[VeraQueryParser] Parsing request: "${userQuery}"`);

    const isInScope = await this.validateScope(userQuery);
    if (!isInScope) {
      return {
        error: 'Out of scope',
        message: 'I can only research compliance standards, regulations, and requirements.',
        suggestion: 'Try asking about specific standards like "ISO 9001" or "FDA medical device regulations"'
      };
    }

    const requestType = await this.classifyRequest(userQuery);
    const parsed = await this.extractComponents(userQuery, requestType);
    const strategy = await this.determineSearchStrategy(parsed);

    if (!this.isRequestComplete(parsed)) {
      return {
        clarification_needed: true,
        message: await this.askForClarification(parsed),
        partial_parsed: parsed
      };
    }

    return {
      success: true,
      request_type: requestType,
      parsed_details: parsed,
      search_strategy: strategy,
      estimated_duration_seconds: this.estimateResearchDuration(strategy)
    };
  },

  async validateScope(query) {
    const scopeKeywords = [
      'iso', 'standard', 'regulation', 'requirement', 'compliance',
      'faa', 'fda', 'easa', 'caac', 'ccar', 'mdsap',
      'aerospace', 'medical device', 'food safety', 'automotive',
      'manufacturing', 'quality', 'audit', 'certification',
      'procedure', 'requirement', 'process', 'clause', 'section'
    ];

    const lowerQuery = query.toLowerCase();
    return scopeKeywords.some(kw => lowerQuery.includes(kw));
  },

  async classifyRequest(query) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('iso') || lowerQuery.includes('standard') || lowerQuery.includes('as9100') || lowerQuery.includes('as9110')) {
      return 'standard_research';
    }
    if (lowerQuery.includes('regulation') || lowerQuery.includes('regulatory') || lowerQuery.includes('faa') || lowerQuery.includes('fda') || lowerQuery.includes('easa')) {
      return 'regulation_research';
    }
    if (lowerQuery.includes('country') || lowerQuery.includes('bangladesh') || lowerQuery.includes('mexico') || lowerQuery.includes('china') || lowerQuery.includes('india')) {
      return 'country_regulations';
    }
    if (lowerQuery.includes('compare') || lowerQuery.includes('difference') || lowerQuery.includes('versus')) {
      return 'comparison';
    }
    if (lowerQuery.includes('industry') || lowerQuery.includes('aerospace') || lowerQuery.includes('medical') || lowerQuery.includes('automotive')) {
      return 'industry_regulations';
    }
    return 'standard_research';
  },

  async determineSearchStrategy(parsed) {
    const strategy = {
      search_sources: [],
      search_queries: [],
      expected_findings: []
    };

    if (parsed.standards && parsed.standards.length > 0) {
      strategy.search_sources.push(
        'ISO.org',
        'Google Scholar',
        'standards databases',
        'certification body websites'
      );

      strategy.search_queries = parsed.standards.map(std => 
        `${std} standard requirements`
      );
    }

    if (parsed.countries && parsed.countries.length > 0) {
      strategy.search_sources.push(
        'government websites',
        'regulatory agency sites',
        'country-specific standards bodies',
        'trade organization websites'
      );

      strategy.search_queries = parsed.countries.map(country =>
        `${country} regulations ${parsed.industries ? parsed.industries[0] : 'manufacturing'}`
      );
    }

    if (parsed.industries && parsed.industries.length > 0) {
      strategy.search_sources.push(
        'industry association websites',
        'compliance guides',
        'professional certifications'
      );

      strategy.search_queries.push(
        `${parsed.industries[0]} compliance requirements`,
        `${parsed.industries[0]} standards overview`
      );
    }

    return strategy;
  },

  isRequestComplete(parsed) {
    return parsed.primary_topic && (
      (parsed.standards && parsed.standards.length > 0) ||
      (parsed.countries && parsed.countries.length > 0) ||
      (parsed.industries && parsed.industries.length > 0)
    );
  },

  async askForClarification(parsed) {
    if (!parsed.primary_topic) {
      return 'Could you clarify what standard or regulation you want me to research?';
    }
    if ((!parsed.countries || parsed.countries.length === 0) && 
        (!parsed.industries || parsed.industries.length === 0)) {
      return `You mentioned ${parsed.primary_topic}. Should I research this globally, or for a specific country or industry?`;
    }
    return 'Could you provide more details about what aspect you\'re interested in?';
  },

  estimateResearchDuration(strategy) {
    const baseTime = 30;
    const timePerQuery = 15;
    const timePerSource = 10;

    return baseTime + 
           (strategy.search_queries.length * timePerQuery) + 
           (strategy.search_sources.length * timePerSource);
  }
};

// Export intent types for use by other modules
VeraQueryParser.INTENT_TYPES = INTENT_TYPES;

export default VeraQueryParser;
