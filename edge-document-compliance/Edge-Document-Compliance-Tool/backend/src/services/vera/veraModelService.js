/**
 * Vera Model Service
 * 
 * ⚠️ DEPRECATED: This module is not used in production for Vera.
 * Vera now uses VeraCoreEngine (internal reasoning) instead.
 * 
 * This module is kept for backward compatibility but will throw an error
 * unless ALLOW_EXTERNAL_LLM=true is set (testing only).
 */

import { assertExternalLLMsDisabled } from './ExternalLLMGuard.js';

/**
 * Call Vera model endpoint with messages
 * @param {Array} messages - Array of {role, content} messages
 * @param {Object} context - Additional context (userId, tenantId, etc.)
 * @returns {Promise<{answer: string, messages?: Array, meta?: Object}>}
 */
export async function callVeraModel(messages, context = {}) {
  // Hard-disable external LLM usage for Vera
  assertExternalLLMsDisabled();
  
  const endpoint = process.env.VERA_MODEL_ENDPOINT;
  
  if (!endpoint) {
    throw new Error('VERA_MODEL_ENDPOINT environment variable is not set. Vera cannot call the model service.');
  }

  const payload = {
    messages,
    context,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(context.tenantId ? { 'x-tenant-id': String(context.tenantId) } : {}),
      ...(context.userId ? { 'x-user-id': String(context.userId) } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Vera model service error: ${response.status} ${response.statusText} ${text}`
    );
  }

  const data = await response.json();

  if (!data.answer || typeof data.answer !== 'string') {
    throw new Error('Vera model service returned an invalid response: "answer" is missing or not a string.');
  }

  return {
    answer: data.answer,
    messages: data.messages,
    meta: data.meta ?? {},
  };
}

/**
 * Check if Vera model service is available
 */
export function isVeraModelAvailable() {
  return !!process.env.VERA_MODEL_ENDPOINT;
}

