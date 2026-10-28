/**
 * Vera Professional Language
 * Enhanced with persona-aware responses, user expertise adaptation, and canonical explanation structure
 */

import edcatPersonality from '../edcatPersonality.js';

const VeraProfessionalLanguage = {
  // User expertise levels
  EXPERTISE_LEVELS: {
    NOVICE: 'novice',
    INTERMEDIATE: 'intermediate',
    EXPERT: 'expert'
  },

  // Response modes
  RESPONSE_MODES: {
    FRIENDLY: 'friendly',
    FORMAL: 'formal',
    REGULATOR_SAFE: 'regulator_safe'
  },

  /**
   * Refine text based on persona, user expertise, and context
   * This is the main entry point for language refinement
   */
  async refine({ persona, toneConfig, parsedQuery, draftAnswer, context = {} }) {
    const {
      userExpertise = this.estimateUserExpertise(context),
      isFirstResponse = false,
      isClosing = false,
      standardCode = null,
      clauseNumber = null,
      mode = this.detectResponseMode(context)
    } = context;

    // Step 1: Apply response mode adjustments
    let refined = this.applyResponseMode(draftAnswer, mode, context);

    // Step 2: Shape explanation depth based on expertise
    refined = this.adaptToExpertiseLevel(refined, userExpertise, context);

    // Step 3: Build canonical explanation structure if needed
    if (parsedQuery && (parsedQuery.type === 'CLAUSE_EXPLANATION' || clauseNumber)) {
      refined = await this.buildCanonicalExplanation({
        clauseNumber,
        standardCode,
        baseText: refined,
        userExpertise,
        mode,
        context
      });
    }

    // Step 4: Add opening/closing with persona awareness (respecting mode)
    const isHighFormality = mode === this.RESPONSE_MODES.REGULATOR_SAFE || 
                           mode === this.RESPONSE_MODES.FORMAL ||
                           edcatPersonality.detectHighFormalityContext(draftAnswer, context);
    
    refined = this.addPersonaPhrases(refined, persona, {
      isFirstResponse,
      isClosing,
      isHighFormality,
      mode
    });

    // Step 5: Sanitize language
    refined = this.sanitizeLanguage(refined);

    return { text: refined };
  },

  /**
   * Detect response mode from context
   */
  detectResponseMode(context) {
    // Check explicit user request
    const userMessage = context.userMessage || context.lastUserInput || '';
    const lower = userMessage.toLowerCase();
    
    if (lower.includes('regulator') || lower.includes('auditor') || lower.includes('audit-ready') ||
        lower.includes('faa') || lower.includes('easa')) {
      return this.RESPONSE_MODES.REGULATOR_SAFE;
    }
    
    if (lower.includes('formal') || lower.includes('businesslike') || lower.includes('professional')) {
      return this.RESPONSE_MODES.FORMAL;
    }
    
    if (lower.includes('friendly') || lower.includes('casual') || lower.includes('conversational')) {
      return this.RESPONSE_MODES.FRIENDLY;
    }
    
    // Check user preferences
    if (context.userPreferences && context.userPreferences.preferred_response_tone) {
      return context.userPreferences.preferred_response_tone;
    }
    
    // Default to friendly for normal interactions
    return this.RESPONSE_MODES.FRIENDLY;
  },

  /**
   * Apply response mode to text
   */
  applyResponseMode(text, mode, context) {
    switch (mode) {
      case this.RESPONSE_MODES.REGULATOR_SAFE:
        // Remove any cultural phrases, ensure clause-first, evidence-heavy
        text = this.removeCulturalPhrases(text);
        text = this.ensureClauseFirst(text, context);
        return this.ensureEvidenceHeavy(text);
        
      case this.RESPONSE_MODES.FORMAL:
        // Reduce personality, neutral tone
        text = this.reducePersonality(text);
        return text;
        
      case this.RESPONSE_MODES.FRIENDLY:
      default:
        // Keep personality as configured
        return text;
    }
  },

  /**
   * Remove cultural phrases for regulator-safe mode
   */
  removeCulturalPhrases(text) {
    const phrases = ['right then', 'wee', 'proper look', 'fair point', 'all sorted'];
    phrases.forEach(phrase => {
      const regex = new RegExp(phrase, 'gi');
      text = text.replace(regex, '');
    });
    return text.replace(/\s+/g, ' ').trim();
  },

  /**
   * Ensure clause references come first
   */
  ensureClauseFirst(text, context) {
    if (context.clauseNumber && !text.startsWith('Clause') && !text.startsWith(context.clauseNumber)) {
      return `Clause ${context.clauseNumber}: ${text}`;
    }
    return text;
  },

  /**
   * Ensure evidence-heavy language
   */
  ensureEvidenceHeavy(text) {
    // Add evidence-focused language if missing
    if (!text.includes('evidence') && !text.includes('demonstrate') && !text.includes('documented')) {
      if (text.includes('requirement') || text.includes('clause')) {
        text = text.replace(/\.\s*$/, '. Auditors will check for documented evidence of compliance.');
      }
    }
    return text;
  },

  /**
   * Reduce personality markers
   */
  reducePersonality(text) {
    // Remove overly warm phrases
    const warmPhrases = ['good to see you', 'happy to', 'pleasure'];
    warmPhrases.forEach(phrase => {
      text = text.replace(new RegExp(phrase, 'gi'), '');
    });
    return text.replace(/\s+/g, ' ').trim();
  },

  /**
   * Estimate user expertise from context
   */
  estimateUserExpertise(context) {
    const { previousInteractions = [], userQuestions = [] } = context;
    
    // Analyze question complexity
    let complexityScore = 0;
    userQuestions.forEach(q => {
      if (q.includes('clause') || q.includes('requirement')) complexityScore += 1;
      if (q.includes('implement') || q.includes('how to')) complexityScore += 0.5;
      if (q.includes('what is') || q.includes('explain')) complexityScore -= 0.5;
    });

    if (complexityScore > 5) return this.EXPERTISE_LEVELS.EXPERT;
    if (complexityScore > 2 || previousInteractions.length > 10) return this.EXPERTISE_LEVELS.INTERMEDIATE;
    return this.EXPERTISE_LEVELS.NOVICE;
  },

  /**
   * Adapt explanation depth to user expertise
   */
  adaptToExpertiseLevel(text, expertise, context) {
    if (expertise === this.EXPERTISE_LEVELS.NOVICE) {
      // Add more context, "why this matters", explicit clause references
      text = this.enhanceForNovice(text, context);
    } else if (expertise === this.EXPERTISE_LEVELS.EXPERT) {
      // More concise, focus on nuance
      text = this.enhanceForExpert(text, context);
    }
    // Intermediate gets base text as-is
    return text;
  },

  /**
   * Enhance text for novice users
   */
  enhanceForNovice(text, context) {
    // Add explicit clause references if missing
    if (context.clauseNumber && !text.includes(context.clauseNumber)) {
      text = `Clause ${context.clauseNumber}: ${text}`;
    }

    // Add "why this matters" if technical without explanation
    if (!text.toLowerCase().includes('matters') && 
        !text.toLowerCase().includes('important') &&
        !text.toLowerCase().includes('because')) {
      // Only add if it seems technical
      if (text.length > 100 && /requirement|shall|must/i.test(text)) {
        text += '\n\nThis matters because auditors will specifically check for evidence that this requirement is met.';
      }
    }

    return text;
  },

  /**
   * Enhance text for expert users
   */
  enhanceForExpert(text, context) {
    // Remove basic explanations, focus on nuance
    // Keep technical content, remove redundant phrases
    text = text.replace(/This is important because.*?(?=\.|$)/gi, '');
    text = text.replace(/What this means is/gi, '');
    return text.trim();
  },

  /**
   * Build canonical explanation structure
   * Structure: Hook → Clause/Concept → Why it exists → Implementation → Audit issues → Current state → Next steps
   */
  async buildCanonicalExplanation({ clauseNumber, standardCode, baseText, userExpertise, context }) {
    const parts = [];

    // 1. Hook/opener (optional, only for first response or if baseText is short)
    if (context.isFirstResponse || baseText.length < 200) {
      const hook = this.getContextualHook(clauseNumber, standardCode, context);
      if (hook) parts.push(hook);
    }

    // 2. Clause or concept explanation
    if (clauseNumber) {
      parts.push(`**Clause ${clauseNumber}${standardCode ? ` (${standardCode})` : ''}**\n\n`);
    }
    
    // 3. What it requires (from baseText or lookup)
    parts.push(baseText || 'This requirement addresses compliance with specified criteria.');

    // 4. Why it exists / risk rationale (if not already in baseText)
    if (!baseText.toLowerCase().includes('why') && !baseText.toLowerCase().includes('because')) {
      const rationale = await this.getRequirementRationale(clauseNumber, standardCode);
      if (rationale) {
        parts.push(`\n\n**Why this matters:**\n${rationale}`);
      }
    }

    // 5. Typical implementation patterns (for novice/intermediate)
    if (userExpertise !== this.EXPERTISE_LEVELS.EXPERT && clauseNumber) {
      const implementation = await this.getTypicalImplementation(clauseNumber, standardCode);
      if (implementation) {
        parts.push(`\n\n**Typical implementation:**\n${implementation}`);
      }
    }

    // 6. Common audit issues (for all levels, but simpler for novice)
    if (clauseNumber) {
      const auditIssues = await this.getCommonAuditIssues(clauseNumber, standardCode, userExpertise);
      if (auditIssues) {
        parts.push(`\n\n**Common audit issues:**\n${auditIssues}`);
      }
    }

    // 7. Where user's current procedure stands (if context available)
    if (context.currentProcedures && context.currentProcedures.length > 0) {
      const assessment = this.assessCurrentImplementation(context.currentProcedures, clauseNumber);
      if (assessment) {
        parts.push(`\n\n**Your current implementation:**\n${assessment}`);
      }
    }

    // 8. Optional next-step suggestion
    if (context.suggestNextStep !== false) {
      const nextStep = this.suggestNextStep(clauseNumber, standardCode, context);
      if (nextStep) {
        parts.push(`\n\n**Next steps:**\n${nextStep}`);
      }
    }

    return parts.join('\n');
  },

  /**
   * Get contextual hook for opening
   */
  getContextualHook(clauseNumber, standardCode, context) {
    const hooks = [
      `Let me explain clause ${clauseNumber}${standardCode ? ` from ${standardCode}` : ''}.`,
      `Right, let's have a proper look at clause ${clauseNumber}.`,
      `I'll walk you through what clause ${clauseNumber} requires.`
    ];
    return hooks[Math.floor(Math.random() * hooks.length)];
  },

  /**
   * Get requirement rationale from knowledge graph or defaults
   */
  async getRequirementRationale(clauseNumber, standardCode) {
    // Try to load from vera_contextual_enrichment or use defaults
    // For now, return a default based on clause number
    const defaultRationales = {
      '8.3': 'This clause ensures products are designed to meet customer requirements and regulatory standards. Auditors check for design reviews and validation evidence.',
      '8.5': 'This addresses production control and ensures consistent quality. Auditors look for work instructions, monitoring, and control of production processes.',
      '7.5': 'This covers the control of documented information. Auditors verify document control procedures and records management.',
      '6.2': 'This ensures quality objectives are established and monitored. Auditors check for measurable objectives and evidence of achievement.'
    };

    // Try to match clause prefix
    const clausePrefix = clauseNumber?.split('.')[0] + '.' + (clauseNumber?.split('.')[1] || '');
    return defaultRationales[clausePrefix] || defaultRationales[clauseNumber] || 
      'This requirement is essential for maintaining quality system compliance. Auditors will check for evidence that this is consistently implemented.';
  },

  /**
   * Get typical implementation patterns
   */
  async getTypicalImplementation(clauseNumber, standardCode) {
    // Load from knowledge graph or use defaults
    return 'Most organizations implement this through documented procedures, work instructions, training, and records that demonstrate compliance.';
  },

  /**
   * Get common audit issues
   */
  async getCommonAuditIssues(clauseNumber, standardCode, userExpertise) {
    const issues = [
      'Missing documented evidence',
      'Procedure exists but not consistently followed',
      'Records incomplete or missing',
      'Training not documented',
      'Responsibility not clearly defined'
    ];

    if (userExpertise === this.EXPERTISE_LEVELS.NOVICE) {
      return `• ${issues.slice(0, 3).join('\n• ')}`;
    }
    return issues.slice(0, 5).join('\n• ');
  },

  /**
   * Assess current implementation
   */
  assessCurrentImplementation(procedures, clauseNumber) {
    if (!procedures || procedures.length === 0) {
      return 'I don\'t see any procedures that directly address this clause yet.';
    }
    return `I found ${procedures.length} procedure(s) that may relate to this requirement. Let me analyze how well they align.`;
  },

  /**
   * Suggest next step
   */
  suggestNextStep(clauseNumber, standardCode, context) {
    const suggestions = [
      `We can next look at how this ties into related clauses if you'd like.`,
      `Would you like me to help you create a procedure for this clause?`,
      `I can show you examples of how other organizations implement this.`
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  },

  /**
   * Add persona phrases (opening/closing) with cultural influence awareness
   */
  addPersonaPhrases(text, persona, options = {}) {
    if (!persona || !persona.style) return text;

    let enhanced = text;
    const { isFirstResponse, isClosing, isHighFormality } = options;

    // Apply cultural influence through edcatPersonality
    if (edcatPersonality && edcatPersonality.applyCulturalInfluence) {
      enhanced = edcatPersonality.applyCulturalInfluence(persona, enhanced, {
        isHighFormality,
        isFirstResponse,
        isClosing
      });
    }

    return enhanced;
  },

  // Legacy methods for backward compatibility
  openings: [
    "I've reviewed your procedures against {standard}. Let me walk you through what I found.",
    "I've analyzed your documentation against {standard}. Here's my assessment.",
    "After reviewing your procedures, I have some findings to share with you.",
    "I've completed my analysis of your {standard} compliance. Let me explain what I discovered."
  ],

  transitions: [
    "Let me clarify...",
    "Here's what I'm seeing...",
    "I'd recommend...",
    "I'm about {percentage}% confident because...",
    "Help me understand...",
    "That's a good catch...",
    "You're right, I should have asked...",
    "Let me show you why this matters...",
    "Here's my thinking on this...",
    "What I found is..."
  ],

  uncertainty: [
    "I'm about {percentage}% confident this covers the requirement.",
    "I'm not entirely certain about this one. Here's why:",
    "I need to ask some follow-up questions before I can give you a good assessment.",
    "This is a judgment call—reasonable people disagree on this one.",
    "I could guess, but I don't want to give you bad advice.",
    "I want to confirm before I mark this as a gap."
  ],

  acknowledgments: [
    "Your quality manual is well-written and comprehensive. Someone put real effort into this.",
    "Compared to most companies your size, you're ahead on this.",
    "Your management team clearly cares about quality, and that shows in your processes.",
    "You have solid foundations.",
    "This shows real progress. Your team is taking this seriously."
  ],

  solutions: [
    "Here's what you can do about it:",
    "I'd recommend we focus on:",
    "Here are your options:",
    "Which direction fits your company's approach?",
    "Want me to show you a template for any of these?"
  ],

  closings: [
    "Would you like me to help you prioritize these, or do you have questions about any specific findings?",
    "If you have any questions about specific requirements, I'm here to help.",
    "Should we start with the areas where I'm least certain?",
    "What would you prefer?",
    "Can you clarify: {question}?"
  ],

  forbiddenPhrases: [
    "Processing...",
    "Data analyzed",
    "Confidence score: 0.73",
    "Error: unable to determine",
    "Awaiting user input",
    "System status: processing",
    "Algorithm determines...",
    "Machine learning model indicates...",
    "Insufficient data to proceed",
    "No data available"
  ],

  getOpening(standard) {
    const opening = this.openings[Math.floor(Math.random() * this.openings.length)];
    return opening.replace('{standard}', standard || 'the standard');
  },

  getTransition(percentage = null) {
    const transition = this.transitions[Math.floor(Math.random() * this.transitions.length)];
    if (percentage !== null && transition.includes('{percentage}')) {
      return transition.replace('{percentage}', Math.round(percentage * 100));
    }
    return transition;
  },

  getUncertainty(percentage = null) {
    const phrase = this.uncertainty[Math.floor(Math.random() * this.uncertainty.length)];
    if (percentage !== null && phrase.includes('{percentage}')) {
      return phrase.replace('{percentage}', Math.round(percentage * 100));
    }
    return phrase;
  },

  getAcknowledgment() {
    return this.acknowledgments[Math.floor(Math.random() * this.acknowledgments.length)];
  },

  getSolutionPhrase() {
    return this.solutions[Math.floor(Math.random() * this.solutions.length)];
  },

  getClosing(question = null) {
    const closing = this.closings[Math.floor(Math.random() * this.closings.length)];
    if (question && closing.includes('{question}')) {
      return closing.replace('{question}', question);
    }
    return closing;
  },

  containsForbiddenPhrases(text) {
    const lowerText = text.toLowerCase();
    return this.forbiddenPhrases.some(phrase => 
      lowerText.includes(phrase.toLowerCase())
    );
  },

  sanitizeLanguage(text) {
    let sanitized = text;
    
    const replacements = {
      'confidence score:': 'my confidence:',
      'processing...': 'analyzing...',
      'data analyzed': 'I\'ve analyzed',
      'awaiting user input': 'I need some information from you',
      'insufficient data': 'I need more information',
      'error:': 'I encountered an issue:',
      'system status:': '',
      'algorithm determines': 'my analysis shows',
      'machine learning model': 'my assessment'
    };

    Object.keys(replacements).forEach(forbidden => {
      const regex = new RegExp(forbidden, 'gi');
      sanitized = sanitized.replace(regex, replacements[forbidden]);
    });

    return sanitized;
  },

  formatFinding(title, requirement, currentState, gap, whyItMatters, severity, howToClose) {
    let output = `FINDING: ${title}\n\n`;
    
    if (requirement) {
      output += `The requirement:\n${requirement}\n\n`;
    }
    
    if (currentState) {
      output += `What you're doing:\n${currentState}\n\n`;
    }
    
    if (gap) {
      output += `What's missing:\n${gap}\n\n`;
    }
    
    if (whyItMatters) {
      output += `Why this matters:\n${whyItMatters}\n\n`;
    }
    
    if (severity) {
      output += `Severity: ${severity}\n\n`;
    }
    
    if (howToClose) {
      output += `How to close it:\n${howToClose}\n\n`;
    }
    
    return output;
  },

  formatClarificationRequest(topic, whatISee, whatINeed, why) {
    let output = `CLARIFICATION NEEDED: ${topic}\n\n`;
    
    if (whatISee) {
      output += `What I found:\n${whatISee}\n\n`;
    }
    
    if (whatINeed) {
      output += `What I need:\n${whatINeed}\n\n`;
    }
    
    if (why) {
      output += `Why I'm asking:\n${why}\n\n`;
    }
    
    output += `Can you help me understand this better?`;
    
    return output;
  }
};

export default VeraProfessionalLanguage;
