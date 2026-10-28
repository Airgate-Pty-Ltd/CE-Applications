/**
 * VERA COMPLIANCE GAP SERVICE
 * Orchestrates Parser, Analyzer, Clarifier, Learning modules
 * Vera validates outputs and provides professional compliance guidance
 */

import { ComplianceGapParser } from './complianceGapParser.js';
import { ComplianceGapAnalyzer } from './complianceGapAnalyzer.js';
import { ComplianceGapClarifier } from './complianceGapClarifier.js';
import { ComplianceGapLearner } from './complianceGapLearner.js';

/**
 * Vera Compliance Service
 */
export class VeraComplianceGapService {
  constructor(options = {}) {
    this.options = options;
    
    // Initialize modules
    this.parser = new ComplianceGapParser(options);
    this.analyzer = new ComplianceGapAnalyzer(options);
    this.clarifier = new ComplianceGapClarifier(options);
    this.learner = new ComplianceGapLearner(options);

    // State
    this.currentAnalysis = null;
    this.currentClarifications = null;
    this.analysisHistory = [];
  }

  /**
   * MAIN ENTRY: User uploads standard document
   */
  async handleStandardUpload(text, filename, standardCode) {
    console.log(`\n👤 USER: "Parse ${standardCode}"`);
    console.log(`🤖 VERA: "Got it. Let me parse ${standardCode}..."`);

    try {
      // Step 1: PARSER
      const parseResult = this.parser.parseText(text, filename, 'STANDARD', standardCode);

      if (!parseResult.success) {
        return {
          message: `❌ I had trouble parsing ${filename}. Could you verify it's the correct document?`,
          action: 'parser_error'
        };
      }

      // Step 2: VERA VALIDATES PARSER OUTPUT
      const parserValidation = this.validateParserOutput(parseResult);

      if (!parserValidation.valid) {
        return {
          message: `⚠️  ${parserValidation.warning}`,
          action: 'parser_warning',
          suggestion: parserValidation.suggestion
        };
      }

      // Record learning event
      this.learner.recordEvent('parsing', {
        standardCode,
        requirementsFound: parseResult.metadata.totalRequirementsFound,
        confidenceBefore: 0.75,
        confidenceAfter: parseResult.metadata.averageConfidence
      });

      // Step 3: VERA RESPONDS PROFESSIONALLY
      return {
        message: `✅ **Successfully parsed ${standardCode}**
          
📊 **Extraction Summary:**
• Requirements found: ${parseResult.metadata.totalRequirementsFound}
• Average confidence: ${(parseResult.metadata.averageConfidence * 100).toFixed(1)}%
• High confidence: ${parseResult.metadata.highConfidence}
• Medium confidence: ${parseResult.metadata.mediumConfidence}
• Low confidence: ${parseResult.metadata.lowConfidence}

Next step: Upload your QMS documents so I can analyze coverage and identify gaps.`,
        action: 'standard_parsed',
        data: {
          requirements: parseResult.requirements,
          metadata: parseResult.metadata
        }
      };

    } catch (error) {
      return {
        message: `❌ Parser error: ${error.message}`,
        action: 'error',
        error: error.message
      };
    }
  }

  /**
   * MAIN ENTRY: User uploads customer procedures
   */
  async handleProcedureUpload(text, filename, standardRequirements) {
    console.log(`\n👤 USER: "Upload QMS procedures"`);
    console.log(`🤖 VERA: "Analyzing your procedures..."`);

    try {
      // Step 1: CLARIFIER extracts procedures
      const procedures = this.extractProcedures(text);

      if (procedures.length === 0) {
        return {
          message: `⚠️  I couldn't find clear procedures in ${filename}. 
          
Try formatting them with numbers (like 1. Process Name) or references (like SQ-001).`,
          action: 'no_procedures_found'
        };
      }

      // Step 2: ANALYZER finds gaps
      const gapResult = this.analyzer.analyze(standardRequirements, procedures);

      if (!gapResult.success) {
        return {
          message: `❌ Analysis failed. Please try again.`,
          action: 'analyzer_error'
        };
      }

      // Step 3: VERA VALIDATES ANALYZER OUTPUT
      const analyzerValidation = this.validateAnalyzerOutput(gapResult);

      if (!analyzerValidation.valid) {
        console.warn(`⚠️  Analyzer validation warning: ${analyzerValidation.warning}`);
      }

      // Store current analysis
      this.currentAnalysis = gapResult;

      // Step 4: VERA RESPONDS WITH INITIAL RESULTS
      const summary = gapResult.summary;

      const message = `✅ **Analysis Complete**

📈 **Compliance Coverage:**
• Total Requirements: ${summary.totalRequirements}
• ✓ Covered: ${summary.coveredRequirements} (${summary.coveragePercentageDetailed}%)
• ⚠️  Ambiguous: ${summary.ambiguousRequirements} (need clarification)
• ✗ Gaps: ${summary.gapRequirements} (${summary.gapPercentage}%)

**Gap Severity:**
• HIGH (critical): ${summary.highSeverityGaps}
• MEDIUM: ${summary.mediumSeverityGaps}
• LOW: ${summary.lowSeverityGaps}

Before I show you the full report, let me verify a few ambiguous areas with you...`;

      // Step 5: Generate clarification questions
      if (gapResult.ambiguousRequirements.length > 0) {
        this.currentClarifications = this.clarifier.generateQuestions(gapResult.ambiguousRequirements);

        return {
          message,
          action: 'analysis_complete_with_clarifications',
          clarifications: this.currentClarifications.slice(0, 6), // First 6 questions
          data: gapResult
        };
      } else {
        return {
          message,
          action: 'analysis_complete',
          data: gapResult
        };
      }

    } catch (error) {
      return {
        message: `❌ Analysis error: ${error.message}`,
        action: 'error',
        error: error.message
      };
    }
  }

  /**
   * MAIN ENTRY: Handle user response to clarification
   */
  async handleClarificationResponse(clarificationId, userResponse) {
    console.log(`\n👤 USER: "${userResponse}"`);

    try {
      // Record response
      const clarification = this.clarifier.recordResponse(clarificationId, userResponse);

      // Record learning event
      this.learner.recordEvent('clarification', {
        userResponse,
        confidenceBefore: clarification.confidenceBefore,
        confidenceAfter: clarification.confidenceAfter
      });

      // Check if all answered
      const unanswered = this.clarifier.getUnansweredQuestions();

      if (unanswered.length === 0) {
        // All clarifications answered - show final report
        return {
          message: `✅ **Thank you! I've processed your clarifications.**

Let me finalize the gap analysis with your input...`,
          action: 'clarifications_complete',
          nextStep: 'show_final_report'
        };
      } else {
        // More clarifications to go
        const nextQuestion = unanswered[0];

        return {
          message: `Got it! Let's continue.

**Question ${nextQuestion.questionNumber} of ${this.currentClarifications.length}:**

${nextQuestion.question}`,
          action: 'next_clarification',
          clarification: nextQuestion
        };
      }

    } catch (error) {
      return {
        message: `❌ Error processing response: ${error.message}`,
        action: 'error'
      };
    }
  }

  /**
   * MAIN ENTRY: Generate final report
   */
  async handleFinalReport() {
    console.log(`\n🤖 VERA: "Preparing your final gap analysis report..."`);

    try {
      // Update gaps based on clarifications
      const updated = this.clarifier.updateGapsBasedOnResponses(this.currentAnalysis);

      // Check for improvement and potentially create new model version
      const versionCheck = this.learner.shouldCreateNewVersion();

      if (versionCheck.shouldCreate) {
        const newVersion = this.learner.createNewVersion();
        console.log(`✨ Created new model version: ${newVersion.version}`);
      }

      // Generate recommendations
      const recommendations = this.analyzer.getRecommendations();

      // Final message
      const message = `✅ **Final Gap Analysis Report**

📊 **Coverage Summary:**
• Confirmed Covered: ${updated.nowCovered.length + (this.currentAnalysis.coveredRequirements.length || 0)}
• Still Gaps: ${updated.stillGaps.length + updated.manualReview.length}

**Top Priorities (${recommendations[0]?.priority || 'N/A'}):**
${recommendations.slice(0, 3).map((r, i) => `${i + 1}. ${r.priority}: ${r.count} gaps (${r.timeframe})`).join('\n')}

**Recommendations:**
1. Address HIGH severity gaps immediately (0-30 days)
2. Plan MEDIUM severity gap closure in next cycle (30-60 days)  
3. Address LOW severity gaps as resources permit (60-90+ days)

**Next Steps:**
• I can help you draft procedures for any gap
• I can create an action plan with timelines
• I can prepare audit evidence documentation

What would be most helpful?`;

      // Record rating request
      return {
        message,
        action: 'final_report',
        data: {
          confirmed: updated.nowCovered.length,
          stillGaps: updated.stillGaps.length,
          manualReview: updated.manualReview.length,
          recommendations,
          summary: this.currentAnalysis.summary
        },
        nextStep: 'request_rating'
      };

    } catch (error) {
      return {
        message: `❌ Report generation error: ${error.message}`,
        action: 'error'
      };
    }
  }

  /**
   * Record user feedback/rating
   */
  recordUserRating(rating, comment) {
    try {
      this.learner.recordEvent('rating', {
        rating: Math.min(5, Math.max(1, rating)), // 1-5
        comment
      });

      const learningCheckpoint = this.learner.shouldCreateNewVersion();

      if (learningCheckpoint.shouldCreate) {
        const newVersion = this.learner.createNewVersion();
        
        return {
          message: `✅ **Thank you for the feedback!**

Your rating has been recorded and I'm continuously improving. 
Model version updated: v${newVersion.version} (${(newVersion.baselineAccuracy * 100).toFixed(1)}% accuracy)

Next analysis will benefit from this learning.`,
          action: 'rating_recorded',
          newVersion: newVersion.version
        };
      } else {
        return {
          message: `✅ **Thank you for the feedback!**

Your rating helps me improve. I'll apply these learnings to future analyses.`,
          action: 'rating_recorded'
        };
      }

    } catch (error) {
      return {
        message: `Error recording rating: ${error.message}`,
        action: 'error'
      };
    }
  }

  /**
   * ===== VALIDATION & SUPPORT METHODS =====
   */

  validateParserOutput(result) {
    const issues = [];

    if (result.metadata.totalRequirementsFound < 50) {
      return {
        valid: false,
        warning: `Only found ${result.metadata.totalRequirementsFound} requirements. This seems low for a compliance standard.`,
        suggestion: 'Verify the document is a complete standard (not an excerpt).'
      };
    }

    if (result.metadata.averageConfidence < 0.70) {
      return {
        valid: false,
        warning: `Average confidence is only ${(result.metadata.averageConfidence * 100).toFixed(0)}%. This indicates potential parsing issues.`,
        suggestion: 'Try a different version of the document or check the formatting.'
      };
    }

    return { valid: true };
  }

  validateAnalyzerOutput(result) {
    if (!result.success) {
      return {
        valid: false,
        warning: 'Analysis failed'
      };
    }

    // Check for reasonable results
    const summary = result.summary;

    if (summary.coveragePercentage > 95) {
      console.warn('⚠️  Very high coverage - may indicate over-matching');
    }

    if (summary.coveragePercentage < 20) {
      console.warn('⚠️  Very low coverage - may indicate document type mismatch');
    }

    return { valid: true };
  }

  extractProcedures(text) {
    // Simple procedure extraction - look for numbered items or references
    const lines = text.split('\n').filter(l => l.trim());
    const procedures = [];

    for (const line of lines) {
      // Match: "1. Process Name" or "SQ-001: ..." or "Title: ..."
      const match = line.match(/^[\s]*(?:\d+\.|[A-Z]+-?\d+|[A-Z][^:]*:)\s*(.+?)$/);

      if (match) {
        procedures.push({
          id: `proc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: match[1].substring(0, 80),
          text: match[1].substring(0, 500),
          procedureText: match[1].substring(0, 500)
        });
      }
    }

    return procedures;
  }

  /**
   * Get service status and statistics
   */
  getStatus() {
    return {
      parser: {
        status: 'ready',
        lastUsed: this.currentAnalysis ? this.currentAnalysis.summary.analysisCompleted : null
      },
      analyzer: {
        status: 'ready',
        lastResult: this.currentAnalysis ? {
          coverage: this.currentAnalysis.summary.coveragePercentageDetailed,
          gaps: this.currentAnalysis.summary.gapRequirements
        } : null
      },
      clarifier: {
        status: 'ready',
        pendingClarifications: this.clarifier.getUnansweredQuestions().length,
        completedClarifications: this.clarifier.getAnsweredQuestions().length
      },
      learning: {
        status: 'ready',
        currentVersion: this.learner.getLatestApprovedVersion().version,
        totalEvents: this.learner.events.length,
        readyForNewVersion: this.learner.shouldCreateNewVersion().shouldCreate
      }
    };
  }
}

export default VeraComplianceGapService;

