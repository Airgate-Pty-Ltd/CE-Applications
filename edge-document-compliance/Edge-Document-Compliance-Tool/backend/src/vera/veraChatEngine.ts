/**
 * Vera Chat Engine
 * Main orchestrator for all Vera conversations
 * Uses Vera's own intelligence systems - completely independent and standalone
 * NO OpenAI dependencies - uses provider-agnostic veraEngine
 */

// @ts-ignore - JavaScript module without types
import { queryPostgres, queryEdcatAI } from '../config/databases.js';
import { classifyIntent, Intent } from './intentClassifier.js';
import { fetchSemanticContext, formatSemanticContext } from './semanticFetcher.js';
import { 
  routeToStandardsParser, 
  routeToGapAnalysis, 
  routeToRegulatoryLookup,
  routeToRequirementCompare 
} from './toolRouter.js';
import { composeFinalResponse } from './finalComposer.js';
import { runVera, VERA_SYSTEM_PROMPT, type VeraMessage, type VeraContext } from './veraEngine.js';
// Import VeraRepository - will be loaded dynamically
let ConversationRepository: any;
let StandardsRepository: any;
let PersonaRepository: any;

async function loadVeraRepository() {
  if (ConversationRepository && StandardsRepository && PersonaRepository) {
    return { ConversationRepository, StandardsRepository, PersonaRepository };
  }
  
  try {
    // @ts-ignore - JavaScript module without types
    const repoModule = await import('../services/vera/VeraRepository.js');
    ConversationRepository = repoModule.ConversationRepository || repoModule.default?.ConversationRepository;
    StandardsRepository = repoModule.StandardsRepository || repoModule.default?.StandardsRepository;
    PersonaRepository = repoModule.PersonaRepository || repoModule.default?.PersonaRepository;
    return { ConversationRepository, StandardsRepository, PersonaRepository };
  } catch (error) {
    console.error('[VeraChatEngine] Could not import VeraRepository:', error);
    // Create fallback stubs
    ConversationRepository = { 
      getOrCreateSession: async () => ({ conversation_id: 'fallback' }), 
      saveConversationTurn: async () => ({}), 
      getConversationHistory: async () => [] 
    };
    StandardsRepository = {};
    PersonaRepository = { getVeraPersonaProfile: async () => ({}) };
    return { ConversationRepository, StandardsRepository, PersonaRepository };
  }
}

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

interface ChatContext {
  documents?: any[];
  standards?: any[];
  regulatoryWebsites?: any[];
  customerRequirements?: any[];
  customerId?: string;
}

interface ChatOptions {
  message: string;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  conversationId?: string;
  context?: ChatContext;
  persona?: any;
}

interface ChatResponse {
  response: string;
  intent: Intent;
  usedTools?: string[];
  confidence?: number;
  metadata?: any;
}

class VeraChatEngine {
  private systemPrompt: string = VERA_SYSTEM_PROMPT;
  private conversationalEngine: any = null;

  constructor() {
    console.log('[VeraChatEngine] Initialized - using Vera\'s provider-agnostic intelligence systems');
    console.log('[VeraChatEngine] NO OpenAI dependencies - using veraEngine abstraction layer');
    // Load VeraConversationalEngine dynamically for fallback
    this.loadConversationalEngine();
  }

  /**
   * Load VeraConversationalEngine for generating responses (fallback)
   */
  private async loadConversationalEngine() {
    try {
      // @ts-ignore - JavaScript module without types
      const { default: VeraConversationalEngine } = await import('../services/veraConversationalEngine.js');
      this.conversationalEngine = new VeraConversationalEngine();
      console.log('[VeraChatEngine] ✅ Loaded VeraConversationalEngine (fallback)');
    } catch (error) {
      console.warn('[VeraChatEngine] Could not load VeraConversationalEngine:', error);
    }
  }

  /**
   * Main entry point for chat
   */
  async chat(options: ChatOptions): Promise<ChatResponse> {
    const {
      message,
      userId = 'system',
      tenantId = DEFAULT_TENANT_ID,
      sessionId,
      conversationId,
      context = {},
      persona
    } = options;

    try {
      // Step 1: Load persona and system prompts
      const loadedPersona = persona || await this.loadPersona(tenantId);
      const systemPrompt = await this.loadSystemPrompt(tenantId, loadedPersona);

      // Step 2: Classify intent
      const intentResult = await classifyIntent(message);
      const intent = intentResult.intent;

      // Step 3: Load conversation history
      const conversationHistory = await this.loadConversationHistory(
        conversationId || sessionId,
        tenantId
      );

      // Step 4: Fetch semantic context (RAG)
      const semanticContext = await fetchSemanticContext(message, {
        maxRequirements: 5,
        maxProcedures: 3,
        maxConcepts: 5
      });

      // Step 5: Route to tools if needed
      const toolResults = await this.routeToTools(intent, message, context, intentResult.extractedData);

      // Step 6: Generate response using provider-agnostic VeraEngine
      const finalResponse = await this.generateResponseWithVeraEngine(
        message,
        intent,
        systemPrompt,
        conversationHistory,
        semanticContext,
        toolResults,
        context,
        loadedPersona,
        userId,
        tenantId,
        conversationId || sessionId
      );

      // Step 9: Save conversation
      await this.saveConversation(
        conversationId || sessionId,
        userId,
        tenantId,
        message,
        finalResponse,
        intent,
        conversationHistory
      );

      // Step 10: Return response
      return {
        response: finalResponse,
        intent,
        usedTools: toolResults.usedTools,
        confidence: intentResult.confidence,
        metadata: {
          semanticContextUsed: semanticContext.requirements.length > 0,
          toolResults: toolResults.results
        }
      };
    } catch (error: any) {
      console.error('[VeraChatEngine] Error in chat:', error);
      return {
        response: `I encountered an error processing your request: ${error.message}. Please try rephrasing your question.`,
        intent: 'unknown',
        confidence: 0
      };
    }
  }

  /**
   * Load persona profile
   */
  private async loadPersona(tenantId: string): Promise<any> {
    try {
      const { PersonaRepository: Repo } = await loadVeraRepository();
      const persona = await Repo.getVeraPersonaProfile(tenantId);
      return persona || {};
    } catch (error) {
      console.warn('[VeraChatEngine] Could not load persona:', error);
      return {};
    }
  }

  /**
   * Load system prompt (with persona overrides)
   */
  private async loadSystemPrompt(tenantId: string, persona: any): Promise<string> {
    try {
      // Try to load from database first
      const result = await queryEdcatAI(
        `SELECT content FROM edcat.ai_prompt 
         WHERE tenant_id = $1 AND persona_code = 'vera' AND kind = 'system' AND name = 'system.follow.rules'
         ORDER BY created_at DESC LIMIT 1`,
        [tenantId]
      );

      if (result.rows.length > 0) {
        return result.rows[0].content;
      }
    } catch (error) {
      console.warn('[VeraChatEngine] Could not load system prompt from DB:', error);
    }

    // Fallback to default
    return this.systemPrompt;
  }

  /**
   * Load conversation history
   */
  private async loadConversationHistory(
    conversationId: string | undefined,
    tenantId: string
  ): Promise<any[]> {
    if (!conversationId) {
      return [];
    }

    try {
      const { ConversationRepository: Repo } = await loadVeraRepository();
      const history = await Repo.getConversationHistory(conversationId, tenantId, 10);
      return history.map((h: any) => ({
        role: h.role || h.message_role,
        content: h.message_content || h.content
      }));
    } catch (error) {
      console.warn('[VeraChatEngine] Could not load conversation history:', error);
      return [];
    }
  }

  /**
   * Route to appropriate tools based on intent
   */
  private async routeToTools(
    intent: Intent,
    message: string,
    context: ChatContext,
    extractedData?: any
  ): Promise<{ usedTools: string[]; results: any[] }> {
    const usedTools: string[] = [];
    const results: any[] = [];

    try {
      // Clause lookup - fetch requirement from database
      if (intent === 'clause_lookup' && extractedData?.clauseNumber) {
        const clauseResult = await this.lookupClause(
          extractedData.standardCode,
          extractedData.clauseNumber,
          context
        );
        if (clauseResult) {
          usedTools.push('clause_lookup');
          results.push(clauseResult);
        }
      }

      // Analysis requests
      if (intent === 'analysis') {
        if (context.standards && context.standards.length > 0) {
          const standardId = context.standards[0].id;
          const gapResult = await routeToGapAnalysis(standardId, [], { customerId: context.customerId });
          if (gapResult.success) {
            usedTools.push('gap_analysis');
            results.push(gapResult);
          }
        }
      }

      // Regulatory lookup
      if (message.match(/faa|easa|casa|fda|part\s+\d+/i)) {
        const regMatch = message.match(/(faa|easa|casa|fda|part\s+\d+)/i);
        if (regMatch) {
          const regResult = await routeToRegulatoryLookup(regMatch[1]);
          if (regResult.success) {
            usedTools.push('regulatory_lookup');
            results.push(regResult);
          }
        }
      }
    } catch (error) {
      console.error('[VeraChatEngine] Error routing to tools:', error);
    }

    return { usedTools, results };
  }

  /**
   * Lookup clause from database
   */
  private async lookupClause(
    standardCode: string | undefined,
    clauseNumber: string,
    context: ChatContext
  ): Promise<any | null> {
    try {
      // Try to find standard if code not provided
      let standardId: string | undefined;
      if (!standardCode && context.standards && context.standards.length > 0) {
        standardId = context.standards[0].id;
      } else if (standardCode) {
        const standardResult = await queryPostgres(
          `SELECT id FROM public.standards WHERE code ILIKE $1 LIMIT 1`,
          [`%${standardCode}%`]
        );
        if (standardResult.rows.length > 0) {
          standardId = standardResult.rows[0].id;
        }
      }

      if (!standardId) {
        return null;
      }

      // Fetch requirement
      const reqResult = await queryPostgres(
        `SELECT 
          clause_number,
          clause_title,
          requirement_text,
          paragraph,
          subclause_name
        FROM public.parsed_requirements
        WHERE standard_id = $1 
          AND (clause_number = $2 OR clause_number LIKE $3)
          AND is_in_scope = true
        ORDER BY clause_number
        LIMIT 10`,
        [standardId, clauseNumber, `${clauseNumber}.%`]
      );

      if (reqResult.rows.length > 0) {
        return {
          type: 'clause_lookup',
          standardId,
          clauseNumber,
          requirements: reqResult.rows
        };
      }

      return null;
    } catch (error) {
      console.error('[VeraChatEngine] Error looking up clause:', error);
      return null;
    }
  }


  /**
   * Format tool results for response generation
   */
  private formatToolResults(results: any[]): string {
    return results.map((result, idx) => {
      if (result.type === 'clause_lookup' && result.requirements) {
        return `Clause ${result.clauseNumber} Requirements:\n${result.requirements.map((r: any) => 
          `- ${r.clause_number}: ${r.requirement_text.substring(0, 200)}...`
        ).join('\n')}`;
      }
      if (result.reasoning) {
        return result.reasoning;
      }
      return JSON.stringify(result);
    }).join('\n\n');
  }


  /**
   * Generate response using provider-agnostic VeraEngine
   * Uses runVera() which calls VERA_MODEL_ENDPOINT or falls back to internal intelligence
   */
  private async generateResponseWithVeraEngine(
    message: string,
    intent: Intent,
    systemPrompt: string,
    conversationHistory: any[],
    semanticContext: any,
    toolResults: any,
    context: any,
    persona: any,
    userId: string,
    tenantId: string,
    conversationId: string | undefined
  ): Promise<string> {
    try {
      // Build message array for runVera
      const messages: VeraMessage[] = [];
      
      // Add system prompt
      messages.push({
        role: 'system',
        content: systemPrompt
      });
      
      // Add conversation history
      for (const hist of conversationHistory) {
        if (hist.role && hist.content) {
          messages.push({
            role: hist.role === 'assistant' ? 'assistant' : 'user',
            content: hist.content
          });
        }
      }
      
      // Add semantic context and tool results as context
      const contextInfo: string[] = [];
      if (semanticContext?.requirements?.length > 0) {
        contextInfo.push(`Relevant requirements found: ${semanticContext.requirements.length}`);
      }
      if (toolResults?.results?.length > 0) {
        contextInfo.push(`Tool results available: ${toolResults.results.length}`);
      }
      
      if (contextInfo.length > 0) {
        messages.push({
          role: 'system',
          content: `Context: ${contextInfo.join('; ')}`
        });
      }
      
      // Add current user message
      messages.push({
        role: 'user',
        content: message
      });
      
      // Build VeraContext
      const veraContext: VeraContext = {
        userId,
        tenantId,
        conversationId,
        intent,
        semanticContext,
        toolResults
      };
      
      // Call provider-agnostic runVera
      const result = await runVera(messages, veraContext);
      
      // Apply Vera's professional formatting
      return composeFinalResponse(result.answer, {
        removeCapabilityLists: false,
        ensureDirectAnswer: true,
        addFollowUp: true
      });
    } catch (error: any) {
      console.warn('[VeraChatEngine] runVera error, using fallback:', error.message);
      
      // Fallback: Use VeraConversationalEngine if available
      if (this.conversationalEngine) {
        try {
          const veraIntent = this.mapIntentToVeraFormat(intent);
          const response = await this.conversationalEngine.generateResponse({
            message,
            intent: veraIntent,
            context: {
              documents: context.documents || [],
              standards: context.standards || [],
              regulatoryWebsites: context.regulatoryWebsites || [],
              customerRequirements: context.customerRequirements || []
            },
            conversationContext: {
              conversation_id: context.conversationId,
              history: conversationHistory
            },
            persona: persona || {},
            userId: context.userId || 'system',
            tenantId: context.tenantId || DEFAULT_TENANT_ID,
            sessionId: context.sessionId
          });
          
          if (response && response.trim().length > 0) {
            return composeFinalResponse(response, {
              removeCapabilityLists: false,
              ensureDirectAnswer: true,
              addFollowUp: true
            });
          }
        } catch (engineError) {
          console.warn('[VeraChatEngine] VeraConversationalEngine fallback also failed:', engineError);
        }
      }
      
      // Final fallback: Simple response
      const lowerMessage = message.toLowerCase();
      if (intent === 'greeting' || lowerMessage.includes('how are you')) {
        const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';
        return `Good ${timeOfDay}. I'm operating within normal parameters and ready to assist with compliance matters. How can I help you today?`;
      } else if (intent === 'meta' || lowerMessage.includes('what can you do')) {
        return `I'm Vera, your compliance intelligence assistant. I can help you with compliance analysis, gap identification, regulatory research, and answering questions about standards and requirements. What would you like to work on?`;
      } else {
        return `I understand you're asking about "${message}". I'm ready to help with compliance-related questions. Could you provide more context about what specific aspect you'd like me to focus on?`;
      }
    }
  }

  /**
   * Map VeraChatEngine intent to VeraConversationalEngine intent format
   */
  private mapIntentToVeraFormat(intent: Intent): string {
    const intentMap: Record<Intent, string> = {
      'greeting': 'greeting',
      'question': 'compliance_question',
      'clause_lookup': 'compliance_question',
      'analysis': 'gap_analysis_request',
      'meta': 'capability_query',
      'upload_related': 'procedure_request',
      'clarification': 'compliance_question',
      'unknown': 'compliance_question'
    };
    return intentMap[intent] || 'compliance_question';
  }

  /**
   * Format tool result as a natural response
   */
  private formatToolResultAsResponse(toolResult: any, intent: Intent): string {
    if (intent === 'analysis') {
      return `Based on my analysis, I found ${toolResult.data?.gaps?.length || 0} compliance gaps. ` +
        `Would you like me to provide detailed information about these gaps?`;
    } else if (intent === 'question' || intent === 'clause_lookup') {
      return `Here's what I found: ${JSON.stringify(toolResult.data, null, 2)}`;
    }
    return `I've completed the analysis. ${toolResult.summary || 'The results are ready for review.'}`;
  }

  /**
   * Build response from semantic context
   */
  private buildResponseFromSemanticContext(
    message: string,
    intent: Intent,
    semanticContext: any,
    context: any
  ): string {
    const requirements = semanticContext.requirements || [];
    const procedures = semanticContext.procedures || [];
    
    if (requirements.length > 0) {
      const req = requirements[0];
      return `Based on the requirements I found, ${req.requirement_text || req.text || 'this requirement applies to your situation'}. ` +
        `Would you like me to provide more details about how this relates to your compliance needs?`;
    } else if (procedures.length > 0) {
      const proc = procedures[0];
      return `I found relevant procedures in your system. ${proc.description || 'This procedure may be relevant to your question'}. ` +
        `Would you like me to analyze how this relates to your requirements?`;
    }
    
    return `I've reviewed the relevant information. How would you like me to proceed?`;
  }

  /**
   * Build generic intelligent response using Vera's reasoning
   */
  private buildGenericIntelligentResponse(
    message: string,
    intent: Intent,
    context: any,
    persona: any
  ): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('intelligence') || lowerMessage.includes('how are you')) {
      return `My intelligence systems are operating normally. I'm ready to assist with compliance analysis, ` +
        `gap identification, regulatory research, and answering questions about standards and requirements. ` +
        `What would you like to work on?`;
    } else if (lowerMessage.includes('help') || lowerMessage.includes('what can')) {
      return `I can help you with compliance analysis, gap identification, regulatory research, ` +
        `standard comparisons, and answering questions about requirements. What specific area would you like assistance with?`;
    } else {
      return `I understand you're asking about "${message}". Let me help you with that. ` +
        `Could you provide a bit more context about what specific aspect you'd like me to focus on?`;
    }
  }

  /**
   * Save conversation to database
   */
  private async saveConversation(
    conversationId: string | undefined,
    userId: string,
    tenantId: string,
    userMessage: string,
    veraResponse: string,
    intent: Intent,
    previousHistory: any[]
  ): Promise<void> {
    const { ConversationRepository: Repo } = await loadVeraRepository();
    
    if (!conversationId) {
      // Create new conversation
      try {
        const session = await Repo.getOrCreateSession(userId, tenantId);
        conversationId = session.conversation_id;
      } catch (error) {
        console.error('[VeraChatEngine] Could not create conversation session:', error);
        return;
      }
    }

    try {
      // Save user message
      await Repo.saveConversationTurn(
        conversationId,
        'user',
        userMessage,
        { intent }
      );

      // Save Vera response
      await Repo.saveConversationTurn(
        conversationId,
        'assistant',
        veraResponse,
        { intent, model: 'vera-intelligence' }
      );
    } catch (error) {
      console.error('[VeraChatEngine] Could not save conversation:', error);
    }
  }
}

// Export singleton instance
let engineInstance: VeraChatEngine | null = null;

export function getVeraChatEngine(): VeraChatEngine {
  if (!engineInstance) {
    engineInstance = new VeraChatEngine();
  }
  return engineInstance;
}

export default VeraChatEngine;

