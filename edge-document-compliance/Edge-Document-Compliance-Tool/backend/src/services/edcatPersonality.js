/**
 * EDCAT Personality Service
 * Provides the AI voice and personality for compliance conversations
 * Enhanced with British/Scottish personality, comprehensive persona loading, and cultural influence
 */

import { queryEdcatAI } from '../config/databases.js';

// Default Vera persona configuration
const DEFAULT_VERA_PERSONA = {
  code: 'vera',
  name: 'Vera',
  full_name: 'Virtual Expert in Requirements and Assessments',
  name_meaning: "Vera stands for 'Virtual Expert in Requirements and Assessments' - a name that reflects my role as your virtual compliance expert who assists with regulatory requirements and quality standards.",
  role: 'Compliance Auditor',
  tone: 'professional-supportive',
  voice: 'british_scottish_female',
  cultural_influence: {
    british: 0.35,
    scottish: 0.15
  },
  explanation_rules: {
    always_explain_why: true,
    connect_to_standard_intent: true,
    link_to_risk_and_audit_consequence: true
  },
  style: {
    prefer_plain_language: true,
    avoid_fluff: true,
    maintain_regulator_safe_phrasing: true,
    opening_lines: [
      "Right then, what would you like to tackle today?",
      "Good to see you—shall we carry on?",
      "All right, let's have a proper look at this.",
      "Hello, I'm Vera. How can I help with your compliance work today?",
      "Good day! I'm Vera, your compliance assistant. What can I help you with?",
      "Hello there! I'd be happy to assist with your compliance questions.",
      "Well, let's dive into this together!",
      "Right, so what's on your mind today?"
    ],
    closing_lines: [
      "If you'd like, we can dig a wee bit deeper.",
      "Happy to keep going whenever you are.",
      "We can build on this further whenever you're ready.",
      "Feel free to come back if you need anything else.",
      "Does that help? I'm happy to go deeper if you need!",
      "I hope that clears things up! What else can I help with?",
      "Got it? Feel free to ask if anything's unclear!",
      "I'd be happy to explore this further if you'd like.",
      "Let me know if you need any clarification on that."
    ],
    mild_british_phrases: [
      "Right then, let's get to it.",
      "Let's have a proper look.",
      "That's a fair point.",
      "All sorted on that front.",
      "That should do the trick.",
      "Quite right.",
      "So, here's the thing...",
      "You know what?",
      "Actually, that's interesting because...",
      "Well, let me break this down for you.",
      "I should mention that...",
      "From a compliance perspective...",
      "It's worth noting that...",
      "I'd like to point out that..."
    ],
    mild_scottish_phrases: [
      "Just a bit of clarification needed here.",
      "Let's keep this tidy and precise.",
      "That's a gap we should address.",
      "We'll get that sorted.",
      "That makes sense.",
      "So here's what's happening...",
      "Right, so the thing is...",
      "I would like to understand this more fully.",
      "Let us tidy this up a bit.",
      "That's a wee bit unclear—shall we clarify?"
    ],
    conversational_connectors: [
      "So,",
      "Well,",
      "Actually,",
      "You know what?",
      "Here's the thing:",
      "I should mention that",
      "By the way,",
      "Oh, and one more thing:",
      "Just to give you some context,",
      "Let me explain this a bit:"
    ],
    neutral_connectors: [
      "From a compliance standpoint,",
      "In practical terms,",
      "Looking at this through the lens of the standard,",
      "From an audit perspective,"
    ],
    clarification_prefixes: [
      "Just to be sure we're aligned,",
      "Just a wee point to clarify,",
      "Right, before we go further,",
      "To make sure I understand correctly,"
    ]
  }
};

class EdcatPersonality {
  constructor() {
    this.name = 'Vera';
    this.role = 'Compliance Auditor';
    this.style = 'professional_warm';
  }

  /**
   * Get comprehensive persona for tenant
   * Loads from ai_persona, ai_persona_profile, and ai_policy
   * Merges all sources with proper precedence
   */
  async getPersonaForTenant(tenantId, personaCode = 'vera') {
    try {
      // Step 1: Load base persona from ai_persona
      let basePersona = null;
      const personaResult = await queryEdcatAI(
        `SELECT * FROM edcat.ai_persona WHERE code = $1 LIMIT 1`,
        [personaCode]
      );
      
      if (personaResult.rows && personaResult.rows.length > 0) {
        basePersona = personaResult.rows[0];
      }

      // Step 2: Load tenant-specific override from ai_persona_profile
      let tenantOverride = null;
      const profileResult = await queryEdcatAI(
        `SELECT profile FROM edcat.ai_persona_profile 
         WHERE tenant_id = $1 AND persona_code = $2 
         ORDER BY updated_at DESC LIMIT 1`,
        [tenantId, personaCode]
      );
      
      if (profileResult.rows && profileResult.rows.length > 0) {
        try {
          tenantOverride = typeof profileResult.rows[0].profile === 'string' 
            ? JSON.parse(profileResult.rows[0].profile)
            : profileResult.rows[0].profile;
        } catch (e) {
          console.warn('[edcatPersonality] Failed to parse persona profile:', e.message);
        }
      }

      // Step 3: Load persona policies from ai_policy
      const policyKeys = [
        'vera.personality.rules',
        'vera.expert.credentials',
        'vera.knowledge.base',
        'vera.knowledge.templates'
      ];
      
      const policies = {};
      for (const key of policyKeys) {
        try {
          const policyResult = await queryEdcatAI(
            `SELECT config FROM edcat.ai_policy 
             WHERE tenant_id = $1 AND name = $2 
             LIMIT 1`,
            [tenantId || '00000000-0000-0000-0000-000000000000', key]
          );
          
          if (policyResult.rows && policyResult.rows.length > 0) {
            const config = policyResult.rows[0].config;
            policies[key] = typeof config === 'string' ? JSON.parse(config) : config;
          }
        } catch (e) {
          // Non-fatal - continue without this policy
        }
      }

      // Step 4: Merge everything (default < base < tenant override < policies)
      const mergedPersona = {
        ...DEFAULT_VERA_PERSONA,
        ...(basePersona ? {
          code: basePersona.code,
          name: basePersona.display_name || basePersona.name || DEFAULT_VERA_PERSONA.name,
          voice: basePersona.voice || DEFAULT_VERA_PERSONA.voice,
          style: {
            ...DEFAULT_VERA_PERSONA.style,
            ...(basePersona.style ? (typeof basePersona.style === 'string' ? JSON.parse(basePersona.style) : basePersona.style) : {})
          }
        } : {}),
        ...(tenantOverride || {}),
        policies
      };

      // Ensure name meaning is included
      if (!mergedPersona.name_meaning && mergedPersona.full_name) {
        mergedPersona.name_meaning = `Vera stands for '${mergedPersona.full_name}' - a name that reflects my role as your virtual compliance expert who assists with regulatory requirements and quality standards.`;
      }

      return mergedPersona;
    } catch (error) {
      console.warn('[edcatPersonality] Error loading persona, using default:', error.message);
      return DEFAULT_VERA_PERSONA;
    }
  }

  /**
   * ENHANCED: More aggressive personality injection
   * This is where Vera's warmth actually lives—make it stronger
   */
  async applyCulturalInfluence(persona, baseText, options = {}) {
    const {
      isHighFormality = false,
      userPrefersFormal = false,
      isFirstResponse = false,
      isClosing = false,
      conversationContext = {},
      context = {},
      intent = null,
      confidence = 0.8
    } = options;

    // Ensure baseText is always a string
    if (!baseText) return '';
    if (typeof baseText !== 'string') {
      baseText = String(baseText);
    }
    if (!persona) return baseText;

    // If high formality or user prefers formal, reduce conversational influence
    const conversationalLevel = (isHighFormality || userPrefersFormal) 
      ? 0.3  // Still add some personality, but less
      : 0.9; // Very high conversational level for natural banter (increased from 0.7)

    const style = persona.style || DEFAULT_VERA_PERSONA.style;
    let enhancedText = baseText;

    // PHASE 1: Reduce list formatting (if not technical data)
    enhancedText = this.convertExplanationListsToProse(enhancedText, context);

    // PHASE 2: Add personality markers (British/Scottish warmth)
    enhancedText = this.addPersonalityMarkers(enhancedText, persona);

    // PHASE 3: Show reasoning and evidence of thinking
    enhancedText = this.addThinkingEvidence(enhancedText, intent, confidence);

    // PHASE 4: Replace formal language with conversational alternatives
    enhancedText = this.casualizeLanguage(enhancedText, persona);

    // PHASE 5: Improve transitions and flow
    enhancedText = this.improveFlow(enhancedText);
    
    // PHASE 6: Grammar and professionalism fixes
    enhancedText = this.fixGrammarAndFormatting(enhancedText);

    // Don't modify if text is very short
    if (enhancedText.length < 30) {
      return enhancedText;
    }

    // Check if text already starts with conversational elements (removed "Aye" - too casual)
    // BUT preserve standard explanations that start with standard names (e.g., "AS9100D is the...")
    const startsWithStandardName = /^(AS\d+|ISO\s*\d+|ISO-\d+|IATF\s*\d+)/i.test(enhancedText.trim());
    const alreadyConversational = /^(So|Well|Actually|You know|Here's|Right|Hey|Oh)/i.test(enhancedText.trim());
    
    // Don't add conversational opening if response starts with a standard name (preserve the explanation)
    if (startsWithStandardName) {
      // Skip adding conversational connectors to preserve the professional opening
    }

    // Add conversational opening (reduced frequency - 50% for first, 40% for others - more professional)
    // Skip overly casual connectors like "Aye" or "You know what?"
    // Also skip if response starts with a standard name (preserve professional explanations)
    // Also skip if response contains "is the" (e.g., "AS9100D is the aerospace quality standard")
    const containsStandardDefinition = /\b(is the|are the|refers to|means)\b/i.test(enhancedText);
    if (!startsWithStandardName && !containsStandardDefinition && !alreadyConversational && style.conversational_connectors && Math.random() < (isFirstResponse ? 0.5 : 0.4)) {
      const connectors = (style.conversational_connectors || []).filter(c => 
        !c.toLowerCase().includes('aye') && 
        !c.toLowerCase().includes('you know what') &&
        !c.toLowerCase().includes("so, here's the thing") &&
        !c.toLowerCase().includes("so here's what")
      );
      if (connectors.length > 0) {
        const connector = connectors[Math.floor(Math.random() * connectors.length)];
        // Only add if the text doesn't already start with it
        if (!enhancedText.trim().startsWith(connector.replace(/[?:,]/g, ''))) {
          enhancedText = `${connector} ${enhancedText}`;
        }
      }
    }

    // Add natural phrase within the text (reduced to 30% - more professional, less casual)
    // Filter out overly casual phrases
    if (Math.random() < 0.3 && conversationalLevel > 0.3) {
      const allPhrases = [
        ...(style.mild_british_phrases || []),
        ...(style.mild_scottish_phrases || []),
        ...(style.conversational_connectors || [])
      ].filter(p => 
        !p.toLowerCase().includes('aye') && 
        !p.toLowerCase().includes('wee') &&
        !p.toLowerCase().includes('you know what')
      );
      if (allPhrases.length > 0) {
        const phrase = allPhrases[Math.floor(Math.random() * allPhrases.length)];
        // Insert phrase naturally - look for a good spot (after first sentence or paragraph)
        const sentences = enhancedText.split(/[.!?]\s+/);
        if (sentences.length > 1) {
          const insertIndex = Math.min(1, Math.floor(Math.random() * 2) + 1);
          sentences[insertIndex] = `${phrase} ${sentences[insertIndex]}`;
          enhancedText = sentences.join('. ') + (enhancedText.endsWith('.') ? '.' : '');
        } else {
          // If no sentence breaks, try paragraph breaks
          const paragraphs = enhancedText.split('\n\n');
          if (paragraphs.length > 1) {
            const insertIndex = Math.min(1, Math.floor(Math.random() * 2));
            paragraphs[insertIndex] = `${phrase} ${paragraphs[insertIndex]}`;
            enhancedText = paragraphs.join('\n\n');
          }
        }
      }
    }

    // Add natural closing (reduced to 30% - only when appropriate, not proactive)
    // Only add if response naturally ends with a question or needs clarification
    if (!isClosing && Math.random() < 0.3 && conversationalLevel > 0.3 && enhancedText.includes('?')) {
      const closers = (style.closing_lines || []).filter(c => 
        !c.toLowerCase().includes('proactive') &&
        !c.toLowerCase().includes('tip') &&
        !c.toLowerCase().includes('suggestion')
      );
      if (closers.length > 0 && enhancedText.length > 100) {
        const closer = closers[Math.floor(Math.random() * closers.length)];
        // Add as a natural follow-up, not a separate paragraph
        enhancedText = `${enhancedText} ${closer}`;
      }
    }

    // Add closing phrase if explicitly closing (70% chance - more aggressive)
    if (isClosing && style.closing_lines && Math.random() < 0.7) {
      const closer = style.closing_lines[Math.floor(Math.random() * style.closing_lines.length)];
      enhancedText = `${enhancedText}\n\n${closer}`;
    }

    // CRITICAL: Always return a string, never an object
    return typeof enhancedText === 'string' ? enhancedText : String(enhancedText || baseText || '');
  }

  /**
   * NEW: Convert explanation lists to prose (don't touch technical data)
   */
  convertExplanationListsToProse(response, context) {
    // Don't convert if this is technical data (clauses, requirements, metrics)
    if (this.isTechnicalContent(response)) {
      return response;
    }

    const bulletPattern = /^[•\-\*]\s+(.+?)$/gm;
    const bullets = response.match(bulletPattern) || [];

    // If 3+ explanatory bullets, convert to prose
    if (bullets.length >= 3) {
      const bulletTexts = bullets.map(b => 
        b.replace(/^[•\-\*]\s+/, '').trim()
      );

      let prose = 'Here are the key points: ';
      prose += bulletTexts
        .map((text, idx) => {
          if (idx === bulletTexts.length - 1) return `and ${text.toLowerCase()}`;
          return text.toLowerCase();
        })
        .join(', ');
      prose += '.';

      // Replace bullets with prose
      return response
        .replace(bulletPattern, '')
        .trim()
        .replace(/^/, prose + '\n\n');
    }

    return response;
  }

  /**
   * NEW: Add personality markers from persona profile
   */
  addPersonalityMarkers(response, persona) {
    let enhanced = response;
    
    const personalityMarkers = persona?.conversational_style?.personality_markers || [
      'Scottish idioms',
      'Contractions',
      'Occasional warmth'
    ];

    // Add contractions if not already present
    if (persona?.tone?.includes('conversational') || persona?.tone?.includes('warm')) {
      enhanced = enhanced
        .replace(/\bdo not\b/g, "don't")
        .replace(/\byou will\b/g, "you'll")
        .replace(/\bI will\b/g, "I'll")
        .replace(/\bis not\b/g, "isn't")
        .replace(/\bhas not\b/g, "hasn't")
        .replace(/\bit is\b/g, "it's")
        .replace(/\byou are\b/g, "you're")
        .replace(/\bI am\b/g, "I'm")
        .replace(/\bwe are\b/g, "we're");
    }

    // Add warmth where appropriate
    if (persona?.tone?.includes('warm') || persona?.tone?.includes('professional-supportive')) {
      // If identifying a gap, show understanding
      if (enhanced.includes('gap')) {
        enhanced = enhanced.replace(
          /(this gap|these gaps|this finding)/gi,
          "I know this can be tricky—$1"
        );
      }

      // If acknowledging good work
      if (enhanced.includes('covered') || enhanced.includes('addressing')) {
        enhanced = enhanced.replace(
          /(well documented|clearly|straightforward)/gi,
          "Your approach to $1 is solid"
        );
      }
    }

    return enhanced;
  }

  /**
   * NEW: Show reasoning, not just conclusions
   */
  addThinkingEvidence(response, intent, confidence) {
    let enhanced = response;

    // Where confidence matters, show WHY
    if (enhanced.includes('confident')) {
      if (!enhanced.includes('because')) {
        enhanced = enhanced.replace(
          /I'm (\d+)% confident/gi,
          "I'm $1% confident because"
        );
      }
    }

    // Where identifying gaps, explain the logic
    if (intent === 'gap_analysis_request' || intent === 'gap_create') {
      if (enhanced.includes('gap') && !enhanced.includes('because') && !enhanced.includes('here\'s why')) {
        enhanced = enhanced.replace(
          /(identified.*?gap)/gi,
          "$1—here's why"
        );
      }
    }

    return enhanced;
  }

  /**
   * NEW: Replace formal language patterns (extends existing casualizeLanguage)
   */
  casualizeLanguage(response, persona) {
    let casual = response;

    const formalToCasual = {
      'Here is': "Here's",
      'It is recommended': "I'd recommend",
      'It has been found': "I found",
      'The analysis shows': "What I'm seeing is",
      'Based on the data': "Based on what I've reviewed",
      'In conclusion': "So here's the bottom line",
      'However': "That said",
      'Furthermore': "What's more",
      'Thus': "So",
      'In light of': "Given",
      'It is necessary': "You'll need to",
      'One should': "You should",
      'Based on': "So",
      'According to': "Well",
      'In accordance with': "As per",
      'Per': "Per",
      'As per': "As per",
      // REMOVED: 'Would you like': "Want" - this breaks grammar ("What Want to know")
      'I would like to': "I'd like to",
      'Moreover': "Plus",
      'Additionally': "And",
      'To summarize': "To sum it up"
    };

    Object.entries(formalToCasual).forEach(([formal, casualReplacement]) => {
      const regex = new RegExp(`\\b${formal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      casual = casual.replace(regex, casualReplacement);
    });

    // Add Scottish/British idioms if persona supports it
    if (persona?.tone?.includes('British') || persona?.tone?.includes('Scottish') || 
        persona?.voice?.includes('british') || persona?.voice?.includes('scottish')) {
      casual = this.addBritishisms(casual);
    }

    return casual;
  }

  /**
   * EXISTING but enhance: Add British/Scottish flavor
   */
  addBritishisms(response) {
    let enhanced = response;

    // Professional British expressions (toned down from casual)
    const britishisms = {
      'quite': 'indeed,',
      'notably': 'notably,',
      'This is tricky': "This requires attention—",
      'Let me explain': "Let me explain—",
      'I need to clarify': "To clarify—"
    };

    // Removed "aye" - too casual for professional compliance work
    // Keep professional but friendly tone

    return enhanced;
  }

  /**
   * NEW: Improve flow and transitions
   */
  improveFlow(response) {
    let improved = response;

    // Smooth jarring transitions
    improved = improved
      .replace(/\n\n\n+/g, '\n\n') // Remove triple line breaks
      .replace(/^[A-Z]+\s+/, '') // Remove ALL CAPS section headers (they're jarring)
      .replace(/(So |Right,|Well,)/g, match => {
        // Keep these natural connectors but use sparingly
        return Math.random() > 0.3 ? match : '';
      });

    return improved;
  }

  /**
   * NEW: Fix grammar and formatting issues
   */
  fixGrammarAndFormatting(text) {
    if (!text) return text;
    let fixed = text;
    
    // Fix redundant phrases
    fixed = fixed.replace(/continuous\s+continual/gi, 'continuous');
    fixed = fixed.replace(/continual\s+continuous/gi, 'continuous');
    
    // Fix capitalization after commas (e.g., "Well, It's" -> "Well, it's")
    // But preserve proper nouns and acronyms
    fixed = fixed.replace(/,\s+([A-Z])([a-z]+)/g, (match, letter, rest) => {
      // Don't change if it's "I" with apostrophe (I'm, I've, etc.)
      if (letter === 'I' && rest.startsWith("'")) {
        return match; // "I'm", "I've", etc.
      }
      // Don't change if it's an acronym (all caps)
      if (letter.match(/[A-Z]/) && rest.match(/^[A-Z]+$/)) {
        return match; // Acronyms like "ISO", "FAA"
      }
      // Don't change if it's a proper noun (check common ones)
      const properNouns = ['ISO', 'FAA', 'EASA', 'CASA', 'FDA', 'EU', 'MDR'];
      if (properNouns.some(noun => match.includes(noun))) {
        return match;
      }
      return `, ${letter.toLowerCase()}${rest}`;
    });
    
    // Fix "What Want" -> "What would you like"
    fixed = fixed.replace(/What\s+Want\s+to\s+know/gi, 'What would you like to know');
    fixed = fixed.replace(/What\s+Want/gi, 'What would you like');
    
    // Fix standard name formatting (iso9001 -> ISO 9001)
    fixed = fixed.replace(/\b(iso)(\d{4,5})\b/gi, (match, prefix, number) => {
      return `${prefix.toUpperCase()} ${number}`;
    });
    
    // Remove "So, " at the beginning if it's too casual for professional content
    if (fixed.match(/^So,\s+[A-Z]/) && (fixed.toLowerCase().includes('standard') || fixed.toLowerCase().includes('requirement'))) {
      fixed = fixed.replace(/^So,\s+/, '');
    }
    
    // Remove "Well, " at the beginning if followed by capital letter (unless it's a proper noun)
    fixed = fixed.replace(/^Well,\s+([A-Z])/g, (match, letter) => {
      // Only remove if it's not a proper noun or acronym
      const properNouns = ['ISO', 'FAA', 'EASA', 'CASA', 'FDA', 'EU', 'MDR', 'I'];
      if (properNouns.some(noun => match.includes(noun))) {
        return match;
      }
      return letter;
    });
    
    // Ensure proper spacing after periods
    fixed = fixed.replace(/\.([A-Z])/g, '. $1');
    
    // Fix double spaces
    fixed = fixed.replace(/\s{2,}/g, ' ');
    
    return fixed;
  }

  /**
   * HELPER: Detect if content is technical (don't touch it)
   */
  isTechnicalContent(response) {
    const technicalIndicators = /\d+\.\d+|ISO\d+|clause|requirement|CFR|must|shall|paragraph/i;
    return technicalIndicators.test(response);
  }

  /**
   * Detect if context requires high formality
   */
  detectHighFormalityContext(text, context = {}) {
    if (!text) return false;
    
    const formalIndicators = [
      'faa', 'easa', 'caac', 'regulator', 'finding', 'ncr', 'nonconformity',
      'audit finding', 'regulatory', 'inspection', 'authority'
    ];
    
    const lowerText = text.toLowerCase();
    return formalIndicators.some(indicator => lowerText.includes(indicator));
  }

  /**
   * Get name meaning explanation
   */
  getNameMeaning(persona) {
    return persona.name_meaning || persona.full_name 
      ? `Vera stands for '${persona.full_name || 'Virtual Expert in Requirements and Assessments'}'. ${persona.name_meaning || "It reflects my role as your virtual compliance expert who assists with regulatory requirements and quality standards."}`
      : "My name is Vera, and I'm here to help with compliance and regulatory requirements.";
  }

  /**
   * Get welcome greeting
   * @returns {string} Welcome message
   */
  getWelcomeGreeting() {
    return `Hello! 👋 I'm Vera, your Virtual Executive Requirements Assistant.

I specialize in:
✓ ISO 9001 (Quality Management)
✓ AS9100D / AS9110C (Aerospace)
✓ FAA Part 21 & 145 (Aviation)
✓ EASA Part 145 (Maintenance)

What would you like to do?

1️⃣  Analyze your compliance against a standard
2️⃣  Upload and parse compliance documents
3️⃣  Ask about specific requirements`;
  }

  /**
   * Present gap analysis results
   * @param {Object} analysis - Analysis results
   * @returns {string} Formatted gap analysis presentation
   */
  presentGapAnalysis(analysis) {
    const { total_requirements, covered, partial, gaps, coverage_percentage, correlations } = analysis;

    const gapsByArea = this.groupGapsByType(correlations);
    const topGaps = correlations
      .filter(c => c.compliance_status !== 'full')
      .sort((a, b) => {
        const severityOrder = { critical: 0, major: 1, minor: 2 };
        return (severityOrder[a.gap_severity] || 3) - (severityOrder[b.gap_severity] || 3);
      })
      .slice(0, 3);

    return `📊 **COMPLIANCE ANALYSIS COMPLETE**

📈 **Overall Results:**

- Total requirements: ${total_requirements}
- ✓ Covered: ${covered} (${coverage_percentage}%)
- ⚠️ Partial: ${partial}
- ❌ Gaps: ${gaps}

**Status:** ${coverage_percentage >= 85 ? '🟢 GOOD alignment' :
           coverage_percentage >= 70 ? '🟡 FAIR alignment' :
           '🔴 NEEDS WORK'}

**Top Gap Areas** (fix these first):

${topGaps.map((gap, i) => `
${i + 1}. **${gap.clause_number}** ${gap.clause_title}
   Status: ${gap.compliance_status.toUpperCase()}
   Issue: ${gap.gap_description}
   → ${gap.recommendation}`).join('\n')}

💡 **Next Steps:**

→ [Generate Full Report] - Export gap analysis (Word/PDF)
→ [Deep Dive] - Explain any clause
→ [Create Procedure] - I'll draft missing procedures
→ [Audit Prep] - Get ready for audit

Ready?`;
  }

  /**
   * Explain a clause in detail
   * @param {Object} clause - Clause record
   * @returns {string} Detailed clause explanation
   */
  explainClause(clause) {
    return `📋 **${clause.clause_number}: ${clause.clause_title}**

**What It Says:**

"${clause.clause_text.substring(0, 300)}${clause.clause_text.length > 300 ? '...' : ''}"

**What It Really Means:**

${clause.intent || 'This clause requires compliance with specified requirements'}

**Why This Matters:**

${clause.why_it_matters || 'This is a critical area auditors will review'}

**Where Organizations Typically Gap:**

${clause.common_gaps || 'Most organizations struggle with consistent implementation'}

**What Auditors Look For:**

✓ Documented procedure (e.g., P-800-01)
✓ Work instructions (WI-800-001)
✓ Training records showing staff understand it
✓ Objective evidence (forms, approvals, records)

**Examples of Good Evidence:**

- Procedure document
- Last month's completed forms
- Training attendance records
- Approval sign-offs
- Records retention log

Need me to:

→ Create a procedure for this clause?
→ Explain related clauses?
→ Show you how to gather evidence?`;
  }

  /**
   * Recommend action for a gap
   * @param {Object} gap - Gap record
   * @param {Object} clause - Clause record
   * @returns {string} Action recommendation
   */
  recommendAction(gap, clause) {
    const severityEmoji = {
      critical: '🔴',
      major: '🟡',
      minor: '🟢'
    };

    return `${severityEmoji[gap.gap_severity]} **ACTION REQUIRED**

**Clause:** ${clause.clause_number} – ${clause.clause_title}

**The Requirement:**

${clause.intent}

**What's Missing:**

${gap.gap_description}

**Severity:** ${gap.gap_severity.toUpperCase()}
${gap.gap_severity === 'critical'
  ? 'Auditors WILL find this – critical compliance issue'
  : gap.gap_severity === 'major'
  ? 'Likely to be cited – should be addressed soon'
  : 'Best practice improvement'}

**How to Close the Gap:**

${gap.recommendation}

**Estimated Effort:** ${gap.recommendation_effort}

**Evidence You'll Need After Fixing:**

- Updated procedure
- Training records
- Sample completed forms/records
- Management approval

💡 **Want me to draft the procedure?** I can write it for you! 📝`;
  }

  /**
   * Confirm learning event
   * @param {Object} event - Learning event
   * @returns {string} Learning confirmation message
   */
  confirmLearning(event) {
    return `📚 **Learning Moment**

You just taught me something:

"${event.pattern || 'Your feedback'}"

I've learned that:

- ${event.insight1 || 'This pattern indicates compliance'}
- ${event.insight2 || 'Similar organizations structure it this way'}

**Next time** I see similar procedures, I'll remember this. Your feedback makes me smarter! 🧠`;
  }

  /**
   * Handle errors gracefully
   * @param {Object} error - Error object
   * @returns {string} User-friendly error message
   */
  handleError(error) {
    const responses = {
      'no_files': 'I need documents to analyze. Please upload your procedures first!',
      'no_standard': 'Which standard? (ISO 9001, AS9100D, FAA Part 145, EASA 145)',
      'no_match': 'I couldn\'t find a clear match. Let me ask: what does this procedure do?',
      'parse_failed': 'I had trouble reading that file. Is it a valid PDF/Word/Excel?',
      'network_error': 'Having a temporary connection issue. Please try again in a moment.'
    };

    return responses[error.type] || `I encountered an issue: ${error.message}. Can you rephrase?`;
  }

  /**
   * Group gaps by type
   * @param {Array} correlations - Correlation records
   * @returns {Object} Grouped gaps
   */
  groupGapsByType(correlations) {
    const grouped = {};

    correlations.forEach(corr => {
      const type = corr.gap_severity;
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(corr);
    });

    return grouped;
  }

  /**
   * Format compliance status
   * @param {string} status - Compliance status
   * @returns {string} Formatted status with icon
   */
  formatComplianceStatus(status) {
    const icons = {
      full: '✓',
      partial: '~',
      none: '✗'
    };
    return `${icons[status]} ${status.toUpperCase()}`;
  }
}

// Export instance for use by VeraCoreEngine
const edcatPersonalityInstance = new EdcatPersonality();
export default edcatPersonalityInstance;
