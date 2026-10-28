/**
 * Requirement Classifier
 * Classifies sentences as requirements with type, subtype, and metadata
 */

import {
  SUBJECT_PATTERN,
  OBLIGATION_PATTERN,
  ASSURANCE_VERB_PATTERN,
  RECOMMENDATION_PATTERN,
  NOTE_PATTERN,
  WILL_PATTERN,
  PROHIBITION_PATTERN
} from './requirementPatterns.js';

/**
 * Check if clause number is in requirement scope (4-10)
 * Handles sub-refs like "4.4.2.a" by extracting the numeric part first
 */
export function inRequirementScope(clauseNumber) {
  if (!clauseNumber || typeof clauseNumber !== 'string') return false;
  
  // Extract numeric part (e.g., "4.4.2.a" -> "4.4.2", "8.5.1" -> "8.5.1")
  // Remove letter/non-numeric suffixes
  const numericPart = clauseNumber.split(/[^0-9.]/)[0] || clauseNumber;
  
  // Accept '4', '5', ..., '10' and any descendants '8.7', '8.7.1', ...
  if (!/^\d+(?:\.\d+)*$/.test(numericPart)) return false;
  
  const top = parseInt(numericPart.split('.')[0], 10);
  return top >= 4 && top <= 10;
}

/**
 * Infer requirement subtype from text and clause number
 */
export function inferSubtype(text, clauseNumber) {
  const SUBTYPE_MAP = [
    { key: 'records_retention', rx: /\b(retain(s)?|record(s)?|keep(s)?|document(ed)? information|retention|traceability)\b/i },
    { key: 'risk', rx: /\b(risk(s)?|opportunity|mitigate|risk-based|risk management)\b/i },
    { key: 'config', rx: /\b(configuration|change control|baseline|release)\b/i },
    { key: 'design', rx: /\b(design|development|verification|validation|requirements flowdown)\b/i },
    { key: 'purchasing', rx: /\b(purchase|supplier|externally provided|procurement|ASL|evaluation)\b/i },
    { key: 'ops', rx: /\b(operation(s)?|production|service provision|work instructions|control plan)\b/i },
    { key: 'release', rx: /\b(release|acceptance|conformity|inspection|test)\b/i },
    { key: 'ncr', rx: /\b(nonconform(ing|ity)|segregate|disposition|rework|repair|scrap)\b/i },
    { key: 'capa', rx: /\b(corrective action|root cause|8D|containment|effectiveness)\b/i },
    { key: 'management_review', rx: /\b(management review|inputs|outputs|top management)\b/i },
    { key: 'monitoring_measurement', rx: /\b(monitor(ing)?|measure(ment)?|kpi|calibration|metrology|msa)\b/i },
    { key: 'competence_training', rx: /\b(competence|competent|training|awareness)\b/i },
    { key: 'doc_control', rx: /\b(document(ed)? information|revision|change|control of documented information)\b/i },
    { key: 'product_safety', rx: /\b(product safety|safety risk|hazard)\b/i },
    { key: 'fod', rx: /\b(fod|foreign object debris|foreign object damage)\b/i },
    { key: 'counterfeit', rx: /\b(counterfeit|suspect part|fraudulent)\b/i }
  ];

  // Try keyword matching first
  for (const m of SUBTYPE_MAP) {
    if (m.rx.test(text)) return m.key;
  }

  // Fallback by clause family
  if (!clauseNumber || typeof clauseNumber !== 'string') return 'ops';
  
  const top = parseInt(clauseNumber.split('.')[0], 10);
  
  if (top === 4) return 'doc_control';
  if (top === 5) return 'management_review';
  if (top === 6) return 'risk';
  if (top === 7) return 'competence_training';
  if (top === 8) return 'ops';
  if (top === 9) return 'monitoring_measurement';
  if (top === 10) return 'capa';
  
  return 'ops';
}

/**
 * Classify a sentence as a requirement or skip it
 * Returns classification object with type, subtype, metadata
 * @param {string} rawSentence - The sentence text to classify
 * @param {string} clauseNumber - The clause number (e.g., "8.5.1" or "8.5.1.a")
 * @param {boolean} parentHasShall - Whether the parent clause contains "shall" (for list items)
 * @param {number} paragraphIndex - The paragraph position within the clause (1-based, for implicit paragraph numbering)
 */
export function classifySentence(rawSentence, clauseNumber, parentHasShall = false, paragraphIndex = null) {
  const text = (rawSentence || '').trim();
  
  // CRITICAL: Lower minimum length to capture more requirements
  if (!text || text.length < 10) {
    return { kind: 'skip', reason: 'too_short' };
  }

  const inScope = inRequirementScope(clauseNumber);
  const isNote = NOTE_PATTERN.test(text);
  const isRecom = RECOMMENDATION_PATTERN.test(text);

  // Scope guard: reject clauses 1-3
  if (!inScope) {
    return {
      kind: 'skip',
      reason: 'out_of_scope_clause_1_3_or_annex',
      is_in_scope: false
    };
  }

  // Exclude NOTES (but be more careful - only if it's clearly a note)
  if (isNote && text.length < 50) {
    // Only skip if it's a short note - longer notes might contain requirements
    return {
      kind: 'informative',
      is_informative_note: true,
      is_in_scope: true
    };
  }

  // PRIMARY RULE: If text contains "shall", "will", "must", or "should", it's a requirement
  // This is the core definition of a requirement statement
  const hasSubject = SUBJECT_PATTERN.test(text);
  const hasObligation = OBLIGATION_PATTERN.test(text);  // shall, must
  const hasWill = WILL_PATTERN.test(text);
  const hasProhibition = PROHIBITION_PATTERN.test(text);
  const hasAssurance = ASSURANCE_VERB_PATTERN.test(text);
  const hasShould = RECOMMENDATION_PATTERN.test(text);  // should, could, may
  
  // Check if this is a list item (has sub_ref in clauseNumber)
  const isListItem = clauseNumber && /\.([a-z]|\d+)$/i.test(clauseNumber);

  // Determine requirement type - PRIORITIZE shall/will/must/should statements
  let requirement_type = null;
  let modal = null;
  let isRecommendation = false;

  // PRIORITY 1: Explicit requirement keywords (shall, must, will)
  if (hasProhibition) {
    requirement_type = 'prohibition';
    modal = (text.match(PROHIBITION_PATTERN) || [''])[0].toLowerCase();
  } else if (hasObligation) {
    // "shall" or "must" - this is a mandatory requirement
    requirement_type = 'mandatory';
    modal = (text.match(OBLIGATION_PATTERN) || [''])[0].toLowerCase();
  } else if (hasWill && inScope) {
    // "will" in scope clauses (4-10) - this is a mandatory requirement
    requirement_type = 'mandatory';
    modal = 'will';
  } else if (hasShould && inScope) {
    // "should" in scope clauses (4-10) - this is a recommended requirement (still a requirement!)
    requirement_type = 'recommended';
    modal = (text.match(RECOMMENDATION_PATTERN) || [''])[0].toLowerCase();
    isRecommendation = true;
  } else if ((isListItem || parentHasShall) && text.length > 8) {
    // PRIORITY 2: List items (a., b., c.) under a "shall" statement are requirements
    // Even if they don't repeat "shall", they inherit requirement status from parent
    requirement_type = 'mandatory';
    modal = parentHasShall ? 'shall' : 'implicit';
  } else if (hasAssurance && inScope) {
    // PRIORITY 3: Assurance verbs in scope clauses (ensure, maintain, etc.)
    requirement_type = 'assurance';
    modal = (text.match(ASSURANCE_VERB_PATTERN) || [''])[0].toLowerCase();
  } else {
    // No explicit requirement keywords found
    return { kind: 'skip', reason: 'no_requirement_indicators' };
  }

  // Extract metadata
  const requirement_subtype = inferSubtype(text, clauseNumber);
  
  // Extract paragraph number (P1, P2, P3, etc.) from text
  // Look for patterns like: "P1", "P2", "paragraph 1", "para 2", "par. 3", etc.
  let subject_text = 'implicit';
  
  // Try to find paragraph number in the text
  const paragraphPatterns = [
    /\bP(\d+)\b/i,                    // P1, P2, P3
    /\bparagraph\s+(\d+)\b/i,          // paragraph 1, paragraph 2
    /\bpara\s+(\d+)\b/i,                // para 1, para 2
    /\bpar\.\s*(\d+)\b/i,              // par. 1, par.2
    /\bparagraph\s+number\s+(\d+)\b/i, // paragraph number 1
  ];
  
  for (const pattern of paragraphPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      subject_text = `P${match[1]}`;
      break;
    }
  }
  
  // If no paragraph number found, use paragraph index as fallback (implicit paragraph numbering)
  if (subject_text === 'implicit' && paragraphIndex && paragraphIndex > 0) {
    subject_text = `P${paragraphIndex}`;
    // Debug logging for paragraph assignment
    if (process.env.DEBUG_PARAGRAPHS === 'true') {
      console.log(`      📍 Assigned paragraph ${subject_text} to clause ${clauseNumber} (index: ${paragraphIndex})`);
    }
  }
  
  // If still no paragraph number, try to extract subject (organization, supplier, etc.)
  if (subject_text === 'implicit' && hasSubject) {
    const subjectMatch = text.match(SUBJECT_PATTERN);
    if (subjectMatch && subjectMatch[0]) {
      subject_text = subjectMatch[0].trim();
    }
  }
  
  const clause_path_depth = clauseNumber.split('.').length;

  return {
    kind: 'requirement',
    requirement_type,
    requirement_subtype,
    subject_text,
    modal_verb: modal,
    clause_path_depth,
    is_in_scope: true,
    is_informative_note: false,
    is_recommendation: isRecommendation
  };
}

