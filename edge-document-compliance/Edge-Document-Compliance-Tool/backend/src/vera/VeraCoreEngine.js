/**
 * Vera Core Engine
 * Single entry point for all Vera intelligence operations
 * Completely self-contained - NO external LLM dependencies
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';
import VeraQueryParser from '../services/vera/VeraQueryParser.js';
import VeraReasoningComplianceAnalyzer from '../services/vera/VeraReasoningComplianceAnalyzer.js';
import VeraRegulatoryLookup from '../services/vera/VeraRegulatoryLookup.js';
import VeraRepository from '../services/vera/VeraRepository.js';
import VeraTerminologyService from '../services/vera/VeraTerminologyService.js';
import VeraProfessionalLanguage from '../services/vera/VeraProfessionalLanguage.js';
import VeraProfessionalResponseBuilder from '../services/vera/VeraProfessionalResponseBuilder.js';
import VeraResponseGenerator from '../services/vera/VeraResponseGenerator.js';
import VeraSkillOrchestrator from '../services/vera/VeraSkillOrchestrator.js';

// Try to import memory and personality services (may not exist)
let aiMemoryService = null;
let edcatPersonality = null;

try {
  const memoryModule = await import('../services/aiMemoryService.js');
  aiMemoryService = memoryModule.default || memoryModule;
} catch (err) {
  console.warn('[VeraCoreEngine] aiMemoryService not available:', err.message);
}

try {
  const personalityModule = await import('../services/edcatPersonality.js');
  edcatPersonality = personalityModule.default || personalityModule;
} catch (err) {
  console.warn('[VeraCoreEngine] edcatPersonality not available:', err.message);
}

/**
 * Process user message - main entry point for /ask routes
 */
export async function processUserMessage({
  tenantId,
  userId,
  sessionId,
  message,
  conversationId
}) {
  const trimmed = (message || '').trim();
  if (!trimmed) {
    return {
      answer: 'Please provide a question or instruction for Vera to work with.',
      meta: { reason: 'empty_message' }
    };
  }

  // 1) Look up or initialize persona & tone for this tenant
  let persona = null;
  let toneConfig = { tone: 'professional' };
  
  if (edcatPersonality && edcatPersonality.getPersonaForTenant) {
    try {
      persona = await edcatPersonality.getPersonaForTenant(tenantId, 'vera');
      toneConfig = persona?.style || { tone: 'professional' };
    } catch (err) {
      console.warn('[VeraCoreEngine] Could not load persona:', err.message);
    }
  }

  // 2) Update conversation memory (short-term) with the new user message
  let convo = { conversationId: conversationId || sessionId };
  if (aiMemoryService && aiMemoryService.appendUserMessage) {
    try {
      convo = await aiMemoryService.appendUserMessage({
        tenantId,
        userId,
        sessionId,
        conversationId,
        message: trimmed
      });
    } catch (err) {
      console.warn('[VeraCoreEngine] Could not append user message to memory:', err.message);
    }
  }

  // 3) Use query parser to classify the request
  let parsedQuery = null;
  try {
    parsedQuery = await VeraQueryParser.parse(trimmed);
  } catch (err) {
    console.warn('[VeraCoreEngine] Query parser error, using fallback:', err.message);
    parsedQuery = { type: 'question', confidence: 0.5 };
  }

  // 3.5) Handle meta questions (about Vera herself) early
  if (parsedQuery.type === 'META_QUESTION' || parsedQuery.metaType) {
    const metaAnswer = handleMetaQuestion(parsedQuery, persona);
    if (metaAnswer) {
      // Log and return early
      if (aiMemoryService && aiMemoryService.appendAssistantMessage) {
        try {
          await aiMemoryService.appendAssistantMessage({
            tenantId,
            userId,
            sessionId,
            conversationId: convo.conversationId,
            message: metaAnswer
          });
        } catch (err) {
          // Non-fatal
        }
      }
      return {
        answer: metaAnswer,
        conversationId: convo.conversationId,
        meta: {
          parsedQuery,
          skillUsed: 'meta_question',
          metaType: parsedQuery.metaType
        }
      };
    }
  }

  // 4) Route to the appropriate capability via the skill orchestrator
  let skillResult = null;
  try {
    skillResult = await VeraSkillOrchestrator.route({
      tenantId,
      userId,
      sessionId,
      conversationId: convo.conversationId,
      parsedQuery,
      rawMessage: trimmed,
      db: { queryPostgres, queryEdcatAI },
      services: {
        repository: VeraRepository,
        regulatoryLookup: VeraRegulatoryLookup,
        reasoning: VeraReasoningComplianceAnalyzer,
        terminology: VeraTerminologyService
      }
    });
  } catch (err) {
    console.warn('[VeraCoreEngine] Skill orchestrator error:', err.message);
  }

  // 5) If no skill gave a strong answer, fall back to a standards-aware default
  const coreResult = skillResult || await fallbackStandardsAnswer({
    tenantId,
    userId,
    question: trimmed
  });

  // 5.5) Detect response mode and load user preferences
  let responseMode = 'friendly';
  let userPreferences = {};
  
  try {
    // Try to load user preferences from memory
    if (aiMemoryService && aiMemoryService.getUserPreferences) {
      userPreferences = await aiMemoryService.getUserPreferences({ tenantId, userId }) || {};
      responseMode = userPreferences.preferred_response_tone || responseMode;
    }
    
    // Override based on message content (explicit requests)
    const lowerMessage = trimmed.toLowerCase();
    if (lowerMessage.includes('regulator') || lowerMessage.includes('auditor') || 
        lowerMessage.includes('faa') || lowerMessage.includes('easa')) {
      responseMode = 'regulator_safe';
    } else if (lowerMessage.includes('formal')) {
      responseMode = 'formal';
    } else if (lowerMessage.includes('friendly')) {
      responseMode = 'friendly';
    }
  } catch (err) {
    console.warn('[VeraCoreEngine] Could not load user preferences:', err.message);
  }

  // 6) Shape the professional language and build the final response
  let professional = { text: coreResult.answer };
  if (VeraProfessionalLanguage && VeraProfessionalLanguage.refine) {
    try {
      professional = await VeraProfessionalLanguage.refine({
        persona,
        toneConfig,
        parsedQuery,
        draftAnswer: coreResult.answer,
        context: {
          ...coreResult.context,
          responseMode,
          userPreferences,
          userMessage: trimmed
        }
      });
    } catch (err) {
      console.warn('[VeraCoreEngine] Professional language refinement error:', err.message);
    }
  }

  let finalAnswer = professional.text;
  if (VeraProfessionalResponseBuilder && VeraProfessionalResponseBuilder.build) {
    try {
      finalAnswer = await VeraProfessionalResponseBuilder.build({
        persona,
        parsedQuery,
        mainText: professional.text,
        metadata: coreResult.meta || {}
      });
    } catch (err) {
      console.warn('[VeraCoreEngine] Response builder error:', err.message);
    }
  }

  // 7) Log assistant message & update memory
  if (aiMemoryService && aiMemoryService.appendAssistantMessage) {
    try {
      await aiMemoryService.appendAssistantMessage({
        tenantId,
        userId,
        sessionId,
        conversationId: convo.conversationId,
        message: finalAnswer
      });
    } catch (err) {
      console.warn('[VeraCoreEngine] Could not append assistant message to memory:', err.message);
    }
  }

  return {
    answer: finalAnswer,
    conversationId: convo.conversationId,
    meta: {
      parsedQuery,
      skillUsed: coreResult.skillUsed || 'fallback',
      ...coreResult.meta
    }
  };
}

/**
 * Handle meta questions about Vera
 */
function handleMetaQuestion(parsedQuery, persona) {
  const { metaType } = parsedQuery;

  if (metaType === 'NAME' || metaType === 'IDENTITY') {
    // Get name meaning from persona
    const nameMeaning = persona && edcatPersonality && edcatPersonality.getNameMeaning
      ? edcatPersonality.getNameMeaning(persona)
      : "Vera stands for 'Virtual Executive Requirements Assistant'. It reflects my role as your virtual compliance executive who assists with regulatory requirements and quality standards.";

    return `${nameMeaning}

I'm Vera, your compliance and regulatory requirements assistant. I help organizations understand standards, identify compliance gaps, and prepare for audits. I specialize in aerospace (AS9100, FAA), medical devices (ISO 13485, FDA), and quality management systems (ISO 9001).

What would you like to know about compliance or quality standards?`;
  }

  if (metaType === 'CAPABILITIES') {
    return `I can help you with:

✓ **Gap Analysis** - Compare your procedures against standards like AS9100, ISO 9001, ISO 13485
✓ **Clause Explanations** - Understand what specific requirements mean and how to implement them
✓ **Regulatory Lookups** - Find information about FAA, EASA, FDA, and other regulatory requirements
✓ **Implementation Advice** - Get guidance on how to structure procedures and meet compliance needs
✓ **Audit Preparation** - Identify what auditors look for and prepare your documentation
✓ **Terminology & Definitions** - Understand compliance terms and concepts
✓ **Root Cause Analysis** - Help diagnose compliance issues and find solutions

I work entirely from your databases and compliance knowledge - no external AI dependencies. Everything I tell you is traceable to standards and requirements.

What would you like to work on?`;
  }

  return null;
}

/**
 * Fallback answer using standards database
 */
async function fallbackStandardsAnswer({ tenantId, userId, question }) {
  // Simple, deterministic handling for common patterns:
  // - "What does 8.7 say?"
  // - "Explain clause 8.5.1 in AS9100"
  // - "What does ISO 9001 clause 7.1.5 require?"

  const clauseMatch = question.match(/clause\s+([0-9]+(?:\.[0-9]+)*)/i) ||
                      question.match(/\b([0-9]+\.[0-9]+(?:\.[0-9]+)*)\b/);

  // 1) Try clause lookup
  if (clauseMatch && VeraRepository && VeraRepository.findRequirementByClause) {
    try {
      const clause = clauseMatch[1];
      const requirement = await VeraRepository.findRequirementByClause({ tenantId, clause });

      if (requirement) {
        return {
          answer: `Clause ${requirement.clause_number}: ${requirement.requirement_text}`,
          skillUsed: 'fallback_clause_lookup',
          meta: { requirementId: requirement.id }
        };
      }
    } catch (err) {
      console.warn('[VeraCoreEngine] Clause lookup error:', err.message);
    }
  }

  // 2) Try terminology / concept explanation
  if (VeraTerminologyService && VeraTerminologyService.findConceptForQuestion) {
    try {
      const concept = await VeraTerminologyService.findConceptForQuestion(question);
      if (concept) {
        return {
          answer: concept.definition,
          skillUsed: 'fallback_concept_explanation',
          meta: { concept: concept.name }
        };
      }
    } catch (err) {
      console.warn('[VeraCoreEngine] Concept lookup error:', err.message);
    }
  }

  // 3) Last resort: say we need more context but stay in-bounds
  return {
    answer:
      'I need a bit more detail to give you a precise answer. ' +
      'Please tell me which standard (for example AS9100, AS9110, ISO 9001, or FAA Part 145) and, if applicable, the clause or process you are asking about.',
    skillUsed: 'fallback_generic',
    meta: {}
  };
}

/**
 * Run gap analysis - main entry point for /analyze routes
 */
export async function runGapAnalysis({
  tenantId,
  userId,
  standardId,
  customerDocumentId,
  options = {}
}) {
  // 1) Load standard requirements and customer document from the DB
  let standardRequirements = [];
  let customerProcedures = [];

  if (VeraRepository) {
    try {
      if (VeraRepository.getRequirementsForStandard) {
        standardRequirements = await VeraRepository.getRequirementsForStandard({
          tenantId,
          standardId
        });
      }
      
      if (VeraRepository.getProceduresForDocument) {
        customerProcedures = await VeraRepository.getProceduresForDocument({
          tenantId,
          customerDocumentId
        });
      }
    } catch (err) {
      console.error('[VeraCoreEngine] Error loading requirements/procedures:', err.message);
    }
  }

  // 2) Run compliance reasoning using local reasoning engine
  let analysis = { summary: '', gaps: [], coverage: {} };
  if (VeraReasoningComplianceAnalyzer && VeraReasoningComplianceAnalyzer.analyze) {
    try {
      analysis = await VeraReasoningComplianceAnalyzer.analyze({
        tenantId,
        userId,
        standardRequirements,
        customerProcedures,
        options
      });
    } catch (err) {
      console.error('[VeraCoreEngine] Compliance analysis error:', err.message);
    }
  }

  // 3) Optionally call learning engine to record how this analysis went
  try {
    const VeraLearningEngine = await import('../services/vera/VeraLearningEngine.js').catch(() => null);
    if (VeraLearningEngine && VeraLearningEngine.default && VeraLearningEngine.default.recordAnalysisEvent) {
      await VeraLearningEngine.default.recordAnalysisEvent({
        tenantId,
        userId,
        standardId,
        customerDocumentId,
        analysis
      }).catch(() => { /* non-fatal */ });
    }
  } catch (err) {
    // Learning engine not available or failed - non-fatal
  }

  // 4) Use VeraResponseGenerator to build a structured gap report
  let reportText = '';
  if (VeraResponseGenerator && VeraResponseGenerator.generateGapReport) {
    try {
      reportText = await VeraResponseGenerator.generateGapReport({
        standardRequirements,
        customerProcedures,
        analysis
      });
    } catch (err) {
      console.warn('[VeraCoreEngine] Gap report generation error:', err.message);
      reportText = `Analysis completed. Found ${analysis.gaps?.length || 0} gaps.`;
    }
  } else {
    reportText = `Analysis completed. Found ${analysis.gaps?.length || 0} gaps.`;
  }

  return {
    summary: analysis.summary,
    gaps: analysis.gaps,
    coverage: analysis.coverage,
    answer: reportText
  };
}

export default {
  processUserMessage,
  runGapAnalysis
};

