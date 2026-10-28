/**
 * Vera Chat Engine Tests
 * Tests for the new GPT-like conversational auditor engine
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { getVeraChatEngine } from '../vera/veraChatEngine.js';
import { classifyIntent } from '../vera/intentClassifier.js';
import { fetchSemanticContext } from '../vera/semanticFetcher.js';
import { composeFinalResponse } from '../vera/finalComposer.js';

describe('Vera Chat Engine', () => {
  let engine: any;

  beforeEach(() => {
    engine = getVeraChatEngine();
  });

  describe('Intent Classification', () => {
    it('should classify greeting intent', async () => {
      const result = await classifyIntent('Hello, Vera!');
      expect(result.intent).toBe('greeting');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should classify clause lookup intent', async () => {
      const result = await classifyIntent('What does clause 8.7 of AS9100 say?');
      expect(result.intent).toBe('clause_lookup');
      expect(result.extractedData?.clauseNumber).toBe('8.7');
    });

    it('should classify analysis intent', async () => {
      const result = await classifyIntent('Can you perform a gap analysis?');
      expect(result.intent).toBe('analysis');
    });

    it('should classify question intent', async () => {
      const result = await classifyIntent('What is a CAPA?');
      expect(result.intent).toBe('question');
    });
  });

  describe('Semantic Fetcher', () => {
    it('should fetch semantic context for a query', async () => {
      const context = await fetchSemanticContext('What is clause 8.7 about?', {
        maxRequirements: 3
      });

      expect(context).toHaveProperty('requirements');
      expect(context).toHaveProperty('concepts');
      expect(context).toHaveProperty('standardProfiles');
      expect(Array.isArray(context.requirements)).toBe(true);
    });
  });

  describe('Final Composer', () => {
    it('should remove capability lists', () => {
      const gptResponse = `I can help you with:
• Document analysis
• Gap identification
• Compliance checking

Here's the answer to your question...`;
      
      const composed = composeFinalResponse(gptResponse, {
        removeCapabilityLists: true
      });

      expect(composed).not.toContain('I can help you with:');
      expect(composed).toContain('Here\'s the answer');
    });

    it('should ensure direct answer comes first', () => {
      const gptResponse = `Let me help you with that. I can assist with various tasks. The answer is: Clause 8.7 deals with control of nonconforming outputs.`;
      
      const composed = composeFinalResponse(gptResponse, {
        ensureDirectAnswer: true
      });

      // Answer should be prominent
      expect(composed.toLowerCase()).toContain('clause 8.7');
    });

    it('should remove emojis and marketing language', () => {
      const gptResponse = `🎉 Revolutionary compliance solution! 🚀 Unlock the power of our cutting-edge tool!`;
      
      const composed = composeFinalResponse(gptResponse);

      expect(composed).not.toContain('🎉');
      expect(composed).not.toContain('revolutionary');
      expect(composed).not.toContain('cutting-edge');
    });
  });

  describe('Chat Engine Integration', () => {
    it('should handle a simple question', async () => {
      // Vera no longer requires OpenAI - tests should always run
      // OpenAI dependencies have been removed

      const response = await engine.chat({
        message: 'What is a gap analysis?',
        userId: 'test-user',
        tenantId: '00000000-0000-0000-0000-000000000000',
        context: {
          standards: [],
          documents: []
        }
      });

      expect(response).toHaveProperty('response');
      expect(response).toHaveProperty('intent');
      expect(typeof response.response).toBe('string');
      expect(response.response.length).toBeGreaterThan(0);
    });

    it('should handle clause lookup', async () => {
      // Vera no longer requires OpenAI - tests should always run
      // OpenAI dependencies have been removed

      const response = await engine.chat({
        message: 'What does clause 8.7 of AS9100 say?',
        userId: 'test-user',
        tenantId: '00000000-0000-0000-0000-000000000000',
        context: {
          standards: [{ id: 'test-id', code: 'AS9100D', name: 'AS9100D' }],
          documents: []
        }
      });

      expect(response.intent).toBe('clause_lookup');
      expect(response.response.length).toBeGreaterThan(0);
    });
  });
});

