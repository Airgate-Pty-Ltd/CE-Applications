/**
 * Vera Advanced Reasoning Orchestrator
 * 
 * Implements Chain-of-Thought reasoning with visible intermediate steps.
 * Provides audit trail of logic for compliance verification.
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';
import type { SemanticContext } from './VeraCoreEngine.js';

export interface ReasoningStep {
  step: number;
  action: string;
  subQuestion?: string;
  result: any;
  timestamp: Date;
}

export interface ReasoningChainResult {
  finalAnswer: string;
  reasoningSteps: ReasoningStep[];
  confidence: number;
  citeableEvidence: any[];
  metadata?: any;
}

export class VeraAdvancedReasoningOrchestrator {
  /**
   * Implements multi-step reasoning with visible intermediate steps
   * Example: "To answer this, I need to: 1) Find the requirement, 2) Check our procedures, 3) Compare them"
   */
  async executeReasoningChain(
    query: string,
    context: SemanticContext
  ): Promise<ReasoningChainResult> {
    const steps: ReasoningStep[] = [];
    const startTime = Date.now();

    try {
      // STEP 1: Decompose the question into sub-questions
      console.log('[VeraAdvancedReasoning] Step 1: Decomposing query...');
      const subQuestions = await this.decomposeQuery(query);
      steps.push({
        step: 1,
        action: 'Decompose Query',
        result: { subQuestions, count: subQuestions.length },
        timestamp: new Date()
      });

      // STEP 2: Gather evidence for each sub-question
      console.log('[VeraAdvancedReasoning] Step 2: Gathering evidence...');
      const evidence: any[] = [];
      for (const subQ of subQuestions) {
        const findings = await this.gatherEvidence(subQ, context);
        evidence.push(findings);
        steps.push({
          step: 2,
          action: 'Gather Evidence',
          subQuestion: subQ,
          result: {
            findingsCount: findings.sources?.length || 0,
            hasRequirements: findings.requirements?.length > 0,
            hasProcedures: findings.procedures?.length > 0,
            hasLearningDocs: findings.learningDocs?.length > 0
          },
          timestamp: new Date()
        });
      }

      // STEP 3: Synthesize findings into coherent answer
      console.log('[VeraAdvancedReasoning] Step 3: Synthesizing findings...');
      const synthesis = await this.synthesizeFindings(evidence, query);
      steps.push({
        step: 3,
        action: 'Synthesize Findings',
        result: {
          answerLength: synthesis.length,
          keyPoints: this.extractKeyPoints(synthesis),
          sourcesUsed: evidence.length
        },
        timestamp: new Date()
      });

      // STEP 4: Verify answer against compliance logic
      console.log('[VeraAdvancedReasoning] Step 4: Verifying compliance...');
      const verified = await this.verifyCompliance(synthesis, evidence);
      steps.push({
        step: 4,
        action: 'Verify Against Standards',
        result: {
          verified: verified.isCompliant,
          conflictsFound: verified.conflicts?.length || 0,
          auditRisks: verified.auditRisks?.length || 0
        },
        timestamp: new Date()
      });

      // STEP 5: Identify confidence & uncertainty
      console.log('[VeraAdvancedReasoning] Step 5: Assessing confidence...');
      const confidence = await this.calculateConfidenceScore(verified, evidence);
      steps.push({
        step: 5,
        action: 'Assess Confidence',
        result: {
          confidenceScore: confidence,
          factors: {
            evidenceQuality: verified.evidenceQuality || 0,
            sourceAgreement: verified.sourceAgreement || 0,
            knowledgeGaps: verified.knowledgeGaps?.length || 0
          }
        },
        timestamp: new Date()
      });

      const totalTime = Date.now() - startTime;
      console.log(`[VeraAdvancedReasoning] ✅ Reasoning chain completed in ${totalTime}ms`);

      return {
        finalAnswer: synthesis,
        reasoningSteps: steps,
        confidence: confidence,
        citeableEvidence: evidence,
        metadata: {
          totalSteps: steps.length,
          processingTimeMs: totalTime,
          subQuestionsCount: subQuestions.length
        }
      };
    } catch (error: any) {
      console.error('[VeraAdvancedReasoning] Error in reasoning chain:', error);
      steps.push({
        step: 0,
        action: 'Error',
        result: { error: error.message },
        timestamp: new Date()
      });

      return {
        finalAnswer: 'I encountered an error while reasoning through your question. Please try rephrasing it.',
        reasoningSteps: steps,
        confidence: 0.3,
        citeableEvidence: [],
        metadata: { error: true }
      };
    }
  }

  /**
   * Decompose complex query into sub-questions
   * Example: "What's the gap in our doc control?" →
   * ["What is doc control?", "What do we have?", "What's missing?"]
   */
  private async decomposeQuery(query: string): Promise<string[]> {
    const lowerQuery = query.toLowerCase();
    const subQuestions: string[] = [];

    // Pattern 1: Gap analysis questions
    if (lowerQuery.includes('gap') || lowerQuery.includes('missing') || lowerQuery.includes('lacking')) {
      subQuestions.push('What are the requirements for this topic?');
      subQuestions.push('What do we currently have documented?');
      subQuestions.push('What is missing or incomplete?');
    }

    // Pattern 2: Procedure questions
    if (lowerQuery.includes('procedure') || lowerQuery.includes('process') || lowerQuery.includes('how do we')) {
      subQuestions.push('What does the standard require?');
      subQuestions.push('What procedures do we have?');
      subQuestions.push('How do our procedures align with requirements?');
    }

    // Pattern 3: Compliance questions
    if (lowerQuery.includes('compliant') || lowerQuery.includes('meet') || lowerQuery.includes('satisfy')) {
      subQuestions.push('What are the specific requirements?');
      subQuestions.push('What evidence do we have?');
      subQuestions.push('Are there any gaps or non-conformances?');
    }

    // Pattern 4: Clause/requirement questions
    if (lowerQuery.match(/\d+\.\d+/)) { // Matches patterns like "8.5.1"
      subQuestions.push('What does this clause require?');
      subQuestions.push('How is this implemented in our system?');
      subQuestions.push('What evidence supports compliance?');
    }

    // Default: If no specific pattern, create general sub-questions
    if (subQuestions.length === 0) {
      subQuestions.push('What information is needed to answer this?');
      subQuestions.push('Where can I find relevant information?');
      subQuestions.push('What is the most important aspect to address?');
    }

    return subQuestions;
  }

  /**
   * Gather evidence for a sub-question from multiple sources
   */
  private async gatherEvidence(subQuestion: string, context: SemanticContext): Promise<any> {
    const evidence: any = {
      subQuestion,
      sources: [],
      requirements: [],
      procedures: [],
      learningDocs: [],
      qaMatches: []
    };

    try {
      // Source 1: Standard requirements
      if (context.standards && context.standards.length > 0) {
        for (const standard of context.standards) {
          try {
            const reqs = await queryPostgres(
              `SELECT requirement_text, clause_reference, standard_code
               FROM public.compliance_requirements
               WHERE standard_code = $1
               LIMIT 5`,
              [standard.code]
            );
            evidence.requirements.push(...reqs.rows);
            evidence.sources.push({ type: 'requirement', standard: standard.code, count: reqs.rows.length });
          } catch (err: any) {
            console.warn('[VeraAdvancedReasoning] Error fetching requirements:', err.message);
          }
        }
      }

      // Source 2: Learning documents
      if (context.learningDocs && context.learningDocs.length > 0) {
        evidence.learningDocs = context.learningDocs.slice(0, 5).map((doc: any) => ({
          content: doc.content_text?.substring(0, 500) || '',
          standardCode: doc.standard_code,
          source: doc.document_title
        }));
        evidence.sources.push({ type: 'learning_doc', count: evidence.learningDocs.length });
      }

      // Source 3: Q&A bank
      try {
        const qaMatches = await queryEdcatAI(
          `SELECT response_text, user_query_pattern, confidence_score
           FROM edcat.vera_query_response_bank
           WHERE user_query_pattern ILIKE $1 OR response_text ILIKE $1
           ORDER BY confidence_score DESC
           LIMIT 3`,
          [`%${subQuestion.substring(0, 50)}%`]
        );
        evidence.qaMatches = qaMatches.rows;
        evidence.sources.push({ type: 'qa_bank', count: qaMatches.rows.length });
      } catch (err: any) {
        console.warn('[VeraAdvancedReasoning] Error fetching Q&A:', err.message);
      }

      // Source 4: Approved examples
      if (context.approvedExamples && context.approvedExamples.length > 0) {
        evidence.examples = context.approvedExamples.slice(0, 3).map((ex: any) => ({
          content: ex.content_text?.substring(0, 300) || '',
          quality: ex.quality_score
        }));
        evidence.sources.push({ type: 'approved_example', count: evidence.examples.length });
      }

    } catch (error: any) {
      console.error('[VeraAdvancedReasoning] Error gathering evidence:', error);
    }

    return evidence;
  }

  /**
   * Synthesize findings into a coherent narrative answer
   */
  private async synthesizeFindings(evidence: any[], originalQuery: string): Promise<string> {
    if (evidence.length === 0) {
      return 'I was unable to find sufficient information to answer your question. Please provide more context or try rephrasing.';
    }

    let synthesis = '';

    // Group evidence by type
    const requirements = evidence.flatMap(e => e.requirements || []);
    const learningDocs = evidence.flatMap(e => e.learningDocs || []);
    const examples = evidence.flatMap(e => e.examples || []);

    // Build answer from most relevant sources
    if (requirements.length > 0) {
      synthesis += `Based on the requirements I found:\n\n`;
      requirements.slice(0, 3).forEach((req: any, idx: number) => {
        synthesis += `${idx + 1}. ${req.clause_reference || 'Requirement'}: ${req.requirement_text?.substring(0, 200) || ''}...\n\n`;
      });
    }

    if (learningDocs.length > 0) {
      synthesis += `\nFrom relevant documentation:\n\n`;
      learningDocs.slice(0, 2).forEach((doc: any, idx: number) => {
        synthesis += `${idx + 1}. ${doc.source || 'Document'}: ${doc.content}...\n\n`;
      });
    }

    if (examples.length > 0) {
      synthesis += `\nBased on approved examples:\n\n`;
      examples.slice(0, 2).forEach((ex: any, idx: number) => {
        synthesis += `${idx + 1}. Example (quality score: ${ex.quality || 'N/A'}): ${ex.content}...\n\n`;
      });
    }

    // Add conclusion
    if (synthesis.length > 0) {
      synthesis += `\nIn summary, ${this.generateSummary(evidence, originalQuery)}`;
    }

    return synthesis || 'I found some information, but I need more context to provide a complete answer.';
  }

  /**
   * Verify answer against compliance logic
   */
  private async verifyCompliance(answer: string, evidence: any[]): Promise<any> {
    const verification: any = {
      isCompliant: true,
      conflicts: [],
      auditRisks: [],
      evidenceQuality: 0.8,
      sourceAgreement: 0.9,
      knowledgeGaps: []
    };

    try {
      // Check for conflicting requirements
      const requirements = evidence.flatMap(e => e.requirements || []);
      if (requirements.length > 1) {
        // Simple conflict detection: check for contradictory keywords
        const hasConflicts = this.detectConflicts(requirements);
        if (hasConflicts) {
          verification.conflicts.push('Potential conflict between requirements detected');
          verification.isCompliant = false;
        }
      }

      // Assess evidence quality
      const totalSources = evidence.reduce((sum, e) => sum + (e.sources?.length || 0), 0);
      verification.evidenceQuality = Math.min(1.0, totalSources / 5); // Normalize to 0-1

      // Check source agreement
      const sourceTypes = new Set(evidence.flatMap(e => e.sources?.map((s: any) => s.type) || []));
      verification.sourceAgreement = sourceTypes.size >= 2 ? 0.9 : 0.6;

      // Identify knowledge gaps
      if (evidence.length === 0 || totalSources < 2) {
        verification.knowledgeGaps.push('Limited evidence available');
      }

    } catch (error: any) {
      console.error('[VeraAdvancedReasoning] Error verifying compliance:', error);
    }

    return verification;
  }

  /**
   * Calculate confidence score based on evidence quality and verification
   */
  private async calculateConfidenceScore(verified: any, evidence: any[]): Promise<number> {
    let confidence = 0.5; // Base confidence

    // Factor 1: Evidence quality (0-0.3)
    confidence += (verified.evidenceQuality || 0) * 0.3;

    // Factor 2: Source agreement (0-0.2)
    confidence += (verified.sourceAgreement || 0) * 0.2;

    // Factor 3: No conflicts (0-0.2)
    if (verified.isCompliant && verified.conflicts?.length === 0) {
      confidence += 0.2;
    }

    // Factor 4: Knowledge gaps penalty (0-0.3)
    const gapPenalty = Math.min(0.3, verified.knowledgeGaps?.length * 0.1 || 0);
    confidence -= gapPenalty;

    // Factor 5: Evidence quantity (0-0.1)
    const evidenceCount = evidence.reduce((sum, e) => sum + (e.sources?.length || 0), 0);
    confidence += Math.min(0.1, evidenceCount * 0.02);

    return Math.max(0.1, Math.min(0.99, confidence));
  }

  /**
   * Helper: Extract key points from synthesized answer
   */
  private extractKeyPoints(synthesis: string): string[] {
    const sentences = synthesis.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).map(s => s.trim());
  }

  /**
   * Helper: Generate summary from evidence
   */
  private generateSummary(evidence: any[], query: string): string {
    const reqCount = evidence.reduce((sum, e) => sum + (e.requirements?.length || 0), 0);
    const docCount = evidence.reduce((sum, e) => sum + (e.learningDocs?.length || 0), 0);

    if (reqCount > 0 && docCount > 0) {
      return `I found ${reqCount} relevant requirement(s) and ${docCount} document(s) that address your question.`;
    } else if (reqCount > 0) {
      return `I found ${reqCount} relevant requirement(s) that address your question.`;
    } else if (docCount > 0) {
      return `I found ${docCount} document(s) that address your question.`;
    }
    return 'I found some information, but you may want to verify with your official standards documents.';
  }

  /**
   * Helper: Detect conflicts between requirements
   */
  private detectConflicts(requirements: any[]): boolean {
    // Simple conflict detection: look for contradictory keywords
    const positiveKeywords = ['must', 'shall', 'required', 'mandatory', 'always'];
    const negativeKeywords = ['must not', 'shall not', 'prohibited', 'never', 'forbidden'];

    let hasPositive = false;
    let hasNegative = false;

    for (const req of requirements) {
      const text = (req.requirement_text || '').toLowerCase();
      if (positiveKeywords.some(kw => text.includes(kw))) hasPositive = true;
      if (negativeKeywords.some(kw => text.includes(kw))) hasNegative = true;
    }

    // Conflict if we have both positive and negative requirements for similar topics
    return hasPositive && hasNegative;
  }
}

