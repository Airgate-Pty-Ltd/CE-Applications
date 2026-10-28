/**
 * Vera Response Generator
 * Generate natural, context-aware responses with professional consultant tone
 */

import { queryEdcatAI } from '../../config/databases.js';
import VeraProfessionalFormatter from './VeraProfessionalFormatter.js';
import VeraProfessionalLanguage from './VeraProfessionalLanguage.js';

const VeraResponseGenerator = {

  async selectTemplate(responseType, confidence, context, ambiguousCount = 0) {
    try {
      // Find best template for this situation
      const template = await queryEdcatAI(
        `SELECT * FROM edcat.vera_response_templates
         WHERE template_category = $1
         AND active = TRUE
         AND (confidence_range_min IS NULL OR $2 >= confidence_range_min)
         AND (confidence_range_max IS NULL OR $2 <= confidence_range_max)
         AND (min_ambiguous_items IS NULL OR $3 >= min_ambiguous_items)
         AND (max_ambiguous_items IS NULL OR $3 <= max_ambiguous_items)
         ORDER BY times_used DESC, avg_user_satisfaction DESC NULLS LAST
         LIMIT 1`,
        [responseType, confidence, ambiguousCount]
      );

      if (template.rows.length === 0) {
        // Fallback to generic template
        const fallback = await queryEdcatAI(
          `SELECT * FROM edcat.vera_response_templates 
           WHERE template_category = $1 AND active = TRUE
           ORDER BY priority DESC NULLS LAST LIMIT 1`,
          [responseType]
        );
        return fallback.rows[0] || null;
      }

      return template.rows[0];
    } catch (error) {
      console.error('[VeraResponseGenerator] Error selecting template:', error.message);
      return null;
    }
  },

  async generateResponse(template, replacements = {}, options = {}) {
    if (!template) {
      return VeraProfessionalLanguage.getOpening(replacements.STANDARD || 'the standard');
    }

    let response = template.template_text || template.template_text;

    // Replace placeholders
    Object.keys(replacements).forEach(key => {
      const placeholder = `[${key.toUpperCase()}]`;
      const value = replacements[key] || '';
      response = response.replace(new RegExp(placeholder, 'g'), value);
    });

    // Pick a variant if available (for variety)
    if (template.template_variants && template.template_variants.length > 0) {
      const shouldUseVariant = Math.random() > 0.7; // 30% of time
      if (shouldUseVariant) {
        const variant = template.template_variants[
          Math.floor(Math.random() * template.template_variants.length)
        ];
        // For variants, use variant but keep core info
        if (variant) {
          let variantResponse = variant;
          Object.keys(replacements).forEach(key => {
            const placeholder = `[${key.toUpperCase()}]`;
            variantResponse = variantResponse.replace(new RegExp(placeholder, 'g'), replacements[key] || '');
          });
          response = variantResponse;
        }
      }
    }

    // Apply professional language sanitization
    response = VeraProfessionalLanguage.sanitizeLanguage(response);

    // If this is a gap analysis response, format it professionally
    if (options.isGapAnalysis && options.analysis) {
      const formatted = VeraProfessionalFormatter.formatGapAnalysisResponse(options.analysis);
      return formatted.narrative || response;
    }

    return response;
  },

  /**
   * Generate a professional gap analysis response
   */
  async generateGapAnalysisResponse(analysis, standard, companyName) {
    const formatted = VeraProfessionalFormatter.formatGapAnalysisResponse(analysis);
    
    // Build complete narrative
    let narrative = `═══════════════════════════════════════════════\n`;
    narrative += `${companyName || 'Your Company'} - ${standard || 'Standard'} GAP ANALYSIS\n`;
    narrative += `Analyzed: ${new Date().toLocaleDateString()}\n`;
    narrative += `Analyst: Vera\n`;
    narrative += `═══════════════════════════════════════════════\n\n`;
    
    narrative += formatted.narrative;
    
    narrative += `\n\n${VeraProfessionalFormatter.formatClosing(analysis)}`;
    
    return narrative;
  },

  /**
   * Generate a professional clarification question
   */
  async generateClarificationQuestion(item) {
    return VeraProfessionalFormatter.formatClarificationQuestion(item);
  },

  /**
   * Generate a professional gap finding
   */
  async generateGapFinding(gap) {
    return VeraProfessionalFormatter.formatGapFinding(gap);
  },

  async recordResponseGiven(conversationId, veraMessageId, responseData) {
    try {
      const result = await queryEdcatAI(
        `INSERT INTO edcat.vera_response_effectiveness
         (conversation_id, vera_message_id, response_text, response_type, 
          response_template_id, tone_used, detail_level_used, vera_confidence_in_response)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING effectiveness_id`,
        [conversationId, veraMessageId, responseData.response_text, responseData.response_type,
         responseData.template_id, responseData.tone, responseData.detail_level,
         responseData.vera_confidence]
      );
      return result.rows[0]?.effectiveness_id;
    } catch (error) {
      console.error('[VeraResponseGenerator] Error recording response:', error.message);
      return null;
    }
  },

  async getContextualTemplate(userExpertise, tone) {
    // Get template variant appropriate for user level
    const query = userExpertise === 'expert' 
      ? 'expert_version'
      : userExpertise === 'novice'
      ? 'novice_version'
      : 'template_text';

    return query;
  },

  async updateTemplateEffectiveness(templateId, satisfactionRating, hadFollowUp) {
    try {
      // Update template usage stats
      await queryEdcatAI(
        `UPDATE vera_response_templates 
         SET times_used = times_used + 1,
             avg_user_satisfaction = COALESCE(
               (avg_user_satisfaction * times_used + $1) / (times_used + 1),
               $1
             ),
             user_follow_up_rate = COALESCE(
               (user_follow_up_rate * times_used + CASE WHEN $2 THEN 1.0 ELSE 0.0 END) / (times_used + 1),
               CASE WHEN $2 THEN 1.0 ELSE 0.0 END
             ),
             last_satisfaction_check = NOW(),
             updated_at = NOW()
         WHERE template_id = $3`,
        [satisfactionRating, hadFollowUp, templateId]
      );
    } catch (error) {
      console.error('[VeraResponseGenerator] Error updating template effectiveness:', error.message);
    }
  },

  /**
   * Generate audit preparation summary
   * Provides structured summary for audit readiness
   */
  async generateAuditPrepSummary(analysisReasoningResult, options = {}) {
    const { mode = 'friendly' } = options;
    const { gaps = [], coverage = {}, reasoning = {} } = analysisReasoningResult || {};

    // Identify high-risk requirements
    const criticalGaps = gaps.filter(g => g.severity === 'critical');
    const majorGaps = gaps.filter(g => g.severity === 'major');
    const minorGaps = gaps.filter(g => g.severity === 'minor');

    // Categorize gaps by type
    const gapTypes = {};
    gaps.forEach(gap => {
      const type = gap.gapType || 'general';
      gapTypes[type] = (gapTypes[type] || 0) + 1;
    });

    // Build executive overview
    let summary = '';
    
    if (mode === 'regulator_safe') {
      summary = `AUDIT PREPARATION SUMMARY\n`;
      summary += `═══════════════════════════════════════════════\n\n`;
      summary += `EXECUTIVE OVERVIEW\n`;
      summary += `Total Requirements Analyzed: ${coverage.total || 0}\n`;
      summary += `Compliance Coverage: ${coverage.percentage || 0}%\n`;
      summary += `Critical Gaps: ${criticalGaps.length}\n`;
      summary += `Major Gaps: ${majorGaps.length}\n`;
      summary += `Minor Gaps: ${minorGaps.length}\n\n`;
    } else if (mode === 'formal') {
      summary = `# Audit Preparation Summary\n\n`;
      summary += `## Executive Overview\n\n`;
      summary += `Based on analysis of ${coverage.total || 0} requirements, overall compliance coverage is ${coverage.percentage || 0}%.\n\n`;
      summary += `**Gap Summary:**\n`;
      summary += `- Critical: ${criticalGaps.length}\n`;
      summary += `- Major: ${majorGaps.length}\n`;
      summary += `- Minor: ${minorGaps.length}\n\n`;
    } else {
      summary = `Here's your audit preparation summary:\n\n`;
      summary += `I've analyzed ${coverage.total || 0} requirements, and your compliance coverage is ${coverage.percentage || 0}%.\n\n`;
      summary += `**Gap Summary:**\n`;
      summary += `- ${criticalGaps.length} critical gaps requiring immediate attention\n`;
      summary += `- ${majorGaps.length} major gaps\n`;
      summary += `- ${minorGaps.length} minor gaps\n\n`;
    }

    // Key risk areas
    if (criticalGaps.length > 0 || majorGaps.length > 0) {
      summary += mode === 'regulator_safe' ? `KEY RISK AREAS\n` : `## Key Risk Areas\n\n`;
      summary += `The following areas require priority attention:\n\n`;

      criticalGaps.slice(0, 5).forEach((gap, idx) => {
        summary += `${idx + 1}. ${gap.clauseNumber || 'Unknown clause'}: ${gap.gapDescription || 'Critical gap identified'}\n`;
      });

      if (majorGaps.length > 0 && criticalGaps.length < 5) {
        majorGaps.slice(0, 5 - criticalGaps.length).forEach((gap, idx) => {
          summary += `${criticalGaps.length + idx + 1}. ${gap.clauseNumber || 'Unknown clause'}: ${gap.gapDescription || 'Major gap identified'}\n`;
        });
      }
      summary += `\n`;
    }

    // Short-term corrective focus
    summary += mode === 'regulator_safe' ? `SHORT-TERM CORRECTIVE FOCUS\n` : `## Short-Term Corrective Focus\n\n`;
    summary += `Priority actions before audit:\n\n`;
    summary += `1. Address critical gaps immediately\n`;
    summary += `2. Establish documented evidence for key requirements\n`;
    summary += `3. Ensure records are complete and accessible\n`;
    summary += `4. Verify personnel are trained and competent\n`;
    summary += `5. Review and update procedures as needed\n\n`;

    // Long-term systemic improvements
    summary += mode === 'regulator_safe' ? `LONG-TERM SYSTEMIC IMPROVEMENTS\n` : `## Long-Term Systemic Improvements\n\n`;
    summary += `Recommended ongoing improvements:\n\n`;
    summary += `1. Strengthen risk-based thinking throughout the organization\n`;
    summary += `2. Improve internal audit effectiveness\n`;
    summary += `3. Enhance management review processes\n`;
    summary += `4. Establish continuous improvement culture\n`;
    summary += `5. Regular gap analysis and monitoring\n\n`;

    // Gap type distribution
    if (Object.keys(gapTypes).length > 0) {
      summary += mode === 'regulator_safe' ? `GAP TYPE DISTRIBUTION\n` : `## Gap Type Distribution\n\n`;
      Object.entries(gapTypes).forEach(([type, count]) => {
        summary += `- ${type}: ${count}\n`;
      });
      summary += `\n`;
    }

    return summary;
  }
};

export default VeraResponseGenerator;

