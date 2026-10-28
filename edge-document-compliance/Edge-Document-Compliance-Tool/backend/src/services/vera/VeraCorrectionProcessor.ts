/**
 * Vera Correction Processor
 * 
 * Processes user corrections and feedback to improve future responses.
 * Extracts corrected information and stores it for future use.
 * 
 * 100% internal - no external LLM calls.
 */

import { queryEdcatAI } from '../../config/databases.js';
import { VeraMemoryService } from './VeraMemoryService.js';
import VeraSemanticMemory from './VeraSemanticMemory.js';
import { v4 as uuidv4 } from 'uuid';
import { veraEngineHealth } from './VeraEngineHealthService.js';

export interface Correction {
  id: string;
  tenantId: string;
  sessionId: string;
  userId: string;
  originalQuestion: string;
  originalAnswer: string;
  correctedAnswer: string;
  correctionText: string;
  intent?: string;
  topic?: string;
  standardCode?: string;
  clauseRef?: string;
  errorType: 'misinterpretation' | 'outdated' | 'missing_context' | 'incorrect_fact' | 'other';
  confidence: number;
  createdAt: Date;
}

export class VeraCorrectionProcessor {
  /**
   * Process user correction/feedback
   */
  static async processCorrection(params: {
    tenantId: string;
    sessionId: string;
    userId: string;
    previousQuestion: string;
    previousAnswer: string;
    correctionText: string;
    intent?: string;
    topic?: string;
    standardCode?: string;
    clauseRef?: string;
  }): Promise<Correction> {
    const {
      tenantId,
      sessionId,
      userId,
      previousQuestion,
      previousAnswer,
      correctionText,
      intent,
      topic,
      standardCode,
      clauseRef
    } = params;

    // Extract corrected information
    const correctedAnswer = this.extractCorrectedAnswer(correctionText, previousAnswer);
    const errorType = this.detectErrorType(correctionText, previousAnswer);
    const confidence = this.calculateCorrectionConfidence(correctionText);

    const correction: Correction = {
      id: uuidv4(),
      tenantId,
      sessionId,
      userId,
      originalQuestion: previousQuestion,
      originalAnswer: previousAnswer,
      correctedAnswer,
      correctionText,
      intent,
      topic,
      standardCode,
      clauseRef,
      errorType,
      confidence,
      createdAt: new Date()
    };

    // Store in multiple places for future retrieval
    await Promise.all([
      // Store in vera_query_response_bank (create table if needed)
      this.storeInResponseBank(correction),
      
      // Store in vera_memory as correction
      VeraMemoryService.storeCorrection({
        tenantId,
        sessionId,
        userId,
        originalAnswer: previousAnswer,
        correctedAnswer,
        question: previousQuestion,
        intent,
        topic,
        standardCode
      }),
      
      // Store learning event
      this.storeLearningEvent(correction),
      
      // Store embedding for semantic search
      this.storeCorrectionEmbedding(correction)
    ]).catch((error) => {
      console.warn('[VeraCorrectionProcessor] Error storing correction:', error.message);
    });

    return correction;
  }

  /**
   * Extract corrected answer from feedback text
   */
  private static extractCorrectedAnswer(correctionText: string, originalAnswer: string): string {
    const lower = correctionText.toLowerCase();
    
    // Patterns that indicate the correction
    const correctionPatterns = [
      /(?:actually|correct|right|should be|is|means)\s*:?\s*(.+?)(?:\.|$)/i,
      /(?:it's|it is)\s+(.+?)(?:\.|$)/i,
      /(?:the correct|the right)\s+(?:answer|information|fact)\s+is\s*:?\s*(.+?)(?:\.|$)/i,
      /(?:correction|corrected)\s*:?\s*(.+?)(?:\.|$)/i
    ];

    for (const pattern of correctionPatterns) {
      const match = correctionText.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // If no pattern matches, try to extract the part after common correction phrases
    const phrases = [
      'actually',
      'correction:',
      'that\'s not right,',
      'the correct answer is',
      'it should be',
      'it\'s actually'
    ];

    for (const phrase of phrases) {
      const index = lower.indexOf(phrase);
      if (index !== -1) {
        const extracted = correctionText.substring(index + phrase.length).trim();
        if (extracted.length > 10) {
          // Take first sentence or first 200 chars
          const sentenceEnd = extracted.search(/[.!?]/);
          return sentenceEnd > 0 ? extracted.substring(0, sentenceEnd + 1) : extracted.substring(0, 200);
        }
      }
    }

    // Fallback: use the entire correction text if it's reasonable
    if (correctionText.length > 20 && correctionText.length < 500) {
      return correctionText;
    }

    // Last resort: return a note that correction was provided
    return `[User provided correction: ${correctionText.substring(0, 100)}]`;
  }

  /**
   * Detect error type from correction text
   */
  private static detectErrorType(correctionText: string, originalAnswer: string): Correction['errorType'] {
    const lower = correctionText.toLowerCase();
    
    if (lower.includes('misunderstood') || lower.includes('misinterpreted')) {
      return 'misinterpretation';
    }
    
    if (lower.includes('outdated') || lower.includes('old') || lower.includes('changed') || lower.includes('updated')) {
      return 'outdated';
    }
    
    if (lower.includes('missing') || lower.includes('didn\'t consider') || lower.includes('context')) {
      return 'missing_context';
    }
    
    if (lower.includes('wrong') || lower.includes('incorrect') || lower.includes('not right')) {
      return 'incorrect_fact';
    }
    
    return 'other';
  }

  /**
   * Calculate confidence in the correction
   */
  private static calculateCorrectionConfidence(correctionText: string): number {
    let confidence = 0.7; // Base confidence
    
    // Boost if correction is explicit
    if (correctionText.match(/(?:correction|correct|actually|right)/i)) {
      confidence += 0.1;
    }
    
    // Boost if correction provides specific information
    if (correctionText.length > 50) {
      confidence += 0.1;
    }
    
    // Boost if correction references specific standards/clauses
    if (correctionText.match(/\b(AS9100|ISO|FAA|CASA|EASA|\d+\.\d+)/i)) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 0.95);
  }

  /**
   * Store correction in vera_query_response_bank
   */
  private static async storeInResponseBank(correction: Correction): Promise<void> {
    try {
      // Ensure table exists
      await queryEdcatAI(`
        CREATE TABLE IF NOT EXISTS edcat.vera_query_response_bank (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          question_text TEXT NOT NULL,
          incorrect_answer TEXT,
          corrected_answer TEXT NOT NULL,
          tags JSONB DEFAULT '{}'::jsonb,
          standard_code TEXT,
          clause_reference TEXT,
          intent TEXT,
          topic TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_vqrb_tenant ON edcat.vera_query_response_bank(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_vqrb_question ON edcat.vera_query_response_bank USING gin(to_tsvector('english', question_text));
        CREATE INDEX IF NOT EXISTS idx_vqrb_standard ON edcat.vera_query_response_bank(standard_code);
      `).catch(() => {}); // Table might already exist

      // Insert correction
      await queryEdcatAI(
        `INSERT INTO edcat.vera_query_response_bank
         (id, tenant_id, question_text, incorrect_answer, corrected_answer, tags, 
          standard_code, clause_reference, intent, topic, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        [
          correction.id,
          correction.tenantId,
          correction.originalQuestion,
          correction.originalAnswer,
          correction.correctedAnswer,
          JSON.stringify({
            errorType: correction.errorType,
            confidence: correction.confidence,
            sessionId: correction.sessionId
          }),
          correction.standardCode || null,
          correction.clauseRef || null,
          correction.intent || null,
          correction.topic || null
        ]
      );
    } catch (error: any) {
      console.warn('[VeraCorrectionProcessor] Error storing in response bank:', error.message);
    }
  }

  /**
   * Store learning event
   */
  private static async storeLearningEvent(correction: Correction): Promise<void> {
    try {
      // Ensure table exists
      await queryEdcatAI(`
        CREATE TABLE IF NOT EXISTS edcat.ai_learning_event (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          event_type TEXT NOT NULL,
          source_type TEXT,
          source_id UUID,
          error_type TEXT,
          correction_id UUID,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_ale_tenant ON edcat.ai_learning_event(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_ale_type ON edcat.ai_learning_event(event_type);
      `).catch(() => {});

      await queryEdcatAI(
        `INSERT INTO edcat.ai_learning_event
         (tenant_id, event_type, source_type, source_id, error_type, correction_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          correction.tenantId,
          'user_correction',
          'conversation',
          correction.id,
          correction.errorType,
          correction.id,
          JSON.stringify({
            question: correction.originalQuestion.substring(0, 200),
            topic: correction.topic,
            standardCode: correction.standardCode
          })
        ]
      );
    } catch (error: any) {
      console.warn('[VeraCorrectionProcessor] Error storing learning event:', error.message);
    }
  }

  /**
   * Store embedding for semantic search
   */
  private static async storeCorrectionEmbedding(correction: Correction): Promise<void> {
    try {
      await VeraSemanticMemory.storeEmbedding({
        sourceType: 'correction',
        sourceId: correction.id,
        text: `${correction.originalQuestion} ${correction.correctedAnswer}`,
        metadata: {
          question: correction.originalQuestion,
          correctedAnswer: correction.correctedAnswer,
          errorType: correction.errorType,
          standardCode: correction.standardCode,
          clauseRef: correction.clauseRef
        },
        tenantId: correction.tenantId
      });
    } catch (error: any) {
      console.warn('[VeraCorrectionProcessor] Error storing embedding:', error.message);
    }
  }

  /**
   * Get corrections for a similar question
   */
  static async getCorrectionsForQuestion(params: {
    tenantId: string;
    question: string;
    limit?: number;
  }): Promise<Correction[]> {
    const { tenantId, question, limit = 3 } = params;

    try {
      // Try semantic search first
      const semanticResults = await VeraSemanticMemory.semanticSearch({
        query: question,
        topK: limit,
        sourceTypes: ['correction'],
        tenantId,
        minSimilarity: 0.7
      });

      if (semanticResults.length > 0) {
        const correctionIds = semanticResults.map(r => r.sourceId);
        const result = await queryEdcatAI(
          `SELECT * FROM edcat.vera_query_response_bank
           WHERE id = ANY($1::uuid[])
           ORDER BY updated_at DESC`,
          [correctionIds]
        );

        return result.rows.map((r: any) => this.mapRowToCorrection(r));
      }

      // Fallback to text search - handle missing question_text column
      const textResult = await queryEdcatAI(
        `SELECT * FROM edcat.vera_query_response_bank
         WHERE tenant_id = $1
           AND (
             COALESCE(question_text, user_query_pattern, '') ILIKE $2
             OR user_query_pattern ILIKE $2
             OR user_query_pattern ILIKE $2
           )
         ORDER BY updated_at DESC
         LIMIT $3`,
        [tenantId, `%${question.substring(0, 50)}%`, limit]
      ).catch((err: any) => {
        console.error('[VeraCorrectionProcessor] Error getting corrections:', err.message);
        const message = err?.message || String(err);
        const isSchema = /column .* does not exist/i.test(message);
        veraEngineHealth.recordIssue(
          isSchema ? 'DB_SCHEMA_MISMATCH' : 'CORRECTION_PROCESSOR_ERROR',
          'Error loading my previously learned corrections. ' +
            'This reduces my ability to avoid repeating past mistakes.',
          isSchema ? 'error' : 'warning',
          { rawError: message, source: 'VeraCorrectionProcessor' }
        );
        return { rows: [] };
      });

      return textResult.rows.map((r: any) => this.mapRowToCorrection(r));
    } catch (error: any) {
      console.error('[VeraCorrectionProcessor] Error getting corrections:', error.message);
      const message = error?.message || String(error);
      const isSchema = /column .* does not exist/i.test(message);
      veraEngineHealth.recordIssue(
        isSchema ? 'DB_SCHEMA_MISMATCH' : 'CORRECTION_PROCESSOR_ERROR',
        'Error loading my previously learned corrections. ' +
          'This reduces my ability to avoid repeating past mistakes.',
        isSchema ? 'error' : 'warning',
        { rawError: message, source: 'VeraCorrectionProcessor' }
      );
      return [];
    }
  }

  /**
   * Map database row to Correction object
   */
  private static mapRowToCorrection(row: any): Correction {
    const tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || {});
    
    return {
      id: row.id,
      tenantId: row.tenant_id,
      sessionId: tags.sessionId || '',
      userId: '',
      originalQuestion: row.question_text,
      originalAnswer: row.incorrect_answer || '',
      correctedAnswer: row.corrected_answer,
      correctionText: row.corrected_answer,
      intent: row.intent || undefined,
      topic: row.topic || undefined,
      standardCode: row.standard_code || undefined,
      clauseRef: row.clause_reference || undefined,
      errorType: tags.errorType || 'other',
      confidence: tags.confidence || 0.8,
      createdAt: row.created_at || new Date()
    };
  }
}

