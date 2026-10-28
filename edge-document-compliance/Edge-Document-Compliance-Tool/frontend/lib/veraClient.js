/**
 * Vera Client
 * Provider-agnostic client for communicating with Vera chat API
 * Replaces any direct OpenAI calls from the frontend
 */

export const VeraClientRole = {
  SYSTEM: 'system',
  USER: 'user',
  ASSISTANT: 'assistant'
};

/**
 * @typedef {Object} VeraClientMessage
 * @property {'system'|'user'|'assistant'} role
 * @property {string} content
 */

/**
 * @typedef {Object} VeraChatMeta
 * @property {*} [key: string]
 */

/**
 * @typedef {Object} VeraChatResponse
 * @property {string} answer
 * @property {VeraClientMessage[]} messages
 * @property {VeraChatMeta} [meta]
 */

/**
 * Send a message to Vera chat API
 * @param {string} message - User message
 * @param {VeraClientMessage[]} [history=[]] - Conversation history
 * @param {Record<string, any>} [context={}] - Additional context
 * @returns {Promise<VeraChatResponse>}
 */
export async function sendToVera(message, history = [], context = {}) {
  const res = await fetch('/api/vera/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, history, context }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Vera chat API error: ${res.status} ${res.statusText} ${text}`);
  }

  const data = await res.json();

  if (!data.answer || typeof data.answer !== 'string') {
    throw new Error('Vera chat API returned an invalid response: "answer" is missing or not a string.');
  }

  return {
    answer: data.answer,
    messages: data.messages || [],
    meta: data.meta || {},
  };
}

