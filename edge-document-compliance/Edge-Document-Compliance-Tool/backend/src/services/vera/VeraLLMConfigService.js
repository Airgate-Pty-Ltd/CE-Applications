/**
 * VERA LLM Configuration Service
 * 
 * Provides optimized LLM configurations for different response types.
 * Each response type has tuned parameters for best results.
 */

export const LLM_CONFIGS = {
  // Gap Analysis - needs structured, precise responses
  gap_analysis: {
    temperature: 0.5, // Low temp = focused
    top_p: 0.9,
    max_tokens: 1500,
    top_k: 40,
    stop_sequences: ["\n\n[END]", "---"],
    response_format: "structured_json",
    cacheExpiryMinutes: 120 // Cache gap analysis longer
  },

  // RCA - needs thorough exploration
  rca_analysis: {
    temperature: 0.7, // Medium temp = exploratory
    top_p: 0.95,
    max_tokens: 2500,
    top_k: 50,
    stop_sequences: ["\n[ANALYSIS COMPLETE]"],
    response_format: "structured_json",
    cacheExpiryMinutes: 60
  },

  // Companion/Coaching - needs warmth and empathy
  companion_coaching: {
    temperature: 0.8, // Higher = more creative/warm
    top_p: 0.95,
    max_tokens: 1200,
    top_k: 50,
    stop_sequences: ["\n\nVERA:"],
    response_format: "text",
    cacheExpiryMinutes: 30 // Don't cache coaching responses
  },

  // Terminology lookup - needs accuracy
  terminology: {
    temperature: 0.3, // Very low = factual
    top_p: 0.85,
    max_tokens: 500,
    top_k: 30,
    stop_sequences: ["\n\nNext term:"],
    response_format: "text",
    cacheExpiryMinutes: 1440 // Cache terminology for 24 hours
  },

  // General Q&A - balanced
  general_qa: {
    temperature: 0.6,
    top_p: 0.9,
    max_tokens: 2000,
    top_k: 40,
    stop_sequences: ["\n\n---"],
    response_format: "text",
    cacheExpiryMinutes: 60
  },

  // Regulatory queries - needs precision
  regulatory: {
    temperature: 0.4,
    top_p: 0.9,
    max_tokens: 1800,
    top_k: 35,
    stop_sequences: ["\n\n[REGULATION END]"],
    response_format: "text",
    cacheExpiryMinutes: 240 // Cache regulatory for 4 hours
  },

  // Document analysis - needs thoroughness
  document_analysis: {
    temperature: 0.5,
    top_p: 0.9,
    max_tokens: 3000,
    top_k: 45,
    stop_sequences: ["\n\n[ANALYSIS COMPLETE]"],
    response_format: "structured_json",
    cacheExpiryMinutes: 180
  }
};

/**
 * Get configuration for a specific response type
 * @param {string} responseType - Response type (gap_analysis, rca_analysis, etc.)
 * @returns {Object} LLM configuration object
 */
export function getConfigForResponseType(responseType) {
  return LLM_CONFIGS[responseType] || LLM_CONFIGS.general_qa;
}

/**
 * Get all available response types
 * @returns {Array<string>} Array of response type names
 */
export function getAvailableResponseTypes() {
  return Object.keys(LLM_CONFIGS);
}

/**
 * Validate response type
 * @param {string} responseType - Response type to validate
 * @returns {boolean} True if valid
 */
export function isValidResponseType(responseType) {
  return responseType in LLM_CONFIGS;
}

export default {
  LLM_CONFIGS,
  getConfigForResponseType,
  getAvailableResponseTypes,
  isValidResponseType
};

