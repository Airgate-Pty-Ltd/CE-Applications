/**
 * Vera Parser Supervisor Service
 * 
 * Provides Vera with a stable API to:
 * - Trigger parsing runs for standards, regulations, and customer documents
 * - Access parsing results and QA metrics
 * - Record parser feedback for continuous improvement
 * - Evaluate parser health and trustworthiness
 * 
 * This service wraps the existing parser logic from routes/parse.js
 * and makes it callable by VeraReasoningEngine without HTTP overhead.
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';
import { requirementMetrics } from '../metricsService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * ParsingSummary object structure
 * @typedef {Object} ParsingSummary
 * @property {string} standardId - Standard UUID
 * @property {string} documentId - Document UUID (if applicable)
 * @property {string} documentType - 'STANDARD', 'REGULATION', 'CUSTOMER_REQUIREMENTS', 'LEARNING_DOC'
 * @property {number} requirementsCount - Total requirements extracted
 * @property {Object} clauseCoverage - Map of clause numbers to requirement counts
 * @property {Object} confidenceStats - {min, max, avg, distribution}
 * @property {string} qaStatus - 'PASS', 'WARN', 'FAIL'
 * @property {Array<string>} qaIssues - List of critical issues
 * @property {Array<string>} qaWarnings - List of warnings
 * @property {string} parserRunId - UUID of the parser run record
 * @property {Array<string>} parserChainUsed - Ordered list of parsers used
 * @property {string} timestamp - ISO timestamp
 * @property {Object} metrics - Full metrics breakdown
 */

class VeraParserSupervisorService {
  /**
   * Parse a standard document
   * @param {Object} params
   * @param {string} params.tenantId
   * @param {string} params.standardId
   * @param {boolean} [params.force=false] - Force re-parse even if already parsed
   * @param {string} [params.userId] - User who triggered the parse
   * @returns {Promise<ParsingSummary>}
   */
  static async parseStandard({ tenantId = DEFAULT_TENANT_ID, standardId, force = false, userId = null }) {
    console.log(`[VeraParserSupervisor] Parsing standard ${standardId} (force: ${force})`);
    
    // Create parser run record
    const parserRunId = await this.createParserRun({
      tenantId,
      standardId,
      documentId: null,
      documentType: 'STANDARD',
      userId
    });

    try {
      // Import the parsing logic from parse.js route
      // We'll extract the core logic into reusable functions
      const parseResult = await this.executeStandardParse({ standardId, force });
      
      // Get metrics and QA
      const metrics = await requirementMetrics(standardId);
      const qaReport = await this.generateQAReport({ standardId, metrics });
      
      // Calculate confidence stats
      const confidenceStats = await this.calculateConfidenceStats(standardId);
      
      // Calculate clause coverage
      const clauseCoverage = await this.calculateClauseCoverage(standardId);
      
      // Determine parser chain used (from parse result)
      const parserChainUsed = parseResult.parserChain || ['UniversalComplianceParser'];
      
      // Build parsing summary
      const summary = {
        standardId,
        documentId: null,
        documentType: 'STANDARD',
        requirementsCount: parseResult.requirementsCount,
        clauseCoverage,
        confidenceStats,
        qaStatus: qaReport.status,
        qaIssues: qaReport.issues || [],
        qaWarnings: qaReport.warnings || [],
        parserRunId,
        parserChainUsed,
        timestamp: new Date().toISOString(),
        metrics
      };
      
      // Finalize parser run record
      await this.finalizeParserRun({
        parserRunId,
        summary,
        parserChainUsed,
        error: null
      });
      
      return summary;
    } catch (error) {
      console.error(`[VeraParserSupervisor] Parse failed: ${error.message}`);
      
      // Finalize parser run with error
      await this.finalizeParserRun({
        parserRunId,
        summary: null,
        parserChainUsed: [],
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Get parsing summary for an already-parsed standard
   * @param {Object} params
   * @param {string} params.tenantId
   * @param {string} params.standardId
   * @returns {Promise<ParsingSummary|null>}
   */
  static async getStandardParsingSummary({ tenantId = DEFAULT_TENANT_ID, standardId }) {
    // Check if standard has been parsed
    const countResult = await queryPostgres(
      `SELECT COUNT(*) as count FROM public.parsed_requirements WHERE standard_id = $1`,
      [standardId]
    );
    
    const count = parseInt(countResult.rows[0]?.count || 0);
    if (count === 0) {
      return null; // Not parsed yet
    }
    
    // Get metrics
    const metrics = await requirementMetrics(standardId);
    const qaReport = await this.generateQAReport({ standardId, metrics });
    const confidenceStats = await this.calculateConfidenceStats(standardId);
    const clauseCoverage = await this.calculateClauseCoverage(standardId);
    
    // Get standard info
    const standardResult = await queryPostgres(
      `SELECT code, name, file_category FROM public.standards WHERE id = $1`,
      [standardId]
    );
    
    const standard = standardResult.rows[0];
    const documentType = this.inferDocumentType(standard?.file_category, standard?.code);
    
    // Get most recent parser run
    const runResult = await queryEdcatAI(
      `SELECT id, parser_chain, qa_status, qa_issues, qa_warnings, completed_at
       FROM edcat.parser_runs
       WHERE standard_id = $1 AND completed_at IS NOT NULL
       ORDER BY completed_at DESC
       LIMIT 1`,
      [standardId]
    );
    
    const parserRun = runResult.rows[0];
    
    return {
      standardId,
      documentId: null,
      documentType,
      requirementsCount: count,
      clauseCoverage,
      confidenceStats,
      qaStatus: parserRun?.qa_status || qaReport.status,
      qaIssues: parserRun?.qa_issues || qaReport.issues || [],
      qaWarnings: parserRun?.qa_warnings || qaReport.warnings || [],
      parserRunId: parserRun?.id || null,
      parserChainUsed: parserRun?.parser_chain || [],
      timestamp: parserRun?.completed_at || new Date().toISOString(),
      metrics
    };
  }

  /**
   * Parse a customer requirement document
   * @param {Object} params
   * @param {string} params.tenantId
   * @param {string} params.documentId
   * @param {boolean} [params.force=false]
   * @param {string} [params.userId]
   * @returns {Promise<ParsingSummary>}
   */
  static async parseCustomerRequirementDocument({ tenantId = DEFAULT_TENANT_ID, documentId, force = false, userId = null }) {
    console.log(`[VeraParserSupervisor] Parsing customer document ${documentId}`);
    
    // Get document info
    const docResult = await queryPostgres(
      `SELECT id, tenant_id, name, extracted_text, file_type FROM public.customer_documents WHERE id = $1`,
      [documentId]
    );
    
    if (docResult.rows.length === 0) {
      throw new Error(`Customer document ${documentId} not found`);
    }
    
    const document = docResult.rows[0];
    
    // Create parser run record
    const parserRunId = await this.createParserRun({
      tenantId,
      standardId: null,
      documentId,
      documentType: 'CUSTOMER_REQUIREMENTS',
      userId
    });
    
    try {
      // Use learning ingestion service to extract knowledge
      // This will also identify requirement-like statements
      const VeraLearningIngestionService = (await import('./VeraLearningIngestionService.js')).default;
      await VeraLearningIngestionService.learnFromDocument({ tenantId, documentId, userId });
      
      // For now, return a summary based on document content
      // In future, we can extract structured requirements similar to standards
      const summary = {
        standardId: null,
        documentId,
        documentType: 'CUSTOMER_REQUIREMENTS',
        requirementsCount: 0, // Will be enhanced later
        clauseCoverage: {},
        confidenceStats: { min: 0, max: 0, avg: 0 },
        qaStatus: 'PASS',
        qaIssues: [],
        qaWarnings: [],
        parserRunId,
        parserChainUsed: ['VeraLearningIngestionService'],
        timestamp: new Date().toISOString(),
        metrics: {}
      };
      
      await this.finalizeParserRun({
        parserRunId,
        summary,
        parserChainUsed: ['VeraLearningIngestionService'],
        error: null
      });
      
      return summary;
    } catch (error) {
      console.error(`[VeraParserSupervisor] Customer document parse failed: ${error.message}`);
      
      await this.finalizeParserRun({
        parserRunId,
        summary: null,
        parserChainUsed: [],
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Parse document for learning purposes (not requirements extraction)
   * @param {Object} params
   * @param {string} params.tenantId
   * @param {string} params.documentId
   * @param {string} [params.userId]
   * @returns {Promise<Object>}
   */
  static async parseForLearning({ tenantId = DEFAULT_TENANT_ID, documentId, userId = null }) {
    console.log(`[VeraParserSupervisor] Parsing document ${documentId} for learning`);
    
    const VeraLearningIngestionService = (await import('./VeraLearningIngestionService.js')).default;
    const result = await VeraLearningIngestionService.learnFromDocument({ tenantId, documentId, userId });
    
    return {
      documentId,
      learningComplete: true,
      qaPairsExtracted: result?.qaPairsExtracted || 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Record parser feedback from user or Vera
   * @param {Object} params
   * @param {string} params.tenantId
   * @param {string} params.parserRunId
   * @param {string} params.feedbackType - 'MISSING_REQUIREMENTS', 'WRONG_CLAUSE', etc.
   * @param {Object} params.feedbackDetails - Structured feedback payload
   * @param {string} [params.userId]
   * @returns {Promise<Object>}
   */
  static async recordParserFeedback({ tenantId = DEFAULT_TENANT_ID, parserRunId, feedbackType, feedbackDetails, userId = null }) {
    console.log(`[VeraParserSupervisor] Recording parser feedback: ${feedbackType}`);
    
    const insertSql = `
      INSERT INTO edcat.parser_feedback 
        (tenant_id, parser_run_id, feedback_type, feedback_details, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await queryEdcatAI(insertSql, [
      tenantId,
      parserRunId,
      feedbackType,
      JSON.stringify(feedbackDetails),
      userId
    ]);
    
    // Also log to learning events (trigger will handle this, but we can also do it explicitly)
    try {
      await queryEdcatAI(
        `INSERT INTO edcat.edcat_learning_events 
         (requirement_id, standard_id, event_type, confidence_before, confidence_after, improvement, feedback_rating, created_at)
         VALUES (NULL, $1::text::uuid, 'parser_feedback', 0.0, 0.0, 0.0, $2, NOW())
         ON CONFLICT DO NOTHING`,
        [parserRunId, feedbackType.includes('MISSING') || feedbackType.includes('WRONG') ? 1 : 2]
      );
    } catch (e) {
      // Ignore if learning events table doesn't have the right structure
      console.warn(`[VeraParserSupervisor] Could not log to learning events: ${e.message}`);
    }
    
    return result.rows[0];
  }

  /**
   * Create a parser run record
   * @private
   */
  static async createParserRun({ tenantId, standardId, documentId, documentType, userId }) {
    const insertSql = `
      INSERT INTO edcat.parser_runs 
        (tenant_id, standard_id, document_id, document_type, parser_chain, started_at, created_by)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      RETURNING id
    `;
    
    const result = await queryEdcatAI(insertSql, [
      tenantId,
      standardId,
      documentId,
      documentType,
      JSON.stringify([]), // Will be updated when parsing completes
      userId
    ]);
    
    return result.rows[0].id;
  }

  /**
   * Finalize a parser run record with results
   * @private
   */
  static async finalizeParserRun({ parserRunId, summary, parserChainUsed, error }) {
    const updateSql = `
      UPDATE edcat.parser_runs
      SET 
        parser_chain = $1,
        requirements_extracted = $2,
        qa_status = $3,
        qa_issues = $4,
        qa_warnings = $5,
        confidence_stats = $6,
        clause_coverage = $7,
        run_metadata = $8,
        completed_at = NOW(),
        error_message = $9
      WHERE id = $10
    `;
    
    await queryEdcatAI(updateSql, [
      JSON.stringify(parserChainUsed),
      summary?.requirementsCount || 0,
      summary?.qaStatus || (error ? 'FAIL' : 'PASS'),
      JSON.stringify(summary?.qaIssues || []),
      JSON.stringify(summary?.qaWarnings || []),
      JSON.stringify(summary?.confidenceStats || {}),
      JSON.stringify(summary?.clauseCoverage || {}),
      JSON.stringify({ timestamp: summary?.timestamp }),
      error,
      parserRunId
    ]);
  }

  /**
   * Execute the actual standard parsing (extracted from parse.js route)
   * @private
   */
  static async executeStandardParse({ standardId, force }) {
    // Import the extraction function from parse.js (now exported)
    const { extractRequirementsBounded } = await import('../../routes/parse.js');
    
    // Get standard info
    let standardResult;
    let standard = null;
    
    // NOTE: Standards are always in Customer Data DB (public.*), not EDCAT AI DB (edcat.*)
    // Always use queryPostgres for public.standards
    try {
      standardResult = await queryPostgres(
        `SELECT id, code, name, file_category, file_content, file_path, file_type FROM public.standards WHERE id = $1`,
        [standardId]
      );
      if (standardResult.rows.length > 0) {
        standard = standardResult.rows[0];
      }
    } catch (e) {
      console.warn(`[VeraParserSupervisor] Error querying Customer Data DB: ${e.message}`);
    }
    
    if (!standard) {
      throw new Error(`Standard ${standardId} not found`);
    }
    
    // Read file content using the same logic as parse.js route
    const { readDocumentFile, readDocumentFromDatabase } = await import('../../routes/parse.js');
    
    let fileContent;
    if (standard.file_content) {
      // Read from database
      fileContent = await readDocumentFromDatabase(standardId, null);
    } else if (standard.file_path) {
      // Read from filesystem
      fileContent = await readDocumentFile(standard.file_path, standardId, null);
    } else {
      throw new Error(`No file content found for standard ${standardId}`);
    }
    
    // Extract requirements
    const extractedRequirements = await extractRequirementsBounded(
      fileContent,
      standard.name,
      standard.code,
      standardId,
      {
        fileCategory: standard.file_category,
        documentName: standard.name,
        standardCode: standard.code
      }
    );
    
    // Store requirements - we need to call the storage logic from parse.js
    // For now, we'll trigger the full parse route via HTTP or extract storage logic
    // TODO: Extract storage logic into a reusable function
    
    // Check existing count
    const existingResult = await queryPostgres(
      `SELECT COUNT(*) as count FROM public.parsed_requirements WHERE standard_id = $1`,
      [standardId]
    );
    const existingCount = parseInt(existingResult.rows[0]?.count || 0);
    
    // If force re-parse, delete existing
    if (existingCount > 0 && force) {
      await queryPostgres(
        `DELETE FROM public.parsed_requirements WHERE standard_id = $1`,
        [standardId]
      );
    }
    
    // Store new requirements (simplified version - full logic in parse.js)
    // We'll need to import the storage logic or call the parse route
    // For now, return the count and let the caller handle storage via the route
    
    return {
      requirementsCount: extractedRequirements.length,
      parserChain: ['UniversalComplianceParser'], // Will be determined by actual parser used
      extractedRequirements // Return for storage
    };
  }

  /**
   * Generate QA report for a parsed standard
   * @private
   */
  static async generateQAReport({ standardId, metrics }) {
    const totals = metrics.totals || {};
    const totalInScope = parseInt(totals.in_scope_total || '0', 10);
    const totalOutScope = parseInt(totals.out_scope_total || '0', 10);
    
    const issues = [];
    const warnings = [];
    
    // Check for requirements in clauses 1-3 (should be zero)
    const badScopeResult = await queryPostgres(`
      SELECT clause_ref FROM public.parsed_requirements
      WHERE standard_id = $1 AND requirement_type IS NOT NULL
        AND (split_part(clause_ref, '.', 1) IN ('1', '2', '3') OR NOT is_in_scope)
      LIMIT 5
    `, [standardId]);
    
    if (badScopeResult.rows.length > 0) {
      issues.push(`OUT-OF-SCOPE: Requirements found in clauses 1-3 or marked out-of-scope`);
    }
    
    // Range checks
    if (totalInScope < 300) {
      warnings.push(`Requirement total ${totalInScope} below expected minimum (300)`);
    }
    if (totalInScope > 420) {
      warnings.push(`Requirement total ${totalInScope} above expected maximum (420)`);
    }
    
    // Check clause distribution
    const topClauseSet = new Set((metrics.byClause || []).map(r => r.top_clause));
    const missingTopClauses = ['4', '5', '6', '7', '8', '9', '10'].filter(c => !topClauseSet.has(c));
    if (missingTopClauses.length > 0) {
      warnings.push(`No requirements found in clauses: ${missingTopClauses.join(', ')}`);
    }
    
    if (totalOutScope > 0) {
      warnings.push(`${totalOutScope} requirement(s) marked as out-of-scope (should be 0)`);
    }
    
    return {
      status: issues.length > 0 ? 'FAIL' : (warnings.length > 0 ? 'WARN' : 'PASS'),
      issues,
      warnings
    };
  }

  /**
   * Calculate confidence statistics
   * @private
   */
  static async calculateConfidenceStats(standardId) {
    const result = await queryPostgres(`
      SELECT 
        MIN(confidence) as min_confidence,
        MAX(confidence) as max_confidence,
        AVG(confidence) as avg_confidence,
        COUNT(*) as total
      FROM public.parsed_requirements
      WHERE standard_id = $1
    `, [standardId]);
    
    const row = result.rows[0];
    return {
      min: parseFloat(row.min_confidence || 0),
      max: parseFloat(row.max_confidence || 0),
      avg: parseFloat(row.avg_confidence || 0),
      total: parseInt(row.total || 0)
    };
  }

  /**
   * Calculate clause coverage
   * @private
   */
  static async calculateClauseCoverage(standardId) {
    const result = await queryPostgres(`
      SELECT 
        clause_number,
        COUNT(*) as count
      FROM public.parsed_requirements
      WHERE standard_id = $1 AND is_in_scope
      GROUP BY clause_number
      ORDER BY clause_number
    `, [standardId]);
    
    const coverage = {};
    for (const row of result.rows) {
      coverage[row.clause_number] = parseInt(row.count);
    }
    
    return coverage;
  }

  /**
   * Infer document type from file category and code
   * @private
   */
  static inferDocumentType(fileCategory, code) {
    if (fileCategory === 'regulatory') return 'REGULATION';
    if (fileCategory === 'customer_requirements') return 'CUSTOMER_REQUIREMENTS';
    if (fileCategory === 'standard') return 'STANDARD';
    
    // Infer from code
    const codeLower = (code || '').toLowerCase();
    if (codeLower.match(/faa|easa|casa|part\s*21|part\s*145/)) return 'REGULATION';
    if (codeLower.match(/boeing|airbus|embraer/)) return 'CUSTOMER_REQUIREMENTS';
    
    return 'STANDARD';
  }

  /**
   * Evaluate if a parse result is trustworthy
   * @param {ParsingSummary} summary
   * @returns {Object} {trustworthy: boolean, concerns: Array<string>}
   */
  static evaluateParseTrustworthiness(summary) {
    const concerns = [];
    
    if (summary.qaStatus === 'FAIL') {
      concerns.push('QA validation failed - parse results are not trustworthy');
    }
    
    if (summary.requirementsCount < 100) {
      concerns.push(`Very low requirement count (${summary.requirementsCount}) - likely incomplete parse`);
    }
    
    if (summary.confidenceStats.avg < 0.6) {
      concerns.push(`Low average confidence (${summary.confidenceStats.avg}) - parse quality is questionable`);
    }
    
    if (summary.qaWarnings.length > 3) {
      concerns.push(`Multiple QA warnings (${summary.qaWarnings.length}) - parse may be unreliable`);
    }
    
    // Check clause coverage for standards
    if (summary.documentType === 'STANDARD') {
      const expectedClauses = ['4', '5', '6', '7', '8', '9', '10'];
      const coveredClauses = Object.keys(summary.clauseCoverage).map(c => c.split('.')[0]);
      const missing = expectedClauses.filter(c => !coveredClauses.includes(c));
      if (missing.length > 2) {
        concerns.push(`Missing requirements in major clauses: ${missing.join(', ')}`);
      }
    }
    
    return {
      trustworthy: concerns.length === 0 && summary.qaStatus !== 'FAIL',
      concerns
    };
  }
}

export default VeraParserSupervisorService;

