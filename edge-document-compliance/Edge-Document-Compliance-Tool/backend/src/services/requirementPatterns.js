/**
 * Requirement Pattern Matchers
 * Regex patterns for detecting requirements, subjects, modals, and exclusions
 */

export const SUBJECT_PATTERN = /\b(The\s+organization|The\s+supplier|The\s+company|The\s+provider)\b/i;

export const OBLIGATION_PATTERN = /\b(shall|must|will|are required to|is required to|has to|have to|is to|are to|should)\b/i;

export const ASSURANCE_VERB_PATTERN = /\b(ensure|ensures|maintain|maintains|retain|retains|establish|establishes|implement|implements|control|controls|record|records|provide|provides|determine|determines|monitor|monitors|measure|measures|analyze|analyzes|review|reviews|plan|plans|verify|verifies|validate|validates)\b/i;

export const RECOMMENDATION_PATTERN = /\b(should|could|may)\b/i;

export const NOTE_PATTERN = /^\s*note\b/i;

export const WILL_PATTERN = /\bwill\b/i;

export const PROHIBITION_PATTERN = /\b(shall\s+not|must\s+not|are\s+not\s+permitted|prohibited|forbidden)\b/i;

