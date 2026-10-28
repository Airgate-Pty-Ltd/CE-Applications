/**
 * COMPLIANCE GAP CLARIFIER
 * Generates clarification questions for ambiguous requirement matches
 * Records user responses and updates confidence scores
 */

/**
 * Main Clarifier Class
 */
export class ComplianceGapClarifier {
  constructor(options = {}) {
    this.options = {
      maxQuestionsPerSession: options.maxQuestionsPerSession || 10,
      ...options
    };

    this.clarifications = [];
  }

  /**
   * Generate clarification questions for ambiguous matches
   */
  generateQuestions(ambiguousMatches) {
    console.log(`\n💬 CLARIFIER: Generating questions`);
    console.log(`   Ambiguous matches: ${ambiguousMatches.length}`);

    this.clarifications = [];

    // Sort by confidence (most ambiguous first)
    const sorted = ambiguousMatches
      .sort((a, b) => Math.abs(0.675 - a.matchConfidence) - Math.abs(0.675 - b.matchConfidence))
      .slice(0, this.options.maxQuestionsPerSession);

    // Generate question for each
    sorted.forEach((match, index) => {
      const question = this.generateQuestion(match, index + 1);
      this.clarifications.push(question);
    });

    console.log(`✅ Generated ${this.clarifications.length} questions`);

    return this.clarifications;
  }

  /**
   * Generate a single clarification question
   */
  generateQuestion(match, questionNumber) {
    const templates = [
      `Does your procedure "${match.matchedProcedureTitle}" satisfy the requirement for "${match.requirementTitle}"?`,
      
      `ISO ${match.requirementClause} requires: "${match.requirementText.substring(0, 80)}..." 
       Your procedure "${match.matchedProcedureTitle}" appears related. Does it fully address this requirement?`,
      
      `Requirement: "${match.requirementTitle}"
       Your procedure: "${match.matchedProcedureTitle}"
       Is this procedure sufficient to meet the requirement?`,
      
      `Does your "${match.matchedProcedureTitle}" procedure cover the requirement for "${match.requirementTitle.substring(0, 60)}"?`
    ];

    const template = templates[questionNumber % templates.length];

    return {
      clarificationId: `clrf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      questionNumber,
      requirementClause: match.requirementClause,
      requirementTitle: match.requirementTitle,
      requirementText: match.requirementText,
      procedureTitle: match.matchedProcedureTitle,
      procedureText: match.matchedProcedureText,
      question: template,
      confidenceBefore: match.matchConfidence,
      userResponse: null,
      confidenceAfter: null,
      responseTimestamp: null,
      auditTrail: {
        generated: new Date().toISOString(),
        template: templates.indexOf(template)
      }
    };
  }

  /**
   * Record user response to a clarification
   */
  recordResponse(clarificationId, userResponse) {
    if (!['yes', 'no', 'unsure', '?'].includes(userResponse.toLowerCase())) {
      throw new Error(`Invalid response: ${userResponse}. Must be 'yes', 'no', or 'unsure'.`);
    }

    const clarification = this.clarifications.find(c => c.clarificationId === clarificationId);

    if (!clarification) {
      throw new Error(`Clarification not found: ${clarificationId}`);
    }

    // Normalize response
    const response = userResponse.toLowerCase() === '?' ? 'unsure' : userResponse.toLowerCase();

    // Update confidence based on response
    let newConfidence = clarification.confidenceBefore;

    if (response === 'yes') {
      // User confirms match - increase confidence
      newConfidence = Math.min(0.90, clarification.confidenceBefore + 0.20);
    } else if (response === 'no') {
      // User says no - decrease confidence to gap
      newConfidence = Math.max(0.30, clarification.confidenceBefore - 0.25);
    } else if (response === 'unsure') {
      // User unsure - keep same, flag for manual review
      newConfidence = clarification.confidenceBefore;
    }

    // Update clarification record
    clarification.userResponse = response;
    clarification.confidenceAfter = newConfidence;
    clarification.responseTimestamp = new Date().toISOString();
    clarification.auditTrail.responsed = new Date().toISOString();
    clarification.auditTrail.response = response;
    clarification.auditTrail.confidenceChange = newConfidence - clarification.confidenceBefore;

    console.log(`✅ Recorded response: Question ${clarification.questionNumber} → ${response}`);
    console.log(`   Confidence: ${(clarification.confidenceBefore * 100).toFixed(0)}% → ${(newConfidence * 100).toFixed(0)}%`);

    return clarification;
  }

  /**
   * Get all unanswered questions
   */
  getUnansweredQuestions() {
    return this.clarifications.filter(c => c.userResponse === null);
  }

  /**
   * Get all answered questions
   */
  getAnsweredQuestions() {
    return this.clarifications.filter(c => c.userResponse !== null);
  }

  /**
   * Get questions by response type
   */
  getQuestionsByResponse(response) {
    const normalized = response === '?' ? 'unsure' : response.toLowerCase();
    return this.clarifications.filter(c => c.userResponse === normalized);
  }

  /**
   * Get questions needing manual review (user unsure)
   */
  getQuestionsNeedingReview() {
    return this.getQuestionsByResponse('unsure');
  }

  /**
   * Convert clarifications to gap updates
   */
  updateGapsBasedOnResponses(gapAnalysis) {
    console.log(`\n🔄 CLARIFIER: Updating gaps based on user responses`);

    const updated = {
      nowCovered: [],
      stillGaps: [],
      manualReview: []
    };

    for (const clarification of this.getAnsweredQuestions()) {
      // Find corresponding gap in analysis
      const gap = gapAnalysis.gapRequirements.find(
        g => g.requirementClause === clarification.requirementClause
      );

      if (!gap) continue;

      if (clarification.userResponse === 'yes') {
        // Move from gap to covered
        gap.matchConfidence = clarification.confidenceAfter;
        gap.userConfirmed = true;
        updated.nowCovered.push(gap);
      } else if (clarification.userResponse === 'no') {
        // Stays as gap, update confidence
        gap.matchConfidence = clarification.confidenceAfter;
        gap.userConfirmedAsGap = true;
        updated.stillGaps.push(gap);
      } else if (clarification.userResponse === 'unsure') {
        // Flag for manual review
        gap.needsManualReview = true;
        updated.manualReview.push(gap);
      }
    }

    console.log(`✅ Updated gaps:`);
    console.log(`   Now covered: ${updated.nowCovered.length}`);
    console.log(`   Still gaps: ${updated.stillGaps.length}`);
    console.log(`   Manual review: ${updated.manualReview.length}`);

    return updated;
  }

  /**
   * Generate summary of clarifications
   */
  getSummary() {
    const answered = this.getAnsweredQuestions();
    const unanswered = this.getUnansweredQuestions();

    const yesResponses = this.getQuestionsByResponse('yes').length;
    const noResponses = this.getQuestionsByResponse('no').length;
    const unsureResponses = this.getQuestionsByResponse('unsure').length;

    const avgConfidenceBefore = this.clarifications.length > 0
      ? this.clarifications.reduce((sum, c) => sum + c.confidenceBefore, 0) / this.clarifications.length
      : 0;

    const avgConfidenceAfter = answered.length > 0
      ? answered.reduce((sum, c) => sum + c.confidenceAfter, 0) / answered.length
      : avgConfidenceBefore;

    return {
      totalQuestions: this.clarifications.length,
      answered: answered.length,
      unanswered: unanswered.length,
      responses: {
        yes: yesResponses,
        no: noResponses,
        unsure: unsureResponses
      },
      confidenceImprovement: {
        before: Math.round(avgConfidenceBefore * 100),
        after: Math.round(avgConfidenceAfter * 100),
        improvement: Math.round((avgConfidenceAfter - avgConfidenceBefore) * 100)
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Export clarifications for audit trail
   */
  exportAuditTrail() {
    return {
      timestamp: new Date().toISOString(),
      totalClarifications: this.clarifications.length,
      clarifications: this.clarifications.map(c => ({
        questionNumber: c.questionNumber,
        clause: c.requirementClause,
        requirement: c.requirementTitle,
        procedure: c.procedureTitle,
        question: c.question,
        userResponse: c.userResponse,
        confidenceChange: c.confidenceAfter ? c.confidenceAfter - c.confidenceBefore : 0,
        timestamp: c.responseTimestamp,
        auditTrail: c.auditTrail
      }))
    };
  }
}

export default ComplianceGapClarifier;

