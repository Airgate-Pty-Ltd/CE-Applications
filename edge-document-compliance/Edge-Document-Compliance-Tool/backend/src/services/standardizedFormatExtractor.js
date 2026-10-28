/**
 * Standardized Format Extractor
 * Extracts requirements in the standardized format for ComplianceGap
 * 
 * Output Format:
 * {
 *   clause: "5" (top-level only),
 *   clause_name: "Leadership" (top-level name),
 *   subclause: "5.1.1" (full path),
 *   subclause_name: "General" (immediate subclause name),
 *   paragraph: "P1" (sequential per subclause),
 *   sub_paragraph: "5.1.1 General" (optional, only for X.Y.Z+),
 *   requirement: "text...",
 *   confidence: 0.92
 * }
 */

/**
 * Extract top-level clause number from full clause path
 * @param {string} fullClause - Full clause path (e.g., "5.1.1", "7.1.5.1")
 * @returns {string} - Top-level clause number (e.g., "5", "7")
 */
export function extractTopLevelClause(fullClause) {
  if (!fullClause || typeof fullClause !== 'string') return null;
  const parts = fullClause.split('.');
  return parts[0] || null;
}

/**
 * Determine if sub_paragraph field should be included
 * Only include for X.Y.Z or X.Y.Z.W levels (not X or X.Y)
 * @param {string} subclause - Full subclause path (e.g., "5.1.1", "7.1.5.1")
 * @returns {boolean} - True if sub_paragraph should be included
 */
export function shouldIncludeSubParagraph(subclause) {
  if (!subclause || typeof subclause !== 'string') return false;
  const parts = subclause.split('.');
  // Include if 3 or more levels (X.Y.Z or X.Y.Z.W)
  return parts.length >= 3;
}

/**
 * Extract clause name from hierarchy
 * @param {Object} clauseHierarchy - Map of clause numbers to names
 * @param {string} topLevelClause - Top-level clause number (e.g., "5")
 * @returns {string} - Clause name (e.g., "Leadership")
 */
export function getClauseName(clauseHierarchy, topLevelClause) {
  if (!clauseHierarchy || !topLevelClause) return null;
  const clauseInfo = clauseHierarchy.get(topLevelClause);
  return clauseInfo?.name || null;
}

/**
 * Extract subclause name from hierarchy
 * @param {Object} clauseHierarchy - Map of clause numbers to names
 * @param {string} subclause - Full subclause path (e.g., "5.1.1")
 * @returns {string} - Subclause name (e.g., "General")
 */
export function getSubclauseName(clauseHierarchy, subclause) {
  if (!clauseHierarchy || !subclause) return null;
  const clauseInfo = clauseHierarchy.get(subclause);
  return clauseInfo?.name || null;
}

/**
 * Format sub_paragraph field
 * @param {string} subclause - Full subclause path (e.g., "5.1.1")
 * @param {string} subclauseName - Subclause name (e.g., "General")
 * @returns {string} - Formatted sub_paragraph (e.g., "5.1.1 General")
 */
export function formatSubParagraph(subclause, subclauseName) {
  if (!subclause || !subclauseName) return null;
  return `${subclause} ${subclauseName}`;
}

/**
 * Standardized confidence scoring algorithm
 * Base: 0.60, adjustments per rules, clamped to 0.55-0.98
 * @param {string} text - Requirement text
 * @param {string} subclause - Full subclause path
 * @param {boolean} hasShall - Contains "shall"
 * @param {boolean} hasMust - Contains "must"
 * @param {boolean} hasShould - Contains "should"
 * @param {boolean} hasMay - Contains "may"
 * @param {boolean} isNote - Appears to be note/guidance
 * @param {boolean} isExample - Appears to be example
 * @returns {number} - Confidence score (0.55-0.98)
 */
export function calculateStandardizedConfidence(text, subclause, hasShall, hasMust, hasShould, hasMay, isNote, isExample) {
  let confidence = 0.60; // Base score (neutral starting point)
  
  // Keyword detection (add points)
  if (hasShall || hasMust) {
    confidence += 0.15; // Mandatory language
  } else if (hasShould || hasMay) {
    confidence += 0.05; // Advisory language
  }
  
  // Numbered/structured format boost
  if (subclause && subclause.includes('.')) {
    confidence += 0.10;
  }
  
  // Context keywords boost
  const contextKeywords = /\b(requirement|compliance|audit|standard|shall|must|ensure|establish|maintain|retain|determine|provide|control|monitor|measure|verify|validate|document|record|evidence)\b/i;
  if (contextKeywords.test(text)) {
    confidence += 0.05;
  }
  
  // Deductions (subtract points)
  if (isNote) {
    confidence -= 0.15; // Note/guidance text
  }
  if (isExample) {
    confidence -= 0.15; // Example/illustration
  }
  
  // Ambiguous mandate language deduction
  const ambiguousPattern = /\b(may|could|might|consider|should consider)\b/i;
  if (ambiguousPattern.test(text) && !hasShall && !hasMust) {
    confidence -= 0.10;
  }
  
  // Clamp to 0.55-0.98 range
  return Math.min(0.98, Math.max(0.55, confidence));
}

/**
 * Clean and normalize requirement text
 * @param {string} text - Raw requirement text
 * @returns {string} - Cleaned text
 */
export function cleanRequirementText(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    // Remove leading/trailing whitespace
    .trim()
    // Normalize multiple spaces to single space
    .replace(/\s+/g, ' ')
    // Remove excessive newlines (keep single newlines for readability)
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Preserve lettered lists (a., b., c.) and numbered lists
    // (already handled by listAtomizer)
    .trim();
}

/**
 * Build clause hierarchy map from parsed sections
 * @param {Array} sections - Array of { clauseNumber, clauseTitle, ... }
 * @returns {Map} - Map of clause numbers to { name, level, parent }
 */
export function buildClauseHierarchy(sections) {
  const hierarchy = new Map();
  
  for (const section of sections) {
    const { clauseNumber, clauseTitle } = section;
    if (!clauseNumber || !clauseTitle) continue;
    
    const parts = clauseNumber.split('.');
    const level = parts.length;
    const topLevel = parts[0];
    
    // Store this clause
    hierarchy.set(clauseNumber, {
      name: clauseTitle,
      level: level,
      topLevel: topLevel,
      parent: level > 1 ? parts.slice(0, -1).join('.') : null
    });
    
    // If this is a top-level clause (4, 5, 6, 7, 8, 9, 10), store it
    if (level === 1) {
      hierarchy.set(topLevel, {
        name: clauseTitle,
        level: 1,
        topLevel: topLevel,
        parent: null
      });
    }
  }
  
  return hierarchy;
}

/**
 * Create standardized requirement object
 * @param {Object} params - Parameters
 * @param {string} params.clause - Top-level clause number (e.g., "5")
 * @param {string} params.clause_name - Top-level clause name (e.g., "Leadership")
 * @param {string} params.subclause - Full subclause path (e.g., "5.1.1")
 * @param {string} params.subclause_name - Subclause name (e.g., "General")
 * @param {string} params.paragraph - Paragraph designation (e.g., "P1")
 * @param {string} params.requirement - Requirement text
 * @param {number} params.confidence - Confidence score (0.55-0.98)
 * @param {string} params.sub_paragraph - Optional sub_paragraph field
 * @returns {Object} - Standardized requirement object
 */
export function createStandardizedRequirement(params) {
  const {
    clause,
    clause_name,
    subclause,
    subclause_name,
    paragraph,
    requirement,
    confidence,
    sub_paragraph = null
  } = params;
  
  const requirementObj = {
    clause: clause || null,
    clause_name: clause_name || null,
    subclause: subclause || null,
    subclause_name: subclause_name || null,
    paragraph: paragraph || 'P1',
    requirement: requirement || '',
    confidence: Math.min(0.98, Math.max(0.55, confidence || 0.75))
  };
  
  // Only include sub_paragraph if provided and valid
  if (sub_paragraph && shouldIncludeSubParagraph(subclause)) {
    requirementObj.sub_paragraph = sub_paragraph;
  }
  
  return requirementObj;
}

