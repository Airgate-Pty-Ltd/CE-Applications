/**
 * VeraMistralService - Core LLM Integration Service
 * Handles all communication with Ollama/Mistral 7B for VERA
 * 
 * Features:
 * - Health checking
 * - Response generation with retry logic
 * - In-memory LRU caching
 * - Timeout handling
 * - Error recovery
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('MISTRAL');

/**
 * Global Mistral Availability State Manager
 * Process-local state tracking for Mistral/Ollama availability
 */
class MistralAvailabilityManager {
  constructor() {
    this.available = false;
    this.lastHealthCheck = null;
    this.lastError = null;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3; // After 3 failures, mark as unavailable
  }

  /**
   * Set Mistral availability status
   * @param {boolean} available - Whether Mistral is available
   * @param {string} reason - Reason for the status change
   */
  setAvailable(available, reason = '') {
    const wasAvailable = this.available;
    this.available = available;
    this.lastHealthCheck = new Date();
    
    if (available) {
      this.consecutiveFailures = 0;
      this.lastError = null;
      if (!wasAvailable) {
        logger.info('Mistral availability changed: ONLINE', { reason });
      }
    } else {
      this.consecutiveFailures++;
      if (wasAvailable) {
        logger.warn('Mistral availability changed: OFFLINE', { reason, consecutiveFailures: this.consecutiveFailures });
      }
    }
  }

  /**
   * Check if Mistral is currently available
   * @returns {boolean} True if available, false otherwise
   */
  isAvailable() {
    return this.available;
  }

  /**
   * Record a failure (increments consecutive failure count)
   * @param {Error|string} error - Error that occurred
   */
  recordFailure(error) {
    this.consecutiveFailures++;
    this.lastError = error instanceof Error ? error.message : String(error);
    
    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      this.setAvailable(false, `Too many consecutive failures (${this.consecutiveFailures})`);
    }
  }

  /**
   * Record a success (resets failure count)
   */
  recordSuccess() {
    if (this.consecutiveFailures > 0) {
      logger.info('Mistral recovered from failures', { previousFailures: this.consecutiveFailures });
    }
    this.consecutiveFailures = 0;
    this.lastError = null;
    this.setAvailable(true, 'Health check passed');
  }

  /**
   * Get availability status with details
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      available: this.available,
      lastHealthCheck: this.lastHealthCheck?.toISOString() || null,
      consecutiveFailures: this.consecutiveFailures,
      lastError: this.lastError
    };
  }

  /**
   * Reset availability state (for testing/recovery)
   */
  reset() {
    this.available = false;
    this.lastHealthCheck = null;
    this.lastError = null;
    this.consecutiveFailures = 0;
  }
}

// Global singleton instance
const availabilityManager = new MistralAvailabilityManager();

/**
 * Simple LRU Cache implementation
 */
class LRUCache {
  constructor(maxSize = 100, ttl = 3600000) { // 1 hour default TTL
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
  }

  /**
   * Generate cache key from prompt
   */
  _generateKey(systemPrompt, userPrompt) {
    return `${systemPrompt}:${userPrompt}`.substring(0, 200); // Limit key length
  }

  /**
   * Check if entry is expired
   */
  _isExpired(entry) {
    return Date.now() - entry.timestamp > this.ttl;
  }

  /**
   * Get value from cache
   */
  get(systemPrompt, userPrompt) {
    const key = this._generateKey(systemPrompt, userPrompt);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (this._isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(systemPrompt, userPrompt, value) {
    const key = this._generateKey(systemPrompt, userPrompt);
    
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl
    };
  }
}

/**
 * VeraMistralService - Main service class
 */
class VeraMistralService {
  constructor(options = {}) {
    // Configuration from environment or options
    this.endpoint = options.endpoint || process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    this.model = options.model || process.env.OLLAMA_MODEL || 'mistral';
    this.timeout = options.timeout || parseInt(process.env.OLLAMA_TIMEOUT_MS || '60000', 10);
    this.maxRetries = options.maxRetries || parseInt(process.env.OLLAMA_MAX_RETRIES || '3', 10);
    this.enableCache = process.env.MISTRAL_CACHE_RESPONSES !== 'false';
    
    // Initialize cache
    this.cache = this.enableCache ? new LRUCache(100, 3600000) : null;
    
    // Health status
    this.isHealthy = false;
    this.lastHealthCheck = null;
    
    logger.info('VeraMistralService initialized', {
      endpoint: this.endpoint,
      model: this.model,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      cacheEnabled: this.enableCache
    });
  }

  /**
   * Deep health check - verifies connectivity AND model responsiveness
   * @returns {Promise<Object>} Health status with detailed diagnostics
   */
  async deepHealthCheck() {
    try {
      // Step 1: Check connectivity to Ollama endpoint
      logger.debug('Deep health check: Testing connectivity...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const tagsResponse = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!tagsResponse.ok) {
        throw new Error(`Ollama connectivity check failed: ${tagsResponse.status}`);
      }
      
      const tagsData = await tagsResponse.json();
      const hasMistral = tagsData.models?.some(m => m.name?.includes(this.model)) || false;
      
      if (!hasMistral) {
        throw new Error(`Model "${this.model}" not found in Ollama. Available models: ${tagsData.models?.map(m => m.name).join(', ') || 'none'}`);
      }
      
      // Step 2: Test model responsiveness with a simple prompt
      logger.debug('Deep health check: Testing model responsiveness...');
      const testController = new AbortController();
      const testTimeoutId = setTimeout(() => testController.abort(), 10000); // 10s for test generation
      
      const testResponse = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          prompt: 'ping',
          stream: false,
          options: {
            num_predict: 5 // Just need a tiny response
          }
        }),
        signal: testController.signal
      });
      
      clearTimeout(testTimeoutId);
      
      if (!testResponse.ok) {
        throw new Error(`Model test generation failed: ${testResponse.status}`);
      }
      
      const testData = await testResponse.json();
      if (!testData.response) {
        throw new Error('Model test returned empty response');
      }
      
      // All checks passed
      this.isHealthy = true;
      this.lastHealthCheck = new Date();
      availabilityManager.recordSuccess();
      
      return {
        status: 'ok',
        endpoint: this.endpoint,
        model: this.model,
        modelAvailable: true,
        connectivity: 'ok',
        modelResponsive: true,
        timestamp: this.lastHealthCheck.toISOString()
      };
      
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = new Date();
      
      // Determine error type
      let errorType = 'unknown';
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        errorType = 'timeout';
      } else if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED') || error.message.includes('network')) {
        errorType = 'network';
      } else if (error.message.includes('model') || error.message.includes('not found')) {
        errorType = 'model_not_found';
      }
      
      availabilityManager.recordFailure(error);
      
      logger.error('Deep health check failed', {
        error: error.message,
        errorType,
        endpoint: this.endpoint,
        model: this.model
      });
      
      return {
        status: 'error',
        endpoint: this.endpoint,
        model: this.model,
        error: error.message,
        errorType,
        timestamp: this.lastHealthCheck.toISOString()
      };
    }
  }

  /**
   * Check health of Ollama service (lightweight check)
   * @returns {Promise<Object>} Health status
   */
  async health() {
    // Use deep health check for consistency
    return this.deepHealthCheck();
  }

  /**
   * Check if Mistral is available (quick check using cached state)
   * @returns {boolean} True if available
   */
  isMistralAvailable() {
    return availabilityManager.isAvailable();
  }

  /**
   * Build prompt from system and user prompts
   * @param {string} systemPrompt - System/context prompt
   * @param {string} userPrompt - User question/request
   * @returns {string} Combined prompt
   */
  _buildPrompt(systemPrompt, userPrompt) {
    if (!systemPrompt) {
      return userPrompt;
    }
    return `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`;
  }

  /**
   * Call Ollama API with retry logic
   * @param {string} prompt - Full prompt to send
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Response from Ollama
   */
  async _callOllama(prompt, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 2000,
      topP = 0.9,
      topK = 40
    } = options;
    
    const requestBody = {
      model: this.model,
      prompt: prompt,
      stream: false,
      options: {
        temperature,
        top_p: topP,
        top_k: topK,
        num_predict: maxTokens
      }
    };
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`Calling Ollama (attempt ${attempt}/${this.maxRetries})`, {
          promptLength: prompt.length,
          model: this.model
        });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(`${this.endpoint}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (!data.response) {
          throw new Error('Ollama returned empty response');
        }
        
        logger.debug('Ollama response received', {
          responseLength: data.response.length,
          tokensUsed: data.eval_count || 0
        });
        
        return {
          text: data.response.trim(),
          tokensUsed: data.eval_count || 0,
          model: this.model,
          done: data.done || true
        };
        
      } catch (error) {
        lastError = error;
        
        if (error.name === 'AbortError') {
          logger.warn(`Request timeout (attempt ${attempt}/${this.maxRetries})`);
        } else {
          logger.warn(`Request failed (attempt ${attempt}/${this.maxRetries})`, {
            error: error.message
          });
        }
        
        // Exponential backoff: wait 1s, 2s, 4s
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          logger.debug(`Retrying after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    throw new Error(`Failed after ${this.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Generate response from Mistral
   * @param {string} userPrompt - User's question/request
   * @param {string} systemPrompt - System context/instructions
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated response
   */
  async generateResponse(userPrompt, systemPrompt = '', options = {}) {
    try {
      const fullPrompt = this._buildPrompt(systemPrompt, userPrompt);
      
      // Check cache first
      if (this.cache) {
        const cached = this.cache.get(systemPrompt, userPrompt);
        if (cached) {
          logger.debug('Cache hit', { promptLength: userPrompt.length });
          return {
            ...cached,
            cached: true
          };
        }
      }
      
      // Call Ollama
      const result = await this._callOllama(fullPrompt, options);
      
      // Store in cache
      if (this.cache) {
        this.cache.set(systemPrompt, userPrompt, result);
      }
      
      return {
        ...result,
        cached: false
      };
      
    } catch (error) {
      logger.error('Failed to generate response', {
        error: error.message,
        userPrompt: userPrompt.substring(0, 100)
      });
      throw error;
    }
  }

  /**
   * Generate clarification question
   * @param {string} requirement - Requirement text
   * @param {string} procedure - Current procedure text
   * @returns {Promise<Object>} Clarification question
   */
  async generateClarificationQuestion(requirement, procedure) {
    const systemPrompt = `You are a compliance expert. Generate a clear, yes/no question that helps determine if a procedure meets a requirement. Keep questions under 200 characters.`;
    
    const userPrompt = `Requirement: "${requirement}"\n\nCurrent Procedure: "${procedure}"\n\nGenerate a yes/no question to clarify if the procedure meets this requirement:`;
    
    try {
      const result = await this.generateResponse(userPrompt, systemPrompt, {
        temperature: 0.5,
        maxTokens: 100
      });
      
      return {
        question: result.text,
        tokensUsed: result.tokensUsed,
        model: result.model
      };
    } catch (error) {
      logger.error('Failed to generate clarification question', { error: error.message });
      throw error;
    }
  }

  /**
   * Explain a requirement in simple terms
   * @param {string} requirementText - Requirement to explain
   * @param {string} context - Additional context (optional)
   * @returns {Promise<Object>} Explanation
   */
  async explainRequirement(requirementText, context = '') {
    const systemPrompt = `You are a compliance expert explaining requirements in simple, clear language. Provide 2-3 sentences that help someone understand what the requirement means.`;
    
    const userPrompt = context 
      ? `Requirement: "${requirementText}"\n\nContext: "${context}"\n\nExplain this requirement simply:`
      : `Requirement: "${requirementText}"\n\nExplain this requirement simply:`;
    
    try {
      const result = await this.generateResponse(userPrompt, systemPrompt, {
        temperature: 0.6,
        maxTokens: 300
      });
      
      return {
        explanation: result.text,
        tokensUsed: result.tokensUsed,
        model: result.model
      };
    } catch (error) {
      logger.error('Failed to explain requirement', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze gap between requirement and procedure
   * @param {string} requirement - Requirement text
   * @param {string} procedure - Procedure text
   * @param {string} industry - Industry context (optional)
   * @returns {Promise<Object>} Gap analysis
   */
  async analyzeGap(requirement, procedure, industry = '') {
    const systemPrompt = `You are a compliance gap analyst. Analyze if a procedure covers a requirement. Return JSON with: covers (boolean), confidence (0-1), and reasoning (string explaining why).`;
    
    const userPrompt = industry
      ? `Requirement: "${requirement}"\n\nProcedure: "${procedure}"\n\nIndustry: ${industry}\n\nAnalyze if the procedure covers this requirement:`
      : `Requirement: "${requirement}"\n\nProcedure: "${procedure}"\n\nAnalyze if the procedure covers this requirement:`;
    
    try {
      const result = await this.generateResponse(userPrompt, systemPrompt, {
        temperature: 0.3,
        maxTokens: 500
      });
      
      // Try to parse JSON from response
      let analysis;
      try {
        // Extract JSON from response (might have extra text)
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        // Fallback: create analysis from text
        logger.warn('Could not parse JSON from gap analysis, using fallback');
        const lowerText = result.text.toLowerCase();
        analysis = {
          covers: lowerText.includes('yes') || lowerText.includes('covers') || lowerText.includes('meets'),
          confidence: 0.5,
          reasoning: result.text
        };
      }
      
      return {
        analysis: {
          covers: Boolean(analysis.covers),
          confidence: Math.max(0, Math.min(1, analysis.confidence || 0.5)),
          reasoning: analysis.reasoning || result.text
        },
        tokensUsed: result.tokensUsed,
        model: result.model
      };
    } catch (error) {
      logger.error('Failed to analyze gap', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate procedure language from requirement
   * @param {string} requirementClause - Requirement clause
   * @param {string} currentLanguage - Current procedure language (optional)
   * @returns {Promise<Object>} Suggested procedure language
   */
  async generateProcedureLanguage(requirementClause, currentLanguage = '') {
    const systemPrompt = `You are a compliance procedure writer. Generate professional, specific, and measurable procedure language that meets a requirement. Use clear action verbs and include measurable criteria.`;
    
    const userPrompt = currentLanguage
      ? `Requirement: "${requirementClause}"\n\nCurrent Procedure: "${currentLanguage}"\n\nGenerate improved procedure language that better meets this requirement:`
      : `Requirement: "${requirementClause}"\n\nGenerate procedure language that meets this requirement:`;
    
    try {
      const result = await this.generateResponse(userPrompt, systemPrompt, {
        temperature: 0.7,
        maxTokens: 400
      });
      
      return {
        suggestedLanguage: result.text,
        tokensUsed: result.tokensUsed,
        model: result.model
      };
    } catch (error) {
      logger.error('Failed to generate procedure language', { error: error.message });
      throw error;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    if (!this.cache) {
      return { enabled: false };
    }
    return {
      enabled: true,
      ...this.cache.getStats()
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    if (this.cache) {
      this.cache.clear();
      logger.info('Cache cleared');
    }
  }
}

// Export singleton instance
let serviceInstance = null;

/**
 * Get or create VeraMistralService instance
 * @param {Object} options - Service options
 * @returns {VeraMistralService} Service instance
 */
export function getVeraMistralService(options = {}) {
  if (!serviceInstance) {
    serviceInstance = new VeraMistralService(options);
  }
  return serviceInstance;
}

/**
 * Global availability state management
 */
export function setMistralAvailable(available, reason = '') {
  availabilityManager.setAvailable(available, reason);
}

export function isMistralAvailable() {
  return availabilityManager.isAvailable();
}

export function getMistralAvailabilityStatus() {
  return availabilityManager.getStatus();
}

export default VeraMistralService;
