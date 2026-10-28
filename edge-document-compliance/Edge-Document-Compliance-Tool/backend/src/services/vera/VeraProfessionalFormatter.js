/**
 * Vera Professional Formatter
 * Formats responses to feel like an expert consultant, not a chatbot
 */

const VeraProfessionalFormatter = {

  /**
   * Format a gap analysis response professionally
   */
  formatGapAnalysisResponse(analysis) {
    const coverage = this.calculateCoverage(analysis);
    const assessment = this.getAssessment(coverage);
    
    return {
      executive_summary: this.formatExecutiveSummary(analysis, coverage, assessment),
      strengths: this.formatStrengths(analysis.strong_areas || []),
      gaps: this.formatGaps(analysis.gaps || []),
      recommendations: this.formatRecommendations(analysis),
      clarifications_needed: this.formatClarifications(analysis.ambiguous_items || []),
      narrative: this.formatAsNarrative(analysis, coverage, assessment)
    };
  },

  /**
   * Format executive summary
   */
  formatExecutiveSummary(analysis, coverage, assessment) {
    const confidence = analysis.average_confidence || 0.75;
    const timeline = this.estimateTimeline(analysis);
    
    return `EXECUTIVE SUMMARY

I've reviewed your procedures against ${analysis.standard || 'the standard'}. 
You have ${coverage}% coverage—${assessment}.

Coverage: ${analysis.covered_count || 0} of ${analysis.total_requirements || 0} requirements
Status: ${this.getStatusDescription(coverage)}
My confidence: ${Math.round(confidence * 100)}%
Estimated remediation: ${timeline}

${this.getConfidenceExplanation(confidence)}`;
  },

  /**
   * Format strengths section
   */
  formatStrengths(strongAreas) {
    if (!strongAreas || strongAreas.length === 0) {
      return 'YOUR STRONGEST AREAS\n\nYou have a solid foundation. Let me identify specific strengths as I analyze further.';
    }

    let output = 'YOUR STRONGEST AREAS\n\n';
    output += 'These are done well:\n\n';

    strongAreas.slice(0, 5).forEach((area, index) => {
      output += `✓ ${area.name || area.requirement}\n`;
      if (area.explanation) {
        output += `  ${area.explanation}\n`;
      }
      if (area.evidence) {
        output += `  Evidence: ${area.evidence}\n`;
      }
      output += '\n';
    });

    return output;
  },

  /**
   * Format gaps section professionally
   */
  formatGaps(gaps) {
    if (!gaps || gaps.length === 0) {
      return 'YOUR GAPS\n\nNo significant gaps identified. Your procedures appear comprehensive.';
    }

    let output = 'YOUR GAPS\n\n';
    output += 'These need attention:\n\n';

    gaps.slice(0, 10).forEach((gap, index) => {
      output += `⚠ ${gap.name || gap.requirement}\n\n`;
      
      if (gap.iso_requirement) {
        output += `The requirement:\n${gap.iso_requirement}\n\n`;
      }
      
      if (gap.current_state) {
        output += `What you're doing:\n${gap.current_state}\n\n`;
      }
      
      if (gap.gap_specific) {
        output += `What's missing:\n${gap.gap_specific}\n\n`;
      }
      
      if (gap.business_impact) {
        output += `Why it matters:\n${gap.business_impact}\n\n`;
      }
      
      if (gap.severity) {
        output += `Severity: ${this.formatSeverity(gap.severity)}\n`;
      }
      
      if (gap.remediation_steps) {
        output += `How to close it:\n${gap.remediation_steps}\n`;
      }
      
      if (gap.estimated_time) {
        output += `Timeline: ${gap.estimated_time}\n`;
      }
      
      output += '\n─────────────────────────────────────────────\n\n';
    });

    return output;
  },

  /**
   * Format recommendations
   */
  formatRecommendations(analysis) {
    const gaps = analysis.gaps || [];
    if (gaps.length === 0) {
      return 'RECOMMENDED ACTIONS\n\nYour procedures are in good shape. Continue maintaining your current approach.';
    }

    let output = 'RECOMMENDED ACTIONS\n\n';
    output += 'I recommend we focus on:\n\n';

    // Prioritize by severity
    const prioritized = gaps
      .filter(g => g.severity)
      .sort((a, b) => {
        const severityOrder = { 'critical': 4, 'major': 3, 'moderate': 2, 'minor': 1 };
        return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      })
      .slice(0, 5);

    prioritized.forEach((gap, index) => {
      output += `${index + 1}. ${gap.name || gap.requirement}\n`;
      if (gap.remediation_steps) {
        output += `   ${gap.remediation_steps}\n`;
      }
      output += '\n';
    });

    return output;
  },

  /**
   * Format clarification questions professionally
   */
  formatClarifications(ambiguousItems) {
    if (!ambiguousItems || ambiguousItems.length === 0) {
      return '';
    }

    let output = 'QUESTIONS FOR YOU\n\n';
    output += 'Before I finalize this assessment, I need clarity on:\n\n';

    ambiguousItems.slice(0, 5).forEach((item, index) => {
      output += `CLARIFICATION NEEDED: ${item.name || item.requirement}\n\n`;
      
      if (item.procedure) {
        output += `What I found:\n${item.procedure}\n\n`;
      }
      
      if (item.requirement) {
        output += `What ${item.standard || 'the standard'} requires:\n${item.requirement}\n\n`;
      }
      
      if (item.clarification_question) {
        output += `The question:\n${item.clarification_question}\n\n`;
      }
      
      if (item.importance) {
        output += `Why I'm asking:\n${item.importance}\n\n`;
      }
      
      if (item.impact) {
        output += `Your answer will help me:\n${item.impact}\n\n`;
      }
      
      output += '─────────────────────────────────────────────\n\n';
    });

    return output;
  },

  /**
   * Format as complete narrative
   */
  formatAsNarrative(analysis, coverage, assessment) {
    const parts = [
      this.formatExecutiveSummary(analysis, coverage, assessment),
      '\n\n',
      this.formatStrengths(analysis.strong_areas || []),
      '\n\n',
      this.formatGaps(analysis.gaps || []),
      '\n\n',
      this.formatRecommendations(analysis)
    ];

    const clarifications = this.formatClarifications(analysis.ambiguous_items || []);
    if (clarifications) {
      parts.push('\n\n', clarifications);
    }

    return parts.join('');
  },

  /**
   * Format a single gap finding professionally
   */
  formatGapFinding(gap) {
    let output = `GAP IDENTIFIED: ${gap.name || gap.requirement}\n\n`;
    
    if (gap.iso_requirement) {
      output += `The requirement:\n${gap.iso_requirement}\n\n`;
    }
    
    if (gap.current_state) {
      output += `What you're doing:\n${gap.current_state}\n\n`;
    }
    
    if (gap.gap_specific) {
      output += `What's missing:\n${gap.gap_specific}\n\n`;
    }
    
    if (gap.business_impact) {
      output += `Why it matters:\n${gap.business_impact}\n\n`;
    }
    
    if (gap.severity) {
      output += `Severity: ${this.formatSeverity(gap.severity)}\n\n`;
    }
    
    if (gap.remediation_steps) {
      output += `How to close it:\n${gap.remediation_steps}\n\n`;
    }
    
    if (gap.estimated_time) {
      output += `Timeline: ${gap.estimated_time}\n\n`;
    }
    
    return output;
  },

  /**
   * Format a clarification question professionally
   */
  formatClarificationQuestion(item) {
    let output = `CLARIFICATION NEEDED: ${item.name || item.topic}\n\n`;
    
    if (item.procedure) {
      output += `What I found:\n${item.procedure}\n\n`;
    }
    
    if (item.requirement) {
      output += `What ${item.standard || 'the standard'} requires:\n${item.requirement}\n\n`;
    }
    
    if (item.clarification_question) {
      output += `The question:\n${item.clarification_question}\n\n`;
    }
    
    if (item.importance) {
      output += `Why I'm asking:\n${item.importance}\n\n`;
    }
    
    if (item.impact) {
      output += `Your answer will help me:\n${item.impact}\n\n`;
    }
    
    return output;
  },

  /**
   * Format confidence statement professionally
   */
  formatConfidenceStatement(confidence, reasoning) {
    const percentage = Math.round(confidence * 100);
    
    let output = `My confidence: ${percentage}%\n\n`;
    
    if (reasoning) {
      output += `Here's why I'm ${percentage >= 80 ? 'confident' : percentage >= 60 ? 'mostly confident' : 'somewhat uncertain'}:\n\n`;
      output += `${reasoning}\n\n`;
    }
    
    if (confidence < 0.75) {
      output += `What would increase my confidence:\n`;
      output += `• More detailed documentation\n`;
      output += `• Clarification on specific processes\n`;
      output += `• Examples of implementation\n\n`;
    }
    
    return output;
  },

  /**
   * Format uncertainty professionally
   */
  formatUncertainty(confidence, item) {
    const percentage = Math.round(confidence * 100);
    
    let output = `I'm about ${percentage}% confident this covers the requirement.\n\n`;
    output += `Here's why I'm not more certain:\n\n`;
    
    if (item.uncertainty_reasons) {
      item.uncertainty_reasons.forEach(reason => {
        output += `• ${reason}\n`;
      });
    } else {
      output += `• Your procedure uses terminology that maps to the standard, but isn't explicit\n`;
      output += `• Industry practice usually satisfies this, but the standard wants formal documentation\n`;
      output += `• This is a judgment call—reasonable people disagree on this one\n`;
    }
    
    output += `\nWhat I'd recommend:\n`;
    output += `Either add explicit language referencing this requirement, or we note it as a minor gap and address it in your next QMS update.\n\n`;
    output += `What would you prefer?`;
    
    return output;
  },

  /**
   * Helper: Calculate coverage percentage
   */
  calculateCoverage(analysis) {
    if (!analysis.total_requirements || analysis.total_requirements === 0) {
      return 0;
    }
    const covered = analysis.covered_count || 0;
    return Math.round((covered / analysis.total_requirements) * 100);
  },

  /**
   * Helper: Get assessment description
   */
  getAssessment(coverage) {
    if (coverage >= 90) return 'excellent—you\'re in great shape';
    if (coverage >= 75) return 'good—solid foundation with some gaps';
    if (coverage >= 60) return 'needs work—significant gaps to address';
    return 'requires attention—major gaps identified';
  },

  /**
   * Helper: Get status description
   */
  getStatusDescription(coverage) {
    if (coverage >= 90) return 'Excellent foundation';
    if (coverage >= 75) return 'Good foundation, clear gaps identified';
    if (coverage >= 60) return 'Needs improvement';
    return 'Requires significant work';
  },

  /**
   * Helper: Estimate timeline
   */
  estimateTimeline(analysis) {
    const gaps = analysis.gaps || [];
    const criticalGaps = gaps.filter(g => g.severity === 'critical').length;
    const majorGaps = gaps.filter(g => g.severity === 'major').length;
    
    if (criticalGaps > 5 || majorGaps > 10) {
      return '4-6 months';
    }
    if (criticalGaps > 0 || majorGaps > 5) {
      return '3-4 months';
    }
    if (majorGaps > 0 || gaps.length > 10) {
      return '2-3 months';
    }
    return '1-2 months';
  },

  /**
   * Helper: Format severity
   */
  formatSeverity(severity) {
    const severityMap = {
      'critical': 'Critical (blocks certification)',
      'major': 'Major (likely audit finding)',
      'moderate': 'Moderate (should address)',
      'minor': 'Minor (nice to have)'
    };
    return severityMap[severity] || severity;
  },

  /**
   * Helper: Get confidence explanation
   */
  getConfidenceExplanation(confidence) {
    if (confidence >= 0.85) {
      return 'I\'m confident in this assessment because your procedures are well documented and the gaps are clear.';
    }
    if (confidence >= 0.70) {
      return 'I\'m mostly confident, but some areas need clarification to be certain.';
    }
    if (confidence >= 0.55) {
      return 'I need more information to be fully confident. Some clarifications would help.';
    }
    return 'I\'m uncertain about several areas. We should discuss these findings to ensure accuracy.';
  },

  /**
   * Format a professional opening
   */
  formatOpening(standard, companyName) {
    return `I've reviewed your procedures against ${standard}. Let me walk you through what I found.`;
  },

  /**
   * Format a professional closing
   */
  formatClosing(analysis) {
    const gaps = analysis.gaps || [];
    if (gaps.length === 0) {
      return `Your procedures are comprehensive. If you have any questions about specific requirements, I'm here to help.`;
    }
    
    return `I've identified ${gaps.length} areas that need attention. Would you like me to help you prioritize these, or do you have questions about any specific findings?`;
  },

  /**
   * Format acknowledgment of progress
   */
  formatProgressAcknowledgment(previousAnalysis, currentAnalysis) {
    if (!previousAnalysis) {
      return '';
    }

    const previousCoverage = this.calculateCoverage(previousAnalysis);
    const currentCoverage = this.calculateCoverage(currentAnalysis);
    const improvement = currentCoverage - previousCoverage;

    if (improvement > 0) {
      return `\n\nWHAT'S NOTABLE\n\nSince we last analyzed you:\n`;
      // Add specific improvements
    }

    return '';
  }
};

export default VeraProfessionalFormatter;

