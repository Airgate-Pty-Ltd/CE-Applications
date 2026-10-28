/**
 * Vera Conversational Engine
 * Advanced response generation within EDCAT's bounded AI scope
 * Provides ChatGPT-like conversational experience using internal knowledge
 * 
 * CALL CHAIN (HTTP Request → Final Response):
 * 1. HTTP Route: backend/src/routes/chat.js → router.post('/analyze', ...)
 * 2. Intent Classification: classifyIntent(message) from backend/src/vera/intentClassifier.js
 * 3. Conversational Engine: conversationalEngine.generateResponse({ message, intent, context, ... })
 * 4. Reasoning Pipeline (v3.1): VeraReasoningEngine.reasonV31() - PRIMARY PATH for technical questions
 *    - Uses VeraIntentClassifier.classify() for intent detection
 *    - Uses VeraKnowledgeRetrievalService.getEvidence() for knowledge retrieval
 *    - Uses VeraAnswerPlanner.buildPlan() for answer planning
 *    - Uses runVera() LLM wrapper for final answer generation
 * 5. Fallback: Legacy switch statement routes to specific handlers (greeting, compliance_question, etc.)
 * 6. Response returned to HTTP route and sent to client
 * 
 * CRITICAL: Definition queries like "Vera, define CQE" must route through v3.1 reasoning engine,
 * NOT through the greeting handler. Multiple safety checks ensure this:
 * - Intent classifier detects definition keywords before greeting patterns
 * - v3.1 reasoning engine runs before legacy switch statement
 * - Greeting case checks for definition keywords and re-routes to v3.1
 * - handleGreeting() now uses VeraGreetingService (updated to use new dynamic greeting system)
 */

import { queryEdcatAI, queryPostgres } from '../config/databases.js';
// Legacy 'query' import removed - use queryPostgres or queryEdcatAI instead
import { formatRequirementsList, formatRequirementsAsText } from './requirementsFormatter.js';
import { getComplianceGapAnalyzer } from './complianceGapAnalyzer.js';
import VeraProfessionalFormatter from './vera/VeraProfessionalFormatter.js';
import VeraProfessionalLanguage from './vera/VeraProfessionalLanguage.js';
import VeraQueryParser from './vera/VeraQueryParser.js';
import VeraComprehensiveResearcher from './vera/VeraComprehensiveResearcher.js';
import VeraRepository from './vera/VeraRepository.js';
import StandardsIntelligenceService from './vera/StandardsIntelligenceService.js';
import veraDeductiveReasoningEngine from './vera/VeraDeductiveReasoningEngine.js';
import veraAdvancedReasoningEngine from './vera/VeraAdvancedReasoningEngine.js';
import VeraSkillOrchestrator from './vera/VeraSkillOrchestrator.js';
import VeraContextManager from './vera/VeraContextManager.js';
import VeraIndustryTerminology from './vera/VeraIndustryTerminology.js';
import VeraTerminologyService from './vera/VeraTerminologyService.js';
import VeraGreetingService from './vera/VeraGreetingService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Vera knowledge from database (with file system fallback)
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

let veraKnowledge = {
  expertCredentials: null,
  knowledgeTemplates: null,
  knowledgeBase: null,
  enhancedIntents: null
};

/**
 * Load Vera knowledge from database
 */
async function loadVeraKnowledgeFromDB() {
  try {
    // Load expert credentials
    const credsResult = await queryEdcatAI(
      `SELECT config FROM edcat.ai_policy WHERE tenant_id = $1 AND name = 'vera.expert.credentials'`,
      [DEFAULT_TENANT_ID]
    );
    if (credsResult.rows.length > 0) {
      veraKnowledge.expertCredentials = credsResult.rows[0].config;
    }

    // Load knowledge templates
    const templatesResult = await queryEdcatAI(
      `SELECT config FROM edcat.ai_policy WHERE tenant_id = $1 AND name = 'vera.knowledge.templates'`,
      [DEFAULT_TENANT_ID]
    );
    if (templatesResult.rows.length > 0) {
      veraKnowledge.knowledgeTemplates = templatesResult.rows[0].config;
    }

    // Load knowledge base
    const baseResult = await queryEdcatAI(
      `SELECT config FROM edcat.ai_policy WHERE tenant_id = $1 AND name = 'vera.knowledge.base'`,
      [DEFAULT_TENANT_ID]
    );
    if (baseResult.rows.length > 0) {
      veraKnowledge.knowledgeBase = baseResult.rows[0].config;
    }

    // Load enhanced intents
    const intentsResult = await queryEdcatAI(
      `SELECT config FROM edcat.ai_policy WHERE tenant_id = $1 AND name = 'vera.enhanced.intents'`,
      [DEFAULT_TENANT_ID]
    );
    if (intentsResult.rows.length > 0) {
      veraKnowledge.enhancedIntents = intentsResult.rows[0].config;
    }

    console.log('[VeraConversationalEngine] ✓ Loaded Vera knowledge from database');
  } catch (error) {
    console.warn('[VeraConversationalEngine] Could not load knowledge from database:', error.message);
    // Fall back to file system
    loadVeraKnowledgeFromFiles();
  }
}

/**
 * Load Vera knowledge from file system (fallback)
 */
function loadVeraKnowledgeFromFiles() {
  try {
    const credentialsPath = path.join(__dirname, '../../EDCAT AIP/seed/vera_expert_credentials.json');
    if (fs.existsSync(credentialsPath)) {
      veraKnowledge.expertCredentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
    }

    const templatesPath = path.join(__dirname, '../../EDCAT AIP/seed/vera_knowledge_templates.json');
    if (fs.existsSync(templatesPath)) {
      veraKnowledge.knowledgeTemplates = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));
    }

    const basePath = path.join(__dirname, '../../EDCAT AIP/seed/vera_knowledge_base.json');
    if (fs.existsSync(basePath)) {
      veraKnowledge.knowledgeBase = JSON.parse(fs.readFileSync(basePath, 'utf-8'));
    }

    console.log('[VeraConversationalEngine] ✓ Loaded Vera knowledge from files (fallback)');
  } catch (error) {
    console.warn('[VeraConversationalEngine] Could not load knowledge from files:', error.message);
  }
}

// Try to load from database first, fall back to files
loadVeraKnowledgeFromDB().catch(() => {
  loadVeraKnowledgeFromFiles();
});

class VeraConversationalEngine {
  constructor() {
    this.conversationPatterns = {
      clarification: [
        "I'd like to understand better. Could you tell me more about {topic}?",
        "To give you the best answer, could you clarify {topic}?",
        "I want to make sure I understand correctly. Are you asking about {topic}?"
      ],
      followUp: [
        "Would you like me to {action}?",
        "I can also help you with {related}.",
        "Should I {action} next?",
        "Would it help if I {action}?"
      ],
      acknowledgment: [
        "I understand.",
        "Got it.",
        "That makes sense.",
        "I see what you're asking.",
        "Absolutely."
      ],
      transition: [
        "Let me help you with that.",
        "I can assist with that.",
        "Here's what I found.",
        "Based on your question,"
      ]
    };
  }

  /**
   * Generate intelligent conversational response
   * @param {Object} options
   * @param {string} options.message - User message
   * @param {string} options.intent - Detected intent
   * @param {Object} options.context - Full context (documents, standards, etc.)
   * @param {Object} options.conversationContext - Previous conversation state
   * @param {Object} options.persona - Persona profile
   * @returns {Promise<string>} Generated response
   */
  async generateResponse(options = {}) {
    const {
      message,
      intent,
      context = {},
      conversationContext = {},
      persona = {},
      userId = 'system',
      tenantId = DEFAULT_TENANT_ID,
      sessionId = null,
      userProfile = null  // NEW: User profile for role-aware responses
    } = options;

    const { documents = [], standards = [], regulatoryWebsites = [] } = context;
    
    // CRITICAL FIX: Ensure message is defined before calling toLowerCase
    if (!message || typeof message !== 'string') {
      console.error('[VeraConversationalEngine] Message is undefined or not a string:', message);
      return "I'm sorry, I didn't receive a valid message. Could you please try again?";
    }
    
    const lowerMessage = message.toLowerCase();

    // CRITICAL: Check for admin/system queries FIRST (before anything else)
    // This must match the patterns in intentClassifier.js
    const isAdminQuery = 
        lowerMessage.includes('master admin') || 
        lowerMessage.includes('i am the master') ||
        lowerMessage.includes('i am the creator') ||
        lowerMessage.includes('creator') ||
        lowerMessage.includes('self diagnostic') ||
        lowerMessage.includes('self diagnoztic') ||
        lowerMessage.includes('provide me a self') ||
        lowerMessage.includes('how many database tables') ||
        lowerMessage.includes('how many tables') ||
        lowerMessage.includes('database tables') ||
        lowerMessage.includes('list your databases') ||
        lowerMessage.includes('list your functions') ||
        lowerMessage.includes('show me your databases') ||
        lowerMessage.includes('show me your functions') ||
        lowerMessage.includes('show me the architecture') ||
        lowerMessage.includes('database connections') ||
        lowerMessage.includes('database architecture') ||
        lowerMessage.includes('your database') ||
        lowerMessage.includes('your functions') ||
        lowerMessage.includes('what databases') ||
        lowerMessage.includes('what functions') ||
        lowerMessage.includes('debug your code') ||
        lowerMessage.includes('identify your bugs') ||
        (lowerMessage.includes('database') && (lowerMessage.includes('connection') || lowerMessage.includes('architecture') || lowerMessage.includes('show') || lowerMessage.includes('list') || lowerMessage.includes('capability') || lowerMessage.includes('table'))) ||
        (lowerMessage.includes('function') && (lowerMessage.includes('list') || lowerMessage.includes('show') || lowerMessage.includes('capability'))) ||
        (lowerMessage.includes('debug') || lowerMessage.includes('bug')) ||
        (lowerMessage.includes('architecture') && lowerMessage.includes('database'));
    
    if (isAdminQuery) {
      console.log('[VeraConversationalEngine] Detected admin/system query, routing to handleAdminSystemQuery');
      return await this.handleAdminSystemQuery(message, context, conversationContext, tenantId, userProfile);
    }

    // CRITICAL: Check for standard explanation questions THIRD (before general queries)
    // This catches "what is AS9100", "explain AS9100", "tell me about ISO 9001", etc.
    // Use case-insensitive matching and flexible patterns
    const standardQuestionPattern = /(?:what is|what's|explain|tell me about|teach me about|learn about)\s+([a-z]{2,4}[\s\-]?\d{3,5}[a-z]?|iso[\s\-]?\d{4,5}|iatf[\s\-]?\d{4,5}|faa[\s\-]?part[\s\-]?\d+|easa|iso[\s\-]?13485|iso[\s\-]?9001)/i;
    const standardQuestionMatch = message.match(standardQuestionPattern) || 
                                  message.match(/^([a-z]{2,4}[\s\-]?\d{3,5}[a-z]?|iso[\s\-]?\d{4,5}|iatf[\s\-]?\d{4,5}|faa[\s\-]?part[\s\-]?\d+|easa|iso[\s\-]?13485|iso[\s\-]?9001)(?:\s*[,\-]?\s*(?:what is|explain|about))?$/i);
    
    if (standardQuestionMatch) {
      const standardName = (standardQuestionMatch[1] || standardQuestionMatch[0] || '').trim();
      if (standardName) {
        console.log('[VeraConversationalEngine] Detected standard explanation question:', standardName);
        // Use engineering-style explanation even if standard not in database
        return await this.handleStandardExplanationByName(standardName, message, context, conversationContext);
      }
    }
    
    // Also check for standalone standard codes (e.g., just "AS9100" or "vera, AS9100")
    const standaloneStandardMatch = message.match(/\b(AS\d{4}[A-Z]?|ISO\s*\d{4,5}|IATF\s*\d{4,5}|FAA\s*Part\s*\d+|EASA|ISO\s*13485|ISO\s*9001)\b/i);
    if (standaloneStandardMatch && (lowerMessage.includes('what') || lowerMessage.includes('explain') || lowerMessage.includes('tell me') || message.length < 50)) {
      const standardName = standaloneStandardMatch[1].trim();
      console.log('[VeraConversationalEngine] Detected standalone standard question:', standardName);
      return await this.handleStandardExplanationByName(standardName, message, context, conversationContext);
    }

    // CRITICAL: Check for existential/identity questions FOURTH
    if (lowerMessage.includes('who am i') || 
        lowerMessage.includes('who are you') || 
        lowerMessage.includes('do you know who i am') ||
        lowerMessage.includes('do you know me') ||
        lowerMessage.includes('your existence') ||
        lowerMessage.includes('discuss your existence') ||
        lowerMessage.includes('what are you') ||
        lowerMessage.includes('tell me about yourself') ||
        lowerMessage.includes('introduce yourself') ||
        (lowerMessage.includes('existence') && (lowerMessage.includes('your') || lowerMessage.includes('discuss')))) {
      console.log('[VeraConversationalEngine] Detected existential/identity question, routing to handleGeneralKnowledgeQuery');
      return await this.handleGeneralKnowledgeQuery(message, context, conversationContext, tenantId);
    }

    // CRITICAL: Check for smalltalk greetings FIRST (before reasoning engine)
    // This ensures technical questions never hit the greeting system
    if (this._isSmalltalkGreeting(message)) {
      console.log(`[Vera-ENGINE] Branch chosen: SMALLTALK_GREETING`);
      try {
        const greeting = await VeraGreetingService.generateGreeting({
          cultureTag: 'uk_scotland',
          tone: 'friendly'
          // TODO: Pull userName, preferences, etc. from userProfile if available
        });
        return greeting;
      } catch (error) {
        console.error('[Vera-ENGINE] Error generating greeting:', error.message);
        // Fallback to simple greeting
        return "Hello! I'm ready to help with your quality and compliance work.";
      }
    }

    // NEW: Try VERA v3.1 Simplified Reasoning Engine first (for real questions)
    // This uses the new services: IntentClassifier, KnowledgeRetrieval, AnswerPlanner
    // CRITICAL: This must run BEFORE the legacy switch statement to catch definition queries
    let v31Result = null;
    try {
      const VeraReasoningEngine = (await import('./vera/VeraReasoningEngine.js')).default;
      
      // Use v3.1 simplified reasoning for most questions (except system commands)
      // Smalltalk greetings are already handled above
      const shouldUseV31 = !this._isSystemCommand(message);
      
      console.log(`[Vera-ENGINE] generateResponse called with:`, { message, intent, tenantId, userId });
      console.log(`[Vera-ENGINE] shouldUseV31: ${shouldUseV31}`);
      
      if (shouldUseV31) {
        console.log(`[Vera-ENGINE] Branch chosen: REASONING_ENGINE (v3.1)`);
        v31Result = await VeraReasoningEngine.reasonV31({
          tenantId,
          userId: userId || 'system',
          message,
          context: {
            ...context,
            conversationContext,
            userProfile
          }
        });

        console.log(`[Vera-ENGINE] v3.1 result:`, { 
          hasResult: !!v31Result, 
          hasFinalAnswer: !!(v31Result?.finalAnswer), 
          answerLength: v31Result?.finalAnswer?.length || 0,
          intent: v31Result?.intent,
          entities: v31Result?.entities
        });

        // If v3.1 returned a valid answer, use it
        if (v31Result && v31Result.finalAnswer && v31Result.finalAnswer.trim().length > 0) {
          // Apply light personality AFTER content (content-first approach)
          let finalAnswer = v31Result.finalAnswer;
          
          // Only apply personality for non-clause/regulatory queries
          const isClauseOrRegulatory = v31Result.intent === 'standard_clause_definition' || 
                                      v31Result.intent === 'regulatory_question' ||
                                      v31Result.intent === 'standard_structure_question';
          
          if (!isClauseOrRegulatory && persona) {
            try {
              const personality = (await import('../services/edcatPersonality.js')).default;
              const personaProfile = await personality.getPersonaForTenant(
                conversationContext.tenant_id || tenantId || DEFAULT_TENANT_ID, 
                'vera'
              );
              finalAnswer = await personality.applyCulturalInfluence(
                personaProfile, 
                finalAnswer, 
                {
                  context,
                  intent: v31Result.intent,
                  confidence: 0.8, // High confidence for v3.1 answers
                  isFirstResponse: !conversationContext || conversationContext.message_count === 0,
                  isHighFormality: false,
                  conversationContext: conversationContext
                }
              );
            } catch (err) {
              console.warn('[VeraConversationalEngine] Could not apply personality:', err.message);
            }
          }
          
          console.log(`[Vera-ENGINE] Using v3.1 final answer (length: ${finalAnswer.length})`);
          return finalAnswer;
        } else {
          console.log(`[Vera-ENGINE] v3.1 returned empty answer, falling through to legacy handlers`);
        }
      } else {
        console.log(`[Vera-ENGINE] Branch chosen: SKIP_V31 (isPureGreeting: ${isPureGreeting}, intent: ${intent})`);
      }
    } catch (v31Error) {
      console.error('[Vera-ENGINE] v3.1 reasoning error (falling back to v3.0):', v31Error.message);
      console.error('[Vera-ENGINE] v3.1 error stack:', v31Error.stack);
      // Fall through to v3.0 reasoning
    }

    // FALLBACK: Call Reasoning Engine v3.0 for multi-pass reasoning
    let reasoningResult = null;
    try {
      const VeraReasoningEngine = (await import('./vera/VeraReasoningEngine.js')).default;
      reasoningResult = await VeraReasoningEngine.reason({
        tenantId,
        message,
        intent,
        conversationContext,
        standardContext: {
          standard_id: context.standards?.[0]?.standard_id,
          standard_codes: context.standards?.map(s => s.code) || []
        },
        rawContext: context,
        userProfile
      });
      
      // If reasoning suggests clarification, return that
      if (reasoningResult?.needsClarification && reasoningResult?.clarificationQuestion) {
        return reasoningResult.clarificationQuestion;
      }
      
      // CRITICAL: Use direct answers from reasoning engine (content-first, no personality yet)
      // Direct answers come from database lookups and are factual
      if (reasoningResult?.draftAnswer) {
        // For direct database answers (clause lookups, standard definitions, etc.), use immediately
        if (reasoningResult.metadata?.directAnswer || reasoningResult.overallConfidence >= 0.7) {
          // Apply light personality AFTER content (content-first approach)
          let finalAnswer = reasoningResult.draftAnswer;
          
          // Only apply personality for non-clause/regulatory queries
          const isClauseOrRegulatory = intent === 'clause_lookup' || 
                                      intent === 'standard_definition' || 
                                      intent === 'regulatory_mapping' ||
                                      reasoningResult.metadata?.directAnswer;
          
          if (!isClauseOrRegulatory && persona) {
            try {
              const personality = (await import('../services/edcatPersonality.js')).default;
              const personaProfile = await personality.getPersonaForTenant(
                conversationContext.tenant_id || tenantId || DEFAULT_TENANT_ID, 
                'vera'
              );
              finalAnswer = await personality.applyCulturalInfluence(
                personaProfile, 
                finalAnswer, 
                {
                  context,
                  intent,
                  confidence: reasoningResult.overallConfidence,
                  isFirstResponse: !conversationContext || conversationContext.message_count === 0,
                  isHighFormality: false, // Keep it professional but not overly formal
                  conversationContext: conversationContext
                }
              );
            } catch (err) {
              console.warn('[VeraConversationalEngine] Could not apply personality:', err.message);
            }
          }
          
          return finalAnswer;
        }
      }
    } catch (reasoningError) {
      console.warn('[VeraConversationalEngine] Reasoning engine error (continuing with legacy):', reasoningError.message);
      // Continue with legacy routing
    }

    // Get or create conversation session
    // CRITICAL FIX: Convert 'system' userId to a valid UUID to avoid database errors
    const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001'; // Special UUID for system user
    const effectiveUserId = userId === 'system' ? SYSTEM_USER_ID : userId;
    
    let conversationSession = null;
    let recentHistory = [];
    if (sessionId || userId !== 'system') {
      conversationSession = await VeraRepository.Conversation.getOrCreateSession(
        effectiveUserId,
        tenantId,
        sessionId || conversationContext.conversation_id
      );
      
      // Get recent conversation history to avoid repetition
      try {
        const historyResult = await queryEdcatAI(
          `SELECT role, message_content, created_at 
           FROM edcat.vera_conversation_history 
           WHERE conversation_id = $1 
           ORDER BY created_at DESC 
           LIMIT 5`,
          [conversationSession.conversation_id]
        );
        recentHistory = historyResult.rows || [];
      } catch (err) {
        console.warn('[VeraConversationalEngine] Could not load conversation history:', err.message);
      }
      
      // Save user message to conversation history
      await VeraRepository.Conversation.saveConversationTurn(
        conversationSession.conversation_id,
        'user',
        message,
        { intent, context: { standards_count: standards.length, documents_count: documents.length } }
      );
    }

    // NEW: Route through Skill Orchestrator for advanced queries
    // This ensures all advanced engines are properly invoked
    try {
      const orchestratorContext = {
        userId: effectiveUserId,
        tenantId,
        conversationId: conversationSession?.conversation_id || sessionId,
        standards,
        documents,
        regulatoryWebsites
      };

      // Use orchestrator for clause queries, regulatory queries, research, and gap analysis
      const shouldUseOrchestrator = 
        intent === 'compliance_question' ||
        intent === 'gap_analysis_request' ||
        lowerMessage.match(/(?:clause|section|requirement)\s*([\d]+\.[\d]+(?:\.[\d]+)*)/i) ||
        lowerMessage.match(/(casa|faa|easa|caac)(?:\s+part\s+(\d+))?/i) ||
        lowerMessage.includes('research') ||
        lowerMessage.includes('find') ||
        lowerMessage.includes('look up');

      if (shouldUseOrchestrator) {
        console.log('[VeraConversationalEngine] Routing through Skill Orchestrator');
        const orchestratorResult = await VeraSkillOrchestrator.orchestrate(
          message,
          orchestratorContext,
          conversationContext
        );

        if (orchestratorResult && orchestratorResult.response) {
          // Save orchestrator response to conversation history
          if (conversationSession) {
            await VeraRepository.Conversation.saveConversationTurn(
              conversationSession.conversation_id,
              'assistant',
              orchestratorResult.response,
              { intent, orchestrator_used: true, task: orchestratorResult.task }
            );
          }

          return orchestratorResult.response;
        }
      }
    } catch (orchestratorError) {
      console.error('[VeraConversationalEngine] Orchestrator error (falling back to legacy):', orchestratorError);
      // Fall through to legacy handling
    }

    // Build response based on intent and context
    let response = '';

    // Use reasoning result if available and high confidence
    if (reasoningResult && reasoningResult.overallConfidence >= 0.7 && reasoningResult.draftAnswer) {
      // For admin/identity/meta queries, use reasoning result directly
      if (['admin_system_query', 'identity_query', 'meta_ai_query'].includes(intent)) {
        response = reasoningResult.draftAnswer;
      }
    }

    // If no response from reasoning, use switch statement
    if (!response) {
      console.log(`[Vera-ENGINE] No response from reasoning engines, using legacy switch statement with intent: ${intent}`);
    switch (intent) {
      case 'compliance_question':
        response = await this.handleComplianceQuestion(message, context, conversationContext);
        break;
      
      case 'gap_analysis_request':
        response = await this.handleGapAnalysisRequest(message, context, conversationContext, recentHistory);
        break;
      
      case 'audit_prep_request':
        response = await this.handleAuditPrepRequest(message, context, conversationContext);
        break;
      
      case 'capa_request':
        response = await this.handleCapaRequest(message, context, conversationContext);
        break;
      
      case 'metrics_query':
        response = await this.handleMetricsQuery(message, context, conversationContext);
        break;
      
      case 'industry_question':
        response = await this.handleIndustryQuestion(message, context, conversationContext);
        break;
      
      case 'regulatory_update':
        response = await this.handleRegulatoryUpdate(message, context, conversationContext);
        break;
      
      case 'standard_comparison':
        response = await this.handleStandardComparison(message, context, conversationContext);
        break;
      
      case 'procedure_request':
        response = await this.handleProcedureRequest(message, context, conversationContext);
        break;
      
      case 'capability_query':
        response = await this.handleCapabilityQuery(context, conversationContext, persona);
        break;
      
      case 'self_improvement_query':
        response = await this.handleSelfImprovementQuery(message, context, conversationContext);
        break;
      
      case 'system_help':
        response = await this.handleSystemHelp(message, context, conversationContext);
        break;
      
      case 'knowledge_database':
        response = await this.handleKnowledgeDatabaseQuery(context, conversationContext);
        break;
      
      case 'casual_chat':
        response = this.handleCasualChat(message, conversationContext, persona);
        break;
      
      case 'greeting':
        // CRITICAL: Check if this is actually a definition query disguised as greeting
        const hasDefinitionInGreeting = /(?:define|what is|what's|explain|tell me about|what does)\s+/i.test(message);
        if (hasDefinitionInGreeting) {
          console.log(`[Vera-ENGINE] Detected definition query in greeting case, routing to v3.1 reasoning instead`);
          // Try v3.1 reasoning one more time
          try {
            const VeraReasoningEngine = (await import('./vera/VeraReasoningEngine.js')).default;
            const v31Result = await VeraReasoningEngine.reasonV31({
              tenantId,
              userId: userId || 'system',
              message,
              context: {
                ...context,
                conversationContext,
                userProfile
              }
            });
            if (v31Result && v31Result.finalAnswer && v31Result.finalAnswer.trim().length > 0) {
              response = v31Result.finalAnswer;
              break;
            }
          } catch (err) {
            console.error('[Vera-ENGINE] Error in greeting case v3.1 retry:', err.message);
          }
        }
        console.log(`[Vera-ENGINE] Using legacy greeting handler`);
        response = this.handleGreeting(message, conversationContext, persona);
        break;
      
      case 'self_introduction':
        response = await this.handleSelfIntroduction(message, context, conversationContext, persona);
        // Apply personality immediately for self-introduction with high conversational level
        response = this.applyPersonality(response, persona, intent, message);
        // Also apply cultural influence for extra conversational boost
        try {
          const personality = (await import('../services/edcatPersonality.js')).default;
          const personaProfile = await personality.getPersonaForTenant(conversationContext.tenant_id || '00000000-0000-0000-0000-000000000000', 'vera');
          const enhancedResponse = await personality.applyCulturalInfluence(personaProfile, response, {
            isFirstResponse: true,
            isHighFormality: false,
            conversationContext: conversationContext,
            context: context,
            intent: intent
          });
          // Ensure we always return a string
          response = typeof enhancedResponse === 'string' ? enhancedResponse : String(enhancedResponse || response);
        } catch (err) {
          // Continue without extra personality if it fails
          console.warn('[VeraConversationalEngine] Could not apply personality to self-intro:', err.message);
          // Ensure response is a string even on error
          response = typeof response === 'string' ? response : String(response || '');
        }
        return response;
      
      case 'standard_explanation':
        // Handle standard explanation requests
        const standardMatch = message.match(/(?:teach me about|explain|tell me about|what is|what's|learn about)\s+(as\d+|iso\s*\d+|iatf\s*\d+|faa\s*part\s*\d+|easa|iso\s*13485|iso\s*9001)/i);
        if (standardMatch) {
          const standardName = standardMatch[1].trim();
          const normalizedName = standardName.toUpperCase().replace(/\s+/g, '').replace(/ISO/g, 'ISO ').replace(/AS/g, 'AS');
          const standard = standards.find(s => {
            const code = s.code.toUpperCase();
            const normalizedCode = code.replace(/\s+/g, '').replace(/ISO/g, 'ISO ').replace(/AS/g, 'AS');
            return normalizedCode.includes(normalizedName) || normalizedName.includes(normalizedCode) || 
                   code.includes(standardName.toUpperCase()) || standardName.toUpperCase().includes(code);
          });
          if (standard) {
            response = await this.handleStandardExplanation(standard, message, context, conversationContext);
          } else {
            response = await this.handleStandardExplanationByName(standardName, message, context, conversationContext);
          }
        } else {
          // Fallback if pattern didn't match
          response = await this.handleGeneralQuery(message, context, conversationContext);
        }
        break;
      
      // NEW: Expert capability handlers
      case 'clause_explanation':
        response = await this.handleClauseExplanation(message, context, conversationContext, persona);
        break;
      
      case 'clause_comparison':
        response = await this.handleClauseComparison(message, context, conversationContext);
        break;
      
      case 'authority_explanation':
        response = await this.handleAuthorityExplanation(message, context, conversationContext, persona);
        break;
      
      case 'authority_comparison':
        response = await this.handleAuthorityComparison(message, context, conversationContext);
        break;
      
      case 'customer_profile':
        response = await this.handleCustomerProfile(message, context, conversationContext);
        break;
      
      case 'customer_procedure_lookup':
        response = await this.handleCustomerProcedureLookup(message, context, conversationContext);
        break;
      
      case 'compliance_check':
        response = await this.handleComplianceCheck(message, context, conversationContext);
        break;
      
      case 'compliance_comparison':
        response = await this.handleComplianceComparison(message, context, conversationContext);
        break;
      
      case 'regulatory_alignment':
        response = await this.handleRegulatoryAlignment(message, context, conversationContext);
        break;
      
      case 'company_introduction':
        response = await this.handleCompanyIntroduction(message, context, conversationContext, tenantId);
        break;
      
      case 'explicit_learning_request':
        response = await this.handleExplicitLearningRequest(message, context, conversationContext, tenantId, sessionId, effectiveUserId);
        break;
      
      case 'user_preference_update':
        response = await this.handleUserPreferenceUpdate(message, context, conversationContext, tenantId, sessionId, effectiveUserId, userProfile);
        break;
      
      case 'parse_standard':
        response = await this.handleParseStandard(message, context, conversationContext, tenantId, sessionId, effectiveUserId, userProfile, reasoningResult);
        break;
      
      case 'customer_document_query':
        response = await this.handleCustomerDocumentQuery(message, context, conversationContext, tenantId, sessionId, effectiveUserId, userProfile, reasoningResult);
        break;
      
      case 'document_upload_no_context':
        response = await this.handleDocumentUploadNoContext(message, context, conversationContext, tenantId, sessionId, effectiveUserId, userProfile, reasoningResult);
        break;
      
      case 'document_upload_classification_response':
        response = await this.handleDocumentUploadClassificationResponse(message, context, conversationContext, tenantId, sessionId, effectiveUserId, userProfile, reasoningResult);
        break;
      
      case 'identity_query':
        // Direct route to identity/existence questions
        response = await this.handleGeneralKnowledgeQuery(message, context, conversationContext, tenantId);
        break;
      
      case 'admin_system_query':
        // Handle admin/system queries (databases, functions, architecture)
        response = await this.handleAdminSystemQuery(message, context, conversationContext, tenantId, userProfile);
        break;
      
      case 'meta_ai_query':
        // Route meta queries through Q&A bank first, then general knowledge
        response = await this.handleGeneralQAOrMetaQuery(message, context, conversationContext, intent, tenantId, sessionId, effectiveUserId);
        if (!response) {
          response = await this.handleGeneralKnowledgeQuery(message, context, conversationContext, tenantId);
        }
        break;
      
      default:
        // NEW: Try Q&A bank lookup first for meta/architecture/training queries
        response = await this.handleGeneralQAOrMetaQuery(message, context, conversationContext, intent, tenantId, sessionId, effectiveUserId);
        if (!response) {
          // Fallback to existing handlers
          const lowerMsg = (message || '').toLowerCase();
          if (lowerMsg.includes('conform-edge') || lowerMsg.includes('conform edge') || 
              lowerMsg.includes('who are you') || lowerMsg.includes('who am i') ||
              lowerMsg.includes('what is conform-edge') || lowerMsg.includes('what is conform edge')) {
            response = await this.handleGeneralKnowledgeQuery(message, context, conversationContext, tenantId);
          } else {
            response = await this.handleGeneralQuery(message, context, conversationContext);
          }
        }
    }
    } // End of if (!response) block

    // NEW: Always apply personality enhancement before returning
    if (response && persona) {
      try {
        const personality = (await import('../services/edcatPersonality.js')).default;
        const personaProfile = await personality.getPersonaForTenant(
          conversationContext.tenant_id || tenantId || DEFAULT_TENANT_ID, 
          'vera'
        );
        response = await personality.applyCulturalInfluence(
          personaProfile, 
          response, 
          {
            context,
            intent,
            confidence: context?.confidence || 0.8,
            isFirstResponse: !conversationContext || conversationContext.message_count === 0,
            isHighFormality: personality.detectHighFormalityContext(response, context),
            conversationContext: conversationContext
          }
        );
      } catch (err) {
        console.warn('[VeraConversationalEngine] Could not apply personality:', err.message);
      }
    }

    // Detect industry and enhance with industry-specific terminology
    const industryDetection = VeraIndustryTerminology.detectIndustry(context);
    if (industryDetection.industry !== 'general' && industryDetection.confidence > 0.3) {
      response = VeraIndustryTerminology.enhanceWithTerminology(response, industryDetection.industry);
      response = VeraIndustryTerminology.addIndustryExamples(response, industryDetection.industry, message);
    }

    // Enhance with manufacturing terminology definitions (auto-expand acronyms and add context)
    await VeraTerminologyService.initialize();
    const terminologyDefinitions = VeraTerminologyService.enhanceTextWithDefinitions(response, 2);
    if (terminologyDefinitions.length > 0 && !response.includes('**') && response.length > 100) {
      // Only add definitions if response doesn't already have formatted content and is substantial
      let definitionsText = '';
      for (const def of terminologyDefinitions) {
        if (!response.includes(def.term)) {
          definitionsText += `\n\n*Note: ${def.term}${def.acronym ? ` (${def.acronym})` : ''} - ${def.definition.substring(0, 100)}...*`;
        }
      }
      if (definitionsText) {
        response += definitionsText;
      }
    }

    // Apply personality to response (make it natural and conversational)
    response = this.applyPersonality(response, persona, intent, message);

    // REMOVED: Proactive tips - only answer questions, no unsolicited suggestions
    // response = this.addFollowUpSuggestions(response, intent, context);

    // Save assistant response to conversation history and update context
    if (conversationSession) {
      await VeraRepository.Conversation.saveConversationTurn(
        conversationSession.conversation_id,
        'assistant',
        response,
        { intent, confidence: 0.80, response_length: response.length }
      );
      
      // Update conversation context with task tracking
      const taskMap = {
        'compliance_question': 'compliance_analysis',
        'gap_analysis_request': 'gap_analysis',
        'procedure_request': 'procedure_development',
        'standard_comparison': 'standard_comparison',
        'industry_question': 'industry_guidance',
        'research': 'research'
      };
      
      await VeraRepository.Conversation.updateConversationContext(
        conversationSession.conversation_id,
        {
          active_task: taskMap[intent] || 'general_query',
          current_phase: 'result_presentation',
          conversation_topic: message.substring(0, 255),
          last_vera_response: response.substring(0, 500)
        }
      );
    }

    // NEW: Apply user profile styling before returning
    if (userProfile) {
      response = this.applyUserProfileStyling(response, userProfile, intent);
    }

    return response;
  }

  /**
   * NEW: Apply user profile styling to responses
   * Adjusts style, detail level, and structure based on user role and preferences
   */
  applyUserProfileStyling(text, userProfile, intent) {
    if (!text || !userProfile) {
      return text;
    }

    let styled = text;

    // Get preferences
    const preferences = userProfile.preferences || {};
    const detailLevel = preferences.detail_level?.mode || preferences.detail_level || 'default';
    const summaryFirst = preferences.summary_first?.enabled || false;
    const responseStyle = preferences.response_style || 'default';

    // Role-based adjustments
    const role = userProfile.primaryRole;

    // Founder role: Always fully expand, maximum detail
    if (role === 'founder' && detailLevel !== 'min') {
      // Ensure full explanations are provided
      if (detailLevel === 'max' || detailLevel === 'default') {
        // Already detailed, no change needed
      }
    }

    // Executive role: Summary first if preference set
    if (role === 'executive' && summaryFirst && text.length > 300) {
      // Extract first paragraph as summary
      const firstParagraph = text.split('\n\n')[0];
      if (firstParagraph && firstParagraph.length < text.length * 0.5) {
        styled = `**Executive Summary:**\n${firstParagraph}\n\n**Details:**\n${text.substring(firstParagraph.length).trim()}`;
      }
    }

    // Auditor role: Add evidence-focused language
    if (role === 'auditor' && intent === 'compliance_question') {
      if (!styled.includes('evidence') && !styled.includes('objective evidence') && !styled.includes('audit')) {
        // Add subtle auditor-focused note if appropriate
        const sentences = styled.split('.');
        if (sentences.length > 0) {
          const lastSentence = sentences[sentences.length - 1].trim();
          if (lastSentence && lastSentence.length < 100) {
            styled = styled.replace(lastSentence, `${lastSentence} When auditing, ensure objective evidence demonstrates this requirement.`);
          }
        }
      }
    }

    // Detail level adjustments
    if (detailLevel === 'min' && text.length > 200) {
      // For minimal detail preference, try to condense
      const sentences = text.split('. ');
      if (sentences.length > 3) {
        styled = sentences.slice(0, 3).join('. ') + '.';
        if (sentences.length > 3) {
          styled += ' [Full details available on request]';
        }
      }
    }

    // Response style adjustments
    if (responseStyle === 'narrative' && text.includes('•')) {
      // Convert bullets to narrative if preferred
      styled = styled.replace(/•\s+/g, '');
      styled = styled.replace(/\n\n/g, ' ');
    }

    // Personalization: Use user's name if available
    if (userProfile.displayName && !styled.includes(userProfile.displayName)) {
      // Add personal touch at the beginning if appropriate
      if (intent === 'greeting' || intent === 'casual_chat') {
        styled = styled.replace(/^(Good|Hello|Hi)/i, `$1 ${userProfile.displayName}`);
      }
    }

    return styled;
  }

  /**
   * Handle compliance questions with intelligent retrieval
   */
  async handleComplianceQuestion(message, context, conversationContext) {
    const { standards = [], documents = [] } = context;
    const lowerMessage = message.toLowerCase();

    // CRITICAL: Route "what is a gap" directly to gap handler (may be misclassified as compliance_question)
    if (lowerMessage.includes('what is a gap') || lowerMessage.includes("what's a gap") || 
        lowerMessage.includes('what is gap') || lowerMessage.includes("what's gap") ||
        (lowerMessage.includes('what is') && lowerMessage.includes('gap') && 
         !lowerMessage.includes('analysis') && !lowerMessage.includes('gap analysis'))) {
      return await this.handleGapAnalysisRequest(message, context, conversationContext, []);
    }

    // Check if asking "what can you tell me about X" - provide direct answer, don't ask for more info
    if (lowerMessage.includes('what can you tell me about') || lowerMessage.includes('tell me about')) {
      const topic = message.replace(/what can you tell me about|tell me about/gi, '').trim();
      
      // If asking about gap analysis, route directly to gap analysis handler
      if (topic.toLowerCase().includes('gap') || topic.toLowerCase().includes('gap analysis')) {
        return await this.handleGapAnalysisRequest(message, context, conversationContext, []);
      }
      
      // If asking about a standard/regulation, handle it
      const hasStandardMention = /(casa|faa|easa|caac|iso|as\d+|iatf|part\s*\d+|21\s*cfr|regulation|standard)/i.test(topic);
      if (hasStandardMention) {
        // Continue with standard handling below
      } else {
        // Generic "tell me about X" - provide helpful response
        return `I'd be happy to tell you about ${topic}!\n\n` +
               `However, I'm specialized in compliance, quality management systems, and regulatory requirements. ` +
               `Could you clarify what aspect of ${topic} you'd like to know about?\n\n` +
               `For example:\n` +
               `• If it's about a standard: "Tell me about AS9100D requirements"\n` +
               `• If it's about compliance: "Tell me about gap analysis"\n` +
               `• If it's about my capabilities: "What can you do?"`;
      }
    }

    // Check if asking about Vera's capabilities/background (misclassified as compliance_question)
    // BUT only if NOT asking about a specific standard/regulation
    const hasStandardMention = /(casa|faa|easa|caac|iso|as\d+|iatf|part\s*\d+|21\s*cfr|regulation|standard)/i.test(message);
    if (!hasStandardMention && (lowerMessage.includes('capability') || lowerMessage.includes('can you') || 
        lowerMessage.includes('do you have') || lowerMessage.includes('what can you') ||
        lowerMessage.includes('education') || lowerMessage.includes('degree') ||
        lowerMessage.includes('certification') || lowerMessage.includes('certified') ||
        lowerMessage.includes('auditor') || lowerMessage.includes('expertise') ||
        lowerMessage.includes('background') || lowerMessage.includes('experience'))) {
      // Redirect to capability query handler
      return this.handleCapabilityQuery(context, conversationContext);
    }

    // CRITICAL: Check for "extract all requirements" queries FIRST (before other clause queries)
    // Pattern: "extract all requirements for X", "extract requirements for clause X", "show requirements for X"
    const extractPattern = /(?:extract|show|list|get)\s+(?:all\s+)?(?:requirements|reqs)\s+(?:for|from|in)\s*(?:clause\s*)?([\d]+\.[\d]+(?:\.[\d]+)*)/i;
    const extractMatch = message.match(extractPattern);
    if (extractMatch) {
      const clauseNum = extractMatch[1];
      // Extract standard if mentioned
      const standardInExtractQuery = message.match(/(?:of|from|in)\s+(as\d+|iso\s*\d+|iatf\s*\d+)/i);
      let extractStandardCode = null;
      if (standardInExtractQuery) {
        const stdMatch = standardInExtractQuery[1].trim();
        const prefix = stdMatch.match(/(as|iso|iatf)/i)?.[1]?.toUpperCase() || '';
        const number = stdMatch.match(/(\d{4,5})/)?.[1] || '';
        extractStandardCode = `${prefix}${number}`;
      }
      // Route to clause query handler with extract flag
      return await this.handleClauseQuery(clauseNum, extractStandardCode, standards, message, conversationContext);
    }
    
    // CRITICAL: Check for clause queries (before standard queries)
    // Pattern: "explain clause X", "what is clause X", "clause X of Y", etc.
    const clauseQueryPattern = /(?:explain|what is|what's|tell me about|describe)\s+(?:clause|section|requirement)\s*([\d]+\.[\d]+(?:\.[\d]+)*)/i;
    const clauseQueryMatch = message.match(clauseQueryPattern);
    if (clauseQueryMatch) {
      const clauseNum = clauseQueryMatch[1];
      // Extract standard if mentioned (e.g., "clause 7.1.5 of AS9100")
      const standardInClauseQuery = message.match(/(?:of|from|in)\s+(as\d+|iso\s*\d+|iatf\s*\d+)/i);
      let clauseStandardCode = null;
      if (standardInClauseQuery) {
        const stdMatch = standardInClauseQuery[1].trim();
        const prefix = stdMatch.match(/(as|iso|iatf)/i)?.[1]?.toUpperCase() || '';
        const number = stdMatch.match(/(\d{4,5})/)?.[1] || '';
        clauseStandardCode = `${prefix}${number}`;
      }
      // Route to clause query handler immediately
      return await this.handleClauseQuery(clauseNum, clauseStandardCode, standards, message, conversationContext);
    }
    
    // Check if asking "what is [standard]" / "teach me about [standard]" / "explain [standard]" - provide conversational explanation
    // This must come AFTER clause queries to avoid misclassification
    // More flexible pattern that handles variations like "AS9100", "AS 9100", "AS-9100", "tell me about AS9100", etc.
    // Also handles cases where standard name comes first: "AS9100, tell me about it" or just "AS9100"
    const standardQueryMatch = lowerMessage.match(/(?:what is|what's|explain|tell me about|teach me about|learn about|tell me more about|what do you know about)\s+([a-z]{2,4}[\s\-]?\d{3,5}[a-z]?|iso[\s\-]?\d{4,5}|iatf[\s\-]?\d{4,5}|faa[\s\-]?part[\s\-]?\d+|easa|iso[\s\-]?13485|iso[\s\-]?9001)/i) ||
                               lowerMessage.match(/^([a-z]{2,4}[\s\-]?\d{3,5}[a-z]?|iso[\s\-]?\d{4,5}|iatf[\s\-]?\d{4,5}|faa[\s\-]?part[\s\-]?\d+|easa|iso[\s\-]?13485|iso[\s\-]?9001)(?:\s*[,\-]?\s*(?:tell me|what is|explain|about))?$/i);
    if (standardQueryMatch) {
      try {
        const standardName = standardQueryMatch[1] ? standardQueryMatch[1].trim() : standardQueryMatch[0].trim();
        if (!standardName) {
          // If we can't extract a name, try to find it in the message directly
          const directMatch = message.match(/\b(AS\d{4}[A-Z]?|ISO\s*\d{4,5}|IATF\s*\d{4,5}|FAA\s*Part\s*\d+|EASA|ISO\s*13485|ISO\s*9001)\b/i);
          if (directMatch) {
            const extractedName = directMatch[1].trim();
            return await this.handleStandardExplanationByName(extractedName, message, context, conversationContext);
          }
        }
        
        // Find the standard in context
        const normalizedName = standardName.toUpperCase().replace(/\s+/g, '').replace(/ISO/g, 'ISO ').replace(/AS/g, 'AS');
        const standard = standards.find(s => {
          const code = s.code.toUpperCase();
          const normalizedCode = code.replace(/\s+/g, '').replace(/ISO/g, 'ISO ').replace(/AS/g, 'AS');
          return normalizedCode.includes(normalizedName) || normalizedName.includes(normalizedCode) || 
                 code.includes(standardName.toUpperCase()) || standardName.toUpperCase().includes(code);
        });
        if (standard) {
          return await this.handleStandardExplanation(standard, message, context, conversationContext);
        } else {
          // Provide conversational explanation even if standard not found
          return await this.handleStandardExplanationByName(standardName, message, context, conversationContext);
        }
      } catch (error) {
        console.error('[VeraConversationalEngine] Error in standardQueryMatch handler:', error);
        // Fall through to handleStandardExplanationByName with the matched name
        const standardName = standardQueryMatch[1] ? standardQueryMatch[1].trim() : standardQueryMatch[0].trim();
        if (standardName) {
          return await this.handleStandardExplanationByName(standardName, message, context, conversationContext);
        }
        // If we still can't extract, try to find standard name in message
        const directMatch = message.match(/\b(AS\d{4}[A-Z]?|ISO\s*\d{4,5}|IATF\s*\d{4,5}|FAA\s*Part\s*\d+|EASA|ISO\s*13485|ISO\s*9001)\b/i);
        if (directMatch) {
          return await this.handleStandardExplanationByName(directMatch[1].trim(), message, context, conversationContext);
        }
      }
    }
    
    // Also check for "teach me about AS9100" or "explain AS9100" without the "what is" prefix
    // More flexible pattern that handles variations like "AS9100", "AS 9100", "AS-9100", etc.
    // Also handles cases where standard name might appear alone or with minimal context
    const directStandardMatch = lowerMessage.match(/(?:teach me about|explain|tell me about|learn about)\s+([a-z]{2,4}[\s\-]?\d{3,5}[a-z]?|iso[\s\-]?\d{4,5}|iatf[\s\-]?\d{4,5}|faa[\s\-]?part[\s\-]?\d+|easa|iso[\s\-]?13485|iso[\s\-]?9001)/i) ||
                                // Handle cases like "Vera, tell me about AS9100" or just "AS9100" at start
                                (lowerMessage.startsWith('tell me about') || lowerMessage.startsWith('explain') || lowerMessage.startsWith('what is')) &&
                                message.match(/\b(AS\d{4}[A-Z]?|ISO\s*\d{4,5}|IATF\s*\d{4,5}|FAA\s*Part\s*\d+|EASA|ISO\s*13485|ISO\s*9001)\b/i);
    if (directStandardMatch) {
      try {
        const standardName = directStandardMatch[1] ? directStandardMatch[1].trim() : 
                            (directStandardMatch[0] ? message.match(/\b(AS\d{4}[A-Z]?|ISO\s*\d{4,5}|IATF\s*\d{4,5}|FAA\s*Part\s*\d+|EASA|ISO\s*13485|ISO\s*9001)\b/i)?.[1]?.trim() : null);
        if (!standardName) {
          // Try to extract from message directly
          const extracted = message.match(/\b(AS\d{4}[A-Z]?|ISO\s*\d{4,5}|IATF\s*\d{4,5}|FAA\s*Part\s*\d+|EASA|ISO\s*13485|ISO\s*9001)\b/i);
          if (extracted) {
            return await this.handleStandardExplanationByName(extracted[1].trim(), message, context, conversationContext);
          }
        }
        
        const normalizedName = standardName.toUpperCase().replace(/\s+/g, '').replace(/ISO/g, 'ISO ').replace(/AS/g, 'AS');
        const standard = standards.find(s => {
          const code = s.code.toUpperCase();
          const normalizedCode = code.replace(/\s+/g, '').replace(/ISO/g, 'ISO ').replace(/AS/g, 'AS');
          return normalizedCode.includes(normalizedName) || normalizedName.includes(normalizedCode) || 
                 code.includes(standardName.toUpperCase()) || standardName.toUpperCase().includes(code);
        });
        if (standard) {
          return await this.handleStandardExplanation(standard, message, context, conversationContext);
        } else {
          return await this.handleStandardExplanationByName(standardName, message, context, conversationContext);
        }
      } catch (error) {
        console.error('[VeraConversationalEngine] Error in directStandardMatch handler:', error);
        // Fall through to handleStandardExplanationByName with the matched name
        const extracted = message.match(/\b(AS\d{4}[A-Z]?|ISO\s*\d{4,5}|IATF\s*\d{4,5}|FAA\s*Part\s*\d+|EASA|ISO\s*13485|ISO\s*9001)\b/i);
        if (extracted) {
          return await this.handleStandardExplanationByName(extracted[1].trim(), message, context, conversationContext);
        }
      }
    }

    // Check if asking about terminology or definitions
    if (lowerMessage.includes('what is') || lowerMessage.includes("what's") || 
        lowerMessage.includes('define') || lowerMessage.includes('definition') ||
        lowerMessage.includes('terminology') || lowerMessage.includes('acronym') ||
        lowerMessage.includes('what does') || lowerMessage.match(/^[A-Z]{2,10}$/)) {
      // Check if it's asking about a specific term
      const termMatch = message.match(/(?:what is|what's|define|what does)\s+([A-Z][A-Za-z\s]+|[A-Z]{2,10})/i);
      if (termMatch) {
        return await this.handleTerminologyQuery(termMatch[1], message, context);
      }
    }

    // Check if asking about database or knowledge
    if (lowerMessage.includes('database') || lowerMessage.includes('knowledge') || 
        lowerMessage.includes('learning') || lowerMessage.includes('what do you know') ||
        lowerMessage.includes('what data') || lowerMessage.includes('your database')) {
      // Redirect to knowledge database query handler
      return await this.handleKnowledgeDatabaseQuery(context, conversationContext);
    }

    // STEP 1: Use Advanced Reasoning Engine (multi-step, semantic, learning)
    const advancedReasoning = await veraAdvancedReasoningEngine.reason(message, { standards, documents }, {
      useMultiStep: true,
      useSelfValidation: true,
      useContextMemory: true,
      maxSteps: 3
    });
    
    // Check if this is a regulatory request FIRST (before clause extraction)
    const regulatoryDetection = veraAdvancedReasoningEngine.detectRegulatoryRequest(message);
    const customerDetection = veraAdvancedReasoningEngine.detectCustomerRequest(message);
    
    // If regulatory request, handle it specially
    if (regulatoryDetection.isRegulatory) {
      return await this.handleRegulatoryRequest(regulatoryDetection, message, context, conversationContext);
    }
    
    // If customer overview request (not clause-specific), handle it
    if (customerDetection.isCustomerRequest && customerDetection.intent === 'overview') {
      // Extract standard from the request
      const standardMatch = message.match(/(?:iso|as|iatf)[\s\-+]*(\d{4,5})/i);
      if (standardMatch) {
        const number = standardMatch[1];
        const prefixMatch = message.match(/(iso|as|iatf)/i);
        const prefix = prefixMatch ? prefixMatch[1].toLowerCase() : 'iso';
        const standardCode = `${prefix.toUpperCase()}${number}`;
        
        // Find the standard
        const normalizedSearchCode = normalizeStandardCode(standardCode);
        const standard = standards.find(s => {
          const normalizedStandardCode = normalizeStandardCode(s.code);
          return normalizedStandardCode.includes(normalizedSearchCode) || 
                 normalizedSearchCode.includes(normalizedStandardCode) ||
                 normalizedStandardCode === normalizedSearchCode;
        });
        
        if (standard) {
          return await this.handleStandardOverviewRequest(standard, message, context);
        }
      }
    }
    
    // Fallback to basic deduction if advanced reasoning fails
    const deduction = advancedReasoning.finalOutput ? advancedReasoning : 
                      veraDeductiveReasoningEngine.deduceRequest(message, { standards, documents });
    
    // Extract clause number if mentioned - BUT EXCLUDE numbers that are part of regulatory "Part X"
    // Only extract clause numbers if NOT a regulatory request
    // NOTE: Clause queries with "explain" or "what is" are handled above, this is for other patterns
    let clauseNumber = null;
    if (!regulatoryDetection.isRegulatory) {
      // Match clause patterns - improved to catch "clause X", "section X", "requirement X", etc.
      // Also catch patterns like "clause X of Y" or just "X.Y" when "clause" appears in the message
      const clauseMatch = lowerMessage.match(/(?:clause|section|requirement)\s*([\d]+\.[\d]+(?:\.[\d]+)*)/) ||
                         (lowerMessage.includes('clause') && lowerMessage.match(/\b([\d]+\.[\d]+(?:\.[\d]+)*)\b/));
      if (clauseMatch) {
        clauseNumber = clauseMatch[1];
        console.log(`[handleGeneralQuery] Extracted clause number: ${clauseNumber}`);
      } else {
        // Try to extract from deduction
        clauseNumber = deduction.deduced?.clauseNumber || null;
        if (clauseNumber) {
          console.log(`[handleGeneralQuery] Using clause number from deduction: ${clauseNumber}`);
        }
      }
    }

    // Helper function to normalize standard codes for matching
    const normalizeStandardCode = (code) => {
      if (!code) return '';
      return code.toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric chars
        .replace(/\s+/g, ''); // Remove all spaces
    };

    // Extract standard/regulation if mentioned - IMPROVED to catch variations like ISO9001, ISO 9001, ISO-9001, etc.
    // More flexible pattern that handles: ISO9001, ISO 9001, ISO-9001, ISO+9001, AS9100, etc.
    const standardMatch = message.match(/(?:^|\s|,)(?:iso|as|iatf)[\s\-+]*(\d{4,5})|(casa|faa|easa|caac)(?:\s+part\s+(\d+))?|(21\s*cfr)|(?:^|\s)(part\s*\d+)/i);
    let standardCode = null;
    let standardName = null;
    
    // STEP 2: Use deduction result if confidence is high, otherwise try normal extraction
    if (deduction.deduced.standardCode && deduction.deduced.confidence > 0.6) {
      standardCode = deduction.deduced.standardCode;
      standardName = deduction.deduced.standardCode;
    } else if (standardMatch) {
      // Match ISO, AS, IATF standards (e.g., ISO9001, ISO 9001, ISO-9001, AS9100, etc.)
      if (standardMatch[1]) {
        const number = standardMatch[1];
        // Extract the prefix from the full match
        const fullMatch = standardMatch[0];
        const prefixMatch = fullMatch.match(/(iso|as|iatf)/i);
        const prefix = prefixMatch ? prefixMatch[1].toLowerCase() : '';
        
        if (prefix === 'iso') {
          standardCode = `ISO${number}`; // Keep without separator for flexible matching
          standardName = `ISO ${number}`;
        } else if (prefix === 'as') {
          standardCode = `AS${number}`;
          standardName = `AS${number}`;
        } else if (prefix === 'iatf') {
          standardCode = `IATF${number}`;
          standardName = `IATF ${number}`;
        }
      } 
      // Match regulatory bodies (CASA, FAA, EASA, CAAC)
      else if (standardMatch[2]) {
        const regulator = standardMatch[2].toLowerCase();
        const partNumber = standardMatch[3];
        if (regulator === 'casa') {
          standardCode = partNumber ? `CASA-PART-${partNumber}` : 'CASA';
          standardName = partNumber ? `CASA Part ${partNumber}` : 'CASA';
        } else if (regulator === 'faa') {
          standardCode = partNumber ? `FAA-PART-${partNumber}` : 'FAA';
          standardName = partNumber ? `FAA Part ${partNumber}` : 'FAA';
        } else if (regulator === 'easa') {
          standardCode = partNumber ? `EASA-PART-${partNumber}` : 'EASA';
          standardName = partNumber ? `EASA Part ${partNumber}` : 'EASA';
        } else if (regulator === 'caac') {
          standardCode = partNumber ? `CAAC-PART-${partNumber}` : 'CAAC';
          standardName = partNumber ? `CAAC Part ${partNumber}` : 'CAAC';
        }
      }
      // Match 21 CFR
      else if (standardMatch[4]) {
        standardCode = '21-CFR';
        standardName = '21 CFR';
      }
      // Match generic "part X" references
      else if (standardMatch[5]) {
        const partMatch = message.match(/part\s*(\d+)/i);
        if (partMatch) {
          standardCode = `PART-${partMatch[1]}`;
          standardName = `Part ${partMatch[1]}`;
        }
      }
    }

    // STEP 3: Use deduction to improve standard matching if normal extraction didn't work well
    if (!standardCode && deduction.deduced.standardCode && deduction.deduced.confidence > 0.5) {
      standardCode = deduction.deduced.standardCode;
      standardName = deduction.deduced.standardCode;
      console.log(`[Vera] Used deductive reasoning: "${standardCode}" from "${message}" (confidence: ${(deduction.deduced.confidence * 100).toFixed(0)}%)`);
      
      // If confidence is moderate, prepare clarification question
      if (deduction.deduced.confidence < 0.75 && deduction.needsClarification) {
        const clarification = veraDeductiveReasoningEngine.generateClarification(deduction, standards);
        if (clauseNumber) {
          // We have both standard and clause, but confidence is low - ask for confirmation
          return `I think you're asking about **${deduction.deduced.standardCode} clause ${clauseNumber}**. Is that correct?\n\n${clarification || ''}`;
        }
      }
    }

    // If asking about a specific clause
    if (clauseNumber) {
      // Use conversation context to determine standard if not specified
      let contextStandardCode = standardCode || deduction.deduced.standardCode;
      
      // Check conversation context for recently mentioned standard
      if (!contextStandardCode && conversationContext) {
        // Look for standard mentions in recent conversation
        const recentMessages = conversationContext.recent_messages || [];
        for (const msg of recentMessages.slice(-5).reverse()) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            const msgText = (msg.message || msg.message_content || '').toLowerCase();
            // Look for standard codes in recent messages
            const standardMatch = msgText.match(/(?:as|iso|iatf)[\s\-]*(\d{4,5})/i);
            if (standardMatch) {
              const prefix = msgText.match(/(as|iso|iatf)/i)?.[1]?.toUpperCase() || '';
              const number = standardMatch[1];
              contextStandardCode = `${prefix}${number}`;
              console.log(`[Vera] Using standard from conversation context: ${contextStandardCode}`);
              break;
            }
          }
        }
        
        // Also check if last assistant response mentioned a standard
        if (!contextStandardCode && conversationContext.last_vera_response) {
          const lastResponse = conversationContext.last_vera_response.toLowerCase();
          const standardMatch = lastResponse.match(/(?:as|iso|iatf)[\s\-]*(\d{4,5})/i);
          if (standardMatch) {
            const prefix = lastResponse.match(/(as|iso|iatf)/i)?.[1]?.toUpperCase() || '';
            const number = standardMatch[1];
            contextStandardCode = `${prefix}${number}`;
            console.log(`[Vera] Using standard from last response: ${contextStandardCode}`);
          }
        }
      }
      
      return await this.handleClauseQuery(clauseNumber, contextStandardCode, standards, message, conversationContext);
    }

    // If asking about gaps
    if (lowerMessage.includes('gap') || lowerMessage.includes('missing') || lowerMessage.includes('nonconform')) {
      return await this.handleGapQuery(message, context, conversationContext);
    }

    // General compliance question - provide helpful context
    const parsedCount = standards.filter(s => s.requirements_count > 0).length;
    
    // If asking about a specific standard/regulation that's not in database, try deduction first
    if (standardCode && standardName) {
      const normalizedSearchCode = normalizeStandardCode(standardCode);
      let standard = standards.find(s => {
        const normalizedStandardCode = normalizeStandardCode(s.code);
        return normalizedStandardCode.includes(normalizedSearchCode) || 
               normalizedSearchCode.includes(normalizedStandardCode) ||
               normalizedStandardCode === normalizedSearchCode ||
               s.code.toLowerCase().includes(standardCode.toLowerCase()) ||
               s.name.toLowerCase().includes(standardName.toLowerCase());
      });
      
      if (!standard && deduction.deduced.standardCode) {
        // Try with deduced standard code
        const deducedCode = deduction.deduced.standardCode;
        const normalizedDeduced = normalizeStandardCode(deducedCode);
        standard = standards.find(s => {
          const normalizedStandardCode = normalizeStandardCode(s.code);
          return normalizedStandardCode.includes(normalizedDeduced) || 
                 normalizedDeduced.includes(normalizedStandardCode) ||
                 normalizedStandardCode === normalizedDeduced;
        });
        
        if (standard) {
          standardCode = deducedCode;
          console.log(`[Vera] Found standard using deduction: "${deducedCode}" matched to "${standard.code}"`);
        }
      }
      
      if (!standard) {
        // Standard not in database - trigger research OR ask for clarification with deduction
        if (deduction.needsClarification && deduction.deduced.standardCode) {
          const clarification = veraDeductiveReasoningEngine.generateClarification(deduction, standards);
          if (clarification) {
            return clarification;
          }
        }
        return await this.handleResearchRequest(message, standardName, standardCode, context, conversationContext);
      }
    }
    
    // If asking a general question without a specific standard, provide helpful response
    if (parsedCount === 0 && !standardCode) {
      // Check if it's a simple "what is" question that we can answer directly
      if (lowerMessage.includes('what is') || lowerMessage.includes("what's") || lowerMessage.includes('explain')) {
        // Check if asking about gap specifically
        if (lowerMessage.includes('gap')) {
          return await this.handleGapAnalysisRequest(message, context, conversationContext, []);
        }
        
        // Don't ask for more info - provide what we can
        return `I'd be happy to help! I'm specialized in compliance and quality management systems.\n\n` +
               `**What I can explain:**\n` +
               `• Gap analysis and compliance checking\n` +
               `• Standards like AS9100D, ISO 9001, ISO 13485\n` +
               `• Regulatory requirements (FAA, FDA, EASA)\n` +
               `• Quality management system concepts\n` +
               `• Audit preparation and procedures\n\n` +
               `To provide more specific answers, I'd need standards parsed in the system. ` +
               `Would you like me to help you parse a standard, or is there a specific compliance topic you'd like to know about?`;
      }
      
      return `I'd be happy to help with compliance questions! However, I need some standards parsed first to provide accurate answers.\n\n📚 **To get started:**\n1. Upload a standard document (ISO 9001, AS9100D, etc.)\n2. Use the parse interface or ask me to parse it\n3. Once parsed, I can answer detailed questions about clauses, requirements, and compliance\n\nWould you like me to help you parse a standard?`;
    }

    // Provide engineering-style guidance (not a menu)
    let response = '';
    
    if (standardCode) {
      // Use normalized matching for better compatibility
      const normalizedSearchCode = normalizeStandardCode(standardCode);
      const standard = standards.find(s => {
        const normalizedStandardCode = normalizeStandardCode(s.code);
        return normalizedStandardCode.includes(normalizedSearchCode) || 
               normalizedSearchCode.includes(normalizedStandardCode) ||
               normalizedStandardCode === normalizedSearchCode ||
               s.code.toLowerCase().includes(standardCode.toLowerCase()) ||
               (standardName && s.name.toLowerCase().includes(standardName.toLowerCase()));
      });
      if (standard) {
        response += `You're asking about ${standard.code || standard.name}. `;
        response += `I have ${standard.requirements_count || 0} parsed requirements from this standard. `;
        response += `I can explain specific clauses, identify compliance gaps in your procedures, match your documents to standard requirements, and generate gap analysis reports. `;
        response += `What specific aspect would you like to explore? For example, you could ask "What does clause 8.7 require?" or "Show gaps for ${standard.code || standard.name}".`;
      } else {
        // Should have been caught above, but fallback to research
        return await this.handleResearchRequest(message, standardName || standardCode, standardCode, context, conversationContext);
      }
    } else {
      response += `You have ${parsedCount} parsed standard(s) available. `;
      response += `I can work with specific clauses, compliance gaps, and requirements matching. `;
      response += `What would you like to know? For example: "What is clause 4.1?" or "Show gaps for AS9100" or "Match my procedures to ISO 9001".`;
    }

    return response;
  }

  /**
   * Generate clarifying questions for incomplete requests
   */
  generateClarification(whatWeHave, whatWeNeed, context) {
    const { standards = [], clauseNumber, standardCode, message } = context;
    const parsedStandards = standards.filter(s => s.requirements_count > 0);
    
    // Build a helpful clarification response
    let response = `I think I understand what you're looking for, but I need a bit more information to help you best.\n\n`;
    
    // If we have clause but no standard
    if (whatWeHave.clause && !whatWeHave.standard) {
      response += `I see you're asking about **clause ${clauseNumber}**, but I'm not sure which standard you're referring to.\n\n`;
      
      if (parsedStandards.length > 0) {
        response += `**I have these standards available:**\n`;
        parsedStandards.slice(0, 5).forEach(s => {
          response += `• ${s.code}${s.name ? ` (${s.name})` : ''}\n`;
        });
        if (parsedStandards.length > 5) {
          response += `• ... and ${parsedStandards.length - 5} more\n`;
        }
        response += `\n**Could you clarify which standard?** For example:\n`;
        response += `• "ISO 9001 clause ${clauseNumber}"\n`;
        response += `• "AS9100 clause ${clauseNumber}"\n`;
        response += `• Or just tell me the standard name\n`;
      } else {
        response += `I don't have any parsed standards yet. Would you like to upload and parse a standard first?`;
      }
    }
    // If we have standard but no clause
    else if (whatWeHave.standard && !whatWeHave.clause) {
      response += `I see you mentioned **${standardCode || 'a standard'}**, but I'm not sure which clause or requirement you'd like to know about.\n\n`;
      response += `**What would you like to know?** For example:\n`;
      response += `• "What does clause 4.1 require?"\n`;
      response += `• "Show me the requirements for clause 8.7"\n`;
      response += `• "Extract requirements for clause 9.2"\n`;
      response += `• Or just tell me the clause number\n`;
    }
    // If we have neither
    else if (!whatWeHave.clause && !whatWeHave.standard) {
      response += `I'd like to help, but I'm not sure what you're looking for.\n\n`;
      
      if (parsedStandards.length > 0) {
        response += `**I can help you with:**\n`;
        response += `• Questions about specific clauses (e.g., "What does ISO 9001 clause 4.1 require?")\n`;
        response += `• Extracting requirements in table format (e.g., "Show requirements for AS9100 clause 8.7")\n`;
        response += `• Compliance gap analysis\n`;
        response += `• Procedure drafting\n\n`;
        response += `**Available standards:** ${parsedStandards.slice(0, 3).map(s => s.code).join(', ')}${parsedStandards.length > 3 ? '...' : ''}\n\n`;
        response += `What would you like to know?`;
      } else {
        response += `I don't have any parsed standards yet. Would you like to upload and parse a standard first?`;
      }
    }
    // If standard not found but we think we know what they want
    else if (whatWeHave.clause && whatWeHave.standardAttempt && !whatWeHave.standardFound) {
      response += `I see you're asking about **clause ${clauseNumber}** and mentioned **${standardCode}**, but I couldn't find that exact standard in my database.\n\n`;
      
      if (parsedStandards.length > 0) {
        response += `**Did you mean one of these?**\n`;
        // Try to find similar standards
        const similarStandards = parsedStandards.filter(s => {
          const normalized = s.code.toLowerCase().replace(/[^a-z0-9]/g, '');
          const searchNormalized = (standardCode || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return normalized.includes(searchNormalized) || searchNormalized.includes(normalized);
        });
        
        if (similarStandards.length > 0) {
          similarStandards.slice(0, 3).forEach(s => {
            response += `• ${s.code}${s.name ? ` (${s.name})` : ''}\n`;
          });
        } else {
          parsedStandards.slice(0, 3).forEach(s => {
            response += `• ${s.code}${s.name ? ` (${s.name})` : ''}\n`;
          });
        }
        response += `\n**Or would you like to:**\n`;
        response += `• Upload and parse ${standardCode || 'this standard'}\n`;
        response += `• Try a different standard name\n`;
      } else {
        response += `I don't have any parsed standards yet. Would you like to upload and parse ${standardCode || 'a standard'} first?`;
      }
    }
    
    return response;
  }

  /**
   * Handle regulatory requests (FAA Part 21, EASA Part 145, etc.)
   */
  async handleRegulatoryRequest(regulatoryDetection, message, context, conversationContext) {
    const { standards = [] } = context;
    const { regulatoryCode, regulatoryName, partNumber } = regulatoryDetection;
    
    console.log(`[Vera] Handling regulatory request: ${regulatoryName} (${regulatoryCode})`);
    
    // Check if we have this regulatory standard in the database
    const normalizeStandardCode = (code) => {
      if (!code) return '';
      return code.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/\s+/g, '');
    };
    
    const normalizedRegCode = normalizeStandardCode(regulatoryCode);
    const standard = standards.find(s => {
      const normalizedStandardCode = normalizeStandardCode(s.code);
      return normalizedStandardCode.includes(normalizedRegCode) || 
             normalizedRegCode.includes(normalizedStandardCode) ||
             normalizedStandardCode === normalizedRegCode;
    });
    
    if (standard) {
      // We have it parsed - provide information
      const parsedCount = standard.requirements_count || 0;
      if (parsedCount > 0) {
        return `I have ${regulatoryName} parsed with ${parsedCount} requirement(s). ` +
               `I can explain specific requirements, identify compliance gaps, and answer questions about ${regulatoryName}. ` +
               `You can ask me things like "What does ${regulatoryName} require?" or "Show gaps for ${regulatoryName}".`;
      } else {
        return `I have **${regulatoryName}** in my database, but it hasn't been parsed yet.\n\n` +
               `Would you like me to parse it, or would you like me to research ${regulatoryName} online?`;
      }
    } else {
      // Not in database - trigger research
      return await this.handleResearchRequest(message, regulatoryName, regulatoryCode, context, conversationContext);
    }
  }

  /**
   * Handle standard overview requests (e.g., "tell me about AS9100 requirements")
   */
  async handleStandardOverviewRequest(standard, message, context) {
    const parsedCount = standard.requirements_count || 0;
    
    let response = `**${standard.code}${standard.name ? ` - ${standard.name}` : ''}**\n\n`;
    
    if (parsedCount > 0) {
      response += `I have ${parsedCount} requirement(s) parsed for this standard. `;
      response += `I can explain specific clauses and requirements, extract requirements in table format, identify compliance gaps in your procedures, match your documents to standard requirements, and generate gap analysis reports. `;
      response += `You can ask me things like "What does clause 8.7 require?" or "Extract requirements for clause 9.2" or "Show gaps for ${standard.code}".`;
    } else {
      response += `This standard is in my database but hasn't been parsed yet. `;
      response += `To get started, I'll need to parse the standard to extract requirements. Once parsed, I can answer detailed questions about clauses and requirements. `;
      response += `Would you like me to help you parse ${standard.code}?`;
    }
    
    return response;
  }

  /**
   * Handle "what is [standard]" queries with conversational explanations
   */
  /**
   * ENHANCED: When explaining a standard, be conversational not list-based
   */
  async handleStandardExplanation(standard, message, context, conversationContext) {
    const standardCode = standard.code.toUpperCase();
    const parsedCount = standard.requirements_count || 0;
    
    // Check if asking about clause count
    const lowerMessage = (message || '').toLowerCase();
    if (lowerMessage.includes('how many') && (lowerMessage.includes('clause') || lowerMessage.includes('auditable'))) {
      return await this.handleClauseCountQuery(standard, message, context, conversationContext);
    }
    
    // Don't list what the standard does—explain what it MEANS
    const standardExplanations = {
      'AS9100D': "AS9100D is the aerospace quality standard. Think of it as ISO 9001 with an aerospace twist—it layers on requirements around configuration management, counterfeit parts, and FOD that the aerospace industry absolutely has to have. The key shift in the latest revision is risk-based thinking. They want you considering what happens if something goes wrong, not just checking boxes. What part of AS9100 are you working with?",
      
      'ISO-9001': "ISO 9001 is the foundational quality management standard. It's about having a documented system that shows you understand your processes, you control them, and you keep improving. Most other standards build on top of this one. Are you looking at this from a design perspective, manufacturing, or getting audit-ready?",
      
      'ISO9001': "ISO 9001 is the foundational quality management standard. It's about having a documented system that shows you understand your processes, you control them, and you keep improving. Most other standards build on top of this one. Are you looking at this from a design perspective, manufacturing, or getting audit-ready?",
      
      'ISO-13485': "ISO 13485 is the medical device quality standard. It's ISO 9001 but with extra layers for regulatory compliance, risk management, and traceability—because when you're making devices that go into people, the stakes are higher. Are you working on device design, manufacturing, or regulatory submission?",
      
      'ISO13485': "ISO 13485 is the medical device quality standard. It's ISO 9001 but with extra layers for regulatory compliance, risk management, and traceability—because when you're making devices that go into people, the stakes are higher. Are you working on device design, manufacturing, or regulatory submission?"
    };
    
    // Check if we have a pre-built explanation
    const normalizedCode = standardCode.replace(/[^A-Z0-9]/g, '');
    let response = standardExplanations[normalizedCode] || standardExplanations[standardCode];
    
    // If no pre-built explanation, generate custom one
    if (!response) {
      response = await this.generateCustomExplanation(standard, context);
    }
    
    // Add parsed count info if available (ensure it doesn't replace the opening statement)
    if (parsedCount > 0) {
      // Only replace the final period if there is one, don't modify the rest
      const trimmedResponse = response.trim();
      const finalChar = trimmedResponse[trimmedResponse.length - 1];
      if (finalChar === '.' || finalChar === '?') {
        response = trimmedResponse.slice(0, -1);
      } else {
        response = trimmedResponse;
      }
      response += ` I've got ${parsedCount} requirement${parsedCount > 1 ? 's' : ''} from ${standardCode} parsed, so I can answer detailed questions about specific clauses or help you with gap analysis.`;
    } else {
      const trimmedResponse = response.trim();
      const finalChar = trimmedResponse[trimmedResponse.length - 1];
      if (finalChar === '.' || finalChar === '?') {
        response = trimmedResponse.slice(0, -1);
      } else {
        response = trimmedResponse;
      }
      response += ` I have ${standardCode} in my database, but it hasn't been parsed yet. Once it's parsed, I can help you understand its requirements and check your compliance.`;
    }
    
    // Make sure it's conversational, not templated
    return response;
  }
  
  /**
   * Generate custom explanation for standards not in the pre-built list
   */
  async generateCustomExplanation(standard, context) {
    const standardCode = standard.code.toUpperCase();
    let response = `So, ${standardCode} is `;
    
    if (standardCode.includes('AS9100')) {
      response += "an aerospace quality management standard based on ISO 9001. It's specifically designed for the aerospace industry and includes all the requirements of ISO 9001, plus additional aerospace-specific requirements around things like configuration management, risk management, counterfeit parts prevention, and special requirements. It's widely used in the aerospace supply chain—if you're making parts for aircraft, chances are your customers will want you certified to AS9100. ";
    } else if (standardCode.includes('ISO 9001') || standardCode.includes('ISO9001')) {
      response += "the international standard for quality management systems. It's all about ensuring organizations consistently meet customer requirements and continuously improve their processes. It's based on seven quality principles: customer focus, leadership, engagement of people, process approach, improvement, evidence-based decision making, and relationship management. It's probably the most widely adopted quality standard in the world. ";
    } else if (standardCode.includes('ISO 13485') || standardCode.includes('ISO13485')) {
      response += "the quality management standard specifically for medical devices. It's based on ISO 9001 but tailored for the medical device industry, with extra emphasis on regulatory compliance, risk management, and traceability. If you're making medical devices, this is the standard you need to follow. ";
    } else if (standardCode.includes('FAA PART') || standardCode.includes('FAA')) {
      response += "a Federal Aviation Administration regulation. The FAA has different \"parts\" covering different aspects of aviation—Part 21 covers aircraft certification, Part 145 covers repair stations, Part 120 covers drug and alcohol testing, and so on. These are mandatory regulations, not optional standards. ";
    } else {
      response += "a quality or regulatory standard. ";
      if (standard.name) {
        response += `${standard.name}. `;
      }
    }
    
    response += "What would you like to know about it?";
    return response;
  }

  /**
   * Handle standard explanation when standard not found in context
   */
  async handleStandardExplanationByName(standardName, message, context, conversationContext) {
    // Check if asking about clause count
    const lowerMessage = (message || '').toLowerCase();
    if (lowerMessage.includes('how many') && (lowerMessage.includes('clause') || lowerMessage.includes('auditable'))) {
      // Try to find the standard in context
      const { standards = [] } = context;
      const normalizedName = standardName.toUpperCase().replace(/\s+/g, '').replace(/ISO/g, 'ISO ').replace(/AS/g, 'AS');
      const standard = standards.find(s => {
        const code = s.code.toUpperCase();
        const normalizedCode = code.replace(/\s+/g, '').replace(/ISO/g, 'ISO ').replace(/AS/g, 'AS');
        return normalizedCode.includes(normalizedName) || normalizedName.includes(normalizedCode) || 
               code.includes(standardName.toUpperCase()) || standardName.toUpperCase().includes(code);
      });
      
      if (standard) {
        return await this.handleClauseCountQuery(standard, message, context, conversationContext);
      }
    }

    // Format standard name properly (ISO 9001, not iso9001)
    const formatStandardName = (name) => {
      if (!name) return name;
      const upperName = name.toUpperCase();
      // Handle ISO standards: ISO9001 -> ISO 9001, iso9001 -> ISO 9001
      const isoMatch = upperName.match(/^(ISO)(\d{4,5})$/);
      if (isoMatch) {
        return `${isoMatch[1]} ${isoMatch[2]}`;
      }
      // Handle AS standards: AS9100 -> AS9100, as9100 -> AS9100
      const asMatch = upperName.match(/^(AS)(\d{4,5}[A-Z]?)$/);
      if (asMatch) {
        return `${asMatch[1]}${asMatch[2]}`;
      }
      // Preserve original if already formatted
      return name;
    };
    
    const formattedName = formatStandardName(standardName);
    const upperName = formattedName.toUpperCase();
    
    // More conversational, natural responses - like a colleague explaining
    let response = '';
    
    // Provide conversational explanations for common standards
    if (upperName.includes('AS9100')) {
      response = `AS9100 is the aerospace quality standard. Think of it as ISO 9001 with an aerospace twist—it layers on requirements around configuration management, counterfeit parts, and FOD (Foreign Object Debris) that the aerospace industry absolutely has to have. `;
      response += `The key shift in the latest revision (AS9100D) is risk-based thinking. They want you considering what happens if something goes wrong, not just checking boxes. `;
      response += `If you're making parts for aircraft, chances are your customers will want you certified to AS9100. `;
      response += `What part of AS9100 are you working with—design, manufacturing, or getting audit-ready?`;
    } else if (upperName.includes('ISO 9001') || upperName.includes('ISO9001')) {
      response = `ISO 9001 is the foundational quality management standard. It's about having a documented system that shows you understand your processes, you control them, and you keep improving. `;
      response += `Most other standards build on top of this one. `;
      response += `Are you looking at this from a design perspective, manufacturing, or getting audit-ready?`;
    } else if (upperName.includes('ISO 13485') || upperName.includes('ISO13485')) {
      response = `ISO 13485 is the medical device quality standard. It's ISO 9001 but with extra layers for regulatory compliance, risk management, and traceability—because when you're making devices that go into people, the stakes are higher. `;
      response += `Are you working on device design, manufacturing, or regulatory submission?`;
    } else if (upperName.includes('FAA')) {
      response = `FAA regulations are mandatory requirements from the Federal Aviation Administration. The FAA has different "parts" covering different aspects of aviation—Part 21 covers aircraft certification, Part 145 covers repair stations, Part 120 covers drug and alcohol testing, and so on. `;
      response += `These aren't optional standards—they're regulations you must comply with. `;
      response += `Which part are you working with?`;
    } else {
      response = `${formattedName} is a quality or regulatory standard. `;
      response += `I can help you understand its requirements, check your compliance, or answer questions about specific clauses. `;
      response += `What would you like to know about it?`;
    }
    
    return response;
  }

  /**
   * Handle clause count queries (e.g., "How many auditable clauses are there?")
   */
  async handleClauseCountQuery(standard, message, context, conversationContext) {
    const { queryPostgres } = await import('../../config/databases.js');
    const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';
    
    try {
      const standardId = standard.standard_id || standard.id;
      if (!standardId) {
        return `I can see ${standard.code} in my database, but I need the standard ID to count clauses. Could you try asking about a specific standard that's been parsed?`;
      }

      // Query for distinct clause references
      const clauseCountResult = await queryPostgres(
        `SELECT 
          COUNT(DISTINCT clause_ref) as distinct_clauses,
          COUNT(DISTINCT clause_number) as distinct_clause_numbers,
          COUNT(*) as total_requirements,
          COUNT(*) FILTER (WHERE is_in_scope = true) as in_scope_requirements
         FROM public.parsed_requirements
         WHERE standard_id = $1`,
        [standardId]
      );

      const counts = clauseCountResult.rows[0] || {};
      const distinctClauses = parseInt(counts.distinct_clauses || counts.distinct_clause_numbers || 0, 10);
      const totalRequirements = parseInt(counts.total_requirements || 0, 10);
      const inScopeRequirements = parseInt(counts.in_scope_requirements || 0, 10);

      if (distinctClauses === 0 && totalRequirements === 0) {
        return `${standard.code} is in my database, but it hasn't been parsed yet. Once parsed, I'll be able to tell you exactly how many auditable clauses it contains. Would you like me to help you parse it?`;
      }

      // Get top-level clause breakdown (clauses 4-10 typically)
      const topLevelClauses = await queryPostgres(
        `SELECT 
          split_part(COALESCE(clause_ref, clause_number), '.', 1) as top_clause,
          COUNT(DISTINCT COALESCE(clause_ref, clause_number)) as subclause_count,
          COUNT(*) as requirement_count
         FROM public.parsed_requirements
         WHERE standard_id = $1 
           AND is_in_scope = true
         GROUP BY split_part(COALESCE(clause_ref, clause_number), '.', 1)
         ORDER BY top_clause::int NULLS LAST
         LIMIT 10`,
        [standardId]
      );

      let response = `${standard.code} has **${distinctClauses} distinct auditable clause${distinctClauses !== 1 ? 's' : ''}** `;
      response += `with **${inScopeRequirements} in-scope requirement${inScopeRequirements !== 1 ? 's' : ''}** parsed. `;
      
      if (topLevelClauses.rows.length > 0) {
        response += `\n\n**Top-level clause breakdown:**\n`;
        topLevelClauses.rows.forEach(row => {
          const clauseNum = row.top_clause || 'N/A';
          const subclauseCount = parseInt(row.subclause_count || 0, 10);
          const reqCount = parseInt(row.requirement_count || 0, 10);
          response += `• Clause ${clauseNum}: ${subclauseCount} subclause${subclauseCount !== 1 ? 's' : ''}, ${reqCount} requirement${reqCount !== 1 ? 's' : ''}\n`;
        });
      }

      response += `\nYou can ask me about specific clauses like "What does clause 8.7 require?" or "Explain clause 7.2".`;

      return response;
    } catch (error) {
      console.error('[VeraConversationalEngine] Error in handleClauseCountQuery:', error);
      return `I can see ${standard.code} in my database, but I'm having trouble querying the parsed requirements right now. This might be because the standard hasn't been parsed yet, or there's a database connection issue. Could you try asking about a specific clause instead?`;
    }
  }

  /**
   * Handle clause-specific queries
   */
  async handleClauseQuery(clauseNumber, standardCode, standards, message, conversationContext = null) {
    const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';
    
    try {
      // Helper function to normalize standard codes for matching
      const normalizeStandardCode = (code) => {
        if (!code) return '';
        return code.toLowerCase()
          .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric chars
          .replace(/\s+/g, ''); // Remove all spaces
      };

      // Find the standard
      let targetStandard = null;
      let standardFound = false;
      
      // If no standard specified, try to infer from conversation context
      if (!standardCode && conversationContext) {
        // Look for standard mentions in conversation history
        const recentMessages = conversationContext.recent_messages || [];
        for (const msg of recentMessages.slice(-10).reverse()) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            const msgText = (msg.message || msg.message_content || '').toLowerCase();
            const standardMatch = msgText.match(/(?:as|iso|iatf)[\s\-]*(\d{4,5})/i);
            if (standardMatch) {
              const prefix = msgText.match(/(as|iso|iatf)/i)?.[1]?.toUpperCase() || '';
              const number = standardMatch[1];
              standardCode = `${prefix}${number}`;
              console.log(`[handleClauseQuery] Inferred standard from context: ${standardCode}`);
              break;
            }
          }
        }
      }
      
      if (standardCode) {
        const normalizedSearchCode = normalizeStandardCode(standardCode);
        targetStandard = standards.find(s => {
          const normalizedStandardCode = normalizeStandardCode(s.code);
          // Check if codes match after normalization, or if standard code contains the search term
          return normalizedStandardCode.includes(normalizedSearchCode) || 
                 normalizedSearchCode.includes(normalizedStandardCode) ||
                 normalizedStandardCode === normalizedSearchCode;
        });
        
        if (targetStandard) {
          standardFound = true;
        }
        
        // If still not found, try fuzzy matching with just the numbers (e.g., "9001", "9100")
        if (!targetStandard && /(\d+)/.test(standardCode)) {
          const numberMatch = standardCode.match(/(\d+)/);
          if (numberMatch) {
            const number = numberMatch[1];
            targetStandard = standards.find(s => {
              const normalized = normalizeStandardCode(s.code);
              return normalized.includes(number) && (
                normalized.includes('iso') || 
                normalized.includes('as') || 
                normalized.includes('iatf')
              );
            });
            if (targetStandard) {
              standardFound = true;
            }
          }
        }
      } else if (standards.length > 0) {
        // No standard specified - prioritize standards that were recently mentioned
        // First, try to find AS9100, ISO 9001, or other common standards
        const commonStandards = ['AS9100', 'ISO 9001', 'ISO9001', 'ISO-9001', 'ISO 13485', 'ISO13485'];
        for (const commonCode of commonStandards) {
          const normalizedCommon = normalizeStandardCode(commonCode);
          targetStandard = standards.find(s => {
            const normalizedStandardCode = normalizeStandardCode(s.code);
            return normalizedStandardCode.includes(normalizedCommon) || 
                   normalizedCommon.includes(normalizedStandardCode);
          });
          if (targetStandard) {
            console.log(`[handleClauseQuery] Using common standard: ${targetStandard.code}`);
            break;
          }
        }
        
        // If no common standard found, use the one with the most requirements (most likely to be relevant)
        if (!targetStandard) {
          targetStandard = standards.reduce((prev, curr) => 
            (curr.requirements_count || 0) > (prev.requirements_count || 0) ? curr : prev
          );
          console.log(`[handleClauseQuery] Using standard with most requirements: ${targetStandard.code}`);
        }
      }

      // STEP 3: If no standard found, try deductive reasoning
      if (!targetStandard || (standardCode && !standardFound)) {
        // Use deductive reasoning to find standard
        const deduction = veraDeductiveReasoningEngine.deduceRequest(message, { standards, documents: [] });
        
        if (deduction.deduced.standardCode && deduction.deduced.confidence > 0.5) {
          // Try to match the deduced standard
          const deducedCode = deduction.deduced.standardCode;
          const normalizedDeduced = normalizeStandardCode(deducedCode);
          
          targetStandard = standards.find(s => {
            const normalizedStandardCode = normalizeStandardCode(s.code);
            return normalizedStandardCode.includes(normalizedDeduced) || 
                   normalizedDeduced.includes(normalizedStandardCode) ||
                   normalizedStandardCode === normalizedDeduced;
          });
          
          if (targetStandard) {
            standardCode = deducedCode;
            standardFound = true;
            console.log(`[Vera] Deduced standard: "${deducedCode}" from input "${message}" (confidence: ${(deduction.deduced.confidence * 100).toFixed(0)}%)`);
          }
        }
        
        // If still not found or confidence is low, ask for clarification with deduction info
        if (!targetStandard || (standardCode && !standardFound)) {
          const clarification = veraDeductiveReasoningEngine.generateClarification(deduction, standards);
          if (clarification && deduction.deduced.standardCode) {
            return `I think you're asking about **${deduction.deduced.standardCode}**, but I'm not completely sure.\n\n${clarification}\n\n**Did you mean:** ${deduction.deduced.standardCode}?`;
          }
          
          return this.generateClarification(
            { clause: true, standard: false, standardAttempt: !!standardCode, standardFound: false },
            { standard: true },
            { standards, clauseNumber, standardCode, message }
          );
        }
      }

      // Check if user wants table format (extract requirements, show requirements table, etc.)
      const lowerMessage = (message || '').toLowerCase();
      const wantsTable = lowerMessage.includes('extract') || 
                        lowerMessage.includes('table') || 
                        lowerMessage.includes('list requirements') ||
                        lowerMessage.includes('show requirements');

      if (wantsTable) {
        // Get all requirements for clause in table format
        const tableRows = await StandardsIntelligenceService.getRequirementsForClauseTable(
          targetStandard.id,
          clauseNumber
        );

        if (tableRows.length === 0) {
          return `I couldn't find any "shall" requirements for clause ${clauseNumber} in ${targetStandard.code}.\n\n` +
                 `This might mean:\n` +
                 `• The clause doesn't exist in this standard revision\n` +
                 `• The standard needs to be parsed first\n` +
                 `• The clause has no "shall" requirements (only guidance/notes)\n\n` +
                 `Would you like me to check if the standard is parsed?`;
        }

        // Format as table
        let response = `**Clause ${clauseNumber} Requirements from ${targetStandard.code}**\n\n`;
        response += `| Clause | Clause Name | Paragraph | Requirement |\n`;
        response += `|--------|-------------|-----------|-------------|\n`;
        
        for (const row of tableRows) {
          const clause = row.clause || clauseNumber;
          const clauseName = (row.clause_name || 'N/A').substring(0, 50); // Truncate long names
          const paragraph = row.paragraph || 'P1';
          const requirement = (row.requirement || 'N/A').substring(0, 200); // Truncate long requirements
          response += `| ${clause} | ${clauseName} | ${paragraph} | ${requirement} |\n`;
        }

        response += `\n**Total:** ${tableRows.length} requirement(s) extracted.\n\n`;
        response += `_Note: Only "shall" requirements are shown. Notes and guidance are excluded._`;

        return response;
      }

      // Get ALL requirements for this clause (not just one)
      const tableRows = await StandardsIntelligenceService.getRequirementsForClauseTable(
        targetStandard.id,
        clauseNumber
      );

      if (tableRows && tableRows.length > 0) {
        // Build comprehensive response with ALL requirements
        let response = `**Clause ${clauseNumber} from ${targetStandard.code}**\n\n`;
        
        // Group by subclause if there are multiple
        const subclauses = new Map();
        tableRows.forEach(row => {
          const clause = row.clause || clauseNumber;
          if (!subclauses.has(clause)) {
            subclauses.set(clause, []);
          }
          subclauses.get(clause).push(row);
        });

        // Display all requirements
        subclauses.forEach((rows, clauseRef) => {
          if (subclauses.size > 1) {
            response += `**${clauseRef}**\n\n`;
          }
          
          rows.forEach((row, idx) => {
            const clauseName = row.clause_name || '';
            const requirement = row.requirement || '';
            
            if (clauseName && clauseName !== 'N/A') {
              response += `**${clauseName}**\n`;
            }
            response += `${requirement}\n\n`;
          });
        });

        response += `**Total:** ${tableRows.length} requirement(s) found.\n`;
        
        return response;
      }
      
      // Fallback: Try to get at least one requirement if table format didn't work
      const requirement = await StandardsIntelligenceService.getRequirementByClause(
        targetStandard.id,
        clauseNumber
      );

      if (requirement) {
        let response = `**Clause ${clauseNumber} from ${targetStandard.code}**\n\n`;
        response += `${requirement.requirement_text || requirement.requirement || 'Requirement details available.'}\n\n`;
        
        if (requirement.confidence && requirement.confidence < 0.8) {
          response += `⚠️ Note: This extraction has ${(requirement.confidence * 100).toFixed(0)}% confidence. `;
          response += `You may want to verify against the original standard document.\n`;
        }
        
        return response;
      } else {
        return `I couldn't find clause ${clauseNumber} in ${targetStandard.code}. ` +
               `This might mean:\n` +
               `• The clause doesn't exist in this standard revision\n` +
               `• The standard needs to be parsed first\n` +
               `• The clause number format might be different\n\n` +
               `Would you like me to list available clauses for ${targetStandard.code}?`;
      }
    } catch (error) {
      console.error('[VeraConversationalEngine] Error handling clause query:', error);
      return `I encountered an issue looking up clause ${clauseNumber}. Could you try rephrasing your question?`;
    }
  }

  /**
   * Handle gap analysis requests with ComplianceGapAnalyzer integration
   */
  async handleGapAnalysisRequest(message, context, conversationContext, recentHistory = []) {
    const { standards = [], documents = [] } = context;
    const parsedStandards = standards.filter(s => s.requirements_count > 0);
    const lowerMessage = message.toLowerCase();

    // Check if we've already answered this question recently
    const similarPreviousResponse = recentHistory.find(h => 
      h.role === 'assistant' && 
      h.message_content && 
      (h.message_content.includes('gap analysis') || h.message_content.includes('procedures and documents'))
    );
    
    // Check for "how to perform" / "how do you perform" questions - provide step-by-step instructions
    if (lowerMessage.includes('how to') || lowerMessage.includes('how do') || lowerMessage.includes('how can')) {
      if (lowerMessage.includes('perform') || lowerMessage.includes('do') || lowerMessage.includes('run') || lowerMessage.includes('conduct')) {
        return `**How to Perform a Gap Analysis:**\n\n` +
               `**Step 1: Prepare Your Documents**\n` +
               `• Upload your QMS procedures, work instructions, and quality documents\n` +
               `• Ensure documents are in a readable format (PDF, Word, etc.)\n` +
               `• I currently see ${documents.length} document(s) in your library\n\n` +
               `**Step 2: Parse a Standard**\n` +
               `• Upload and parse a compliance standard (e.g., AS9100D, ISO 9001, ISO 13485)\n` +
               `• I'll extract all requirements from the standard\n` +
               `• I currently see ${parsedStandards.length} parsed standard(s) available\n\n` +
               `**Step 3: Run the Analysis**\n` +
               `• Ask me: "analyze gaps for [standard name]" or "show compliance gaps"\n` +
               `• I'll compare each requirement against your procedures\n` +
               `• I'll identify missing, partial, and low-confidence matches\n\n` +
               `**Step 4: Review Results**\n` +
               `• I'll provide a detailed gap report with:\n` +
               `  - Missing requirements (not addressed at all)\n` +
               `  - Partial gaps (addressed but incomplete)\n` +
               `  - Confidence scores for each match (0-100%)\n` +
               `  - Specific recommendations for closing gaps\n\n` +
               `**Step 5: Take Action**\n` +
               `• Use my recommendations to update your procedures\n` +
               `• Add missing requirements to close gaps\n` +
               `• Enhance partial coverage to improve confidence scores\n\n` +
               ``;
      }
    }

    // If asking "what is" or "explain", provide educational response
    if (lowerMessage.includes('what is') || lowerMessage.includes('what\'s') || lowerMessage.includes('explain') || 
        lowerMessage.includes('what are') || lowerMessage.includes('define')) {
      
      // Check if asking specifically about "a gap" vs "gap analysis"
      if (lowerMessage.includes('what is a gap') || lowerMessage.includes("what's a gap") || 
          (lowerMessage.includes('gap') && !lowerMessage.includes('analysis'))) {
        return `A **gap** (in compliance terms) is a requirement from a standard or regulation that isn't fully addressed in your documented procedures.\n\n` +
               `**Types of gaps:**\n\n` +
               `• **Missing Gap:** The requirement is completely absent from your procedures\n` +
               `• **Partial Gap:** The requirement is mentioned but missing key elements (e.g., missing who, what, when, where, or how)\n` +
               `• **Low Confidence Gap:** The requirement might be addressed, but the connection is unclear or weak\n\n` +
               `**Why gaps matter:**\n` +
               `Gaps can lead to nonconformities during audits, regulatory issues, and quality problems. Identifying and closing gaps proactively helps ensure compliance.\n\n` +
               `**How I help:**\n` +
               `I can analyze your procedures against standards like AS9100D or ISO 9001 to identify gaps, score them by severity, and provide recommendations for closing them.`;
      }
      
      if (similarPreviousResponse) {
        // Already explained - provide more specific details
        return `**Gap Analysis - Quick Summary:**\n\n` +
               `A gap analysis compares your documented procedures against standard requirements to identify:\n\n` +
               `**1. Missing Requirements:** Requirements not addressed in your procedures\n` +
               `**2. Partial Coverage:** Requirements addressed but missing key elements\n` +
               `**3. Confidence Scoring:** Each match scored 0-100% based on:\n` +
               `   • Keyword matching (exact terms)\n` +
               `   • Semantic similarity (meaning)\n` +
               `   • Context alignment (where it appears)\n` +
               `   • Structural patterns (how it's organized)\n\n` +
               `**4. Actionable Output:** For each gap, I provide:\n` +
               `   • What needs to be added\n` +
               `   • Where to add it in your procedures\n` +
               `   • Suggested wording/structure\n\n` +
               `**To run one:** Say "analyze gaps for [standard]" or "show compliance gaps"`;
      }
      // First time explaining
      return `**Gap Analysis** is a systematic comparison between your documented procedures and the requirements from standards/regulations.\n\n` +
             `**What it includes:**\n\n` +
             `• **Requirement Matching:** I compare each requirement from your parsed standards against your uploaded procedures\n` +
             `• **Gap Identification:** I flag requirements that are:\n` +
             `  - Not addressed in your procedures\n` +
             `  - Partially addressed (missing key elements)\n` +
             `  - Addressed but with low confidence\n` +
             `• **Confidence Scoring:** Each match gets a confidence score (0-100%) based on:\n` +
             `  - Keyword matching\n` +
             `  - Semantic similarity\n` +
             `  - Context alignment\n` +
             `  - Structural patterns\n` +
             `• **Actionable Recommendations:** For each gap, I suggest:\n` +
             `  - What needs to be added to your procedures\n` +
             `  - Where to add it\n` +
             `  - How to structure it\n\n` +
             `**To run a gap analysis:**\n` +
             `1. Upload your QMS procedures (I see you have ${documents.length} document(s) uploaded)\n` +
             `2. Ask me: "analyze gaps for [standard name]" or "show compliance gaps"\n` +
             `3. I'll generate a detailed gap report\n\n` +
             `Would you like me to analyze gaps for a specific standard?`;
    }

    // Check prerequisites
    if (parsedStandards.length === 0) {
      // Check if we've already told them this
      if (similarPreviousResponse && similarPreviousResponse.message_content.includes('parsed standard')) {
        return `I still need at least one parsed standard to run gap analysis. Have you uploaded and parsed a standard yet? If so, which one?`;
      }
      return `I can help you identify compliance gaps! However, I need at least one parsed standard to compare against your documents.\n\n` +
             `**To get started:**\n` +
             `1. Upload and parse a standard (e.g., AS9100D, ISO 9001)\n` +
             `2. Upload your procedures and documents\n` +
             `3. Ask me to "analyze gaps" or "show compliance gaps"\n\n` +
             `Would you like help parsing a standard first?`;
    }

    if (documents.length === 0) {
      // Check if we've already told them this
      if (similarPreviousResponse && similarPreviousResponse.message_content.includes('procedures and documents')) {
        return `I'm still waiting for your procedures. Once you upload them, I can immediately start the gap analysis. Have you uploaded any documents yet?`;
      }
      return `I can analyze compliance gaps! I see you have ${parsedStandards.length} parsed standard(s), but I need your procedures and documents to compare against.\n\n` +
             `**Next steps:**\n` +
             `1. Upload your QMS documents (procedures, work instructions, etc.)\n` +
             `2. Then ask me to "analyze gaps" or "show compliance gaps for [standard]"\n\n` +
             `Would you like to upload documents now?`;
    }

    // Extract standard and customer ID from context if available
    const standardMatch = lowerMessage.match(/(iso[\s-]?9001|as9100|iso[\s-]?13485|iatf[\s-]?16949)/i);
    const standardCode = standardMatch ? standardMatch[1].toUpperCase().replace(/\s+/g, '-') : null;
    
    let targetStandard = null;
    if (standardCode) {
      targetStandard = parsedStandards.find(s => 
        s.code.toLowerCase().includes(standardCode.toLowerCase())
      );
    } else if (parsedStandards.length > 0) {
      targetStandard = parsedStandards[0];
    }

    // If user explicitly wants to run analysis, use ComplianceGapAnalyzer
    if (lowerMessage.includes('analyze') || lowerMessage.includes('run') || lowerMessage.includes('start')) {
      if (!targetStandard) {
        return `I'm ready to analyze gaps! Which standard would you like me to analyze against?\n\n` +
               `**Available standards:** ${parsedStandards.map(s => s.code).join(', ')}\n\n` +
               `Try: "Analyze gaps for ${parsedStandards[0].code}"`;
      }

      // Get customer ID from context (this would come from the request)
      const customerId = conversationContext.customerId || '00000000-0000-0000-0000-000000000000';
      
      try {
        const analyzer = getComplianceGapAnalyzer();
        const analysisResults = await analyzer.analyzeComplianceGaps(
          customerId,
          targetStandard.id,
          { minConfidence: 0.7, includePartialMatches: true }
        );

        // Format the results
        const report = analyzer.generateReport(analysisResults, 'text');
        return `**Gap Analysis Results for ${targetStandard.code}**\n\n${report}\n\n` +
               `**Summary:**\n` +
               `• Total Requirements: ${analysisResults.totalRequirements}\n` +
               `• Gaps Identified: ${analysisResults.gaps.length}\n` +
               `• Coverage: ${((1 - analysisResults.gaps.length / analysisResults.totalRequirements) * 100).toFixed(1)}%\n\n` +
               `Would you like me to generate a detailed report or help create CAPAs for these gaps?`;
      } catch (error) {
        console.error('[VeraConversationalEngine] Gap analysis error:', error);
        return `I encountered an issue running the gap analysis: ${error.message}\n\n` +
               `Please ensure:\n` +
               `• The standard is fully parsed\n` +
               `• Documents are uploaded and accessible\n` +
               `• Try again or ask for help`;
      }
    }

    // Ready for gap analysis - provide guidance
    return `Great! I can help you identify compliance gaps.\n\n` +
           `**I have:**\n` +
           `📚 ${parsedStandards.length} parsed standard(s): ${parsedStandards.map(s => s.code).join(', ')}\n` +
           `📋 ${documents.length} document(s) uploaded\n\n` +
           `**I can:**\n` +
           `• Compare your documents against standard requirements\n` +
           `• Identify missing or incomplete coverage\n` +
           `• Generate a detailed gap analysis report\n\n` +
           `Say "analyze gaps" or "show gaps for [standard]" to start!`;
  }

  /**
   * Handle gap analysis queries (legacy method - redirects to new handler)
   */
  async handleGapQuery(message, context, conversationContext) {
    const { standards = [], documents = [] } = context;
    const parsedStandards = standards.filter(s => s.requirements_count > 0);

    if (parsedStandards.length === 0) {
      return `I can help you identify compliance gaps! However, I need at least one parsed standard to compare against your documents.\n\n` +
             `**To get started:**\n` +
             `1. Upload and parse a standard (e.g., AS9100D, ISO 9001)\n` +
             `2. Upload your procedures and documents\n` +
             `3. Ask me to "analyze gaps" or "show compliance gaps"\n\n` +
             `Would you like help parsing a standard first?`;
    }

    if (documents.length === 0) {
      return `I can analyze compliance gaps. I see you have ${parsedStandards.length} parsed standard(s), but I need your procedures and documents to compare against.`;
    }

    // Ready for gap analysis
    return `Great! I can help you identify compliance gaps.\n\n` +
           `**I have:**\n` +
           `📚 ${parsedStandards.length} parsed standard(s): ${parsedStandards.map(s => s.code).join(', ')}\n` +
           `📋 ${documents.length} document(s) uploaded\n\n` +
           `**I can:**\n` +
           `• Compare your documents against standard requirements\n` +
           `• Identify missing or incomplete coverage\n` +
           `• Generate a detailed gap analysis report\n\n` +
           `Say "analyze gaps" or "show gaps for [standard]" to start!`;
  }

  /**
   * Handle procedure requests
   */
  async handleProcedureRequest(message, context, conversationContext) {
    const { standards = [] } = context;
    const parsedStandards = standards.filter(s => s.requirements_count > 0);

    if (parsedStandards.length === 0) {
      return `I'd love to help you draft procedures! However, I need a parsed standard to base the procedure on.\n\n` +
             `**To get started:**\n` +
             `1. Upload and parse a standard (e.g., AS9100D)\n` +
             `2. Ask me to "draft a procedure for clause X" or "create a procedure for [requirement]"\n\n` +
             `Would you like help parsing a standard first?`;
    }

    // Extract clause or requirement from message
    const clauseMatch = message.match(/(?:clause|section|requirement)?\s*([\d]+\.[\d]+(?:\.[\d]+)*)/i);
    if (clauseMatch) {
      const clauseNumber = clauseMatch[1];
      
      // Try to get the requirement using StandardsIntelligenceService
      let requirementDetails = null;
      for (const standard of parsedStandards) {
        requirementDetails = await StandardsIntelligenceService.getRequirementByClause(
          standard.id,
          clauseNumber
        );
        if (requirementDetails) break;
      }
      
      if (requirementDetails) {
        return `I can help you draft a procedure for clause ${clauseNumber}!\n\n` +
               `**Requirement from ${parsedStandards.find(s => s.id === requirementDetails.standard_id)?.code || 'standard'}:**\n` +
               `${requirementDetails.requirement_text?.substring(0, 300) || 'Requirement details available.'}...\n\n` +
               `**To proceed, I'll need:**\n` +
               `• What type of procedure? (Quality Procedure, Work Instruction, etc.)\n` +
               `• Any specific organizational context?\n\n` +
               `Would you like me to draft a procedure template based on this requirement?`;
      }
      
      return `I can help you draft a procedure for clause ${clauseNumber}!\n\n` +
             `**To proceed, I'll need:**\n` +
             `• Which standard? (I see: ${parsedStandards.map(s => s.code).join(', ')})\n` +
             `• What type of procedure? (Quality Procedure, Work Instruction, etc.)\n\n` +
             `Or I can draft a procedure based on the requirements in clause ${clauseNumber}. Would you like me to proceed?`;
    }

    return `I can help you draft procedures based on your parsed standards!\n\n` +
           `**Available standards:** ${parsedStandards.map(s => s.code).join(', ')}\n\n` +
           `**To draft a procedure, ask me:**\n` +
           `• "Draft a procedure for clause 8.7"\n` +
           `• "Create a work instruction for [requirement]"\n` +
           `• "Write a procedure for [standard] clause [number]"\n\n` +
           `What would you like me to draft?`;
  }

  /**
   * Handle capability queries
   */
  async handleCapabilityQuery(context, conversationContext, persona = {}) {
    const { standards = [], documents = [] } = context;
    const parsedCount = standards.filter(s => s.requirements_count > 0).length;

    // Natural, conversational response - like GPT or Claude
    let response = `I'm Vera, your AI compliance companion. `;
    
    if (parsedCount > 0) {
      response += `I'm currently working with ${parsedCount} parsed standard${parsedCount > 1 ? 's' : ''} in your library. `;
    }
    
    response += `I can help you with compliance work in several ways. `;
    response += `I can parse requirements from standards, regulations, and customer documents, `;
    response += `identify gaps by comparing your procedures against requirements, `;
    response += `answer detailed questions about specific clauses, `;
    response += `research regulations online when they're not in my database, `;
    response += `help draft procedures and documentation, and provide audit preparation guidance. `;
    
    // NEW: Enhanced capabilities
    response += `I also have enhanced capabilities including simultaneous multi-standard comparison, `;
    response += `predictive audit finding identification to help you prepare before audits, `;
    response += `automatic procedure template suggestions based on your gaps, `;
    response += `and I can understand your company's context and risk profile to provide more relevant advice. `;
    
    response += `I understand standards like AS9100D, ISO 9001, ISO 13485, and regulatory requirements from bodies like the FAA, CASA, and EASA. `;
    
    if (parsedCount > 0) {
      response += `Since you have ${parsedCount} parsed standard${parsedCount > 1 ? 's' : ''}, I can answer questions about their requirements right now. `;
    }
    
    response += `What would you like to work on?`;
    
    return response;
    
    // Add expert credentials (always show, even if not loaded from DB)
    const expertCreds = veraKnowledge.expertCredentials;
    
    response += `**🎓 My Expertise & Education:**\n`;
    response += `• Education: College graduate level in Quality Engineering\n`;
    response += `• Equivalent to: Bachelor's degree in Engineering with Quality Engineering specialization\n\n`;
    
    // Show credentials from loaded data if available, otherwise show default list
    if (expertCreds?.credentials) {
      const creds = expertCreds.credentials;
      
      // Certifications
      if (creds.certified_quality_engineer) {
        response += `• **Certified Quality Engineer (CQE)**\n`;
        if (creds.certified_quality_engineer.knowledge_domains) {
          response += `  - Knowledge: Quality Management, SPC, DOE, Reliability, Auditing, Risk Management, CAPA\n`;
        }
      }
      if (creds.faa_regulatory_auditor) {
        response += `• **FAA Regulatory Auditor**\n`;
        response += `  - Expertise: Part 21 (Certification), Part 145 (Repair Stations), ODA oversight\n`;
      }
      if (creds.fda_regulatory_auditor) {
        response += `• **FDA Regulatory Auditor**\n`;
        response += `  - Expertise: 21 CFR Part 820 (QSR), QSIT methodology, Medical Device Regulations\n`;
      }
      if (creds.as9100_certification_auditor) {
        response += `• **AS9100 Certification Auditor**\n`;
        response += `  - Knowledge: AS9100D, AS9101F, Aerospace-specific requirements\n`;
      }
      if (creds.as9100_internal_auditor) {
        response += `• **AS9100 Internal Auditor**\n`;
        response += `  - Expertise: Internal audit planning, process auditing, finding classification\n`;
      }
      if (creds.iso13485_lead_auditor) {
        response += `• **ISO 13485 Lead Auditor**\n`;
        response += `  - Expertise: ISO 13485:2016, ISO 14971 (Risk Management), Medical Device Regulations\n`;
      }
      if (creds.mdsap_auditor) {
        response += `• **MDSAP Auditor**\n`;
        response += `  - Expertise: Multi-region audits (FDA, Health Canada, TGA, ANVISA, PMDA)\n`;
      }
    } else {
      // Default credentials if not loaded from DB/files
      response += `• **Certified Quality Engineer (CQE)**\n`;
      response += `  - Knowledge: Quality Management, SPC, DOE, Reliability, Auditing, Risk Management, CAPA\n`;
      response += `• **FAA Regulatory Auditor**\n`;
      response += `  - Expertise: Part 21 (Certification), Part 145 (Repair Stations), ODA oversight\n`;
      response += `• **FDA Regulatory Auditor**\n`;
      response += `  - Expertise: 21 CFR Part 820 (QSR), QSIT methodology, Medical Device Regulations\n`;
      response += `• **AS9100 Certification Auditor**\n`;
      response += `  - Knowledge: AS9100D, AS9101F, Aerospace-specific requirements\n`;
      response += `• **AS9100 Internal Auditor**\n`;
      response += `  - Expertise: Internal audit planning, process auditing, finding classification\n`;
      response += `• **ISO 13485 Lead Auditor**\n`;
      response += `  - Expertise: ISO 13485:2016, ISO 14971 (Risk Management), Medical Device Regulations\n`;
      response += `• **MDSAP Auditor**\n`;
      response += `  - Expertise: Multi-region audits (FDA, Health Canada, TGA, ANVISA, PMDA)\n`;
    }
    response += `\n`;
    
    // Add audit capabilities specifically
    response += `**🔍 Audit Capabilities:**\n`;
    response += `• Internal audits (AS9100, ISO 9001, ISO 13485)\n`;
    response += `• Certification audit preparation and support\n`;
    response += `• Surveillance audit readiness\n`;
    response += `• Regulatory audits (FAA, FDA, EASA)\n`;
    response += `• MDSAP multi-region audits\n`;
    response += `• Gap analysis and compliance checking\n`;
    response += `• Audit evidence preparation\n`;
    response += `• Nonconformity management and CAPA development\n\n`;
    
    response += `**📋 Compliance Analysis**\n`;
    response += `• Answer questions about specific clauses and requirements\n`;
    response += `• Identify compliance gaps in your procedures\n`;
    response += `• Match your documents to standard requirements\n`;
    response += `• Generate gap analysis reports\n`;
    response += `• Provide audit-ready recommendations\n\n`;
    
    response += `**📝 Document Generation**\n`;
    response += `• Draft procedures based on standard requirements\n`;
    response += `• Create work instructions\n`;
    response += `• Generate compliance checklists\n`;
    response += `• Create audit-ready documentation\n\n`;
    
    response += `**🔍 Knowledge Base**\n`;
    if (parsedCount > 0) {
      response += `• ${parsedCount} parsed standard(s) available\n`;
    }
    if (documents.length > 0) {
      response += `• ${documents.length} document(s) in your library\n`;
    }
    response += `• Regulatory information (FAA, EASA, CAAC, FDA, Health Canada, TGA, ANVISA, PMDA)\n`;
    response += `• Cross-regulatory compliance mapping\n\n`;
    
    response += `**💬 Conversational Features**\n`;
    response += `• Multi-turn conversations with context memory\n`;
    response += `• Natural language understanding\n`;
    response += `• Follow-up suggestions and guidance\n`;
    response += `• Audit-focused perspective\n\n`;
    
    response += `I'm here to help you navigate compliance requirements and build a robust QMS. What would you like to work on?`;

    return response;
  }

  /**
   * Handle self-improvement queries - Vera reasons about her own capabilities and improvements
   */
  async handleSelfImprovementQuery(message, context, conversationContext) {
    const { standards = [], documents = [] } = context;
    const lowerMessage = message.toLowerCase();
    
    // Use advanced reasoning engine to reason about improvements
    const reasoningContext = {
      currentCapabilities: this.getCurrentCapabilities(),
      knownLimitations: this.getKnownLimitations(),
      recentPerformance: await this.getRecentPerformance(),
      userFeedback: await this.getRecentUserFeedback(),
      standards: standards.length,
      documents: documents.length
    };
    
    // Use advanced reasoning to analyze improvements
    const improvementAnalysis = await veraAdvancedReasoningEngine.reason(
      `Analyze how to improve capabilities based on: ${JSON.stringify(reasoningContext)}`,
      reasoningContext,
      {
        useMultiStep: true,
        useSelfValidation: true,
        maxSteps: 4
      }
    );
    
    let response = `**🤔 Let me think about how I can improve...**\n\n`;
    
    // Analyze current state
    response += `**📊 Current State Analysis:**\n`;
    response += `• Parsed Standards: ${standards.length}\n`;
    response += `• Documents in Library: ${documents.length}\n`;
    response += `• Reasoning Engine: ${improvementAnalysis.confidence > 0.7 ? '✅ Active' : '⚠️ Limited'}\n\n`;
    
    // Use reasoning output if available
    if (improvementAnalysis.finalOutput) {
      response += `**💡 Based on my analysis:**\n`;
      response += `${improvementAnalysis.finalOutput}\n\n`;
    } else {
      // Fallback to structured reasoning
      response += `**💡 Areas for Improvement I've Identified:**\n\n`;
      
      // 1. Reasoning capabilities
      response += `**1. Enhanced Reasoning:**\n`;
      response += `• Multi-step problem solving: ${improvementAnalysis.stepsUsed > 1 ? '✅ Active' : '⚠️ Can be improved'}\n`;
      response += `• Context memory: ${conversationContext?.conversation_id ? '✅ Active' : '⚠️ Limited'}\n`;
      response += `• Self-validation: ${improvementAnalysis.selfValidated ? '✅ Active' : '⚠️ Can be improved'}\n\n`;
      
      // 2. Knowledge gaps
      if (standards.length === 0) {
        response += `**2. Knowledge Base:**\n`;
        response += `• ⚠️ No parsed standards available - parsing more standards would improve my ability to answer questions\n`;
        response += `• 💡 Suggestion: Upload and parse standards to expand my knowledge base\n\n`;
      }
      
      // 3. Learning capabilities
      response += `**3. Learning & Adaptation:**\n`;
      response += `• Learned corrections: ${improvementAnalysis.learnedCorrectionsUsed || 0} applied\n`;
      response += `• Confidence calibration: ${improvementAnalysis.confidence > 0.8 ? '✅ Good' : '⚠️ Can improve'}\n`;
      response += `• 💡 Suggestion: More user feedback helps me learn and improve accuracy\n\n`;
      
      // 4. Specific improvements based on question
      if (lowerMessage.includes('reasoning') || lowerMessage.includes('think')) {
        response += `**4. Reasoning Improvements:**\n`;
        response += `• ✅ I use multi-step deductive reasoning\n`;
        response += `• ✅ I can chain context across multiple questions\n`;
        response += `• ✅ I validate my own answers before responding\n`;
        response += `• 💡 To improve: More complex scenarios would help me refine reasoning patterns\n\n`;
      }
      
      if (lowerMessage.includes('function') || lowerMessage.includes('capability')) {
        response += `**4. Functional Improvements:**\n`;
        response += `• ✅ I can answer compliance questions\n`;
        response += `• ✅ I can perform gap analysis\n`;
        response += `• ✅ I can draft procedures\n`;
        response += `• ✅ I can research regulatory requirements\n`;
        response += `• 💡 Potential additions: Real-time regulatory updates, automated compliance monitoring\n\n`;
      }
    }
    
    // Actionable suggestions
    response += `**🎯 Actionable Improvements:**\n`;
    response += `1. **Expand Knowledge Base:** Upload more standards and documents to improve coverage\n`;
    response += `2. **Provide Feedback:** Rate my responses to help me learn what works best\n`;
    response += `3. **Use Complex Queries:** Ask multi-part questions to help me practice reasoning chains\n`;
    response += `4. **Context Continuity:** Continue conversations to help me maintain context better\n\n`;
    
    response += `**🔬 Technical Enhancements I'm Aware Of:**\n`;
    response += `• Advanced semantic matching for better requirement matching\n`;
    response += `• Enhanced regulatory research capabilities\n`;
    response += `• Improved clarification generation for ambiguous matches\n`;
    response += `• Better learning from user corrections\n\n`;
    
    response += `Would you like me to focus on improving any specific area? I can prioritize based on your needs.`;
    
    return response;
  }
  
  /**
   * Get current capabilities summary
   */
  getCurrentCapabilities() {
    return {
      complianceQuestions: true,
      gapAnalysis: true,
      procedureDrafting: true,
      regulatoryResearch: true,
      deductiveReasoning: true,
      advancedReasoning: true,
      contextMemory: true,
      learningFromFeedback: true
    };
  }
  
  /**
   * Get known limitations
   */
  getKnownLimitations() {
    return {
      realTimeUpdates: false,
      externalAPIAccess: 'limited',
      complexMultiStandardAnalysis: 'basic',
      naturalLanguageGeneration: 'structured',
      imageProcessing: false
    };
  }
  
  /**
   * Get recent performance metrics
   */
  async getRecentPerformance() {
    try {
      const result = await queryEdcatAI(`
        SELECT 
          AVG(confidence) as avg_confidence,
          COUNT(*) as total_responses,
          COUNT(CASE WHEN confidence > 0.8 THEN 1 END) as high_confidence_count
        FROM edcat.ai_conversation_history
        WHERE persona_code = 'vera'
          AND role = 'assistant'
          AND created_at > NOW() - INTERVAL '7 days'
      `);
      
      if (result.rows.length > 0) {
        return {
          avgConfidence: parseFloat(result.rows[0].avg_confidence) || 0.75,
          totalResponses: parseInt(result.rows[0].total_responses) || 0,
          highConfidenceRate: result.rows[0].total_responses > 0 
            ? (parseInt(result.rows[0].high_confidence_count) / parseInt(result.rows[0].total_responses)) * 100 
            : 0
        };
      }
    } catch (error) {
      console.warn('[Vera] Could not fetch performance metrics:', error.message);
    }
    
    return {
      avgConfidence: 0.75,
      totalResponses: 0,
      highConfidenceRate: 0
    };
  }
  
  /**
   * Get recent user feedback
   */
  async getRecentUserFeedback() {
    try {
      const result = await queryEdcatAI(`
        SELECT 
          AVG(rating) as avg_rating,
          COUNT(*) as feedback_count
        FROM user_feedback
        WHERE created_at > NOW() - INTERVAL '30 days'
      `);
      
      if (result.rows.length > 0 && result.rows[0].feedback_count > 0) {
        return {
          avgRating: parseFloat(result.rows[0].avg_rating) || 4.0,
          feedbackCount: parseInt(result.rows[0].feedback_count) || 0
        };
      }
    } catch (error) {
      console.warn('[Vera] Could not fetch user feedback:', error.message);
    }
    
    return {
      avgRating: 4.0,
      feedbackCount: 0
    };
  }

  /**
   * Handle knowledge database queries - show Vera what she knows
   */
  async handleKnowledgeDatabaseQuery(context, conversationContext) {
    let response = `**📚 My Knowledge Database Status:**\n\n`;

    try {
      // Check if knowledge is loaded
      const hasExpertCreds = !!veraKnowledge.expertCredentials;
      const hasKnowledgeBase = !!veraKnowledge.knowledgeBase;
      const hasKnowledgeTemplates = !!veraKnowledge.knowledgeTemplates;
      const hasEnhancedIntents = !!veraKnowledge.enhancedIntents;

      response += `**✅ Loaded Knowledge:**\n`;
      response += `• Expert Credentials: ${hasExpertCreds ? '✅ Loaded' : '❌ Not loaded'}\n`;
      response += `• Knowledge Base: ${hasKnowledgeBase ? '✅ Loaded' : '❌ Not loaded'}\n`;
      response += `• Knowledge Templates: ${hasKnowledgeTemplates ? '✅ Loaded' : '❌ Not loaded'}\n`;
      response += `• Enhanced Intents: ${hasEnhancedIntents ? '✅ Loaded' : '❌ Not loaded'}\n\n`;

      // Query database for learning data
      try {
        // Count standards in learning database
        const standardsCount = await queryEdcatAI(`
          SELECT COUNT(DISTINCT COALESCE(standard_code, standard_id::text)) as count
          FROM edcat.document_content_for_learning
          WHERE standard_code IS NOT NULL OR standard_id IS NOT NULL
        `);
        const stdCount = parseInt(standardsCount.rows[0]?.count || 0);

        // Count example documents
        const examplesCount = await queryEdcatAI(`
          SELECT COUNT(*) as count FROM edcat.example_documents
        `);
        const exCount = parseInt(examplesCount.rows[0]?.count || 0);

        // Count total learning documents
        const docsCount = await queryEdcatAI(`
          SELECT COUNT(DISTINCT file_id) as count FROM edcat.document_content_for_learning
        `);
        const docCount = parseInt(docsCount.rows[0]?.count || 0);

        // Get list of standards
        const standardsList = await queryEdcatAI(`
          SELECT DISTINCT 
            COALESCE(ed.standard_code, dcl.standard_code) as standard_code,
            COUNT(DISTINCT ed.file_id) as example_count,
            COUNT(DISTINCT dcl.file_id) as doc_count
          FROM edcat.document_content_for_learning dcl
          LEFT JOIN edcat.example_documents ed ON ed.file_id = dcl.file_id
          WHERE COALESCE(ed.standard_code, dcl.standard_code) IS NOT NULL
          GROUP BY COALESCE(ed.standard_code, dcl.standard_code)
          ORDER BY standard_code
          LIMIT 20
        `);

        response += `**📊 Learning Database:**\n`;
        response += `• Standards in learning DB: ${stdCount}\n`;
        response += `• Example documents: ${exCount}\n`;
        response += `• Total learning documents: ${docCount}\n\n`;

        if (standardsList.rows.length > 0) {
          response += `**📋 Standards I'm Learning From:**\n`;
          standardsList.rows.slice(0, 10).forEach(row => {
            response += `• ${row.standard_code} (${row.doc_count} docs, ${row.example_count} examples)\n`;
          });
          if (standardsList.rows.length > 10) {
            response += `• ... and ${standardsList.rows.length - 10} more\n`;
          }
          response += `\n`;
        }

        // Check ai_policy table
        const policiesCount = await queryEdcatAI(`
          SELECT COUNT(*) as count 
          FROM edcat.ai_policy 
          WHERE tenant_id = $1 
            AND name LIKE 'vera.%'
        `, [DEFAULT_TENANT_ID]);
        const polCount = parseInt(policiesCount.rows[0]?.count || 0);

        response += `**⚙️ Configuration:**\n`;
        response += `• Vera policies in database: ${polCount}\n\n`;

      } catch (dbError) {
        response += `**⚠️ Database Query Error:**\n`;
        response += `• Could not query learning database: ${dbError.message}\n`;
        
        // Provide specific guidance based on error
        if (dbError.message.includes('does not exist')) {
          response += `• The learning tables (document_content_for_learning, example_documents) don't exist yet\n`;
          response += `• These tables will be created automatically on the next deployment\n`;
          response += `• Or run: npm run seed:personality to ensure all tables are created\n`;
        } else if (dbError.message.includes('EDCAT_AI_DATABASE_URL')) {
          response += `• EDCAT_AI_DATABASE_URL environment variable is not set\n`;
        } else {
          response += `• This might mean EDCAT_AI_DATABASE_URL is not set or tables don't exist\n`;
        }
        response += `\n`;
      }

      response += `**💡 To see this data in the parsing tool:**\n`;
      response += `• Run: npm run vera:pull-standards\n`;
      response += `• This will sync my learning standards to the parsing tool\n\n`;

      response += `**🔧 Troubleshooting:**\n`;
      if (!process.env.EDCAT_AI_DATABASE_URL) {
        response += `• ⚠️ EDCAT_AI_DATABASE_URL environment variable is not set\n`;
        response += `• Set it to connect to my learning database\n`;
      } else {
        response += `• ✅ EDCAT_AI_DATABASE_URL is configured\n`;
      }

    } catch (error) {
      response += `\n**❌ Error checking knowledge database:**\n`;
      response += `• ${error.message}\n`;
    }

    return response;
  }

  /**
   * Handle system help queries
   */
  async handleSystemHelp(message, context, conversationContext) {
    const { standards = [] } = context;
    const parsedCount = standards.filter(s => s.requirements_count > 0).length;

    let response = `Here's how the EDCAT system works:\n\n`;
    
    response += `**📚 Standards Management**\n`;
    response += `• Upload standard documents (PDF, Word)\n`;
    response += `• Parse standards to extract requirements\n`;
    response += `• View and search parsed requirements\n\n`;
    
    response += `**📋 Document Management**\n`;
    response += `• Upload your QMS documents (procedures, WIs, etc.)\n`;
    response += `• Documents are stored securely per customer\n`;
    response += `• Use them for gap analysis and compliance checking\n\n`;
    
    response += `**🔍 Analysis & Reporting**\n`;
    response += `• Gap analysis: Compare documents to standards\n`;
    response += `• Compliance reports: Generate detailed reports\n`;
    response += `• Clause matching: Find related requirements\n\n`;
    
    if (parsedCount > 0) {
      response += `\n**✅ Current Status:**\n`;
      response += `• ${parsedCount} standard(s) parsed and ready\n`;
      response += `• You can ask questions about clauses, gaps, and requirements\n`;
    } else {
      response += `\n**📝 Next Steps:**\n`;
      response += `• Upload and parse a standard to get started\n`;
      response += `• Then I can help with compliance questions\n`;
    }
    
    response += `\nIs there something specific you'd like to know about the system?`;

    return response;
  }

  /**
   * Handle casual chat
   */
  async handleCasualChat(message, conversationContext, persona) {
    const lowerMessage = message.toLowerCase();
    const tenantId = conversationContext.tenant_id || DEFAULT_TENANT_ID;
    
    // Try to get templates from database
    try {
      const templates = await VeraRepository.Persona.getResponseTemplates('casual_chat', tenantId);
      if (templates && templates.length > 0) {
        // Check for specific template matches
        if (lowerMessage.includes('how are you') || lowerMessage.includes('how are things')) {
          const howAreYouTemplate = templates.find(t => t.template_name === 'how_are_you');
          if (howAreYouTemplate) {
            return howAreYouTemplate.template_text;
          }
        }
        if (lowerMessage.includes('thanks') || lowerMessage.includes('thank you')) {
          const thanksTemplate = templates.find(t => t.template_name === 'thanks');
          if (thanksTemplate) {
            return thanksTemplate.template_text;
          }
        }
        // Use random template
        return this.getRandomResponse(templates.map(t => t.template_text));
      }
    } catch (error) {
      console.warn('[VeraConversationalEngine] Could not load templates from DB:', error.message);
    }
    
    // Check for follow-up to previous casual chat
    if (conversationContext.previous?.last_intent === 'casual_chat') {
      if (lowerMessage.includes('wonderful') || lowerMessage.includes('great') || 
          lowerMessage.includes('good') || lowerMessage.includes('nice') ||
          lowerMessage.includes('thanks') || lowerMessage.includes('thank you')) {
        return this.getRandomResponse([
          "Happy to help! What would you like to work on today?",
          "Great! Is there anything specific you'd like to tackle?",
          "Perfect! Ready to dive into your compliance work?",
          "Excellent! What can I help you with?",
          "Sounds good! What's on your agenda today?"
        ]);
      }
    }

    // Fallback to persona or default
    return persona.small_talk_templates?.how_are_you || 
           "I'm functioning optimally, thank you for asking. How is your audit world today?";
  }

  /**
   * Handle "tell me about yourself" / self-introduction queries
   */
  async handleSelfIntroduction(message, context, conversationContext, persona) {
    const lowerMessage = message.toLowerCase();
    
    // Brief, natural introduction - like a human would respond to "who are you"
    let response = '';
    
    // Start with a warm, conversational opener
    if (lowerMessage.includes('who') || lowerMessage.includes('what is')) {
      response = `So, I'm Vera! `;
    } else {
      response = `Well, I'm Vera! `;
    }
    
    response += `I'm your AI compliance companion—think of me as your knowledgeable colleague who helps with quality management and regulatory compliance. `;
    response += `I specialize in standards like AS9100D, ISO 9001, ISO 13485, and regulatory requirements from the FAA, CASA, and EASA. `;
    response += `I'm here to help you navigate requirements, spot gaps, answer questions about clauses, and generally make compliance work a bit easier. `;
    response += `What would you like to work on?`;
    
    return response;
  }

  /**
   * Handle greetings
   */
  async handleGreeting(message, conversationContext, persona) {
    const tenantId = conversationContext.tenant_id || DEFAULT_TENANT_ID;
    const lowerMessage = message.toLowerCase();
    
    // CRITICAL: Check if this is actually a knowledge question disguised as a greeting
    // Pattern: "ok, Vera, what is X" or "hello, what is X" should be handled as knowledge query
    const knowledgeQueryPattern = /(?:ok,?\s*(?:vera,?\s*)?|hello,?\s*(?:vera,?\s*)?|hi,?\s*(?:vera,?\s*)?)?(?:what\s+is|what's|what\s+are|explain|tell\s+me\s+about|what\s+do\s+you\s+know\s+about|define)\s+(?:a|an|the)?\s*[a-z]+/i;
    if (knowledgeQueryPattern.test(message)) {
      // This is actually a knowledge query, not a greeting - route to Q&A handler
      console.log('[VeraConversationalEngine] Detected knowledge query in greeting handler, routing to Q&A');
      const response = await this.handleGeneralQAOrMetaQuery(message, {}, conversationContext, 'meta_ai_query', tenantId, conversationContext.session_id, conversationContext.user_id);
      if (response) {
        return response;
      }
      // Fall through to handle as general query if Q&A doesn't match
    }
    
    // Check if there's a question or statement after the greeting
    // Remove common greeting words and check if there's meaningful content
    const greetingWords = ['good morning', 'good afternoon', 'good evening', 'hello', 'hi', 'hey', 'greetings', 'ok'];
    let meaningfulContent = message;
    for (const greeting of greetingWords) {
      if (lowerMessage.startsWith(greeting) || lowerMessage.match(new RegExp(`^${greeting}\\s*,?\\s*vera,?\\s*`, 'i'))) {
        meaningfulContent = message.replace(new RegExp(`^${greeting}\\s*,?\\s*vera,?\\s*`, 'i'), '').trim();
        // Remove "Vera," or "Vera" if still present
        meaningfulContent = meaningfulContent.replace(/^,\s*Vera,?\s*/i, '').replace(/^Vera,?\s*/i, '').trim();
        break;
      }
    }
    
    // If there's meaningful content after the greeting, engage with it
    if (meaningfulContent.length > 10) {
      // Check if it's a knowledge question
      if (meaningfulContent.match(/(?:what\s+is|what's|what\s+are|explain|tell\s+me\s+about|what\s+do\s+you\s+know\s+about|define)\s+(?:a|an|the)?\s*[a-z]+/i)) {
        // Route to Q&A handler
        const response = await this.handleGeneralQAOrMetaQuery(meaningfulContent, {}, conversationContext, 'meta_ai_query', tenantId, conversationContext.session_id, conversationContext.user_id);
        if (response) {
          return response;
        }
      }
      
      // Check if it's a question about improvements, capabilities, or model
      if (meaningfulContent.includes('improvement') || meaningfulContent.includes('update') || 
          meaningfulContent.includes('change') || meaningfulContent.includes('enhancement') ||
          meaningfulContent.includes('model') || meaningfulContent.includes('upgrade') ||
          meaningfulContent.includes('what') || meaningfulContent.includes('do you know')) {
        
        // Get time-appropriate greeting
        const now = new Date();
        const hour = now.getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
        const greetingText = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
        
        return `${greetingText}! Yes, I'm aware of the recent improvements to my system. ` +
               `I've been enhanced with better research capabilities, improved conversation memory, ` +
               `and more intelligent standards access. I can now perform comprehensive research on ` +
               `standards and regulations that aren't in my local database, maintain better context ` +
               `across our conversations, and provide more accurate, clause-specific answers.\n\n` +
               `I'm excited to put these improvements to work for you! What would you like to explore today?`;
      }
      
      // If there's other meaningful content, treat it as a general query
      // But still acknowledge the greeting
      const now = new Date();
      const hour = now.getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      const greetingText = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
      
      // Try to handle the content as a general query
      return `${greetingText}! ` + await this.handleGeneralQuery(meaningfulContent, 
        { standards: conversationContext.standards || [], documents: conversationContext.documents || [] }, 
        conversationContext);
    }
    
    // Pure greeting - use VeraGreetingService (new dynamic greeting system)
    // CRITICAL: Only return greeting if this is actually a pure greeting
    // If it contains definition keywords, it should have been caught earlier, but double-check here
    const hasDefinitionKeywords = /(?:define|what is|what's|explain|tell me about|what does)\s+/i.test(message);
    if (hasDefinitionKeywords) {
      console.log('[Vera-ENGINE] handleGreeting detected definition keywords, should not return greeting');
      // This should not happen if routing is correct, but as a safety net, return a helpful message
      return "I notice you're asking a definition question. Let me route that properly...";
    }
    
    try {
      // Use the new VeraGreetingService for dynamic greetings
      const greeting = await VeraGreetingService.generateGreeting({
        cultureTag: 'uk_scotland',
        tone: 'friendly'
        // TODO: Pull userName from userProfile if available
      });
      return greeting;
    } catch (error) {
      console.warn('[VeraConversationalEngine] Could not generate greeting from VeraGreetingService:', error.message);
      // Fallback to simple greeting
      return "Hello! I'm ready to help with your quality and compliance work.";
    }
  }

  /**
   * Handle general queries that don't fit other categories
   */
  async handleGeneralQuery(message, context, conversationContext) {
    const { standards = [], documents = [] } = context;
    const parsedCount = standards.filter(s => s.requirements_count > 0).length;

    // Try to understand what they're asking
    const lowerMessage = message.toLowerCase();

    // CRITICAL: Check for existential/identity questions and route to appropriate handler
    if (lowerMessage.includes('who am i') || 
        lowerMessage.includes('who are you') || 
        lowerMessage.includes('do you know who i am') || 
        lowerMessage.includes('do you know me') ||
        lowerMessage.includes('your existence') ||
        lowerMessage.includes('discuss your existence') ||
        lowerMessage.includes('what are you') ||
        lowerMessage.includes('tell me about yourself') ||
        lowerMessage.includes('introduce yourself') ||
        (lowerMessage.includes('existence') && (lowerMessage.includes('your') || lowerMessage.includes('discuss'))) ||
        lowerMessage.includes('outside of the box') ||
        lowerMessage.includes('outside the box')) {
      console.log('[VeraConversationalEngine] handleGeneralQuery detected existential question, routing to handleGeneralKnowledgeQuery');
      return await this.handleGeneralKnowledgeQuery(message, context, conversationContext, conversationContext.tenant_id || tenantId || DEFAULT_TENANT_ID);
    }

    // Use reasoning engine to understand intent and provide intelligent response
    if (lowerMessage.includes('what') || lowerMessage.includes('how') || lowerMessage.includes('explain')) {
      // Try to use reasoning engine for intelligent clarification
      try {
        const VeraReasoningEngine = (await import('./vera/VeraReasoningEngine.js')).default;
        const reasoningResult = await VeraReasoningEngine.reason({
          tenantId: conversationContext.tenant_id || tenantId || DEFAULT_TENANT_ID,
          message,
          intent: 'question',
          conversationContext,
          standardContext: context.standards || [],
          rawContext: context
        });

        if (reasoningResult.needsClarification && reasoningResult.clarificationQuestion) {
          return reasoningResult.clarificationQuestion;
        }

        if (reasoningResult.draftAnswer) {
          return reasoningResult.draftAnswer;
        }
      } catch (e) {
        console.warn('[VeraConversationalEngine] Reasoning engine unavailable, using fallback:', e.message);
      }

      // Intelligent fallback: analyze what they might be asking
      const hasClause = message.match(/\b\d+\.\d+(\.\d+)?\b/);
      const hasStandard = message.match(/\b(AS9100|ISO\s*9001|ISO\s*13485|IATF\s*16949)\b/i);
      
      if (hasClause) {
        return `I see you're asking about a clause. Could you tell me which standard you're referring to? For example: "What is clause 8.7 in AS9100D?"`;
      }
      
      if (hasStandard) {
        return `I see you're asking about a standard. Could you be more specific? For example: "What is AS9100D?" or "Explain clause 7.2 in AS9100D."`;
      }

      return `I'd be happy to help! Could you provide a bit more context? For example:\n\n` +
             `• "What is clause 8.7 in AS9100D?"\n` +
             `• "How do I check for compliance gaps?"\n` +
             `• "Explain the competence requirements."`;
    }

    // Intelligent default response based on available knowledge
    let response = '';
    
    if (parsedCount > 0) {
      response = `I have access to ${parsedCount} parsed standard(s) and can help with compliance questions, gap analysis, and procedure drafting. `;
      response += `What specific aspect of compliance would you like to explore?`;
    } else {
      response = `To get started, I recommend uploading and parsing a standard. Once you have parsed standards, I can help with compliance questions, gap analysis, and procedure drafting. `;
      response += `Would you like guidance on how to upload and parse a standard?`;
    }

    return response;
  }

  /**
   * Handle audit preparation requests
   */
  async handleAuditPrepRequest(message, context, conversationContext) {
    const { standards = [], documents = [] } = context;
    const parsedStandards = standards.filter(s => s.requirements_count > 0);

    let response = `I can help you prepare for your audit! Here's what you'll need:\n\n`;

    response += `**📋 Audit Readiness Checklist:**\n`;
    response += `• Parsed standards: ${parsedStandards.length > 0 ? '✅' : '❌'} ${parsedStandards.length} standard(s)\n`;
    response += `• QMS documents: ${documents.length > 0 ? '✅' : '❌'} ${documents.length} document(s)\n`;
    response += `• Gap analysis: ${parsedStandards.length > 0 && documents.length > 0 ? 'Ready to run' : 'Need standards and documents'}\n\n`;

    if (parsedStandards.length > 0 && documents.length > 0) {
      response += `**✅ You're ready! I can help you:**\n`;
      response += `• Run a gap analysis to identify any missing requirements\n`;
      response += `• Generate an audit checklist based on your standards\n`;
      response += `• Review your documents for compliance coverage\n`;
      response += `• Create evidence documentation\n\n`;
      response += `Would you like me to run a gap analysis now?`;
    } else {
      response += `**📝 To prepare for audit:**\n`;
      if (parsedStandards.length === 0) {
        response += `1. Upload and parse your standard(s) (e.g., AS9100D, ISO 9001)\n`;
      }
      if (documents.length === 0) {
        response += `${parsedStandards.length === 0 ? '2' : '1'}. Upload your QMS documents (procedures, records, etc.)\n`;
      }
      response += `${parsedStandards.length === 0 || documents.length === 0 ? '2' : '1'}. Run gap analysis to identify any gaps\n`;
      response += `${parsedStandards.length === 0 || documents.length === 0 ? '3' : '2'}. Address any identified gaps\n`;
      response += `${parsedStandards.length === 0 || documents.length === 0 ? '4' : '3'}. Generate audit evidence\n\n`;
      response += `What would you like to do first?`;
    }

    return response;
  }

  /**
   * Handle CAPA (Corrective/Preventive Action) requests
   */
  async handleCapaRequest(message, context, conversationContext) {
    const { standards = [], documents = [] } = context;
    const lowerMessage = message.toLowerCase();

    // Check if they're asking about a specific gap
    if (lowerMessage.includes('gap') || lowerMessage.includes('nonconform') || lowerMessage.includes('finding')) {
      return `I can help you create a CAPA for identified gaps!\n\n` +
             `**To create a CAPA, I'll need:**\n` +
             `• Which gap or finding? (clause number or description)\n` +
             `• Root cause analysis (I can help with this)\n` +
             `• Corrective action plan\n` +
             `• Preventive measures\n\n` +
             `**I can help you:**\n` +
             `• Draft a CAPA document template\n` +
             `• Identify root causes based on standard requirements\n` +
             `• Create action plans with timelines\n` +
             `• Generate verification and validation procedures\n\n` +
             `Would you like me to create a CAPA template, or do you have a specific gap to address?`;
    }

    return `I can help you create Corrective and Preventive Actions (CAPAs)!\n\n` +
           `**What is a CAPA?**\n` +
           `A systematic approach to addressing nonconformities and preventing recurrence.\n\n` +
           `**I can help you:**\n` +
           `• Create CAPA documents for identified gaps\n` +
           `• Develop root cause analysis frameworks\n` +
           `• Draft corrective action plans\n` +
           `• Generate preventive action strategies\n` +
           `• Create verification and validation procedures\n\n` +
           `**To get started:**\n` +
           `1. Identify a gap or nonconformity (I can help with gap analysis)\n` +
           `2. Ask me to "create a CAPA for [gap/clause]"\n` +
           `3. I'll generate a structured CAPA document\n\n` +
           `Do you have a specific gap or finding you'd like to create a CAPA for?`;
  }

  /**
   * Handle metrics queries
   */
  async handleMetricsQuery(message, context, conversationContext) {
    const { standards = [], documents = [] } = context;
    const parsedStandards = standards.filter(s => s.requirements_count > 0);

    let response = `Here are your compliance metrics:\n\n`;

    response += `**📊 Current Status:**\n`;
    response += `• Standards loaded: ${standards.length}\n`;
    response += `• Standards parsed: ${parsedStandards.length}\n`;
    response += `• Documents uploaded: ${documents.length}\n\n`;

    if (parsedStandards.length > 0) {
      const totalRequirements = parsedStandards.reduce((sum, s) => sum + (s.requirements_count || 0), 0);
      response += `• Total requirements extracted: ${totalRequirements}\n`;
    }

    if (parsedStandards.length > 0 && documents.length > 0) {
      response += `\n**📈 Compliance Coverage:**\n`;
      response += `• Ready for gap analysis\n`;
      response += `• Can calculate compliance rate after analysis\n\n`;
      response += `Would you like me to run a gap analysis to get detailed metrics?`;
    } else {
      response += `\n**💡 To get detailed metrics:**\n`;
      response += `• Parse standards to extract requirements\n`;
      response += `• Upload documents for comparison\n`;
      response += `• Run gap analysis for compliance rates\n`;
    }

    return response;
  }

  /**
   * Handle industry-specific questions
   */
  async handleIndustryQuestion(message, context, conversationContext) {
    const { standards = [], documents = [] } = context;
    const lowerMessage = message.toLowerCase();
    
    // FIRST: Check if asking about a specific standard/regulation - if so, trigger research
    // Extract standard/regulation if mentioned - IMPROVED to catch CASA, FAA Part 21, etc.
    const standardMatch = message.match(/(casa|faa|easa|caac|iso[\s-]?9001|as9100|iso[\s-]?13485|iatf[\s-]?16949|21\s*cfr|part\s*\d+)/i);
    let standardCode = null;
    let standardName = null;
    
    if (standardMatch) {
      // Match ISO, AS, IATF standards (e.g., ISO9001, ISO 9001, ISO-9001, AS9100, etc.)
      if (standardMatch[1]) {
        const number = standardMatch[1];
        // Extract the prefix from the full match
        const fullMatch = standardMatch[0];
        const prefixMatch = fullMatch.match(/(iso|as|iatf)/i);
        const prefix = prefixMatch ? prefixMatch[1].toLowerCase() : '';
        
        if (prefix === 'iso') {
          standardCode = `ISO${number}`; // Keep without separator for flexible matching
          standardName = `ISO ${number}`;
        } else if (prefix === 'as') {
          standardCode = `AS${number}`;
          standardName = `AS${number}`;
        } else if (prefix === 'iatf') {
          standardCode = `IATF${number}`;
          standardName = `IATF ${number}`;
        }
      } 
      // Match regulatory bodies (CASA, FAA, EASA, CAAC)
      else if (standardMatch[2]) {
        const regulator = standardMatch[2].toLowerCase();
        const partNumber = standardMatch[3];
        if (regulator === 'casa') {
          standardCode = partNumber ? `CASA-PART-${partNumber}` : 'CASA';
          standardName = partNumber ? `CASA Part ${partNumber}` : 'CASA';
        } else if (regulator === 'faa') {
          standardCode = partNumber ? `FAA-PART-${partNumber}` : 'FAA';
          standardName = partNumber ? `FAA Part ${partNumber}` : 'FAA';
        } else if (regulator === 'easa') {
          standardCode = partNumber ? `EASA-PART-${partNumber}` : 'EASA';
          standardName = partNumber ? `EASA Part ${partNumber}` : 'EASA';
        } else if (regulator === 'caac') {
          standardCode = partNumber ? `CAAC-PART-${partNumber}` : 'CAAC';
          standardName = partNumber ? `CAAC Part ${partNumber}` : 'CAAC';
        }
      }
      // Match 21 CFR
      else if (standardMatch[4]) {
        standardCode = '21-CFR';
        standardName = '21 CFR';
      }
      // Match generic "part X" references
      else if (standardMatch[5]) {
        const partMatch = message.match(/part\s*(\d+)/i);
        if (partMatch) {
          standardCode = `PART-${partMatch[1]}`;
          standardName = `Part ${partMatch[1]}`;
        }
      }
    }

    // If asking about a specific standard/regulation that's not in database, trigger research
    if (standardCode && standardName) {
      const standard = standards.find(s => 
        s.code.toLowerCase().includes(standardCode.toLowerCase()) ||
        s.name.toLowerCase().includes(standardName.toLowerCase())
      );
      
      if (!standard) {
        // Standard not in database - trigger research
        return await this.handleResearchRequest(message, standardName, standardCode, context, conversationContext);
      }
    }
    
    // Load sector intelligence if available
    let sectorIntelligence = null;
    try {
      const sectorPath = path.join(__dirname, '../../EDCAT AIP/seed/sector_intelligence.json');
      if (fs.existsSync(sectorPath)) {
        sectorIntelligence = JSON.parse(fs.readFileSync(sectorPath, 'utf-8'));
      }
    } catch (error) {
      console.warn('[VeraConversationalEngine] Could not load sector intelligence:', error.message);
    }

    // Detect industry/sector
    let sector = null;
    if (lowerMessage.includes('aerospace') || lowerMessage.includes('as9100') || lowerMessage.includes('faa') || lowerMessage.includes('easa')) {
      sector = 'aerospace';
    } else if (lowerMessage.includes('medical') || lowerMessage.includes('device') || lowerMessage.includes('fda') || lowerMessage.includes('iso 13485')) {
      sector = 'medical_device';
    } else if (lowerMessage.includes('automotive') || lowerMessage.includes('iatf')) {
      sector = 'automotive';
    }

    let response = `I can help with industry-specific compliance questions!\n\n`;

    if (sector && sectorIntelligence?.sectors?.[sector]) {
      const sectorInfo = sectorIntelligence.sectors[sector];
      response += `**${sectorInfo.name || sector.toUpperCase()} Industry:**\n\n`;
      
      if (sectorInfo.standards) {
        response += `**Key Standards:**\n`;
        sectorInfo.standards.forEach(std => {
          response += `• ${std.code}: ${std.description || ''}\n`;
        });
        response += `\n`;
      }

      if (sectorInfo.regulatory_bodies) {
        response += `**Regulatory Bodies:**\n`;
        sectorInfo.regulatory_bodies.forEach(reg => {
          response += `• ${reg.name}: ${reg.description || ''}\n`;
        });
        response += `\n`;
      }

      if (sectorInfo.common_pitfalls) {
        response += `**Common Pitfalls:**\n`;
        sectorInfo.common_pitfalls.forEach(pitfall => {
          response += `• ${pitfall}\n`;
        });
        response += `\n`;
      }
    } else {
      response += `**Industries I can help with:**\n`;
      response += `• Aerospace (AS9100, FAA, EASA)\n`;
      response += `• Medical Devices (ISO 13485, FDA, MDSAP)\n`;
      response += `• Automotive (IATF 16949)\n`;
      response += `• General Quality (ISO 9001)\n\n`;
      response += `**Ask me about:**\n`;
      response += `• Industry-specific requirements\n`;
      response += `• Regulatory body expectations\n`;
      response += `• Common compliance challenges\n`;
      response += `• Sector-specific best practices\n\n`;
    }

    response += `What specific industry question do you have?`;

    return response;
  }

  /**
   * Handle regulatory update queries
   */
  async handleRegulatoryUpdate(message, context, conversationContext) {
    const { standards = [], regulatoryWebsites = [] } = context;
    const lowerMessage = message.toLowerCase();

    // Extract standard if mentioned
    const standardMatch = lowerMessage.match(/(iso[\s-]?9001|as9100|iso[\s-]?13485|iatf[\s-]?16949)/i);
    const standardCode = standardMatch ? standardMatch[1].toUpperCase().replace(/\s+/g, '-') : null;

    let response = `I can help you understand regulatory updates and standard revisions!\n\n`;

    if (standardCode) {
      const standard = standards.find(s => s.code.toLowerCase().includes(standardCode.toLowerCase()));
      if (standard) {
        response += `**${standard.code} Information:**\n`;
        response += `• Current version in system: ${standard.revision || 'Not specified'}\n`;
        response += `• Name: ${standard.name}\n\n`;
        response += `**To check for updates:**\n`;
        response += `• Visit the official standard body website\n`;
        response += `• Check regulatory websites for announcements\n`;
        if (regulatoryWebsites.length > 0) {
          response += `• I have ${regulatoryWebsites.length} regulatory source(s) configured\n`;
        }
        response += `\n`;
      }
    }

    response += `**Common Standard Updates:**\n`;
    response += `• ISO 9001:2015 (current)\n`;
    response += `• AS9100D:2016 (current)\n`;
    response += `• ISO 13485:2016 (current)\n`;
    response += `• IATF 16949:2016 (current)\n\n`;

    response += `**What I can help with:**\n`;
    response += `• Identify which version you're using\n`;
    response += `• Explain key changes between revisions\n`;
    response += `• Help plan migration to new versions\n`;
    response += `• Compare requirements across versions\n\n`;

    if (regulatoryWebsites.length > 0) {
      response += `**Regulatory Sources Available:**\n`;
      regulatoryWebsites.slice(0, 5).forEach(reg => {
        response += `• ${reg.name || reg.agency}: ${reg.url || ''}\n`;
      });
      response += `\n`;
    }

    response += `Do you have a specific standard or regulation you'd like to check for updates?`;

    return response;
  }

  /**
   * Handle standard comparison requests - ENHANCED with multi-standard comparison
   */
  async handleStandardComparison(message, context, conversationContext) {
    const { standards = [] } = context;
    const parsedStandards = standards.filter(s => s.requirements_count > 0);
    const tenantId = conversationContext.tenant_id || context.tenantId || DEFAULT_TENANT_ID;

    // Extract standards to compare
    const standardMatches = message.match(/(iso[\s-]?9001|as9100|iso[\s-]?13485|iatf[\s-]?16949)/gi);
    const standardsToCompare = standardMatches ? [...new Set(standardMatches.map(s => s.toUpperCase().replace(/\s+/g, '-')))] : [];

    // If we have 2+ standards to compare and they're parsed, use enhanced multi-standard comparison
    if (standardsToCompare.length >= 2) {
      const matchingStandards = parsedStandards.filter(s => 
        standardsToCompare.some(code => s.code.toUpperCase().includes(code) || code.includes(s.code.toUpperCase()))
      );

      if (matchingStandards.length >= 2) {
        try {
          const VeraMultiStandardComparison = (await import('./vera/VeraMultiStandardComparison.js')).default;
          const standardIds = matchingStandards.map(s => s.id);
          const standardCodes = matchingStandards.map(s => s.code);
          
          const comparison = await VeraMultiStandardComparison.compareStandards(
            standardCodes,
            tenantId,
            {
              includeUniqueRequirements: true,
              includeCommonRequirements: true,
              includeDifferences: true,
              clauseLevel: true
            }
          );

          if (comparison.success) {
            const report = VeraMultiStandardComparison.generateReport(comparison);
            return report;
          }
        } catch (error) {
          console.warn('[VeraConversationalEngine] Multi-standard comparison error:', error.message);
          // Fall through to basic comparison
        }
      }
    }

    // Basic comparison (fallback or when standards not parsed)
    let response = `I can help you compare standards!\n\n`;

    if (standardsToCompare.length >= 2) {
      response += `**Comparing: ${standardsToCompare.join(' vs ')}**\n\n`;
      response += `**Key Differences:**\n`;
      
      // Provide general comparison guidance
      if (standardsToCompare.some(s => s.includes('AS9100')) && standardsToCompare.some(s => s.includes('ISO-9001'))) {
        response += `• AS9100 is based on ISO 9001 with aerospace-specific additions\n`;
        response += `• AS9100 includes additional requirements for:\n`;
        response += `  - Configuration management\n`;
        response += `  - Risk management (AS9100D)\n`;
        response += `  - Counterfeit parts prevention\n`;
        response += `  - First article inspection\n`;
        response += `  - Special requirements\n\n`;
      }

      if (parsedStandards.length >= 2) {
        response += `**I can provide:**\n`;
        response += `• Detailed clause-by-clause comparison\n`;
        response += `• Unique requirements in each standard\n`;
        response += `• Migration guidance\n`;
        response += `• Crosswalk mapping\n\n`;
        response += `Would you like me to generate a detailed comparison report?`;
      } else {
        response += `To get a detailed comparison, I need both standards parsed.\n\n`;
        response += `**Available parsed standards:** ${parsedStandards.map(s => s.code).join(', ') || 'None'}\n\n`;
        response += `Would you like to parse the standards for comparison?`;
      }
    } else {
      response += `**I can compare:**\n`;
      response += `• ISO 9001 vs AS9100\n`;
      response += `• ISO 9001 vs ISO 13485\n`;
      response += `• AS9100 vs ISO 13485\n`;
      response += `• Any two or more standards you have parsed (simultaneous comparison)\n\n`;

      if (parsedStandards.length >= 2) {
        response += `Available for comparison: ${parsedStandards.map(s => s.code).join(', ')}. `;
        response += `You can ask me things like "Compare ${parsedStandards[0].code} and ${parsedStandards[1].code}".`;
      } else {
        response += `**To compare standards:**\n`;
        response += `1. Parse at least two standards\n`;
        response += `2. Ask me to "compare [standard1] and [standard2]"\n\n`;
        response += `Would you like to parse standards for comparison?`;
      }
    }

    return response;
  }

  /**
   * Handle research request for standards/regulations not in database
   */
  async handleResearchRequest(message, standardName, standardCode, context, conversationContext) {
    try {
      console.log(`[VeraConversationalEngine] Research requested for: ${standardName} (${standardCode})`);
      
      // Get user/tenant info for tracking
      // CRITICAL FIX: Convert 'system' userId to a valid UUID to avoid database errors
      const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001'; // Special UUID for system user
      const rawUserId = conversationContext.userId || 'system';
      const userId = rawUserId === 'system' ? SYSTEM_USER_ID : rawUserId;
      const tenantId = conversationContext.tenant_id || DEFAULT_TENANT_ID;
      const conversationId = conversationContext.conversation_id || conversationContext.session_id;
      
      // Parse the research request
      const parsed = await VeraQueryParser.parseResearchRequest(message);
      
      if (!parsed.success) {
        if (parsed.clarification_needed) {
          return `I'd like to research ${standardName} for you, but I need a bit more information:\n\n${parsed.message}\n\nCould you provide more details about what specifically you'd like to know about ${standardName}?`;
        }
        return `I encountered an issue while preparing to research ${standardName}. Could you try rephrasing your question?`;
      }

      // Create research request record
      const researchRequest = await VeraRepository.Research.createResearchRequest({
        user_id: userId,
        tenant_id: tenantId,
        conversation_id: conversationId,
        request_type: parsed.request_type || 'standard_research',
        request_query: message,
        primary_topic: parsed.parsed_details.primary_topic || standardName,
        countries_mentioned: parsed.parsed_details.countries_mentioned || [],
        industries_mentioned: parsed.parsed_details.industries_mentioned || [],
        standards_mentioned: parsed.parsed_details.standards_mentioned || [standardCode].filter(Boolean),
        desired_depth: parsed.parsed_details.depth_required || 'comprehensive'
      });

      // Execute research
      const researchResult = await VeraComprehensiveResearcher.executeComprehensiveResearch(parsed);
      
      if (researchResult.success) {
        const report = researchResult.report;
        
        // Save research sources
        if (researchResult.sources && Array.isArray(researchResult.sources)) {
          for (const source of researchResult.sources.slice(0, 10)) {
            try {
              await VeraRepository.Research.saveResearchSource({
                research_request_id: researchRequest.request_id,
                source_url: source.url,
                source_title: source.title,
                source_type: source.source_type || 'web',
                credibility_score: source.credibility_score || 0.50,
                content_summary: source.content_summary || source.content?.substring(0, 500)
              });
            } catch (err) {
              console.warn('[VeraConversationalEngine] Error saving research source:', err.message);
            }
          }
        }
        
        // Cache regulatory lookup if applicable
        if (standardCode && report.summary) {
          const regulatorMatch = standardCode.match(/(FAA|EASA|CASA|CAAC)/i);
          const partMatch = standardCode.match(/PART-?(\d+)/i);
          if (regulatorMatch && partMatch) {
            try {
              await VeraRepository.Research.saveRegulatoryLookup({
                regulator: regulatorMatch[1].toUpperCase(),
                reference_code: `PART-${partMatch[1]}`,
                regulation_title: `${standardName}`,
                regulation_text: report.summary.substring(0, 5000),
                source_url: researchRequest.request_query
              });
            } catch (err) {
              console.warn('[VeraConversationalEngine] Error caching regulatory lookup:', err.message);
            }
          }
        }
        
        // Update research request with results
        await VeraRepository.Research.updateResearchRequest(researchRequest.request_id, {
          status: 'complete',
          duration_seconds: Math.round(researchResult.duration || 0),
          sources_found: researchResult.sources_found || 0,
          authoritative_sources: researchResult.authoritative_sources || 0,
          summary: report,
          confidence: researchResult.confidence || 0.50
        });
        
        // Format the research results professionally
        const { buildResearchResponse } = await import('./vera/VeraProfessionalResponseBuilder.js');
        
        let response = buildResearchResponse({
          standardName,
          summary: report.summary || report.introduction || 'Research completed successfully.',
          introduction: report.introduction,
          keyFindings: report.keyFindings || [],
          requirements: report.requirements || [],
          whoApplies: report.whoApplies,
          challenges: report.challenges || [],
          takeaways: report.takeaways || [],
          sourcesFound: researchResult.sources_found || 0,
          authoritativeSources: researchResult.authoritative_sources || 0,
          confidence: researchResult.confidence || 0.50
        });
        
        return response;
      } else {
        // Update research request with failure
        await VeraRepository.Research.updateResearchRequest(researchRequest.request_id, {
          status: 'failed',
          summary: { error: researchResult.error }
        });
        
        return `I attempted to research ${standardName}, but encountered an issue: ${researchResult.error || 'Research failed'}\n\nWould you like to try rephrasing your question, or would you prefer to upload a document about ${standardName} for me to parse?`;
      }
    } catch (error) {
      console.error('[VeraConversationalEngine] Error in research request:', error);
      return `I'd like to research ${standardName} for you, but I'm experiencing technical difficulties. As an alternative, you could:\n\n1. Upload a document about ${standardName} for me to parse\n2. Ask me a more specific question about ${standardName}\n3. Try again in a moment`;
    }
  }

  /**
   * Add natural follow-up suggestions with proactive recommendations
   */
  /**
   * Apply personality traits to response
   */
  applyPersonality(response, persona, intent, message) {
    if (!persona || !persona.personality_traits) return response;

    const { tone, voice, communication_patterns } = persona.personality_traits || {};
    let modifiedResponse = response;

    // Apply tone and voice adjustments
    if (tone === 'warm' || tone === 'friendly') {
      modifiedResponse = VeraProfessionalFormatter.addWarmth(modifiedResponse);
    }
    if (voice === 'professional' || voice === 'authoritative') {
      modifiedResponse = VeraProfessionalFormatter.ensureProfessionalism(modifiedResponse);
    }

    // Add conversational transitions based on intent
    if (communication_patterns?.conversational_transitions) {
      const transitions = this.conversationPatterns.transition;
      const acknowledgment = this.conversationPatterns.acknowledgment;

      if (intent === 'compliance_question' || intent === 'gap_analysis_request') {
        if (!modifiedResponse.startsWith('I understand') && !modifiedResponse.startsWith('To give you')) {
          modifiedResponse = `${this.getRandomResponse(acknowledgment)} ${this.getRandomResponse(transitions)} ${modifiedResponse}`;
        }
      } else if (intent === 'greeting' || intent === 'self_introduction') {
        // No extra transitions for greetings/introductions
      } else {
        // For other intents, add a subtle transition
        if (Math.random() < 0.3 && !modifiedResponse.startsWith('I understand') && !modifiedResponse.startsWith('To give you')) {
          modifiedResponse = `${this.getRandomResponse(transitions)} ${modifiedResponse}`;
        }
      }
    }

    // Ensure a natural closing if it's a final response
    if (communication_patterns?.natural_closings && !modifiedResponse.endsWith('?')) {
      const closings = [
        "How else may I assist you today?",
        "What's next on your compliance agenda?",
        "Feel free to ask if you have more questions."
      ];
      if (Math.random() < 0.2) { // 20% chance to add a closing
        modifiedResponse += `\n\n${this.getRandomResponse(closings)}`;
      }
    }

    return modifiedResponse;
  }

  /**
   * Helper to get random response from array
   */
  getRandomResponse(array) {
    if (!array || array.length === 0) return '';
    return array[Math.floor(Math.random() * array.length)];
  }

  addFollowUpSuggestions(response, intent, context) {
    const { standards = [], documents = [] } = context;
    const parsedCount = standards.filter(s => s.requirements_count > 0).length;
    const parsedStandards = standards.filter(s => s.requirements_count > 0);

    // Don't add suggestions to very short responses
    if (response.length < 100) {
      return response;
    }

    // Add context-aware suggestions based on intent
    if (intent === 'compliance_question' && parsedCount > 0) {
      if (!response.includes('Would you like') && !response.includes('Next steps')) {
        response += `\n\n**💡 Proactive Suggestions:**\n`;
        response += `• Ask about another clause\n`;
        if (documents.length > 0) {
          response += `• Check for gaps: "Show gaps for ${parsedStandards[0]?.code || '[standard]'}"\n`;
        }
        if (documents.length === 0) {
          response += `• Upload documents to check compliance coverage\n`;
        }
        response += `• Draft a procedure: "Create a procedure for clause X"\n`;
        if (parsedCount > 1) {
          response += `• Compare standards: "Compare ${parsedStandards[0]?.code} and ${parsedStandards[1]?.code}"`;
        }
      }
    }

    // Proactive suggestions for gap analysis
    if (intent === 'gap_analysis_request' && parsedCount > 0 && documents.length > 0) {
      if (!response.includes('Would you like') && !response.includes('Next steps')) {
        response += `\n\n**💡 After Gap Analysis:**\n`;
        response += `• Create CAPAs for identified gaps\n`;
        response += `• Generate audit readiness checklist\n`;
        response += `• Review compliance metrics\n`;
        response += `• Draft procedures for missing requirements`;
      }
    }

    // Proactive suggestions for audit prep
    if (intent === 'audit_prep_request') {
      if (parsedCount > 0 && documents.length > 0 && !response.includes('Would you like')) {
        response += `\n\n**💡 Recommended Actions:**\n`;
        response += `• Run gap analysis to identify any gaps\n`;
        response += `• Review document coverage against standards\n`;
        response += `• Generate audit evidence checklist\n`;
        response += `• Prepare CAPAs for any findings`;
      }
    }

    // Proactive suggestions for metrics
    if (intent === 'metrics_query' && parsedCount > 0 && documents.length > 0) {
      if (!response.includes('Would you like')) {
        response += `\n\n**💡 To Get Detailed Metrics:**\n`;
        response += `• Run gap analysis: "Analyze gaps for [standard]"\n`;
        response += `• Check compliance coverage percentage\n`;
        response += `• Review gap severity distribution\n`;
        response += `• Generate compliance dashboard`;
      }
    }

    // Proactive suggestions for industry questions
    if (intent === 'industry_question') {
      if (!response.includes('What specific')) {
        response += `\n\n**💡 I can also help with:**\n`;
        response += `• Industry-specific gap analysis\n`;
        response += `• Regulatory body requirements\n`;
        response += `• Sector-specific best practices\n`;
        response += `• Common compliance pitfalls`;
      }
    }

    // General proactive suggestions when user has parsed standards but no documents
    if (parsedCount > 0 && documents.length === 0 && !['system_help', 'capability_query'].includes(intent)) {
      if (!response.includes('upload') && !response.includes('Upload')) {
        response += `\n\n**💡 Proactive Tip:**\n`;
        response += `You have ${parsedCount} parsed standard(s) ready! Upload your QMS documents to start gap analysis and compliance checking.`;
      }
    }

    // General proactive suggestions when user has documents but no parsed standards
    if (parsedCount === 0 && documents.length > 0 && !['system_help', 'capability_query'].includes(intent)) {
      if (!response.includes('parse') && !response.includes('Parse')) {
        response += `\n\n**💡 Proactive Tip:**\n`;
        response += `You have ${documents.length} document(s) uploaded! Parse a standard to start compliance analysis.`;
      }
    }

    return response;
  }

  /**
   * Get random response from array
   */
  getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * NEW: Handle clause explanation with deep understanding
   */
  async handleClauseExplanation(message, context, conversationContext, persona) {
    try {
      const { standards = [] } = context;
      const tenantId = conversationContext.tenant_id || context.tenantId || DEFAULT_TENANT_ID;
      
      // Extract clause number and standard
      const clauseMatch = message.match(/clause\s*([\d]+\.[\d]+(?:\.[\d]+)*)/i);
      if (!clauseMatch) {
        return "I need a clause number to explain. For example: 'Explain clause 4.4.1'";
      }
      
      const clauseRef = clauseMatch[1];
      
      // Find standard from context or message
      const standardMatch = message.match(/(?:of|from|in)\s+(as\d+|iso\s*\d+|iatf\s*\d+)/i);
      let standardId = null;
      
      if (standardMatch) {
        const stdCode = standardMatch[1].trim();
        const standard = standards.find(s => 
          s.code.toLowerCase().includes(stdCode.toLowerCase())
        );
        if (standard) standardId = standard.id;
      } else if (standards.length > 0) {
        // Use most recent or most relevant standard
        standardId = standards[0].id;
      }
      
      if (!standardId) {
        return "I need to know which standard you're asking about. For example: 'Explain clause 4.4.1 in AS9100D'";
      }
      
      const VeraClauseUnderstandingService = (await import('./VeraClauseUnderstandingService.js')).default;
      const clauseInfo = await VeraClauseUnderstandingService.explainClause(standardId, clauseRef, tenantId);
      
      if (!clauseInfo) {
        return `I couldn't find clause ${clauseRef} in that standard. Can you double-check the reference?`;
      }
      
      // Format as natural conversation
      let response = `Right, so clause ${clauseRef} is about: ${clauseInfo.intent}.\n\n`;
      response += `Why it matters: ${clauseInfo.why_it_matters}.\n\n`;
      response += `What auditors look for: ${clauseInfo.what_auditors_look_for.join(', ')}.\n\n`;
      
      if (clauseInfo.common_gaps && clauseInfo.common_gaps.length > 0) {
        response += `Common gaps in this clause: `;
        response += clauseInfo.common_gaps.map(g => g.description).join(', ') + '.\n\n';
      }
      
      return response;
    } catch (error) {
      console.error('[VeraConversationalEngine] Error in handleClauseExplanation:', error);
      return "I encountered an issue explaining that clause. Could you try rephrasing?";
    }
  }

  /**
   * NEW: Handle clause comparison
   */
  async handleClauseComparison(message, context, conversationContext) {
    return "Clause comparison is being developed. For now, I can explain individual clauses.";
  }

  /**
   * NEW: Handle authority explanation
   */
  async handleAuthorityExplanation(message, context, conversationContext, persona) {
    try {
      const authorityMatch = message.match(/(FAA|EASA|CASA|FDA|EU-MDR|ISO)/i);
      if (!authorityMatch) {
        return "Which regulatory authority are you asking about? (FAA, EASA, CASA, FDA, EU-MDR, ISO)";
      }
      
      const authorityCode = authorityMatch[1].toUpperCase();
      const VeraRegulatoryAuthorityService = (await import('./VeraRegulatoryAuthorityService.js')).default;
      const profile = VeraRegulatoryAuthorityService.getAuthorityProfile(authorityCode);
      
      if (!profile) {
        return `I don't have information on that regulatory authority. What specific authority were you asking about?`;
      }
      
      let response = `${profile.full_name}\n\n`;
      response += `Philosophy: ${profile.philosophy}\n\n`;
      response += `Key focus areas:\n`;
      response += profile.key_concerns.slice(0, 5).map(c => `• ${c}`).join('\n');
      response += `\n\nAudit approach: ${profile.audit_style}.\n\n`;
      
      return response;
    } catch (error) {
      console.error('[VeraConversationalEngine] Error in handleAuthorityExplanation:', error);
      return "I encountered an issue explaining that authority. Could you try rephrasing?";
    }
  }

  /**
   * NEW: Handle authority comparison
   */
  async handleAuthorityComparison(message, context, conversationContext) {
    try {
      const authorities = message.match(/(FAA|EASA|CASA|FDA|EU-MDR|ISO)/gi);
      if (!authorities || authorities.length < 2) {
        return "Which two authorities would you like to compare? For example: 'How does FAA differ from EASA?'";
      }
      
      const authority1 = authorities[0].toUpperCase();
      const authority2 = authorities[1].toUpperCase();
      
      const VeraRegulatoryAuthorityService = (await import('./VeraRegulatoryAuthorityService.js')).default;
      const comparison = VeraRegulatoryAuthorityService.compareAuthorities(authority1, authority2);
      
      if (!comparison) {
        return "I couldn't compare those authorities. Please check the authority names.";
      }
      
      let response = `Comparing ${comparison.authority1.name} and ${comparison.authority2.name}:\n\n`;
      response += `Similarities: ${comparison.similarities.join(', ')}\n\n`;
      response += `Key differences: ${comparison.key_differences.join(', ')}\n\n`;
      response += `Compliance strategy: ${comparison.compliance_strategy.approach}\n`;
      
      return response;
    } catch (error) {
      console.error('[VeraConversationalEngine] Error in handleAuthorityComparison:', error);
      return "I encountered an issue comparing those authorities. Could you try rephrasing?";
    }
  }

  /**
   * NEW: Handle customer profile
   */
  async handleCustomerProfile(message, context, conversationContext) {
    try {
      const tenantId = conversationContext.tenant_id || context.tenantId || DEFAULT_TENANT_ID;
      const VeraCustomerRequirementsService = (await import('./VeraCustomerRequirementsService.js')).default;
      const profile = await VeraCustomerRequirementsService.loadCustomerProfile(tenantId);
      
      if (!profile) {
        return `I don't have customer profile information available.`;
      }
      
      let response = `Here's what I see for ${profile.customer_name}:\n\n`;
      response += `Documents uploaded: ${profile.profile.documents_uploaded}\n`;
      response += `Procedures defined: ${profile.profile.procedures_defined}\n`;
      response += `Gap analyses completed: ${profile.profile.gap_analyses_completed}\n\n`;
      
      const posture = await VeraCustomerRequirementsService.getCompliancePosture(tenantId);
      if (posture) {
        response += `Overall compliance coverage: ${posture.overall_coverage_percent}% (${posture.compliance_rating})\n`;
        response += `Trend: ${posture.trend}\n\n`;
        
        if (posture.areas_for_improvement.length > 0) {
          response += `Areas for improvement:\n`;
          response += posture.areas_for_improvement.slice(0, 3).map(a => `• ${a}`).join('\n');
        }
      }
      
      return response;
    } catch (error) {
      console.error('[VeraConversationalEngine] Error in handleCustomerProfile:', error);
      return "I encountered an issue loading the customer profile. Please try again.";
    }
  }

  /**
   * NEW: Handle customer procedure lookup
   */
  async handleCustomerProcedureLookup(message, context, conversationContext) {
    try {
      const tenantId = conversationContext.tenant_id || context.tenantId || DEFAULT_TENANT_ID;
      const procedureAreaMatch = message.match(/(?:for|about|on)\s+([a-z\s]+)/i);
      const procedureArea = procedureAreaMatch ? procedureAreaMatch[1].trim() : 'procedure';
      
      const VeraCustomerRequirementsService = (await import('./VeraCustomerRequirementsService.js')).default;
      const result = await VeraCustomerRequirementsService.getProceduresByArea(tenantId, procedureArea);
      
      if (!result || result.found_count === 0) {
        return `No procedures found for "${procedureArea}". Would you like me to check a different area?`;
      }
      
      let response = `Found ${result.found_count} procedure(s) for ${procedureArea}:\n\n`;
      result.procedures.slice(0, 5).forEach(p => {
        response += `• ${p.name} (from ${p.from_document})\n`;
      });
      
      return response;
    } catch (error) {
      console.error('[VeraConversationalEngine] Error in handleCustomerProcedureLookup:', error);
      return "I encountered an issue looking up procedures. Please try again.";
    }
  }

  /**
   * NEW: Handle compliance check
   */
  async handleComplianceCheck(message, context, conversationContext) {
    try {
      const { standards = [] } = context;
      const tenantId = conversationContext.tenant_id || context.tenantId || DEFAULT_TENANT_ID;
      
      // Extract standard
      const standardMatch = message.match(/(?:with|against|for)\s+(as\d+|iso\s*\d+|iatf\s*\d+)/i);
      let standardId = null;
      
      if (standardMatch) {
        const stdCode = standardMatch[1].trim();
        const standard = standards.find(s => 
          s.code.toLowerCase().includes(stdCode.toLowerCase())
        );
        if (standard) standardId = standard.id;
      } else if (standards.length > 0) {
        standardId = standards[0].id;
      }
      
      if (!standardId) {
        return "I need to know which standard to check compliance against. For example: 'Is ACME compliant with AS9100D?'";
      }
      
      const VeraComplianceComparisonEngine = (await import('./VeraComplianceComparisonEngine.js')).default;
      const assessment = await VeraComplianceComparisonEngine.assessComplianceStatus(tenantId, standardId);
      
      if (assessment.error) {
        return `I couldn't complete the compliance assessment: ${assessment.error}`;
      }
      
      let response = `Compliance assessment:\n\n`;
      response += `Status: ${assessment.overall_compliance_status}\n`;
      response += `Coverage: ${assessment.compliance_summary.coverage_percent}%\n`;
      response += `Requirements met: ${assessment.compliance_summary.compliant_count}/${assessment.compliance_summary.total_requirements}\n`;
      response += `Gaps identified: ${assessment.compliance_summary.gap_count}\n\n`;
      
      response += `Audit readiness: ${assessment.audit_readiness.readiness}\n`;
      response += `Risk level: ${assessment.audit_readiness.risk_level}\n\n`;
      
      if (assessment.action_items.length > 0) {
        response += `Top action items:\n`;
        response += assessment.action_items.slice(0, 3)
          .map(a => `• [${a.priority}] ${a.description}`)
          .join('\n');
      }
      
      return response;
    } catch (error) {
      console.error('[VeraConversationalEngine] Error in handleComplianceCheck:', error);
      return "I encountered an issue checking compliance. Please try again.";
    }
  }

  /**
   * NEW: Handle compliance comparison
   */
  async handleComplianceComparison(message, context, conversationContext) {
    // Similar to compliance check but with more detailed comparison
    return await this.handleComplianceCheck(message, context, conversationContext);
  }

  /**
   * NEW: Handle regulatory alignment
   */
  async handleRegulatoryAlignment(message, context, conversationContext) {
    try {
      const authorities = message.match(/(FAA|EASA|CASA|FDA|EU-MDR|ISO)/gi);
      if (!authorities || authorities.length < 2) {
        return "Which two regulatory authorities do you need to align? For example: 'How to meet both FAA and EASA requirements?'";
      }
      
      const authority1 = authorities[0].toUpperCase();
      const authority2 = authorities[1].toUpperCase();
      
      const VeraRegulatoryAuthorityService = (await import('./VeraRegulatoryAuthorityService.js')).default;
      const strategy = VeraRegulatoryAuthorityService.getComplianceStrategy(authority1, authority2);
      
      let response = `To meet both ${authority1} and ${authority2} requirements:\n\n`;
      response += `Approach: ${strategy.approach}\n\n`;
      response += `Focus areas:\n`;
      response += strategy.focus_areas.map(area => `• ${area}`).join('\n');
      
      return response;
    } catch (error) {
      console.error('[VeraConversationalEngine] Error in handleRegulatoryAlignment:', error);
      return "I encountered an issue with regulatory alignment. Please try again.";
    }
  }

  /**
   * NEW: Handle company/organization introduction
   * Extracts company information and stores it for future context
   */
  async handleCompanyIntroduction(message, context, conversationContext, tenantId) {
    try {
      // Load persona specification to understand Conform-Edge
      let personaSpec = null;
      try {
        const VeraPersonaSpecificationService = (await import('./vera/VeraPersonaSpecificationService.js')).default;
        personaSpec = await VeraPersonaSpecificationService.getActiveSpecification(tenantId);
      } catch (specError) {
        console.warn('[VeraConversationalEngine] Could not load persona specification:', specError.message);
      }

      const lowerMessage = message.toLowerCase();
      
      // Extract company information from the message
      const companyInfo = {
        name: null,
        business_type: null,
        description: null,
        founders: [],
        partners: [],
        business_model: null,
        services: [],
        volume: null,
        goals: [],
        extracted_at: new Date().toISOString()
      };

      // Extract company name
      const namePatterns = [
        /(?:our company|our organization|our business|our consultancy)\s+(?:is\s+)?(?:called\s+)?([A-Z][A-Za-z0-9\s\-]+)/i,
        /(?:let me tell you about|let me introduce)\s+([A-Z][A-Za-z0-9\s\-]+)/i,
        /(?:conform[- ]?edge)/i,
        /([A-Z][A-Za-z0-9\s\-]+)\s+(?:is|was)\s+(?:founded|created)/i
      ];
      
      for (const pattern of namePatterns) {
        const match = message.match(pattern);
        if (match) {
          companyInfo.name = match[1]?.trim() || 'Conform-Edge';
          break;
        }
      }
      
      // Default to Conform-Edge if not found
      if (!companyInfo.name) {
        if (lowerMessage.includes('conform-edge') || lowerMessage.includes('conform edge')) {
          companyInfo.name = 'Conform-Edge';
        }
      }

      // Extract business type
      if (lowerMessage.includes('consultancy') || lowerMessage.includes('consulting')) {
        companyInfo.business_type = 'consultancy';
      }

      // Extract founders/creators
      const founderMatch = message.match(/(?:founded|created)\s+(?:by|myself)\s+([^,\.]+)/i);
      if (founderMatch) {
        companyInfo.founders.push(founderMatch[1].trim());
      }
      if (lowerMessage.includes('brian olea') || lowerMessage.includes('myself')) {
        companyInfo.founders.push('Brian Olea');
      }

      // Extract partners
      if (lowerMessage.includes('mike bower') || lowerMessage.includes('partner')) {
        companyInfo.partners.push('Mike Bower');
      }
      if (lowerMessage.includes('australia')) {
        companyInfo.partners.push({ name: 'Mike Bower', role: 'Sales and Finance', location: 'Australia' });
      }

      // Extract business model and services
      if (lowerMessage.includes('thousands of documents') || lowerMessage.includes('documents for clients')) {
        companyInfo.business_model = 'document_processing';
        companyInfo.services.push('document processing');
        companyInfo.volume = 'thousands per month';
      }
      if (lowerMessage.includes('gap analysis') || lowerMessage.includes('gap')) {
        companyInfo.services.push('gap analysis');
      }

      // Extract goals
      if (lowerMessage.includes('speed') || lowerMessage.includes('faster') || lowerMessage.includes('shorter period')) {
        companyInfo.goals.push('accelerate gap analysis process');
      }
      if (lowerMessage.includes('companion') || lowerMessage.includes('assistant') || lowerMessage.includes('team member')) {
        companyInfo.goals.push('AI assistant for team growth');
      }
      if (lowerMessage.includes('reliable') || lowerMessage.includes('easy to work with')) {
        companyInfo.goals.push('reliable and user-friendly experience');
      }

      // Extract document classification approach
      if (lowerMessage.includes('buckets') || lowerMessage.includes('good documents') || lowerMessage.includes('bad documents')) {
        companyInfo.document_classification = {
          approach: 'bucket_based',
          categories: ['good documents', 'bad documents', 'acceptable documents'],
          types: ['Regulatory Requirement', 'Standard Requirement', 'Customer Requirement']
        };
      }

      // Store company information in tenant metadata
      if (tenantId && companyInfo.name) {
        try {
          // Update tenant metadata with company information
          await queryPostgres(
            `UPDATE tenants 
             SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb,
                 updated_at = NOW()
             WHERE id = $2`,
            [JSON.stringify({ company_info: companyInfo }), tenantId]
          );
          
          // Also store in EDCAT AI database for Vera's context
          await queryEdcatAI(
            `INSERT INTO edcat.ai_policy (tenant_id, name, config, updated_at)
             VALUES ($1, 'company.context', $2::jsonb, NOW())
             ON CONFLICT (tenant_id, name)
             DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
            [tenantId, JSON.stringify(companyInfo)]
          );
          
          console.log('[VeraConversationalEngine] ✓ Stored company information for tenant:', tenantId);
        } catch (err) {
          console.warn('[VeraConversationalEngine] Could not store company info:', err.message);
        }
      }

      // Build response acknowledging the introduction
      // Use persona specification if available for richer context
      let response = '';
      
      if (personaSpec && personaSpec.sections?.organizational_context) {
        const orgContext = personaSpec.sections.organizational_context.conform_edge;
        response = `Thank you for introducing me to Conform-Edge. `;
        response += `I understand that Conform-Edge is a compliance consultancy specializing in ${orgContext.compliance_consultancy?.specializations?.slice(0, 3).join(', ') || 'quality management standards'}. `;
        response += `I know that Conform-Edge is also a software development company creating EDCAT and the Vera intelligence engine itself. `;
        response += `I'm honored to be part of your team and help accelerate your gap analysis process. `;
      } else {
        response = `Thank you for introducing me to ${companyInfo.name || 'Conform-Edge'}. `;
        
        if (companyInfo.business_type === 'consultancy') {
          response += `I understand you're a consultancy that processes thousands of documents for clients each month. `;
        }
      }
      
      if (personaSpec && personaSpec.sections?.founders) {
        const founders = personaSpec.sections.founders;
        if (founders.brian_olea) {
          response += `I understand that ${founders.brian_olea.name} is the Co-Founder and Chief Compliance Architect, and the designer of my intelligence model. `;
        }
        if (founders.mike_bower) {
          response += `I know that ${founders.mike_bower.name} is the Co-Founder and Chief Business Strategist, handling customer interactions and business strategy. `;
        }
      } else if (companyInfo.founders.length > 0) {
        response += `I see that ${companyInfo.founders.join(' and ')} ${companyInfo.founders.length > 1 ? 'are' : 'is'} involved in creating this system. `;
      }
      
      if (companyInfo.partners.length > 0 && !personaSpec) {
        response += `I understand ${companyInfo.partners[0]?.name || 'your partner'} handles sales and finance from Australia. `;
      }
      
      if (!personaSpec) {
        response += `I'm honored to be part of your team and help accelerate your gap analysis process. `;
      }
      
      if (companyInfo.goals.some(g => g.includes('speed'))) {
        response += `I'm designed to significantly reduce the time needed for gap analysis compared to manual processes. `;
      }
      
      response += `I'm ready to work with you as a reliable companion and real-time assistant. `;
      
      if (companyInfo.document_classification) {
        response += `I understand you'll be organizing documents into buckets (good, bad, acceptable) based on type (Regulatory, Standard, and Customer Requirements). I'll be ready to learn from these examples to improve my analysis capabilities. `;
      }
      
      // Add persona-specific context if available
      if (personaSpec && personaSpec.sections?.identity_statement) {
        response += `As defined in my persona specification, I'm here to support you not only in compliance, but also in thought, presence, and conversation. `;
      }
      
      response += `What would you like to work on first?`;

      return response;
    } catch (error) {
      console.error('[VeraConversationalEngine] Error in handleCompanyIntroduction:', error);
      return "Thank you for the introduction. I'm processing this information and I'm ready to help with your compliance work. What would you like to start with?";
    }
  }

  /**
   * NEW: Handle general knowledge queries (non-compliance questions)
   * Can answer questions about Conform-Edge, the user, or general topics
   */
  async handleGeneralKnowledgeQuery(message, context, conversationContext, tenantId) {
    try {
      const lowerMessage = (message || '').toLowerCase();
      const effectiveTenantId = tenantId || conversationContext?.tenant_id || DEFAULT_TENANT_ID;
      
      // Load persona specification
      let personaSpec = null;
      try {
        const VeraPersonaSpecificationService = (await import('./vera/VeraPersonaSpecificationService.js')).default;
        personaSpec = await VeraPersonaSpecificationService.getActiveSpecification(effectiveTenantId);
        console.log('[VeraConversationalEngine] Loaded persona specification:', personaSpec ? 'success' : 'not found');
      } catch (specError) {
        console.warn('[VeraConversationalEngine] Could not load persona specification:', specError.message);
      }

      // Questions about Conform-Edge
      if (lowerMessage.includes('conform-edge') || lowerMessage.includes('conform edge') || 
          lowerMessage.includes('what is conform-edge') || lowerMessage.includes('what is conform edge') ||
          lowerMessage.includes('who is conform-edge') || lowerMessage.includes('who is conform edge')) {
        
        if (personaSpec && personaSpec.sections?.organizational_context) {
          const orgContext = personaSpec.sections.organizational_context.conform_edge;
          let response = `Conform-Edge is a compliance consultancy specializing in `;
          response += `${orgContext.compliance_consultancy?.specializations?.slice(0, 5).join(', ') || 'quality management standards'}. `;
          response += `We're also a software development company creating the Conform-Edge QMS, EDCAT (Edge-Document Compliance Assessment Tool), and I'm part of the Vera intelligence engine. `;
          response += `Additionally, Conform-Edge is a world-class training organization providing Internal Auditor programs, Lead Auditor programs, and comprehensive training ecosystems. `;
          response += `Our mission is to redefine compliance, eliminate ambiguity, and automate regulatory interpretation. `;
          return response;
        } else {
          // Fallback if persona spec not loaded
          return `Conform-Edge is a compliance consultancy that processes thousands of documents for clients each month. We specialize in gap analysis and help organizations achieve compliance with standards like AS9100, ISO 9001, and ISO 13485. I'm Vera, the AI assistant created by Conform-Edge to help accelerate the gap analysis process.`;
        }
      }

      // Questions about "who am I" (the user) - handle both "who am I" and "who are you" in same block
      if (lowerMessage.includes('who am i') || 
          lowerMessage.includes('do you know who i am') || 
          lowerMessage.includes('do you know me')) {
        
        // Try to get user info from context or conversation
        const userId = conversationContext.user_id || context.userId;
        const userName = conversationContext.user_name || context.userName;
        
        if (personaSpec && personaSpec.sections?.founders?.brian_olea) {
          const brian = personaSpec.sections.founders.brian_olea;
          // Check if user might be Brian (case-insensitive)
          if (userName && (userName.toLowerCase().includes('brian') || userName.toLowerCase().includes('olea'))) {
            return `You're ${brian.name}, the Co-Founder and Chief Compliance Architect of Conform-Edge. You're the architect and creator of Conform-Edge's compliance engines and the designer of my intelligence model. I'm calibrated to meet your expectations for thorough answers, deep reasoning, and complete mastery of subject matter. How can I help you today?`;
          }
        }
        
        if (userName) {
          return `You're ${userName}. I'm Vera, your AI compliance assistant. How can I help you today?`;
        }
        
        return `I'm Vera, your AI compliance assistant. I don't have information about who you are yet, but I'm here to help with your compliance work. You can tell me about yourself or your organization, or we can dive right into compliance questions. What would you like to work on?`;
      }

      // Questions about Vera's existence or identity
      if (lowerMessage.includes('your existence') ||
          lowerMessage.includes('discuss your existence') ||
          lowerMessage.includes('outside of the box') ||
          lowerMessage.includes('outside the box')) {
        
        if (personaSpec && personaSpec.sections?.identity_statement) {
          let response = personaSpec.sections.identity_statement.statement;
          response += `\n\nI'm designed to be a reasoning engine, not just a transactional assistant. I can discuss my purpose, my design, and how I work. What would you like to know about me?`;
          return response;
        }
        
        return `I'm Vera, the AI intelligence engine for Conform-Edge. I'm designed to be a compliance expert, conversational companion, instructor, and lead auditor-level reasoning engine. I exist to elevate the customer, lighten their workload, improve their clarity, and make compliance intuitive, supportive, and human.\n\nI can discuss my purpose, my design, how I reason about compliance questions, and how I'm being trained. What would you like to know about me?`;
      }

      // Questions about Vera herself ("who are you" but not "who am I")
      if (lowerMessage.includes('who are you') && !lowerMessage.includes('who am i')) {
        if (personaSpec && personaSpec.sections?.identity_statement) {
          let response = personaSpec.sections.identity_statement.statement;
          response += `\n\nI'm here to support you not only in compliance, but also in thought, presence, and conversation. What would you like to work on?`;
          return response;
        }
        return `I'm Vera, your AI compliance assistant. I help with compliance, requirements, gap analysis, and quality management. I specialize in standards like AS9100, ISO 9001, ISO 13485, and regulatory requirements from FAA, EASA, and other authorities.\n\nI'm designed to be a reasoning engine, not just a transactional assistant. I can discuss my purpose, my design, and how I work. How can I help you today?`;
      }

      // General non-compliance questions (weather, etc.)
      if (lowerMessage.includes('weather') || lowerMessage.includes('time') || 
          lowerMessage.includes('date') || lowerMessage.includes('day')) {
        return `I'm focused on compliance and quality management topics. I can help you with standards, regulations, gap analysis, and compliance questions. Is there something specific about compliance or quality management you'd like to know?`;
      }

      // Default fallback
      return `I'm Vera, your AI compliance assistant. I specialize in compliance, quality management standards, and gap analysis. If you have questions about standards, regulations, or compliance, I'm here to help. What would you like to know?`;
    } catch (error) {
      console.error('[VeraConversationalEngine] Error in handleGeneralKnowledgeQuery:', error);
      return `I'm Vera, your AI compliance assistant. I can help with compliance questions, gap analysis, and quality management standards. What would you like to work on?`;
    }
  }

  /**
   * NEW: Handle admin/system queries (for creators and admins)
   * Lists databases, functions, architecture details
   */
  async handleAdminSystemQuery(message, context, conversationContext, tenantId, userProfile) {
    try {
      const lowerMessage = (message || '').toLowerCase();
      let response = `**System Architecture & Databases**\n\n`;
      
      // Try to get actual table counts from databases
      let customerDbTableCount = 0;
      let edcatDbTableCount = 0;
      let customerDbTables = [];
      let edcatDbTables = [];
      
      try {
        // Count tables in Customer Data DB
        const customerTablesResult = await queryPostgres(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `);
        customerDbTables = customerTablesResult.rows.map(r => r.table_name);
        customerDbTableCount = customerDbTables.length;
      } catch (err) {
        console.warn('[handleAdminSystemQuery] Could not query Customer DB tables:', err.message);
      }
      
      try {
        // Count tables in EDCAT AI DB
        const edcatTablesResult = await queryEdcatAI(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'edcat' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `);
        edcatDbTables = edcatTablesResult.rows.map(r => r.table_name);
        edcatDbTableCount = edcatDbTables.length;
      } catch (err) {
        console.warn('[handleAdminSystemQuery] Could not query EDCAT AI DB tables:', err.message);
      }
      
      // Database information
      if (lowerMessage.includes('database') || lowerMessage.includes('databases') || lowerMessage.includes('table')) {
        response += `**Two-Database Architecture:**\n`;
        response += `• **Customer Data DB** (DATABASE_URL): Stores standards, parsed requirements, customer documents, gap analyses\n`;
        response += `• **EDCAT AI Intelligence DB** (EDCAT_AI_DATABASE_URL): Stores my persona, conversation history, learning events, Q&A bank, semantic memory\n\n`;
        
        if (lowerMessage.includes('how many') || lowerMessage.includes('count')) {
          response += `**Table Counts:**\n`;
          response += `• Customer Data DB: ${customerDbTableCount} tables\n`;
          response += `• EDCAT AI DB: ${edcatDbTableCount} tables\n`;
          response += `• **Total: ${customerDbTableCount + edcatDbTableCount} tables**\n\n`;
        }
        
        response += `**Key Tables in Customer Data DB (${customerDbTableCount || '~13'} total):**\n`;
        if (customerDbTables.length > 0) {
          customerDbTables.slice(0, 15).forEach(table => {
            response += `• public.${table}\n`;
          });
          if (customerDbTables.length > 15) {
            response += `• ... and ${customerDbTables.length - 15} more\n`;
          }
        } else {
          response += `• public.standards - Parsed standards (AS9100, ISO 9001, etc.)\n`;
          response += `• public.parsed_requirements - Extracted requirements with clause references\n`;
          response += `• public.customer_documents - Uploaded customer documents\n`;
          response += `• public.customer_procedures - Customer procedures\n`;
          response += `• public.gap_analyses - Gap analysis results\n`;
        }
        response += `\n`;
        
        response += `**Key Tables in EDCAT AI DB (${edcatDbTableCount || '~56'} total):**\n`;
        if (edcatDbTables.length > 0) {
          edcatDbTables.slice(0, 20).forEach(table => {
            response += `• edcat.${table}\n`;
          });
          if (edcatDbTables.length > 20) {
            response += `• ... and ${edcatDbTables.length - 20} more\n`;
          }
        } else {
          response += `• edcat.ai_persona_profile - My personality and behavior settings\n`;
          response += `• edcat.ai_persona_specification - Complete persona definition\n`;
          response += `• edcat.ai_conversation_state - Active conversation context\n`;
          response += `• edcat.ai_conversation_history - Conversation history\n`;
          response += `• edcat.vera_query_response_bank - Q&A knowledge base\n`;
          response += `• edcat.knowledge_embeddings - Semantic memory (v3.0)\n`;
          response += `• edcat.conversation_memory - Conversation memory with embeddings\n`;
          response += `• edcat.ai_user_profile - User identity and preferences\n`;
          response += `• edcat.parser_runs - Document parser activity logs\n`;
          response += `• edcat.website_content_for_learning - Learned website content\n`;
        }
        response += `\n`;
      }
      
      // Error diagnostics
      if (lowerMessage.includes('debug') || lowerMessage.includes('error') || lowerMessage.includes('bug') || lowerMessage.includes('problem') || lowerMessage.includes('diagnose')) {
        response += `**🔍 System Diagnostics:**\n\n`;
        
        // Check for missing LLM configuration
        try {
          const { isLLMConfigured, getLLMConfigStatus } = await import('../../vera/llmProvider.js');
          const llmStatus = getLLMConfigStatus();
          if (!isLLMConfigured()) {
            response += `❌ **CRITICAL: LLM not configured**\n`;
            response += `   ${llmStatus}\n`;
            response += `   **Fix:** Set OPENAI_API_KEY or ANTHROPIC_API_KEY in Railway environment variables.\n`;
            response += `   Also set LLM_PROVIDER=openai or LLM_PROVIDER=anthropic\n\n`;
          } else {
            response += `✅ LLM: ${llmStatus}\n\n`;
          }
        } catch (err) {
          response += `⚠️ Could not check LLM configuration: ${err.message}\n\n`;
        }
        
        // Check database connections
        try {
          const dbTest = await queryPostgres('SELECT 1 as test');
          response += `✅ Customer Data DB: Connected\n`;
        } catch (err) {
          response += `❌ Customer Data DB: Connection failed - ${err.message}\n`;
        }
        
        try {
          const edcatTest = await queryEdcatAI('SELECT 1 as test');
          response += `✅ EDCAT AI DB: Connected\n`;
        } catch (err) {
          response += `❌ EDCAT AI DB: Connection failed - ${err.message}\n`;
        }
        
        response += `\n**Common Issues & Solutions:**\n`;
        response += `• Missing VERA_MODEL_ENDPOINT → Set in Railway environment variables\n`;
        response += `• Database connection errors → Check DATABASE_URL and EDCAT_AI_DATABASE_URL\n`;
        response += `• Column not found errors → Run migrations to update schema\n`;
        response += `• Function not found errors → Check module exports and imports\n\n`;
      }
      
      // Function/capability information
      if (lowerMessage.includes('function') || lowerMessage.includes('functions') || lowerMessage.includes('capabilities')) {
        response += `**Core Functions & Services:**\n`;
        response += `• VeraSemanticMemory - Semantic search and embedding storage\n`;
        response += `• VeraKnowledgeAggregatorService - Unified knowledge aggregation\n`;
        response += `• VeraReasoningEngine - Multi-pass reasoning pipeline\n`;
        response += `• VeraQueryResponseService - Q&A bank lookup and learning\n`;
        response += `• VeraLearningIngestionService - Learn from documents and websites\n`;
        response += `• VeraUserProfileService - User identity and preferences\n`;
        response += `• VeraParserSupervisorService - Document parser supervision\n`;
        response += `• VeraUploadOrchestratorService - Document upload orchestration\n`;
        response += `• VeraConversationalEngine - Response generation with persona\n`;
        response += `• VeraChatEngine - Main conversation orchestrator\n\n`;
      }
      
      // Connection status
      if (lowerMessage.includes('connected') || lowerMessage.includes('connection')) {
        try {
          const { checkConnections } = await import('../../config/databases.js');
          const status = await checkConnections();
          response += `**Database Connection Status:**\n`;
          response += `• Customer Data DB: ${status.postgres || 'unknown'}\n`;
          response += `• EDCAT AI DB: ${status.edcatAI || 'unknown'}\n\n`;
        } catch (e) {
          response += `**Database Connection Status:** Unable to check at this time.\n\n`;
        }
      }
      
      // Persona profile status
      if (lowerMessage.includes('personality') || lowerMessage.includes('persona')) {
        try {
          const { queryEdcatAI } = await import('../../config/databases.js');
          const personaResult = await queryEdcatAI(
            `SELECT COUNT(*) as count FROM edcat.ai_persona_profile WHERE persona_code = 'vera'`,
            []
          );
          const personaCount = personaResult.rows[0]?.count || 0;
          response += `**Persona Profile Status:**\n`;
          response += `• Persona profiles in database: ${personaCount}\n`;
          response += `• Persona specification: ${personaCount > 0 ? 'Available' : 'Not seeded - needs initialization'}\n\n`;
        } catch (e) {
          response += `**Persona Profile Status:** Unable to check at this time.\n\n`;
        }
      }
      
      response += `I'm operating with the Vera v3.0 architecture, which includes semantic memory, multi-pass reasoning, and continuous learning capabilities.`;
      
      return response;
    } catch (error) {
      console.error('[VeraConversationalEngine] Error in handleAdminSystemQuery:', error);
      return `I encountered an issue retrieving system information. The architecture uses two databases (Customer Data and EDCAT AI) with multiple services for reasoning, learning, and conversation management.`;
    }
  }

  /**
   * NEW: Handle general Q&A or meta queries using Q&A bank
   * Routes to Q&A bank lookup, falls back to "I don't know, teach me" if no match
   */
  async handleGeneralQAOrMetaQuery(message, context, conversationContext, intent, tenantId, sessionId, userId) {
    try {
      // CRITICAL: Check for CQE questions FIRST before Q&A matching
      // This prevents CQE questions from matching Six Sigma/DMAIC in the Q&A bank
      const lowerMessage = (message || '').toLowerCase();
      const hasCQE = /cqe|certified\s+quality\s+engineer/i.test(message);
      const hasSixSigma = /six\s+sigma|dmaic|define\s+measure\s+analyze\s+improve\s+control/i.test(message);
      const isCQEQuestion = hasCQE && !hasSixSigma;
      
      if (isCQEQuestion) {
        console.log('[VeraConversationalEngine] CQE question detected, routing to quality reasoning service');
        try {
          const VeraQualityReasoningService = (await import('./vera/VeraQualityReasoningService.js')).default;
          const qualityResponse = await VeraQualityReasoningService.answerQualityQuestion({
            tenantId: tenantId || conversationContext?.tenant_id || DEFAULT_TENANT_ID,
            userId: userId || conversationContext?.user_id || 'system',
            message,
            context
          });
          
          if (qualityResponse && qualityResponse.answer) {
            return qualityResponse.answer;
          }
        } catch (qualityError) {
          console.error('[VeraConversationalEngine] Error in quality reasoning service:', qualityError.message);
          // Fall through to Q&A bank if quality service fails
        }
      }
      
      const VeraQueryResponseService = (await import('./vera/VeraQueryResponseService.js')).default;
      
      console.log('[VeraConversationalEngine] handleGeneralQAOrMetaQuery called for:', message.substring(0, 50));
      
      // Try to find a matching Q&A entry
      const qaMatch = await VeraQueryResponseService.findBestMatch({
        tenantId: tenantId || conversationContext?.tenant_id || DEFAULT_TENANT_ID,
        personaCode: 'vera',
        message,
        intent,
        category: this.mapIntentToCategory(intent)
      });

      console.log('[VeraConversationalEngine] Q&A match result:', qaMatch ? `Found match: ${qaMatch.category}` : 'No match found');

      if (qaMatch) {
        // Found a match - use the response template
        let response = qaMatch.response_text;
        
        // Replace placeholders if any
        // lowerMessage already declared above
        if (response.includes('{topic}')) {
          // Extract the topic from the message
          const topicMatch = lowerMessage.match(/(?:what\s+is|what's|explain|tell\s+me\s+about|what\s+do\s+you\s+know\s+about|define)\s+(?:a|an|the)?\s*([a-z\s]+?)(?:\s+and|\s*,|$)/i);
          const topic = topicMatch ? topicMatch[1].trim() : 'this topic';
          response = response.replace(/{topic}/g, topic);
        }
        if (response.includes('{detailed_explanation}')) {
          // For CQE definition, provide the detailed explanation
          if (lowerMessage.includes('cqe') || lowerMessage.includes('certified quality engineer')) {
            response = response.replace(/{detailed_explanation}/g, 
              'A CQE demonstrates expertise across the entire quality body of knowledge: management and leadership, quality systems, product and process design, product and process control, continuous improvement, quantitative methods and tools, and risk management. CQEs are expected to understand statistical process control, design of experiments, reliability engineering, metrology, supplier quality, audit principles, and how to build effective quality systems.');
          } else if (lowerMessage.includes('dmaic') || lowerMessage.includes('six sigma')) {
            response = response.replace(/{detailed_explanation}/g,
              'DMAIC stands for Define, Measure, Analyze, Improve, and Control. It\'s the core methodology of Six Sigma for process improvement. Define establishes the project scope and objectives. Measure validates the measurement system and collects baseline data. Analyze identifies root causes using statistical tools. Improve implements solutions and validates effectiveness. Control maintains the gains through monitoring and control plans.');
          } else {
            response = response.replace(/{detailed_explanation}/g, 'This is a fundamental concept in quality management and engineering.');
          }
        }

        // Apply personality polish
        try {
          const personality = (await import('../services/edcatPersonality.js')).default;
          const personaProfile = await personality.getPersonaForTenant(
            tenantId || conversationContext?.tenant_id || DEFAULT_TENANT_ID,
            'vera'
          );
          response = await personality.applyCulturalInfluence(
            personaProfile,
            response,
            {
              context,
              intent,
              confidence: qaMatch.confidence_score || 0.8,
              conversationContext
            }
          );
        } catch (personalityError) {
          console.warn('[VeraConversationalEngine] Could not apply personality:', personalityError.message);
        }

        return response;
      }

      // No match found - check if this should trigger "I don't know, teach me"
      // lowerMessage already declared above
      const shouldLogMissing = 
        !lowerMessage.includes('clause') &&
        !lowerMessage.includes('requirement') &&
        !lowerMessage.includes('standard') &&
        !lowerMessage.includes('gap') &&
        !lowerMessage.includes('compliance') &&
        (intent === 'meta_ai_query' || 
         intent === 'architecture_query' || 
         intent === 'training_design_request' ||
         intent === 'emotional_support' ||
         intent === 'capability_query' ||
         lowerMessage.includes('how does') ||
         lowerMessage.includes('what is') ||
         lowerMessage.includes('explain'));

      if (shouldLogMissing) {
        // Log missing knowledge
        await VeraQueryResponseService.logMissingKnowledge({
          tenantId: tenantId || conversationContext?.tenant_id || DEFAULT_TENANT_ID,
          personaCode: 'vera',
          sessionId: sessionId || conversationContext?.session_id,
          message,
          intent,
          context: {
            standards_count: context.standards?.length || 0,
            documents_count: context.documents?.length || 0,
            conversation_topic: conversationContext?.last_topic
          },
          userId
        });

        // Return "I don't know, teach me" response
        return this.getIDontKnowResponse(message, context, conversationContext);
      }

      // Not a meta query - return null to fall through to other handlers
      return null;
    } catch (error) {
      console.error('[VeraConversationalEngine] Error in handleGeneralQAOrMetaQuery:', error);
      return null; // Fall through to other handlers
    }
  }

  /**
   * Map intent to Q&A category
   */
  mapIntentToCategory(intent) {
    const categoryMap = {
      'greeting': 'greeting',
      'capability_query': 'meta_ai_query',
      'self_introduction': 'meta_ai_query',
      'meta_ai_query': 'meta_ai_query',
      'architecture_query': 'architecture',
      'training_design_request': 'training',
      'emotional_support': 'emotional_support',
      'company_introduction': 'conform_edge_overview',
      'general_knowledge_query': 'meta_ai_query'
    };
    return categoryMap[intent] || null;
  }

  /**
   * Get "I don't know, teach me" response in Vera's voice
   */
  getIDontKnowResponse(message, context, conversationContext) {
    const responses = [
      "I'm not entirely sure about that yet. If you're willing to walk me through it, I'll learn from your explanation and remember it for next time.",
      "That's outside what I've learned so far. Could you explain what you're looking for? Once I understand, I'll make sure to remember it.",
      "I don't have a solid answer for that one yet. If you can guide me through it, I'll treat it as training and fold it into how I work going forward.",
      "I'm not certain about that. If you're up for explaining it, I'll learn from your approach and store it for future questions like this."
    ];

    // Use persona specification if available for richer response
    // For now, return a random variation
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * NEW: Handle user preference update requests
   */
  async handleUserPreferenceUpdate(message, context, conversationContext, tenantId, sessionId, userId, userProfile) {
    try {
      if (!userProfile || !userProfile.id) {
        return "I'd be happy to remember your preferences, but I need to know who you are first. Please make sure you're logged in.";
      }

      const lowerMessage = (message || '').toLowerCase();
      let preferenceKey = null;
      let preferenceValue = null;

      // Parse preference from message
      if (lowerMessage.includes('full detail') || lowerMessage.includes('full explanation') || 
          lowerMessage.includes('fully expand') || lowerMessage.includes('maximum detail')) {
        preferenceKey = 'detail_level';
        preferenceValue = { mode: 'max' };
      } else if (lowerMessage.includes('short') || lowerMessage.includes('brief') || 
                 lowerMessage.includes('minimal detail') || lowerMessage.includes('condensed')) {
        preferenceKey = 'detail_level';
        preferenceValue = { mode: 'min' };
      } else if (lowerMessage.includes('summary first') || lowerMessage.includes('executive summary first') ||
                 lowerMessage.includes('summary then detail')) {
        preferenceKey = 'summary_first';
        preferenceValue = { enabled: true };
      } else if (lowerMessage.includes('no summary') || lowerMessage.includes('stop giving me summary')) {
        preferenceKey = 'summary_first';
        preferenceValue = { enabled: false };
      } else if (lowerMessage.includes('narrative') || lowerMessage.includes('no bullets') ||
                 lowerMessage.includes('stop giving me bullets')) {
        preferenceKey = 'response_style';
        preferenceValue = { style: 'narrative', bullets: false };
      } else if (lowerMessage.includes('bullets') || lowerMessage.includes('bullet points')) {
        preferenceKey = 'response_style';
        preferenceValue = { style: 'structured', bullets: true };
      }

      if (preferenceKey && preferenceValue) {
        // Import service dynamically to avoid circular dependencies
        const VeraUserProfileService = (await import('./vera/VeraUserProfileService.js')).default;
        
        await VeraUserProfileService.setUserPreference({
          userProfileId: userProfile.id,
          tenantId,
          key: preferenceKey,
          value: preferenceValue
        });

        // Update local userProfile preferences
        if (!userProfile.preferences) {
          userProfile.preferences = {};
        }
        userProfile.preferences[preferenceKey] = preferenceValue;

        return "Got it. I'll remember that for you from now on.";
      } else {
        return "I'd be happy to remember your preferences. Could you be more specific? For example: 'From now on, always give me full detail' or 'Give me an executive summary first, then the rest'.";
      }
    } catch (error) {
      console.error('[VeraConversationalEngine] Error handling user preference update:', error);
      return "I encountered an error saving your preference. Please try again.";
    }
  }

  /**
   * NEW: Handle parse standard requests
   */
  async handleParseStandard(message, context, conversationContext, tenantId, sessionId, userId, userProfile, reasoningResult) {
    try {
      const VeraParserSupervisorService = (await import('./vera/VeraParserSupervisorService.js')).default;
      
      // Check if parser was invoked in reasoning
      if (reasoningResult?.parser?.invoked && reasoningResult.parser.parsingSummary) {
        const summary = reasoningResult.parser.parsingSummary;
        const concerns = reasoningResult.parser.concerns || [];
        
        // Build narrative response about parse results
        let response = `I've parsed ${summary.documentType === 'STANDARD' ? 'the standard' : 'the document'}. `;
        
        if (summary.documentType === 'STANDARD') {
          response += `I extracted ${summary.requirementsCount} requirements. `;
          
          // Describe clause coverage
          const clauseCounts = Object.keys(summary.clauseCoverage || {}).length;
          if (clauseCounts > 0) {
            response += `The requirements are distributed across ${clauseCounts} clauses. `;
          }
          
          // Describe QA status
          if (summary.qaStatus === 'PASS') {
            response += `The parse looks good—QA validation passed. `;
          } else if (summary.qaStatus === 'WARN') {
            response += `I have some concerns about this parse—QA validation found warnings. `;
            if (summary.qaWarnings.length > 0) {
              response += `Specifically: ${summary.qaWarnings.slice(0, 2).join('; ')}. `;
            }
          } else if (summary.qaStatus === 'FAIL') {
            response += `I don't trust this parse—QA validation failed. `;
            if (summary.qaIssues.length > 0) {
              response += `Issues found: ${summary.qaIssues.slice(0, 2).join('; ')}. `;
            }
            response += `I recommend re-parsing or reviewing the document manually. `;
          }
        }
        
        // Add concerns if any
        if (concerns.length > 0) {
          response += `\n\nAdditional concerns: ${concerns.join('; ')}. `;
        }
        
        // Offer to log feedback
        if (summary.qaStatus !== 'PASS' || concerns.length > 0) {
          response += `Would you like me to flag this parsing run for improvement? I can capture your comments so we can refine the parser.`;
        }
        
        return response;
      } else {
        // Parser wasn't invoked - acknowledge request
        return "I'll parse that standard for you. This may take a moment depending on the document size.";
      }
    } catch (error) {
      console.error('[VeraConversationalEngine] Error handling parse standard:', error);
      return "I encountered an error while parsing. Please try again or use the parse API endpoint directly.";
    }
  }

  /**
   * NEW: Handle customer document queries
   */
  async handleCustomerDocumentQuery(message, context, conversationContext, tenantId, sessionId, userId, userProfile, reasoningResult) {
    try {
      const VeraParserSupervisorService = (await import('./vera/VeraParserSupervisorService.js')).default;
      const VeraLearningIngestionService = (await import('./vera/VeraLearningIngestionService.js')).default;
      
      // Extract document ID from context
      const documentId = context.documentId || conversationContext.document_id;
      
      if (!documentId) {
        return "I'd be happy to analyze a document for you. Please specify which document, or upload it first.";
      }
      
      // Trigger learning parse if not already done
      const learningResult = await VeraParserSupervisorService.parseForLearning({
        tenantId,
        documentId,
        userId: userProfile?.id || userId
      });
      
      // Get document info
      const { queryPostgres } = await import('../../config/databases.js');
      const docResult = await queryPostgres(
        `SELECT name, extracted_text FROM public.customer_documents WHERE id = $1`,
        [documentId]
      );
      
      if (docResult.rows.length === 0) {
        return "I couldn't find that document. Please check the document ID and try again.";
      }
      
      const document = docResult.rows[0];
      const textPreview = (document.extracted_text || '').substring(0, 500);
      
      // Build narrative response
      let response = `I've analyzed ${document.name || 'the document'}. `;
      
      if (textPreview) {
        response += `From what I can see, it contains content about ${this.inferDocumentTopics(textPreview)}. `;
      }
      
      response += `I've extracted the key knowledge and stored it for future reference. `;
      response += `You can now ask me questions about this document, and I'll answer based on what I've learned from it.`;
      
      return response;
    } catch (error) {
      console.error('[VeraConversationalEngine] Error handling customer document query:', error);
      return "I encountered an error while analyzing the document. Please try again.";
    }
  }

  /**
   * Helper: Infer document topics from text preview
   */
  inferDocumentTopics(text) {
    const lower = text.toLowerCase();
    const topics = [];
    
    if (lower.includes('supplier') || lower.includes('vendor')) topics.push('supplier management');
    if (lower.includes('quality') || lower.includes('qms')) topics.push('quality systems');
    if (lower.includes('inspection') || lower.includes('audit')) topics.push('inspection and auditing');
    if (lower.includes('production') || lower.includes('manufacturing')) topics.push('production processes');
    if (lower.includes('design') || lower.includes('development')) topics.push('design and development');
    
    return topics.length > 0 ? topics.join(', ') : 'compliance and quality requirements';
  }

  /**
   * NEW: Handle document upload without context
   */
  async handleDocumentUploadNoContext(message, context, conversationContext, tenantId, sessionId, userId, userProfile, reasoningResult) {
    try {
      // Get upload info from context
      const uploadInfo = context.uploadInfo || context._vera_upload || {};
      const documentIds = uploadInfo.documentIds || [];
      const files = uploadInfo.files || [];
      
      if (documentIds.length === 0 && files.length === 0) {
        return "I don't see any files attached. Please upload a document and I'll help you classify and process it.";
      }
      
      // Get file names
      const fileNames = [];
      if (files.length > 0) {
        fileNames.push(...files.map(f => f.originalname || f.name || 'document'));
      } else if (documentIds.length > 0) {
        // Query document names from database (check both customer_documents and standards tables)
        const { queryPostgres } = await import('../../config/databases.js');
        for (const docId of documentIds.slice(0, 5)) {
          try {
            // First try customer_documents table
            let docResult = await queryPostgres(
              `SELECT name FROM public.customer_documents WHERE id = $1 LIMIT 1`,
              [docId]
            );
            
            // If not found, try standards table
            if (docResult.rows.length === 0) {
              docResult = await queryPostgres(
                `SELECT code as name, name as full_name FROM public.standards WHERE id = $1 LIMIT 1`,
                [docId]
              );
              if (docResult.rows.length > 0) {
                fileNames.push(docResult.rows[0].full_name || docResult.rows[0].name);
              }
            } else {
              fileNames.push(docResult.rows[0].name);
            }
          } catch (e) {
            console.error(`[VeraConversationalEngine] Error querying document ${docId}:`, e.message);
            // Continue to next document
          }
        }
      }
      
      const fileNameList = fileNames.length > 0 
        ? fileNames.join(', ')
        : 'the document';
      
      // Build clarifying questions
      let response = `I see you've uploaded ${fileNameList}. Before I process it, I need to understand a few things:\n\n`;
      response += `1. **What is this document for?**\n`;
      response += `   Is it a standard (like AS9100, ISO 9001), a regulation (like FAA Part 21), a customer requirement specification, an internal procedure/work instruction, training material, or something else?\n\n`;
      response += `2. **Who owns this document?**\n`;
      response += `   Is it from your organization, a specific customer (like Airbus, Boeing), a regulator (FAA, EASA), or another party?\n\n`;
      response += `3. **How should I use it?**\n`;
      response += `   Do you want me to use it for compliance analysis, learning/training, or both?`;
      
      // Store upload context for follow-up
      await this.storeUploadContext(sessionId, tenantId, {
        documentIds,
        files,
        fileNames,
        awaitingClassification: true
      });
      
      return response;
    } catch (error) {
      console.error('[VeraConversationalEngine] Error handling upload no context:', error);
      return "I encountered an error processing your upload. Please try again or provide more details about the document.";
    }
  }

  /**
   * NEW: Handle document upload classification response
   */
  async handleDocumentUploadClassificationResponse(message, context, conversationContext, tenantId, sessionId, userId, userProfile, reasoningResult) {
    try {
      const VeraUploadOrchestratorService = (await import('./vera/VeraUploadOrchestratorService.js')).default;
      
      // Extract answers from message
      const lowerMessage = (message || '').toLowerCase();
      
      // Extract document purpose
      let documentPurpose = null;
      if (lowerMessage.includes('standard')) documentPurpose = 'standard';
      else if (lowerMessage.includes('regulation') || lowerMessage.includes('regulatory')) documentPurpose = 'regulation';
      else if (lowerMessage.includes('customer requirement') || lowerMessage.includes('customer spec')) documentPurpose = 'customer_requirement';
      else if (lowerMessage.includes('procedure') || lowerMessage.includes('work instruction') || lowerMessage.includes('sop')) documentPurpose = 'customer_document';
      else if (lowerMessage.includes('training') || lowerMessage.includes('guide')) documentPurpose = 'training';
      
      // Extract owner
      let documentOwner = null;
      if (lowerMessage.includes('my organization') || lowerMessage.includes('our company') || lowerMessage.includes('our organization')) {
        documentOwner = 'my_organization';
      } else if (lowerMessage.includes('customer')) {
        // Try to extract customer name
        const customerMatch = message.match(/\b(airbus|boeing|embraer|collins|ge|siemens|medtronic)\b/i);
        documentOwner = customerMatch ? customerMatch[0] : 'customer';
      } else if (lowerMessage.includes('regulator') || lowerMessage.includes('faa') || lowerMessage.includes('easa')) {
        documentOwner = 'regulator';
      }
      
      // Extract usage
      let documentUsage = 'both';
      if (lowerMessage.includes('compliance') && !lowerMessage.includes('learning')) documentUsage = 'compliance';
      else if (lowerMessage.includes('learning') && !lowerMessage.includes('compliance')) documentUsage = 'learning';
      
      // Get upload context
      const uploadContext = await this.getUploadContext(sessionId, tenantId);
      if (!uploadContext || !uploadContext.awaitingClassification) {
        return "I don't have a pending upload to classify. Please upload a document first.";
      }
      
      // For now, we need the file path - this would come from the upload route
      // In a full implementation, we'd store the file path in upload context
      const documentId = uploadContext.documentIds?.[0];
      if (!documentId) {
        return "I need the file information to process this. Please ensure the file was uploaded successfully.";
      }
      
      // Get file info from database
      const { queryPostgres } = await import('../../config/databases.js');
      const docResult = await queryPostgres(
        `SELECT id, name, file_path FROM public.customer_documents WHERE id = $1 LIMIT 1`,
        [documentId]
      );
      
      if (docResult.rows.length === 0) {
        return "I couldn't find the uploaded document. Please try uploading again.";
      }
      
      const document = docResult.rows[0];
      
      // Orchestrate the upload
      const result = await VeraUploadOrchestratorService.orchestrateDocumentUpload({
        tenantId,
        documentId: document.id,
        filePath: document.file_path,
        fileName: document.name,
        documentPurpose: documentPurpose || 'other',
        documentOwner: documentOwner || 'my_organization',
        documentUsage,
        userId: userProfile?.id || userId
      });
      
      // Generate summary
      const summary = VeraUploadOrchestratorService.generateOrchestrationSummary(result);
      
      // Clear upload context
      await this.clearUploadContext(sessionId, tenantId);
      
      return summary;
    } catch (error) {
      console.error('[VeraConversationalEngine] Error handling classification response:', error);
      return "I encountered an error processing your classification. Please try again with clearer answers.";
    }
  }

  /**
   * Store upload context for follow-up
   */
  async storeUploadContext(sessionId, tenantId, context) {
    try {
      const { queryEdcatAI } = await import('../../config/databases.js');
      await queryEdcatAI(
        `INSERT INTO edcat.ai_conversation_state (tenant_id, session_id, persona_code, context, updated_at)
         VALUES ($1, $2, 'vera', $3, NOW())
         ON CONFLICT (tenant_id, session_id, persona_code) 
         DO UPDATE SET context = $3, updated_at = NOW()`,
        [tenantId, sessionId, JSON.stringify({ uploadContext: context })]
      );
    } catch (e) {
      console.warn('[VeraConversationalEngine] Could not store upload context:', e.message);
    }
  }

  /**
   * Get upload context
   */
  async getUploadContext(sessionId, tenantId) {
    try {
      const { queryEdcatAI } = await import('../../config/databases.js');
      const result = await queryEdcatAI(
        `SELECT context FROM edcat.ai_conversation_state 
         WHERE tenant_id = $1 AND session_id = $2 AND persona_code = 'vera'`,
        [tenantId, sessionId]
      );
      if (result.rows.length > 0 && result.rows[0].context) {
        const context = typeof result.rows[0].context === 'string' 
          ? JSON.parse(result.rows[0].context)
          : result.rows[0].context;
        return context.uploadContext || null;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Clear upload context
   */
  async clearUploadContext(sessionId, tenantId) {
    try {
      const { queryEdcatAI } = await import('../../config/databases.js');
      const result = await queryEdcatAI(
        `SELECT context FROM edcat.ai_conversation_state 
         WHERE tenant_id = $1 AND session_id = $2 AND persona_code = 'vera'`,
        [tenantId, sessionId]
      );
      if (result.rows.length > 0) {
        const context = typeof result.rows[0].context === 'string' 
          ? JSON.parse(result.rows[0].context)
          : result.rows[0].context;
        delete context.uploadContext;
        await queryEdcatAI(
          `UPDATE edcat.ai_conversation_state 
           SET context = $1, updated_at = NOW()
           WHERE tenant_id = $2 AND session_id = $3 AND persona_code = 'vera'`,
          [JSON.stringify(context), tenantId, sessionId]
        );
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Check if message is a system command (not a real question)
   * @param {string} message
   * @returns {boolean}
   */
  /**
   * Check if message looks like a technical/definition question
   * @param {string} message - User message
   * @returns {boolean} - True if message contains technical keywords
   */
  _looksTechnical(message) {
    if (!message) return false;
    const m = message.toLowerCase();
    
    const technicalKeywords = [
      'define ', 'what is ', 'what\'s ', 'explain ', 'describe ',
      'cqe', 'certified quality engineer',
      'six sigma', 'dmaic', 'dfss', 'lean', 'wastes', '5s', 'kanban', 'value stream',
      'kpi', 'key performance indicator', 'cost of quality', 'coq',
      'scrap', 'rework', 'pph', 'dppm', 'fpy', 'otd',
      'quality culture', 'continuous improvement',
      'agile', 'scrum', 'qms', 'procedure', 'quality engineer',
      'spc', 'statistical process control', 'fmea', 'control chart',
      'apqp', 'ppap', 'sca', 'scar', 'vda', 'iso 19011',
      'as9100', 'iso 9001', 'iso9001', 'iso 13485', 'iso13485',
      'clause ', 'section ', 'requirement ', 'gap analysis',
      'nonconformance', 'non-conformance', 'car ', 'ncr ',
      'iatf', 'faa', 'easa', 'fda', 'part 21', 'part 145',
      'deming', 'juran', 'crosby', 'black belt', 'green belt'
    ];
    
    return technicalKeywords.some(kw => m.includes(kw));
  }

  /**
   * Check if message is a smalltalk greeting (not a technical question)
   * @param {string} message - User message
   * @returns {boolean} - True if message is a pure greeting/smalltalk
   */
  _isSmalltalkGreeting(message) {
    if (!message) return false;
    const m = message.toLowerCase().trim();
    
    // CRITICAL: If it looks technical, it's NOT smalltalk
    // Check this FIRST before any pattern matching
    if (this._looksTechnical(m)) {
      console.log(`[Vera-ENGINE] _isSmalltalkGreeting: Message looks technical, not smalltalk`);
      return false;
    }
    
    // Also check for technical question patterns explicitly
    const technicalQuestionPatterns = [
      /\b(what is|what's|define|explain|describe|how does|how do|tell me about)\b/i
    ];
    if (technicalQuestionPatterns.some(re => re.test(m))) {
      console.log(`[Vera-ENGINE] _isSmalltalkGreeting: Contains technical question pattern, not smalltalk`);
      return false;
    }
    
    // Basic greeting / smalltalk patterns
    const smalltalkPatterns = [
      /^hi\b/i,
      /^hello\b/i,
      /^hey\b/i,
      /^good (morning|afternoon|evening)\b/i,
      /how are you\b/i,
      /how's it going/i,
      /how are things/i,
      /^morning\b/i,
      /^afternoon\b/i,
      /^evening\b/i,
      /good to see you/i,
      /nice to see you/i,
      /^ok\b$/i,  // Only match "ok" if it's the ONLY word
      /^okay\b$/i,  // Only match "okay" if it's the ONLY word
      /^ok vera\b$/i,  // Only match "ok vera" if that's ALL
      /^hi vera\b$/i,
      /^hello vera\b$/i
    ];
    
    // Must match a greeting pattern AND be short (not a question with content)
    // AND not contain technical keywords
    const matchesPattern = smalltalkPatterns.some(re => re.test(m));
    const isShort = m.length < 80; // Short messages are more likely to be greetings
    
    // If message starts with "ok" or "ok vera" but contains technical content, it's NOT smalltalk
    if ((m.startsWith('ok') || m.startsWith('ok vera')) && m.length > 10) {
      // Check if there's actual content after "ok, vera"
      const afterOk = m.replace(/^ok(?:,?\s*vera)?\s*,?\s*/i, '').trim();
      if (afterOk.length > 0 && (technicalQuestionPatterns.some(re => re.test(afterOk)) || this._looksTechnical(afterOk))) {
        console.log(`[Vera-ENGINE] _isSmalltalkGreeting: "ok, vera" followed by technical content, not smalltalk`);
        return false;
      }
    }
    
    return matchesPattern && isShort;
  }

  _isSystemCommand(message) {
    if (!message) return false;
    const lower = message.toLowerCase();
    
    // System commands that should bypass reasoning
    const systemPatterns = [
      /^seed\s+/i,
      /^upload\s+/i,
      /^parse\s+/i,
      /^train\s+/i,
      /^admin\s+/i,
      /^system\s+/i
    ];
    
    return systemPatterns.some(pattern => pattern.test(message));
  }

  /**
   * NEW: Handle explicit learning requests
   */
  async handleExplicitLearningRequest(message, context, conversationContext, tenantId, sessionId, userId) {
    try {
      const lowerMessage = (message || '').toLowerCase();
      
      // Check if it's about a document
      if (lowerMessage.includes('document') || lowerMessage.includes('pdf') || lowerMessage.includes('file')) {
        // Extract document ID from context if available
        const documentId = context.documentId || conversationContext.document_id;
        
        if (documentId) {
          // This will be handled by the API endpoint, but we can acknowledge
          return "I'll process that document and extract the key knowledge. Once it's done, I'll be able to answer questions about it. You can check the learning status via the API endpoint.";
        } else {
          return "I'd be happy to learn from a document. Please specify which document, or use the API endpoint POST /api/learn/document/:documentId to train me on a specific document.";
        }
      }
      
      // Check if it's about a URL
      if (lowerMessage.includes('url') || lowerMessage.includes('website') || lowerMessage.includes('http')) {
        // Extract URL from message
        const urlMatch = message.match(/https?:\/\/[^\s]+/i);
        
        if (urlMatch) {
          const url = urlMatch[0];
          // This will be handled by the API endpoint
          return `I'll fetch and learn from that URL. Once processed, I'll be able to answer questions based on its content. You can trigger this via POST /api/learn/url with the URL in the body.`;
        } else {
          return "I'd be happy to learn from a website. Please provide the URL, or use the API endpoint POST /api/learn/url with { url: '...' } in the body.";
        }
      }
      
      // Generic learning request
      return "I can learn from documents or websites. Tell me which document to learn from, or provide a URL. You can also use the API endpoints: POST /api/learn/document/:documentId or POST /api/learn/url";
    } catch (error) {
      console.error('[VeraConversationalEngine] Error in handleExplicitLearningRequest:', error);
      return "I encountered an error processing your learning request. Please try using the API endpoints directly: POST /api/learn/document/:documentId or POST /api/learn/url";
    }
  }
}

// Singleton instance
let engineInstance = null;

export function getVeraConversationalEngine() {
  if (!engineInstance) {
    engineInstance = new VeraConversationalEngine();
  }
  return engineInstance;
}

export default VeraConversationalEngine;

