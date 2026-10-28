/**
 * Vera Context Orchestrator
 *
 * Builds comprehensive context from all Vera services for RAG (Retrieval-Augmented Generation).
 * This is the single place where all relevant data is gathered before being sent to the LLM.
 *
 * No final answer generation happens here - only data retrieval and structuring.
 */
import { queryPostgres } from '../../config/databases.js';
import VeraTerminologyAccess from './VeraTerminologyAccess.js';
import VeraQueryResponseService from './VeraQueryResponseService.js';
import { VeraRegulatoryRepository } from './VeraRegulatoryRepository.js';
import { getApprovedExamplesForStandard, getBadExamplesForStandard } from './VeraLearningRepository.js';
import { VeraGapHintService } from './VeraGapHintService.js';
import VeraConversationMemoryService from './VeraConversationMemoryService.js';
/**
 * Build comprehensive context for a user message
 *
 * Aggregates data from:
 * - Terminology service (term definitions)
 * - Q&A response bank (high-signal Q&A entries)
 * - Clause matcher + compliance requirements (relevant clauses)
 * - Regulatory repository (regulatory sections)
 * - Learning repository (examples, learning docs)
 * - Gap hint service (gap analysis hints)
 * - Conversation memory (recent context)
 */
export async function buildContext(params) {
    const { tenantId = '00000000-0000-0000-0000-000000000000', userMessage, intent, userRole, sessionId } = params;
    const context = {
        intent: intent || null,
        userRole,
        terms: [],
        qaSnippets: [],
        standardClauses: [],
        regulatorySections: [],
        examples: [],
        gapHints: [],
        conversationHistory: [],
    };
    const debugMode = process.env.VERA_DEBUG_MODE === '1';
    try {
        // 1. Extract terms from message and look them up
        if (debugMode)
            console.log('[VeraContextOrchestrator] Step 1: Looking up terms...');
        const termMatches = await lookupTerms(userMessage, tenantId);
        context.terms = termMatches;
        // 2. Get high-signal Q&A entries (best matches)
        if (debugMode)
            console.log('[VeraContextOrchestrator] Step 2: Fetching Q&A snippets...');
        const qaMatches = await VeraQueryResponseService.findBestMatch({
            tenantId,
            personaCode: 'vera',
            message: userMessage,
            intent: intent || null,
        });
        if (qaMatches) {
            context.qaSnippets = [{
                    id: qaMatches.id,
                    question: qaMatches.question_text || qaMatches.user_query_pattern || '',
                    response: qaMatches.response_text || qaMatches.answer || '',
                    category: qaMatches.category || 'general',
                    confidence: parseFloat(qaMatches.confidence_score || '0.5'),
                }];
        }
        // 3. Extract standard/clause references and find matching requirements
        if (debugMode)
            console.log('[VeraContextOrchestrator] Step 3: Finding standard clauses...');
        const clauseMatches = await findStandardClauses(userMessage, tenantId);
        context.standardClauses = clauseMatches;
        // 4. Find regulatory sections
        if (debugMode)
            console.log('[VeraContextOrchestrator] Step 4: Finding regulatory sections...');
        const regMatches = await findRegulatorySections(userMessage, tenantId);
        context.regulatorySections = regMatches;
        // 5. Get approved and bad examples
        if (debugMode)
            console.log('[VeraContextOrchestrator] Step 5: Fetching examples...');
        const examples = await fetchExamples(userMessage, tenantId);
        context.examples = examples;
        // 6. Get gap hints
        if (debugMode)
            console.log('[VeraContextOrchestrator] Step 6: Fetching gap hints...');
        const hints = await fetchGapHints(userMessage, tenantId);
        context.gapHints = hints;
        // 7. Get recent conversation history
        if (debugMode)
            console.log('[VeraContextOrchestrator] Step 7: Building conversation history...');
        if (sessionId) {
            const history = await buildConversationHistory(sessionId, tenantId);
            context.conversationHistory = history;
        }
        if (debugMode) {
            console.log('[VeraContextOrchestrator] Context built:', {
                terms: context.terms.length,
                qaSnippets: context.qaSnippets.length,
                standardClauses: context.standardClauses.length,
                regulatorySections: context.regulatorySections.length,
                examples: context.examples.length,
                gapHints: context.gapHints.length,
                conversationHistory: context.conversationHistory.length,
            });
        }
    }
    catch (error) {
        console.error('[VeraContextOrchestrator] Error building context:', error.message);
        // Return partial context rather than failing completely
    }
    return context;
}
/**
 * Look up terms from user message
 */
async function lookupTerms(message, tenantId) {
    try {
        // Extract potential terms (words that look like technical terms or acronyms)
        const words = message
            .toLowerCase()
            .split(/[\s\-_.,!?;:'"()]+/)
            .filter(w => w.length > 2);
        const terms = [];
        const seenTerms = new Set();
        // Try to find terms in the message
        for (const word of words.slice(0, 10)) { // Limit to top 10
            if (seenTerms.has(word))
                continue;
            try {
                const termDef = await VeraTerminologyAccess.getTermDefinition(word, { tenantId });
                if (termDef) {
                    seenTerms.add(word);
                    terms.push({
                        term: termDef.term || word,
                        definition: termDef.definition || termDef.short_definition || '',
                        acronym: termDef.acronym,
                        category: termDef.category,
                        sourceStandard: termDef.source_standard,
                    });
                }
            }
            catch (err) {
                // Skip individual term lookup failures
            }
        }
        return terms;
    }
    catch (error) {
        console.warn('[VeraContextOrchestrator] Error looking up terms:', error);
        return [];
    }
}
/**
 * Find standard clauses mentioned in message
 */
async function findStandardClauses(message, tenantId) {
    try {
        // Extract standard codes and clause numbers
        const standardPattern = /\b(AS\d{4}[A-Z]?|ISO\s*\d{4,5}|IATF\s*\d{4,5}|FAA\s*Part\s*\d+|EASA|ISO\s*13485|ISO\s*9001)\b/i;
        const clausePattern = /(\d+\.\d+(?:\.\d+)?(?:\([a-z]\))?)/gi;
        const standardMatch = message.match(standardPattern);
        const clauseMatches = message.match(clausePattern) || [];
        if (!standardMatch && clauseMatches.length === 0) {
            return [];
        }
        const clauses = [];
        // If we have a standard code, search for clauses
        if (standardMatch) {
            const standardCode = standardMatch[1].toUpperCase().replace(/\s+/g, '');
            // Search in parsed_requirements (Postgres)
            const query = `
        SELECT 
          pr.clause_number,
          pr.requirement_text,
          s.code as standard_code,
          s.name as standard_name
        FROM public.parsed_requirements pr
        LEFT JOIN public.standards s ON pr.standard_id = s.standard_id
        WHERE s.code ILIKE $1
          AND pr.requirement_text IS NOT NULL
        LIMIT 20
      `;
            const result = await queryPostgres(query, [`%${standardCode}%`]);
            for (const row of result.rows) {
                clauses.push({
                    standardCode: row.standard_code || standardCode,
                    clauseNumber: row.clause_number || '',
                    requirementText: row.requirement_text || '',
                    standardName: row.standard_name,
                });
            }
        }
        return clauses;
    }
    catch (error) {
        console.warn('[VeraContextOrchestrator] Error finding standard clauses:', error);
        return [];
    }
}
/**
 * Find regulatory sections
 */
async function findRegulatorySections(message, tenantId) {
    try {
        const regRepo = new VeraRegulatoryRepository();
        // Extract regulatory references (FAA Part 21.137, CASA Part 145, etc.)
        const regPattern = /\b(FAA|EASA|CASA|UK\s*CAA|FDA)\s+(?:Part\s+)?(\d+(?:\.\d+)?(?:\([a-z]\))?)/i;
        const match = message.match(regPattern);
        if (!match) {
            return [];
        }
        const standardCode = match[1].toUpperCase();
        const sectionRef = match[2];
        const sectionText = await regRepo.findRegSectionText(standardCode, sectionRef);
        if (sectionText && Array.isArray(sectionText) && sectionText.length > 0) {
            const firstSection = sectionText[0];
            return [{
                    standardCode,
                    sectionRef,
                    sectionText: firstSection.contentText || '',
                }];
        }
        return [];
    }
    catch (error) {
        console.warn('[VeraContextOrchestrator] Error finding regulatory sections:', error);
        return [];
    }
}
/**
 * Fetch approved and bad examples
 */
async function fetchExamples(message, tenantId) {
    try {
        const examples = [];
        // Extract standard codes from message
        const standardPattern = /\b(AS\d{4}[A-Z]?|ISO\s*\d{4,5}|IATF\s*\d{4,5})\b/i;
        const standardMatch = message.match(standardPattern);
        const standardCode = standardMatch ? standardMatch[1].toUpperCase().replace(/\s+/g, '') : null;
        if (standardCode) {
            // Get approved examples
            const approved = await getApprovedExamplesForStandard(standardCode, 5);
            for (const ex of approved) {
                const exAny = ex;
                examples.push({
                    title: exAny.title || exAny.example_title || exAny.exampleTitle || 'Approved Example',
                    content: exAny.content || exAny.content_text || exAny.example_content || exAny.contentText || '',
                    standardCode,
                    isApproved: true,
                });
            }
            // Get bad examples (pitfalls)
            const bad = await getBadExamplesForStandard(standardCode, 3);
            for (const ex of bad) {
                const exAny = ex;
                examples.push({
                    title: exAny.title || exAny.example_title || exAny.exampleTitle || 'Common Pitfall',
                    content: exAny.content || exAny.content_text || exAny.example_content || exAny.contentText || '',
                    standardCode,
                    isApproved: false,
                });
            }
        }
        return examples;
    }
    catch (error) {
        console.warn('[VeraContextOrchestrator] Error fetching examples:', error);
        return [];
    }
}
/**
 * Fetch gap hints
 */
async function fetchGapHints(message, tenantId) {
    try {
        // Extract standard code and clause if present
        const standardPattern = /\b(AS\d{4}[A-Z]?|ISO\s*\d{4,5})\b/i;
        const clausePattern = /(\d+\.\d+(?:\.\d+)?(?:\([a-z]\))?)/i;
        const standardMatch = message.match(standardPattern);
        const clauseMatch = message.match(clausePattern);
        const standardCode = standardMatch ? standardMatch[1].toUpperCase().replace(/\s+/g, '') : null;
        const clauseRef = clauseMatch ? clauseMatch[1] : null;
        if (standardCode) {
            const hints = await VeraGapHintService.getGapHints({
                tenantId,
                standardCode,
                clauseRef: clauseRef || undefined,
                topic: message,
            });
            return hints.map(hint => ({
                hint: hint.description || hint.recommendation || '',
                standardCode: hint.standardCode,
                clauseNumber: hint.clauseRef,
            }));
        }
        return [];
    }
    catch (error) {
        console.warn('[VeraContextOrchestrator] Error fetching gap hints:', error);
        return [];
    }
}
/**
 * Build conversation history from recent messages
 */
async function buildConversationHistory(sessionId, tenantId) {
    try {
        const context = await VeraConversationMemoryService.buildConversationContext(sessionId, tenantId, 5);
        if (context.isEmpty || !context.messages) {
            return [];
        }
        return context.messages
            .slice(-10) // Last 10 messages
            .map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            message: msg.message_text || '',
            timestamp: msg.created_at || new Date(),
        }));
    }
    catch (error) {
        console.warn('[VeraContextOrchestrator] Error building conversation history:', error);
        return [];
    }
}
//# sourceMappingURL=VeraContextOrchestrator.js.map