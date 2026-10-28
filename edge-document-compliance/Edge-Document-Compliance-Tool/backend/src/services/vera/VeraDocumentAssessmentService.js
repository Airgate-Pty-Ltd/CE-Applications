/**
 * Vera Document Assessment Service
 * 
 * Uses approved and bad examples to assess customer documents
 * and provide feedback on what's good vs what needs improvement
 */

import { queryEdcatAI, queryPostgres } from '../../config/databases.js';

class VeraDocumentAssessmentService {
  /**
   * Compare a customer document against approved/bad examples
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  static async assessDocumentAgainstExamples({ 
    documentId, 
    standardCode, 
    clauseRef = null 
  }) {
    try {
      // Get customer document
      const docResult = await queryPostgres(
        `SELECT id, name, extracted_text, tenant_id
         FROM public.customer_documents
         WHERE id = $1`,
        [documentId]
      );
      
      if (docResult.rows.length === 0) {
        return {
          success: false,
          error: 'Document not found'
        };
      }
      
      const customerDoc = docResult.rows[0];
      const customerText = customerDoc.extracted_text || '';
      
      // Get approved examples for this standard
      const approvedExamples = await queryEdcatAI(
        `SELECT 
          file_id,
          file_name,
          content_text,
          quality_score,
          metadata
         FROM edcat.document_content_for_learning dcl
         JOIN edcat.example_documents ed ON dcl.file_id = ed.file_id
         WHERE ed.standard_code = $1
           AND ed.category = 'approved_example'
           AND ed.quality_score >= 0.8
         ORDER BY ed.quality_score DESC
         LIMIT 5`,
        [standardCode]
      );
      
      // Get bad examples for this standard (for contrast)
      const badExamples = await queryEdcatAI(
        `SELECT 
          file_id,
          file_name,
          content_text,
          quality_score,
          metadata
         FROM edcat.document_content_for_learning dcl
         JOIN edcat.example_documents ed ON dcl.file_id = ed.file_id
         WHERE ed.standard_code = $1
           AND ed.category = 'bad_example'
         ORDER BY ed.quality_score ASC
         LIMIT 3`,
        [standardCode]
      );
      
      // Build assessment
      const assessment = {
        documentId,
        documentName: customerDoc.name,
        standardCode,
        clauseRef,
        hasApprovedExamples: approvedExamples.rows.length > 0,
        hasBadExamples: badExamples.rows.length > 0,
        approvedExampleCount: approvedExamples.rows.length,
        badExampleCount: badExamples.rows.length,
        recommendations: []
      };
      
      if (approvedExamples.rows.length > 0) {
        assessment.recommendations.push({
          type: 'positive',
          message: `I found ${approvedExamples.rows.length} approved example document(s) for ${standardCode}. Compare your document structure and content against these examples.`,
          examples: approvedExamples.rows.map(r => ({
            fileName: r.file_name,
            qualityScore: r.quality_score
          }))
        });
      }
      
      if (badExamples.rows.length > 0) {
        assessment.recommendations.push({
          type: 'warning',
          message: `I found ${badExamples.rows.length} example document(s) that failed audit. Review these to understand common pitfalls to avoid.`,
          examples: badExamples.rows.map(r => ({
            fileName: r.file_name,
            qualityScore: r.quality_score
          }))
        });
      }
      
      return {
        success: true,
        assessment
      };
    } catch (error) {
      console.error('[VeraDocumentAssessmentService] Error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get approved examples for a standard/clause
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  static async getApprovedExamples({ standardCode, clauseRef = null, limit = 5 }) {
    try {
      let query = `
        SELECT 
          ed.file_id,
          ed.file_name,
          ed.standard_code,
          ed.quality_score,
          ed.metadata,
          dcl.content_text
        FROM edcat.example_documents ed
        JOIN edcat.document_content_for_learning dcl ON ed.file_id = dcl.file_id
        WHERE ed.standard_code = $1
          AND ed.category = 'approved_example'
          AND ed.quality_score >= 0.8
      `;
      
      const params = [standardCode];
      
      if (clauseRef) {
        // Search for clause reference in content
        query += ` AND dcl.content_text ILIKE $2`;
        params.push(`%clause ${clauseRef}%`);
      }
      
      query += ` ORDER BY ed.quality_score DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const result = await queryEdcatAI(query, params);
      
      return {
        success: true,
        examples: result.rows.map(r => ({
          fileId: r.file_id,
          fileName: r.file_name,
          standardCode: r.standard_code,
          qualityScore: r.quality_score,
          metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
          contentPreview: r.content_text?.substring(0, 500) || ''
        }))
      };
    } catch (error) {
      console.error('[VeraDocumentAssessmentService] Error:', error.message);
      return {
        success: false,
        error: error.message,
        examples: []
      };
    }
  }
  
  /**
   * Get bad examples for a standard/clause (for learning what to avoid)
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  static async getBadExamples({ standardCode, clauseRef = null, limit = 3 }) {
    try {
      let query = `
        SELECT 
          ed.file_id,
          ed.file_name,
          ed.standard_code,
          ed.quality_score,
          ed.metadata,
          dcl.content_text
        FROM edcat.example_documents ed
        JOIN edcat.document_content_for_learning dcl ON ed.file_id = dcl.file_id
        WHERE ed.standard_code = $1
          AND ed.category = 'bad_example'
      `;
      
      const params = [standardCode];
      
      if (clauseRef) {
        query += ` AND dcl.content_text ILIKE $2`;
        params.push(`%clause ${clauseRef}%`);
      }
      
      query += ` ORDER BY ed.quality_score ASC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const result = await queryEdcatAI(query, params);
      
      return {
        success: true,
        examples: result.rows.map(r => ({
          fileId: r.file_id,
          fileName: r.file_name,
          standardCode: r.standard_code,
          qualityScore: r.quality_score,
          metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
          contentPreview: r.content_text?.substring(0, 500) || '',
          note: 'This document failed audit - review to understand what to avoid'
        }))
      };
    } catch (error) {
      console.error('[VeraDocumentAssessmentService] Error:', error.message);
      return {
        success: false,
        error: error.message,
        examples: []
      };
    }
  }
}

export default VeraDocumentAssessmentService;

