/**
 * LLM Provider - Direct Integration
 * 
 * ⚠️ DEPRECATED: This module is not used in production for Vera.
 * Vera now uses VeraCoreEngine (internal reasoning) instead.
 * 
 * This module is kept for backward compatibility but will throw an error
 * unless ALLOW_EXTERNAL_LLM=true is set (testing only).
 */

import fetch from 'node-fetch';
import { assertExternalLLMsDisabled } from '../services/vera/ExternalLLMGuard.js';

/**
 * Get the configured LLM provider
 */
function getLLMProvider() {
  return process.env.LLM_PROVIDER || 'openai';
}

/**
 * Call OpenAI directly
 */
async function callOpenAI(messages, context = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set. Please configure OpenAI API key.');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: context.temperature || 0.7,
      max_tokens: context.max_tokens || 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content || '';
  
  if (!answer) {
    throw new Error('OpenAI API returned empty response');
  }

  return {
    answer,
    messages: data.choices?.[0]?.message ? [data.choices[0].message] : [],
    meta: {
      model: data.model,
      usage: data.usage,
      finish_reason: data.choices?.[0]?.finish_reason,
    },
  };
}

/**
 * Call Anthropic Claude directly
 */
async function callAnthropic(messages, context = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set. Please configure Anthropic API key.');
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
  const endpoint = 'https://api.anthropic.com/v1/messages';

  // Convert messages format for Anthropic (system message is separate)
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const conversationMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: systemMessage,
      messages: conversationMessages,
      max_tokens: context.max_tokens || 2000,
      temperature: context.temperature || 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const answer = data.content?.[0]?.text || '';
  
  if (!answer) {
    throw new Error('Anthropic API returned empty response');
  }

  return {
    answer,
    messages: [{ role: 'assistant', content: answer }],
    meta: {
      model: data.model,
      usage: data.usage,
      stop_reason: data.stop_reason,
    },
  };
}

/**
 * Main LLM call function - routes to appropriate provider
 * 
 * ⚠️ Hard-disabled for Vera production use
 */
export async function callLLM(messages, context = {}) {
  // Hard-disable external LLM usage for Vera
  assertExternalLLMsDisabled();
  
  // This code path should not be reached in production
  const provider = getLLMProvider().toLowerCase();

  switch (provider) {
    case 'openai':
      return await callOpenAI(messages, context);
    case 'anthropic':
    case 'claude':
      return await callAnthropic(messages, context);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}. Supported providers: openai, anthropic`);
  }
}

/**
 * Check if LLM is configured
 */
export function isLLMConfigured() {
  const provider = getLLMProvider().toLowerCase();
  
  switch (provider) {
    case 'openai':
      return !!process.env.OPENAI_API_KEY;
    case 'anthropic':
    case 'claude':
      return !!process.env.ANTHROPIC_API_KEY;
    default:
      return false;
  }
}

/**
 * Get configuration status message
 */
export function getLLMConfigStatus() {
  const provider = getLLMProvider().toLowerCase();
  
  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY 
      ? 'OpenAI configured' 
      : 'OPENAI_API_KEY not set';
  }
  
  if (provider === 'anthropic' || provider === 'claude') {
    return process.env.ANTHROPIC_API_KEY 
      ? 'Anthropic configured' 
      : 'ANTHROPIC_API_KEY not set';
  }
  
  return `Unknown provider: ${provider}`;
}

