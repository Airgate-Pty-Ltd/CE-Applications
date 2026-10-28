/**
 * Vera API Routes
 * Endpoints for Vera's enhanced intelligence and knowledge base operations
 */

import express from 'express';
import VeraContextManager from '../services/vera/VeraContextManager.js';
import VeraClarificationEngine from '../services/vera/VeraClarificationEngine.js';
import VeraResponseGenerator from '../services/vera/VeraResponseGenerator.js';
import VeraLearningEngine from '../services/vera/VeraLearningEngine.js';
import VeraMemoryManager from '../services/vera/VeraMemoryManager.js';
import VeraVectorEngine from '../services/vera/VeraVectorEngine.js';
import VeraQueryParser from '../services/vera/VeraQueryParser.js';
import VeraComprehensiveResearcher from '../services/vera/VeraComprehensiveResearcher.js';
import VeraRegulatoryLookup from '../services/vera/VeraRegulatoryLookup.js';
import VeraProfessionalResponseBuilder from '../services/vera/VeraProfessionalResponseBuilder.js';
import { queryEdcatAI } from '../config/databases.js';
import { runDiagnostics } from '../scripts/vera-diagnostics.js';
import { callVeraWithRAG, detectWebSearchNeeded } from '../services/vera/VeraRAGService.js';

const router = express.Router();

// POST /api/vera/analyze-with-clarifications
// Start gap analysis WITH clarifications built in
router.post('/analyze-with-clarifications', async (req, res) => {
  const { conversationId, customerId, standardId } = req.body;

  try {
    // 1. Initialize context
    const context = await VeraContextManager.initializeContext(
      conversationId, 
      req.user?.id || 'system',
      req.tenant?.id || '00000000-0000-0000-0000-000000000000'
    );
    await VeraContextManager.updatePhase(context.context_id, 'analysis_in_progress');

    // 2. Find ambiguous items (if analysis exists)
    let ambiguous = [];
    if (standardId) {
      // This would require an analysis_id - simplified for now
      ambiguous = await VeraClarificationEngine.determineClarificationNeeded(null, context.context_id);
    }

    // 3. Generate clarification questions
    const questions = [];
    for (const item of ambiguous.slice(0, 6)) {
      const question = await VeraClarificationEngine.generateClarificationQuestion(
        item.mapping_id, 
        item.rule_id || null,
        item.requirement_text || '',
        item.procedure_text || '',
        item.match_confidence || 0.65
      );
      if (question) questions.push(question);
    }

    // 4. Prepare initial response
    const template = await VeraResponseGenerator.selectTemplate('analysis_start', 0.70, context, ambiguous.length);
    const response = await VeraResponseGenerator.generateResponse(template || {}, {
      CUSTOMER: customerId || 'the customer',
      STANDARD: standardId || 'the standard',
      TOTAL_REQUIREMENTS: '0',
      COVERED_COUNT: '0',
      GAP_COUNT: '0',
      AMBIGUOUS_COUNT: questions.length.toString()
    });

    res.json({
      analysis_id: null,
      context_id: context.context_id,
      initial_response: response,
      clarifications_needed: questions.length,
      next_clarification: questions[0] || null,
      status: questions.length > 0 ? 'awaiting_clarification' : 'analysis_complete'
    });

  } catch (error) {
    console.error('[Vera API] Error in analyze-with-clarifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vera/submit-clarification-response
// User answers a clarification question
router.post('/submit-clarification-response', async (req, res) => {
  const { feedbackId, userResponse, conversationId } = req.body;

  try {
    // 1. Process response
    const result = await VeraClarificationEngine.processClarificationResponse(feedbackId, userResponse);

    // 2. Record learning event
    await VeraLearningEngine.recordLearningEvent('clarification_feedback', {
      learned_item: 'user_clarification_response',
      confidence_before: result.confidence_before || 0.50,
      confidence_after: result.newConfidence || 0.70,
      is_positive: ['yes', 'Yes', 'not_sure', 'Not Sure'].includes(userResponse),
      value: 0.80,
      triggering_action: 'user_confirmed_mapping'
    });

    // 3. Get next clarification or show results
    const remaining = await VeraClarificationEngine.determineClarificationNeeded(null, null);

    if (remaining.length > 0) {
      const nextQuestion = await VeraClarificationEngine.generateClarificationQuestion(
        remaining[0].mapping_id,
        null,
        remaining[0].requirement_text,
        remaining[0].procedure_text,
        remaining[0].match_confidence
      );
      res.json({
        status: 'continue_clarification',
        next_clarification: nextQuestion,
        progress: `Question ${questions.length + 1} of ${questions.length + remaining.length}`
      });
    } else {
      res.json({
        status: 'clarifications_complete',
        message: 'Analysis updated with your clarifications.'
      });
    }

  } catch (error) {
    console.error('[Vera API] Error in submit-clarification-response:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vera/rate-response
// User rates a Vera response (used for learning)
router.post('/rate-response', async (req, res) => {
  const { responseId, rating, feedback, conversationId } = req.body;

  try {
    await queryEdcatAI(
      `UPDATE vera_response_effectiveness 
       SET user_satisfaction_rating = $1, user_provided_feedback = $2
       WHERE effectiveness_id = $3`,
      [rating, feedback, responseId]
    );

    // Record learning event
    await VeraLearningEngine.recordLearningEvent('response_effectiveness', {
      learned_item: 'response_rating',
      confidence_before: 0.50,
      confidence_after: rating / 5,
      is_positive: rating >= 4,
      value: rating / 5,
      triggering_action: 'user_rated_response'
    });

    res.json({ success: true, message: 'Thanks for the feedback! This helps me improve.' });

  } catch (error) {
    console.error('[Vera API] Error in rate-response:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vera/trigger-daily-learning
// Trigger daily learning batch (run via cron)
router.post('/trigger-daily-learning', async (req, res) => {
  try {
    const batchId = await VeraLearningEngine.processDailyLearningBatch();
    res.json({ success: true, batch_id: batchId, message: 'Daily learning batch processed' });
  } catch (error) {
    console.error('[Vera API] Error in trigger-daily-learning:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vera/model-version
// Get current Vera model version
router.get('/model-version', async (req, res) => {
  try {
    const version = await queryEdcatAI(
      `SELECT * FROM vera_model_versions 
       WHERE status = 'deployed'
       ORDER BY deployed_at DESC
       LIMIT 1`
    );

    if (version.rows.length === 0) {
      // Return default version
      res.json({
        version: '1.0.0',
        accuracy: 0.800,
        precision: 0.820,
        recall: 0.780,
        deployed_at: new Date().toISOString()
      });
    } else {
      res.json({
        version: version.rows[0].version_number,
        accuracy: version.rows[0].baseline_accuracy,
        precision: version.rows[0].baseline_precision,
        recall: version.rows[0].baseline_recall,
        deployed_at: version.rows[0].deployed_at
      });
    }

  } catch (error) {
    console.error('[Vera API] Error in model-version:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vera/build-knowledge-base
// Build Vera's initial knowledge base from standards
router.post('/build-knowledge-base', async (req, res) => {
  const { standardIds } = req.body;

  if (!standardIds || !Array.isArray(standardIds) || standardIds.length === 0) {
    return res.status(400).json({ error: 'standardIds array is required' });
  }

  try {
    const results = [];
    for (const standardId of standardIds) {
      // Embed all requirements
      const embeddingResult = await VeraVectorEngine.embedAllRequirements(standardId);
      results.push({
        standardId,
        embedded: embeddingResult.embedded,
        skipped: embeddingResult.skipped
      });
    }

    res.json({ 
      success: true, 
      message: 'Knowledge base building initiated',
      results
    });

  } catch (error) {
    console.error('[Vera API] Error in build-knowledge-base:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vera/knowledge-insights
// Get insights into what Vera has learned
router.get('/knowledge-insights', async (req, res) => {
  try {
    const concepts = await queryEdcatAI(
      `SELECT COUNT(*) as total_concepts FROM vera_knowledge_graph_concepts`
    );

    const patterns = await queryEdcatAI(
      `SELECT COUNT(*) as discovered_patterns FROM vera_pattern_discoveries`
    );

    const reasoningChains = await queryEdcatAI(
      `SELECT COUNT(*) as reasoning_chains FROM vera_requirement_reasoning_chains`
    );

    const selfQuestions = await queryEdcatAI(
      `SELECT COUNT(*) FILTER (WHERE is_answered = TRUE) as answered, 
              COUNT(*) FILTER (WHERE is_answered = FALSE) as unanswered
       FROM vera_self_learning_questions`
    );

    res.json({
      vera_knowledge_base: {
        core_concepts: parseInt(concepts.rows[0]?.total_concepts || 0),
        discovered_patterns: parseInt(patterns.rows[0]?.discovered_patterns || 0),
        reasoning_chains: parseInt(reasoningChains.rows[0]?.reasoning_chains || 0),
        self_learning: {
          questions_answered: parseInt(selfQuestions.rows[0]?.answered || 0),
          questions_pending: parseInt(selfQuestions.rows[0]?.unanswered || 0)
        }
      },
      message: 'Vera has built significant knowledge about compliance standards'
    });

  } catch (error) {
    console.error('[Vera API] Error in knowledge-insights:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vera/query
// General query endpoint with web search integration
// Handles both knowledge base queries and live data queries
router.post('/query', async (req, res) => {
  const { message, sessionId, userId, tenantId, options } = req.body;
  const effectiveUserId = userId || req.user?.id || 'system';
  const effectiveTenantId = tenantId || req.tenant?.id || '00000000-0000-0000-0000-000000000000';
  const effectiveSessionId = sessionId || req.session?.id || '00000000-0000-0000-0000-000000000000';

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    // Check if web search is needed
    const webSearchDetection = detectWebSearchNeeded(message);
    
    if (webSearchDetection.needsWebSearch) {
      console.log(`[Vera API] Web search detected: ${webSearchDetection.searchType} for query: ${message.substring(0, 50)}...`);
      
      // Use RAG service with web search integration
      const ragOptions = {
        userId: effectiveUserId,
        conversationId: effectiveSessionId,
        responseType: 'general_qa',
        tenantId: effectiveTenantId,
        ...webSearchDetection.options, // Options extracted from query
        ...options, // Additional options from request
        location: options?.location || req.body.location,
        start_location: options?.start_location || req.body.start_location,
        end_location: options?.end_location || req.body.end_location,
        symbol: options?.symbol || req.body.symbol,
        from: options?.from || req.body.from,
        to: options?.to || req.body.to
      };

      const ragResponse = await callVeraWithRAG(message, null, ragOptions);
      
      return res.json({
        success: true,
        answer: ragResponse.answer,
        response: ragResponse.answer, // For backward compatibility
        mode: 'rag_with_web_search',
        source: 'rag_web_search',
        metadata: {
          webSearchUsed: ragResponse.retrievedKnowledge.webSearchUsed,
          webSearchType: ragResponse.retrievedKnowledge.webSearchType,
          domainsFound: ragResponse.retrievedKnowledge.domainsFound,
          corpusUsed: ragResponse.retrievedKnowledge.corpusUsed,
          reasoningUsed: ragResponse.retrievedKnowledge.reasoningUsed,
          metrics: ragResponse.metrics // Include LLM metrics
        }
      });
    } else {
      // Use RAG without web search (knowledge base only)
      const ragOptions = {
        userId: effectiveUserId,
        conversationId: effectiveSessionId,
        responseType: 'general_qa',
        tenantId: effectiveTenantId,
        ...options
      };

      const ragResponse = await callVeraWithRAG(message, null, ragOptions);
      
      return res.json({
        success: true,
        answer: ragResponse.answer,
        response: ragResponse.answer,
        mode: 'rag_knowledge_base',
        source: 'rag',
        metadata: {
          webSearchUsed: false,
          domainsFound: ragResponse.retrievedKnowledge.domainsFound,
          corpusUsed: ragResponse.retrievedKnowledge.corpusUsed,
          reasoningUsed: ragResponse.retrievedKnowledge.reasoningUsed,
          metrics: ragResponse.metrics // Include LLM metrics
        }
      });
    }
  } catch (error) {
    console.error('[Vera API] Error in query:', error);
    res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
});

// POST /api/vera/research
// Start comprehensive research on any standard/regulation
router.post('/research', async (req, res) => {
  const { query, depth, format } = req.body;
  const userId = req.user?.id || 'system';

  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  try {
    // Check if this research query needs web search for current data
    const webSearchDetection = detectWebSearchNeeded(query);
    
    // Parse the research request
    const parsed = await VeraQueryParser.parseResearchRequest(query);

    if (!parsed.success) {
      if (parsed.clarification_needed) {
        return res.json({
          status: 'clarification_needed',
          message: parsed.message,
          estimated_duration: 60
        });
      }
      return res.status(400).json(parsed);
    }

    // Create research request record
    const request = await queryEdcatAI(
      `INSERT INTO vera_research_requests 
       (user_id, request_query, request_type, primary_topic, 
        countries_mentioned, industries_mentioned, standards_mentioned,
        desired_depth, status, research_started_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING request_id`,
      [
        userId, 
        query, 
        parsed.request_type, 
        parsed.parsed_details.primary_topic,
        parsed.parsed_details.countries || [], 
        parsed.parsed_details.industries || [],
        parsed.parsed_details.standards || [], 
        depth || 'comprehensive', 
        'researching'
      ]
    );

    const requestId = request.rows[0]?.request_id;

    // If web search is needed, enhance research with current data
    // Note: This is stored in parsed metadata for the researcher to use
    if (webSearchDetection.needsWebSearch) {
      try {
        const { searchPublicData } = await import('../services/vera/VeraWebSearchService.js');
        const webSearchData = await searchPublicData(query, webSearchDetection.searchType, webSearchDetection.options);
        parsed.webSearchData = webSearchData; // Add to parsed object for researcher
        console.log(`[Vera API] Web search data retrieved for research: ${webSearchDetection.searchType}`);
      } catch (webSearchError) {
        console.warn('[Vera API] Web search failed during research (non-fatal):', webSearchError.message);
      }
    }

    // Start research asynchronously
    VeraComprehensiveResearcher.executeComprehensiveResearch(parsed)
      .then(async (result) => {
        if (result.success) {
          // Store results
          await queryEdcatAI(
            `UPDATE vera_research_requests 
             SET status = 'complete',
                 research_completed_at = NOW(),
                 duration_seconds = $1,
                 sources_found = $2,
                 authoritative_sources = $3,
                 research_summary = $4,
                 confidence_in_findings = $5
             WHERE request_id = $6`,
            [
              Math.round(result.duration),
              result.sources_found,
              result.authoritative_sources,
              JSON.stringify(result.report),
              result.confidence,
              requestId
            ]
          );
        } else {
          await queryEdcatAI(
            `UPDATE vera_research_requests SET status = 'failed' WHERE request_id = $1`,
            [requestId]
          );
        }
      })
      .catch(async (error) => {
        console.error('[Vera API] Research error:', error);
        await queryEdcatAI(
          `UPDATE vera_research_requests SET status = 'failed' WHERE request_id = $1`,
          [requestId]
        );
      });

    res.json({
      status: 'research_started',
      request_id: requestId,
      message: `Researching: ${parsed.parsed_details.primary_topic}...`,
      estimated_duration_seconds: parsed.estimated_duration_seconds,
      poll_endpoint: `/api/vera/research/${requestId}`
    });

  } catch (error) {
    console.error('[Vera API] Error in research:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vera/research/:requestId
// Get research results
router.get('/research/:requestId', async (req, res) => {
  const { requestId } = req.params;

  try {
    const request = await queryEdcatAI(
      `SELECT * FROM vera_research_requests WHERE request_id = $1`,
      [requestId]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Research request not found' });
    }

    const req_data = request.rows[0];

    res.json({
      request_id: requestId,
      status: req_data.status,
      topic: req_data.primary_topic,
      started_at: req_data.research_started_at,
      completed_at: req_data.research_completed_at,
      sources_found: req_data.sources_found,
      confidence: req_data.confidence_in_findings,
      
      // If complete, include findings
      ...(req_data.status === 'complete' && {
        findings: req_data.research_summary ? JSON.parse(req_data.research_summary) : null,
        sources: req_data.sources_list
      }),
      
      // If still researching
      ...(req_data.status === 'researching' && {
        message: 'Still researching, check back in 30 seconds'
      })
    });

  } catch (error) {
    console.error('[Vera API] Error getting research:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vera/research/regulatory-lookup
// Quick regulatory lookup by country/industry
router.post('/research/regulatory-lookup', async (req, res) => {
  const { country, industry, productType } = req.body;

  if (!country || !industry) {
    return res.status(400).json({ error: 'country and industry are required' });
  }

  try {
    const results = await VeraRegulatoryLookup.findRegulatoryRequirements(
      country,
      industry,
      productType
    );

    res.json({
      country: country,
      industry: industry,
      regulations: results.results,
      from_cache: results.source === 'cached',
      message: `Found ${results.results.length} regulatory requirements`
    });

  } catch (error) {
    console.error('[Vera API] Error in regulatory lookup:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vera/research/standard
// Research specific standard
router.post('/research/standard', async (req, res) => {
  const { standard_name } = req.body;

  if (!standard_name) {
    return res.status(400).json({ error: 'standard_name is required' });
  }

  try {
    // Quick research of specific standard
    const research = await VeraComprehensiveResearcher.executeComprehensiveResearch({
      request_type: 'standard_research',
      parsed_details: {
        primary_topic: standard_name,
        standards: [standard_name],
        countries: [],
        industries: [],
        depth_required: 'comprehensive'
      }
    });

    res.json({
      standard: standard_name,
      ...research
    });

  } catch (error) {
    console.error('[Vera API] Error researching standard:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vera/diagnostics
router.get('/diagnostics', async (req, res) => {
  try {
    const results = await runDiagnostics();
    res.json({
      success: true,
      diagnostics: results
    });
  } catch (error) {
    console.error('[vera] Diagnostics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/vera/conversation/:id
router.get('/conversation/:id', async (req, res) => {
  try {
    const VeraRepository = (await import('../services/vera/VeraRepository.js')).default;
    const history = await VeraRepository.Conversation.getConversationHistory(req.params.id, 100);
    res.json({
      success: true,
      conversationId: req.params.id,
      history: history
    });
  } catch (error) {
    console.error('[vera] Get conversation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/vera/context/:id
router.get('/context/:id', async (req, res) => {
  try {
    const VeraRepository = (await import('../services/vera/VeraRepository.js')).default;
    const context = await VeraRepository.Conversation.getConversationContext(req.params.id);
    res.json({
      success: true,
      context: context
    });
  } catch (error) {
    console.error('[vera] Get context error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/vera/feedback
router.post('/feedback', async (req, res) => {
  try {
    const { conversationId, questionType, standardMentioned, wasHelpful, rating, feedbackText } = req.body;
    
    const VeraRepository = (await import('../services/vera/VeraRepository.js')).default;
    
    // Record response effectiveness
    await VeraRepository.Learning.recordResponseEffectiveness({
      conversation_id: conversationId,
      question_type: questionType,
      standard_mentioned: standardMentioned,
      context_used: {},
      user_satisfaction_rating: rating,
      was_helpful: wasHelpful,
      user_feedback_text: feedbackText
    });

    // Log learning event if feedback is negative
    if (!wasHelpful || (rating && rating < 3)) {
      await VeraRepository.Learning.logLearningEvent({
        event_type: 'user_feedback',
        learned_item: `Response to ${questionType} was not helpful`,
        confidence_before: 0.80,
        confidence_after: 0.70,
        is_positive: false,
        value: rating || 2,
        triggering_action: 'user_feedback',
        metadata: {
          question_type: questionType,
          standard: standardMentioned,
          feedback: feedbackText
        }
      });
    }

    res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });
  } catch (error) {
    console.error('[vera] Feedback error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/vera/standards
router.get('/standards', async (req, res) => {
  try {
    const VeraRepository = (await import('../services/vera/VeraRepository.js')).default;
    const { queryPostgres } = await import('../config/databases.js');
    
    const result = await queryPostgres(
      `SELECT id, code, name, authority_source, total_requirements, parsed_at 
       FROM public.standards 
       ORDER BY uploaded_at DESC`
    );
    
    res.json({
      success: true,
      standards: result.rows
    });
  } catch (error) {
    console.error('[vera] Get standards error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/vera/standards/:id/clauses
router.get('/standards/:id/clauses', async (req, res) => {
  try {
    const StandardsIntelligenceService = (await import('../services/vera/StandardsIntelligenceService.js')).default;
    const requirements = await StandardsIntelligenceService.getRequirementsForStandard(req.params.id);
    
    res.json({
      success: true,
      standardId: req.params.id,
      clauses: requirements.map(r => ({
        clause_number: r.clause_number || r.clause_ref,
        clause_ref: r.clause_ref,
        full_ref: r.full_ref,
        requirement_text: r.requirement_text?.substring(0, 200),
        requirement_type: r.requirement_type
      }))
    });
  } catch (error) {
    console.error('[vera] Get clauses error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/vera/validate
router.get('/validate', async (req, res) => {
  try {
    const { runFinalValidation } = await import('../scripts/vera-final-validation.js');
    const results = await runFinalValidation();
    res.json({
      success: results.success,
      validation: results
    });
  } catch (error) {
    console.error('[vera] Validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

