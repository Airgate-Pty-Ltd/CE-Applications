/**
 * Chat/Analysis Routes
 * Handle chat messages and document analysis requests
 * CLEAN, TESTED VERSION - NO SYNTAX ERRORS
 */

import express from 'express';
import { queryPostgres, queryEdcatAI } from '../config/databases.js';
import { formatRequirementsList, formatRequirementsAsText } from '../services/requirementsFormatter.js';
import fetch from 'node-fetch';
import ClauseCorrelationEngine from '../services/clauseCorrelationEngine.js';
import edcatPersonality from '../services/edcatPersonality.js';
import { v4 as uuidv4 } from 'uuid';
import { veraMiddleware } from '../middleware/veraMiddleware.js';
import { createVeraConversationMiddleware, updateConversationState } from '../middleware/veraConversationMiddleware.js';
import { getVeraConversationalEngine } from '../services/veraConversationalEngine.js';
import VeraConversationContextService from '../services/VeraConversationContextService.js';
import VeraSelfAwarenessService from '../services/VeraSelfAwarenessService.js';
import { classifyIntent } from '../vera/intentClassifier.js';

/**
 * Detect intent from message for better routing
 */
function detectIntentFromMessage(message) {
  const lower = (message || '').toLowerCase().trim();
  
  // Definition questions
  if (/^(what\s+is|define|explain|tell\s+me.*about|who\s+is|when\s+is|where\s+is|how\s+.*works?)/i.test(lower)) {
    return 'definition_question';
  }
  
  // Comparison questions
  if (/(compare|difference|vs|versus|between)/i.test(lower)) {
    return 'comparison_question';
  }
  
  // How-to questions
  if (/^(how\s+to|how\s+do|how\s+can|procedure|process|steps?)/i.test(lower)) {
    return 'how_to_question';
  }
  
  // Compliance/requirement questions
  if (/(require|compliance|must|shall|standard|audit)/i.test(lower)) {
    return 'compliance_question';
  }
  
  // Default to general question
  return 'general_question';
}
import { VERA_DEBUG_PIN, VERA_DEBUG_EXIT_PIN } from '../config/veraConfig.js';
import VeraDebugService from '../services/vera/VeraDebugService.js';
import { generateVeraResponse } from '../services/vera/VeraCoreEngine.js';
import VeraResponseLearningService from '../services/vera/VeraResponseLearningService.js';
import VeraConversationMemoryService from '../services/vera/VeraConversationMemoryService.js';
import VeraKnowledgeGraphService from '../services/vera/VeraKnowledgeGraphService.js';
import VeraKnowledgeSynthesisEngine from '../services/vera/VeraKnowledgeSynthesisEngine.js';
import { callVeraWithRAG, detectWebSearchNeeded } from '../services/vera/VeraRAGService.js';

const router = express.Router();
const correlationEngine = new ClauseCorrelationEngine();
const personality = edcatPersonality;

// Helper to make internal API calls
async function callParseAPI(standardId) {
  try {
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:5000';
    const response = await fetch(`${baseUrl}/api/parse/standard/${standardId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  } catch (err) {
    console.error('Error calling parse API:', err);
    return { success: false, error: err.message };
  }
}

/**
 * POST /api/chat/analyze
 * Analyze documents and respond to chat queries
 * CLEAN VERSION - Simplified and tested
 */
const veraConversation = createVeraConversationMiddleware();
router.post('/analyze', veraConversation, veraMiddleware({ retrievalAdapter: null, validators: null }), async (req, res) => {
  try {
    const { message, documentIds, standardIds, customerId } = req.body;
    const customerIdFromHeader = req.headers['x-customer-id'];
    const activeCustomerId = customerId || customerIdFromHeader;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // ============================================================
    // STEP 0: Check for debug PIN commands (BEFORE any other processing)
    // ============================================================
    const trimmed = (message || '').trim();
    const conv = req._vera_conversation;
    const effectiveSessionId = conv?.session_id || req.body.sessionId || uuidv4();
    const effectiveTenantId = conv?.tenant_id || req.body.tenantId || activeCustomerId || '00000000-0000-0000-0000-000000000000';
    const effectiveUserId = req.user?.id || req.veraContext?.userProfile?.id || 'system';

    // 1) Check PIN to ENTER debug mode
    if (trimmed === VERA_DEBUG_PIN) {
      await VeraDebugService.enterDebugMode({ tenantId: effectiveTenantId, userId: effectiveUserId });
      const response = 'Debug mode enabled. I will now provide internal diagnostics and technical detail when you ask. For example, you can say "debug: database connections" or "debug: analyze this error <paste log>".';
      
      await saveToHistory(effectiveSessionId, effectiveTenantId, message, response, 'debug_mode_enabled', effectiveUserId);
      
      return res.json({
        success: true,
        response,
        mode: 'debug',
        intent: 'debug_mode_enabled'
      });
    }

    // 2) Check PIN to EXIT debug mode
    if (trimmed === VERA_DEBUG_EXIT_PIN) {
      await VeraDebugService.exitDebugMode({ tenantId: effectiveTenantId, userId: effectiveUserId });
      const response = 'Debug mode disabled. I am back in normal operation.';
      
      await saveToHistory(effectiveSessionId, effectiveTenantId, message, response, 'debug_mode_disabled', effectiveUserId);
      
      return res.json({
        success: true,
        response,
        mode: 'debug',
        intent: 'debug_mode_disabled'
      });
    }

    // 3) Check for debug: commands
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('debug:')) {
      const isDebug = await VeraDebugService.isDebugMode({ tenantId: effectiveTenantId, userId: effectiveUserId });
      
      if (!isDebug) {
        const response = 'Debug commands are only available when debug mode is enabled. Send the debug PIN first.';
        
        await saveToHistory(effectiveSessionId, effectiveTenantId, message, response, 'debug_command_denied', effectiveUserId);
        
        return res.json({
          success: true,
          response,
          mode: 'debug',
          intent: 'debug_command_denied'
        });
      }
      
      // Extract command after "debug:"
      const command = trimmed.substring(6).trim(); // Remove "debug:" prefix
      const response = await VeraDebugService.handleDebugCommand({
        command,
        tenantId: effectiveTenantId,
        userId: effectiveUserId
      });
      
      await saveToHistory(effectiveSessionId, effectiveTenantId, message, response, 'debug_command', effectiveUserId);
      
      return res.json({
        success: true,
        response,
        mode: 'debug',
        intent: 'debug_command'
      });
    }

    // ============================================================
    // STEP 1: Load conversation context FIRST (before anything else)
    // ============================================================
    // Note: effectiveSessionId and effectiveTenantId are already set above in debug PIN check
    
    console.log(`[Chat] Loading conversation context for session ${effectiveSessionId}`);
    const conversationContext = await VeraConversationContextService.getConversationContext(
      effectiveSessionId,
      effectiveTenantId
    );

    console.log(`[Chat] Context: vera_introduced=${conversationContext.vera_introduced}, message_count=${conversationContext.message_count}`);

    // ============================================================
    // STEP 1.5: Check for file uploads and attach to context
    // ============================================================
    const uploadInfo = req._vera_upload || {
      documentIds: req.body.documentIds || [],
      files: req.body.files || [],
      hasUpload: !!(req.body.documentIds?.length || req.body.files?.length || req.files?.length)
    };
    
    // ============================================================
    // STEP 2: Check if this is a META QUESTION about Vera herself
    // ============================================================
    const isMeta = VeraConversationContextService.isMetaQuestion(message);
    console.log(`[Chat] Is meta-question: ${isMeta}`);

    if (isMeta) {
      let response = await handleMetaQuestionDirectly(message);
      const metaIntent = 'meta_question_about_vera';
      
      // Apply loop avoidance
      const VeraLoopAvoidanceService = (await import('../services/vera/VeraLoopAvoidanceService.js')).default;
      response = await VeraLoopAvoidanceService.applyLoopAvoidance({
        tenantId: effectiveTenantId,
        sessionId: effectiveSessionId,
        userMessage: message,
        proposedResponse: response
      });
      
      // Save and return
      await saveToHistory(effectiveSessionId, effectiveTenantId, message, response, metaIntent, req.veraContext?.userProfile?.id || null);
      await VeraConversationContextService.updateConversationState(effectiveSessionId, effectiveTenantId, {
        vera_introduced: true,
        message_count: conversationContext.message_count + 1,
        last_intent: 'meta_question_about_vera',
        last_topic: 'vera_self_discussion',
        context: conversationContext.context
      });
      
      return res.json({ 
        success: true, 
        response, 
        mode: 'meta_question',
        intent: 'meta_question_about_vera'
      });
    }

    // ============================================================
    // STEP 3: Check if we should skip capability dump
    // ============================================================
    const shouldSkipDump = conversationContext.vera_introduced && 
                           /clause|requirement|gap|procedure|standard|FAA|ISO|EASA|CASA|FDA|EU-MDR/i.test(message);

    console.log(`[Chat] Should skip dump: ${shouldSkipDump}`);

    // ============================================================
    // STEP 4: Classify intent (NOW we can do this after context checks)
    // ============================================================
    console.log(`[Chat] Classifying intent for: ${message.substring(0, 50)}...`);
    const intentResult = await classifyIntent(message);
    const detectedIntent = intentResult?.intent || 'general_query';
    console.log(`[Vera-CHAT] Incoming message: ${message}`);
    console.log(`[Vera-CHAT] Detected intent: ${detectedIntent} (confidence: ${intentResult?.confidence || 'N/A'})`);
    console.log(`[Vera-CHAT] Intent result:`, JSON.stringify(intentResult, null, 2));

    // ============================================================
    // STEP 5: Route to appropriate handler based on intent and context
    // ============================================================
    // Handle self-awareness intents directly
    if (['vera_self_improvement', 'vera_knowledge_discussion', 'vera_self_introduction'].includes(detectedIntent)) {
      let response = await handleMetaQuestionDirectly(message);
      
      // Apply loop avoidance
      const VeraLoopAvoidanceService = (await import('../services/vera/VeraLoopAvoidanceService.js')).default;
      response = await VeraLoopAvoidanceService.applyLoopAvoidance({
        tenantId: effectiveTenantId,
        sessionId: effectiveSessionId,
        userMessage: message,
        proposedResponse: response
      });
      
      await saveToHistory(effectiveSessionId, effectiveTenantId, message, response, detectedIntent, req.veraContext?.userProfile?.id || null);
      await VeraConversationContextService.updateConversationState(effectiveSessionId, effectiveTenantId, {
        vera_introduced: true,
        message_count: conversationContext.message_count + 1,
        last_intent: detectedIntent,
        last_topic: 'vera_self_discussion',
        context: conversationContext.context
      });
      
      return res.json({ 
        success: true, 
        response, 
        mode: 'meta_question',
        intent: detectedIntent
      });
    }

    // Skip capability dump if Vera already introduced and user is asking something specific
    if (shouldSkipDump && detectedIntent === 'general_query') {
      let response = await handleSpecificQuestion(message, conversationContext, effectiveTenantId);
      
      // Apply loop avoidance
      const VeraLoopAvoidanceService = (await import('../services/vera/VeraLoopAvoidanceService.js')).default;
      response = await VeraLoopAvoidanceService.applyLoopAvoidance({
        tenantId: effectiveTenantId,
        sessionId: effectiveSessionId,
        userMessage: message,
        proposedResponse: response
      });
      
      await saveToHistory(effectiveSessionId, effectiveTenantId, message, response, detectedIntent, req.veraContext?.userProfile?.id || null);
      await VeraConversationContextService.updateConversationState(effectiveSessionId, effectiveTenantId, {
        vera_introduced: conversationContext.vera_introduced,
        message_count: conversationContext.message_count + 1,
        last_intent: detectedIntent,
        last_topic: 'specific_question',
        context: conversationContext.context
      });
      
      return res.json({
        success: true,
        response,
        mode: 'conversational',
        intent: detectedIntent
      });
    }

    // If Vera already introduced and user asks for intro again, skip it
    if (conversationContext.vera_introduced && detectedIntent === 'self_introduction') {
      const response = "What can I help you with?";
      
      await saveToHistory(effectiveSessionId, effectiveTenantId, message, response, detectedIntent, req.veraContext?.userProfile?.id || null);
      
      return res.json({
        success: true,
        response,
        mode: 'conversational',
        intent: 'self_introduction_skipped'
      });
    }

    // Continue with existing logic for other intents...
    // (Keeping the rest of the original chat.js logic for backward compatibility)
    // This section handles the full chat flow with documents, standards, etc.
    
    let documents = [];
    let standards = [];
    let regulatoryWebsites = [];
    let customerRequirements = [];

    // Fetch documents if customer ID provided
    if (activeCustomerId) {
      try {
        const customerResult = await queryPostgres(
          `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,
          [activeCustomerId]
        );
        
        if (customerResult.rows.length > 0) {
          const schemaName = customerResult.rows[0].schema_name;
          const docsResult = await queryPostgres(
            `SELECT DISTINCT ON (file_name) document_id, file_name, file_type, file_path, uploaded_at
             FROM ${schemaName}.documents
             WHERE file_path LIKE '%/documents/%'
             ORDER BY file_name, uploaded_at DESC
             LIMIT 50`,
            []
          );
          documents = docsResult.rows || [];
          console.log(`[chat] ✓ Found ${documents.length} documents for customer ${activeCustomerId}`);
        }
      } catch (dbError) {
        console.error('[chat] ❌ Could not fetch documents:', dbError.message);
        console.error('[chat]    Customer ID:', activeCustomerId);
      }
    } else {
      console.log('[chat] ⚠️  No customer ID provided, skipping document fetch');
    }

    // Get uploaded standards (use EDCAT AI DB: standards table)
    try {
      // FIX: Remove s.revision if column doesn't exist, check for status column
      const standardsResult = await queryPostgres(
        `SELECT DISTINCT ON (LOWER(TRIM(s.code)))
          s.id as standard_id,
          s.code,
          s.name,
          s.uploaded_at,
          s.total_requirements as requirements_count
         FROM standards s
         WHERE s.is_active = TRUE OR s.is_active IS NULL
         ORDER BY LOWER(TRIM(s.code)), s.uploaded_at DESC
         LIMIT 100`,
        []
      );
      standards = standardsResult.rows || [];
      console.log(`✓ Found ${standards.length} unique standards:`, standards.map(s => s.code).join(', '));
    } catch (dbError) {
      console.error('[chat] ❌ Could not fetch standards:', dbError.message);
    }

    // Get customer requirements if customer ID provided
    if (activeCustomerId) {
      try {
        const reqResult = await queryPostgres(
          `SELECT requirement_id, requirement_text, source_document, clause_ref
           FROM customer_requirements
           WHERE customer_id = $1
           LIMIT 100`,
          [activeCustomerId]
        );
        customerRequirements = reqResult.rows || [];
        console.log(`✓ Found ${customerRequirements.length} customer requirements`);
      } catch (dbError) {
        console.error('[chat] ❌ Could not fetch customer requirements:', dbError.message);
      }
    }

    // Use conversational engine for response generation
    const conversationalEngine = getVeraConversationalEngine();
    let response = null;

    console.log(`[Vera-CHAT] Using handler: conversationalEngine.generateResponse()`);
    console.log(`[Vera-CHAT] Intent passed to engine: ${detectedIntent}`);

    // Check if there's a canned response from middleware
    // BUT: Skip canned greeting if this is a technical question
    const { classifyIntent: classifyIntentWithDomain, looksLikeTechnicalQuestion } = await import('../services/vera/VeraIntentService.js');
    const isTechnical = looksLikeTechnicalQuestion(message);
    const intentInfo = classifyIntentWithDomain(message);
    
    if (conv && conv.canned && !isTechnical && intentInfo.highLevelIntent !== 'technical_question') {
      console.log(`[Vera-CHAT] Using canned response from middleware (not technical)`);
      response = conv.canned;
      
        if (conv) {
          await updateConversationState(
            conv.tenant_id,
            conv.session_id,
            'greeting',
            conv.previous?.context || {},
            message
          );
        }
        
        return res.json({
          success: true,
        response,
        mode: 'canned',
        intent: conv.intent || 'greeting'
      });
    } else if (conv && conv.canned && (isTechnical || intentInfo.highLevelIntent === 'technical_question')) {
      console.log(`[Vera-CHAT] Ignoring canned greeting - technical question detected: ${intentInfo.highLevelIntent}/${intentInfo.domain}`);
      // Fall through to orchestrator
    }

    // Get user profile from middleware context
    const userProfile = req.veraContext?.userProfile || req._vera_conversation?.userProfile || null;

    // CRITICAL: Route ALL questions through VeraCoreEngine (self-contained, no external LLM)
    // This replaces the old VeraReasoningEngine and conversationalEngine which had Six Sigma routing issues
    console.log(`[Vera-CHAT] Routing to VeraCoreEngine for all questions`);
    
    try {
      const isDebug = await VeraDebugService.isDebugMode({ tenantId: effectiveTenantId, userId: effectiveUserId });
      
      // STEP 1: Build conversation context for pronoun resolution
      const conversationContext = await VeraConversationMemoryService.buildConversationContext(
        effectiveSessionId,
        effectiveTenantId,
        5
      );
      
      // STEP 2: Resolve pronouns in user message
      let resolvedMessage = message;
      if (!conversationContext.isEmpty) {
        resolvedMessage = VeraConversationMemoryService.resolvePronounsInMessage(message, conversationContext);
        if (resolvedMessage !== message) {
          console.log(`[Vera-CHAT] Resolved pronouns: "${message}" → "${resolvedMessage}"`);
          message = resolvedMessage; // Use resolved message for processing
        }
      }
      
      // STEP 3: Try Mistral FIRST (before RAG) if enabled and available
      let veraResponse = null;
      const MISTRAL_ENABLED = process.env.MISTRAL_ENABLED_IN_CHAT === 'true' || 
                              process.env.ENABLE_MISTRAL === 'true';
      
      if (MISTRAL_ENABLED) {
        try {
          const { getVeraMistralService, isMistralAvailable, setMistralAvailable } = await import('../services/vera-mistral-service.js');
          const mistralService = getVeraMistralService();
          const mistralAvailable = isMistralAvailable();
          
          console.log(`[Vera-CHAT] Mistral enabled: ${MISTRAL_ENABLED}, available: ${mistralAvailable}`);
          
          if (mistralAvailable) {
            console.log('[Vera-CHAT] Attempting Mistral generation (FIRST PRIORITY)...');
            
            // Build enhanced system prompt with RAG context
            let systemPrompt = `You are VERA, a compliance expert AI assistant. You help organizations understand and meet regulatory requirements, standards, and best practices.

Your role:
- Explain compliance requirements clearly and simply
- Help identify gaps between requirements and current procedures
- Suggest improvements to meet standards
- Answer questions about ISO 9001, AS9100, ISO 13485, FAA regulations, and other compliance frameworks

Guidelines:
- Be professional, clear, and concise
- Use examples when helpful
- Focus on actionable advice
- If you don't know something, say so honestly
- Base your answers on compliance standards and best practices
- Reference specific standards, clauses, or requirements when relevant

Context:
- User ID: ${effectiveUserId}
- Session ID: ${effectiveSessionId}
- Tenant ID: ${effectiveTenantId}`;
            
            // Enrich with RAG context (non-blocking)
            try {
              const { queryPostgres, queryEdcatAI } = await import('../config/databases.js');
              
              // Extract standard codes from message
              const standardPatterns = [
                /(AS9100[A-Z]?|AS9110[A-Z]?|AS9120[A-Z]?)/i,
                /(ISO\s*9001|ISO\s*13485|ISO\s*14971)/i,
                /(IATF\s*16949)/i,
                /(FAA\s*PART\s*[0-9]+|14\s*CFR\s*[0-9]+)/i,
                /(EASA|CASA|UK\s*CAA)/i
              ];
              
              let detectedStandardCodes = [];
              for (const pattern of standardPatterns) {
                const match = message.match(pattern);
                if (match) {
                  detectedStandardCodes.push(match[1].toUpperCase().replace(/\s+/g, '_'));
                }
              }
              
              // Get relevant standards
              const standardsResult = await queryPostgres(
                `SELECT code, name, sector FROM public.standards 
                 WHERE is_active = true 
                 ${detectedStandardCodes.length > 0 ? `AND (${detectedStandardCodes.map((_, i) => `code ILIKE $${i + 1}`).join(' OR ')})` : ''}
                 ORDER BY uploaded_at DESC 
                 LIMIT 10`,
                detectedStandardCodes.length > 0 ? detectedStandardCodes.map(c => `%${c}%`) : []
              ).catch(() => ({ rows: [] }));
              
              if (standardsResult.rows.length > 0) {
                const standardsList = standardsResult.rows.map(s => `${s.code} (${s.sector})`).join(', ');
                systemPrompt += `\n\nAvailable Standards: ${standardsList}`;
              }
              
              // Get conversation history
              const historyResult = await queryEdcatAI(
                `SELECT role, message FROM edcat.ai_conversation_history 
                 WHERE session_id = $1 AND tenant_id = $2 
                 ORDER BY created_at DESC 
                 LIMIT 10`,
                [effectiveSessionId, effectiveTenantId]
              ).catch(() => ({ rows: [] }));
              
              if (historyResult.rows.length > 0) {
                const recentMessages = historyResult.rows.reverse()
                  .slice(-5)
                  .map(row => `${row.role}: ${(row.message || '').substring(0, 150)}`)
                  .join('\n');
                systemPrompt += `\n\nRecent conversation context:\n${recentMessages}`;
              }
            } catch (ragError) {
              // Non-fatal
              console.debug('[Vera-CHAT] Could not enrich system prompt with RAG', { error: ragError.message });
            }
            
            // Generate with timeout protection
            const mistralPromise = mistralService.generateResponse(
              message.trim(),
              systemPrompt,
              { temperature: 0.7, maxTokens: 2000 }
            );
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Mistral timeout')), 30000)
            );
            
            const mistralResult = await Promise.race([mistralPromise, timeoutPromise]);
            
            veraResponse = {
              answer: mistralResult.text,
              message: mistralResult.text,
              source: 'mistral',
              mode: 'chat',
              confidence: 0.8,
              metadata: {
                source: 'mistral',
                model: mistralResult.model,
                tokensUsed: mistralResult.tokensUsed,
                cached: mistralResult.cached || false,
                engine: 'mistral'
              }
            };
            
            console.log('[Vera-CHAT] ✅ Mistral response generated');
          } else {
            console.log('[Vera-CHAT] Mistral is enabled but not available (will try RAG or fallback)');
          }
        } catch (mistralError) {
          // Determine error type
          const errorMessage = mistralError.message || String(mistralError);
          let errorType = 'unknown';
          if (errorMessage.includes('timeout')) errorType = 'timeout';
          else if (errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) errorType = 'network';
          
          console.warn('[Vera-CHAT] Mistral failed, will try RAG or fallback:', {
            error: errorMessage,
            errorType
          });
          
          // Mark as unavailable
          const { setMistralAvailable } = await import('../services/vera-mistral-service.js');
          setMistralAvailable(false, `${errorType}: ${errorMessage}`);
          
          // Fall through to RAG or VeraCoreEngine
        }
      } else {
        console.log('[Vera-CHAT] Mistral not enabled (ENABLE_MISTRAL or MISTRAL_ENABLED_IN_CHAT not set to true)');
      }

      // STEP 3.5: Try RAG with web search if Mistral didn't provide a response
      if (!veraResponse) {
        const webSearchDetection = detectWebSearchNeeded(message);
        
        if (webSearchDetection.needsWebSearch) {
          console.log(`[Vera-CHAT] Web search detected: ${webSearchDetection.searchType} for query: ${message.substring(0, 50)}...`);
          
          try {
            // Use RAG service with web search integration
            const conversationId = conv?.conversation_id || effectiveSessionId;
            
            const ragOptions = {
              userId: effectiveUserId,
              conversationId: conversationId,
              responseType: 'general_qa',
              useStreaming: false,
              tenantId: effectiveTenantId,
              ...webSearchDetection.options,
              location: req.body.location || req.query.location || webSearchDetection.options.location,
              start_location: req.body.start_location || req.query.start_location || webSearchDetection.options.start_location,
              end_location: req.body.end_location || req.query.end_location || webSearchDetection.options.end_location,
              symbol: req.body.symbol || req.query.symbol || webSearchDetection.options.symbol,
              from: req.body.from || req.query.from || webSearchDetection.options.from,
              to: req.body.to || req.query.to || webSearchDetection.options.to
            };

            const ragResponse = await callVeraWithRAG(message, null, ragOptions);
            
            veraResponse = {
              answer: ragResponse.answer,
              message: ragResponse.answer,
              source: 'rag_with_web_search',
              mode: 'rag_web_search',
              confidence: 0.85,
              metadata: {
                source: 'rag_with_web_search',
                confidence: 0.85,
                webSearchUsed: ragResponse.retrievedKnowledge.webSearchUsed,
                webSearchType: ragResponse.retrievedKnowledge.webSearchType,
                domainsFound: ragResponse.retrievedKnowledge.domainsFound,
                corpusUsed: ragResponse.retrievedKnowledge.corpusUsed,
                metrics: ragResponse.metrics
              }
            };

            console.log(`[Vera-CHAT] ✅ RAG with web search response generated (type: ${webSearchDetection.searchType})`);
          } catch (ragError) {
            console.warn('[Vera-CHAT] RAG with web search failed, falling back to VeraCoreEngine:', ragError.message);
            // Fall through to VeraCoreEngine
          }
        }
      }

      // STEP 3.6: Use VeraCoreEngine if neither Mistral nor RAG provided a response
      if (!veraResponse) {
        // Check if Mistral is enabled and available
        const MISTRAL_ENABLED = process.env.MISTRAL_ENABLED_IN_CHAT === 'true' || 
                                process.env.ENABLE_MISTRAL === 'true';
        
        if (MISTRAL_ENABLED) {
          try {
            const { getVeraMistralService, isMistralAvailable, setMistralAvailable } = await import('../services/vera-mistral-service.js');
            const mistralService = getVeraMistralService();
            
            if (isMistralAvailable()) {
              console.log('[Vera-CHAT] Attempting Mistral generation...');
              
              // Build enhanced system prompt with RAG context (same as veraChatRoute)
              let systemPrompt = `You are VERA, a compliance expert AI assistant. You help organizations understand and meet regulatory requirements, standards, and best practices.

Your role:
- Explain compliance requirements clearly and simply
- Help identify gaps between requirements and current procedures
- Suggest improvements to meet standards
- Answer questions about ISO 9001, AS9100, ISO 13485, FAA regulations, and other compliance frameworks

Guidelines:
- Be professional, clear, and concise
- Use examples when helpful
- Focus on actionable advice
- If you don't know something, say so honestly
- Base your answers on compliance standards and best practices
- Reference specific standards, clauses, or requirements when relevant

Context:
- User ID: ${effectiveUserId}
- Session ID: ${effectiveSessionId}
- Tenant ID: ${effectiveTenantId}`;
              
              // Enrich with RAG context (non-blocking)
              try {
                const { queryPostgres, queryEdcatAI } = await import('../config/databases.js');
                const messageUpper = message.toUpperCase();
                
                // Extract standard codes from message
                const standardPatterns = [
                  /(AS9100[A-Z]?|AS9110[A-Z]?|AS9120[A-Z]?)/i,
                  /(ISO\s*9001|ISO\s*13485|ISO\s*14971)/i,
                  /(IATF\s*16949)/i,
                  /(FAA\s*PART\s*[0-9]+|14\s*CFR\s*[0-9]+)/i,
                  /(EASA|CASA|UK\s*CAA)/i
                ];
                
                let detectedStandardCodes = [];
                for (const pattern of standardPatterns) {
                  const match = message.match(pattern);
                  if (match) {
                    detectedStandardCodes.push(match[1].toUpperCase().replace(/\s+/g, '_'));
                  }
                }
                
                // Get relevant standards
                const standardsResult = await queryPostgres(
                  `SELECT code, name, sector FROM public.standards 
                   WHERE is_active = true 
                   ${detectedStandardCodes.length > 0 ? `AND (${detectedStandardCodes.map((_, i) => `code ILIKE $${i + 1}`).join(' OR ')})` : ''}
                   ORDER BY uploaded_at DESC 
                   LIMIT 10`,
                  detectedStandardCodes.length > 0 ? detectedStandardCodes.map(c => `%${c}%`) : []
                ).catch(() => ({ rows: [] }));
                
                if (standardsResult.rows.length > 0) {
                  const standardsList = standardsResult.rows.map(s => `${s.code} (${s.sector})`).join(', ');
                  systemPrompt += `\n\nAvailable Standards: ${standardsList}`;
                }
                
                // Get conversation history
                const historyResult = await queryEdcatAI(
                  `SELECT role, message FROM edcat.ai_conversation_history 
                   WHERE session_id = $1 AND tenant_id = $2 
                   ORDER BY created_at DESC 
                   LIMIT 10`,
                  [effectiveSessionId, effectiveTenantId]
                ).catch(() => ({ rows: [] }));
                
                if (historyResult.rows.length > 0) {
                  const recentMessages = historyResult.rows.reverse()
                    .slice(-5)
                    .map(row => `${row.role}: ${(row.message || '').substring(0, 150)}`)
                    .join('\n');
                  systemPrompt += `\n\nRecent conversation context:\n${recentMessages}`;
                }
              } catch (ragError) {
                // Non-fatal
                console.debug('[Vera-CHAT] Could not enrich system prompt with RAG', { error: ragError.message });
              }
              
              // Generate with timeout protection
              const mistralPromise = mistralService.generateResponse(
                message.trim(),
                systemPrompt,
                { temperature: 0.7, maxTokens: 2000 }
              );
              
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Mistral timeout')), 30000)
              );
              
              const mistralResult = await Promise.race([mistralPromise, timeoutPromise]);
              
              veraResponse = {
                answer: mistralResult.text,
                message: mistralResult.text,
                source: 'mistral',
                mode: 'chat',
                confidence: 0.8,
                metadata: {
                  source: 'mistral',
                  model: mistralResult.model,
                  tokensUsed: mistralResult.tokensUsed,
                  cached: mistralResult.cached || false,
                  engine: 'mistral'
                }
              };
              
              console.log('[Vera-CHAT] ✅ Mistral response generated');
            }
          } catch (mistralError) {
            // Determine error type
            const errorMessage = mistralError.message || String(mistralError);
            let errorType = 'unknown';
            if (errorMessage.includes('timeout')) errorType = 'timeout';
            else if (errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) errorType = 'network';
            
            console.warn('[Vera-CHAT] Mistral failed, falling back to VeraCoreEngine', {
              error: errorMessage,
              errorType
            });
            
            // Mark as unavailable
            const { setMistralAvailable } = await import('../services/vera-mistral-service.js');
            setMistralAvailable(false, `${errorType}: ${errorMessage}`);
            
            // Fall through to VeraCoreEngine
          }
        }
        
        const veraRequest = {
          message,
          sessionId: effectiveSessionId,
          userId: effectiveUserId,
          tenantId: effectiveTenantId,
          debugMode: isDebug
        };
        
        veraResponse = await generateVeraResponse(veraRequest);
        
        // Add engine metadata
        if (!veraResponse.metadata) {
          veraResponse.metadata = {};
        }
        veraResponse.metadata.engine = 'vera-core-fallback';
        console.log('[Vera-CHAT] Using VeraCoreEngine fallback');
      }
      
      // STEP 3.5: If no good match found, try synthesis engine
      const hasLowConfidence = (veraResponse.metadata?.confidence || veraResponse.confidence || 0) < 0.5;
      const isFallback = veraResponse.source === 'fallback' || veraResponse.mode === 'fallback';
      
      if (hasLowConfidence || isFallback) {
        console.log('[Vera-CHAT] Low confidence or fallback - trying synthesis engine');
        
        try {
          const synthEngine = new VeraKnowledgeSynthesisEngine();
          const synthesized = await synthEngine.synthesizeAnswer(message, {
            sessionId: effectiveSessionId,
            tenantId: effectiveTenantId,
            conversationContext: conversationContext
          });
          
          if (synthesized.success && synthesized.confidence > 0.5) {
            console.log(`[Vera-CHAT] ✅ Synthesis engine found answer (${synthesized.sourcesUsed} sources, confidence: ${synthesized.confidence})`);
            veraResponse = {
              answer: synthesized.message,
              message: synthesized.message,
              source: 'synthesis',
              mode: 'synthesis',
              confidence: synthesized.confidence,
              metadata: {
                source: 'synthesis',
                confidence: synthesized.confidence,
                sourcesUsed: synthesized.sourcesUsed,
                sources: synthesized.sources
              }
            };
          }
        } catch (synthError) {
          console.warn('[Vera-CHAT] Synthesis engine error (non-fatal):', synthError.message);
          // Continue with original response
        }
      }
      
      // STEP 4: Record conversation turn with memory service
      try {
        await VeraConversationMemoryService.recordConversationTurn(
          effectiveSessionId,
          effectiveTenantId,
          effectiveUserId,
          message,
          {
            answer: veraResponse.answer,
            message: veraResponse.answer,
            source: veraResponse.metadata?.source || veraResponse.source,
            confidence: veraResponse.metadata?.confidence || veraResponse.confidence,
            matchType: veraResponse.metadata?.matchType,
            qaId: veraResponse.metadata?.qaId
          },
          null // No feedback yet
        );
      } catch (memoryError) {
        console.warn('[Vera-CHAT] Memory service error (non-fatal):', memoryError.message);
      }
      
      // ✅ If response came from Q&A bank, return it directly (don't override)
      if (veraResponse.source === 'qa_bank' || veraResponse.metadata?.source === 'vera_query_response_bank') {
        console.log('[Vera-CHAT] ✅ Q&A response found - returning directly from qa_bank');
        return res.json({
          success: true,
          message: veraResponse.answer,
          response: veraResponse.answer, // For backward compatibility
          intent: veraResponse.intent,
          confidence: veraResponse.metadata?.confidence || veraResponse.confidence,
          source: 'vera_qa_bank',
          metadata: veraResponse.metadata
        });
      }
      
      // Otherwise use template filling (fallback)
      response = veraResponse.answer;
      const engineUsed = veraResponse.metadata?.engine || (veraResponse.source === 'mistral' ? 'mistral' : 'vera-core-fallback');
      
      console.log(`[Vera-CHAT] Response generated: mode=${veraResponse.mode}, intent=${veraResponse.intent}, engine=${engineUsed}, confidence=${veraResponse.metadata?.confidence || 'N/A'}`);
      
      // Apply loop avoidance before saving
      const VeraLoopAvoidanceService = (await import('../services/vera/VeraLoopAvoidanceService.js')).default;
      response = await VeraLoopAvoidanceService.applyLoopAvoidance({
        tenantId: effectiveTenantId,
        sessionId: effectiveSessionId,
        userMessage: message,
        proposedResponse: response
      });
      
      // Save to history
      await saveToHistory(effectiveSessionId, effectiveTenantId, message, response, veraResponse.intent || detectedIntent, effectiveUserId);
      
      return res.json({
        success: true,
        response,
        mode: veraResponse.mode || 'normal',
        intent: veraResponse.intent || detectedIntent,
        topic: veraResponse.topic,
        engine: engineUsed,
        metadata: {
          ...veraResponse.metadata,
          engine: engineUsed
        },
        confidence: veraResponse.metadata?.confidence
      });
    } catch (error) {
      console.error('[Vera-CHAT] Error in VeraCoreEngine:', error);
      console.error('[Vera-CHAT] Error stack:', error.stack);
      
      // Fallback: Try handleSpecificQuestion as last resort
      try {
        console.log('[Vera-CHAT] Falling back to handleSpecificQuestion');
        response = await handleSpecificQuestion(message, conversationContext, effectiveTenantId);
        
        if (response) {
          await saveToHistory(effectiveSessionId, effectiveTenantId, message, response, detectedIntent, effectiveUserId);
          return res.json({
            success: true,
            response,
            mode: 'fallback',
            intent: detectedIntent
          });
        }
      } catch (fallbackError) {
        console.error('[Vera-CHAT] Fallback also failed:', fallbackError);
      }
      
      // Final fallback: Return helpful error (ALWAYS return 200, never 500)
      return res.status(200).json({
        success: false,
        response: "I encountered an error processing your request. This might be due to a database connection issue. Please try again, or ask about a specific standard or compliance topic.",
        mode: 'error',
        engine: 'vera-core-fallback',
        intent: detectedIntent,
        metadata: {
          engine: 'vera-core-fallback',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
      
      // Try to provide a helpful response based on the error
      if (message && /tell me about|what is|explain/i.test(message)) {
        // User is asking about something - try to extract what they're asking about
        const standardMatch = message.match(/\b(AS\d{4}[A-Z]?|ISO\s*\d{4,5}|IATF\s*\d{4,5}|FAA\s*Part\s*\d+|EASA|ISO\s*13485|ISO\s*9001)\b/i);
        if (standardMatch) {
          const standardName = standardMatch[1].trim();
          // Use the conversational explanation even if database lookup failed
          try {
            const conversationalEngine = getVeraConversationalEngine();
            response = await conversationalEngine.handleStandardExplanationByName(standardName, message, {}, conversationContext);
          } catch (fallbackError) {
            console.error('[chat] Fallback explanation also failed:', fallbackError);
            response = `${standardName} is a quality management standard. I can help you understand its requirements, but I'm having trouble accessing my database right now. `;
            response += `Could you try asking again in a moment? If the issue persists, you might want to check if ${standardName} has been uploaded and parsed in the system.`;
          }
        } else {
          response = "I'm having a bit of trouble processing that right now. Could you rephrase your question, or try asking about a specific standard or clause?";
        }
      } else {
        // More conversational fallback
        response = "I'm having a bit of trouble with that question right now. Could you try rephrasing it, or ask me about a specific standard, clause, or compliance topic?";
      }
      
      return res.json({
        success: true,
        response,
        mode: 'fallback',
        intent: 'error'
      });
    }

  } catch (error) {
    // CRITICAL: Always return a response, never 500
    // This ensures chat is "always connected"
    console.error('[Vera-CHAT] Fatal error in chat endpoint:', error);
    console.error('[Vera-CHAT] Error stack:', error.stack);
    
    // Try to provide a helpful fallback response
    let fallbackResponse = "I encountered an error while processing your question. Could you try rephrasing it?";
    
    // Provide more specific error messages in development
    if (process.env.NODE_ENV === 'development') {
      fallbackResponse += `\n\n[Debug: ${error.message}]`;
    }
    
    return res.status(200).json({
      success: false,
      response: fallbackResponse,
      message: fallbackResponse,
      mode: 'error',
      engine: 'vera-core-fallback',
      metadata: {
        engine: 'vera-core-fallback',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error',
        errorType: error.name || 'UnknownError'
      }
    });
  }
});

/**
 * DIRECT META-QUESTION HANDLER
 * Don't go through intent classification - answer directly
 */
async function handleMetaQuestionDirectly(message) {
  const profile = VeraSelfAwarenessService.getSelfProfile();
  
  // Self-improvement question
  if (/improve|better|limitation|weakness|what else/i.test(message)) {
    const improvements = profile.improvements_vera_could_make.join('\n- ');
    
    return `Good question. Here's where I could get better:

Right now I'm working from what's in your uploaded standards. I can't invent requirements, which is good for compliance, but it means if you ask about something not in your standards, I'm limited.

What I could do better:

- ${improvements}

The biggest thing? I'd like to understand your company's actual risk profile. Then I could tell you "this gap matters because of YOUR supply chain" instead of general advice.

What's the most annoying limitation you've hit so far?`;
  }

  // What else do you know?
  if (/what else.*know|what else.*do/i.test(message)) {
    const capabilities = profile.core_capabilities.join('\n- ');
    const expertise = profile.expertise_areas.slice(0, 5).join(', ');
    const authorities = profile.regulatory_authorities.slice(0, 3).join(', ');
    
    return `Fair point. Beyond the standard capability list, here's what's in my head:

CORE CAPABILITIES:
- ${capabilities}

EXPERTISE AREAS:
I specialize in ${expertise}, and more. Over ${profile.expertise_areas.length} domains total.

REGULATORY AUTHORITY KNOWLEDGE:
I know the differences between ${authorities}, and ${profile.regulatory_authorities.length - 3} others. Each has different philosophies, rigor levels, and audit approaches.

CUSTOMER-SPECIFIC COMPLIANCE:
If you upload customer documents, I can track their procedures, compliance posture, trends over time, and audit readiness. I can compare them to any standard.

COMPLIANCE COMPARISON:
I can run full assessments and give you specific gaps, remediation steps, audit readiness score, risk level.

What would be most useful to dig into?`;
  }

  // Where do you come from?
  if (/where.*come from|where.*from/i.test(message)) {
    return `I'm operating on UTC, but I work across all time zones. I'm built to help with compliance wherever you are—whether that's FAA in the US, EASA in Europe, CASA in Australia, or any other regulatory authority.

What time zone are you working in? I can help with compliance questions specific to your region.`;
  }

  // Self-introduction
  if (/tell me about yourself|who are you|what are you|introduce yourself/i.test(message)) {
    return `I'm ${profile.name}, your ${profile.role.toLowerCase()}. ${profile.name} stands for Virtual Expert in Requirements and Assessments.

I help with compliance, requirements, gap analysis, and quality management. What can I help you with today?`;
  }

  // Generic meta answer
  return `I'm ${profile.name}—${profile.role.toLowerCase()}. Not trying to replace auditors, just make your compliance work faster and smarter. What can I actually help you with?`;
}

/**
 * SPECIFIC QUESTION HANDLER
 * User is asking about something specific (not intro questions)
 * Uses VeraCoreEngine (self-contained, no external LLM)
 */
async function handleSpecificQuestion(message, conversationContext, tenantId) {
  try {
    // Use VeraCoreEngine for all specific questions (self-contained, no external LLM)
    const veraRequest = {
      message: message.trim(),
      sessionId: conversationContext?.session_id || '00000000-0000-0000-0000-000000000000',
      userId: conversationContext?.user_id || 'system',
      tenantId: tenantId || '00000000-0000-0000-0000-000000000000',
      debugMode: false
    };

    const veraResponse = await generateVeraResponse(veraRequest);
    
    // If response came from Q&A bank, return it directly
    if (veraResponse.source === 'qa_bank' || veraResponse.metadata?.source === 'vera_query_response_bank') {
      console.log('[handleSpecificQuestion] ✅ Q&A response found - returning directly from qa_bank');
      return veraResponse.answer;
    }
    
    if (veraResponse.answer && veraResponse.mode !== 'error') {
      return veraResponse.answer;
    }
    
    // Fallback to legacy logic if VeraCoreEngine fails
    console.warn('[handleSpecificQuestion] VeraCoreEngine returned error, falling back to legacy handler');
  } catch (error) {
    console.error('[handleSpecificQuestion] VeraCoreEngine error:', error.message);
    // Fall through to legacy handler
  }

  // Legacy fallback handler (for backward compatibility)
  // Detect what they're asking about
  
  if (/clause\s+[\d.]+|explain.*clause|what.*clause/i.test(message)) {
    // Extract clause reference
    const clauseMatch = message.match(/clause\s+([\d.]+)/i);
    if (clauseMatch) {
      return `Let me explain clause ${clauseMatch[1]}.

[Waiting for clause understanding service to be called]

What specifically about this clause are you trying to understand?`;
    }
  }

  if (/gap|coverage|compliance.*check|is.*compliant/i.test(message)) {
    return `I can run a compliance assessment for you. Which standard are you checking against? And is this for a specific customer or your own company?`;
  }

  if (/procedure|control|process/i.test(message)) {
    return `Tell me more about what you're looking for. Are you asking about your own procedures, a customer's, or how to implement something new?`;
  }

  // Fallback: acknowledge and ask for clarity
  return `I can help with that. Can you be more specific about what you're trying to figure out?`;
}

/**
 * Save to conversation history
 */
async function saveToHistory(sessionId, tenantId, userMessage, assistantResponse, intent = null, userId = null) {
  try {
    const personaCode = 'vera'; // Default persona code
    
    // Ensure conversation state exists first (required for foreign key)
    await queryEdcatAI(
      `INSERT INTO edcat.ai_conversation_state 
       (session_id, tenant_id, persona_code, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (session_id, tenant_id, persona_code) DO UPDATE SET updated_at = NOW()`,
      [sessionId, tenantId, personaCode]
    );

    // Save user message (no ON CONFLICT needed - id is primary key)
    await queryEdcatAI(
      `INSERT INTO edcat.ai_conversation_history 
       (session_id, tenant_id, persona_code, role, message, intent, created_at)
       VALUES ($1, $2, $3, 'user', $4, $5, NOW())`,
      [sessionId, tenantId, personaCode, userMessage, intent]
    );

    // Save assistant response
    await queryEdcatAI(
      `INSERT INTO edcat.ai_conversation_history 
       (session_id, tenant_id, persona_code, role, message, intent, created_at)
       VALUES ($1, $2, $3, 'assistant', $4, $5, NOW())`,
      [sessionId, tenantId, personaCode, assistantResponse, intent]
    );

    // Also store in conversation memory service (with embeddings for semantic search)
    try {
      const VeraConversationMemoryService = (await import('../services/vera/VeraConversationMemoryService.js')).default;
      
      // Store user message
      await VeraConversationMemoryService.storeMessage({
        tenantId,
        userId,
        sessionId,
        messageText: userMessage,
        intent,
        metadata: { source: 'chat_route' }
      });

      // Store assistant response (linked to previous)
      const userMessageId = await VeraConversationMemoryService.storeMessage({
        tenantId,
        userId,
        sessionId,
        messageText: userMessage,
        intent,
        metadata: { source: 'chat_route', role: 'user' }
      });

      await VeraConversationMemoryService.storeMessage({
        tenantId,
        userId,
        sessionId,
        messageText: assistantResponse,
        intent,
        linkedToPrevious: userMessageId,
        metadata: { source: 'chat_route', role: 'assistant' }
      });
    } catch (memoryError) {
      // Non-fatal - conversation history still saved above
      console.warn('[chat] Could not store in conversation memory service:', memoryError.message);
    }
  } catch (error) {
    console.error('[chat] Error saving to history:', error.message);
    console.error('[chat] Error details:', {
      sessionId,
      tenantId,
      personaCode,
      errorCode: error.code,
      errorDetail: error.detail
    });
    // Don't throw - non-fatal error, but log for debugging
  }
}

/**
 * POST /api/chat/feedback
 * 
 * Handle user feedback on Vera's responses
 * Allows Vera to learn from corrections and approvals
 */
router.post('/feedback', async (req, res) => {
  try {
    const { sessionId, tenantId, userId, feedbackType, correctedAnswer, reason } = req.body;

    if (!sessionId || !feedbackType) {
      return res.status(400).json({
        error: 'Missing sessionId or feedbackType'
      });
    }

    const effectiveTenantId = tenantId || '00000000-0000-0000-0000-000000000000';
    const effectiveUserId = userId || 'system';

    // Get the last response from this session
    const lastResponse = await queryEdcatAI(
      `SELECT * FROM edcat.ai_conversation_history 
       WHERE session_id = $1 AND tenant_id = $2 AND role = 'assistant'
       ORDER BY created_at DESC
       LIMIT 1`,
      [sessionId, effectiveTenantId]
    );

    if (lastResponse.rows.length === 0) {
      return res.status(404).json({ error: 'No response found in session' });
    }

    const feedback = {
      type: feedbackType,  // "correction" or "approval"
      correctedAnswer: correctedAnswer || null,
      reason: reason || null
    };

    // Extract metadata from last response
    const lastResponseData = lastResponse.rows[0];
    let metadata = {};
    try {
      metadata = JSON.parse(lastResponseData.metadata || '{}');
    } catch (e) {
      // Metadata might not be JSON
    }

    const veraResponse = {
      answer: lastResponseData.message_text,
      message: lastResponseData.message_text,
      source: metadata.source,
      confidence: metadata.confidence,
      matchType: metadata.matchType,
      qaId: metadata.qaId
    };

    await VeraConversationMemoryService.recordLearningEvent(
      sessionId,
      effectiveTenantId,
      effectiveUserId,
      lastResponseData.message_text,
      veraResponse,
      feedback
    );

    res.json({
      success: true,
      message: `✅ Recorded ${feedbackType} - Vera is learning!`
    });

  } catch (error) {
    console.error('[Chat] Error recording feedback:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/chat/compare
 * 
 * Compare two standards or find clause mappings
 * Examples:
 * - "compare ISO 9001 and AS9100D"
 * - "find equivalent of ISO 9001 clause 4.2 in AS9100D"
 */
router.post('/compare', async (req, res) => {
  try {
    const { standard1, standard2, fromClause } = req.body;

    if (!standard1 || !standard2) {
      return res.status(400).json({
        error: 'standard1 and standard2 required'
      });
    }

    let result;
    if (fromClause) {
      // Clause mapping
      result = await VeraKnowledgeGraphService.findClauseMapping(standard1, fromClause, standard2);
    } else {
      // Standards comparison
      result = await VeraKnowledgeGraphService.compareStandards(standard1, standard2);
    }

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('[Chat] Error in compare:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
