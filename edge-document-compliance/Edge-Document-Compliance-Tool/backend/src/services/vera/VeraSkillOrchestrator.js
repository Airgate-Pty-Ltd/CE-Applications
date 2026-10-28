/**
 * Vera Skill Orchestrator
 * Routes user queries to appropriate Vera services based on intent and context
 * Ensures all advanced engines are properly invoked
 */

import VeraQueryParser from './VeraQueryParser.js';
import VeraContextManager from './VeraContextManager.js';
import veraAdvancedReasoningEngine from './VeraAdvancedReasoningEngine.js';
import VeraVectorEngine from './VeraVectorEngine.js';
import VeraRegulatoryLookup from './VeraRegulatoryLookup.js';
import StandardsIntelligenceService from './StandardsIntelligenceService.js';
import VeraComprehensiveResearcher from './VeraComprehensiveResearcher.js';
import VeraRepository from './VeraRepository.js';
import { queryEdcatAI, queryPostgres } from '../../config/databases.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

class VeraSkillOrchestrator {
  constructor() {
    this.queryParser = VeraQueryParser;
    this.contextManager = VeraContextManager;
    this.reasoningEngine = veraAdvancedReasoningEngine; // Note: lowercase, it's an instance
    this.vectorEngine = VeraVectorEngine;
    this.regulatoryLookup = VeraRegulatoryLookup;
    this.standardsService = StandardsIntelligenceService;
    this.researcher = VeraComprehensiveResearcher;
  }

  /**
   * Main orchestration method
   * Routes query through appropriate skills and combines results
   */
  async orchestrate(userQuery, context, conversationContext) {
    const {
      userId,
      tenantId = DEFAULT_TENANT_ID,
      conversationId,
      standards = [],
      documents = []
    } = context;

    // STEP 1: Parse the query
    const parsedQuery = await this.parseQuery(userQuery, context);
    
    // STEP 2: Load/update conversation context
    let veraContext = null;
    if (conversationId) {
      veraContext = await this.contextManager.getContextByConversationId(conversationId);
      if (!veraContext) {
        veraContext = await this.contextManager.initializeContext(
          conversationId,
          userId,
          tenantId
        );
      }
      
      // Update context with current query
      await this.contextManager.recordUserInput(
        veraContext.context_id,
        userQuery
      );
    }

    // STEP 3: Determine which skills to invoke
    const skills = this.determineSkills(parsedQuery, context, veraContext);
    
    // STEP 4: Execute skills in parallel where possible
    const skillResults = await this.executeSkills(skills, parsedQuery, context, veraContext);
    
    // STEP 5: Combine results
    const combinedResult = this.combineResults(skillResults, parsedQuery, context);
    
    // STEP 6: Update context with results
    if (veraContext) {
      await this.contextManager.recordVeraResponse(
        veraContext.context_id,
        combinedResult.response
      );
      
      // Update task progress
      if (combinedResult.task) {
        await this.contextManager.updateTaskProgress(
          veraContext.context_id,
          combinedResult.task,
          combinedResult.progress || 0.5
        );
      }
    }
    
    return combinedResult;
  }

  /**
   * Parse user query using VeraQueryParser
   */
  async parseQuery(userQuery, context) {
    try {
      // Use query parser to extract intent and components
      const parsed = {
        rawQuery: userQuery,
        lowerQuery: userQuery.toLowerCase(),
        intent: null,
        standardCode: null,
        clauseNumber: null,
        regulatoryCode: null,
        partNumber: null,
        isClauseQuery: false,
        isRegulatoryQuery: false,
        isResearchQuery: false,
        isGapAnalysisQuery: false
      };

      // Detect clause queries (e.g., "What does 8.7 say?", "Show clause 4.1")
      const clauseMatch = userQuery.match(/(?:clause|section|requirement)\s*([\d]+\.[\d]+(?:\.[\d]+)*)/i);
      if (clauseMatch) {
        parsed.clauseNumber = clauseMatch[1];
        parsed.isClauseQuery = true;
        parsed.intent = 'clause_lookup';
      }

      // Detect standard codes (ISO 9001, AS9100, etc.)
      const standardMatch = userQuery.match(/(?:iso|as|iatf)[\s\-+]*(\d{4,5})/i);
      if (standardMatch) {
        const number = standardMatch[1];
        const prefixMatch = userQuery.match(/(iso|as|iatf)/i);
        const prefix = prefixMatch ? prefixMatch[1].toLowerCase() : 'iso';
        parsed.standardCode = `${prefix.toUpperCase()}${number}`;
      }

      // Detect regulatory queries (FAA Part 21, CASA Part 21, etc.)
      const regulatoryMatch = userQuery.match(/(casa|faa|easa|caac)(?:\s+part\s+(\d+))?/i);
      if (regulatoryMatch) {
        parsed.regulatoryCode = regulatoryMatch[1].toUpperCase();
        parsed.partNumber = regulatoryMatch[2];
        parsed.isRegulatoryQuery = true;
        parsed.intent = 'regulatory_lookup';
      }

      // Detect research queries
      if (parsed.lowerQuery.includes('research') || 
          parsed.lowerQuery.includes('find') ||
          parsed.lowerQuery.includes('look up') ||
          parsed.lowerQuery.includes('tell me about')) {
        parsed.isResearchQuery = true;
        parsed.intent = 'research';
      }

      // Detect gap analysis queries
      if (parsed.lowerQuery.includes('gap') || 
          parsed.lowerQuery.includes('missing') ||
          parsed.lowerQuery.includes('nonconform') ||
          parsed.lowerQuery.includes('compliance gap')) {
        parsed.isGapAnalysisQuery = true;
        parsed.intent = 'gap_analysis';
      }

      // Use advanced reasoning to refine intent if not clear
      if (!parsed.intent || parsed.intent === 'clause_lookup') {
        const reasoning = await this.reasoningEngine.reason(userQuery, context, {
          useMultiStep: false,
          useSelfValidation: false,
          useContextMemory: false,
          maxSteps: 1
        });
        
        if (reasoning && reasoning.intent) {
          parsed.intent = reasoning.intent;
        }
      }

      return parsed;
    } catch (error) {
      console.error('[VeraSkillOrchestrator] Error parsing query:', error);
      return {
        rawQuery: userQuery,
        lowerQuery: userQuery.toLowerCase(),
        intent: 'general_query',
        error: error.message
      };
    }
  }

  /**
   * Determine which skills to invoke based on parsed query
   */
  determineSkills(parsedQuery, context, veraContext) {
    const skills = [];

    // Clause lookup skill
    if (parsedQuery.isClauseQuery && parsedQuery.clauseNumber) {
      skills.push({
        name: 'clause_lookup',
        priority: 10,
        requires: ['standardsService']
      });
    }

    // Regulatory lookup skill
    if (parsedQuery.isRegulatoryQuery) {
      skills.push({
        name: 'regulatory_lookup',
        priority: 9,
        requires: ['regulatoryLookup']
      });
    }

    // Research skill
    if (parsedQuery.isResearchQuery) {
      skills.push({
        name: 'research',
        priority: 8,
        requires: ['researcher']
      });
    }

    // Gap analysis skill
    if (parsedQuery.isGapAnalysisQuery) {
      skills.push({
        name: 'gap_analysis',
        priority: 7,
        requires: ['vectorEngine', 'reasoningEngine']
      });
    }

    // Semantic similarity skill (for procedure-requirement matching)
    if (context.documents && context.documents.length > 0 && context.standards && context.standards.length > 0) {
      skills.push({
        name: 'semantic_similarity',
        priority: 5,
        requires: ['vectorEngine']
      });
    }

    // Advanced reasoning skill (always available for complex queries)
    if (!parsedQuery.intent || parsedQuery.intent === 'general_query') {
      skills.push({
        name: 'advanced_reasoning',
        priority: 3,
        requires: ['reasoningEngine']
      });
    }

    // Sort by priority
    skills.sort((a, b) => b.priority - a.priority);

    return skills;
  }

  /**
   * Execute selected skills
   */
  async executeSkills(skills, parsedQuery, context, veraContext) {
    const results = {};

    for (const skill of skills) {
      try {
        switch (skill.name) {
          case 'clause_lookup':
            results.clauseLookup = await this.executeClauseLookup(parsedQuery, context);
            break;

          case 'regulatory_lookup':
            results.regulatoryLookup = await this.executeRegulatoryLookup(parsedQuery, context);
            break;

          case 'research':
            results.research = await this.executeResearch(parsedQuery, context);
            break;

          case 'gap_analysis':
            results.gapAnalysis = await this.executeGapAnalysis(parsedQuery, context);
            break;

          case 'semantic_similarity':
            results.semanticSimilarity = await this.executeSemanticSimilarity(parsedQuery, context);
            break;

          case 'advanced_reasoning':
            results.advancedReasoning = await this.executeAdvancedReasoning(parsedQuery, context, veraContext);
            break;
        }
      } catch (error) {
        console.error(`[VeraSkillOrchestrator] Error executing skill ${skill.name}:`, error);
        results[skill.name] = { error: error.message };
      }
    }

    return results;
  }

  /**
   * Execute clause lookup skill
   */
  async executeClauseLookup(parsedQuery, context) {
    const { standards = [] } = context;
    const { clauseNumber, standardCode } = parsedQuery;

    // Find target standard
    let targetStandard = null;
    if (standardCode) {
      targetStandard = standards.find(s => {
        const normalized = s.code.toLowerCase().replace(/[^a-z0-9]/g, '');
        const searchNormalized = standardCode.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalized.includes(searchNormalized) || searchNormalized.includes(normalized);
      });
    } else if (standards.length > 0) {
      targetStandard = standards[0];
    }

    if (!targetStandard) {
      return {
        success: false,
        error: 'No standard found',
        message: 'I need a standard to look up clauses. Please specify which standard you\'re asking about.'
      };
    }

    // Use StandardsIntelligenceService to get clause
    const requirement = await this.standardsService.getRequirementByClause(
      targetStandard.id,
      clauseNumber
    );

    if (requirement) {
      return {
        success: true,
        requirement,
        standard: targetStandard,
        clauseNumber
      };
    } else {
      // Try to get all requirements for the clause (parent clause)
      // Use VeraRepository directly since getRequirementsForClause is there
      const requirements = await VeraRepository.Standards.getRequirementsForClause(
        targetStandard.id,
        clauseNumber
      );

      if (requirements.length > 0) {
        return {
          success: true,
          requirements,
          standard: targetStandard,
          clauseNumber,
          isParentClause: true
        };
      }

      return {
        success: false,
        error: 'Clause not found',
        message: `I couldn't find clause ${clauseNumber} in ${targetStandard.code}. This might mean the clause doesn't exist in this standard revision, or the standard needs to be parsed first.`
      };
    }
  }

  /**
   * Execute regulatory lookup skill
   */
  async executeRegulatoryLookup(parsedQuery, context) {
    const { regulatoryCode, partNumber } = parsedQuery;

    try {
      // Use findRegulatoryRequirements method
      const lookup = await this.regulatoryLookup.findRegulatoryRequirements(
        regulatoryCode,
        'aerospace', // Default industry, could be extracted from query
        null // productType
      );
      return {
        success: true,
        lookup
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute research skill
   */
  async executeResearch(parsedQuery, context) {
    const { rawQuery, standardCode, regulatoryCode } = parsedQuery;

    try {
      // Parse the research request first
      const parsedRequest = await this.queryParser.parseResearchRequest(rawQuery);
      
      if (parsedRequest.error || parsedRequest.clarification_needed) {
        return {
          success: false,
          error: parsedRequest.error || 'Clarification needed',
          message: parsedRequest.message || parsedRequest.clarification_needed
        };
      }

      // Execute comprehensive research
      const researchResult = await this.researcher.executeComprehensiveResearch(parsedRequest);
      return {
        success: true,
        research: researchResult
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute gap analysis skill
   */
  async executeGapAnalysis(parsedQuery, context) {
    const { standards = [], documents = [] } = context;

    if (standards.length === 0 || documents.length === 0) {
      return {
        success: false,
        error: 'Missing prerequisites',
        message: 'I need both standards and documents to perform gap analysis.'
      };
    }

    // For now, return a placeholder - gap analysis requires more complex logic
    // This should be handled by the ComplianceGapAnalyzer service
    return {
      success: false,
      error: 'Gap analysis requires ComplianceGapAnalyzer service',
      message: 'Gap analysis is available through the ComplianceGap feature. Please use the analyze standard/procedures commands.'
    };
  }

  /**
   * Execute semantic similarity skill
   */
  async executeSemanticSimilarity(parsedQuery, context) {
    const { standards = [], documents = [] } = context;

    if (standards.length === 0) {
      return { success: false, error: 'Missing prerequisites' };
    }

    // Use vector engine to find similar requirements
    try {
      const similarities = await this.vectorEngine.findSimilarRequirements(
        standards[0].id
      );

      return {
        success: true,
        similarities
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute advanced reasoning skill
   */
  async executeAdvancedReasoning(parsedQuery, context, veraContext) {
    try {
      const reasoning = await this.reasoningEngine.reason(
        parsedQuery.rawQuery,
        context,
        {
          useMultiStep: true,
          useSelfValidation: true,
          useContextMemory: veraContext !== null,
          maxSteps: 3
        }
      );

      return {
        success: true,
        reasoning
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Combine skill results into final response
   */
  combineResults(skillResults, parsedQuery, context) {
    // Prioritize clause lookup results
    if (skillResults.clauseLookup && skillResults.clauseLookup.success) {
      const { requirement, requirements, standard, clauseNumber, isParentClause } = skillResults.clauseLookup;
      
      if (requirement) {
        return {
          response: this.formatClauseResponse(requirement, standard, clauseNumber),
          task: 'clause_lookup',
          progress: 1.0,
          data: { requirement, standard, clauseNumber }
        };
      } else if (requirements && requirements.length > 0) {
        return {
          response: this.formatClauseListResponse(requirements, standard, clauseNumber),
          task: 'clause_lookup',
          progress: 1.0,
          data: { requirements, standard, clauseNumber }
        };
      }
    }

    // Prioritize regulatory lookup results
    if (skillResults.regulatoryLookup && skillResults.regulatoryLookup.success) {
      return {
        response: this.formatRegulatoryResponse(skillResults.regulatoryLookup.lookup),
        task: 'regulatory_lookup',
        progress: 1.0,
        data: skillResults.regulatoryLookup.lookup
      };
    }

    // Use research results
    if (skillResults.research && skillResults.research.success) {
      return {
        response: this.formatResearchResponse(skillResults.research.research),
        task: 'research',
        progress: 1.0,
        data: skillResults.research.research
      };
    }

    // Use gap analysis results
    if (skillResults.gapAnalysis && skillResults.gapAnalysis.success) {
      return {
        response: this.formatGapAnalysisResponse(skillResults.gapAnalysis),
        task: 'gap_analysis',
        progress: 1.0,
        data: skillResults.gapAnalysis
      };
    }

    // Fall back to advanced reasoning
    if (skillResults.advancedReasoning && skillResults.advancedReasoning.success) {
      return {
        response: skillResults.advancedReasoning.reasoning.finalOutput || null, // Don't use generic fallback - let conversational engine handle it
        task: 'general_query',
        progress: 0.5,
        data: skillResults.advancedReasoning.reasoning
      };
    }

    // Default response
    return {
      response: null, // Don't return generic response - let conversational engine handle it with proper routing
      task: 'general_query',
      progress: 0.3
    };
  }

  /**
   * Format clause response
   */
  formatClauseResponse(requirement, standard, clauseNumber) {
    let response = `**Clause ${clauseNumber}: ${requirement.clause_title || 'Requirement'}**\n\n`;
    response += `${requirement.requirement_text || requirement.text || 'Requirement details available.'}\n\n`;
    
    if (requirement.confidence && requirement.confidence < 0.8) {
      response += `⚠️ Note: This extraction has ${(requirement.confidence * 100).toFixed(0)}% confidence. `;
      response += `You may want to verify against the original standard document.\n\n`;
    }
    
    response += `**Would you like me to:**\n`;
    response += `• Extract all requirements for this clause (table format)?\n`;
    response += `• Show related clauses?\n`;
    response += `• Check if your procedures cover this requirement?\n`;
    
    return response;
  }

  /**
   * Format clause list response
   */
  formatClauseListResponse(requirements, standard, clauseNumber) {
    let response = `**Clause ${clauseNumber} Requirements from ${standard.code}**\n\n`;
    response += `Found ${requirements.length} requirement(s):\n\n`;
    
    requirements.slice(0, 10).forEach((req, idx) => {
      response += `${idx + 1}. ${req.requirement_text || req.text || 'N/A'}\n`;
    });
    
    if (requirements.length > 10) {
      response += `\n...and ${requirements.length - 10} more requirement(s).\n`;
    }
    
    return response;
  }

  /**
   * Format regulatory response
   */
  formatRegulatoryResponse(lookup) {
    let response = `**${lookup.regulation_name || 'Regulatory Information'}**\n\n`;
    if (lookup.description) {
      response += `${lookup.description}\n\n`;
    }
    if (lookup.requirements && lookup.requirements.length > 0) {
      response += `**Key Requirements:**\n`;
      lookup.requirements.slice(0, 5).forEach(req => {
        response += `• ${req}\n`;
      });
    }
    return response;
  }

  /**
   * Format research response
   */
  formatResearchResponse(research) {
    let response = `**Research Results**\n\n`;
    if (research.summary) {
      response += `${research.summary}\n\n`;
    }
    if (research.keyFindings && research.keyFindings.length > 0) {
      response += `**Key Findings:**\n`;
      research.keyFindings.slice(0, 5).forEach(finding => {
        response += `• ${finding}\n`;
      });
    }
    return response;
  }

  /**
   * Format gap analysis response
   */
  formatGapAnalysisResponse(gapAnalysis) {
    const { matches = [], gaps = [] } = gapAnalysis;
    let response = `**Gap Analysis Results**\n\n`;
    response += `**Coverage:** ${matches.length - gaps.length}/${matches.length} requirements covered\n\n`;
    
    if (gaps.length > 0) {
      response += `**Gaps Found:**\n`;
      gaps.slice(0, 5).forEach(gap => {
        response += `• ${gap.requirement_text || 'N/A'} (confidence: ${(gap.confidence * 100).toFixed(0)}%)\n`;
      });
    }
    
    return response;
  }
}

export default new VeraSkillOrchestrator();

