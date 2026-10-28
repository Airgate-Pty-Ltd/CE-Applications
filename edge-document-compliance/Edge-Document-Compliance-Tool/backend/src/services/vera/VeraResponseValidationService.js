/**
 * VERA Response Validation Service
 * 
 * Validates LLM response quality before returning to user.
 * Checks for empty responses, hallucinations, coherence, and more.
 */

/**
 * Validate response quality
 * @param {string} response - Response text to validate
 * @param {string} responseType - Response type (gap_analysis, rca_analysis, etc.)
 * @returns {Promise<Object>} Validation result
 */
export async function validateResponseQuality(response, responseType) {
  const issues = [];
  const recommendations = [];
  let qualityScore = 1.0;

  // Check 1: Is response empty?
  if (!response || response.trim().length === 0) {
    return {
      isValid: false,
      qualityScore: 0.0,
      issues: ['Response is empty'],
      recommendations: ['Check LLM connection and prompt']
    };
  }

  // Check 2: Is response too short?
  if (response.length < 50) {
    issues.push('Response is very short (< 50 characters)');
    qualityScore -= 0.2;
    recommendations.push('Response may be incomplete - consider expanding');
  }

  // Check 3: Is response too long?
  if (response.length > 10000) {
    issues.push('Response is very long (> 10,000 characters)');
    qualityScore -= 0.1;
    recommendations.push('Response may be verbose - consider summarizing');
  }

  // Check 4: Does it have required keywords for response type?
  const requiredKeywords = getRequiredKeywords(responseType);
  if (requiredKeywords.length > 0) {
    const missingKeywords = requiredKeywords.filter(keyword => 
      !response.toLowerCase().includes(keyword.toLowerCase())
    );
    if (missingKeywords.length > 0) {
      issues.push(`Missing expected keywords: ${missingKeywords.join(', ')}`);
      qualityScore -= 0.15;
    }
  }

  // Check 5: Is sentiment appropriate?
  const sentimentCheck = checkSentiment(response, responseType);
  if (!sentimentCheck.isAppropriate) {
    issues.push(`Sentiment may be inappropriate: ${sentimentCheck.reason}`);
    qualityScore -= 0.1;
  }

  // Check 6: Does it have coherent structure?
  const structureCheck = checkStructure(response, responseType);
  if (!structureCheck.isCoherent) {
    issues.push(`Structure may be incoherent: ${structureCheck.reason}`);
    qualityScore -= 0.1;
  }

  // Check 7: Any hallucinations detected?
  const hallucinationCheck = detectHallucinations(response);
  if (hallucinationCheck.detected) {
    issues.push(`Possible hallucination detected: ${hallucinationCheck.reason}`);
    qualityScore -= 0.2;
    recommendations.push('Verify factual claims in response');
  }

  // Check 8: Check for common error patterns
  const errorPatterns = detectErrorPatterns(response);
  if (errorPatterns.length > 0) {
    issues.push(`Error patterns detected: ${errorPatterns.join(', ')}`);
    qualityScore -= 0.1 * errorPatterns.length;
  }

  // Ensure quality score is between 0 and 1
  qualityScore = Math.max(0.0, Math.min(1.0, qualityScore));

  return {
    isValid: qualityScore >= 0.5, // Minimum threshold
    qualityScore: qualityScore,
    issues: issues,
    recommendations: recommendations
  };
}

/**
 * Get required keywords for response type
 * @param {string} responseType - Response type
 * @returns {Array<string>} Required keywords
 */
function getRequiredKeywords(responseType) {
  const keywordMap = {
    gap_analysis: ['gap', 'requirement', 'compliance', 'standard'],
    rca_analysis: ['root cause', 'why', 'analysis', 'cause'],
    companion_coaching: ['understand', 'help', 'support'],
    terminology: ['definition', 'term', 'means'],
    regulatory: ['regulation', 'requirement', 'compliance'],
    document_analysis: ['document', 'procedure', 'analysis']
  };

  return keywordMap[responseType] || [];
}

/**
 * Check if sentiment is appropriate for response type
 * @param {string} response - Response text
 * @param {string} responseType - Response type
 * @returns {Object} Sentiment check result
 */
function checkSentiment(response, responseType) {
  const lowerResponse = response.toLowerCase();
  
  // Check for inappropriate negative sentiment in coaching
  if (responseType === 'companion_coaching') {
    const negativeWords = ['stupid', 'wrong', 'bad', 'failure', 'can\'t', 'won\'t work'];
    const hasNegative = negativeWords.some(word => lowerResponse.includes(word));
    
    if (hasNegative && !lowerResponse.includes('not')) {
      return {
        isAppropriate: false,
        reason: 'Contains negative language inappropriate for coaching'
      };
    }
  }

  // Check for overly technical language in coaching
  if (responseType === 'companion_coaching') {
    const technicalWords = ['algorithm', 'implementation', 'optimization'];
    const hasTechnical = technicalWords.some(word => lowerResponse.includes(word));
    
    if (hasTechnical && response.length < 200) {
      return {
        isAppropriate: false,
        reason: 'Too technical for coaching context'
      };
    }
  }

  return { isAppropriate: true };
}

/**
 * Check if response has coherent structure
 * @param {string} response - Response text
 * @param {string} responseType - Response type
 * @returns {Object} Structure check result
 */
function checkStructure(response, responseType) {
  // Check for basic sentence structure
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  if (sentences.length < 2 && response.length > 100) {
    return {
      isCoherent: false,
      reason: 'Response lacks sentence structure'
    };
  }

  // Check for structured format if required
  if (responseType === 'gap_analysis' || responseType === 'rca_analysis') {
    // Should have some structure (bullets, numbers, sections)
    const hasStructure = /^[-*•]|^\d+\.|^##|^###/.test(response);
    if (!hasStructure && response.length > 300) {
      return {
        isCoherent: false,
        reason: 'Structured response type lacks formatting'
      };
    }
  }

  return { isCoherent: true };
}

/**
 * Detect potential hallucinations
 * @param {string} response - Response text
 * @returns {Object} Hallucination check result
 */
function detectHallucinations(response) {
  const lowerResponse = response.toLowerCase();
  
  // Check for overly specific claims without evidence
  const specificPatterns = [
    /exactly \d+%/, // "exactly 47%"
    /precisely \d+/, // "precisely 23"
    /definitely \w+/, // "definitely true"
  ];
  
  for (const pattern of specificPatterns) {
    if (pattern.test(response)) {
      return {
        detected: true,
        reason: 'Contains overly specific claims that may be fabricated'
      };
    }
  }

  // Check for contradictory statements
  const contradictions = [
    ['always', 'never'],
    ['all', 'none'],
    ['completely', 'partially']
  ];
  
  for (const [word1, word2] of contradictions) {
    if (lowerResponse.includes(word1) && lowerResponse.includes(word2)) {
      return {
        detected: true,
        reason: 'Contains contradictory statements'
      };
    }
  }

  return { detected: false };
}

/**
 * Detect common error patterns
 * @param {string} response - Response text
 * @returns {Array<string>} Detected error patterns
 */
function detectErrorPatterns(response) {
  const errors = [];
  
  // Check for repeated phrases (possible loop)
  const words = response.toLowerCase().split(/\s+/);
  const phraseCounts = {};
  for (let i = 0; i < words.length - 3; i++) {
    const phrase = words.slice(i, i + 3).join(' ');
    phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
    if (phraseCounts[phrase] > 3) {
      errors.push('Repeated phrases detected');
      break;
    }
  }

  // Check for incomplete sentences
  if (response.endsWith('...') || response.endsWith('---')) {
    errors.push('Response appears incomplete');
  }

  // Check for encoding issues
  if (response.includes('') || response.includes('\\u')) {
    errors.push('Possible encoding issues');
  }

  return errors;
}

export default {
  validateResponseQuality
};

