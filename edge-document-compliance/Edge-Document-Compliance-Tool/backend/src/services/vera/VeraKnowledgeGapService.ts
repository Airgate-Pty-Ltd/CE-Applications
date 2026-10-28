/**
 * Vera Knowledge Gap Service
 * 
 * Detects when Vera is missing critical information needed to answer user requests.
 * Creates structured information requests that guide users to upload missing documents.
 * 
 * 100% internal - no external LLM calls.
 */

import { queryEdcatAI } from '../../config/databases.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Interfaces
// ============================================================================

export interface KnowledgeGapRequest {
  requestId: string;
  requestType: 'standard' | 'regulatory' | 'example_good' | 'example_bad' | 'customer_requirement' | 'training_material' | 'data_set' | 'clause_detail' | 'procedure_template';
  standardCode?: string | null;
  regulationRef?: string | null;
  topic?: string | null;
  description: string;
  suggestedFolder?: string | null;
  suggestedTag?: string | null;
  requestedArtifactType?: string | null;
}

export interface SemanticContext {
  standards?: Array<{ code: string; name?: string; title?: string; revision?: string }>;
  learningDocs?: Array<{ standard_code?: string; standardCode?: string; content_text?: string; contentText?: string }>;
  approvedExamples?: Array<{ standard_code?: string; standardCode?: string; file_name?: string; fileName?: string }>;
  badExamples?: Array<{ standard_code?: string; standardCode?: string; file_name?: string; fileName?: string }>;
  clauses?: Array<{ standardCode?: string; standard_code?: string; clauseId?: string; clause_id?: string }>;
  detectedStandardCode?: string;
}

// ============================================================================
// Main Service
// ============================================================================

export class VeraKnowledgeGapService {
  /**
   * Detect whether Vera is missing key information to properly respond.
   * 
   * @param params - Detection parameters
   * @returns KnowledgeGapRequest if gap detected, null otherwise
   */
  static async detectKnowledgeGap(params: {
    tenantId: string;
    sessionId: string;
    intent: string;
    topic?: string;
    standardCode?: string | null;
    clauseRef?: string | null;
    semanticContext: SemanticContext;
  }): Promise<KnowledgeGapRequest | null> {
    const {
      tenantId,
      sessionId,
      intent,
      topic,
      standardCode,
      clauseRef,
      semanticContext
    } = params;

    // 1) Check if referenced standard is actually present
    if (standardCode && !this._hasStandardContent(semanticContext, standardCode)) {
      return await this._createAndReturnRequest({
        tenantId,
        sessionId,
        requestType: 'standard',
        standardCode,
        regulationRef: clauseRef || null,
        topic: topic || standardCode,
        requestedArtifactType: 'pdf',
        description: `I need the full standard ${standardCode} as a clean, official PDF to answer this request accurately.`,
        suggestedFolder: `Requirements/Standards/${standardCode}`,
        suggestedTag: 'Approved Standard'
      });
    }

    // 2) Check for clause-specific content
    if (intent === 'clause_question' && clauseRef && standardCode) {
      const hasClauseContent = this._hasClauseContent(semanticContext, standardCode, clauseRef);
      if (!hasClauseContent) {
        return await this._createAndReturnRequest({
          tenantId,
          sessionId,
          requestType: 'clause_detail',
          standardCode,
          regulationRef: clauseRef,
          topic: `${standardCode} ${clauseRef}`,
          requestedArtifactType: 'pdf',
          description: `I need detailed information about ${standardCode} clause ${clauseRef} to provide an accurate answer. Please upload the standard document or a detailed procedure covering this clause.`,
          suggestedFolder: `Requirements/Standards/${standardCode}`,
          suggestedTag: 'Approved Standard'
        });
      }
    }

    // 3) Example-based requests (e.g., user asked for procedure generation)
    if ((intent === 'procedure_generation' || intent === 'request_examples') && standardCode) {
      const hasExamples = this._hasExamples(semanticContext, standardCode);
      if (!hasExamples) {
        return await this._createAndReturnRequest({
          tenantId,
          sessionId,
          requestType: 'example_good',
          standardCode,
          topic: `Approved procedure examples for ${standardCode}${clauseRef ? ` clause ${clauseRef}` : ''}`,
          requestedArtifactType: 'any',
          description: `I need at least one approved 'good' example document for ${standardCode}${clauseRef ? ` clause ${clauseRef}` : ''} to illustrate best practice and generate accurate procedures.`,
          suggestedFolder: `Requirements/Examples/Approved/${standardCode}`,
          suggestedTag: 'Approved Document'
        });
      }
    }

    // 4) Regulatory-specific (FAA 21.137, CASA CASRs, etc.)
    if (standardCode) {
      const isRegulatory = this._isRegulatoryStandard(standardCode);
      if (isRegulatory && !this._hasStandardContent(semanticContext, standardCode)) {
        const regulatoryInfo = this._getRegulatoryInfo(standardCode);
        return await this._createAndReturnRequest({
          tenantId,
          sessionId,
          requestType: 'regulatory',
          standardCode,
          regulationRef: clauseRef || null,
          topic: topic || `${standardCode} requirements`,
          requestedArtifactType: 'pdf',
          description: regulatoryInfo.description,
          suggestedFolder: regulatoryInfo.folder,
          suggestedTag: 'Approved Standard'
        });
      }
    }

    // 5) Gap analysis requests - need both standard and examples
    if (intent === 'gap_analysis_request' && standardCode) {
      const hasStandard = this._hasStandardContent(semanticContext, standardCode);
      const hasExamples = this._hasExamples(semanticContext, standardCode);
      
      if (!hasStandard) {
        return await this._createAndReturnRequest({
          tenantId,
          sessionId,
          requestType: 'standard',
          standardCode,
          topic: `Standard document for gap analysis: ${standardCode}`,
          requestedArtifactType: 'pdf',
          description: `I need the ${standardCode} standard document to perform a gap analysis.`,
          suggestedFolder: `Requirements/Standards/${standardCode}`,
          suggestedTag: 'Approved Standard'
        });
      }
      
      if (!hasExamples) {
        return await this._createAndReturnRequest({
          tenantId,
          sessionId,
          requestType: 'example_good',
          standardCode,
          topic: `Approved examples for gap analysis: ${standardCode}`,
          requestedArtifactType: 'any',
          description: `I need approved example documents for ${standardCode} to compare against during gap analysis.`,
          suggestedFolder: `Requirements/Examples/Approved/${standardCode}`,
          suggestedTag: 'Approved Document'
        });
      }
    }

    // No gap detected
    return null;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Check if standard content exists in semantic context
   */
  private static _hasStandardContent(context: SemanticContext, standardCode: string): boolean {
    if (!context) return false;

    // Check learning docs
    const hasLearningDocs = context.learningDocs?.some(
      doc => {
        const docCode = doc.standardCode || doc.standard_code;
        if (!docCode) return false;
        return docCode === standardCode ||
               docCode.toUpperCase().includes(standardCode.toUpperCase()) ||
               standardCode.toUpperCase().includes(docCode.toUpperCase());
      }
    );

    // Check standards list
    const hasInStandards = context.standards?.some(
      std => std.code === standardCode || 
             std.code.toUpperCase().includes(standardCode.toUpperCase())
    );

    return hasLearningDocs || hasInStandards || false;
  }

  /**
   * Check if clause-specific content exists
   */
  private static _hasClauseContent(context: SemanticContext, standardCode: string, clauseRef: string): boolean {
    if (!context) return false;

    // Check clauses
    const hasClause = context.clauses?.some(
      clause => {
        const clauseStdCode = clause.standardCode || clause.standard_code;
        const clauseId = clause.clauseId || clause.clause_id;
        return clauseStdCode === standardCode && clauseId && clauseId.includes(clauseRef);
      }
    );

    // Check learning docs for clause references
    const hasInDocs = context.learningDocs?.some(
      doc => {
        const docCode = doc.standardCode || doc.standard_code;
        const content = doc.contentText || doc.content_text || '';
        return docCode === standardCode && content.toLowerCase().includes(clauseRef.toLowerCase());
      }
    );

    return hasClause || hasInDocs || false;
  }

  /**
   * Check if examples exist for standard
   */
  private static _hasExamples(context: SemanticContext, standardCode: string): boolean {
    if (!context) return false;

    const hasApproved = context.approvedExamples?.some(
      ex => {
        const exCode = ex.standardCode || ex.standard_code;
        if (!exCode) return false;
        return exCode === standardCode ||
               exCode.toUpperCase().includes(standardCode.toUpperCase());
      }
    );

    const hasBad = context.badExamples?.some(
      ex => {
        const exCode = ex.standardCode || ex.standard_code;
        if (!exCode) return false;
        return exCode === standardCode ||
               exCode.toUpperCase().includes(standardCode.toUpperCase());
      }
    );

    return hasApproved || hasBad || false;
  }

  /**
   * Check if standard is regulatory
   */
  private static _isRegulatoryStandard(standardCode: string): boolean {
    const upper = standardCode.toUpperCase();
    return upper.includes('FAA') ||
           upper.includes('CASA') ||
           upper.includes('EASA') ||
           upper.includes('UK_CAA') ||
           upper.includes('UKCAA') ||
           upper.includes('REGULATORY');
  }

  /**
   * Get regulatory-specific information
   */
  private static _getRegulatoryInfo(standardCode: string): { description: string; folder: string } {
    const upper = standardCode.toUpperCase();
    
    if (upper.includes('FAA')) {
      if (upper.includes('21_137') || upper.includes('21.137')) {
        return {
          description: `I need the current FAA 14 CFR Part 21.137 quality system requirements in an official format (PDF or authoritative source) to validate your PAH system and answer questions accurately.`,
          folder: 'Requirements/Regulatory/FAA'
        };
      }
      return {
        description: `I need the current FAA regulatory document for ${standardCode} in an official format to provide accurate compliance guidance.`,
        folder: 'Requirements/Regulatory/FAA'
      };
    }
    
    if (upper.includes('CASA')) {
      return {
        description: `I need the current CASA CASRS document for ${standardCode} in an official format to provide accurate compliance guidance.`,
        folder: 'Requirements/Regulatory/CASA'
      };
    }
    
    if (upper.includes('EASA')) {
      return {
        description: `I need the current EASA regulatory document for ${standardCode} in an official format to provide accurate compliance guidance.`,
        folder: 'Requirements/Regulatory/EASA'
      };
    }
    
    if (upper.includes('UK_CAA') || upper.includes('UKCAA')) {
      return {
        description: `I need the current UK CAA regulatory document for ${standardCode} in an official format to provide accurate compliance guidance.`,
        folder: 'Requirements/Regulatory/UK CAA'
      };
    }
    
    // Generic regulatory
    return {
      description: `I need the current regulatory document for ${standardCode} in an official format to provide accurate compliance guidance.`,
      folder: 'Requirements/Regulatory'
    };
  }

  /**
   * Create and store information request
   */
  private static async _createAndReturnRequest(req: {
    tenantId: string;
    sessionId: string;
    requestType: KnowledgeGapRequest['requestType'];
    standardCode?: string | null;
    regulationRef?: string | null;
    topic?: string | null;
    description: string;
    suggestedFolder?: string | null;
    suggestedTag?: string | null;
    requestedArtifactType?: string | null;
  }): Promise<KnowledgeGapRequest> {
    const {
      tenantId,
      sessionId,
      requestType,
      standardCode,
      regulationRef,
      topic,
      description,
      suggestedFolder,
      suggestedTag,
      requestedArtifactType
    } = req;

    try {
      const result = await queryEdcatAI(
        `INSERT INTO edcat.ai_information_request
         (tenant_id, session_id, request_type, standard_code, regulation_ref, topic,
          description, suggested_folder, suggested_tag, requested_artifact_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
        [
          tenantId,
          sessionId || null,
          requestType,
          standardCode || null,
          regulationRef || null,
          topic || null,
          description,
          suggestedFolder || null,
          suggestedTag || null,
          requestedArtifactType || null
        ]
      );

      const row = result?.rows?.[0];
      
      console.log('[VeraKnowledgeGapService] Created info request', {
        id: row?.id,
        requestType,
        standardCode,
        topic
      });

      // Return object used to shape Vera's reply
      return {
        requestId: row?.id,
        requestType,
        standardCode: standardCode || null,
        regulationRef: regulationRef || null,
        topic: topic || null,
        description,
        suggestedFolder: suggestedFolder || null,
        suggestedTag: suggestedTag || null,
        requestedArtifactType: requestedArtifactType || null
      };
    } catch (error: any) {
      console.error('[VeraKnowledgeGapService] Error creating request:', error.message);
      // Return request object even if DB insert fails (non-fatal)
      return {
        requestId: uuidv4(),
        requestType,
        standardCode: standardCode || null,
        regulationRef: regulationRef || null,
        topic: topic || null,
        description,
        suggestedFolder: suggestedFolder || null,
        suggestedTag: suggestedTag || null,
        requestedArtifactType: requestedArtifactType || null
      };
    }
  }

  /**
   * Check if a request has been fulfilled
   */
  static async checkRequestFulfillment(requestId: string): Promise<boolean> {
    try {
      const result = await queryEdcatAI(
        `SELECT status, fulfilled_at, fulfilled_by_file_ids
         FROM edcat.ai_information_request
         WHERE id = $1`,
        [requestId]
      );

      if (result.rows.length === 0) return false;
      
      const row = result.rows[0];
      return row.status === 'fulfilled' || row.status === 'partial';
    } catch (error: any) {
      console.error('[VeraKnowledgeGapService] Error checking fulfillment:', error.message);
      return false;
    }
  }

  /**
   * Get open requests for a tenant
   */
  static async getOpenRequests(tenantId: string, limit = 10): Promise<KnowledgeGapRequest[]> {
    try {
      const result = await queryEdcatAI(
        `SELECT id, request_type, standard_code, regulation_ref, topic, description,
                suggested_folder, suggested_tag, requested_artifact_type
         FROM edcat.ai_information_request
         WHERE tenant_id = $1 AND status = 'open'
         ORDER BY created_at DESC
         LIMIT $2`,
        [tenantId, limit]
      );

      return result.rows.map((row: any) => ({
        requestId: row.id,
        requestType: row.request_type,
        standardCode: row.standard_code,
        regulationRef: row.regulation_ref,
        topic: row.topic,
        description: row.description,
        suggestedFolder: row.suggested_folder,
        suggestedTag: row.suggested_tag,
        requestedArtifactType: row.requested_artifact_type
      }));
    } catch (error: any) {
      console.error('[VeraKnowledgeGapService] Error getting open requests:', error.message);
      return [];
    }
  }
}

