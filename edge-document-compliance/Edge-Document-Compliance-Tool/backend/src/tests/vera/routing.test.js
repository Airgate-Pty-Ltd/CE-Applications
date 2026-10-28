/**
 * Vera Routing Tests
 * Ensures technical questions route to VeraReasoningEngine, not greetings
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { looksLikeTechnicalQuestion, classifyIntent } from '../../services/vera/VeraIntentService.js';
import VeraReasoningEngine from '../../services/vera/VeraReasoningEngine.js';

describe('Vera Routing - Technical Questions', () => {
  
  describe('looksLikeTechnicalQuestion', () => {
    it('should detect "ok, vera, define 6 sigma" as technical', () => {
      const message = 'ok, vera, define 6 sigma';
      expect(looksLikeTechnicalQuestion(message)).toBe(true);
    });

    it('should detect "Vera, what is AS9100?" as technical', () => {
      const message = 'Vera, what is AS9100?';
      expect(looksLikeTechnicalQuestion(message)).toBe(true);
    });

    it('should detect "Vera, define CQE" as technical', () => {
      const message = 'Vera, define CQE';
      expect(looksLikeTechnicalQuestion(message)).toBe(true);
    });

    it('should detect "What is DMAIC?" as technical', () => {
      const message = 'What is DMAIC?';
      expect(looksLikeTechnicalQuestion(message)).toBe(true);
    });

    it('should NOT detect "Hello Vera" as technical', () => {
      const message = 'Hello Vera';
      expect(looksLikeTechnicalQuestion(message)).toBe(false);
    });

    it('should NOT detect "How are you?" as technical', () => {
      const message = 'How are you?';
      expect(looksLikeTechnicalQuestion(message)).toBe(false);
    });
  });

  describe('classifyIntent', () => {
    it('should classify "ok, vera, define 6 sigma" as technical_question/quality_eng', () => {
      const message = 'ok, vera, define 6 sigma';
      const result = classifyIntent(message);
      expect(result.highLevelIntent).toBe('technical_question');
      expect(result.domain).toBe('quality_eng');
    });

    it('should classify "Vera, what is AS9100?" as technical_question/regulatory', () => {
      const message = 'Vera, what is AS9100?';
      const result = classifyIntent(message);
      expect(result.highLevelIntent).toBe('technical_question');
      expect(result.domain).toBe('regulatory');
    });

    it('should classify "Hello Vera" as smalltalk', () => {
      const message = 'Hello Vera';
      const result = classifyIntent(message);
      expect(result.highLevelIntent).toBe('smalltalk');
    });
  });

  describe('VeraReasoningEngine routing', () => {
    const mockTenantId = '00000000-0000-0000-0000-000000000000';
    const mockUserId = 'test-user';

    it('should route "ok, vera, define 6 sigma" to quality reasoning', async () => {
      const message = 'ok, vera, define 6 sigma';
      const result = await VeraReasoningEngine.reason({
        tenantId: mockTenantId,
        userId: mockUserId,
        messageText: message,
        conversationContext: {},
        debugMode: false
      });

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(0);
      
      // Should NOT be a greeting
      const greetingStrings = [
        "I'm functioning optimally",
        "How is your audit world",
        "How are things on your end",
        "What compliance challenge"
      ];
      const isGreeting = greetingStrings.some(g => result.text.includes(g));
      expect(isGreeting).toBe(false);

      // Should contain Six Sigma content
      const sixSigmaKeywords = ['six sigma', 'dmaic', 'methodology', 'process', 'improvement'];
      const hasSixSigmaContent = sixSigmaKeywords.some(kw => result.text.toLowerCase().includes(kw));
      expect(hasSixSigmaContent).toBe(true);

      // Should have correct routing
      expect(result.debugTrace).toBeDefined();
      expect(result.debugTrace.selectedRoute).toBe('qualityTechnical');
      expect(result.debugTrace.intentInfo.domain).toBe('quality_eng');
    }, 30000);

    it('should route "Vera, what is AS9100?" to regulatory reasoning', async () => {
      const message = 'Vera, what is AS9100?';
      const result = await VeraReasoningEngine.reason({
        tenantId: mockTenantId,
        userId: mockUserId,
        messageText: message,
        conversationContext: {},
        debugMode: false
      });

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(0);
      
      // Should NOT be a greeting
      const greetingStrings = [
        "I'm functioning optimally",
        "How is your audit world"
      ];
      const isGreeting = greetingStrings.some(g => result.text.includes(g));
      expect(isGreeting).toBe(false);

      // Should have correct routing
      expect(result.debugTrace).toBeDefined();
      expect(result.debugTrace.selectedRoute).toBe('regulatoryTechnical');
      expect(result.debugTrace.intentInfo.domain).toBe('regulatory');
    }, 30000);
  });
});

