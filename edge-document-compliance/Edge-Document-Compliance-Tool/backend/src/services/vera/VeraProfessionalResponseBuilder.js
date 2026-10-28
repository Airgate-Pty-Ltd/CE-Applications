/**
 * Vera Professional Response Builder
 * Enhanced with persona-aware wrapping, cultural influence, and structured response envelope
 */

import VeraProfessionalFormatter from './VeraProfessionalFormatter.js';
import VeraProfessionalLanguage from './VeraProfessionalLanguage.js';
import edcatPersonality from '../edcatPersonality.js';

const VeraProfessionalResponseBuilder = {

  /**
   * Build response - main entry point (enhanced with persona support)
   */
  async build({ persona, parsedQuery, mainText, metadata = {} }) {
    // Step 1: Wrap main text in structured envelope
    let response = this.buildResponseEnvelope({
      mainText,
      parsedQuery,
      metadata
    });

    // Step 2: Apply persona-aware wrapping with cultural influence
    if (persona && persona.style) {
      const isHighFormality = edcatPersonality.detectHighFormalityContext(mainText, metadata);
      response = edcatPersonality.applyCulturalInfluence(persona, response, {
        isHighFormality,
        isFirstResponse: metadata.isFirstResponse || false,
        isClosing: metadata.isClosing || false,
        userPrefersFormal: metadata.userPrefersFormal || false
      });
    }

    // Step 3: Add key bullets if appropriate (for gap items / audit attention points)
    if (metadata.gaps && metadata.gaps.length > 0) {
      response += this.formatKeyBullets(metadata.gaps, parsedQuery);
    }

    // Step 4: Add clause references if available
    if (metadata.clauseReferences && metadata.clauseReferences.length > 0) {
      response += this.formatClauseReferences(metadata.clauseReferences);
    }

    // Step 5: Sanitize and return
    return VeraProfessionalLanguage.sanitizeLanguage(response);
  },

  /**
   * Build standard response envelope
   */
  buildResponseEnvelope({ mainText, parsedQuery, metadata }) {
    // Start with main text
    let envelope = mainText;

    // Add structured sections based on parsedQuery type
    if (parsedQuery && parsedQuery.type) {
      switch (parsedQuery.type) {
        case 'GAP_ANALYSIS':
          envelope = this.formatGapAnalysisEnvelope(mainText, metadata);
          break;
        case 'CLAUSE_EXPLANATION':
          envelope = this.formatClauseExplanationEnvelope(mainText, metadata);
          break;
        default:
          // Use mainText as-is for other types
          break;
      }
    }

    return envelope;
  },

  /**
   * Format gap analysis response envelope
   */
  formatGapAnalysisEnvelope(mainText, metadata) {
    const { standardCode, companyName } = metadata;
    let formatted = '';

    // Header
    if (companyName || standardCode) {
      formatted += `═══════════════════════════════════════════════\n`;
      formatted += `${companyName || 'Your Company'}${standardCode ? ` - ${standardCode}` : ''} GAP ANALYSIS\n`;
      formatted += `Analyzed: ${new Date().toLocaleDateString()}\n`;
      formatted += `═══════════════════════════════════════════════\n\n`;
    }

    formatted += mainText;
    return formatted;
  },

  /**
   * Format clause explanation envelope
   */
  formatClauseExplanationEnvelope(mainText, metadata) {
    // Clause explanations are typically already well-formatted
    // Just ensure they have proper structure
    return mainText;
  },

  /**
   * Format key bullets for gaps/audit attention points
   */
  formatKeyBullets(gaps, parsedQuery) {
    if (!gaps || gaps.length === 0) return '';

    let bullets = '\n\n**Key Points:**\n';
    const maxBullets = Math.min(gaps.length, 5); // Limit to 5 most important

    gaps.slice(0, maxBullets).forEach((gap, index) => {
      const severity = gap.severity || 'medium';
      const emoji = severity === 'critical' ? '🔴' : severity === 'major' ? '🟡' : '🟢';
      bullets += `${emoji} ${gap.description || gap.text || `Gap ${index + 1}`}\n`;
    });

    return bullets;
  },

  /**
   * Format clause references
   */
  formatClauseReferences(clauseReferences) {
    if (!clauseReferences || clauseReferences.length === 0) return '';

    let refs = '\n\n**References:**\n';
    clauseReferences.forEach(ref => {
      refs += `• ${ref.clause || ref}\n`;
    });

    return refs;
  },

  /**
   * Build a professional response for any Vera interaction (legacy method)
   */
  async buildResponse(context) {
    const { type, data, confidence, standard, companyName } = context;

    switch (type) {
      case 'gap_analysis':
        return this.buildGapAnalysisResponse(data, standard, companyName, confidence);
      
      case 'clarification_question':
        return this.buildClarificationQuestion(data, confidence);
      
      case 'gap_finding':
        return this.buildGapFinding(data, confidence);
      
      case 'uncertainty':
        return this.buildUncertaintyResponse(data, confidence);
      
      case 'progress_update':
        return this.buildProgressUpdate(data);
      
      case 'general_query':
        return this.buildGeneralResponse(data, confidence);
      
      default:
        return this.buildDefaultResponse(data);
    }
  },

  /**
   * Build gap analysis response
   */
  buildGapAnalysisResponse(analysis, standard, companyName, confidence) {
    const formatted = VeraProfessionalFormatter.formatGapAnalysisResponse(analysis);
    
    let response = `═══════════════════════════════════════════════\n`;
    response += `${companyName || 'Your Company'} - ${standard || 'Standard'} GAP ANALYSIS\n`;
    response += `Analyzed: ${new Date().toLocaleDateString()}\n`;
    response += `Analyst: Vera\n`;
    response += `═══════════════════════════════════════════════\n\n`;
    
    response += formatted.narrative;
    
    response += `\n\n${VeraProfessionalFormatter.formatClosing(analysis)}`;
    
    return response;
  },

  /**
   * Build clarification question
   */
  buildClarificationQuestion(item, confidence) {
    let response = VeraProfessionalLanguage.getUncertainty(confidence);
    response += `\n\n`;
    response += VeraProfessionalFormatter.formatClarificationQuestion(item);
    response += `\n\n${VeraProfessionalLanguage.getClosing(item.clarification_question)}`;
    
    return response;
  },

  /**
   * Build gap finding
   */
  buildGapFinding(gap, confidence) {
    let response = VeraProfessionalFormatter.formatGapFinding(gap);
    
    if (confidence < 0.75) {
      response += `\n${VeraProfessionalFormatter.formatConfidenceStatement(confidence, gap.confidence_reasoning || '')}`;
    }
    
    response += `\n\n${VeraProfessionalLanguage.getSolutionPhrase()}\n`;
    if (gap.remediation_options) {
      gap.remediation_options.forEach((option, index) => {
        response += `\nOption ${index + 1}: ${option.description}\n`;
        response += `Time: ${option.time}\n`;
        response += `Cost: ${option.cost}\n`;
      });
    }
    
    return response;
  },

  /**
   * Build uncertainty response
   */
  buildUncertaintyResponse(item, confidence) {
    return VeraProfessionalFormatter.formatUncertainty(confidence, item);
  },

  /**
   * Build research response
   */
  buildResearchResponse(researchData) {
    const {
      standardName,
      summary,
      introduction,
      keyFindings = [],
      requirements = [],
      whoApplies,
      challenges = [],
      takeaways = [],
      sourcesFound = 0,
      authoritativeSources = 0,
      confidence = 0.50
    } = researchData;

    let response = `**Research Results: ${standardName}**\n\n`;
    
    if (introduction) {
      response += `${introduction}\n\n`;
    } else if (summary) {
      response += `${summary}\n\n`;
    }

    if (keyFindings.length > 0) {
      response += `**Key Findings:**\n`;
      keyFindings.slice(0, 5).forEach((finding, idx) => {
        response += `${idx + 1}. ${finding}\n`;
      });
      response += `\n`;
    }

    if (requirements.length > 0) {
      response += `**Key Requirements:**\n`;
      requirements.slice(0, 5).forEach((req, idx) => {
        response += `${idx + 1}. ${req}\n`;
      });
      response += `\n`;
    }

    if (whoApplies) {
      response += `**Applies To:** ${whoApplies}\n\n`;
    }

    if (challenges.length > 0) {
      response += `**Common Challenges:**\n`;
      challenges.slice(0, 3).forEach((challenge, idx) => {
        response += `${idx + 1}. ${challenge}\n`;
      });
      response += `\n`;
    }

    if (takeaways.length > 0) {
      response += `**Key Takeaways:**\n`;
      takeaways.slice(0, 3).forEach((takeaway, idx) => {
        response += `${idx + 1}. ${takeaway}\n`;
      });
      response += `\n`;
    }

    if (sourcesFound > 0) {
      response += `**Sources:** ${sourcesFound} sources found`;
      if (authoritativeSources > 0) {
        response += `, ${authoritativeSources} authoritative sources`;
      }
      response += `\n`;
    }
    
    response += `**Confidence:** ${(confidence * 100).toFixed(0)}%\n\n`;

    response += `**Next Steps:**\n`;
    response += `• Would you like more detailed information about specific aspects?\n`;
    response += `• I can help you understand how this applies to your organization\n`;
    response += `• I can compare this with other standards you're working with\n`;
    response += `• I can help identify compliance gaps for this regulation`;

    return response;
  },

  /**
   * Build progress update
   */
  buildProgressUpdate(data) {
    const { previousAnalysis, currentAnalysis } = data;
    
    if (!previousAnalysis) {
      return 'This is your first analysis. Let\'s establish a baseline.';
    }
    
    const previousCoverage = VeraProfessionalFormatter.calculateCoverage(previousAnalysis);
    const currentCoverage = VeraProfessionalFormatter.calculateCoverage(currentAnalysis);
    const improvement = currentCoverage - previousCoverage;
    
    let response = `WHAT'S NOTABLE\n\n`;
    response += `Since we last analyzed you:\n\n`;
    
    if (improvement > 0) {
      response += `✓ Coverage improved from ${previousCoverage}% to ${currentCoverage}% (${improvement}% increase)\n`;
      response += `This shows real progress. Your team is taking this seriously.\n\n`;
    }
    
    if (data.improvements && data.improvements.length > 0) {
      response += `Specific improvements:\n`;
      data.improvements.forEach(improvement => {
        response += `• ${improvement}\n`;
      });
    }
    
    return response;
  },

  /**
   * Build general response
   */
  buildGeneralResponse(data, confidence) {
    let response = VeraProfessionalLanguage.getOpening(data.standard);
    response += `\n\n`;
    
    if (data.findings) {
      response += `Here's what I found:\n\n`;
      data.findings.forEach((finding, index) => {
        response += `${index + 1}. ${finding}\n`;
      });
    }
    
    if (confidence < 0.75) {
      response += `\n\n${VeraProfessionalFormatter.formatConfidenceStatement(confidence, data.confidence_reasoning)}`;
    }
    
    response += `\n\n${VeraProfessionalLanguage.getClosing()}`;
    
    return response;
  },

  /**
   * Build default response
   */
  buildDefaultResponse(data) {
    return `I'm here to help with compliance questions. ${VeraProfessionalLanguage.getOpening(data.standard || 'standards')}`;
  },

  /**
   * Sanitize response to remove chatbot language
   */
  sanitizeResponse(response) {
    return VeraProfessionalLanguage.sanitizeLanguage(response);
  },

  /**
   * Add professional context to any response
   */
  addContext(response, context) {
    if (!context) return response;
    
    let contextualized = response;
    
    if (context.industry) {
      contextualized = this.addIndustryContext(contextualized, context.industry);
    }
    
    if (context.previousConversation) {
      contextualized = this.addPreviousContext(contextualized, context.previousConversation);
    }
    
    if (context.shouldAcknowledge) {
      contextualized = `${VeraProfessionalLanguage.getAcknowledgment()}\n\n${contextualized}`;
    }
    
    return contextualized;
  },

  /**
   * Add industry-specific context
   */
  addIndustryContext(response, industry) {
    const industryContexts = {
      'aerospace': 'As an aerospace supplier, you know that AS9100D adds requirements to ISO 9001. ',
      'medical': 'Medical device companies often face stricter documentation requirements. ',
      'food': 'Food safety regulations overlap with ISO 22000, so closing gaps might satisfy multiple requirements. ',
      'automotive': 'Automotive suppliers need to meet IATF 16949 requirements in addition to ISO 9001. '
    };
    
    const context = industryContexts[industry.toLowerCase()] || '';
    if (context) {
      return context + response;
    }
    
    return response;
  },

  /**
   * Add previous conversation context
   */
  addPreviousContext(response, previousConversation) {
    if (previousConversation.topics && previousConversation.topics.length > 0) {
      return `Last time we talked, you mentioned ${previousConversation.topics[0]}. That's valuable context.\n\n${response}`;
    }
    return response;
  }
};

export default VeraProfessionalResponseBuilder;
