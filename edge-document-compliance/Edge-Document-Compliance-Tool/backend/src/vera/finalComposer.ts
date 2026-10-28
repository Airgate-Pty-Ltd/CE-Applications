/**
 * Final Composer
 * Formats Vera's responses into her natural, professional auditor voice
 */

export interface ComposerOptions {
  removeCapabilityLists?: boolean;
  ensureDirectAnswer?: boolean;
  addFollowUp?: boolean;
  maxLength?: number;
}

/**
 * Compose final response from Vera's intelligence output
 */
export function composeFinalResponse(
  veraResponse: string,
  options: ComposerOptions = {}
): string {
  const {
    removeCapabilityLists = true,
    ensureDirectAnswer = true,
    addFollowUp = true,
    maxLength = 2000
  } = options;

  let response = veraResponse.trim();

  // Remove capability lists unless explicitly requested
  if (removeCapabilityLists) {
    response = removeCapabilitySections(response);
  }

  // Ensure direct answer comes first
  if (ensureDirectAnswer) {
    response = ensureAnswerFirst(response);
  }

  // Remove excessive formatting
  response = cleanFormatting(response);

  // Remove emojis and marketing language
  response = removeEmojisAndMarketing(response);

  // Convert lists to paragraphs where appropriate
  response = convertListsToParagraphs(response);

  // Add optional follow-up
  if (addFollowUp && !response.includes('?')) {
    response = addNaturalFollowUp(response);
  }

  // Truncate if too long
  if (response.length > maxLength) {
    response = response.substring(0, maxLength - 3) + '...';
  }

  return response.trim();
}

/**
 * Remove capability list sections
 */
function removeCapabilitySections(text: string): string {
  // Remove sections that look like capability lists
  const capabilityPatterns = [
    /(?:\*\*)?(?:I can|I'm able to|Capabilities|Features|What I can do)[:\*]?\*\*?\s*\n(?:\s*[•\-\*]\s*[^\n]+\n?)+/gi,
    /(?:\*\*)?Available (?:features|capabilities|tools|functions)[:\*]?\*\*?\s*\n(?:\s*[•\-\*]\s*[^\n]+\n?)+/gi,
    /Here's what I can help with[:\s]*\n(?:\s*[•\-\*]\s*[^\n]+\n?)+/gi
  ];

  let cleaned = text;
  for (const pattern of capabilityPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned.trim();
}

/**
 * Ensure the answer comes first, not after explanations
 */
function ensureAnswerFirst(text: string): string {
  // If text starts with "I can help" or similar, try to find the actual answer
  if (/^(I can|I'm|Let me|Here's how)/i.test(text)) {
    // Look for the actual answer after the intro
    const answerMatch = text.match(/(?:\.|!|\n\n)([A-Z][^.!?]{20,})/);
    if (answerMatch) {
      // Reorder: answer first, then context
      const answer = answerMatch[1].trim();
      const rest = text.replace(answerMatch[0], '').trim();
      return `${answer} ${rest}`;
    }
  }

  return text;
}

/**
 * Clean excessive formatting
 */
function cleanFormatting(text: string): string {
  // Remove excessive bold/italic
  text = text.replace(/\*\*\*\*/g, '**');
  text = text.replace(/\*\*\*/g, '*');
  
  // Normalize headers (don't use too many ##)
  text = text.replace(/^####+/gm, '###');
  
  // Remove excessive line breaks
  text = text.replace(/\n{4,}/g, '\n\n');
  
  return text;
}

/**
 * Remove emojis and marketing language
 */
function removeEmojisAndMarketing(text: string): string {
  // Remove emojis
  text = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
  text = text.replace(/[\u{2600}-\u{26FF}]/gu, '');
  text = text.replace(/[\u{2700}-\u{27BF}]/gu, '');
  
  // Remove marketing phrases
  const marketingPhrases = [
    /unlock the power of/gi,
    /revolutionary/gi,
    /game-changing/gi,
    /cutting-edge/gi,
    /next-generation/gi
  ];
  
  for (const phrase of marketingPhrases) {
    text = text.replace(phrase, '');
  }
  
  return text.trim();
}

/**
 * Convert bullet lists to paragraphs where appropriate
 */
function convertListsToParagraphs(text: string): string {
  // Only convert short lists (3-5 items) to paragraphs
  const listPattern = /^(\s*[•\-\*]\s*[^\n]+(?:\n\s*[•\-\*]\s*[^\n]+){2,4})\n/gm;
  
  return text.replace(listPattern, (match) => {
    const items = match
      .split(/\n/)
      .map(line => line.replace(/^\s*[•\-\*]\s*/, '').trim())
      .filter(line => line.length > 0);
    
    if (items.length <= 5) {
      // Convert to paragraph
      return items.join('. ') + '. ';
    }
    
    return match; // Keep as list if too many items
  });
}

/**
 * Add natural follow-up question
 */
function addNaturalFollowUp(text: string): string {
  const followUps = [
    'Is there anything specific about this you\'d like me to clarify?',
    'Would you like me to look into any particular aspect of this?',
    'Do you have questions about how this applies to your situation?'
  ];

  // Only add if response is substantial and doesn't already end with a question
  if (text.length > 100 && !text.endsWith('?')) {
    const randomFollowUp = followUps[Math.floor(Math.random() * followUps.length)];
    return `${text}\n\n${randomFollowUp}`;
  }

  return text;
}

export default { composeFinalResponse };

