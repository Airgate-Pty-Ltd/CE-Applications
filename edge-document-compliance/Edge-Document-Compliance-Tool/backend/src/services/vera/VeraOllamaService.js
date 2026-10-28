/**
 * VERA Ollama Service - Production-Ready LLM Integration
 * 
 * Enterprise-grade Ollama integration with:
 * - Retry logic with exponential backoff
 * - Streaming support
 * - Response caching
 * - Token management
 * - Response validation
 * - Performance tracking
 * - Fallback to Claude API
 */

import { getConfigForResponseType } from './VeraLLMConfigService.js';
import * as VeraTokenService from './VeraTokenService.js';
import * as VeraResponseCache from './VeraResponseCacheService.js';
import * as VeraResponseValidation from './VeraResponseValidationService.js';
import * as VeraLLMMonitoring from './VeraLLMMonitoringService.js';
import * as VeraConversationContext from './VeraConversationContextService.js';

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const OLLAMA_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS || '60000', 10);
const OLLAMA_MAX_RETRIES = parseInt(process.env.OLLAMA_MAX_RETRIES || '3', 10);
const FALLBACK_TO_CLAUDE = process.env.FALLBACK_TO_CLAUDE === 'true';

/**
 * Call Ollama with full production support
 * @param {Object} options - Call options
 * @returns {Promise<Object>} Response object
 */
export async function callOllamaWithFullSupport(options = {}) {
  const {
    userQuery,
    systemPrompt,
    context = '',
    responseType = 'general_qa',
    userId = null,
    conversationId = null,
    retryCount = 0,
    maxRetries = OLLAMA_MAX_RETRIES,
    useStreaming = false,
    validateResponse = true,
    trackMetrics = true,
    tenantId = '00000000-0000-0000-0000-000000000000',
    onToken = null // Callback for streaming tokens
  } = options;

  // Get configuration for this response type
  const config = getConfigForResponseType(responseType);

  // Build conversation context if conversationId provided
  let conversationContext = '';
  if (conversationId) {
    conversationContext = await VeraConversationContext.buildConversationContext(
      conversationId,
      5,
      tenantId
    );
  }

  // Combine all context
  const fullContext = conversationContext 
    ? `${conversationContext}\n\n${context}`
    : context;

  // Ensure we fit in token budget
  const safeContext = await VeraTokenService.ensureTokenBudget(
    fullContext,
    config.max_tokens
  );

  // Build full prompt
  const fullPrompt = buildFullPrompt(systemPrompt, safeContext, userQuery);

  // Check cache first
  const cacheKey = await VeraResponseCache.generateCacheKey(
    userQuery,
    responseType,
    { contextHash: safeContext.substring(0, 100) }
  );
  
  const cached = await VeraResponseCache.checkResponseCache(cacheKey);
  if (cached && !VeraResponseCache.isCacheExpired(cached)) {
    return {
      response: cached.response,
      fromCache: true,
      timestamp: new Date(),
      qualityScore: cached.qualityScore
    };
  }

  const startTime = Date.now();

  try {
    // Call Ollama with retry logic
    let response;

    if (useStreaming && onToken) {
      response = await callOllamaStreaming(fullPrompt, config, onToken);
    } else {
      response = await callOllamaWithRetry(
        fullPrompt,
        config,
        retryCount,
        maxRetries
      );
    }

    // Validate response quality
    let validation = { isValid: true, qualityScore: 1.0 };
    if (validateResponse) {
      validation = await VeraResponseValidation.validateResponseQuality(
        response,
        responseType
      );
      
      if (!validation.isValid) {
        console.warn('[VeraOllama] Response validation failed:', validation.issues);
      }
    }

    // Calculate tokens used
    const promptTokens = await VeraTokenService.countTokens(fullPrompt);
    const responseTokens = await VeraTokenService.countTokens(response);
    const duration = Date.now() - startTime;

    // Cache the response
    await VeraResponseCache.cacheResponse(
      cacheKey,
      response,
      config.cacheExpiryMinutes || 60,
      responseType,
      userId,
      validation.qualityScore
    );

    // Track usage and metrics
    if (trackMetrics) {
      await VeraTokenService.trackTokenUsage(
        userId,
        responseType,
        promptTokens,
        responseTokens,
        tenantId
      );

      await VeraLLMMonitoring.trackOllamaPerformance({
        userId,
        responseType,
        duration,
        promptTokens,
        responseTokens,
        qualityScore: validation.qualityScore,
        success: true,
        tenantId
      });
    }

    return {
      response,
      fromCache: false,
      tokensUsed: promptTokens + responseTokens,
      responseTime: duration,
      timestamp: new Date(),
      qualityScore: validation.qualityScore,
      validation: validation
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    // Try fallback to Claude API if available
    if (FALLBACK_TO_CLAUDE && retryCount >= maxRetries) {
      console.log('[VeraOllama] Attempting Claude API fallback...');
      try {
        const fallbackResponse = await callClaudeAPIFallback(
          userQuery,
          systemPrompt,
          safeContext
        );
        
        return {
          response: fallbackResponse,
          fromCache: false,
          tokensUsed: 0, // Unknown for Claude
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
          fromFallback: true
        };
      } catch (fallbackError) {
        console.error('[VeraOllama] Claude fallback also failed:', fallbackError);
      }
    }

    // Log error and track metrics
    await logOllamaError(error, { userQuery, responseType, duration });
    
    if (trackMetrics) {
      await VeraLLMMonitoring.trackOllamaPerformance({
        userId,
        responseType,
        duration,
        promptTokens: 0,
        responseTokens: 0,
        success: false,
        errorMessage: error.message,
        tenantId
      });
    }

    throw error;
  }
}

/**
 * Build full prompt from components
 * @param {string} systemPrompt - System prompt
 * @param {string} context - Context
 * @param {string} userQuery - User query
 * @returns {string} Full prompt
 */
function buildFullPrompt(systemPrompt, context, userQuery) {
  let prompt = '';
  
  if (systemPrompt) {
    prompt += `${systemPrompt}\n\n`;
  }
  
  if (context) {
    prompt += `CONTEXT:\n${context}\n\n`;
  }
  
  prompt += `USER QUESTION:\n${userQuery}\n\nVERA RESPONSE:`;
  
  return prompt;
}

/**
 * Call Ollama with streaming
 * @param {string} prompt - Full prompt
 * @param {Object} config - LLM configuration
 * @param {Function} onToken - Token callback
 * @returns {Promise<string>} Complete response
 */
async function callOllamaStreaming(prompt, config, onToken) {
  const fetch = (await import('node-fetch')).default;
  
  return new Promise((resolve, reject) => {
    const responseParts = [];

    fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: true,
        options: {
          temperature: config.temperature,
          top_p: config.top_p,
          top_k: config.top_k,
          num_predict: config.max_tokens
        }
      })
    })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Ollama streaming returned ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      function read() {
        reader.read().then(({ done, value }) => {
          if (done) {
            resolve(responseParts.join(''));
            return;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.response) {
                responseParts.push(json.response);
                // Emit token to callback for real-time UI update
                if (onToken) {
                  onToken(json.response);
                }
              }
              if (json.done) {
                resolve(responseParts.join(''));
                return;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }

          read();
        }).catch(reject);
      }

      read();
    })
    .catch(reject);
  });
}

/**
 * Call Ollama with retry logic and exponential backoff
 * @param {string} prompt - Full prompt
 * @param {Object} config - LLM configuration
 * @param {number} retryCount - Current retry count
 * @param {number} maxRetries - Maximum retries
 * @returns {Promise<string>} Response text
 */
async function callOllamaWithRetry(prompt, config, retryCount = 0, maxRetries = OLLAMA_MAX_RETRIES) {
  const fetch = (await import('node-fetch')).default;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    const response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: config.temperature,
          top_p: config.top_p,
          top_k: config.top_k,
          num_predict: config.max_tokens
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.response) {
      throw new Error('Empty response from Ollama');
    }

    return data.response;
  } catch (error) {
    if (retryCount < maxRetries) {
      const backoffMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      console.log(`[VeraOllama] Retry ${retryCount + 1}/${maxRetries} after ${backoffMs}ms`);

      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return await callOllamaWithRetry(prompt, config, retryCount + 1, maxRetries);
    }

    throw error;
  }
}

/**
 * Fallback to Claude API
 * @param {string} userQuery - User query
 * @param {string} systemPrompt - System prompt
 * @param {string} context - Context
 * @returns {Promise<string>} Response from Claude
 */
async function callClaudeAPIFallback(userQuery, systemPrompt, context) {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${context}\n\n${userQuery}`
        }
      ]
    });

    return response.content[0].text;
  } catch (error) {
    console.error('[VeraOllama] Claude API fallback failed:', error);
    throw new Error(`Claude fallback failed: ${error.message}`);
  }
}

/**
 * Log Ollama error
 * @param {Error} error - Error object
 * @param {Object} context - Error context
 * @returns {Promise<void>}
 */
async function logOllamaError(error, context = {}) {
  console.error('[VeraOllama] Error:', error.message, context);
  
  // Could also log to error log table here
  // await queryPostgres('INSERT INTO vera_error_log ...', [...]);
}

export default {
  callOllamaWithFullSupport
};

