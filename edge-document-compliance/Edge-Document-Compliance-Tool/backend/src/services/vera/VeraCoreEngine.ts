/**
 * Vera Core Engine - Self-Contained Internal Reasoning
 * 
 * Vera is her own LLM. All reasoning and text generation uses:
 * - EDCAT AI database (edcat.* tables)
 * - Customer DB (public.* tables)
 * - Internal routing, templates, and logic
 * 
 * NO external AI providers (OpenAI, Anthropic, etc.)
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';
import { v4 as uuidv4 } from 'uuid';
import {
  getLearningDocsByStandardCode,
  searchLearningDocsByTopic,
  semanticSearchLearningDocs,
  getApprovedExamplesForStandard,
  getBadExamplesForStandard,
  findClauseInLearningDocs,
  getStandardInfo,
  type LearningDoc,
  type ExampleDoc
} from './VeraLearningRepository.js';
import { VeraClauseMatcher } from './VeraClauseMatcher.js';
import {
  VeraKnowledgeGapService,
  type KnowledgeGapRequest
} from './VeraKnowledgeGapService.js';
import { VeraCacheService, CacheKeys } from './VeraCacheService.js';
import { VeraMemoryService } from './VeraMemoryService.js';
import { VeraIntentLearner } from './VeraIntentLearner.js';
import { VeraCorrectionProcessor } from './VeraCorrectionProcessor.js';
import { VeraConversationContextBuilder } from './VeraConversationContextBuilder.js';
import { VeraGapHintService } from './VeraGapHintService.js';
import { VeraKnowledgeGraph } from './VeraKnowledgeGraph.js';
import { VeraTemplateGenerator } from './VeraTemplateGenerator.js';
import { VeraCrossStandardReasoning } from './VeraCrossStandardReasoning.js';
import { VeraRegulatoryRepository } from './VeraRegulatoryRepository.js';
import veraTerminologyService from './VeraTerminologyService.js';
import VeraQueryResponseService from './VeraQueryResponseService.js';
import { veraEngineHealth, type VeraIssue } from './VeraEngineHealthService.js';
import { VeraAdvancedReasoningOrchestrator } from './VeraAdvancedReasoningOrchestrator.js';
import { VeraInteractiveClarificationEngine } from './VeraInteractiveClarificationEngine.js';
import { VeraConversationLearner } from './VeraConversationLearner.js';

// ============================================================================
// Interfaces
// ============================================================================

export interface VeraRequest {
  message: string;
  sessionId?: string;
  userId?: string;
  tenantId?: string;
  debugMode?: boolean;
}

export interface VeraResponse {
  answer: string;
  mode: 'normal' | 'fallback' | 'error';
  intent?: string;
  topic?: string;
  subIntent?: string;
  metadata?: {
    templateUsed?: string;
    clausesReferenced?: string[];
    standardsReferenced?: string[];
    confidence?: number;
    [key: string]: any;
  };
}

interface IntentAndTopic {
  intent: string;
  topic?: string;
  subIntent?: string;
  confidence: number;
}

export interface SemanticContext {
  standards: Array<{
    code: string;
    revision: string;
    title: string;
  }>;
  clauses: Array<{
    standardCode: string;
    clauseId: string;
    label: string;
    requirementText?: string;
  }>;
  customerDocuments: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  gapAnalyses: Array<{
    id: string;
    standardCode: string;
    status: string;
  }>;
  conversationState?: {
    lastIntent?: string;
    lastTopic?: string;
    context?: any;
  };
  // Ingested document content from Requirements folder (legacy - use learningDocs instead)
  documentContent: Array<{
    contentText: string;
    standardCode: string;
    quality?: string;
    metadata?: any;
    wordCount?: number;
  }>;
  // Approved/bad examples for learning (legacy - use approvedExamples/badExamples instead)
  examples: Array<{
    fileName: string;
    contentText: string;
    qualityScore: number;
    standardCode: string;
  }>;
  // New learning content from VeraLearningRepository
  learningDocs?: LearningDoc[];
  approvedExamples?: ExampleDoc[];
  badExamples?: ExampleDoc[];
  detectedStandardCode?: string;
  termsAndDefinitions?: Array<{
    term: string;
    acronym?: string;
    definition: string;
    source_standard?: string;
    category?: string;
  }>;
}

interface AnswerTemplate {
  name: string;
  kind: string;
  template: {
    pattern: string;
    variables: string[];
  };
}

// ============================================================================
// Main Engine
// ============================================================================

export class VeraCoreEngine {
  /**
   * Generate Vera response using internal reasoning pipeline
   */
  static async generateVeraResponse(req: VeraRequest): Promise<VeraResponse> {
    const { message, sessionId, userId, tenantId, debugMode = false } = req;
    
    if (!message || !message.trim()) {
      return {
        answer: 'Please provide a question or instruction.',
        mode: 'error',
        metadata: { reason: 'empty_message' }
      };
    }

    const effectiveTenantId = tenantId || '00000000-0000-0000-0000-000000000000';
    const effectiveSessionId = sessionId || uuidv4();
    const effectiveUserId = userId || 'system';

    try {
      // Pipeline Step 1: Detect Intent and Topic
      const intentResult = await this.detectIntentAndTopic({
        message,
        tenantId: effectiveTenantId,
        sessionId: effectiveSessionId
      });

      if (debugMode) {
        console.log('[VeraCoreEngine] Intent detected:', intentResult);
      }

      // Pipeline Step 1.1: Handle self-diagnostic intents FIRST (before fast paths)
      // These need immediate handling and shouldn't go through terminology/Q&A lookups
      if (intentResult.intent === 'self_diagnostic') {
        const diagnosticResponse = await this.handleSelfDiagnostic(message, effectiveUserId);
        
        // Record conversation turn
        await this.recordConversationTurn({
          tenantId: effectiveTenantId,
          sessionId: effectiveSessionId,
          userId: effectiveUserId,
          message,
          response: diagnosticResponse,
          intent: intentResult.intent,
          topic: intentResult.topic,
          subIntent: intentResult.subIntent,
          mode: 'normal',
          metadata: { type: 'self_diagnostic' }
        });

        return {
          answer: diagnosticResponse,
          mode: 'normal',
          intent: intentResult.intent,
          topic: intentResult.topic,
          metadata: {
            type: 'self_diagnostic',
            confidence: 0.99
          }
        };
      }

      if (intentResult.intent === 'self_triage') {
        const triageResponse = await this.handleSelfTriage(effectiveUserId);
        
        // Record conversation turn
        await this.recordConversationTurn({
          tenantId: effectiveTenantId,
          sessionId: effectiveSessionId,
          userId: effectiveUserId,
          message,
          response: triageResponse,
          intent: intentResult.intent,
          topic: intentResult.topic,
          subIntent: intentResult.subIntent,
          mode: 'normal',
          metadata: { type: 'self_triage' }
        });

        return {
          answer: triageResponse,
          mode: 'normal',
          intent: intentResult.intent,
          topic: intentResult.topic,
          metadata: {
            type: 'self_triage',
            confidence: 0.99
          }
        };
      }

      if (intentResult.intent === 'self_debug_history') {
        const debugHistoryResponse = await this.handleSelfDebugHistory(message);
        
        // Record conversation turn
        await this.recordConversationTurn({
          tenantId: effectiveTenantId,
          sessionId: effectiveSessionId,
          userId: effectiveUserId,
          message,
          response: debugHistoryResponse,
          intent: intentResult.intent,
          topic: intentResult.topic,
          subIntent: intentResult.subIntent,
          mode: 'normal',
          metadata: { type: 'self_debug_history' }
        });

        return {
          answer: debugHistoryResponse,
          mode: 'normal',
          intent: intentResult.intent,
          topic: intentResult.topic,
          metadata: {
            type: 'self_debug_history',
            confidence: 0.99
          }
        };
      }

      if (intentResult.intent === 'self_remedy') {
        const remedyResponse = await this.handleSelfRemedy(message, effectiveUserId);
        
        // Record conversation turn
        await this.recordConversationTurn({
          tenantId: effectiveTenantId,
          sessionId: effectiveSessionId,
          userId: effectiveUserId,
          message,
          response: remedyResponse,
          intent: intentResult.intent,
          topic: intentResult.topic,
          subIntent: intentResult.subIntent,
          mode: 'normal',
          metadata: { type: 'self_remedy' }
        });

        return {
          answer: remedyResponse,
          mode: 'normal',
          intent: intentResult.intent,
          topic: intentResult.topic,
          metadata: {
            type: 'self_remedy',
            confidence: 0.99
          }
        };
      }

      if (intentResult.intent === 'self_test') {
        const testResponse = await this.handleSelfTest(effectiveUserId);
        
        // Record conversation turn
        await this.recordConversationTurn({
          tenantId: effectiveTenantId,
          sessionId: effectiveSessionId,
          userId: effectiveUserId,
          message,
          response: testResponse,
          intent: intentResult.intent,
          topic: intentResult.topic,
          subIntent: intentResult.subIntent,
          mode: 'normal',
          metadata: { type: 'self_test' }
        });

        return {
          answer: testResponse,
          mode: 'normal',
          intent: intentResult.intent,
          topic: intentResult.topic,
          metadata: {
            type: 'self_test',
            confidence: 0.99
          }
        };
      }

      if (intentResult.intent === 'remedy_application') {
        const remedyApplicationResponse = await this.handleRemedyApplication(message, effectiveUserId);
        
        // Record conversation turn
        await this.recordConversationTurn({
          tenantId: effectiveTenantId,
          sessionId: effectiveSessionId,
          userId: effectiveUserId,
          message,
          response: remedyApplicationResponse,
          intent: intentResult.intent,
          topic: intentResult.topic,
          subIntent: intentResult.subIntent,
          mode: 'normal',
          metadata: { type: 'remedy_application' }
        });

        return {
          answer: remedyApplicationResponse,
          mode: 'normal',
          intent: intentResult.intent,
          topic: intentResult.topic,
          metadata: {
            type: 'remedy_application',
            confidence: 0.95
          }
        };
      }

      if (intentResult.intent === 'remedy_effectiveness') {
        const effectivenessResponse = await this.handleRemedyEffectiveness(message);
        
        // Record conversation turn
        await this.recordConversationTurn({
          tenantId: effectiveTenantId,
          sessionId: effectiveSessionId,
          userId: effectiveUserId,
          message,
          response: effectivenessResponse,
          intent: intentResult.intent,
          topic: intentResult.topic,
          subIntent: intentResult.subIntent,
          mode: 'normal',
          metadata: { type: 'remedy_effectiveness' }
        });

        return {
          answer: effectivenessResponse,
          mode: 'normal',
          intent: intentResult.intent,
          topic: intentResult.topic,
          metadata: {
            type: 'remedy_effectiveness',
            confidence: 0.99
          }
        };
      }

      /**
       * FAST PATH 1.25: Check for term definitions
       * This runs BEFORE expensive context building
       */
      console.log('[VeraCoreEngine] FAST PATH 1.25: Checking terminology...');

      try {
        // Ensure terminology service is initialized
        if (!veraTerminologyService.loaded) {
          await veraTerminologyService.initialize().catch(() => {});
        }

        // Extract potential terms from message (words that might be acronyms or terms)
        const words = message.split(/\s+/).map(w => w.replace(/[.,!?;:()\[\]{}'"]/g, ''));
        const potentialTerms = words.filter(w => 
          w.length >= 2 && (w.length <= 10 || /^[A-Z]{2,10}$/.test(w))
        );

        // Check each potential term
        for (const term of potentialTerms.slice(0, 5)) { // Limit to 5 terms
          const termDef = veraTerminologyService.lookupTerm(term, {
            industry: this.extractStandardCode(message)?.includes('IATF') ? 'automotive' : 
                     this.extractStandardCode(message)?.includes('AS') ? 'aerospace' : undefined,
            standardCode: this.extractStandardCode(message) || undefined
          });

          if (termDef && (termDef.confidence || 0.7) >= 0.70) {
            console.log(`[VeraCoreEngine] ✅ Term found: ${termDef.term} (confidence: ${termDef.confidence || 0.7})`);
            
            const answer = this.formatTermDefinition(termDef);

            // Record conversation turn
            await this.recordConversationTurn({
              tenantId: effectiveTenantId,
              sessionId: effectiveSessionId,
              userId: effectiveUserId,
              message,
              response: answer,
              intent: 'term_definition',
              topic: termDef.term,
              subIntent: undefined,
              mode: 'normal',
              metadata: {
                source: 'terminology_database',
                term: termDef.term,
                confidence: Math.min(0.99, (termDef.confidence || 0.7) + 0.05)
              }
            });

            return {
              answer,
              mode: 'normal',
              intent: 'term_definition',
              topic: termDef.term,
              metadata: {
                source: 'terminology_database',
                term: termDef.term,
                confidence: Math.min(0.99, (termDef.confidence || 0.7) + 0.05)
              }
            };
          }
        }
      } catch (termError: any) {
        // Non-fatal - continue with normal flow
        console.warn('[VeraCoreEngine] Terminology lookup error (non-fatal):', termError.message);
      }

      /**
       * FAST PATH 1.3: Check Q&A Response Bank
       * This runs BEFORE expensive context building
       * SKIP if this is a diagnostic question (should have been caught earlier, but safety check)
       */
      const lowerMessage = message.toLowerCase();
      const isDiagnosticQuestion = this.isSelfDiagnosticQuestion(lowerMessage) ||
                                   lowerMessage.includes('0331') && (lowerMessage.includes('diagnose') || lowerMessage.includes('debug'));
      
      if (isDiagnosticQuestion) {
        console.log('[VeraCoreEngine] ⚠️  Skipping Q&A fast path - diagnostic question detected');
        // Diagnostic questions should have been handled earlier, but if we reach here,
        // force self-diagnostic handling
        const diagnosticResponse = await this.handleSelfDiagnostic(message, effectiveUserId);
        await this.recordConversationTurn({
          tenantId: effectiveTenantId,
          sessionId: effectiveSessionId,
          userId: effectiveUserId,
          message,
          response: diagnosticResponse,
          intent: 'self_diagnostic',
          topic: 'health_status',
          subIntent: undefined,
          mode: 'normal',
          metadata: { type: 'self_diagnostic', forced: true }
        });
        return {
          answer: diagnosticResponse,
          mode: 'normal',
          intent: 'self_diagnostic',
          topic: 'health_status',
          metadata: { type: 'self_diagnostic', confidence: 0.99, forced: true }
        };
      }

      console.log('[VeraCoreEngine] FAST PATH 1.3: Checking Q&A response bank...');

      try {
        const qaMatch = await VeraQueryResponseService.findBestMatch({
          tenantId: effectiveTenantId,
          personaCode: 'vera',
          message,
          intent: intentResult.intent
        });

        if (qaMatch && (qaMatch.confidence_score || 0) >= 0.75) {
          console.log(`[VeraCoreEngine] ✅ Q&A match found (confidence: ${qaMatch.confidence_score || 0})`);
          
          // Build minimal context for template variable filling
          const minimalContext: SemanticContext = {
            standards: [],
            clauses: [],
            customerDocuments: [],
            gapAnalyses: [],
            learningDocs: [],
            approvedExamples: [],
            badExamples: [],
            documentContent: [],
            examples: []
          };
          
          const answer = this.formatQnAResponse(qaMatch, message, intentResult.topic, minimalContext);

          // Record conversation turn
          await this.recordConversationTurn({
            tenantId: effectiveTenantId,
            sessionId: effectiveSessionId,
            userId: effectiveUserId,
            message,
            response: answer,
            intent: intentResult.intent,
            topic: intentResult.topic,
            subIntent: intentResult.subIntent,
            mode: 'normal',
            metadata: {
              source: 'vera_query_response_bank',
              qaId: qaMatch.id,
              confidence: qaMatch.confidence_score || 0.5
            }
          });

          return {
            answer,
            mode: 'normal',
            intent: intentResult.intent,
            topic: intentResult.topic,
            metadata: {
              source: 'vera_query_response_bank',
              qaId: qaMatch.id,
              confidence: qaMatch.confidence_score || 0.5
            }
          };
        }
      } catch (qaError: any) {
        // Non-fatal - continue with normal flow
        console.warn('[VeraCoreEngine] Q&A lookup error (non-fatal):', qaError.message);
      }

      /**
       * If we reach here, no fast path matched
       * Continue with STEP 2: Build semantic context
       */
      console.log('[VeraCoreEngine] No fast path match, proceeding to context building...');

      // Pipeline Step 1.4: Check for ambiguity and request clarification if needed
      const clarificationEngine = new VeraInteractiveClarificationEngine();
      const clarification = await clarificationEngine.detectAmbiguityAndClarify(message, {
        standards: [],
        clauses: [],
        customerDocuments: [],
        gapAnalyses: []
      });

      if (clarification.needsClarification && clarification.clarificationQuestions) {
        console.log('[VeraCoreEngine] ⚠️  Ambiguity detected, requesting clarification');
        const clarificationResponse = `I want to make sure I understand your question correctly. Can you help me clarify?\n\n${clarification.clarificationQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n\n')}`;
        
        await this.recordConversationTurn({
          tenantId: effectiveTenantId,
          sessionId: effectiveSessionId,
          userId: effectiveUserId,
          message,
          response: clarificationResponse,
          intent: intentResult.intent,
          topic: intentResult.topic,
          subIntent: intentResult.subIntent,
          mode: 'normal',
          metadata: { type: 'clarification_needed', ambiguities: clarification.ambiguities }
        });

        return {
          answer: clarificationResponse,
          mode: 'normal',
          intent: intentResult.intent,
          topic: intentResult.topic,
          metadata: {
            type: 'clarification_needed',
            clarificationQuestions: clarification.clarificationQuestions,
            ambiguities: clarification.ambiguities
          }
        };
      }

      // Pipeline Step 1.5: Get conversation context and learned memories (non-blocking)
      const memoryPromises = Promise.all([
        VeraMemoryService.getConversationContext({
          tenantId: effectiveTenantId,
          sessionId: effectiveSessionId,
          userId: effectiveUserId,
          messageLimit: 10
        }).catch(() => null),
        // Search for facts related to the topic
        intentResult.topic 
          ? VeraMemoryService.searchMemories({
              tenantId: effectiveTenantId,
              query: intentResult.topic,
              category: 'fact',
              limit: 3
            }).catch(() => [])
          : Promise.resolve([]),
        // Get standard-specific knowledge
        this.extractStandardCode(message)
          ? VeraMemoryService.retrieveMemory({
              tenantId: effectiveTenantId,
              standardCode: this.extractStandardCode(message) || undefined,
              category: 'standard_knowledge',
              limit: 3
            }).catch(() => [])
          : Promise.resolve([])
      ]);

      // Pipeline Step 2: Build Semantic Context (don't wait for memories - they're optional)
      const context = await this.buildSemanticContext({
        message,
        intent: intentResult.intent,
        topic: intentResult.topic,
        tenantId: effectiveTenantId,
        sessionId: effectiveSessionId
      });

      // Attach memories to context if available (non-blocking)
      memoryPromises.then(([conversationContext, relevantMemories]) => {
        if (conversationContext || relevantMemories.length > 0) {
          // Store in cache for next time
          console.log('[VeraCoreEngine] Retrieved memories:', {
            contextMessages: conversationContext?.recentMessages.length || 0,
            relevantFacts: relevantMemories.length
          });
        }
      }).catch(() => {}); // Non-fatal

      if (debugMode) {
        console.log('[VeraCoreEngine] Context built:', {
          standards: context.standards.length,
          clauses: context.clauses.length,
          documents: context.customerDocuments.length,
          learningDocs: context.learningDocs?.length || 0,
          approvedExamples: context.approvedExamples?.length || 0
        });
      }

      // Pipeline Step 2.5: Check for Knowledge Gaps
      const detectedStandardCode = this.extractStandardCode(message) || intentResult.topic || context.detectedStandardCode;
      const clauseRef = intentResult.topic && /^[0-9]+\.[0-9]/.test(intentResult.topic) ? intentResult.topic : undefined;
      
      const knowledgeGap = await VeraKnowledgeGapService.detectKnowledgeGap({
        tenantId: effectiveTenantId,
        sessionId: effectiveSessionId,
        intent: intentResult.intent,
        topic: intentResult.topic,
        standardCode: detectedStandardCode || null,
        clauseRef: clauseRef || null,
        semanticContext: {
          standards: context.standards?.map(s => ({ code: s.code, name: s.title || s.code })),
          learningDocs: context.learningDocs?.map(d => ({ 
            standardCode: d.standard_code || '', 
            contentText: d.content_text || '' 
          })),
          approvedExamples: context.approvedExamples?.map(e => ({ 
            standardCode: e.standard_code || '', 
            fileName: e.file_name || '' 
          })),
          badExamples: context.badExamples?.map(e => ({ 
            standardCode: e.standard_code || '', 
            fileName: e.file_name || '' 
          })),
          clauses: context.clauses?.map(c => ({ 
            standardCode: c.standardCode || '', 
            clauseId: c.clauseId || '' 
          })),
          detectedStandardCode: context.detectedStandardCode
        }
      });

      // If knowledge gap detected, return gap response instead of normal answer
      if (knowledgeGap) {
        const gapResponse = VeraCoreEngine.buildKnowledgeGapResponse(knowledgeGap, intentResult.intent, intentResult.topic);
        
        // Still record the conversation turn
        await this.recordConversationTurn({
          tenantId: effectiveTenantId,
          sessionId: effectiveSessionId,
          userId: effectiveUserId,
          message,
          response: gapResponse.answer,
          intent: intentResult.intent,
          topic: intentResult.topic,
          subIntent: intentResult.subIntent,
          mode: 'fallback',
          metadata: {
            knowledgeGapRequestId: knowledgeGap.requestId,
            reason: 'knowledge_gap_detected'
          }
        });

        return gapResponse;
      }

      // Pipeline Step 2.7: Check for corrections that might influence this answer
      const relevantCorrections = await VeraCorrectionProcessor.getCorrectionsForQuestion({
        tenantId: effectiveTenantId,
        question: message,
        limit: 2
      }).catch(() => []);

      // If we have corrections, adjust context or add notes
      if (relevantCorrections.length > 0 && relevantCorrections[0].confidence > 0.8) {
        // High-confidence correction found - we'll use it in answer generation
        if (debugMode) {
          console.log('[VeraCoreEngine] Found relevant correction:', relevantCorrections[0].correctedAnswer.substring(0, 50));
        }
      }

      // Pipeline Step 2.9: Handle cross-standard comparison intent
      if (intentResult.intent === 'cross_standard_comparison') {
        const comparison = await this.handleCrossStandardComparison(message, intentResult.topic, effectiveTenantId);
        if (comparison) {
          // Record conversation turn
          await this.recordConversationTurn({
            tenantId: effectiveTenantId,
            sessionId: effectiveSessionId,
            userId: effectiveUserId,
            message,
            response: comparison,
            intent: intentResult.intent,
            topic: intentResult.topic,
            subIntent: intentResult.subIntent,
            mode: 'normal',
            metadata: { type: 'cross_standard_comparison' }
          });

          return {
            answer: comparison,
            mode: 'normal',
            intent: intentResult.intent,
            topic: intentResult.topic,
            metadata: {
              type: 'cross_standard_comparison',
              confidence: 0.8
            }
          };
        }
      }

      // Pipeline Step 3: Select Answer Template
      const template = await this.selectAnswerTemplate({
        intent: intentResult.intent,
        topic: intentResult.topic,
        context,
        tenantId: effectiveTenantId
      });

      if (debugMode) {
        console.log('[VeraCoreEngine] Template selected:', template?.name);
      }

      // Pipeline Step 4: Fill Template
      const filledResponse = await this.fillTemplate({
        template,
        context,
        message,
        intent: intentResult.intent,
        topic: intentResult.topic,
        corrections: relevantCorrections // Pass corrections to template filling
      });

      // Pipeline Step 4.5: Apply corrections if available (ITERATION 4: Active Learning)
      let finalAnswer = filledResponse.answer;
      if (relevantCorrections.length > 0 && relevantCorrections[0].confidence > 0.8) {
        const bestCorrection = relevantCorrections[0];
        // If correction is highly relevant, incorporate it into the answer
        if (bestCorrection.correctedAnswer && bestCorrection.correctedAnswer.length > 20) {
          // Prepend a note that we're using a corrected answer, or replace if very similar
          const similarity = this.calculateTextSimilarity(message.toLowerCase(), bestCorrection.originalQuestion.toLowerCase());
          if (similarity > 0.85) {
            // Very similar question - use corrected answer directly
            finalAnswer = bestCorrection.correctedAnswer;
            if (debugMode) {
              console.log('[VeraCoreEngine] Using corrected answer for similar question');
            }
          } else {
            // Similar but not exact - incorporate correction into answer
            finalAnswer = `${filledResponse.answer}\n\n*Note: Based on previous feedback, ${bestCorrection.correctedAnswer.substring(0, 200)}*`;
          }
        }
      }

      // Pipeline Step 4.6: Apply conversation learning (few-shot learning)
      const conversationLearner = new VeraConversationLearner(effectiveSessionId);
      finalAnswer = await conversationLearner.applyLearnedPatterns(message, finalAnswer, intentResult.intent);
      
      // Record example for future learning
      await conversationLearner.recordExample(intentResult.intent, message, finalAnswer);

      // Pipeline Step 4.7: Use Advanced Reasoning Orchestrator for complex questions
      // Only use for complex questions (long queries, multiple clauses, gap analysis, etc.)
      const isComplexQuestion = message.length > 100 || 
                                intentResult.intent === 'gap_analysis_request' ||
                                intentResult.intent === 'compliance_question' ||
                                message.toLowerCase().includes('analyze') ||
                                message.toLowerCase().includes('compare');
      
      let reasoningSteps: any[] = [];
      // Calculate confidence from metadata or use default
      const baseConfidence = filledResponse.metadata?.confidence || 
                            this.calculateConfidence(context, template, intentResult.intent, intentResult.topic);
      let reasoningConfidence = baseConfidence;
      
      if (isComplexQuestion) {
        console.log('[VeraCoreEngine] Using Advanced Reasoning Orchestrator for complex question');
        try {
          const reasoningOrchestrator = new VeraAdvancedReasoningOrchestrator();
          const reasoningChain = await reasoningOrchestrator.executeReasoningChain(message, context);
          
          // Use reasoning chain answer if it's better than template answer
          if (reasoningChain.confidence > reasoningConfidence) {
            finalAnswer = reasoningChain.finalAnswer;
            reasoningConfidence = reasoningChain.confidence;
            reasoningSteps = reasoningChain.reasoningSteps;
          } else {
            // Append reasoning steps to answer for transparency
            reasoningSteps = reasoningChain.reasoningSteps;
          }
        } catch (reasoningError: any) {
          console.warn('[VeraCoreEngine] Reasoning orchestrator error (non-fatal):', reasoningError.message);
          // Continue with template answer
        }
      }

      // Pipeline Step 4.8: Meta-Reasoning - Confidence Analysis and Verification Recommendations
      const confidenceAnalysis = {
        overallConfidence: reasoningConfidence,
        confidenceBreakdown: {
          source_availability: context.standards.length > 0 ? 0.9 : 0.5,
          answer_completeness: finalAnswer.length > 200 ? 0.8 : 0.6,
          user_context_clarity: message.length > 20 ? 0.7 : 0.5,
          knowledge_freshness: 0.95, // Assume docs are current unless otherwise indicated
          evidence_quality: context.learningDocs && context.learningDocs.length > 0 ? 0.85 : 0.6
        },
        recommendedActions: [] as string[]
      };

      // Calculate overall confidence from breakdown
      const avgConfidence = Object.values(confidenceAnalysis.confidenceBreakdown).reduce((a, b) => a + b, 0) / 
                           Object.keys(confidenceAnalysis.confidenceBreakdown).length;
      confidenceAnalysis.overallConfidence = Math.max(reasoningConfidence, avgConfidence);

      // If confidence < 0.7, recommend verification
      if (confidenceAnalysis.overallConfidence < 0.7) {
        confidenceAnalysis.recommendedActions.push(
          'Verify this answer with your quality/compliance officer',
          'Check the official standard document',
          'Consider consulting an external auditor for complex cases'
        );
      }

      // Pipeline Step 5: Record Conversation Turn
      await this.recordConversationTurn({
        tenantId: effectiveTenantId,
        sessionId: effectiveSessionId,
        userId: effectiveUserId,
        message,
        response: finalAnswer, // Use corrected answer if available
        intent: intentResult.intent,
        topic: intentResult.topic,
        subIntent: intentResult.subIntent,
        mode: filledResponse.mode,
        metadata: filledResponse.metadata
      });

      // Pipeline Step 6: Apply Learning from Feedback (if applicable)
      await this.applyLearningFromFeedback({
        tenantId: effectiveTenantId,
        sessionId: effectiveSessionId,
        userId: effectiveUserId,
        message,
        previousResponse: filledResponse.answer,
        intent: intentResult.intent,
        topic: intentResult.topic
      });

      // Return response with corrected answer, reasoning steps, and confidence analysis
      return {
        ...filledResponse,
        answer: finalAnswer,
        metadata: {
          ...filledResponse.metadata,
          correctionApplied: relevantCorrections.length > 0 && relevantCorrections[0].confidence > 0.8,
          reasoningSteps: reasoningSteps.length > 0 ? reasoningSteps : undefined, // Chain-of-Thought steps
          confidenceAnalysis: confidenceAnalysis.overallConfidence < 0.99 ? confidenceAnalysis : undefined, // Only include if not perfect
          verificationNeeded: confidenceAnalysis.overallConfidence < 0.75,
          recommendedActions: confidenceAnalysis.recommendedActions.length > 0 ? confidenceAnalysis.recommendedActions : undefined
        }
      };

    } catch (error: any) {
      console.error('[VeraCoreEngine] Pipeline error:', error);
      
      // Graceful fallback
      return {
        answer: 'I encountered an error while processing your question. Could you try rephrasing it?',
        mode: 'error',
        metadata: {
          error: error.message,
          reason: 'pipeline_error'
        }
      };
    }
  }

  // ==========================================================================
  // Helper: Extract Standard Code from Message
  // ==========================================================================

  /**
   * Determine industry context from message, standard code, and standards list
   * Returns industry priorities and standard codes for context-aware term selection
   */
  private static determineIndustryContext(
    message: string,
    detectedStandardCode: string | null,
    standards: Array<{ code: string; revision: string; title: string }>
  ): {
    primaryIndustry: string;
    secondaryIndustry?: string;
    standardCodes: string[];
    standardPatterns: string[];
  } {
    const upperMessage = message.toUpperCase();
    const allStandardCodes = [
      detectedStandardCode,
      ...standards.map(s => s.code)
    ].filter(Boolean).map(c => c?.toUpperCase() || '');

    // Detect industry from standard codes
    let primaryIndustry = 'quality'; // Default to general quality
    let secondaryIndustry: string | undefined;
    const standardCodes: string[] = [];
    const standardPatterns: string[] = [];

    // Check for automotive standards (IATF)
    if (allStandardCodes.some(c => c.includes('IATF') || c.includes('16949'))) {
      primaryIndustry = 'automotive';
      standardCodes.push('IATF', 'IATF16949', 'AUTOMOTIVE');
      standardPatterns.push('IATF%', 'AUTOMOTIVE%');
    }

    // Check for aerospace standards (AS9100, AS9110, AS9120, FAA, CASA, EASA, UK CAA)
    if (allStandardCodes.some(c => 
      c.includes('AS9100') || c.includes('AS9110') || c.includes('AS9120') ||
      c.includes('AS91') || c.includes('FAA') || c.includes('CASA') ||
      c.includes('EASA') || c.includes('UKCAA') || c.includes('UK_CAA')
    )) {
      if (primaryIndustry === 'quality') {
        primaryIndustry = 'aerospace';
      } else {
        secondaryIndustry = 'aerospace';
      }
      standardCodes.push('AS9100', 'AS9110', 'AS9120', 'ASQ', 'FAA', 'CASA', 'EASA', 'UKCAA', 'AEROSPACE');
      standardPatterns.push('AS91%', 'ASQ%', 'FAA%', 'CASA%', 'EASA%', 'UKCAA%', 'AEROSPACE%');
    }

    // Check for manufacturing standards
    if (allStandardCodes.some(c => c.includes('MANUFACTURING') || upperMessage.includes('MANUFACTURING'))) {
      if (primaryIndustry === 'quality') {
        primaryIndustry = 'manufacturing';
      }
      standardCodes.push('MANUFACTURING');
      standardPatterns.push('MANUFACTURING%');
    }

    // Check message for industry keywords
    if (upperMessage.includes('AUTOMOTIVE') || upperMessage.includes('VEHICLE') || upperMessage.includes('AUTOMOBILE')) {
      primaryIndustry = 'automotive';
      standardCodes.push('AUTOMOTIVE', 'IATF');
    }
    if (upperMessage.includes('AEROSPACE') || upperMessage.includes('AIRCRAFT') || upperMessage.includes('AVIATION')) {
      if (primaryIndustry === 'quality') {
        primaryIndustry = 'aerospace';
      } else if (primaryIndustry === 'automotive') {
        secondaryIndustry = 'aerospace';
      }
      standardCodes.push('AEROSPACE', 'AS9100', 'ASQ');
    }

    // Always include quality as fallback
    if (primaryIndustry !== 'quality') {
      secondaryIndustry = 'quality';
    }

    return {
      primaryIndustry,
      secondaryIndustry,
      standardCodes: [...new Set(standardCodes)], // Remove duplicates
      standardPatterns: [...new Set(standardPatterns)]
    };
  }

  /**
   * Extract standard code from message
   * Handles patterns like: AS9100D, CASA CASRS Volume 1, EASA 1321/2014, FAA 14 CFR 21.137, etc.
   */
  /**
   * Extract topic from message (for template variable filling)
   */
  private static extractTopicFromMessage(message: string): string | null {
    if (!message) return null;
    
    // Try to extract after "what is", "define", "explain", etc.
    const topicPatterns = [
      /(?:what\s+is|what's|define|explain|tell\s+me\s+about|describe)\s+([a-z0-9\s]+?)(?:\?|$|\.|,)/i,
      /(?:about|regarding|concerning)\s+([a-z0-9\s]+?)(?:\?|$|\.|,)/i,
      /^([A-Z]{2,10})\s/i, // Acronyms at start
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/ // Capitalized terms
    ];
    
    for (const pattern of topicPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const topic = match[1].trim();
        if (topic.length > 2 && topic.length < 50) {
          return topic;
        }
      }
    }
    
    // Fallback: extract first significant word/phrase
    const words = message.split(/\s+/).filter(w => w.length > 2);
    if (words.length > 0) {
      return words.slice(0, 3).join(' ');
    }
    
    return null;
  }

  private static extractStandardCode(message: string): string | null {
    const upperMessage = message.toUpperCase();
    
    // Known standard patterns
    const standardPatterns = [
      /(AS9100[A-Z]?)/i,
      /(AS9110[A-Z]?)/i,
      /(AS9120[A-Z]?)/i,
      /(ISO\s*9001)/i,
      /(ISO\s*13485)/i,
      /(IATF\s*16949)/i,
      /(CASA\s*CASRS\s*VOL\s*[0-9]+)/i,
      /(CASA\s*CASRS\s*VOLUME\s*[0-9]+)/i,
      /(EASA\s*[0-9]+\/[0-9]+)/i,
      /(EASA\s*EAR\s*[0-9]+)/i,
      /(UK\s*CAA\s*[A-Z0-9]+)/i,
      /(FAA\s*14\s*CFR\s*[0-9]+(?:\.[0-9]+)?)/i,
      /(FAA\s*PART\s*[0-9]+(?:\.[0-9]+)?)/i,
      /(21\.137)/i,  // FAA Part 21.137
    ];

    for (const pattern of standardPatterns) {
      const match = message.match(pattern);
      if (match) {
        // Normalize the match
        let code = match[1].toUpperCase().replace(/\s+/g, '_');
        // Handle special cases
        if (code.includes('CASA_CASRS_VOL')) {
          code = code.replace('VOL', 'VOLUME').replace('_', '_');
        }
        if (code.includes('FAA_14_CFR')) {
          code = code.replace('FAA_14_CFR', 'FAA_PART');
        }
        return code;
      }
    }

    // Try to find standard codes in the message by checking against known patterns
    // This is a fallback - we'll refine this based on actual ingested data
    return null;
  }

  // ==========================================================================
  // Pipeline Step 1: Detect Intent and Topic
  // ==========================================================================

  /**
   * Format terminology definition for response
   * @param {any} termDef - Term definition from database
   * @returns {string} Formatted response
   */
  private static formatTermDefinition(termDef: any): string {
    let response = `**${termDef.term}**`;
    
    if (termDef.acronym_expansion || termDef.acronym) {
      response += ` (${termDef.acronym_expansion || termDef.acronym})`;
    }
    
    response += `\n\n${termDef.full_definition || termDef.definition || termDef.short_definition || ''}`;
    
    if (termDef.example) {
      response += `\n\n**Example:** ${termDef.example}`;
    }
    
    if (termDef.related_standards && termDef.related_standards.length > 0) {
      response += `\n\n**Related Standards:** ${termDef.related_standards.join(', ')}`;
    } else if (termDef.source_standard) {
      response += `\n\n**Source:** ${termDef.source_standard}`;
    }
    
    return response;
  }

  /**
   * Format Q&A response for output
   * @param {any} qnaEntry - Q&A entry from database
   * @returns {string} Formatted response
   */
  private static formatQnAResponse(qnaEntry: any, message?: string, topic?: string, context?: SemanticContext): string {
    let response = qnaEntry.response_text || '';
    
    // Fill template variables if present
    if (response.includes('{topic}')) {
      const topicValue = topic || this.extractTopicFromMessage(message || '') || 'this topic';
      response = response.replace(/{topic}/g, topicValue);
    }
    
    if (response.includes('{detailed_explanation}')) {
      let explanation = '';
      if (context) {
        if (context.learningDocs && context.learningDocs.length > 0) {
          const doc = context.learningDocs[0];
          explanation = doc.content_text.length > 500 
            ? doc.content_text.substring(0, 500) + '...' 
            : doc.content_text;
        } else if (context.documentContent.length > 0) {
          const doc = context.documentContent[0];
          explanation = doc.contentText.length > 500 
            ? doc.contentText.substring(0, 500) + '...' 
            : doc.contentText;
        } else if (context.clauses.length > 0 && context.clauses[0].requirementText) {
          explanation = context.clauses[0].requirementText.substring(0, 500);
        }
      }
      if (!explanation) {
        explanation = 'This is an important concept in quality management and compliance. I can provide detailed information based on your specific requirements and standards.';
      }
      response = response.replace(/{detailed_explanation}/g, explanation);
    }
    
    if (response.includes('{key_concept}')) {
      const keyConcept = topic || this.extractTopicFromMessage(message || '') || 'the key concept';
      response = response.replace(/{key_concept}/g, keyConcept);
    }
    
    // If there are still unfilled variables, remove them to avoid showing {variable} in response
    response = response.replace(/\{[^}]+\}/g, '');
    
    if (qnaEntry.context) {
      response += `\n\n**Context:** ${qnaEntry.context}`;
    }
    
    if (qnaEntry.tags && qnaEntry.tags.length > 0) {
      response += `\n\n**Related Topics:** ${qnaEntry.tags.join(', ')}`;
    }
    
    return response;
  }

  /**
   * Check if message is a self-diagnostic question
   */
  private static isSelfDiagnosticQuestion(text: string): boolean {
    const lower = text.toLowerCase().trim();
    
    // Check for 0331 debug mode trigger (can appear anywhere in message)
    const has0331 = lower.includes('0331');
    const hasDiagnosticKeyword = lower.includes('diagnose') || 
                                 lower.includes('debug') || 
                                 lower.includes('check') || 
                                 lower.includes('review') ||
                                 lower.includes('issues') ||
                                 lower.includes('problems') ||
                                 lower.includes('errors');
    
    if (has0331 && hasDiagnosticKeyword) {
      return true;
    }
    
    // Direct diagnostic patterns
    return (
      lower === 'vera, what issues are you having?' ||
      lower === 'vera what issues are you having?' ||
      lower.includes('what issues are you having') ||
      lower.includes('are you having any issues') ||
      lower.includes('are you working properly') ||
      lower.includes('are you having problems') ||
      lower.includes('status check') ||
      lower.includes('self check') ||
      lower.includes('self-check') ||
      lower.includes('health check') ||
      lower.includes('health-check') ||
      lower.includes('what\'s wrong') ||
      lower.includes('whats wrong') ||
      lower.includes('diagnose yourself') ||
      lower.includes('self diagnose') ||
      lower.includes('diagnose errors') ||
      lower.includes('diagnose error') ||
      lower.includes('diagnose issues') ||
      lower.includes('diagnose your') ||
      lower.includes('diagnose problems') ||
      lower.includes('full self diagnostic') ||
      lower.includes('complete self diagnostic') ||
      lower.includes('run self diagnostic') ||
      lower.includes('self diagnostic') ||
      lower.includes('provide a full self diagnostic') ||
      lower.includes('provide full self diagnostic') ||
      lower.includes('give me a self diagnostic') ||
      lower.includes('show me your issues') ||
      lower.includes('what issues do you have') ||
      lower.includes('connection errors') ||
      lower.includes('database connection') ||
      lower.includes('database connections') ||
      lower.includes('connection error') ||
      lower.includes('review database') ||
      lower.includes('check connections') ||
      lower.includes('check connection') ||
      lower.includes('debug database') ||
      lower.includes('database schema') ||
      lower.includes('what databases') ||
      lower.includes('list databases') ||
      lower.includes('connection status') ||
      lower.includes('system status') ||
      lower.includes('system health') ||
      lower.includes('health status')
    );
  }

  /**
   * Check if message is a self-triage question
   */
  private static isSelfTriageQuestion(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return (
      lower.includes('what should we fix first') ||
      lower.includes('what should i fix first') ||
      lower.includes('top priority') ||
      lower.includes('highest priority issue') ||
      lower.includes('what should i fix to make you smarter') ||
      lower.includes('which problem should i fix first') ||
      lower.includes('what\'s the most important issue') ||
      lower.includes('whats the most important issue') ||
      lower.includes('prioritize issues') ||
      lower.includes('priority order')
    );
  }

  /**
   * Check if message is a debug history question
   */
  private static isSelfDebugHistoryQuestion(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return (
      lower.includes('show me your recent issues') ||
      lower.includes('show me your last errors') ||
      lower.includes('what problems have you had recently') ||
      lower.includes('recent errors') ||
      lower.includes('debug history') ||
      lower.includes('error history') ||
      lower.includes('when did this start') ||
      lower.includes('how long have you been having this issue') ||
      lower.includes('show me your last debug session')
    );
  }

  /**
   * Check if message is a remedy/recommendation question
   */
  private static isSelfRemedyQuestion(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return (
      lower.includes('what do you recommend') ||
      lower.includes('how should i fix') ||
      lower.includes('how do i fix') ||
      lower.includes('what should i do') ||
      lower.includes('how to fix') ||
      lower.includes('remedy') ||
      lower.includes('solution') ||
      lower.includes('recommendation') ||
      lower.includes('what steps should i take') ||
      lower.includes('how can i resolve') ||
      lower.includes('what action should i take')
    );
  }

  /**
   * Check if message is a self-test request
   */
  private static isSelfTestQuestion(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return (
      lower.includes('verify fixes') ||
      lower.includes('run self-test') ||
      lower.includes('self test') ||
      lower.includes('self-test') ||
      lower.includes('run tests') ||
      lower.includes('run diagnostics') ||
      lower.includes('test yourself') ||
      lower.includes('check yourself') ||
      lower.includes('verify systems') ||
      lower.includes('system check')
    );
  }

  /**
   * Check if message is a remedy application recording
   */
  private static isRemedyApplicationMessage(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return (
      lower.includes('i applied') ||
      lower.includes('i fixed') ||
      lower.includes('i ran') ||
      lower.includes('i executed') ||
      lower.includes('remedy applied') ||
      lower.includes('fix applied') ||
      lower.includes('i completed') ||
      lower.includes('done fixing') ||
      lower.includes('migration applied') ||
      lower.includes('migration run')
    );
  }

  /**
   * Check if message is asking for remedy effectiveness
   */
  private static isRemedyEffectivenessQuestion(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return (
      lower.includes('which remedy worked') ||
      lower.includes('what remedies worked') ||
      lower.includes('remedy effectiveness') ||
      lower.includes('remedy success') ||
      lower.includes('best remedy') ||
      lower.includes('most successful remedy') ||
      lower.includes('remedy statistics') ||
      lower.includes('remedy history')
    );
  }

  /**
   * Detect specialized intents for fast-path routing
   * These intents have high confidence and route to specific handlers
   * RUNS BEFORE generic intent classification
   * 
   * @param {string} userMessage - User's message
   * @returns {Object} Intent with confidence and routing info, or null
   */
  private static detectSpecializedIntent(userMessage: string): IntentAndTopic | null {
    const normalized = userMessage.toLowerCase().trim();
    
    // SELF-DIAGNOSTIC INTENT (highest priority - 99% confidence)
    if (this.isSelfDiagnosticQuestion(normalized)) {
      console.log(`[VeraCoreEngine] Detected SELF_DIAGNOSTIC intent`);
      return {
        intent: 'self_diagnostic',
        topic: 'health_status',
        confidence: 0.99
      };
    }

    // SELF-TRIAGE INTENT (99% confidence)
    if (this.isSelfTriageQuestion(normalized)) {
      console.log(`[VeraCoreEngine] Detected SELF_TRIAGE intent`);
      return {
        intent: 'self_triage',
        topic: 'health_prioritization',
        confidence: 0.99
      };
    }

    // SELF-DEBUG-HISTORY INTENT (99% confidence)
    if (this.isSelfDebugHistoryQuestion(normalized)) {
      console.log(`[VeraCoreEngine] Detected SELF_DEBUG_HISTORY intent`);
      return {
        intent: 'self_debug_history',
        topic: 'debug_history',
        confidence: 0.99
      };
    }

    // SELF-REMEDY INTENT (99% confidence)
    if (this.isSelfRemedyQuestion(normalized)) {
      console.log(`[VeraCoreEngine] Detected SELF_REMEDY intent`);
      return {
        intent: 'self_remedy',
        topic: 'remedy_suggestion',
        confidence: 0.99
      };
    }

    // SELF-TEST INTENT (99% confidence)
    if (this.isSelfTestQuestion(normalized)) {
      console.log(`[VeraCoreEngine] Detected SELF_TEST intent`);
      return {
        intent: 'self_test',
        topic: 'system_verification',
        confidence: 0.99
      };
    }

    // REMEDY APPLICATION INTENT (95% confidence - slightly lower as it may be ambiguous)
    if (this.isRemedyApplicationMessage(normalized)) {
      console.log(`[VeraCoreEngine] Detected REMEDY_APPLICATION intent`);
      return {
        intent: 'remedy_application',
        topic: 'remedy_tracking',
        confidence: 0.95
      };
    }

    // REMEDY EFFECTIVENESS INTENT (99% confidence)
    if (this.isRemedyEffectivenessQuestion(normalized)) {
      console.log(`[VeraCoreEngine] Detected REMEDY_EFFECTIVENESS intent`);
      return {
        intent: 'remedy_effectiveness',
        topic: 'remedy_statistics',
        confidence: 0.99
      };
    }
    
    // TERM DEFINITION INTENT (high confidence)
    // Examples: "what is APQP", "define quality", "explain GMP"
    const termDefinitionMatch = normalized.match(/^(what\s+is|define|explain|tell\s+me\s+about|describe)\s+(\w+)/i);
    if (termDefinitionMatch) {
      const term = termDefinitionMatch[2];
      console.log(`[VeraCoreEngine] Detected TERM_DEFINITION intent for: "${term}"`);
      return {
        intent: 'term_definition',
        topic: 'terminology',
        confidence: 0.95,
        subIntent: term
      };
    }
    
    // QUALITY CONCEPTS INTENT (high confidence)
    // Examples: "what is quality", "quality definition", "quality engineering"
    if (/\b(quality|apqp|iatf|gmp|capa|fmea|ppap|spc|doe|rca)\b/i.test(normalized)) {
      console.log(`[VeraCoreEngine] Detected QUALITY_CONCEPT intent`);
      return {
        intent: 'quality_definition',
        topic: 'quality_engineering',
        confidence: 0.92
      };
    }
    
    // GAP ANALYSIS INTENT (high confidence)
    // Examples: "find gaps", "identify missing", "show me gaps"
    if (/^(find|identify|list|show|analyze|check)\s+(gap|gaps|missing|issue|problem|nonconformit)/i.test(normalized)) {
      console.log(`[VeraCoreEngine] Detected GAP_ANALYSIS intent`);
      return {
        intent: 'gap_analysis',
        topic: 'compliance_gaps',
        confidence: 0.90
      };
    }
    
    // REGULATORY INTENT (high confidence)
    // Examples: "FAA part 21.137", "FDA requirement", "CASA standard"
    if (/\b(faa|casa|easa|uk caa|fda|dot|21\.137|part 21|casr|1321)\b/i.test(normalized)) {
      console.log(`[VeraCoreEngine] Detected REGULATORY intent`);
      return {
        intent: 'regulatory_question',
        topic: 'regulatory_compliance',
        confidence: 0.93
      };
    }
    
    // PROCEDURE/TEMPLATE INTENT (high confidence)
    // Examples: "draft a procedure", "create template", "generate procedure"
    if (/^(draft|create|generate|write|build|develop)\s+(a\s+)?(procedure|template|document|form)/i.test(normalized)) {
      console.log(`[VeraCoreEngine] Detected PROCEDURE_DRAFT intent`);
      return {
        intent: 'procedure_draft',
        topic: 'procedure_generation',
        confidence: 0.90
      };
    }
    
    // No specialized intent matched - return null to fall back to generic classification
    return null;
  }

  private static async detectIntentAndTopic(params: {
    message: string;
    tenantId: string;
    sessionId: string;
  }): Promise<IntentAndTopic> {
    const { message, tenantId } = params;
    const lowerMessage = message.toLowerCase();
    
    // STEP 1: Try specialized intent detection (fast, high confidence)
    const specializedIntent = this.detectSpecializedIntent(message);
    if (specializedIntent) {
      console.log(`[VeraCoreEngine] ✅ Specialized intent detected:`, specializedIntent);
      return specializedIntent;
    }
    
    // STEP 2: Fall back to generic intent classification
    console.log('[VeraCoreEngine] No specialized intent, using generic classification...');

    try {
      // First, try to load router from edcat.ai_router
      const routerResult = await queryEdcatAI(
        `SELECT rules FROM edcat.ai_router 
         WHERE tenant_id = $1 AND name = 'default-routing'
         LIMIT 1`,
        [tenantId]
      );

      if (routerResult.rows.length > 0) {
        const rules = routerResult.rows[0].rules;
        // Use router rules if available (JSONB structure)
        // For now, fall through to keyword-based detection
      }

      // Keyword-based intent detection (fallback)
      let intent = 'general_query';
      let topic: string | undefined;
      let subIntent: string | undefined;
      let confidence = 0.7;

      // Check for clause questions
      const clauseMatch = message.match(/\b([0-9]+\.[0-9]+(?:\.[0-9]+)*)\b/);
      if (clauseMatch) {
        intent = 'clause_question';
        topic = clauseMatch[1];
        confidence = 0.9;
      }

      // Check for standard questions - use extractStandardCode for better detection
      const detectedStandard = this.extractStandardCode(message);
      if (detectedStandard) {
        intent = intent === 'clause_question' ? intent : 'standard_question';
        topic = detectedStandard;
        confidence = 0.85;
      } else {
        // Fallback to regex pattern matching
        const standardMatch = message.match(/\b(AS9100|AS9110|AS9120|ISO\s*9001|ISO\s*13485|FAA\s*Part\s*\d+|IATF\s*16949|CASA|EASA|UK\s*CAA)\b/i);
        if (standardMatch) {
          intent = intent === 'clause_question' ? intent : 'standard_question';
          topic = standardMatch[1].toUpperCase();
          confidence = 0.85;
        }
      }

      // Check for gap analysis requests
      if (lowerMessage.match(/\b(gap|gaps|compliance gap|gap analysis|where are we weak|what gaps|missing|deficiencies)\b/i)) {
        intent = 'gap_analysis_request';
        confidence = 0.85;
      }

      // Check for greeting
      if (lowerMessage.match(/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))/i)) {
        intent = 'greeting';
        confidence = 0.95;
      }

      // Check for capability questions
      if (lowerMessage.includes('what can you') || lowerMessage.includes('your capabilities')) {
        intent = 'capability_query';
        confidence = 0.9;
      }

      // Check for quality definition questions (HIGH PRIORITY - before general definition)
      if (lowerMessage.match(/^(define\s+quality|what\s+is\s+quality|what\s+does\s+quality\s+mean|explain\s+quality)\b/i)) {
        intent = 'quality_definition';
        topic = 'quality_core_concept';
        confidence = 0.95;
      }
      // Check for other definition questions
      else if (lowerMessage.match(/^(what is|define|explain|tell me about)\s+/i)) {
        intent = 'definition_query';
        confidence = 0.8;
      }

      // Check for procedure generation requests
      if (lowerMessage.match(/(generate|write|create|draft).*(procedure|work instruction|wi|process)/i)) {
        intent = 'procedure_generation';
        confidence = 0.85;
      }

      const result: IntentAndTopic = { intent, topic, subIntent, confidence };
      
      // Cache the result
      const intentCacheKey = CacheKeys.intentPattern(message);
      VeraCacheService.set(intentCacheKey, result, 2 * 60 * 1000);
      
      return result;

    } catch (error: any) {
      console.warn('[VeraCoreEngine] Intent detection error:', error.message);
      return {
        intent: 'general_query',
        confidence: 0.5
      };
    }
  }

  // ==========================================================================
  // Pipeline Step 2: Build Semantic Context
  // ==========================================================================

  private static async buildSemanticContext(params: {
    message: string;
    intent: string;
    topic?: string;
    tenantId: string;
    sessionId: string;
  }): Promise<SemanticContext> {
    const { message, intent, topic, tenantId, sessionId } = params;

    try {
      // Gather standards
      const standardsResult = await queryPostgres(
        `SELECT DISTINCT standard_code, revision, title
         FROM public.compliance_standards
         WHERE customer_id = $1 OR customer_id IS NULL
         ORDER BY standard_code, revision DESC
         LIMIT 10`,
        [tenantId]
      ).catch(() => ({ rows: [] }));

      const standards = standardsResult.rows.map((r: any) => ({
        code: r.standard_code,
        revision: r.revision || '',
        title: r.title || ''
      }));

      // Gather clauses (if topic is a clause reference) - use enhanced clause matcher
      // Also check regulatory standards using VeraRegulatoryRepository
      let clauses: SemanticContext['clauses'] = [];
      if (topic && /^[0-9]+\.[0-9]/.test(topic)) {
        // Normalize clause reference for better matching
        const normalized = VeraClauseMatcher.normalizeClauseRef(topic);
        
        // Build query with multiple match patterns
        const clauseQuery = `
          SELECT DISTINCT standard_code, clause_reference, requirement_text
          FROM public.compliance_requirements
          WHERE clause_reference = $1
             OR clause_reference LIKE $2
             OR clause_reference LIKE $3
          ORDER BY 
            CASE 
              WHEN clause_reference = $1 THEN 1
              WHEN clause_reference LIKE $2 THEN 2
              ELSE 3
            END
          LIMIT 10
        `;
        
        const clausesResult = await queryPostgres(clauseQuery, [
          normalized.normalized,
          `${normalized.mainClause}%`,
          `%${topic}%`
        ]).catch(() => ({ rows: [] }));

        clauses = clausesResult.rows.map((r: any) => ({
          standardCode: r.standard_code || '',
          clauseId: r.clause_reference || '',
          label: r.clause_reference || '',
          requirementText: r.requirement_text
        }));

        // Also check regulatory repository for regulatory standards
        const detectedStandardCode = this.extractStandardCode(message) || standards[0]?.code;
        if (detectedStandardCode && (
          detectedStandardCode.startsWith('FAA_') ||
          detectedStandardCode.startsWith('CASA_') ||
          detectedStandardCode.startsWith('EASA_') ||
          detectedStandardCode.startsWith('UKCAA_') ||
          detectedStandardCode.startsWith('FDA_') ||
          detectedStandardCode.startsWith('DOT_')
        )) {
          const regRepo = new VeraRegulatoryRepository();
          const regSections = await regRepo.findRegSectionText(detectedStandardCode, topic);
          
          // Merge regulatory sections into clauses
          for (const section of regSections) {
            if (!clauses.find(c => c.clauseId === section.sectionRef)) {
              clauses.push({
                standardCode: section.standardCode,
                clauseId: section.sectionRef,
                label: section.sectionRef,
                requirementText: section.contentText
              });
            }
          }
        }
      }

      // Gather customer documents
      const docsResult = await queryPostgres(
        `SELECT id, document_name, document_type
         FROM public.customer_documents
         WHERE customer_id = $1 AND is_deleted = FALSE
         ORDER BY created_at DESC
         LIMIT 10`,
        [tenantId]
      ).catch(() => ({ rows: [] }));

      const customerDocuments = docsResult.rows.map((r: any) => ({
        id: r.id,
        name: r.document_name || '',
        type: r.document_type || ''
      }));

      // Gather gap analyses
      const gapResult = await queryPostgres(
        `SELECT id, standard_code, status
         FROM public.gap_analyses
         WHERE customer_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [tenantId]
      ).catch(() => ({ rows: [] }));

      const gapAnalyses = gapResult.rows.map((r: any) => ({
        id: r.id,
        standardCode: r.standard_code || '',
        status: r.status || ''
      }));

      // Get conversation state
      const stateResult = await queryEdcatAI(
        `SELECT last_intent, last_topic, context
         FROM edcat.ai_conversation_state
         WHERE tenant_id = $1 AND session_id = $2 AND persona_code = 'vera'
         LIMIT 1`,
        [tenantId, sessionId]
      ).catch(() => ({ rows: [] }));

      const conversationState = stateResult.rows.length > 0 ? {
        lastIntent: stateResult.rows[0].last_intent,
        lastTopic: stateResult.rows[0].last_topic,
        context: stateResult.rows[0].context
      } : undefined;

      // Determine primary standard code from message, topic, or detected standard
      const detectedStandardCode = this.extractStandardCode(message) || topic || standards[0]?.code || null;
      
      // Determine industry context for context-aware term selection
      const industryContext = this.determineIndustryContext(message, detectedStandardCode, standards);
      
      // Normalize clause reference if present
      let normalizedClause: any = null;
      if (topic && /^[0-9]+\.[0-9]/.test(topic)) {
        normalizedClause = VeraClauseMatcher.normalizeClauseRef(topic);
      }
      
      // Get learning documents using VeraLearningRepository - PARALLELIZE for speed
      // Use SEMANTIC SEARCH for better relevance
      let learningDocs: LearningDoc[] = [];
      let approvedExamples: ExampleDoc[] = [];
      let badExamples: ExampleDoc[] = [];
      
      // Build search query from message and topic
      const searchQuery = topic || message.substring(0, 100);
      
      if (detectedStandardCode) {
        // Fetch by standard code - run in parallel for speed
        // Use semantic search for better results
        [learningDocs, approvedExamples, badExamples] = await Promise.all([
          // Try semantic search first, fallback to standard code lookup
          semanticSearchLearningDocs(searchQuery, {
            standardCode: detectedStandardCode,
            limit: 5,
            includeExamples: false,
            minSimilarity: 0.5
          }).then(results => {
            // If semantic search returns good results, use them
            if (results.length > 0 && results[0].similarityScore > 0.6) {
              return results;
            }
            // Otherwise fallback to standard code lookup
            return getLearningDocsByStandardCode(detectedStandardCode, 5);
          }),
          getApprovedExamplesForStandard(detectedStandardCode, 3),
          getBadExamplesForStandard(detectedStandardCode, 3)
        ]);
      } else if (topic) {
        // Search by topic/keyword - use semantic search
        learningDocs = await semanticSearchLearningDocs(searchQuery, {
          limit: 5,
          minSimilarity: 0.5
        }).then(results => {
          if (results.length > 0) {
            return results;
          }
          // Fallback to text search
          return searchLearningDocsByTopic(topic, 5);
        });
      } else {
        // General query - use semantic search with fallback
        learningDocs = await semanticSearchLearningDocs(message, {
          limit: 5,
          minSimilarity: 0.3 // Lower threshold for fallback keyword search
        }).catch(() => []);
        
        // If semantic search returns nothing, try keyword fallback directly
        if (learningDocs.length === 0) {
          try {
            const { default: VeraSemanticMemory } = await import('./VeraSemanticMemory.js');
            const fallbackResults = await VeraSemanticMemory.fallbackKeywordSearch(
              message,
              5,
              null,
              tenantId,
              0.3
            );
            if (fallbackResults.length > 0) {
              // Convert to LearningDoc format
              learningDocs = fallbackResults.map((r: any) => ({
                content_text: r.text || '',
                quality: r.metadata?.quality || null,
                metadata: r.metadata || {},
                standard_code: r.metadata?.standard_code || null,
                word_count: r.metadata?.word_count || 0,
                file_id: r.sourceId,
                similarityScore: r.similarity || 0.5
              }));
            }
          } catch (fallbackError) {
            console.warn('[VeraCoreEngine] Fallback keyword search failed:', fallbackError);
          }
        }
      }

      // Legacy documentContent and examples for backward compatibility
      let documentContent: SemanticContext['documentContent'] = learningDocs.map(doc => ({
        contentText: doc.content_text || '',
        standardCode: doc.standard_code || '',
        quality: doc.quality || undefined,
        metadata: doc.metadata || {},
        wordCount: doc.word_count || 0
      }));

      let examples: SemanticContext['examples'] = approvedExamples.map(ex => ({
        fileName: ex.file_name || '',
        contentText: ex.content_text || '',
        qualityScore: ex.quality_score || 0,
        standardCode: ex.standard_code || ''
      }));

      // Get relevant terms and definitions from the message - CONTEXT-AWARE
      let termsAndDefinitions: SemanticContext['termsAndDefinitions'] = [];
      try {
        // Extract potential terms/acronyms from message
        const words = message.split(/\s+/).map(w => w.replace(/[.,!?;:()\[\]{}'"]/g, ''));
        const potentialTerms = words.filter(w => 
          w.length >= 2 && (w.length <= 10 || /^[A-Z]{2,10}$/.test(w))
        ).slice(0, 5); // Limit to 5 terms to avoid too many queries
        
        if (potentialTerms.length > 0) {
          // Build context-aware query with priority ranking
          const termsResult = await queryEdcatAI(
            `SELECT 
              term, acronym, definition, source_standard, category,
              -- Priority scoring based on context
              CASE 
                -- Highest priority: exact industry match
                WHEN category = $3 THEN 1
                WHEN category = $4 THEN 2
                WHEN category = $5 THEN 3
                -- Next: source standard match
                WHEN source_standard = ANY($6::text[]) THEN 4
                WHEN source_standard ILIKE ANY($7::text[]) THEN 5
                -- Then: general quality terms
                WHEN category = 'quality' OR category = 'general' THEN 6
                -- Fallback
                ELSE 7
              END as priority_score
             FROM edcat.terms_and_definitions
             WHERE tenant_id = $1
               AND (
                 term ILIKE ANY($2::text[])
                 OR acronym ILIKE ANY($2::text[])
                 OR term = ANY($2::text[])
                 OR acronym = ANY($2::text[])
               )
             ORDER BY 
               priority_score ASC,
               CASE WHEN term = ANY($2::text[]) THEN 1 ELSE 2 END,
               CASE WHEN acronym = ANY($2::text[]) THEN 1 ELSE 2 END,
               is_standard_term DESC,
               quality_score DESC
             LIMIT 10`,
            [
              tenantId, 
              potentialTerms.map(t => `%${t}%`),
              industryContext.primaryIndustry, // e.g., 'automotive', 'aerospace', 'quality'
              industryContext.secondaryIndustry || industryContext.primaryIndustry,
              'quality', // Always include quality as fallback
              industryContext.standardCodes, // Array of standard codes to match
              industryContext.standardPatterns // Array of patterns like ['AS%', 'IATF%']
            ]
          ).catch(() => ({ rows: [] }));
          
          // Group by term to select best definition per term
          const termMap = new Map<string, any>();
          for (const row of termsResult.rows) {
            const key = (row.term || row.acronym || '').toLowerCase();
            if (!termMap.has(key) || row.priority_score < termMap.get(key).priority_score) {
              termMap.set(key, row);
            }
          }
          
          termsAndDefinitions = Array.from(termMap.values())
            .sort((a, b) => a.priority_score - b.priority_score)
            .slice(0, 5) // Limit to top 5 most relevant
            .map((r: any) => ({
              term: r.term,
              acronym: r.acronym || undefined,
              definition: r.definition,
              source_standard: r.source_standard || undefined,
              category: r.category || undefined
            }));
        }
      } catch (error: any) {
        console.warn('[VeraCoreEngine] Error fetching terms:', error.message);
      }

      return {
        standards,
        clauses,
        customerDocuments,
        gapAnalyses,
        conversationState,
        documentContent,
        examples,
        learningDocs,
        approvedExamples,
        badExamples,
        detectedStandardCode: detectedStandardCode || undefined,
        termsAndDefinitions
      };

    } catch (error: any) {
      console.warn('[VeraCoreEngine] Context building error:', error.message);
      return {
        standards: [],
        clauses: [],
        customerDocuments: [],
        gapAnalyses: [],
        conversationState: undefined,
        documentContent: [],
        examples: [],
        learningDocs: [],
        approvedExamples: [],
        badExamples: [],
        termsAndDefinitions: []
      };
    }
  }

  // ==========================================================================
  // Pipeline Step 3: Select Answer Template
  // ==========================================================================

  private static async selectAnswerTemplate(params: {
    intent: string;
    topic?: string;
    context: SemanticContext;
    tenantId: string;
  }): Promise<AnswerTemplate | null> {
    const { intent, topic, context, tenantId } = params;

    try {
      // Try to load template from edcat.vera_response_templates first (newer table)
      let templateResult = await queryEdcatAI(
        `SELECT template_code as name, 'template' as kind, content as template
         FROM edcat.vera_response_templates
         WHERE template_code = $1
           AND active = TRUE
         LIMIT 1`,
        [intent === 'quality_definition' ? 'quality.definition' : intent]
      ).catch(() => ({ rows: [] }));

      // If not found, try edcat.ai_template
      if (templateResult.rows.length === 0) {
        templateResult = await queryEdcatAI(
          `SELECT name, kind, template
           FROM edcat.ai_template
           WHERE tenant_id = $1 
             AND (name LIKE $2 OR kind = $3)
           ORDER BY 
             CASE 
               WHEN name LIKE $4 THEN 1
               WHEN kind = $3 THEN 2
               ELSE 3
             END
           LIMIT 1`,
          [
            tenantId,
            `%${intent}%`,
            intent,
            `%${intent}%`
          ]
        ).catch(() => ({ rows: [] }));
      }

      if (templateResult.rows.length > 0) {
        const row = templateResult.rows[0];
        return {
          name: row.name,
          kind: row.kind,
          template: row.template
        };
      }

      // Fallback: Use default template based on intent
      return this.getDefaultTemplate(intent, topic, context);

    } catch (error: any) {
      console.warn('[VeraCoreEngine] Template selection error:', error.message);
      return this.getDefaultTemplate(intent, topic, context);
    }
  }

  private static getDefaultTemplate(
    intent: string,
    topic: string | undefined,
    context: SemanticContext
  ): AnswerTemplate | null {
    // Default templates based on intent
    const templates: Record<string, AnswerTemplate> = {
      clause_question: {
        name: 'clause.explanation',
        kind: 'retrieval',
        template: {
          pattern: 'Clause {clauseId} of {standardCode} states: {requirementText}',
          variables: ['clauseId', 'standardCode', 'requirementText']
        }
      },
      standard_question: {
        name: 'standard.overview',
        kind: 'retrieval',
        template: {
          pattern: '{standardCode} is a {description}. Key requirements include: {keyPoints}',
          variables: ['standardCode', 'description', 'keyPoints']
        }
      },
      greeting: {
        name: 'greeting.response',
        kind: 'conversational',
        template: {
          pattern: 'Hello! I\'m Vera, your compliance and quality assistant. How can I help you today?',
          variables: []
        }
      },
      capability_query: {
        name: 'capability.list',
        kind: 'informational',
        template: {
          pattern: 'I can help you with: gap analysis, clause explanations, standard compliance, regulatory lookups, and audit preparation.',
          variables: []
        }
      },
      quality_definition: {
        name: 'quality.definition',
        kind: 'informational',
        template: {
          pattern: 'Quality, in a compliance and standards context, is the degree to which inherent characteristics of a process, product, or service fulfil stated and implied requirements.\n\nWhen I talk about "quality", I am considering several layers:\n\n• **Requirements** – What regulators, customers, and standards such as ISO 9001 or AS9100 actually require.\n\n• **Conformance** – Whether your documented processes and records show that those requirements are met.\n\n• **Consistency** – Whether you achieve that level of performance reliably over time, not just once.\n\n• **Risk and prevention** – How effectively you identify, control, and reduce risks before they become escapes.\n\n• **Improvement** – Whether you use data, feedback, and nonconformities to make things better, not merely to defend the status quo.\n\nSo, very simply:\n\n> Quality is conformance to clearly defined requirements, delivered consistently, with risk under control and improvement actively pursued.\n\nIf you tell me which angle you care about most – product quality, process quality, service quality, or audit/compliance quality – I can dive into that specifically for you.',
          variables: []
        }
      }
    };

    // Add general_query template if missing
    if (!templates.general_query) {
      templates.general_query = {
        name: 'general.answer',
        kind: 'informational',
        template: {
          pattern: 'Based on the information I have: {description}. {keyPoints}',
          variables: ['description', 'keyPoints']
        }
      };
    }
    
    return templates[intent] || templates.general_query || null;
  }

  // ==========================================================================
  // Pipeline Step 4: Fill Template
  // ==========================================================================

  private static async fillTemplate(params: {
    template: AnswerTemplate | null;
    context: SemanticContext;
    message: string;
    intent: string;
    topic?: string;
    corrections?: Array<{ correctedAnswer: string; confidence: number; originalQuestion: string }>;
  }): Promise<VeraResponse> {
    const { template, context, message, intent, topic } = params;

    if (!template) {
      return {
        answer: 'I need more context to answer that question. Could you specify which standard or clause you\'re asking about?',
        mode: 'fallback',
        intent,
        topic,
        metadata: { reason: 'no_template' }
      };
    }

    try {
      let answer = template.template.pattern;
      const clausesReferenced: string[] = [];
      const standardsReferenced: string[] = [];

      // Special handling for quality_definition - no variables, return as-is
      if (intent === 'quality_definition' && template.template.variables.length === 0) {
        return {
          answer: answer,
          mode: 'normal',
          intent,
          topic,
          metadata: {
            template: template.name,
            confidence: 0.95
          }
        };
      }

      // Fill template variables
      for (const variable of template.template.variables) {
        let value = '';

        switch (variable) {
          case 'clauseId':
            value = topic || context.clauses[0]?.clauseId || '';
            if (value) clausesReferenced.push(value);
            break;
          case 'standardCode':
            value = context.standards[0]?.code || context.clauses[0]?.standardCode || '';
            if (value) standardsReferenced.push(value);
            break;
          case 'requirementText':
            // Try to get from clauses first, then from learning docs
            if (context.clauses[0]?.requirementText) {
              value = context.clauses[0].requirementText;
            } else if (intent === 'clause_question' && topic) {
              // For clause questions, try to find clause in learning docs
              const standardCode = context.detectedStandardCode || context.standards[0]?.code;
              const clauseDocs = await findClauseInLearningDocs(topic, standardCode, 1);
              if (clauseDocs.length > 0) {
                value = this.extractRelevantSnippet(clauseDocs[0].content_text, topic, 500);
              } else if (context.learningDocs && context.learningDocs.length > 0) {
                // Fallback to first learning doc
                value = this.extractRelevantSnippet(context.learningDocs[0].content_text, topic, 500);
              } else {
                value = 'Requirement details not available in database.';
              }
            } else if (context.learningDocs && context.learningDocs.length > 0) {
              value = context.learningDocs[0].content_text.substring(0, 500);
            } else if (context.documentContent.length > 0) {
              value = context.documentContent[0].contentText.substring(0, 500);
            } else {
              value = 'Requirement details not available in database.';
            }
            break;
          case 'description':
            // For gap questions, provide gap-specific description
            if (intent === 'gap_analysis_request' || (topic && topic.toLowerCase().includes('gap'))) {
              value = 'A gap in compliance refers to a difference between what a standard or regulation requires and what your organization currently has implemented. Gaps can be missing procedures, incomplete documentation, or processes that don\'t meet requirements.';
            } else if (topic && (topic.toLowerCase().includes('document') || message.toLowerCase().includes('how many document'))) {
              value = 'I can process multiple documents simultaneously. The exact number depends on document size and system resources, but I typically handle batches efficiently.';
            } else {
              // Use learning docs if available, otherwise fall back to standard title
              if (context.learningDocs && context.learningDocs.length > 0) {
                const docText = context.learningDocs[0].content_text;
                // Extract first sentence or first 200 chars as description
                const firstSentence = docText.split(/[.!?]/)[0] || docText.substring(0, 200);
                value = firstSentence.trim() || context.standards[0]?.title || 'quality management standard';
              } else if (context.documentContent.length > 0) {
                const docText = context.documentContent[0].contentText;
                const firstSentence = docText.split(/[.!?]/)[0] || docText.substring(0, 200);
                value = firstSentence.trim() || context.standards[0]?.title || 'quality management standard';
              } else {
                value = context.standards[0]?.title || 'quality management standard';
              }
            }
            break;
          case 'keyPoints':
            // For gap questions, provide gap-specific key points
            if (intent === 'gap_analysis_request' || (topic && topic.toLowerCase().includes('gap'))) {
              value = 'Common gaps include: missing procedures, incomplete documentation, nonconforming processes, lack of evidence, and inadequate training. I can help identify gaps by comparing your documents against standards like AS9100D, ISO 9001, or FAA Part 21.137.';
            } else if (topic && (topic.toLowerCase().includes('document') || message.toLowerCase().includes('how many document'))) {
              value = 'I can process documents in batches, analyze multiple standards simultaneously, and handle various file types including PDF, DOCX, and XLSX.';
            } else {
              // Use learning docs snippets or clause IDs
              if (context.learningDocs && context.learningDocs.length > 0) {
                const snippets = context.learningDocs
                  .slice(0, 3)
                  .map(doc => {
                    const snippet = doc.content_text.substring(0, 150).trim();
                    return snippet.endsWith('.') ? snippet : snippet + '...';
                  })
                  .filter(s => s.length > 20);
                value = snippets.length > 0 ? snippets.join(' | ') : 
                        (context.clauses.length > 0 ? `Key clauses: ${context.clauses.slice(0, 3).map(c => c.clauseId).join(', ')}` : 'Various compliance requirements');
              } else if (context.documentContent.length > 0) {
                const snippets = context.documentContent
                  .slice(0, 3)
                  .map(doc => {
                    const snippet = doc.contentText.substring(0, 150).trim();
                    return snippet.endsWith('.') ? snippet : snippet + '...';
                  })
                  .filter(s => s.length > 20);
                value = snippets.length > 0 ? snippets.join(' | ') : 
                        (context.clauses.length > 0 ? `Key clauses: ${context.clauses.slice(0, 3).map(c => c.clauseId).join(', ')}` : 'Various compliance requirements');
              } else {
                value = context.clauses.length > 0 
                  ? `Key clauses: ${context.clauses.slice(0, 3).map(c => c.clauseId).join(', ')}`
                  : 'Various compliance requirements';
              }
            }
            break;
          case 'documentContent':
            // Full document content (truncated if too long) - prefer learningDocs
            if (context.learningDocs && context.learningDocs.length > 0) {
              const fullContent = context.learningDocs[0].content_text;
              value = fullContent.length > 2000 ? fullContent.substring(0, 2000) + '...' : fullContent;
            } else if (context.documentContent.length > 0) {
              const fullContent = context.documentContent[0].contentText;
              value = fullContent.length > 2000 ? fullContent.substring(0, 2000) + '...' : fullContent;
            } else {
              value = 'Document content not available.';
            }
            break;
          case 'exampleContent':
            // Approved example content - prefer approvedExamples
            if (context.approvedExamples && context.approvedExamples.length > 0) {
              const example = context.approvedExamples[0];
              const exampleText = example.content_text.length > 1000 
                ? example.content_text.substring(0, 1000) + '...' 
                : example.content_text;
              value = `Example from ${example.file_name}:\n${exampleText}`;
            } else if (context.examples.length > 0) {
              const example = context.examples[0];
              const exampleText = example.contentText.length > 1000 
                ? example.contentText.substring(0, 1000) + '...' 
                : example.contentText;
              value = `Example from ${example.fileName}:\n${exampleText}`;
            } else {
              value = 'No approved examples available.';
            }
            break;
          case 'procedureDraft':
            // Generate procedure draft from approved/bad examples using template generator
            const standardCode = context.detectedStandardCode || context.standards[0]?.code || '';
            value = await this.buildProcedureDraftFromExamples(context, standardCode, topic);
            break;
          case 'topic':
            // Use detected topic or extract from message
            value = topic || this.extractTopicFromMessage(message) || 'this topic';
            break;
          case 'detailed_explanation':
            // Generate detailed explanation from context
            if (context.learningDocs && context.learningDocs.length > 0) {
              const doc = context.learningDocs[0];
              value = doc.content_text.length > 500 
                ? doc.content_text.substring(0, 500) + '...' 
                : doc.content_text;
            } else if (context.documentContent.length > 0) {
              const doc = context.documentContent[0];
              value = doc.contentText.length > 500 
                ? doc.contentText.substring(0, 500) + '...' 
                : doc.contentText;
            } else if (context.clauses.length > 0 && context.clauses[0].requirementText) {
              value = context.clauses[0].requirementText.substring(0, 500);
            } else {
              value = 'I can provide detailed information about this topic based on your compliance requirements and standards.';
            }
            break;
          case 'key_concept':
            // Extract key concept from context
            if (topic) {
              value = topic;
            } else if (context.clauses.length > 0) {
              value = context.clauses[0].clauseId || 'the key concept';
            } else {
              value = 'the key concept';
            }
            break;
          default:
            // For any other variables, try to extract from context or use empty string
            console.warn(`[VeraCoreEngine] Unknown template variable: ${variable}`);
            value = '';
            break;
        }

        answer = answer.replace(`{${variable}}`, value);
      }

      // If template wasn't fully filled, use fallback
      if (answer.includes('{')) {
        return {
          answer: this.generateFallbackResponse(intent, topic, context),
          mode: 'fallback',
          intent,
          topic,
          metadata: {
            templateUsed: template.name,
            reason: 'template_incomplete',
            clausesReferenced,
            standardsReferenced
          }
        };
      }

      // Calculate confidence score based on context quality
      // (calculateConfidence already applies health adjustment internally)
      const confidence = this.calculateConfidence(context, template, intent, topic);
      
      // Check if health issues are affecting confidence
      const issues = veraEngineHealth.getCurrentIssues();
      const hasHighPriorityIssues = issues.length > 0 && (issues[0].priorityScore ?? 0) >= 60;
      const confidenceReduced = hasHighPriorityIssues && confidence < 0.7;
      
      // Add uncertainty messaging based on confidence (subtle, professional)
      let uncertainty: string | undefined;
      if (confidence < 0.6) {
        uncertainty = 'I have limited information on this topic. My answer is based on available data, but you may want to verify with your standards documents.';
      } else if (confidence < 0.75) {
        uncertainty = 'I have some information, but it may not be complete. Please cross-reference with your official standards documents.';
      } else if (confidence < 0.85) {
        uncertainty = 'I have good information on this, but there may be additional context in your specific standards that I haven\'t seen yet.';
      }

      // Add health-based limitation note if confidence was significantly reduced
      if (confidenceReduced) {
        const healthNote = 'I\'m operating with some internal limitations at the moment, so my answer may be less detailed than usual.';
        if (uncertainty) {
          uncertainty = `${healthNote} ${uncertainty}`;
        } else {
          uncertainty = healthNote;
        }
      }
      
      // Adjust answer wording based on confidence (subtle, professional)
      let adjustedAnswer = answer;
      if (confidence < 0.6 && !adjustedAnswer.includes('I don\'t have') && !adjustedAnswer.includes('limited')) {
        // Add a subtle qualifier at the start
        adjustedAnswer = `Based on what I can see in my knowledge base, ${adjustedAnswer.charAt(0).toLowerCase() + adjustedAnswer.slice(1)}`;
      }

      return {
        answer: adjustedAnswer,
        mode: 'normal',
        intent,
        topic,
        metadata: {
          templateUsed: template.name,
          clausesReferenced,
          standardsReferenced,
          confidence,
          uncertainty,
          sources: context.standards.map(s => s.code),
          learningDocsCount: context.learningDocs?.length || 0,
          examplesCount: (context.approvedExamples?.length || 0) + (context.badExamples?.length || 0)
        }
      };

    } catch (error: any) {
      console.warn('[VeraCoreEngine] Template filling error:', error.message);
      return {
        answer: this.generateFallbackResponse(intent, topic, context),
        mode: 'fallback',
        intent,
        topic,
        metadata: {
          error: error.message,
          reason: 'template_fill_error'
        }
      };
    }
  }

  /**
   * Calculate text similarity between two strings (simple Jaccard-based)
   */
  private static calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    if (text1 === text2) return 1;
    
    // Simple word-based similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Calculate confidence score for response
   */
  private static calculateConfidence(
    context: SemanticContext,
    template: AnswerTemplate | null,
    intent: string,
    topic: string | undefined
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost if we have relevant standards
    if (context.standards && context.standards.length > 0) {
      confidence += 0.15;
    }

    // Boost if we have learning docs
    if (context.learningDocs && context.learningDocs.length > 0) {
      confidence += 0.1;
      // Extra boost for approved quality docs
      const approvedCount = context.learningDocs.filter(d => d.quality === 'approved').length;
      if (approvedCount > 0) {
        confidence += 0.05;
      }
      // Boost for high semantic similarity scores
      const semanticDocs = context.learningDocs.filter((d: any) => d.similarityScore && d.similarityScore > 0.7);
      if (semanticDocs.length > 0) {
        const avgSimilarity = semanticDocs.reduce((sum: number, d: any) => sum + d.similarityScore, 0) / semanticDocs.length;
        confidence += Math.min(avgSimilarity * 0.2, 0.15); // Up to +0.15 for high similarity
      }
    }

    // Boost if we have examples
    if (context.approvedExamples && context.approvedExamples.length > 0) {
      confidence += 0.1;
    }

    // Boost if we have clauses
    if (context.clauses && context.clauses.length > 0) {
      confidence += 0.1;
    }

    // Boost if template is specific (not generic)
    if (template && template.name !== 'general.answer') {
      confidence += 0.05;
    }

    // Boost for specific intents
    if (intent === 'clause_question' && topic) {
      confidence += 0.05;
    }

    // Adjust for health status
    const adjustedConfidence = this.adjustConfidenceForHealth(confidence);

    // Cap at 0.95 (never 100% certain)
    return Math.min(adjustedConfidence, 0.95);
  }

  /**
   * Adjust confidence based on health status
   */
  private static adjustConfidenceForHealth(baseConfidence: number): number {
    const issues = veraEngineHealth.getCurrentIssues();
    if (issues.length === 0) return baseConfidence;

    const maxPriority = issues[0].priorityScore ?? 0;

    if (maxPriority >= 95) {
      // severe core issue
      return Math.min(baseConfidence, 0.4);
    }
    if (maxPriority >= 80) {
      return Math.min(baseConfidence, 0.6);
    }
    if (maxPriority >= 60) {
      return Math.min(baseConfidence, 0.7);
    }

    return baseConfidence;
  }

  /**
   * Build response when knowledge gap is detected
   */
  private static buildKnowledgeGapResponse(
    gap: KnowledgeGapRequest,
    intent: string,
    topic: string | undefined
  ): VeraResponse {
    const {
      requestType,
      standardCode,
      regulationRef,
      description,
      suggestedFolder,
      suggestedTag,
      requestedArtifactType
    } = gap;

    // Build friendly, specific request message
    const parts: string[] = [];
    
    parts.push(`I'm missing some key information to give you a proper, standards-accurate answer.`);
    parts.push('');
    parts.push(`**What I need:** ${description}`);
    
    if (standardCode) {
      const standardRef = regulationRef 
        ? `${standardCode} – ${regulationRef}`
        : standardCode;
      parts.push(`**Related standard/regulation:** ${standardRef}`);
    }
    
    if (suggestedFolder) {
      parts.push(`**Please place it here in your Requirements folders:** \`${suggestedFolder}\``);
    }
    
    if (suggestedTag) {
      parts.push(`**Mark/tag it as:** ${suggestedTag}`);
    }
    
    if (requestedArtifactType) {
      parts.push(`**Preferred file type:** ${requestedArtifactType.toUpperCase()}`);
    }
    
    parts.push('');
    parts.push(`Once you've added it and run the ingestion process (\`npm run ingest:requirements\`), I'll be able to pull it into my knowledge base and use it for future analyses.`);

    const answer = parts.filter(Boolean).join('\n');

    return {
      answer,
      mode: 'fallback',
      intent,
      topic,
      metadata: {
        knowledgeGapRequestId: gap.requestId,
        requestType: gap.requestType,
        reason: 'knowledge_gap_detected',
        standardCode: gap.standardCode || undefined
      }
    };
  }

  /**
   * Extract relevant snippet from text around a keyword/clause reference
   */
  private static extractRelevantSnippet(text: string, keyword: string, maxLength = 500): string {
    if (!text || !keyword) return text.substring(0, maxLength);
    
    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    const index = lowerText.indexOf(lowerKeyword);
    
    if (index === -1) {
      // Keyword not found, return beginning
      return text.substring(0, maxLength).trim();
    }
    
    // Extract context around the keyword
    const start = Math.max(0, index - 100);
    const end = Math.min(text.length, index + keyword.length + maxLength - 100);
    let snippet = text.substring(start, end).trim();
    
    // Try to start at sentence boundary
    const sentenceStart = snippet.search(/[.!?]\s+[A-Z]/);
    if (sentenceStart > 50) {
      snippet = snippet.substring(sentenceStart + 2);
    }
    
    // Truncate if too long
    if (snippet.length > maxLength) {
      snippet = snippet.substring(0, maxLength).trim();
      if (!snippet.endsWith('.') && !snippet.endsWith('!') && !snippet.endsWith('?')) {
        snippet += '...';
      }
    }
    
    return snippet;
  }

  /**
   * Handle self-diagnostic questions
   * Returns a formatted response listing all current issues
   */
  private static async handleSelfDiagnostic(
    userMessage: string,
    userId?: string
  ): Promise<string> {
    const issues = veraEngineHealth.getCurrentIssues();
    const userName = userId || 'there';
    const timeGreeting = this.getTimeOfDayGreeting();

    if (issues.length === 0) {
      return (
        `Good ${timeGreeting}, ${userName}. ` +
        `From what I can see at the moment, I'm not experiencing any active internal errors. ` +
        `Some capabilities may still be limited by configuration (such as which standards are parsed or which integrations are enabled), ` +
        `but my core engine appears healthy.\n\n` +
        `If something doesn't look right on your side, tell me what you're seeing and I'll help you trace it.`
      );
    }

    const lines = issues.map(issue => {
      const when = new Date(issue.firstSeen).toLocaleString();
      const severityWord =
        issue.severity === 'error'
          ? 'serious issue'
          : issue.severity === 'warning'
          ? 'limitation'
          : 'note';

      let description = '';

      switch (issue.code) {
        case 'DB_SCHEMA_MISMATCH':
          description =
            'I\'m seeing a mismatch between my expected database schema and what is actually deployed. ' +
            'This affects how I store or retrieve conversation data and other learned information.';
          break;

        case 'SEMANTIC_SEARCH_DISABLED':
          description =
            'My semantic search engine (pgvector) is not available. I can still answer questions, ' +
            'but I can\'t perform deep similarity search across your standards, regulations, and customer documents.';
          break;

        case 'CONVERSATION_MEMORY_ERROR':
          description =
            'I\'m having trouble saving or loading conversation memory. This means my ability to remember previous messages is limited.';
          break;

        case 'CORRECTION_PROCESSOR_ERROR':
          description =
            'My correction processor is not working correctly, so I may repeat behaviours that you already corrected instead of learning from them.';
          break;

        case 'RESPONSE_LOOP_DETECTED':
          description =
            'I\'ve detected that I am repeating the same answer to the same or very similar question. That usually indicates missing context or a misconfiguration.';
          break;

        case 'CONFIG_WARNING':
          description =
            issue.message ||
            'I have detected a configuration issue that may limit my capabilities.';
          break;

        default:
          description =
            issue.message ||
            'I have detected an internal condition, but I do not have a friendly description configured yet.';
      }

      return `• **${severityWord}** (${issue.code}) — first seen at ${when}\n  ${description}`;
    });

    return (
      `Good ${timeGreeting}, ${userName}. ` +
      `I am currently experiencing the following internal conditions:\n\n` +
      lines.join('\n\n') +
      `\n\nIf you'd like, I can help you prioritise which of these to address first. ` +
      `For example, fixing the schema mismatches in my memory tables will immediately improve my ability to respond more intelligently.`
    );
  }

  /**
   * Get time-of-day greeting
   */
  private static getTimeOfDayGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  /**
   * Handle self-triage questions
   * Returns prioritized list of issues with recommendations
   */
  private static async handleSelfTriage(userId?: string): Promise<string> {
    const issues = veraEngineHealth.getCurrentIssues();
    const userName = userId || 'there';
    const timeGreeting = this.getTimeOfDayGreeting();

    if (issues.length === 0) {
      return (
        `Good ${timeGreeting}, ${userName}. ` +
        `Right now I don't see any active internal issues. Fixing configuration or adding more standards will still make me more useful, ` +
        `but there's nothing urgent that is breaking my core capabilities.`
      );
    }

    const top = issues[0];
    const others = issues.slice(1);

    const topExplanation = this.explainIssueForHumans(top);
    const otherLines = others.map((issue, i) => {
      const rank = i + 2;
      const short = this.shortLabelForIssue(issue);
      return `${rank}. ${short}`;
    });

    let response =
      `Good ${timeGreeting}, ${userName}. Based on what I can see, ` +
      `the highest-impact issue to fix first is:\n\n` +
      `1. ${topExplanation}\n\n`;

    if (others.length > 0) {
      response +=
        `After that, I would address the following in this order:\n` +
        otherLines.join('\n') +
        `\n\nFocusing on the top one will give you the biggest improvement in my performance.`;
    } else {
      response +=
        `Once that is corrected, you should see a noticeable improvement in how I understand context and respond.`;
    }

    return response;
  }

  /**
   * Explain an issue in human-friendly terms
   */
  private static explainIssueForHumans(issue: VeraIssue): string {
    const severityWord =
      issue.severity === 'error'
        ? 'serious issue'
        : issue.severity === 'warning'
        ? 'limitation'
        : 'note';

    let description = '';

    switch (issue.code) {
      case 'DB_SCHEMA_MISMATCH':
        description =
          `**${severityWord}** (${issue.code}) – I'm seeing a mismatch between my expected database schema and what is actually deployed. ` +
          `This affects how I store or retrieve conversation data and other learned information. ` +
          `This is the most critical because it breaks core abilities like memory and learning.`;
        break;

      case 'CONVERSATION_MEMORY_ERROR':
        description =
          `**${severityWord}** (${issue.code}) – I'm having trouble saving or loading conversation memory. ` +
          `This means my ability to remember previous messages is limited, which severely hurts my contextual reasoning.`;
        break;

      case 'SEMANTIC_SEARCH_DISABLED':
        description =
          `**${severityWord}** (${issue.code}) – My semantic search engine (pgvector) is not available. ` +
          `I can still answer questions, but I can't perform deep similarity search across your standards, regulations, and customer documents. ` +
          `This makes me less intelligent but still usable.`;
        break;

      case 'CORRECTION_PROCESSOR_ERROR':
        description =
          `**${severityWord}** (${issue.code}) – My correction processor is not working correctly, ` +
          `so I may repeat behaviours that you already corrected instead of learning from them. This hurts my learning over time.`;
        break;

      case 'RESPONSE_LOOP_DETECTED':
        description =
          `**${severityWord}** (${issue.code}) – I've detected that I am repeating the same answer to the same or very similar question. ` +
          `This is bad UX, but it's often a symptom of missing context or a misconfiguration rather than the root cause.`;
        break;

      case 'CONFIG_WARNING':
        description =
          `**${severityWord}** (${issue.code}) – ${issue.message || 'I have detected a configuration issue that may limit my capabilities.'}`;
        break;

      default:
        description =
          `**${severityWord}** (${issue.code}) – ${issue.message || 'I have detected an internal condition, but I do not have a friendly description configured yet.'}`;
    }

    return description;
  }

  /**
   * Short label for an issue (for ordered lists)
   */
  private static shortLabelForIssue(issue: VeraIssue): string {
    switch (issue.code) {
      case 'DB_SCHEMA_MISMATCH':
        return `${issue.code} – Database schema mismatch affecting core abilities`;
      case 'CONVERSATION_MEMORY_ERROR':
        return `${issue.code} – Memory storage/retrieval issues`;
      case 'SEMANTIC_SEARCH_DISABLED':
        return `${issue.code} – Semantic search unavailable (pgvector missing)`;
      case 'CORRECTION_PROCESSOR_ERROR':
        return `${issue.code} – Correction learning disabled`;
      case 'RESPONSE_LOOP_DETECTED':
        return `${issue.code} – Response loop detected`;
      case 'CONFIG_WARNING':
        return `${issue.code} – Configuration warning`;
      default:
        return `${issue.code} – ${issue.message.substring(0, 60)}${issue.message.length > 60 ? '...' : ''}`;
    }
  }

  /**
   * Handle self-debug-history questions
   * Returns summary of recent issues from both in-memory and database
   */
  private static async handleSelfDebugHistory(message: string): Promise<string> {
    // Extract limit from message if present
    const limitMatch = message.match(/(\d+)/);
    const limit = limitMatch ? parseInt(limitMatch[1], 10) : 5;

    const current = veraEngineHealth.getCurrentIssues();
    
    // Try to fetch from database
    let recentFromDb: any[] = [];
    try {
      const { queryEdcatAI } = await import('../../config/databases.js');
      const result = await queryEdcatAI(
        `SELECT 
          issue_code,
          severity,
          message,
          first_seen,
          last_seen,
          occurrences
        FROM edcat.vera_debug_sessions
        ORDER BY last_seen DESC
        LIMIT $1`,
        [limit]
      ).catch(() => ({ rows: [] }));
      recentFromDb = result.rows || [];
    } catch (err: any) {
      console.warn('[VeraCoreEngine] Could not fetch debug history from DB:', err.message);
    }

    const timeGreeting = this.getTimeOfDayGreeting();

    if (current.length === 0 && recentFromDb.length === 0) {
      return (
        `Good ${timeGreeting}. ` +
        `I don't have any recent issues recorded in my history. ` +
        `This suggests my systems have been running smoothly.`
      );
    }

    const parts: string[] = [];
    parts.push(`Good ${timeGreeting}. In my recent history, I have recorded:`);
    parts.push('');

    // Current active issues
    if (current.length > 0) {
      parts.push(`**Currently Active Issues:** ${current.length} distinct issue type(s), ${current.reduce((sum, i) => sum + i.occurrences, 0)} total occurrences`);
      current.slice(0, 3).forEach((issue, idx) => {
        const when = new Date(issue.firstSeen).toLocaleString();
        parts.push(`${idx + 1}. ${issue.code} (${issue.severity}) – first seen ${when}, occurred ${issue.occurrences} time(s)`);
      });
      if (current.length > 3) {
        parts.push(`   ... and ${current.length - 3} more active issue(s)`);
      }
      parts.push('');
    }

    // Historical issues from DB
    if (recentFromDb.length > 0) {
      const distinctTypes = new Set(recentFromDb.map(r => r.issue_code)).size;
      const totalOccurrences = recentFromDb.reduce((sum, r) => sum + (r.occurrences || 1), 0);
      
      parts.push(`**Recent History (from database):** ${distinctTypes} distinct issue type(s), ${totalOccurrences} total occurrences`);
      recentFromDb.slice(0, 3).forEach((record, idx) => {
        const when = new Date(record.last_seen).toLocaleString();
        parts.push(`${idx + 1}. ${record.issue_code} (${record.severity}) – last seen ${when}, occurred ${record.occurrences || 1} time(s)`);
      });
      if (recentFromDb.length > 3) {
        parts.push(`   ... and ${recentFromDb.length - 3} more historical record(s)`);
      }
    }

    parts.push('');
    parts.push(`You can ask me "what should we fix first?" to get a prioritized list of the most important issues to address.`);

    return parts.join('\n');
  }

  /**
   * Handle self-remedy questions
   * Returns actionable remediation steps for the highest-priority issue
   */
  private static async handleSelfRemedy(message: string, userId?: string): Promise<string> {
    const issues = veraEngineHealth.getCurrentIssues();
    const userName = userId || 'there';
    const timeGreeting = this.getTimeOfDayGreeting();

    if (issues.length === 0) {
      return (
        `Good ${timeGreeting}, ${userName}. ` +
        `I don't currently have any active issues that need remediation. ` +
        `If you're experiencing problems, please describe what you're seeing and I'll help diagnose it.`
      );
    }

    // Get the highest-priority issue
    const topIssue = issues[0];
    const otherIssues = issues.slice(1);

    const parts: string[] = [];
    parts.push(`Good ${timeGreeting}, ${userName}. Based on my current issues, here's what I recommend:`);
    parts.push('');

    // Explain the issue and root cause
    parts.push(`**Issue:** ${topIssue.code} (${topIssue.severity})`);
    if (topIssue.likelyRootCause) {
      parts.push(`**Likely Root Cause:** ${topIssue.likelyRootCause}`);
    }
    parts.push('');

    // Check for historically successful remedies first
    let bestRemedy: string | null = null;
    try {
      const { VeraRemedyLearningService } = await import('./VeraRemedyLearningService.js');
      bestRemedy = await VeraRemedyLearningService.getBestRemedyForIssue(topIssue.code);
    } catch (err: any) {
      // Non-fatal - continue with default remedies
    }

    // Provide recommended actions
    if (topIssue.recommendedActions && topIssue.recommendedActions.length > 0) {
      parts.push(`**Recommended Actions:**`);
      
      // If we have a historically successful remedy, mention it first
      if (bestRemedy) {
        parts.push(`⭐ **Most Successful Remedy (based on history):** ${bestRemedy}`);
        parts.push('');
        parts.push(`**Other Recommended Actions:**`);
      }
      
      topIssue.recommendedActions.forEach((action, idx) => {
        // Skip if this action matches the best remedy (already shown)
        if (bestRemedy && action.toLowerCase().includes(bestRemedy.toLowerCase().substring(0, 30))) {
          return;
        }
        const num = bestRemedy ? idx + 1 : idx + 1;
        parts.push(`${num}. ${action}`);
      });
    } else {
      parts.push(`**Recommended Actions:**`);
      if (bestRemedy) {
        parts.push(`⭐ **Most Successful Remedy (based on history):** ${bestRemedy}`);
        parts.push('');
      }
      parts.push(`${bestRemedy ? '2' : '1'}. Review the error details in my health endpoint: \`GET /api/vera/health\``);
      parts.push(`${bestRemedy ? '3' : '2'}. Check application logs for specific error messages related to ${topIssue.code}`);
      parts.push(`${bestRemedy ? '4' : '3'}. Verify database schema and connection strings are correct`);
    }

    parts.push('');

    // Mention other issues if present
    if (otherIssues.length > 0) {
      parts.push(`**Other Issues to Address:**`);
      otherIssues.slice(0, 3).forEach((issue, idx) => {
        parts.push(`${idx + 1}. ${this.shortLabelForIssue(issue)}`);
      });
      if (otherIssues.length > 3) {
        parts.push(`   ... and ${otherIssues.length - 3} more issue(s)`);
      }
      parts.push('');
      parts.push(`After fixing the top issue, ask me "what should we fix next?" for the next priority.`);
    }

    parts.push('');
    parts.push(`Once you've applied these fixes, you can ask me to verify by saying "verify fixes" or "run self-test".`);
    parts.push(`You can also tell me "I applied [remedy]" so I can track which fixes work best.`);

    return parts.join('\n');
  }

  /**
   * Handle self-test requests
   * Runs diagnostic tests and reports results
   */
  private static async handleSelfTest(userId?: string): Promise<string> {
    const userName = userId || 'there';
    const timeGreeting = this.getTimeOfDayGreeting();

    try {
      const { VeraSelfTestService } = await import('./VeraSelfTestService.js');
      const report = await VeraSelfTestService.runAllTests();
      const formattedReport = VeraSelfTestService.formatTestReport(report);

      const parts: string[] = [];
      parts.push(`Good ${timeGreeting}, ${userName}. I've run a comprehensive self-test. Here are the results:`);
      parts.push('');
      parts.push(formattedReport);

      // If tests passed, check if we should clear any issues and record resolutions
      if (report.overallStatus === 'PASS') {
        const issues = veraEngineHealth.getCurrentIssues();
        if (issues.length > 0) {
          parts.push('');
          parts.push(`Note: I still have ${issues.length} issue(s) recorded in my health registry. `);
          parts.push(`If you've fixed them, they should clear automatically on the next occurrence check.`);
        } else {
          // All tests passed and no issues - check for remedy resolutions
          try {
            const { VeraRemedyLearningService } = await import('./VeraRemedyLearningService.js');
            await VeraRemedyLearningService.checkAndRecordResolutions();
          } catch (err: any) {
            // Non-fatal
          }
        }
      } else {
      parts.push('');
      parts.push(`Some tests failed. You can ask me "what do you recommend?" for specific remediation steps.`);
      }

      return parts.join('\n');
    } catch (error: any) {
      return (
        `Good ${timeGreeting}, ${userName}. ` +
        `I encountered an error while running self-tests: ${error.message}. ` +
        `Please check the application logs for more details.`
      );
    }
  }

  /**
   * Handle remedy application recording
   * Records when user applies a remedy so Vera can learn
   */
  private static async handleRemedyApplication(message: string, userId?: string): Promise<string> {
    const userName = userId || 'there';
    const timeGreeting = this.getTimeOfDayGreeting();
    const issues = veraEngineHealth.getCurrentIssues();

    try {
      const { VeraRemedyLearningService } = await import('./VeraRemedyLearningService.js');
      
      // Try to extract issue code and remedy from message
      let issueCode: string | null = null;
      let remedyAction = message;

      // Check if message mentions a specific issue
      for (const issue of issues) {
        if (message.toLowerCase().includes(issue.code.toLowerCase()) || 
            message.toLowerCase().includes(issue.code.replace(/_/g, ' ').toLowerCase())) {
          issueCode = issue.code;
          break;
        }
      }

      // Extract remedy action (remove common phrases)
      remedyAction = remedyAction
        .replace(/^(i\s+(applied|fixed|ran|executed|completed)|remedy\s+applied|fix\s+applied)/i, '')
        .replace(/^(done\s+fixing|migration\s+(applied|run))/i, '')
        .trim();

      if (!issueCode && issues.length > 0) {
        // Default to highest priority issue
        issueCode = issues[0].code;
      }

      if (issueCode && remedyAction.length > 10) {
        // Record the remedy application
        await VeraRemedyLearningService.recordRemedyApplication(
          issueCode as any,
          remedyAction,
          userId || undefined,
          `User reported applying remedy: ${remedyAction.substring(0, 200)}`
        );

        return (
          `Good ${timeGreeting}, ${userName}. ` +
          `I've recorded that you applied: "${remedyAction.substring(0, 100)}${remedyAction.length > 100 ? '...' : ''}" ` +
          `for issue ${issueCode}. ` +
          `I'll track whether this resolves the issue and use that information to improve my future recommendations. ` +
          `You can ask me to verify by saying "run self-test" or "verify fixes".`
        );
      } else {
        return (
          `Good ${timeGreeting}, ${userName}. ` +
          `I understand you've applied a fix, but I need more details. ` +
          `Please tell me which issue you fixed (e.g., "I fixed DB_SCHEMA_MISMATCH by running migration 041") ` +
          `or what action you took (e.g., "I ran the migration to add the missing column").`
        );
      }
    } catch (error: any) {
      return (
        `Good ${timeGreeting}, ${userName}. ` +
        `I encountered an error while recording your remedy application: ${error.message}. ` +
        `The information wasn't saved, but you can try again with more details.`
      );
    }
  }

  /**
   * Handle remedy effectiveness questions
   * Shows which remedies have worked best historically
   */
  private static async handleRemedyEffectiveness(message: string): Promise<string> {
    const timeGreeting = this.getTimeOfDayGreeting();

    try {
      const { VeraRemedyLearningService } = await import('./VeraRemedyLearningService.js');
      
      // Try to extract issue code from message
      const issues = veraEngineHealth.getCurrentIssues();
      let issueCode: string | undefined;
      
      for (const issue of issues) {
        if (message.toLowerCase().includes(issue.code.toLowerCase()) || 
            message.toLowerCase().includes(issue.code.replace(/_/g, ' ').toLowerCase())) {
          issueCode = issue.code;
          break;
        }
      }

      const effectiveness = await VeraRemedyLearningService.getRemedyEffectiveness(
        issueCode as any
      );

      if (effectiveness.length === 0) {
        return (
          `Good ${timeGreeting}. ` +
          `I don't have any historical data on remedy effectiveness yet. ` +
          `As you apply fixes and I detect resolutions, I'll build up statistics on which remedies work best. ` +
          `You can help by telling me when you apply a remedy (e.g., "I applied migration 041").`
        );
      }

      const parts: string[] = [];
      parts.push(`Good ${timeGreeting}. Here's what I've learned about remedy effectiveness:`);
      parts.push('');

      if (issueCode) {
        parts.push(`**For ${issueCode}:**`);
      } else {
        parts.push(`**Overall Remedy Statistics:**`);
      }

      effectiveness.slice(0, 5).forEach((eff, idx) => {
        const successPercent = (eff.successRate * 100).toFixed(0);
        const avgTime = eff.averageResolutionTime 
          ? `${Math.round(eff.averageResolutionTime / 1000)}s`
          : 'N/A';
        
        parts.push(`${idx + 1}. **${eff.remedyAction.substring(0, 80)}${eff.remedyAction.length > 80 ? '...' : ''}**`);
        parts.push(`   Success rate: ${successPercent}% (${eff.successfulResolutions}/${eff.totalApplications} successful)`);
        if (eff.averageResolutionTime) {
          parts.push(`   Average resolution time: ${avgTime}`);
        }
        parts.push('');
      });

      if (effectiveness.length > 5) {
        parts.push(`   ... and ${effectiveness.length - 5} more remedy(ies)`);
        parts.push('');
      }

      parts.push(`The remedies are sorted by success rate, so the most effective ones are listed first.`);

      return parts.join('\n');
    } catch (error: any) {
      return (
        `Good ${timeGreeting}. ` +
        `I encountered an error while retrieving remedy effectiveness data: ${error.message}. ` +
        `Please try again later.`
      );
    }
  }

  /**
   * Handle cross-standard comparison
   */
  private static async handleCrossStandardComparison(
    message: string,
    topic: string | undefined,
    tenantId: string
  ): Promise<string | null> {
    try {
      // Extract two standards from message
      const standardPattern = /\b(AS9100[A-Z]?|AS9110[A-Z]?|AS9120[A-Z]?|ISO\s*9001|ISO\s*13485|FAA\s*Part\s*\d+|CASA|EASA|UK\s*CAA|IATF\s*16949)\b/gi;
      const matches = Array.from(message.matchAll(standardPattern));
      
      if (matches.length < 2) {
        return null; // Need at least 2 standards to compare
      }

      const standardA = matches[0][1].toUpperCase().replace(/\s+/g, '_');
      const standardB = matches[1][1].toUpperCase().replace(/\s+/g, '_');

      // Extract clause references if present
      const clausePattern = /\b(\d+\.\d+(?:\.\d+)?)\b/g;
      const clauseMatches = Array.from(message.matchAll(clausePattern));
      const clauseA = clauseMatches.length > 0 ? clauseMatches[0][1] : undefined;
      const clauseB = clauseMatches.length > 1 ? clauseMatches[1][1] : clauseA; // Use same clause if only one mentioned

      // Perform comparison
      const comparison = await VeraCrossStandardReasoning.compareStandards({
        standardA,
        clauseA,
        standardB,
        clauseB,
        tenantId
      });

      // Format and return
      return VeraCrossStandardReasoning.formatComparison(comparison);
    } catch (error: any) {
      console.error('[VeraCoreEngine] Error in cross-standard comparison:', error.message);
      return null;
    }
  }

  /**
   * Build procedure draft from approved and bad examples using template generator
   */
  private static async buildProcedureDraftFromExamples(
    context: SemanticContext,
    standardCode: string,
    clauseRef?: string
  ): Promise<string> {
    const good = context.approvedExamples || [];
    const bad = context.badExamples || [];
    
    if (good.length === 0 && bad.length === 0) {
      return `I don't have approved or bad examples for ${standardCode}${clauseRef ? ` clause ${clauseRef}` : ''} in my database. Please ensure examples are ingested via the Requirements folder.`;
    }
    
    // Use VeraTemplateGenerator for dynamic template generation
    const template = VeraTemplateGenerator.generateTemplateFromExamples(
      standardCode,
      clauseRef,
      good
    );
    
    const parts: string[] = [];
    parts.push(`This draft procedure template is generated from ${good.length} approved example(s) for ${standardCode}${clauseRef ? ` clause ${clauseRef}` : ''}.`);
    parts.push('');
    
    // Add generated template
    parts.push(VeraTemplateGenerator.formatTemplate(template));
    parts.push('');
    
    // Add bad example warnings if available
    if (bad.length > 0) {
      parts.push('**⚠️ Patterns to Avoid (from bad examples):**');
      parts.push('');
      bad.slice(0, 2).forEach((ex, idx) => {
        const warnings = this.summarizeBadPatterns(ex.content_text, clauseRef);
        parts.push(`${idx + 1}. From ${ex.file_name} (quality score: ${ex.quality_score}):`);
        parts.push(warnings);
        parts.push('');
      });
    }
    
    return parts.join('\n');
  }

  /**
   * Summarize approved example content
   */
  private static summarizeExample(contentText: string, clauseRef?: string): string {
    // Extract main headings and key sentences
    const lines = contentText.split('\n').filter(l => l.trim().length > 0);
    const headings = lines.filter(l => /^[A-Z][A-Z\s]+$/.test(l.trim()) || /^\d+\.\s+[A-Z]/.test(l.trim()));
    const keySentences = lines
      .filter(l => l.length > 50 && l.length < 200)
      .filter(l => !headings.includes(l))
      .slice(0, 3);
    
    const parts: string[] = [];
    if (headings.length > 0) {
      parts.push(`Structure: ${headings.slice(0, 3).join(', ')}`);
    }
    if (keySentences.length > 0) {
      parts.push(`Key points: ${keySentences.join(' ')}`);
    }
    if (clauseRef && contentText.toLowerCase().includes(clauseRef.toLowerCase())) {
      parts.push(`✓ References clause ${clauseRef}`);
    }
    
    return parts.length > 0 ? parts.join('\n') : contentText.substring(0, 200) + '...';
  }

  /**
   * Summarize bad patterns from bad examples
   */
  private static summarizeBadPatterns(contentText: string, clauseRef?: string): string {
    const warnings: string[] = [];
    
    // Check for missing elements
    if (!contentText.toLowerCase().includes('responsibility') && !contentText.toLowerCase().includes('responsible')) {
      warnings.push('⚠ Missing clear responsibility assignment');
    }
    if (!contentText.toLowerCase().includes('record') && !contentText.toLowerCase().includes('document')) {
      warnings.push('⚠ Missing record/documentation requirements');
    }
    if (clauseRef && !contentText.toLowerCase().includes(clauseRef.toLowerCase())) {
      warnings.push(`⚠ Does not reference clause ${clauseRef}`);
    }
    if (contentText.length < 500) {
      warnings.push('⚠ Content appears too brief/incomplete');
    }
    
    // Extract problematic sentences
    const problematic = contentText.split(/[.!?]/)
      .filter(s => s.length > 30 && s.length < 150)
      .filter(s => s.toLowerCase().includes('not') || s.toLowerCase().includes('no') || s.toLowerCase().includes('never'))
      .slice(0, 2);
    
    if (problematic.length > 0) {
      warnings.push(`Issues found: ${problematic.join('; ')}`);
    }
    
    return warnings.length > 0 ? warnings.join('\n') : 'Review needed - example marked as low quality.';
  }

  private static generateFallbackResponse(
    intent: string,
    topic: string | undefined,
    context: SemanticContext
  ): string {
    // If we have document content, use it in the fallback
    if (context.documentContent.length > 0) {
      const doc = context.documentContent[0];
      const snippet = doc.contentText.substring(0, 500).trim();
      const standardCode = doc.standardCode || topic || 'the standard';
      return `Based on ${standardCode}, here's what I found:\n\n${snippet}${snippet.length < doc.contentText.length ? '...' : ''}`;
    }
    
    // If we have examples, reference them
    if (context.examples.length > 0) {
      const example = context.examples[0];
      const snippet = example.contentText.substring(0, 400).trim();
      return `Here's an approved example from ${example.fileName}:\n\n${snippet}${snippet.length < example.contentText.length ? '...' : ''}`;
    }
    if (intent === 'clause_question' && topic) {
      return `I found information about clause ${topic}. However, I need more context from your database to provide a complete answer. Please ensure the relevant standard and clause data is loaded.`;
    }

    if (intent === 'standard_question' && topic) {
      return `I can help with ${topic}, but I need more information from your compliance database. Please ensure standards are properly loaded.`;
    }

    return 'I understand your question, but I need more context from your compliance database to provide a precise answer. Could you specify which standard or clause you\'re asking about?';
  }

  // ==========================================================================
  // Pipeline Step 5: Record Conversation Turn
  // ==========================================================================

  private static async recordConversationTurn(params: {
    tenantId: string;
    sessionId: string;
    userId: string;
    message: string;
    response: string;
    intent?: string;
    topic?: string;
    subIntent?: string;
    mode: 'normal' | 'fallback' | 'error';
    metadata?: any;
  }): Promise<void> {
    const {
      tenantId,
      sessionId,
      userId,
      message,
      response,
      intent,
      topic,
      subIntent,
      mode,
      metadata
    } = params;

    try {
      // Ensure conversation state exists
      await queryEdcatAI(
        `INSERT INTO edcat.ai_conversation_state 
         (tenant_id, session_id, persona_code, last_intent, last_topic, context, updated_at)
         VALUES ($1, $2, 'vera', $3, $4, $5, NOW())
         ON CONFLICT (tenant_id, session_id, persona_code)
         DO UPDATE SET 
           last_intent = EXCLUDED.last_intent,
           last_topic = EXCLUDED.last_topic,
           context = EXCLUDED.context,
           updated_at = NOW()`,
        [
          tenantId,
          sessionId,
          intent || null,
          topic || null,
          JSON.stringify({ subIntent, mode, ...metadata })
        ]
      );

      // ITERATION 3: Generate embedding for user message for semantic search
      let userEmbedding: any = null;
      try {
        const { default: VeraSemanticMemory } = await import('./VeraSemanticMemory.js');
        const embedding = await VeraSemanticMemory.embedText(message).catch(() => null);
        if (embedding) {
          userEmbedding = JSON.stringify(embedding);
        }
      } catch (embedError) {
        // Non-fatal - embedding generation failed, continue without it
        console.warn('[VeraCoreEngine] Could not generate embedding for user message:', embedError);
      }

      // Record user message with embedding (if column exists)
      try {
        await queryEdcatAI(
          `INSERT INTO edcat.ai_conversation_history 
           (tenant_id, session_id, user_id, persona_code, role, message, message_text, intent, metadata, embedding, created_at)
           VALUES ($1, $2, $3, 'vera', 'user', $4, $4, $5, $6, $7, NOW())`,
          [
            tenantId,
            sessionId,
            userId || '00000000-0000-0000-0000-000000000000',
            message,
            intent || null,
            JSON.stringify({ topic, subIntent }),
            userEmbedding
          ]
        );
      } catch (embedErr: any) {
        // If embedding column doesn't exist, try without it
        if (embedErr?.message?.includes('embedding') && embedErr?.message?.includes('does not exist')) {
          veraEngineHealth.recordIssue(
            'DB_SCHEMA_MISMATCH',
            'The embedding column does not exist in ai_conversation_history. Semantic search over conversation history is disabled.',
            'warning',
            { rawError: embedErr.message, source: 'VeraCoreEngine', operation: 'insert_user_message' }
          );
          // Fallback: insert without embedding
          await queryEdcatAI(
            `INSERT INTO edcat.ai_conversation_history 
             (tenant_id, session_id, user_id, persona_code, role, message, message_text, intent, metadata, created_at)
             VALUES ($1, $2, $3, 'vera', 'user', $4, $4, $5, $6, NOW())`,
            [
              tenantId,
              sessionId,
              userId || '00000000-0000-0000-0000-000000000000',
              message,
              intent || null,
              JSON.stringify({ topic, subIntent })
            ]
          );
        } else {
          throw embedErr; // Re-throw if it's a different error
        }
      }

      // ITERATION 3: Generate embedding for assistant response for semantic search
      let assistantEmbedding: any = null;
      try {
        const { default: VeraSemanticMemory } = await import('./VeraSemanticMemory.js');
        const embedding = await VeraSemanticMemory.embedText(response).catch(() => null);
        if (embedding) {
          assistantEmbedding = JSON.stringify(embedding);
        }
      } catch (embedError) {
        // Non-fatal - embedding generation failed, continue without it
        console.warn('[VeraCoreEngine] Could not generate embedding for assistant response:', embedError);
      }

      // Record assistant response with embedding (if column exists)
      try {
        await queryEdcatAI(
          `INSERT INTO edcat.ai_conversation_history 
           (tenant_id, session_id, user_id, persona_code, role, message, message_text, intent, metadata, embedding, created_at)
           VALUES ($1, $2, $3, 'vera', 'assistant', $4, $4, $5, $6, $7, NOW())`,
          [
            tenantId,
            sessionId,
            userId || '00000000-0000-0000-0000-000000000000',
            response,
            intent || null,
            JSON.stringify({ topic, subIntent, mode, ...metadata }),
            assistantEmbedding
          ]
        );
      } catch (embedErr: any) {
        // If embedding column doesn't exist, try without it
        if (embedErr?.message?.includes('embedding') && embedErr?.message?.includes('does not exist')) {
          // Already recorded above, just fallback
          await queryEdcatAI(
            `INSERT INTO edcat.ai_conversation_history 
             (tenant_id, session_id, user_id, persona_code, role, message, message_text, intent, metadata, created_at)
             VALUES ($1, $2, $3, 'vera', 'assistant', $4, $4, $5, $6, NOW())`,
            [
              tenantId,
              sessionId,
              userId || '00000000-0000-0000-0000-000000000000',
              response,
              intent || null,
              JSON.stringify({ topic, subIntent, mode, ...metadata })
            ]
          );
        } else {
          throw embedErr; // Re-throw if it's a different error
        }
      }

      // Update conversation_memory if it exists
      try {
        await queryEdcatAI(
          `INSERT INTO edcat.conversation_memory 
           (tenant_id, session_id, user_id, message_text, role, created_at)
           VALUES ($1, $2, $3, $4, 'user', NOW())`,
          [tenantId, sessionId, userId, message]
        );

        await queryEdcatAI(
          `INSERT INTO edcat.conversation_memory 
           (tenant_id, session_id, user_id, message_text, role, created_at)
           VALUES ($1, $2, $3, $4, 'assistant', NOW())`,
          [tenantId, sessionId, userId, response]
        );
      } catch (err: any) {
        // conversation_memory might not exist or role column might be missing
        const errorMessage = err?.message || String(err);
        const isRoleColumnMissing = /column "role" .* does not exist/i.test(errorMessage);
        
        if (isRoleColumnMissing) {
          // Fallback: try without role column
          try {
            await queryEdcatAI(
              `INSERT INTO edcat.conversation_memory 
               (tenant_id, session_id, user_id, message_text, created_at)
               VALUES ($1, $2, $3, $4, NOW())`,
              [tenantId, sessionId, userId, message]
            );

            await queryEdcatAI(
              `INSERT INTO edcat.conversation_memory 
               (tenant_id, session_id, user_id, message_text, created_at)
               VALUES ($1, $2, $3, $4, NOW())`,
              [tenantId, sessionId, userId, response]
            );
          } catch (fallbackErr: any) {
            // Even fallback failed - table might not exist
            console.warn('[VeraCoreEngine] Could not update conversation_memory (fallback also failed):', fallbackErr.message);
            veraEngineHealth.recordIssue(
              'DB_SCHEMA_MISMATCH',
              'I am unable to store conversation memory. The conversation_memory table may be missing or have a schema mismatch.',
              'warning',
              { rawError: fallbackErr.message, source: 'VeraCoreEngine', operation: 'update_conversation_memory_fallback' }
            );
          }
        } else {
          // Different error - log it
          console.warn('[VeraCoreEngine] Could not update conversation_memory:', errorMessage);
          const isSchema = /column .* does not exist/i.test(errorMessage);
          veraEngineHealth.recordIssue(
            isSchema ? 'DB_SCHEMA_MISMATCH' : 'CONVERSATION_MEMORY_ERROR',
            'I am unable to store new conversation entries because my memory table schema does not match my code.',
            isSchema ? 'error' : 'warning',
            { rawError: errorMessage, source: 'VeraCoreEngine', operation: 'update_conversation_memory' }
          );
        }
      }

    } catch (error: any) {
      console.error('[VeraCoreEngine] Failed to record conversation turn:', error.message);
      // Non-fatal - continue even if logging fails
    }
  }

  // ==========================================================================
  // Pipeline Step 6: Apply Learning from Feedback
  // ==========================================================================

  private static async applyLearningFromFeedback(params: {
    tenantId: string;
    sessionId: string;
    userId: string;
    message: string;
    previousResponse: string;
    intent?: string;
    topic?: string;
  }): Promise<void> {
    const { tenantId, sessionId, userId, message, previousResponse, intent, topic } = params;

    // Use VeraCorrectionProcessor for enhanced learning
    try {
      // Check if message indicates a correction
      const lowerMessage = message.toLowerCase();
      const isCorrection = lowerMessage.match(/\b(no|wrong|incorrect|actually|correction|that's not|that is not|you're wrong|you are wrong|that was wrong|that's incorrect)\b/i);
      
      if (isCorrection) {
        // Get the previous question from conversation history
        const prevQuestionResult = await queryEdcatAI(
          `SELECT message_text, intent, metadata
           FROM edcat.ai_conversation_history
           WHERE tenant_id = $1 AND session_id = $2
             AND role = 'user'
           ORDER BY created_at DESC
           LIMIT 1`,
          [tenantId, sessionId]
        ).catch(() => ({ rows: [] }));

        const previousQuestion = prevQuestionResult.rows[0]?.message_text || message;
        const prevMetadata = prevQuestionResult.rows[0]?.metadata || {};
        const prevTopic = topic || prevMetadata.topic || undefined;
        const prevStandardCode = this.extractStandardCode(previousQuestion) || undefined;
        const prevClauseRef = prevTopic && /^[0-9]+\.[0-9]/.test(prevTopic) ? prevTopic : undefined;

        // Process correction using VeraCorrectionProcessor
        await VeraCorrectionProcessor.processCorrection({
          tenantId,
          sessionId,
          userId,
          previousQuestion,
          previousAnswer: previousResponse,
          correctionText: message,
          intent: intent || prevQuestionResult.rows[0]?.intent,
          topic: prevTopic,
          standardCode: prevStandardCode,
          clauseRef: prevClauseRef
        });
      }

      // Store important facts using VeraMemoryService
      const detectedStandard = this.extractStandardCode(message);
      if (detectedStandard && topic) {
        await VeraMemoryService.learnFact({
          tenantId,
          key: `standard:${detectedStandard}:${topic}`,
          value: {
            question: message,
            answer: previousResponse,
            intent
          },
          standardCode: detectedStandard,
          topic,
          confidence: 0.7,
          source: 'conversation'
        });
      }

      // Store successful intent pattern for future learning
      if (intent && intent !== 'general_query') {
        await VeraIntentLearner.storeIntentPattern({
          tenantId,
          message,
          intent,
          topic,
          success: true // Assume success if no correction
        });
      }
    } catch (error: any) {
      console.warn('[VeraCoreEngine] Learning error (non-fatal):', error.message);
    }
  }

  private static async createLearningEventTable(): Promise<void> {
    try {
      await queryEdcatAI(`
        CREATE TABLE IF NOT EXISTS edcat.ai_learning_event (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          user_id UUID,
          event_type TEXT NOT NULL,
          original_reply TEXT NOT NULL,
          user_correction TEXT NOT NULL,
          topic TEXT,
          clause_ref TEXT,
          status TEXT NOT NULL DEFAULT 'pending_review',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await queryEdcatAI(`
        CREATE INDEX IF NOT EXISTS idx_ai_learning_event_tenant 
        ON edcat.ai_learning_event(tenant_id, status)
      `);
    } catch (err: any) {
      console.warn('[VeraCoreEngine] Failed to create learning event table:', err.message);
    }
  }
}

// Export convenience function
export async function generateVeraResponse(req: VeraRequest): Promise<VeraResponse> {
  return VeraCoreEngine.generateVeraResponse(req);
}

export default VeraCoreEngine;

