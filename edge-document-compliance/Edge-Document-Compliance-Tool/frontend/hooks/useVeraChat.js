/**
 * React Hook for Vera Chat
 * Provides easy-to-use state management for Vera conversations
 */

import { useState } from 'react';
import { sendToVera } from '../lib/veraClient.js';

/**
 * Custom hook for Vera chat
 * @param {Record<string, any>} [initialContext={}] - Initial context for conversations
 * @returns {Object} Chat state and functions
 */
export function useVeraChat(initialContext = {}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastAnswer, setLastAnswer] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Send a message to Vera
   * @param {string} userMessage - User's message
   * @returns {Promise<Object>} Response from Vera
   */
  async function askVera(userMessage) {
    setLoading(true);
    setError(null);

    try {
      const newHistory = [
        ...messages,
        { role: 'user', content: userMessage },
      ];

      const response = await sendToVera(
        userMessage,
        messages,
        initialContext
      );

      setMessages(response.messages);
      setLastAnswer(response.answer);
      return response;
    } catch (err) {
      console.error('Vera chat error:', err);
      setError(err?.message ?? 'Vera failed to respond.');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return {
    messages,
    loading,
    lastAnswer,
    error,
    askVera,
    setMessages,
  };
}

