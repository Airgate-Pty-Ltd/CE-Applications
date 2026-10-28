/**
 * Vera Intent Service
 * Central intent classification with domain awareness
 * Provides technical question detection and domain-level routing
 */

/**
 * Check if message looks like a technical question
 * @param {string} messageText
 * @returns {boolean}
 */
export function looksLikeTechnicalQuestion(messageText) {
  if (!messageText || typeof messageText !== 'string') {
    return false;
  }

  const text = messageText.toLowerCase().trim();

  // CRITICAL: Diagnostic questions are ALWAYS technical
  const diagnosticPatterns = [
    /\b0331\b/,
    /\bdiagnose\b/,
    /\bdebug\b/,
    /\bself diagnostic\b/,
    /\bfull self diagnostic\b/,
    /\bconnection error\b/,
    /\bdatabase connection\b/,
    /\bwhat issues\b/,
    /\bwhat problems\b/,
    /\bhealth check\b/,
    /\bsystem status\b/
  ];

  if (diagnosticPatterns.some((re) => re.test(text))) {
    return true;
  }

  // Strong indicators of technical intent
  const technicalPatterns = [
    /\bwhat is\b/,
    /\bwhat's\b/,
    /\bwhat are\b/,
    /\bdefine\b/,
    /\bexplain\b/,
    /\bhow does\b/,
    /\bhow do\b/,
    /\bhow many\b/,
    /\bwhy does\b/,
    /\bwhy is\b/,
    /\bdescribe\b/,
    /\bcompare\b/,
    /\bdifference between\b/,
    /\btell me about\b/,
    /\bwhat do you know about\b/
  ];

  return technicalPatterns.some((re) => re.test(text));
}

/**
 * Classify intent with domain awareness
 * @param {string} messageText
 * @returns {{
 *   highLevelIntent: 'debug' | 'technical_question' | 'smalltalk' | 'generic',
 *   domain: 'system' | 'regulatory' | 'quality_eng' | 'qms_org_specific' | 'generic' | 'none',
 *   entities?: Object
 * }}
 */
export function classifyIntent(messageText) {
  if (!messageText || typeof messageText !== 'string') {
    return { highLevelIntent: 'generic', domain: 'generic' };
  }

  const text = messageText.trim();
  const lower = text.toLowerCase();

  // 1. Debug PIN or explicit debug
  if (lower.includes('0331') || lower.startsWith('debug:')) {
    return { highLevelIntent: 'debug', domain: 'system' };
  }

  // 2. Technical vs non-technical
  const technical = looksLikeTechnicalQuestion(text);

  // 3. Domain hints: regulatory vs quality vs generic
  const regulatoryKeywords = [
    'as9100', 'as9100d', 'iso 9001', 'iso9001', 'iso 13485', 'iso13485',
    '21.137', '14 cfr', 'faa', 'easa', 'caac', 'casa', 'mdsap',
    'clause', 'subclause', 'part 21', 'part 145', 'iatf 16949', 'iatf16949',
    'iso 9001:2015', 'iso9001:2015', 'as9110', 'as9120'
  ];

  // CRITICAL: Separate CQE-specific keywords from Six Sigma/DMAIC keywords
  // This prevents CQE questions from routing to DMAIC responses
  const cqeKeywords = [
    'cqe', 'certified quality engineer', 'quality engineer exam', 'cqe exam',
    'cqe certification', 'asq cqe', 'cqe body of knowledge', 'cqe bok'
  ];
  
  const sixSigmaKeywords = [
    'six sigma', 'dmaic', 'dmadv', 'dfss', 'define measure analyze improve control',
    'black belt', 'green belt', 'sigma level', 'dmaic phases', 'dmaic methodology'
  ];
  
  const qualityKeywords = [
    'lean', '5s', 'poka yoke', 'control chart', 'spc', 'statistical process control',
    'kpi', 'key performance indicator', 'cost of quality', 'coq', 'ppk', 'cpk',
    'process capability', 'fmea', 'pfmea', 'dfmea', 'apqp', 'ppap',
    'continuous improvement', 'kaizen', 'problem solving', 'root cause',
    'wastes', 'muda', 'value stream', 'kanban',
    'msa', 'gage r&r', 'gr&r', 'reliability', 'mtbf', 'mttr', 'weibull',
    'metrology', 'calibration', 'uncertainty', 'sca', 'scar',
    'supplier corrective action', 'vda', 'iso 19011', 'audit'
  ];

  const qmsOrgKeywords = [
    'procedure', 'work instruction', 'quality manual', 'policy',
    'document control', 'record', 'nonconformity', 'corrective action',
    'preventive action', 'management review', 'internal audit'
  ];

  const isRegulatory = regulatoryKeywords.some(k => lower.includes(k));
  
  // Check for CQE vs Six Sigma separately
  const isCQE = cqeKeywords.some(k => lower.includes(k));
  const isSixSigma = sixSigmaKeywords.some(k => lower.includes(k));
  const isQuality = qualityKeywords.some(k => lower.includes(k)) || isCQE || isSixSigma;
  const isQmsOrg = qmsOrgKeywords.some(k => lower.includes(k));

  // Extract entities for regulatory questions
  const clauseMatch = lower.match(/\b([4-9]\.\d+(\.\d+)?(\s*[a-z])?)\b/);
  const clauseRef = clauseMatch ? clauseMatch[1].replace(/\s+/g, '') : undefined;

  let standard = undefined;
  for (const s of regulatoryKeywords.slice(0, 10)) { // First 10 are standards
    if (lower.includes(s)) {
      standard = s.replace(/\s+/g, '').toUpperCase();
      break;
    }
  }

  if (technical) {
    if (isRegulatory) {
      return {
        highLevelIntent: 'technical_question',
        domain: 'regulatory',
        entities: { standard, clauseRef }
      };
    }
    if (isQuality) {
      // Distinguish CQE from Six Sigma for better routing
      const topic = isCQE ? 'CQE' : (isSixSigma ? 'six_sigma' : 'quality_eng');
      return {
        highLevelIntent: 'technical_question',
        domain: 'quality_eng',
        entities: {
          topic: topic,
          subTopic: isCQE ? 'certification' : (isSixSigma ? 'dmaic' : null)
        }
      };
    }
    if (isQmsOrg) {
      return {
        highLevelIntent: 'technical_question',
        domain: 'qms_org_specific',
        entities: {}
      };
    }
    return {
      highLevelIntent: 'technical_question',
      domain: 'generic',
      entities: {}
    };
  }

  // 4. Smalltalk / greeting detection (only if not technical)
  const greetingKeywords = [
    'hello', 'hi ', 'hi,', 'good morning', 'good afternoon', 'good evening',
    'how are you', 'how\'s it going', 'how are things', 'morning', 'afternoon',
    'evening', 'good to see you', 'nice to see you', 'hey', 'hey vera'
  ];

  const isGreeting = greetingKeywords.some(k => lower.includes(k)) && 
                     !technical && 
                     text.length < 100; // Short messages are more likely greetings

  if (isGreeting) {
    return { highLevelIntent: 'smalltalk', domain: 'none' };
  }

  // 5. Fallback: generic (but preserve domain hints)
  return {
    highLevelIntent: 'generic',
    domain: isRegulatory ? 'regulatory' : (isQuality ? 'quality_eng' : (isQmsOrg ? 'qms_org_specific' : 'generic')),
    entities: isRegulatory ? { standard, clauseRef } : {}
  };
}

/**
 * Determine if "teach me" fallback should be used
 * @param {Object} intentInfo - Result from classifyIntent()
 * @param {Object} retrievalResult - Result from knowledge retrieval
 * @returns {boolean}
 */
export function shouldUseTeachMeFallback(intentInfo, retrievalResult) {
  // Only use "teach me" for regulatory or QMS-org-specific when no relevant content found
  if (intentInfo.domain === 'regulatory' || intentInfo.domain === 'qms_org_specific') {
    return !retrievalResult || 
           (!retrievalResult.foundRelevantClause && 
            !retrievalResult.foundRelevantDoc && 
            !retrievalResult.foundRelevantStandard);
  }

  // For quality engineering and generic technical questions, do NOT use teach-me fallback
  return false;
}

export default {
  looksLikeTechnicalQuestion,
  classifyIntent,
  shouldUseTeachMeFallback
};

