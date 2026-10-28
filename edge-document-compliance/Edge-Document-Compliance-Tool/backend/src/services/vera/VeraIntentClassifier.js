/**
 * Lightweight, rule-based intent classifier for Vera.
 * This is NOT an LLM; it's a fast front-end that feeds VeraReasoningEngine.
 *
 * It should NEVER throw. Always return a safe default.
 */

class VeraIntentClassifier {
  /**
   * @param {string} message - Raw user input
   * @returns {{
   *   intent: string,
   *   entities: {
   *     standard?: string,
   *     clauseRef?: string,
   *     regulation?: string,
   *     topic?: string,
   *     isDebug?: boolean
   *   }
   * }}
   */
  static classify(message) {
    if (!message || typeof message !== 'string') {
      return { intent: 'smalltalk', entities: {} };
    }

    const text = message.trim();
    const lower = text.toLowerCase();

    // Debug detection is already handled elsewhere (0331 PIN),
    // but we defensively flag debug-style prompts here.
    if (lower.startsWith('debug:') || lower.includes('0331')) {
      return { intent: 'debug_request', entities: { isDebug: true, topic: text.slice(6).trim() } };
    }

    // Common standards / QMS acronyms
    const knownStandards = [
      'as9100', 'as9100d',
      'as9110', 'as9120',
      'iso 9001', 'iso9001',
      'iso 13485', 'iso13485',
      'iatf 16949', 'iatf16949',
      'iso 9001:2015', 'iso9001:2015'
    ];

    const qualityKeywords = [
      'cqe', 'certified quality engineer',
      'cost of quality', 'kpi', 'key performance indicator', 'metrics',
      'six sigma', 'black belt', 'green belt', 'dmaic', 'dfss',
      'lean', 'waste', 'muda', 'kaizen', 'poka yoke',
      'control plan', 'process capability', 'cpk', 'ppk',
      'fmea', 'pfmea', 'dfmea', 'apqp', 'control chart',
      'spc', 'statistical process control', 'msa', 'gage r&r', 'gr&r',
      'reliability', 'mtbf', 'mttr', 'weibull',
      'metrology', 'calibration', 'uncertainty',
      'sca', 'scar', 'supplier corrective action',
      'vda', 'ppap', 'apqp', 'iso 19011', 'audit'
    ];

    const agileKeywords = ['agile', 'scrum', 'kanban', 'sprint', 'story points'];

    // Detect clause-like pattern (e.g., "8.7", "7.5.3.2", "8.3.3 f")
    const clauseMatch = lower.match(/\b([4-9]\.\d+(\.\d+)?(\s*[a-z])?)\b/);
    let clauseRef = clauseMatch ? clauseMatch[1].replace(/\s+/g, '') : undefined;

    // Detect explicit standard mention
    let standard = undefined;
    for (const s of knownStandards) {
      if (lower.includes(s)) {
        standard = s.replace(/\s+/g, '').toUpperCase(); // e.g. "ISO9001", "AS9100D"
        break;
      }
    }

    // Very simple topic extraction (first sentence truncated)
    const firstSentence = text.split(/[.!?]/)[0].slice(0, 200);

    // Debug-style mastery questions ("why can't you", "what is wrong with", etc.)
    if (lower.includes('what is wrong with') || lower.includes('why can\'t you') || 
        lower.includes('why can\'t you') || lower.includes('what\'s wrong')) {
      return {
        intent: 'system_capability_question',
        entities: { topic: firstSentence }
      };
    }

    // Admin / master / debug phrases
    if (lower.includes('master admin') || lower.includes('admin console') || 
        lower.includes('list your databases') || lower.includes('database connections')) {
      return {
        intent: 'admin_request',
        entities: { topic: firstSentence }
      };
    }

    // Obvious "what is X" style definitions
    // Handle patterns like "Vera, define CQE" or "define CQE" or "what is CQE"
    const hasDefinePattern = /(?:^|,|\s+)(?:vera,?\s*)?(?:define|what is|what's|what does)\s+/i.test(text);
    if (hasDefinePattern || lower.startsWith('what is ') || lower.startsWith('define ') || 
        lower.includes(' what does ') || lower.startsWith('what\'s ')) {
      // If CQE or six sigma terms appear, classify as quality engineering
      if (qualityKeywords.some(k => lower.includes(k))) {
        return {
          intent: 'quality_engineering_definition',
          entities: { topic: firstSentence }
        };
      }

      // If standard + clause detected
      if (standard || clauseRef) {
        return {
          intent: 'standard_clause_definition',
          entities: { standard, clauseRef, topic: firstSentence }
        };
      }

      // Generic definition
      return {
        intent: 'definition',
        entities: { topic: firstSentence }
      };
    }

    // Questions about "how many clauses", "which clause"
    if (lower.includes('how many clauses') || lower.includes('which clause') ||
        lower.includes('list clauses') || lower.includes('clause count')) {
      return {
        intent: 'standard_structure_question',
        entities: { standard, topic: firstSentence }
      };
    }

    // Mentions of specific regulators
    if (lower.includes('faa') || lower.includes('easa') || lower.includes('caac') ||
        lower.includes('casa') || lower.includes('uk caa') || lower.includes('ecfr') ||
        lower.includes('fda') || lower.includes('mdsap') || lower.includes('part 21') ||
        lower.includes('part 145')) {
      return {
        intent: 'regulatory_question',
        entities: { topic: firstSentence }
      };
    }

    // Quality / CI / Six Sigma / Lean / KPIs / culture
    if (qualityKeywords.some(k => lower.includes(k))) {
      return {
        intent: 'quality_engineering_question',
        entities: { topic: firstSentence }
      };
    }

    // Agile + QMS coexistence
    if (agileKeywords.some(k => lower.includes(k)) && lower.includes('qms')) {
      return {
        intent: 'agile_qms_integration_question',
        entities: { topic: firstSentence }
      };
    }

    // Smalltalk / greeting detection (but NOT if it contains definition keywords)
    // Only match if it's clearly a greeting without a question
    const isGreetingOnly = /(hello|hi|hey|good morning|good afternoon|good evening|how are you)/.test(lower) &&
        !hasDefinePattern &&
        !lower.includes('what') &&
        !lower.includes('define') &&
        !lower.includes('explain') &&
        !lower.includes('tell me') &&
        text.length < 80 &&
        !clauseRef &&
        !standard &&
        !qualityKeywords.some(k => lower.includes(k));
    
    if (isGreetingOnly) {
      return { intent: 'smalltalk', entities: {} };
    }

    // Identity/existence questions
    if (lower.includes('who are you') || lower.includes('your identity') || 
        lower.includes('tell me about yourself') || lower.includes('introduce yourself')) {
      return {
        intent: 'identity_query',
        entities: { topic: firstSentence }
      };
    }

    // Default: treat as generic compliance / quality question
    return {
      intent: 'generic_compliance_question',
      entities: { standard, clauseRef, topic: firstSentence }
    };
  }
}

export default VeraIntentClassifier;

