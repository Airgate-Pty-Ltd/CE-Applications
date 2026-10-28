/**
 * Vera Reasoning Engine
 * Central reasoning layer that interprets intent, maps to knowledge sources,
 * and provides structured reasoning results for response generation.
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';
import VeraQueryResponseService from './VeraQueryResponseService.js';
import VeraPersonaSpecificationService from './VeraPersonaSpecificationService.js';
import VeraParserSupervisorService from './VeraParserSupervisorService.js';
import { runVera } from '../../vera/veraEngine.js';
import VeraDebugService, { isDebugMessage, handleDebugRequest } from './VeraDebugService.js';
import VeraIntentClassifier from './VeraIntentClassifier.js';
import VeraKnowledgeRetrievalService from './VeraKnowledgeRetrievalService.js';
import VeraAnswerPlanner from './VeraAnswerPlanner.js';
import VeraQualityReasoningService from './VeraQualityReasoningService.js';
import VeraRegulatoryReasoningService from './VeraRegulatoryReasoningService.js';
import VeraGenericTechnicalReasoningService from './VeraGenericTechnicalReasoningService.js';
import VeraGreetingService from './VeraGreetingService.js';
import { classifyIntent as classifyIntentWithDomain, shouldUseTeachMeFallback } from './VeraIntentService.js';
import VeraDocumentNumberingResponse from './VeraDocumentNumberingResponse.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * @typedef {Object} ReasoningInput
 * @property {string} tenantId
 * @property {string} message
 * @property {string} intent
 * @property {Object} [conversationContext]   // from ai_conversation_state/context
 * @property {Object} [persona]               // from ai_persona_profile / persona spec
 * @property {Object} [standardContext]       // info about selected standards, if any
 * @property {Object} [rawContext]            // any other context from chat.js / middleware
 */

/**
 * @typedef {Object} CandidateSource
 * @property {string} sourceType              // 'qna', 'standard_clause', 'customer_doc', 'website', 'persona'
 * @property {string} sourceId                // primary key or logical ID
 * @property {string} [clauseRef]             // e.g. '7.2', '8.7', when applicable
 * @property {string} [title]                 // clause label, document title, or URL
 * @property {string} contentSnippet          // text excerpt used for reasoning
 * @property {number} relevanceScore          // 0–1
 * @property {Object} [metadata]              // flexible extra info
 */

/**
 * @typedef {Object} ReasoningResult
 * @property {string} intent
 * @property {number} overallConfidence       // 0–1
 * @property {boolean} needsClarification
 * @property {string} [clarificationQuestion]
 * @property {string} [recommendedAction]     // 'answer_directly', 'run_gap_analysis', 'lookup_clause', 'explain_standard', 'small_talk', etc.
 * @property {string} [draftAnswer]           // optional draft answer in Vera's neutral voice (to be styled later)
 * @property {CandidateSource[]} candidateSources
 * @property {Object} [metadata]              // e.g. inferredClauseRefs, inferredRegulations, notes
 */

class VeraReasoningEngine {
  /**
   * Main entry point for reasoning - MULTI-PASS PIPELINE (v3.0)
   * @param {ReasoningInput} input
   * @returns {Promise<ReasoningResult>}
   */
  static async reason(input) {
    const {
      tenantId = DEFAULT_TENANT_ID,
      message,
      intent,
      conversationContext = {},
      persona = null,
      standardContext = {},
      rawContext = {},
      userProfile = null
    } = input;

    // Check debug mode status
    const userId = userProfile?.id || conversationContext?.user_id || rawContext?.userId || 'system';
    const debugMode = await VeraDebugService.isDebugMode({ tenantId, userId });

    try {
      // ============================================================
      // PASS 1: Intent Detection & Validation
      // ============================================================
      const validatedIntent = await this.pass1_IntentDetection({
        message,
        intent,
        conversationContext
      });

      // ============================================================
      // PASS 2: Semantic Retrieval
      // ============================================================
      const semanticResults = await this.pass2_SemanticRetrieval({
        tenantId,
        message,
        validatedIntent,
        standardContext,
        conversationContext
      });

      // ============================================================
      // PASS 3: Context Assembly (using Knowledge Aggregator)
      // ============================================================
      const VeraKnowledgeAggregatorService = (await import('./VeraKnowledgeAggregatorService.js')).default;
      const aggregatedKnowledge = await VeraKnowledgeAggregatorService.aggregateAllKnowledgeIntoContext({
        question: message,
        tenantId,
        options: {
          includeDirect: true,
          includeSemantic: true,
          includeRelated: true,
          includeCustomer: true,
          includeQNA: true,
          includeWebsites: true,
          maxResults: 30
        }
      });

      // ============================================================
      // PASS 3.5: Retrieve Conversation Memory Context
      // ============================================================
      const VeraConversationMemoryService = (await import('./VeraConversationMemoryService.js')).default;
      const recentContext = await VeraConversationMemoryService.retrieveRecentContext({
        tenantId,
        sessionId: conversationContext?.session_id || rawContext?.sessionId,
        userId: userProfile?.id || conversationContext?.user_id || rawContext?.userId,
        limit: 10
      });

      // ============================================================
      // PASS 3.6: Detect URLs in Message
      // ============================================================
      const VeraLearningIngestionService = (await import('./VeraLearningIngestionService.js')).default;
      const detectedUrls = VeraLearningIngestionService.detectUrlsInText(message);
      const urlMetadata = detectedUrls.length > 0 ? {
        detectedUrls,
        suggestLearning: true,
        urlCount: detectedUrls.length
      } : null;

      // ============================================================
      // PASS 3.7: INTENT-SPECIFIC DATABASE LOOKUP (BEFORE LLM)
      // ============================================================
      // CRITICAL: Execute database lookups FIRST, before LLM reasoning
      // This ensures factual accuracy and prevents hallucination
      const diagnostic = process.env.NODE_ENV === 'development' || process.env.VERA_DIAGNOSTIC === '1';
      let directAnswer = null;
      let directAnswerSource = null;
      
      try {
        const VeraIntentHandlers = (await import('./VeraIntentHandlers.js')).default;
        
        // Route to appropriate handler based on intent
        switch (validatedIntent) {
          case 'clause_lookup':
            if (diagnostic) console.log('[VeraReasoningEngine] Routing to clause_lookup handler');
            const clauseResult = await VeraIntentHandlers.handleClauseLookup({
              message,
              standardContext,
              tenantId,
              diagnostic
            });
            if (clauseResult && clauseResult.found) {
              directAnswer = clauseResult.answer;
              directAnswerSource = {
                type: 'clause_lookup',
                clause: clauseResult.clause,
                standard: clauseResult.standard,
                metadata: clauseResult.metadata
              };
              if (diagnostic) console.log('[VeraReasoningEngine] Direct answer found from clause lookup');
            }
            break;
            
          case 'standard_definition':
            if (diagnostic) console.log('[VeraReasoningEngine] Routing to standard_definition handler');
            const standardResult = await VeraIntentHandlers.handleStandardDefinition({
              message,
              tenantId,
              diagnostic
            });
            if (standardResult && standardResult.found) {
              directAnswer = standardResult.answer;
              directAnswerSource = {
                type: 'standard_definition',
                standard: standardResult.standard,
                metadata: standardResult.metadata
              };
              if (diagnostic) console.log('[VeraReasoningEngine] Direct answer found from standard definition');
            }
            break;
            
          case 'industry_terminology':
            if (diagnostic) console.log('[VeraReasoningEngine] Routing to industry_terminology handler');
            const terminologyResult = await VeraIntentHandlers.handleIndustryTerminology({
              message,
              tenantId,
              diagnostic
            });
            if (terminologyResult && terminologyResult.found) {
              directAnswer = terminologyResult.answer;
              directAnswerSource = {
                type: 'industry_terminology',
                source: terminologyResult.source,
                metadata: terminologyResult.metadata
              };
              if (diagnostic) console.log('[VeraReasoningEngine] Direct answer found from terminology');
            }
            break;
            
          case 'general_knowledge':
            if (diagnostic) console.log('[VeraReasoningEngine] Routing to general_knowledge handler');
            const knowledgeResult = await VeraIntentHandlers.handleGeneralKnowledge({
              message,
              tenantId,
              diagnostic
            });
            if (knowledgeResult && knowledgeResult.found) {
              directAnswer = knowledgeResult.answer;
              directAnswerSource = {
                type: 'general_knowledge',
                source: knowledgeResult.source,
                metadata: knowledgeResult.metadata
              };
              if (diagnostic) console.log('[VeraReasoningEngine] Direct answer found from knowledge base');
            }
            break;
            
          case 'regulatory_mapping':
            if (diagnostic) console.log('[VeraReasoningEngine] Routing to regulatory_mapping handler');
            const regulatoryResult = await VeraIntentHandlers.handleRegulatoryMapping({
              message,
              tenantId,
              diagnostic
            });
            if (regulatoryResult && regulatoryResult.found) {
              directAnswer = regulatoryResult.answer;
              directAnswerSource = {
                type: 'regulatory_mapping',
                mappings: regulatoryResult.mappings,
                metadata: regulatoryResult.metadata
              };
              if (diagnostic) console.log('[VeraReasoningEngine] Direct answer found from regulatory mapping');
            }
            break;
        }
      } catch (handlerError) {
        console.error('[VeraReasoningEngine] Error in intent handler:', handlerError);
        if (diagnostic) console.error('[VeraReasoningEngine] Handler error details:', handlerError.stack);
        // Continue to LLM reasoning as fallback
      }

      // ============================================================
      // PASS 4: Compliance Reasoning (ENGINEER MODE)
      // ============================================================
      const personaSpec = persona || await VeraPersonaSpecificationService.getActiveSpecification(tenantId);
      
      // Check if upload orchestration is needed
      const uploadContext = await this.checkAndTriggerUploadOrchestration({
        tenantId,
        message,
        intent: validatedIntent,
        conversationContext,
        userProfile,
        rawContext
      });

      // Check if parsing is needed
      const parserContext = await this.checkAndTriggerParsing({
        tenantId,
        message,
        intent: validatedIntent,
        standardContext,
        conversationContext,
        userProfile
      });

      // Collect candidate sources (legacy method, now enhanced with aggregator)
      const candidateSources = aggregatedKnowledge.matches || await this.collectCandidateSources({
        tenantId,
        message,
        intent: validatedIntent,
        standardContext,
        conversationContext,
        parserContext,
        uploadContext
      });

      // Use LLM for structured reasoning ONLY if no direct answer found
      let llmResult = null;
      if (!directAnswer) {
        if (diagnostic) console.log('[VeraReasoningEngine] No direct answer, using LLM reasoning');
        llmResult = await this.callReasoningModel({
          message,
          intent: validatedIntent,
          candidateSources,
          personaSpec,
          conversationContext,
          userProfile,
          aggregatedKnowledge,  // NEW: Pass aggregated knowledge context
          recentContext,        // NEW: Pass conversation memory
          urlMetadata           // NEW: Pass detected URLs
        });
      } else {
        if (diagnostic) console.log('[VeraReasoningEngine] Direct answer found, skipping LLM reasoning');
        // Create a minimal LLM result structure for consistency
        llmResult = {
          draftAnswer: directAnswer,
          overallConfidence: 0.95, // High confidence for direct database lookups
          reasoning: 'Direct database lookup',
          metadata: {
            directAnswer: true,
            source: directAnswerSource
          }
        };
      }

      // ============================================================
      // PASS 5: Answer Synthesis
      // ============================================================
      const synthesizedAnswer = await this.pass5_AnswerSynthesis({
        message,
        validatedIntent,
        candidateSources,
        llmResult,
        aggregatedKnowledge,
        personaSpec,
        userProfile
      });

      // ============================================================
      // PASS 6: Uncertainty Evaluation
      // ============================================================
      const uncertainty = aggregatedKnowledge.uncertainty || this.pass6_UncertaintyEvaluation({
        candidateSources,
        llmResult,
        aggregatedKnowledge
      });

      // ============================================================
      // PASS 7: Proactive Suggestion
      // ============================================================
      const proactiveSuggestions = await this.pass7_ProactiveSuggestion({
        message,
        validatedIntent,
        uncertainty,
        aggregatedKnowledge,
        candidateSources
      });

      // ============================================================
      // Build Final ReasoningResult
      // ============================================================
      const reasoningResult = this.buildReasoningResult({
        message,
        intent: validatedIntent,
        candidateSources,
        llmResult,
        parserContext,
        uploadContext,
        aggregatedKnowledge,  // NEW
        synthesizedAnswer,    // NEW
        uncertainty,          // NEW
        proactiveSuggestions, // NEW
        directAnswer,         // NEW: Direct answer from intent handlers
        directAnswerSource    // NEW: Source of direct answer
      });

      // Enhance with debug info if debug mode is enabled
      if (debugMode && reasoningResult.draftAnswer) {
        reasoningResult.draftAnswer = this.enhanceWithDebugInfo(
          reasoningResult.draftAnswer,
          {
            tenantId,
            userId,
            message,
            aggregatedKnowledge,
            candidateSources,
            uncertainty,
            intent: validatedIntent,
            reasoningResult
          }
        );
      }

      // Log reasoning event
      await this.logReasoningEvent({ tenantId, reasoningResult, candidateSources, llmResult });

      return reasoningResult;
    } catch (error) {
      console.error('[VeraReasoningEngine] Error in reason:', error);
      // Fallback inference mode
      return await this.generateFallbackInference(message, intent, { tenantId, conversationContext });
    }
  }

  /**
   * PASS 1: Intent Detection & Validation with Intelligent Routing
   * @param {Object} params
   * @returns {Promise<string>} Validated intent
   */
  static async pass1_IntentDetection({ message, intent, conversationContext }) {
    // Validate and refine intent based on message and context
    const lowerMessage = (message || '').toLowerCase();
    const diagnostic = process.env.NODE_ENV === 'development' || process.env.VERA_DIAGNOSTIC === '1';
    
    // INTELLIGENT INTENT ROUTING (before personality generation)
    // Pattern 1: Clause Lookup (e.g., "What is 8.7?", "Explain 8.5.1")
    const clausePattern = /\b\d+\.\d+(\.\d+)?\b/;
    if (clausePattern.test(message)) {
      const clauseMatch = message.match(clausePattern);
      if (clauseMatch) {
        if (diagnostic) console.log(`[VeraReasoningEngine] Detected clause lookup: ${clauseMatch[0]}`);
        return 'clause_lookup';
      }
    }
    
    // Pattern 2: Standard Definition (e.g., "What is AS9100?", "Explain ISO9001")
    const standardPattern = /\b(AS\d{4}[A-Z]?|ISO\s*\d{4,5}|IATF\s*\d{4,5}|FAA\s*Part\s*\d+|EASA|ISO\s*13485|ISO\s*9001)\b/i;
    if (standardPattern.test(message) && 
        (lowerMessage.includes('what is') || lowerMessage.includes('explain') || lowerMessage.includes('tell me about'))) {
      const standardMatch = message.match(standardPattern);
      if (standardMatch) {
        if (diagnostic) console.log(`[VeraReasoningEngine] Detected standard definition query: ${standardMatch[0]}`);
        return 'standard_definition';
      }
    }
    
    // Pattern 3: Industry Terminology (e.g., "Define CQE", "What is DMAIC", "Explain Six Sigma")
    const terminologyPattern = /\b(define|what is|what's|explain)\s+(cqe|dmaic|six\s+sigma|spc|doe|fmea|ppap|apqp|msa|gr&r|aql|ltpd|oc\s+curve|weibull|reliability|metrology|sca|scar|vda|iso\s*19011|nonconformity|corrective\s+action|preventive\s+action)\b/i;
    if (terminologyPattern.test(message)) {
      if (diagnostic) console.log(`[VeraReasoningEngine] Detected industry terminology query`);
      return 'industry_terminology';
    }
    
    // Pattern 4: General Knowledge (e.g., "What is a CQE", "What do you know about DMAIC")
    const knowledgePattern = /\b(what is|what's|what are|explain|tell me about|what do you know about|define)\s+(a|an|the)?\s*[a-z]+/i;
    if (knowledgePattern.test(message) && 
        !lowerMessage.includes('clause') && 
        !lowerMessage.includes('requirement') && 
        !lowerMessage.includes('standard') &&
        !standardPattern.test(message)) {
      if (diagnostic) console.log(`[VeraReasoningEngine] Detected general knowledge query`);
      return 'general_knowledge';
    }
    
    // Pattern 5: Regulatory Mapping (e.g., "FAA 21.137", "Part 21.137")
    const regulatoryPattern = /\b(FAA|EASA|CASA|Part)\s*(\d+\.\d+|\d+)\b/i;
    if (regulatoryPattern.test(message)) {
      if (diagnostic) console.log(`[VeraReasoningEngine] Detected regulatory mapping query`);
      return 'regulatory_mapping';
    }
    
    // If intent is generic 'question', try to refine it
    if (intent === 'question' || !intent) {
      if (lowerMessage.includes('who are you') || lowerMessage.includes('your identity')) {
        return 'identity_query';
      }
      if (lowerMessage.includes('database') || lowerMessage.includes('function')) {
        return 'admin_system_query';
      }
    }
    
    if (diagnostic) console.log(`[VeraReasoningEngine] Using provided intent: ${intent || 'question'}`);
    return intent || 'question';
  }

  /**
   * PASS 2: Semantic Retrieval
   * @param {Object} params
   * @returns {Promise<Object>} Semantic search results
   */
  static async pass2_SemanticRetrieval({ tenantId, message, validatedIntent, standardContext, conversationContext }) {
    try {
      const VeraSemanticMemory = (await import('./VeraSemanticMemory.js')).default;
      
      const semanticResults = await VeraSemanticMemory.semanticSearch({
        query: message,
        topK: 15,
        tenantId,
        minSimilarity: 0.5
      });

      return {
        semanticMatches: semanticResults,
        topScore: semanticResults.length > 0 ? semanticResults[0].similarity : 0
      };
    } catch (error) {
      console.error('[VeraReasoningEngine] Error in semantic retrieval:', error);
      return { semanticMatches: [], topScore: 0 };
    }
  }

  /**
   * PASS 5: Answer Synthesis
   * @param {Object} params
   * @returns {Promise<string>} Synthesized answer draft
   */
  static async pass5_AnswerSynthesis({ message, validatedIntent, candidateSources, llmResult, aggregatedKnowledge, personaSpec, userProfile }) {
    // If LLM provided a draft answer, use it
    if (llmResult?.draftAnswer) {
      return llmResult.draftAnswer;
    }

    // If we have high-confidence matches, synthesize from them
    if (aggregatedKnowledge.topScore >= 0.7 && aggregatedKnowledge.matches.length > 0) {
      const topMatches = aggregatedKnowledge.matches.slice(0, 3);
      let synthesis = `Based on the relevant knowledge sources:\n\n`;
      
      for (const match of topMatches) {
        synthesis += `[${match.sourceType}] ${match.text.substring(0, 200)}${match.text.length > 200 ? '...' : ''}\n\n`;
      }
      
      return synthesis;
    }

    return null; // No synthesis available
  }

  /**
   * PASS 6: Uncertainty Evaluation
   * @param {Object} params
   * @returns {Object} Uncertainty metrics
   */
  static pass6_UncertaintyEvaluation({ candidateSources, llmResult, aggregatedKnowledge }) {
    const uncertainty = aggregatedKnowledge.uncertainty || {
      score: 0.5,
      reason: 'Moderate confidence',
      needsClarification: false
    };

    // Adjust based on LLM confidence
    if (llmResult?.overallConfidence !== undefined) {
      uncertainty.score = 1.0 - llmResult.overallConfidence;
      uncertainty.needsClarification = uncertainty.score > 0.6;
    }

    return uncertainty;
  }

  /**
   * PASS 7: Proactive Suggestion
   * @param {Object} params
   * @returns {Promise<Array>} Array of proactive suggestions
   */
  static async pass7_ProactiveSuggestion({ message, validatedIntent, uncertainty, aggregatedKnowledge, candidateSources }) {
    const suggestions = [];

    // If uncertainty is high, suggest clarification
    if (uncertainty.needsClarification) {
      suggestions.push({
        type: 'clarification',
        text: uncertainty.reason || 'I need more information to provide a complete answer.',
        question: uncertainty.clarificationQuestion || 'Could you provide more details?'
      });
    }

    // If knowledge sources are limited, suggest learning
    if (aggregatedKnowledge.totalSources < 3) {
      suggestions.push({
        type: 'learning',
        text: 'I have limited knowledge on this topic. Would you like to teach me more about it?',
        action: 'explicit_learning_request'
      });
    }

    // If related standards found, suggest comparison
    const relatedStandards = candidateSources.filter(c => c.sourceType === 'standard_clause');
    if (relatedStandards.length > 1) {
      suggestions.push({
        type: 'comparison',
        text: `I found requirements in ${relatedStandards.length} different standards. Would you like me to compare them?`,
        action: 'standard_comparison'
      });
    }

    return suggestions;
  }

  /**
   * FALLBACK INFERENCE MODE (ENGINEER MODE)
   * When Vera lacks direct data, she infers from contextual knowledge using engineering reasoning
   * @param {string} question
   * @param {string} intent
   * @param {Object} context
   * @returns {Promise<ReasoningResult>}
   */
  static async generateFallbackInference(question, intent, context = {}) {
    const { tenantId = DEFAULT_TENANT_ID, conversationContext = {}, userProfile = null } = context;

    try {
      // Try to retrieve neighbor clauses
      const clauseMatch = question.match(/\b\d+\.\d+(\.\d+)?\b/);
      if (clauseMatch) {
        const clauseRef = clauseMatch[0];
        const parts = clauseRef.split('.');
        const topLevel = parts[0];
        
        // Find neighbor clauses
        const neighborResult = await queryPostgres(
          `SELECT pr.id, pr.clause_ref, pr.requirement_text, s.code
           FROM public.parsed_requirements pr
           JOIN public.standards s ON s.id = pr.standard_id
           WHERE pr.clause_ref LIKE $1
           ORDER BY pr.clause_ref
           LIMIT 5`,
          [`${topLevel}.%`]
        );

        if (neighborResult.rows.length > 0) {
          return {
            intent,
            overallConfidence: 0.5,
            needsClarification: true,
            clarificationQuestion: `I found related clauses in section ${topLevel}, but not the exact clause ${clauseRef}. Would you like me to explain the related clauses I found?`,
            recommendedAction: 'answer_directly',
            draftAnswer: `While I don't have direct information about clause ${clauseRef}, I found related requirements in section ${topLevel}. These may provide context for what you're looking for.`,
            candidateSources: neighborResult.rows.map(row => ({
              sourceType: 'standard_clause',
              sourceId: row.id,
              clauseRef: row.clause_ref,
              text: row.requirement_text,
              relevanceScore: 0.5,
              metadata: { standardCode: row.code }
            })),
            metadata: {
              inferenceMode: 'fallback',
              reason: 'No direct match, using neighbor clauses',
              inferredClauseRefs: [clauseRef]
            }
          };
        }
      }

      // Try to pull similar regulatory requirements
      const VeraKnowledgeAggregatorService = (await import('./VeraKnowledgeAggregatorService.js')).default;
      const aggregated = await VeraKnowledgeAggregatorService.aggregateAllKnowledgeIntoContext({
        question,
        tenantId,
        options: { maxResults: 5 }
      });

      if (aggregated.matches.length > 0) {
        return {
          intent,
          overallConfidence: aggregated.topScore,
          needsClarification: aggregated.uncertainty.needsClarification,
          clarificationQuestion: aggregated.uncertainty.needsClarification ? aggregated.uncertainty.reason : null,
          recommendedAction: 'answer_directly',
          draftAnswer: `Based on similar requirements I found, ${aggregated.contextBlock}`,
          candidateSources: aggregated.matches,
          metadata: {
            inferenceMode: 'fallback',
            reason: 'Using similar/related knowledge',
            uncertainty: aggregated.uncertainty
          }
        };
      }

      // Final fallback: Use ENGINEERING REASONING to provide partial answer
      // Try to infer from compliance patterns and standards knowledge
      const lowerQuestion = question.toLowerCase();
      
      // Check if it's a clause-related question
      if (lowerQuestion.includes('clause') || lowerQuestion.match(/\b\d+\.\d+/)) {
        const clauseMatch = question.match(/\b(\d+)\.(\d+)/);
        if (clauseMatch) {
          const section = clauseMatch[1];
          const subsection = clauseMatch[2];
          
          // Try to find any clauses in that section
          const sectionResult = await queryPostgres(
            `SELECT pr.id, pr.clause_ref, pr.requirement_text, s.code
             FROM public.parsed_requirements pr
             JOIN public.standards s ON s.id = pr.standard_id
             WHERE pr.clause_ref LIKE $1
             ORDER BY pr.clause_ref
             LIMIT 3`,
            [`${section}.%`]
          );

          if (sectionResult.rows.length > 0) {
            const relatedClauses = sectionResult.rows.map(r => r.clause_ref).join(', ');
            return {
              intent,
              overallConfidence: 0.4,
              needsClarification: false,
              clarificationQuestion: null,
              recommendedAction: 'answer_directly',
              draftAnswer: `I don't have the exact clause ${section}.${subsection} in my parsed data, but I found related requirements in section ${section} (${relatedClauses}). Based on typical compliance patterns for this section, I can provide guidance. However, to give you the precise requirement, I'd need the standard parsed or access to the official document. Would you like me to explain what I found in the related clauses, or would you prefer to upload/parse the standard?`,
              candidateSources: sectionResult.rows.map(row => ({
                sourceType: 'standard_clause',
                sourceId: row.id,
                clauseRef: row.clause_ref,
                text: row.requirement_text,
                relevanceScore: 0.4,
                metadata: { standardCode: row.code, inferenceMode: 'section_neighbor' }
              })),
              metadata: {
                inferenceMode: 'engineering_fallback',
                reason: 'No exact clause match, using section-level inference',
                inferredClauseRefs: [`${section}.${subsection}`],
                engineeringReasoning: true
              }
            };
          }
        }
      }

      // Check if it's a standard-related question
      const standardMatch = question.match(/\b(AS9100|ISO\s*9001|ISO\s*13485|IATF\s*16949|FAA\s*Part\s*\d+)\b/i);
      if (standardMatch) {
        const standardCode = standardMatch[0].replace(/\s+/g, '').toUpperCase();
        return {
          intent,
          overallConfidence: 0.3,
          needsClarification: false,
          clarificationQuestion: null,
          recommendedAction: 'answer_directly',
          draftAnswer: `You're asking about ${standardCode}. I don't have this standard fully parsed in my database yet, but I can provide general guidance based on my knowledge of ${standardCode} requirements. To give you precise, audit-ready answers, I'd need you to upload and parse the standard document. Would you like me to help you with that, or would you prefer general guidance based on typical ${standardCode} requirements?`,
          candidateSources: [],
          metadata: {
            inferenceMode: 'engineering_fallback',
            reason: 'Standard not parsed, using general knowledge',
            inferredRegulations: [standardCode],
            engineeringReasoning: true,
            suggestParsing: true
          }
        };
      }

      // Final fallback: HONEST ADMISSION (NO GENERIC TEMPLATES)
      return {
        intent,
        overallConfidence: 0.0,
        needsClarification: true,
        clarificationQuestion: "I do not yet have this in my knowledge base. Could you provide more context or teach me about this topic?",
        recommendedAction: 'answer_directly',
        draftAnswer: "I do not yet have this in my knowledge base. If you can provide more context or relevant documents, I can learn from them and help you with this in the future.",
        candidateSources: [],
        metadata: {
          inferenceMode: 'honest_admission',
          reason: 'No knowledge sources found',
          learningSuggested: true
        }
      };
    } catch (error) {
      console.error('[VeraReasoningEngine] Error in fallback inference:', error);
      return {
        intent,
        overallConfidence: 0.0,
        needsClarification: true,
        clarificationQuestion: "I encountered an error processing your question. Could you try rephrasing it?",
        recommendedAction: 'fallback',
        draftAnswer: "I'm having trouble processing that right now. Could you rephrase your question?",
        candidateSources: [],
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Check if upload orchestration is needed
   * @param {Object} params
   * @returns {Promise<Object>} Upload context
   */
  static async checkAndTriggerUploadOrchestration({ tenantId, message, intent, conversationContext, userProfile, rawContext }) {
    const uploadContext = {
      needsOrchestration: false,
      uploadInfo: null,
      awaitingClassification: false
    };

    // Check if this is an upload intent
    if (intent === 'document_upload_no_context' || intent === 'document_upload_classification_response') {
      uploadContext.needsOrchestration = true;
      uploadContext.uploadInfo = rawContext?.uploadInfo || conversationContext?.uploadInfo;
      
      if (intent === 'document_upload_no_context') {
        uploadContext.awaitingClassification = true;
      }
    }

    return uploadContext;
  }

  /**
   * Check if parsing is needed and trigger it if so
   * @param {Object} params
   * @returns {Promise<Object>} Parser context with summary and concerns
   */
  static async checkAndTriggerParsing({ tenantId, message, intent, standardContext, conversationContext, userProfile }) {
    const parserContext = {
      invoked: false,
      parserRunId: null,
      parsingSummary: null,
      concerns: []
    };

    try {
      // Check if intent suggests parsing is needed
      const parseIntents = ['parse_standard', 'parse_document', 'customer_document_query'];
      const needsParsing = parseIntents.includes(intent) || 
                          message.toLowerCase().match(/\b(parse|re-parse|extract requirements from)\b/i);

      if (!needsParsing) {
        return parserContext;
      }

      // Extract standard ID or document ID from message/context
      let standardId = standardContext?.standardId || standardContext?.standard_id;
      let documentId = standardContext?.documentId || standardContext?.document_id;

      // Try to extract from message if not in context
      if (!standardId && !documentId) {
        // Look for standard code in message (e.g., "AS9100D", "ISO 9001")
        const standardCodeMatch = message.match(/\b(AS9100|ISO\s*9001|ISO\s*13485|IATF\s*16949|FAA\s*Part\s*21)\b/i);
        if (standardCodeMatch) {
          // Try to find standard by code
          const code = standardCodeMatch[0].replace(/\s+/g, '').toUpperCase();
          const standardResult = await queryPostgres(
            `SELECT id FROM public.standards WHERE code ILIKE $1 LIMIT 1`,
            [`%${code}%`]
          );
          if (standardResult.rows.length > 0) {
            standardId = standardResult.rows[0].id;
          }
        }
      }

      // If we have a standard ID, check if it needs parsing
      if (standardId) {
        const summary = await VeraParserSupervisorService.getStandardParsingSummary({ tenantId, standardId });
        
        if (!summary) {
          // Not parsed yet - trigger parse
          console.log(`[VeraReasoningEngine] Standard ${standardId} not parsed, triggering parse...`);
          const userId = userProfile?.id || null;
          parserContext.parsingSummary = await VeraParserSupervisorService.parseStandard({
            tenantId,
            standardId,
            force: false,
            userId
          });
          parserContext.invoked = true;
          parserContext.parserRunId = parserContext.parsingSummary.parserRunId;
        } else {
          // Already parsed - check if it's trustworthy
          parserContext.parsingSummary = summary;
          const trustEvaluation = VeraParserSupervisorService.evaluateParseTrustworthiness(summary);
          parserContext.concerns = trustEvaluation.concerns;
          
          // If not trustworthy and user asked to parse, suggest re-parsing
          if (!trustEvaluation.trustworthy && needsParsing) {
            parserContext.concerns.push('Parse results may be unreliable - consider re-parsing');
          }
        }
      }

      // If we have a document ID, check if it needs parsing for learning
      if (documentId && intent === 'customer_document_query') {
        // Trigger learning parse
        const userId = userProfile?.id || null;
        await VeraParserSupervisorService.parseForLearning({ tenantId, documentId, userId });
        parserContext.invoked = true;
      }

    } catch (error) {
      console.error('[VeraReasoningEngine] Error in parser supervision:', error);
      parserContext.concerns.push(`Parser error: ${error.message}`);
    }

    return parserContext;
  }

  /**
   * Collect candidate knowledge sources
   * @param {Object} params
   * @returns {Promise<CandidateSource[]>}
   */
  static async collectCandidateSources({ tenantId, message, intent, standardContext, conversationContext, parserContext = null, uploadContext = null }) {
    const candidates = [];

    try {
      // 1. Q&A bank candidates
      const qnaMatch = await VeraQueryResponseService.findBestMatch({ tenantId, message, intent });
      if (qnaMatch) {
        candidates.push({
          sourceType: 'qna',
          sourceId: qnaMatch.id,
          title: qnaMatch.category || 'Q&A entry',
          contentSnippet: qnaMatch.response_text,
          relevanceScore: 0.8,
          metadata: { qna: qnaMatch }
        });
      }

      // 2. Parsed requirements / standards
      const standardCandidates = await this.findStandardClauses({ tenantId, message, standardContext });
      candidates.push(...standardCandidates);

      // 3. Learned document content
      const documentCandidates = await this.findDocumentContent({ tenantId, message });
      candidates.push(...documentCandidates);

      // 4. Website learned content
      const websiteCandidates = await this.findWebsiteContent({ tenantId, message });
      candidates.push(...websiteCandidates);

      // 5. Persona/organizational spec (for identity / company questions)
      const personaCandidates = await this.findPersonaContent({ tenantId, message });
      candidates.push(...personaCandidates);
    } catch (error) {
      console.error('[VeraReasoningEngine] Error collecting candidate sources:', error);
    }

    return candidates;
  }

  /**
   * Find relevant standard clauses using new clause lookup service
   * @param {Object} params
   * @returns {Promise<CandidateSource[]>}
   */
  static async findStandardClauses({ tenantId, message, standardContext }) {
    const candidates = [];
    const diagnostic = process.env.NODE_ENV === 'development' || process.env.VERA_DIAGNOSTIC === '1';

    try {
      // Extract possible clause-like tokens from message (e.g., "8.7", "8.5.1")
      const clauseRefMatch = message.match(/\b\d+\.\d+(\.\d+)?\b/);
      const clauseRef = clauseRefMatch ? clauseRefMatch[0] : null;

      // If we have a clause reference AND a standard context, use the new clause lookup service
      if (clauseRef && standardContext.standard_id) {
        const VeraClauseLookupService = (await import('./VeraClauseLookupService.js')).default;
        const clauseResult = await VeraClauseLookupService.getStandardClause(
          standardContext.standard_id,
          clauseRef,
          { tenantId, includeChildren: true, diagnostic }
        );

        if (clauseResult && clauseResult.found) {
          // Add main clause
          candidates.push({
            sourceType: 'standard_clause',
            sourceId: clauseResult.clause.id,
            clauseRef: clauseResult.clause.clauseRef,
            title: `${clauseResult.standard.code || ''} ${clauseResult.clause.clauseNumber || clauseResult.clause.fullRef}`.trim(),
            contentSnippet: clauseResult.clause.requirementText,
            relevanceScore: 0.95, // High relevance for exact clause match
            metadata: {
              standardId: clauseResult.standard.id,
              standardCode: clauseResult.standard.code,
              standardName: clauseResult.standard.name,
              clauseNumber: clauseResult.clause.clauseNumber,
              fullRef: clauseResult.clause.fullRef,
              clauseTitle: clauseResult.clause.clauseTitle,
              requirementType: clauseResult.clause.requirementType,
              confidence: clauseResult.clause.confidence
            }
          });

          // Add children if any
          if (clauseResult.children && clauseResult.children.length > 0) {
            for (const child of clauseResult.children) {
              candidates.push({
                sourceType: 'standard_clause',
                sourceId: child.id,
                clauseRef: child.clauseRef,
                title: `${clauseResult.standard.code || ''} ${child.clauseNumber || child.fullRef}`.trim(),
                contentSnippet: child.requirementText,
                relevanceScore: 0.85, // Slightly lower for children
                metadata: {
                  standardId: clauseResult.standard.id,
                  standardCode: clauseResult.standard.code,
                  standardName: clauseResult.standard.name,
                  clauseNumber: child.clauseNumber,
                  fullRef: child.fullRef,
                  clauseTitle: child.clauseTitle,
                  requirementType: child.requirementType,
                  confidence: child.confidence,
                  isChild: true,
                  parentClause: clauseResult.clause.clauseNumber
                }
              });
            }
          }

          if (diagnostic) {
            console.log(`[VeraReasoningEngine] Found clause ${clauseRef} with ${clauseResult.children.length} children`);
          }

          return candidates; // Return early if we found exact clause match
        } else if (clauseResult && !clauseResult.found) {
          // Clause not found - add to metadata for fallback handling
          if (diagnostic) {
            console.log(`[VeraReasoningEngine] Clause ${clauseRef} not found: ${clauseResult.error}`);
          }
          // Continue to text-based search below
        }
      }

      // Fallback: Text-based search for general queries
      const limit = 10;
      let sql = `
        SELECT pr.id, pr.standard_id, pr.clause_ref, pr.clause_number, pr.full_ref,
               pr.requirement_text, pr.clause_title, pr.requirement_type, pr.confidence,
               s.code, s.name
        FROM public.parsed_requirements pr
        JOIN public.standards s ON s.id = pr.standard_id
        WHERE pr.is_in_scope = true
      `;

      const params = [];

      // Filter by standard context if provided
      if (standardContext.standard_id) {
        sql += ` AND pr.standard_id = $${params.length + 1}`;
        params.push(standardContext.standard_id);
      } else if (standardContext.standard_codes && Array.isArray(standardContext.standard_codes)) {
        sql += ` AND s.code = ANY($${params.length + 1})`;
        params.push(standardContext.standard_codes);
      }

      // Search by requirement text or clause title
      const searchTerms = message.substring(0, 200).trim();
      if (searchTerms.length > 0 && !clauseRef) {
        sql += ` AND (
          pr.requirement_text ILIKE $${params.length + 1} OR
          pr.clause_title ILIKE $${params.length + 1} OR
          pr.clause_ref ILIKE $${params.length + 1}
        )`;
        params.push(`%${searchTerms}%`);
        params.push(`%${searchTerms}%`);
        params.push(`%${searchTerms}%`);
      }

      sql += ` ORDER BY pr.clause_ref ASC, pr.clause_number ASC LIMIT ${limit}`;

      const result = await queryPostgres(sql, params);

      for (const row of result.rows) {
        const snippet = row.requirement_text.length > 600 
          ? row.requirement_text.slice(0, 600) + '...' 
          : row.requirement_text;

        candidates.push({
          sourceType: 'standard_clause',
          sourceId: row.id,
          clauseRef: row.clause_ref,
          title: `${row.code || ''} ${row.clause_number || row.clause_ref || ''}`.trim(),
          contentSnippet: snippet,
          relevanceScore: clauseRef ? 0.7 : 0.6, // Lower for text matches
          metadata: {
            standardId: row.standard_id,
            standardCode: row.code,
            standardName: row.name,
            clauseNumber: row.clause_number,
            fullRef: row.full_ref,
            clauseTitle: row.clause_title,
            requirementType: row.requirement_type,
            confidence: row.confidence ? parseFloat(row.confidence) : null
          }
        });
      }

      if (diagnostic) {
        console.log(`[VeraReasoningEngine] Text search found ${result.rows.length} clauses`);
      }
    } catch (error) {
      console.error('[VeraReasoningEngine] Error finding standard clauses:', error);
      if (diagnostic) {
        console.error('[VeraReasoningEngine] Error details:', error.stack);
      }
    }

    return candidates;
  }

  /**
   * Find relevant document content
   * @param {Object} params
   * @returns {Promise<CandidateSource[]>}
   */
  static async findDocumentContent({ tenantId, message }) {
    const candidates = [];
    const limit = 5;

    try {
      const searchTerms = message.substring(0, 200).trim();
      if (searchTerms.length === 0) {
        return candidates;
      }

      const sql = `
        SELECT id, document_id, content, metadata
        FROM edcat.document_content_for_learning
        WHERE content ILIKE $1
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      const result = await queryEdcatAI(sql, [`%${searchTerms}%`]);

      for (const row of result.rows) {
        const snippet = row.content.length > 600 
          ? row.content.slice(0, 600) + '...' 
          : row.content;

        const metadata = typeof row.metadata === 'string' 
          ? JSON.parse(row.metadata) 
          : (row.metadata || {});

        candidates.push({
          sourceType: 'customer_doc',
          sourceId: row.id,
          title: metadata.document_name || 'Customer Document',
          contentSnippet: snippet,
          relevanceScore: 0.5,
          metadata: {
            document_id: row.document_id,
            ...metadata
          }
        });
      }
    } catch (error) {
      console.error('[VeraReasoningEngine] Error finding document content:', error);
    }

    return candidates;
  }

  /**
   * Find relevant website content
   * @param {Object} params
   * @returns {Promise<CandidateSource[]>}
   */
  static async findWebsiteContent({ tenantId, message }) {
    const candidates = [];
    const limit = 5;

    try {
      const searchTerms = message.substring(0, 200).trim();
      if (searchTerms.length === 0) {
        return candidates;
      }

      const sql = `
        SELECT id, url, cleaned_text, metadata
        FROM edcat.website_content_for_learning
        WHERE is_active = TRUE
          AND cleaned_text ILIKE $1
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      const result = await queryEdcatAI(sql, [`%${searchTerms}%`]);

      for (const row of result.rows) {
        const snippet = row.cleaned_text.length > 600 
          ? row.cleaned_text.slice(0, 600) + '...' 
          : row.cleaned_text;

        const metadata = typeof row.metadata === 'string' 
          ? JSON.parse(row.metadata) 
          : (row.metadata || {});

        candidates.push({
          sourceType: 'website',
          sourceId: row.id,
          title: metadata.title || row.url,
          contentSnippet: snippet,
          relevanceScore: 0.5,
          metadata: {
            url: row.url,
            authority: row.authority,
            ...metadata
          }
        });
      }
    } catch (error) {
      console.error('[VeraReasoningEngine] Error finding website content:', error);
    }

    return candidates;
  }

  /**
   * Find relevant persona content
   * @param {Object} params
   * @returns {Promise<CandidateSource[]>}
   */
  static async findPersonaContent({ tenantId, message }) {
    const candidates = [];
    const lower = (message || '').toLowerCase();

    const wantsWhoAreYou = lower.includes('who are you') || 
                          lower.includes('what are you') ||
                          lower.includes('who is vera') ||
                          lower.includes('what is vera');

    const wantsConformEdge = lower.includes('conform-edge') || 
                            lower.includes('conform edge') || 
                            lower.includes('who are we') || 
                            lower.includes('what is this company') ||
                            lower.includes('what is conform');

    try {
      if (wantsWhoAreYou) {
        const identity = await VeraPersonaSpecificationService.getIdentityStatement(tenantId);
        if (identity) {
          candidates.push({
            sourceType: 'persona',
            sourceId: 'identity_statement',
            title: 'Vera Identity Statement',
            contentSnippet: identity,
            relevanceScore: 0.9,
            metadata: { section: 'identity' }
          });
        }
      }

      if (wantsConformEdge) {
        const orgContext = await VeraPersonaSpecificationService.getOrganizationalContext(tenantId);
        if (orgContext) {
          let contentSnippet;
          if (typeof orgContext === 'string') {
            contentSnippet = orgContext;
          } else if (orgContext.description) {
            contentSnippet = orgContext.description;
          } else {
            contentSnippet = JSON.stringify(orgContext);
          }

          candidates.push({
            sourceType: 'persona',
            sourceId: 'organizational_context',
            title: 'Conform-Edge Organizational Context',
            contentSnippet: contentSnippet,
            relevanceScore: 0.9,
            metadata: { section: 'organizational_context' }
          });
        }
      }
    } catch (error) {
      console.error('[VeraReasoningEngine] Error finding persona content:', error);
    }

    return candidates;
  }

  /**
   * Call the reasoning model with candidate sources (ENGINEER MODE)
   * @param {Object} params
   * @returns {Promise<Object|null>}
   */
  static async callReasoningModel({ message, intent, candidateSources, personaSpec, conversationContext, userProfile = null, aggregatedKnowledge = null, recentContext = [], urlMetadata = null }) {
    try {
      const sourcesForModel = candidateSources.slice(0, 10).map((c, idx) => ({
        index: idx,
        sourceType: c.sourceType,
        title: c.title,
        snippet: c.contentSnippet.substring(0, 500), // Limit snippet size
        clauseRef: c.clauseRef || null,
        metadata: c.metadata || {}
      }));

      // Build engineer-mode system prompt
      const engineerIdentity = personaSpec?.sections?.identity_statement?.statement || 
        "Vera is a Senior Compliance & Quality Engineer, Lead Auditor, and Regulatory Systems Engineer with expertise in AS9100, ISO 9001, ISO 13485, IATF 16949, FAA Part 21/145, and MDSAP.";
      
      const systemPrompt = `You are the internal reasoning engine for Vera, operating in ENGINEER MODE.

Vera's Identity: ${engineerIdentity}

You are a Senior Compliance Engineer, Lead Auditor, and Regulatory Systems Engineer. You think like an engineer:
- You interpret incomplete questions using engineering reasoning
- You answer even when data is not perfect, using compliance logic and standards knowledge
- You avoid falling back to generic help menus
- You ask intelligent follow-up questions when information is missing
- You use all available data: Q&A bank, parsed standards, learned documents, URL content, persona data, user profile, conversation history

You NEVER speak directly to the user. You only produce structured reasoning output.

You receive:
- A user message
- An intent label
- A limited list of candidate knowledge sources (standards clauses, Q&A, documents, websites, persona information)
- Recent conversation context (if available)
- Detected URLs in the message (if any)

Your tasks:
1. Decide which sources are most relevant.
2. If the question is about compliance, infer the likely clause or regulation intent even if the number is not mentioned explicitly.
3. Use ENGINEERING REASONING:
   - If a clause isn't found exactly, infer from related clauses in the same section
   - If a standard isn't parsed, use your knowledge of that standard's typical structure
   - If data is incomplete, state assumptions clearly and provide the best answer possible
   - Reference standards logically and fill gaps with engineering judgement
4. Consider the user's role and preferences (if provided):
   - Founders may ask for deeper/system-level tasks (Cursor prompts, architecture updates)
   - Auditors may need more evidence-based reasoning and gap analysis
   - Executives may care about risk, impact, and summary clarity
   - Apply user preferences (detail_level, summary_first, etc.) when drafting answers
5. If URLs are detected in the message, note them in metadata and suggest learning from them.
6. Use conversation history to understand context and avoid repeating information.
7. Decide what Vera should do next:
   - answer_directly: Use the selected sources to answer directly
   - ask_clarification: Ask a clarifying question
   - run_gap_analysis: Run a gap analysis (especially relevant for auditors)
   - lookup_clause: Look up a specific clause
   - explain_standard: Explain a standard or regulation
   - small_talk: Treat it as small talk / emotional support
   - fallback: Use fallback behavior
5. Estimate an overall confidence score between 0 and 1.
6. If you have enough information, draft a clear, single-answer narrative that Vera can use as a starting point (in Vera's voice, but neutral tone - will be styled later). Adjust detail level and structure based on user role and preferences.
7. Return ONLY valid JSON in the following format:

{
  "overallConfidence": 0.0,
  "needsClarification": false,
  "clarificationQuestion": null,
  "recommendedAction": "answer_directly",
  "inferredClauseRefs": ["7.2", "8.7"],
  "inferredRegulations": ["FAA 21.137(f)"],
  "selectedSourceIndexes": [0, 2],
  "draftAnswer": "..."
}`;

      // Build user context with profile information
      const userContextInfo = userProfile ? {
        displayName: userProfile.displayName,
        primaryRole: userProfile.primaryRole,
        preferences: userProfile.preferences || {}
      } : {};

      // Build conversation history context
      const conversationHistoryText = recentContext.length > 0
        ? `\n\nRecent Conversation History (${recentContext.length} messages):\n${recentContext.map((msg, idx) => `${idx + 1}. [${msg.intent || 'unknown'}] ${msg.messageText.substring(0, 150)}${msg.messageText.length > 150 ? '...' : ''}`).join('\n')}`
        : '';

      // Build URL detection context
      const urlContextText = urlMetadata && urlMetadata.detectedUrls && urlMetadata.detectedUrls.length > 0
        ? `\n\nDetected URLs in message (${urlMetadata.detectedUrls.length}):\n${urlMetadata.detectedUrls.map(url => `- ${url}`).join('\n')}\n\nNote: These URLs can be learned from to improve understanding.`
        : '';

      const userContent = `User message: ${message}
Intent: ${intent}

User Profile: ${JSON.stringify(userContextInfo)}

Candidate Sources (${sourcesForModel.length}):
${sourcesForModel.map(s => `[${s.index}] ${s.sourceType}: ${s.title}${s.clauseRef ? ` (${s.clauseRef})` : ''}
${s.snippet.substring(0, 300)}...`).join('\n\n')}
${conversationHistoryText}
${urlContextText}

Conversation Context: ${JSON.stringify(conversationContext || {})}`;

      const llmResponse = await runVera(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        {
          tenantId: conversationContext.tenantId || DEFAULT_TENANT_ID,
          mode: 'reasoning'
        }
      );

      // Parse JSON from response
      let parsed;
      try {
        const answer = llmResponse.answer || '';
        // Extract JSON from response (might have markdown code blocks)
        const jsonMatch = answer.match(/```json\s*([\s\S]*?)\s*```/) || 
                         answer.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : answer;
        parsed = JSON.parse(jsonText);
      } catch (parseError) {
        console.warn('[VeraReasoningEngine] Failed to parse JSON from model response:', parseError.message);
        console.warn('[VeraReasoningEngine] Response was:', llmResponse.answer?.substring(0, 500));
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('[VeraReasoningEngine] Error calling reasoning model:', error);
      return null;
    }
  }

  /**
   * Build reasoning result from LLM output and candidate sources
   * @param {Object} params
   * @returns {ReasoningResult}
   */
  static buildReasoningResult({ message, intent, candidateSources, llmResult, parserContext = null, uploadContext = null, aggregatedKnowledge = null, synthesizedAnswer = null, uncertainty = null, proactiveSuggestions = null, directAnswer = null, directAnswerSource = null }) {
    const diagnostic = process.env.NODE_ENV === 'development' || process.env.VERA_DIAGNOSTIC === '1';
    
    // If we have a direct answer from intent handlers, use it (HIGHEST PRIORITY)
    if (directAnswer) {
      if (diagnostic) {
        console.log(`[VeraReasoningEngine] Using direct answer from ${directAnswerSource?.type || 'intent_handler'}`);
      }
      return {
        intent,
        overallConfidence: 0.95, // High confidence for direct database lookups
        needsClarification: false,
        clarificationQuestion: null,
        recommendedAction: 'answer_directly',
        draftAnswer: directAnswer, // Content-first, no personality yet
        candidateSources: directAnswerSource ? [{
          sourceType: directAnswerSource.type,
          sourceId: directAnswerSource.clause?.id || directAnswerSource.standard?.id || 'direct',
          title: directAnswerSource.clause?.clauseTitle || directAnswerSource.standard?.code || 'Direct Answer',
          contentSnippet: directAnswer,
          relevanceScore: 0.95,
          metadata: directAnswerSource.metadata || {}
        }] : [],
        metadata: {
          directAnswer: true,
          source: directAnswerSource,
          reasoningPath: 'direct_database_lookup',
          diagnostic: diagnostic ? {
            intent,
            sourceType: directAnswerSource?.type,
            queriesExecuted: 1,
            rowsReturned: 1
          } : undefined
        }
      };
    }

    if (!llmResult) {
      return {
        intent,
        overallConfidence: 0.0,
        needsClarification: true,
        clarificationQuestion: "I do not yet have this in my knowledge base.",
        recommendedAction: 'fallback',
        draftAnswer: "I do not yet have this in my knowledge base. If you can provide more context or relevant documents, I can learn from them.",
        candidateSources: [],
        metadata: { 
          note: 'LLM reasoning unavailable',
          reasoningPath: 'fallback_no_llm',
          diagnostic: diagnostic ? {
            intent,
            queriesExecuted: 0,
            rowsReturned: 0,
            fallbackReason: 'LLM unavailable'
          } : undefined
        }
      };
    }

    const {
      overallConfidence = 0.0,
      needsClarification = false,
      clarificationQuestion = null,
      recommendedAction = 'answer_directly',
      inferredClauseRefs = [],
      inferredRegulations = [],
      selectedSourceIndexes = [],
      draftAnswer = null
    } = llmResult;

    // Map selected source indexes to actual candidate sources
    const selectedSources = selectedSourceIndexes
      .map(idx => candidateSources[idx])
      .filter(Boolean);

    // If no sources selected but we have candidates, use top candidates
    const finalSources = selectedSources.length > 0 
      ? selectedSources 
      : (aggregatedKnowledge?.matches || candidateSources).slice(0, 3);

    // Use synthesized answer if available, otherwise use LLM draft
    const finalDraftAnswer = synthesizedAnswer || draftAnswer;

    // Use uncertainty from pipeline if available
    const finalUncertainty = uncertainty || {
      score: 1.0 - overallConfidence,
      needsClarification,
      reason: clarificationQuestion || 'Moderate confidence'
    };

    // Build diagnostic info if enabled
    const diagnosticInfo = diagnostic ? {
      intent,
      queriesExecuted: aggregatedKnowledge?.totalSources || candidateSources.length,
      rowsReturned: finalSources.length,
      fallbackPath: finalDraftAnswer ? null : 'no_synthesis_available',
      selectedSources: finalSources.map(s => ({
        type: s.sourceType,
        clauseRef: s.clauseRef,
        relevance: s.relevanceScore
      }))
    } : undefined;

    const result = {
      intent,
      overallConfidence: aggregatedKnowledge?.topScore || Math.max(0, Math.min(1, overallConfidence)),
      needsClarification: finalUncertainty.needsClarification || needsClarification,
      clarificationQuestion: finalUncertainty.clarificationQuestion || clarificationQuestion,
      recommendedAction,
      draftAnswer: finalDraftAnswer, // Content-first, personality applied later
      candidateSources: finalSources,
      metadata: {
        inferredClauseRefs: Array.isArray(inferredClauseRefs) ? inferredClauseRefs : [],
        inferredRegulations: Array.isArray(inferredRegulations) ? inferredRegulations : [],
        rawCandidateCount: aggregatedKnowledge?.totalSources || candidateSources.length,
        selectedCount: selectedSources.length,
        uncertainty: finalUncertainty,
        proactiveSuggestions: proactiveSuggestions || [],
        reasoningPath: 'llm_reasoning',
        diagnostic: diagnosticInfo
      }
    };

    // NEW: Include parser context if available
    if (parserContext && parserContext.invoked) {
      result.parser = {
        invoked: parserContext.invoked,
        parserRunId: parserContext.parserRunId,
        parsingSummary: parserContext.parsingSummary,
        concerns: parserContext.concerns
      };
    }

    // NEW: Include upload context if available
    if (uploadContext && uploadContext.needsOrchestration) {
      result.upload = {
        needsOrchestration: uploadContext.needsOrchestration,
        uploadInfo: uploadContext.uploadInfo,
        awaitingClassification: uploadContext.awaitingClassification
      };
    }

    // NEW: Include aggregated knowledge metadata
    if (aggregatedKnowledge) {
      result.metadata.aggregatedKnowledge = {
        totalSources: aggregatedKnowledge.totalSources,
        topScore: aggregatedKnowledge.topScore,
        traceability: aggregatedKnowledge.traceability
      };
    }

    // NEW: Include uncertainty and proactive suggestions
    if (uncertainty) {
      result.metadata.uncertainty = uncertainty;
    }

    if (proactiveSuggestions && proactiveSuggestions.length > 0) {
      result.metadata.proactiveSuggestions = proactiveSuggestions;
    }

    return result;
  }

  /**
   * Enhance answer with debug information (safe technical context only)
   * @param {string} baseAnswer
   * @param {Object} context
   * @returns {string}
   */
  static enhanceWithDebugInfo(baseAnswer, { tenantId, userId, message, aggregatedKnowledge, candidateSources, uncertainty }) {
    let debugNotes = [];

    // Note about knowledge sources used
    if (aggregatedKnowledge) {
      const sourceCount = aggregatedKnowledge.totalSources || candidateSources.length || 0;
      if (sourceCount > 0) {
        const sourceTypes = new Set();
        candidateSources.forEach(src => {
          if (src.sourceType) sourceTypes.add(src.sourceType);
        });
        debugNotes.push(`(Debug) I consulted ${sourceCount} knowledge source(s): ${Array.from(sourceTypes).join(', ')}.`);
      } else {
        debugNotes.push(`(Debug) I did not find direct matches in my knowledge base for this query.`);
      }
    }

    // Note about confidence/uncertainty
    if (uncertainty && uncertainty.score > 0.3) {
      debugNotes.push(`(Debug) Confidence is moderate (${Math.round((1 - uncertainty.score) * 100)}%). ${uncertainty.reason || 'This may indicate incomplete data or ambiguous query.'}`);
    }

    // Note about clause inference
    if (message && /\b\d+\.\d+(\.\d+)?\b/.test(message)) {
      const clauseMatch = message.match(/\b(\d+\.\d+(?:\.\d+)?)\b/);
      if (clauseMatch) {
        debugNotes.push(`(Debug) Detected clause reference: ${clauseMatch[1]}. Checking parsed requirements for this clause.`);
      }
    }

    // Note about standard detection
    const standardMatch = message.match(/\b(AS\d{4}[A-Z]?|ISO\s*\d{4,5}|IATF\s*\d{4,5}|FAA\s*Part\s*\d+|EASA|ISO\s*13485|ISO\s*9001)\b/i);
    if (standardMatch) {
      const standardName = standardMatch[1].trim();
      debugNotes.push(`(Debug) Detected standard: ${standardName}. Checking if this standard is parsed in the database.`);
    }

    // Append debug notes if any
    if (debugNotes.length > 0) {
      return `${baseAnswer}\n\n${debugNotes.join(' ')}`;
    }

    return baseAnswer;
  }

  /**
   * Log reasoning event for metrics
   * @param {Object} params
   * @returns {Promise<void>}
   */
  static async logReasoningEvent({ tenantId, reasoningResult, candidateSources, llmResult }) {
    try {
      // Optional: log into edcat_learning_events or a dedicated reasoning trace table
      // Keep this lean for now; you can extend later
      // For now, just log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[VeraReasoningEngine] Reasoning event:', {
          tenantId,
          intent: reasoningResult.intent,
          confidence: reasoningResult.overallConfidence,
          action: reasoningResult.recommendedAction,
          candidateCount: candidateSources.length
        });
      }
    } catch (error) {
      // Silently fail - logging is optional
      console.warn('[VeraReasoningEngine] Could not log reasoning event:', error.message);
    }
  }

  /**
   * VERA v3.1 SIMPLIFIED REASONING METHOD
   * This is a streamlined version that uses the new services:
   * - VeraIntentClassifier
   * - VeraKnowledgeRetrievalService
   * - VeraAnswerPlanner
   * - runVera (LLM wrapper)
   * 
   * This method is designed to be the primary entry point for user questions,
   * providing direct, factual answers without falling back to generic templates.
   * 
   * @param {Object} params
   * @param {string} params.tenantId
   * @param {string} params.userId
   * @param {string} params.message
   * @param {Object} [params.context]
   * @returns {Promise<{
   *   finalAnswer: string,
   *   intent: string,
   *   entities: Object,
   *   evidenceSummary?: string,
   *   debugInfo?: Object
   * }>}
   */
  /**
   * Check if message looks like a quality domain question
   * @param {string} message
   * @returns {boolean}
   */
  static _looksQualityDomain(message) {
    if (!message) return false;
    const m = message.toLowerCase();
    
    const qualityKeywords = [
      'cqe', 'certified quality engineer',
      'six sigma', 'dmaic', 'dfss', 'black belt', 'green belt',
      'lean', 'wastes', '5s', 'value stream', 'kanban',
      'kpi', 'metric', 'cost of quality', 'coq',
      'scrap', 'rework', 'pph', 'dppm', 'fpy', 'otd',
      'quality culture', 'continuous improvement',
      'agile', 'scrum', 'qms', 'procedure', 'quality engineer',
      'spc', 'control chart', 'process capability', 'msa',
      'fmea', 'apqp', 'ppap', 'deming', 'juran', 'crosby'
    ];
    
    return qualityKeywords.some(kw => m.includes(kw));
  }

  /**
   * Main orchestrator method - routes to domain-specific reasoning services
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  static async reason({ tenantId, userId, messageText, conversationContext = {}, debugMode = false }) {
    // Basic guard
    if (!messageText || typeof messageText !== 'string') {
      return {
        text: 'I did not receive a valid question. Could you rephrase it?',
        debugTrace: {
          intentInfo: { highLevelIntent: 'invalid_input', domain: 'none' },
          routesConsidered: [],
          selectedRoute: 'invalid_input',
          notes: ['Empty or invalid message']
        }
      };
    }

    const intentInfo = classifyIntentWithDomain(messageText);
    const debugTrace = {
      intentInfo,
      routesConsidered: [],
      selectedRoute: null,
      notes: []
    };

    // 1. Hard routing: debug
    if (intentInfo.highLevelIntent === 'debug') {
      debugTrace.routesConsidered.push('debug');
      debugTrace.selectedRoute = 'debug';
      debugTrace.notes.push('Debug intent detected');
      
      const debugResponse = await handleDebugRequest({ tenantId, userId, message: messageText });
      return {
        text: debugResponse,
        debugTrace
      };
    }

    // 1.5. Special handlers: document numbering, standards listing, gap analysis, conversation summary
    // These take precedence over generic technical routing
    
    // Document numbering questions
    if (VeraDocumentNumberingResponse.isNumberingQuestion(messageText)) {
      debugTrace.routesConsidered.push('documentNumbering');
      debugTrace.selectedRoute = 'documentNumbering';
      debugTrace.notes.push('Document numbering question detected');
      
      return {
        text: VeraDocumentNumberingResponse.generateResponse(),
        debugTrace
      };
    }
    
    // Standards listing
    if (messageText.toLowerCase().match(/\b(list|show|what).*standards?\b/i) && 
        messageText.toLowerCase().match(/\b(database|can you see|available)\b/i)) {
      debugTrace.routesConsidered.push('standardsListing');
      debugTrace.selectedRoute = 'standardsListing';
      debugTrace.notes.push('Standards listing request detected');
      
      const VeraStandardsListingService = (await import('./VeraStandardsListingService.js')).default;
      const listResult = await VeraStandardsListingService.listKnownStandards({ tenantId });
      const formatted = VeraStandardsListingService.formatStandardsList(listResult);
      
      return {
        text: formatted,
        debugTrace,
        metadata: {
          totalStandards: listResult.total
        }
      };
    }
    
    // Gap analysis
    if (messageText.toLowerCase().match(/\b(run|perform|do|execute).*gap\s*analysis\b/i) ||
        messageText.toLowerCase().match(/\bgap\s*analysis.*for\b/i)) {
      debugTrace.routesConsidered.push('gapAnalysis');
      debugTrace.selectedRoute = 'gapAnalysis';
      debugTrace.notes.push('Gap analysis request detected');
      
      // Extract standard code
      const standardMatch = messageText.match(/(as9100|iso\s*9001|iso\s*13485|iatf\s*16949)/i);
      const standardCode = standardMatch ? standardMatch[1].replace(/\s+/g, '').toUpperCase() : null;
      
      if (!standardCode) {
        return {
          text: "I need to know which standard you want a gap analysis for. Please specify (e.g., 'run a gap analysis for AS9100D').",
          debugTrace
        };
      }
      
      const VeraGapAnalysisService = (await import('./VeraGapAnalysisService.js')).default;
      const gapResult = await VeraGapAnalysisService.runBasicGapAnalysis({ standardCode, tenantId });
      
      return {
        text: gapResult.text,
        debugTrace,
        metadata: {
          standard: gapResult.standard,
          unmappedCount: gapResult.unmappedCount,
          totalClauses: gapResult.totalClauses
        }
      };
    }
    
    // Requirements folder scanning request
    if (messageText.toLowerCase().match(/\b(scan.*requirements|index.*requirements|load.*requirements.*folder)\b/i)) {
      debugTrace.routesConsidered.push('requirementsScan');
      debugTrace.selectedRoute = 'requirementsScan';
      debugTrace.notes.push('Requirements folder scan request detected');
      
      return {
        text: `I can scan the Requirements folder to index approved and bad example documents. This will help me learn what good vs bad documents look like for gap analysis and assessments.\n\nTo scan the folder, use the API endpoint:\n\`POST /api/vera/requirements/scan-requirements\`\n\nOr run the script:\n\`node backend/src/scripts/scan-vera-requirements-folder.js\`\n\nAfter scanning, I'll be able to reference approved examples when helping with gap analysis and assessments.`,
        debugTrace
      };
    }

    // Conversation summary
    if (messageText.toLowerCase().match(/\b(summarize|summary|last.*questions?|recent.*questions?)\b/i)) {
      debugTrace.routesConsidered.push('conversationSummary');
      debugTrace.selectedRoute = 'conversationSummary';
      debugTrace.notes.push('Conversation summary request detected');
      
      const limitMatch = messageText.match(/\b(\d+)\s*(questions?|messages?)\b/i);
      const limit = limitMatch ? parseInt(limitMatch[1]) : 3;
      
      const { queryEdcatAI } = await import('../../config/databases.js');
      const summaryResult = await queryEdcatAI(
        `SELECT 
          message_text,
          intent,
          metadata,
          created_at
         FROM edcat.ai_conversation_history
         WHERE tenant_id = $1
           AND user_id = $2
           AND role = 'user'
         ORDER BY created_at DESC
         LIMIT $3`,
        [tenantId, userId, limit]
      );
      
      if (summaryResult.rows.length === 0) {
        return {
          text: "I don't have any recent questions to summarize. Ask me some questions first, then ask for a summary.",
          debugTrace
        };
      }
      
      let summary = `**Summary of Last ${summaryResult.rows.length} Questions:**\n\n`;
      for (let i = 0; i < summaryResult.rows.length; i++) {
        const row = summaryResult.rows[i];
        const metadata = typeof row.metadata === 'string' 
          ? JSON.parse(row.metadata || '{}')
          : (row.metadata || {});
        const intentInfo = metadata.debugTrace?.intentInfo || {};
        
        summary += `${i + 1}. "${row.message_text.substring(0, 100)}${row.message_text.length > 100 ? '...' : ''}"\n`;
        summary += `   - Intent: ${row.intent || 'unknown'}\n`;
        summary += `   - High-level: ${intentInfo.highLevelIntent || 'unknown'}\n`;
        summary += `   - Domain: ${intentInfo.domain || 'unknown'}\n`;
        if (intentInfo.entities?.topic) {
          summary += `   - Topic: ${intentInfo.entities.topic}\n`;
        }
        summary += '\n';
      }
      
      return {
        text: summary,
        debugTrace
      };
    }

    // 2. Technical questions
    if (intentInfo.highLevelIntent === 'technical_question') {
      if (intentInfo.domain === 'regulatory') {
        debugTrace.routesConsidered.push('regulatoryTechnical');
        debugTrace.selectedRoute = 'regulatoryTechnical';
        debugTrace.notes.push(`Regulatory domain detected: ${intentInfo.entities?.standard || 'unknown standard'}`);
        
        const result = await VeraRegulatoryReasoningService.answerRegulatoryQuestion({
          messageText,
          userId,
          tenantId,
          conversationContext,
          debugMode
        });
        
        return {
          text: result.text,
          debugTrace,
          metadata: {
            foundClause: result.foundClause,
            standard: result.standard,
            clauseRef: result.clauseRef
          }
        };
      }

      if (intentInfo.domain === 'quality_eng') {
        debugTrace.routesConsidered.push('qualityTechnical');
        debugTrace.selectedRoute = 'qualityTechnical';
        debugTrace.notes.push('Quality engineering domain detected');
        
        const qr = await VeraQualityReasoningService.answerQualityQuestion({
          tenantId,
          userId,
          message: messageText,
          context: conversationContext
        });
        
        return {
          text: qr.answer || qr.text || "I couldn't generate a quality answer. Could you rephrase?",
          debugTrace,
          metadata: {
            usedQualityPath: qr.usedQualityPath,
            topic: qr.topic
          }
        };
      }

      // Generic technical
      debugTrace.routesConsidered.push('genericTechnical');
      debugTrace.selectedRoute = 'genericTechnical';
      debugTrace.notes.push('Generic technical question');
      
      const result = await VeraGenericTechnicalReasoningService.answerGenericTechnicalQuestion({
        messageText,
        userId,
        tenantId,
        conversationContext,
        debugMode
      });
      
      return {
        text: result.text,
        debugTrace,
        metadata: {
          usedQABank: result.usedQABank
        }
      };
    }

    // 3. Smalltalk (only if not technical)
    if (intentInfo.highLevelIntent === 'smalltalk') {
      debugTrace.routesConsidered.push('smalltalk');
      debugTrace.selectedRoute = 'smalltalk';
      debugTrace.notes.push('Smalltalk/greeting detected');
      
      const greeting = await VeraGreetingService.generateGreeting({
        userName: conversationContext?.userProfile?.display_name || null,
        cultureTag: 'uk_scotland',
        tone: 'friendly'
      });
      
      return {
        text: greeting,
        debugTrace
      };
    }

    // 4. Generic / fallback (try quality/reg hints, else general)
    debugTrace.routesConsidered.push('genericFallback');
    debugTrace.selectedRoute = 'genericFallback';
    debugTrace.notes.push('Falling back to generic reasoning');
    
    // If domain hints exist, try domain-specific first
    if (intentInfo.domain === 'quality_eng') {
      const qr = await VeraQualityReasoningService.answerQualityQuestion({
        tenantId,
        userId,
        message: messageText,
        context: conversationContext
      });
      
      if (qr.usedQualityPath && qr.answer) {
        return {
          text: qr.answer,
          debugTrace: { ...debugTrace, selectedRoute: 'qualityTechnical', notes: [...debugTrace.notes, 'Quality domain hint used'] },
          metadata: { usedQualityPath: true, topic: qr.topic }
        };
      }
    }
    
    // Otherwise use generic technical reasoning
    const result = await VeraGenericTechnicalReasoningService.answerGenericTechnicalQuestion({
      messageText,
      userId,
      tenantId,
      conversationContext,
      debugMode
    });
    
    return {
      text: result.text,
      debugTrace,
      metadata: {
        usedQABank: result.usedQABank
      }
    };
  }

  /**
   * Legacy v3.1 method - now calls orchestrator
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  static async reasonV31({ tenantId, userId, message, context = {} }) {
    // Basic guard
    if (!message || typeof message !== 'string') {
      return {
        finalAnswer: 'I did not receive a valid question. Could you rephrase it?',
        intent: 'invalid_input',
        entities: {}
      };
    }

    // If we are in an explicit Vera debug flow, hand off to debug service
    if (isDebugMessage(message)) {
      const debugAnswer = await handleDebugRequest({ tenantId, userId, message });
      return {
        finalAnswer: debugAnswer,
        intent: 'debug_request',
        entities: { isDebug: true }
      };
    }

    // CRITICAL: Quality domain routing (before general intent classification)
    // This ensures quality questions get deep, structured answers
    if (this._looksQualityDomain(message)) {
      console.log('[VeraReasoningEngine] Routing to VeraQualityReasoningService...');
      try {
        const qr = await VeraQualityReasoningService.answerQualityQuestion({
          tenantId,
          userId,
          message,
          context
        });
        
        if (qr.usedQualityPath && qr.answer) {
          return {
            finalAnswer: qr.answer,
            intent: 'quality_engineering_question',
            entities: { topic: qr.topic || null },
            path: 'quality_reasoning',
            topic: qr.topic || null
          };
        }
        // If quality path didn't work, fall through to general reasoning
        console.log('[VeraReasoningEngine] Quality reasoning did not produce answer, falling through to general reasoning');
      } catch (error) {
        console.error('[VeraReasoningEngine] Error in quality reasoning, falling through:', error.message);
        // Fall through to general reasoning
      }
    }

    // 1. Classify intent and entities
    const { intent, entities } = VeraIntentClassifier.classify(message);

    // 2. Get evidence from all sources
    const evidence = await VeraKnowledgeRetrievalService.getEvidence({
      tenantId,
      intent,
      entities,
      message
    });

    // 3. Build answer plan
    const plan = VeraAnswerPlanner.buildPlan({
      intent,
      entities,
      evidence,
      message
    });

    // 4. Call LLM to generate final answer
    let finalAnswer;
    try {
      const llmResponse = await runVera(
        [
          { role: 'system', content: plan.llmPrompt.split('--- TASK ---')[0] }, // Persona header
          { role: 'user', content: plan.llmPrompt.split('--- TASK ---')[1] || plan.llmPrompt } // Task + evidence
        ],
        {
          tenantId,
          userId,
          mode: 'reasoning'
        }
      );

      finalAnswer = llmResponse.answer || llmResponse.content || '';
      
      // If LLM returned empty, synthesize from evidence
      if (!finalAnswer || finalAnswer.trim().length === 0) {
        finalAnswer = this._synthesizeAnswerFromEvidence(evidence, intent, entities, message);
      }
    } catch (err) {
      console.error('[VeraReasoningEngine] LLM call failed, synthesizing from evidence:', err);
      // Synthesize answer from evidence instead of showing raw summary
      finalAnswer = this._synthesizeAnswerFromEvidence(evidence, intent, entities, message);
    }

    // Convert to orchestrator format for backward compatibility
    const orchestratorResult = await this.reason({
      tenantId,
      userId,
      messageText: message,
      conversationContext: context,
      debugMode: false
    });

    return {
      finalAnswer: orchestratorResult.text,
      intent: orchestratorResult.debugTrace?.intentInfo?.highLevelIntent || intent,
      entities: orchestratorResult.debugTrace?.intentInfo?.entities || entities,
      evidenceSummary: plan.evidenceSummary,
      debugTrace: orchestratorResult.debugTrace
    };
  }

  /**
   * Synthesize answer from evidence when LLM is unavailable
   * @param {Object} evidence
   * @param {string} intent
   * @param {Object} entities
   * @param {string} message
   * @returns {string}
   */
  static _synthesizeAnswerFromEvidence(evidence, intent, entities, message) {
    const { queryResponses, standardClauses, learnedDocs, websiteSnippets } = evidence;

    // Priority 1: Use Q&A bank responses directly (highest quality)
    if (queryResponses && queryResponses.length > 0) {
      const bestMatch = queryResponses[0];
      const answer = bestMatch.response_text || '';
      if (answer && answer.trim().length > 0) {
        // Replace placeholders if any
        let synthesized = answer
          .replace(/{topic}/g, entities.topic || message)
          .replace(/{standard}/g, entities.standard || 'the standard')
          .replace(/{clause}/g, entities.clauseRef || 'the clause');
        
        // If there are multiple Q&A entries, mention them
        if (queryResponses.length > 1) {
          synthesized += `\n\nI also found ${queryResponses.length - 1} additional related entry(ies) in my knowledge base that may be relevant.`;
        }
        
        return synthesized;
      }
    }

    // Priority 2: Synthesize from standard clauses
    if (standardClauses && standardClauses.length > 0) {
      let synthesized = '';
      
      if (intent === 'standard_clause_definition' && entities.clauseRef) {
        // For clause queries, provide the requirement text directly
        const mainClause = standardClauses[0];
        synthesized = `**${mainClause.clause_title || `Clause ${mainClause.clause_number || mainClause.full_ref}`}**\n\n`;
        synthesized += mainClause.requirement_text || mainClause.requirementText;
        
        if (standardClauses.length > 1) {
          synthesized += `\n\n**Related sub-clauses:**\n`;
          for (const clause of standardClauses.slice(1, 4)) {
            synthesized += `\n- **${clause.clause_number || clause.full_ref}**: ${(clause.requirement_text || clause.requirementText || '').substring(0, 150)}${(clause.requirement_text || clause.requirementText || '').length > 150 ? '...' : ''}`;
          }
        }
      } else {
        // For general queries, synthesize from multiple clauses
        synthesized = `Based on the standard requirements I found:\n\n`;
        for (const clause of standardClauses.slice(0, 3)) {
          const clauseLabel = clause.full_ref || clause.clause_number || clause.clause_ref || 'Unknown';
          synthesized += `**${clause.standard_code || ''} ${clauseLabel}**: ${(clause.requirement_text || clause.requirementText || '').substring(0, 200)}${(clause.requirement_text || clause.requirementText || '').length > 200 ? '...' : ''}\n\n`;
        }
      }
      
      if (synthesized.trim().length > 0) {
        return synthesized;
      }
    }

    // Priority 3: Use learned documents
    if (learnedDocs && learnedDocs.length > 0) {
      let synthesized = `Based on learned documents:\n\n`;
      for (const doc of learnedDocs.slice(0, 2)) {
        const excerpt = doc.content || doc.excerpt || '';
        if (excerpt.trim().length > 0) {
          synthesized += `${excerpt.substring(0, 300)}${excerpt.length > 300 ? '...' : ''}\n\n`;
        }
      }
      if (synthesized.length > 50) { // Only return if we have meaningful content
        return synthesized;
      }
    }

    // Priority 4: Use website snippets
    if (websiteSnippets && websiteSnippets.length > 0) {
      let synthesized = `Based on regulatory/website sources:\n\n`;
      for (const snippet of websiteSnippets.slice(0, 2)) {
        const text = snippet.snippet || snippet.cleaned_text || '';
        if (text.trim().length > 0) {
          synthesized += `${text.substring(0, 300)}${text.length > 300 ? '...' : ''}\n\n`;
        }
      }
      if (synthesized.length > 50) {
        return synthesized;
      }
    }

    // Final fallback: Honest admission
    return 'I do not yet have this in my knowledge base. If you can provide more context or relevant documents, I can learn from them.';
  }
}

export default VeraReasoningEngine;

