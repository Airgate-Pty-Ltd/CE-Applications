/**
 * EDCAT AI Orchestrator
 * This is EDCAT AI's brain - it sequences all operations
 * 
 * Architecture:
 * - EDCAT AI is ComplianceGap's intelligence core
 * - Orchestrator coordinates: Parse → Crawl → Match → Clarify → Learn
 */

import { v4 as uuidv4 } from 'uuid';
import { queryPostgres, queryEdcatAI } from '../database/connection.js';
import auditTrail from './auditTrail.js';

// Import EDCAT modules
import clauseParser from './parser/clauseParser.js';
import gapAnalyzer from './analysis/gapAnalyzer.js';
import clarificationEngine from './clarification/clarificationEngine.js';
import learningSystem from './learning/learningSystem.js';

class EDCATOrchestrator {
  constructor() {
    this.parser = null;
    this.gapAnalyzer = null;
    this.clarifier = null;
    this.learner = null;
  }

  /**
   * EDCAT AI Main Method: Orchestrate complete analysis
   * 
   * Sequence:
   * 1. Parse standard (extraction)
   * 2. Crawl customer data (retrieval)
   * 3. Match requirements to procedures (analysis)
   * 4. Generate clarifications (interaction)
   * 5. Record all decisions (audit trail)
   * 6. Learn from feedback (improvement)
   * 
   * @param {string} customerId - Customer/tenant ID
   * @param {string} standardId - Standard ID
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Complete analysis result
   */
  async analyzeCustomerGaps(customerId, standardId, options = {}) {
    const startTime = Date.now();
    const analysisId = uuidv4();
    
    console.log(`[EDCAT] 🧠 Starting orchestrated analysis: customer=${customerId}, standard=${standardId}`);

    try {
      // ===== STEP 1: PARSE - Extract requirements with clauses =====
      console.log(`[EDCAT] Step 1: Parsing standard ${standardId}`);
      const parseStartTime = Date.now();
      
      const requirements = await this.parseStandard(standardId, {
        analysisId,
        logEvent: 'standard_parse_for_analysis'
      });
      
      const parseTime = Date.now() - parseStartTime;
      
      await auditTrail.log({
        analysisId,
        actor: 'EDCAT_ORCHESTRATOR',
        action: 'PARSE_STANDARD',
        details: `Extracted ${requirements.length} requirements with clauses from standard ${standardId}`,
        reasoning: {
          method: 'clause_aware_parser',
          totalRequirements: requirements.length,
          clausesDetected: new Set(requirements.map(r => r.clause_number?.split('.')[0])).size
        },
        status: 'success',
        standardId,
        executionTimeMs: parseTime,
        confidenceScore: this.calculateParseConfidence(requirements)
      });

      if (requirements.length === 0) {
        throw new Error('No requirements extracted from standard');
      }

      // ===== STEP 2: CRAWL - Retrieve all customer procedures =====
      console.log(`[EDCAT] Step 2: Crawling customer data for ${customerId}`);
      const crawlStartTime = Date.now();
      
      const procedures = await this.crawlCustomerData(customerId);
      const crawlTime = Date.now() - crawlStartTime;
      
      await auditTrail.log({
        analysisId,
        actor: 'EDCAT_ORCHESTRATOR',
        action: 'CRAWL_CUSTOMER_DATA',
        details: `Retrieved ${procedures.length} customer procedures/documents`,
        reasoning: {
          customerId,
          documentTypes: [...new Set(procedures.map(p => p.document_type || 'procedure'))]
        },
        status: 'success',
        customerId,
        executionTimeMs: crawlTime
      });

      // ===== STEP 3: MATCH - Analyze gaps =====
      console.log(`[EDCAT] Step 3: Matching ${requirements.length} requirements against ${procedures.length} procedures`);
      const matchStartTime = Date.now();
      
      const mappings = await this.matchRequirementsToProcedures(
        requirements,
        procedures,
        {
          analysisId,
          minConfidence: options.minConfidence || 0.55,
          maxConfidence: options.maxConfidence || 0.75
        }
      );
      const matchTime = Date.now() - matchStartTime;

      // Separate into: covered, gaps, flagged for clarification
      const {
        covered,
        gaps,
        flaggedForClarification
      } = this.categorizeMappings(mappings, options.minConfidence || 0.55, options.maxConfidence || 0.75);

      await auditTrail.log({
        analysisId,
        actor: 'EDCAT_ORCHESTRATOR',
        action: 'ANALYZE_GAPS',
        details: `Covered: ${covered.length}, Gaps: ${gaps.length}, Flagged: ${flaggedForClarification.length}`,
        reasoning: {
          totalRequirements: requirements.length,
          confidenceThresholds: {
            min: options.minConfidence || 0.55,
            max: options.maxConfidence || 0.75
          },
          matchingMethod: 'semantic_similarity'
        },
        status: 'success',
        metadata: {
          covered: covered.length,
          gaps: gaps.length,
          flagged: flaggedForClarification.length
        },
        executionTimeMs: matchTime,
        confidenceScore: this.calculateMatchConfidence(mappings)
      });

      // ===== STEP 4: CLARIFY - Generate questions for ambiguous areas =====
      console.log(`[EDCAT] Step 4: Generating clarification questions (${flaggedForClarification.length} uncertain areas)`);
      const clarifyStartTime = Date.now();
      
      const clarifications = await this.generateClarifications(
        flaggedForClarification,
        {
          analysisId,
          requirements,
          procedures
        }
      );
      const clarifyTime = Date.now() - clarifyStartTime;

      await auditTrail.log({
        analysisId,
        actor: 'EDCAT_ORCHESTRATOR',
        action: 'GENERATE_CLARIFICATIONS',
        details: `Generated ${clarifications.length} clarification questions`,
        reasoning: {
          uncertainAreas: flaggedForClarification.length,
          clarificationStrategy: 'contextual_question_generation'
        },
        status: 'success',
        metadata: {
          clarificationCount: clarifications.length
        },
        executionTimeMs: clarifyTime
      });

      // ===== STEP 5: STORE ANALYSIS RESULT =====
      const totalTime = Date.now() - startTime;
      const modelVersion = await this.getCurrentModelVersion();
      
      const analysisResult = {
        analysisId,
        customerId,
        standardId,
        totalRequirements: requirements.length,
        covered: covered.length,
        gaps: gaps.length,
        gapPercentage: ((gaps.length / requirements.length) * 100).toFixed(2),
        clarificationsNeeded: clarifications.length,
        modelVersionUsed: modelVersion,
        createdAt: new Date(),
        status: 'awaiting_clarifications',
        executionTimeMs: totalTime
      };

      // Store in gap_analyses table
      await this.storeAnalysis(analysisResult);

      await auditTrail.log({
        analysisId,
        actor: 'EDCAT_ORCHESTRATOR',
        action: 'STORE_ANALYSIS',
        details: `Analysis complete: ${covered.length}/${requirements.length} covered (${analysisResult.gapPercentage}% gaps)`,
        reasoning: {
          modelVersion,
          totalExecutionTime: totalTime
        },
        status: 'success',
        metadata: analysisResult,
        executionTimeMs: 0, // Storage is fast
        confidenceScore: this.calculateOverallConfidence(covered, gaps, flaggedForClarification)
      });

      console.log(`[EDCAT] ✅ Analysis complete in ${totalTime}ms: ${covered.length} covered, ${gaps.length} gaps, ${clarifications.length} clarifications`);

      return {
        analysis: analysisResult,
        requirements,
        covered,
        gaps,
        clarifications,
        proceduresAnalyzed: procedures.length
      };

    } catch (error) {
      console.error('[EDCAT] ❌ Analysis failed:', error);
      
      await auditTrail.log({
        analysisId,
        actor: 'EDCAT_ORCHESTRATOR',
        action: 'ANALYZE_CUSTOMER_GAPS',
        details: `Analysis failed: ${error.message}`,
        status: 'failed',
        metadata: { error: error.message, stack: error.stack }
      });

      throw error;
    }
  }

  /**
   * STEP 1 Detail: Parse standard to extract requirements
   */
  async parseStandard(standardId, options = {}) {
    return await clauseParser.extractRequirementsWithClauses(standardId, options);
  }

  /**
   * STEP 2 Detail: Crawl customer data
   * EDCAT "sees" what the customer has documented
   */
  async crawlCustomerData(customerId) {
    // Retrieve all customer procedures, documents, policies from CUSTOMER DATA DB
    const proceduresResult = await queryPostgres(
      `SELECT 
        id,
        procedure_text as text,
        name,
        document_id as source_document,
        extracted_at,
        'procedure' as document_type
      FROM customer_procedures
      WHERE tenant_id = $1
      ORDER BY extracted_at DESC`,
      [customerId]
    );

    const documentsResult = await queryPostgres(
      `SELECT 
        id,
        file_name as name,
        file_path,
        uploaded_at as extracted_at,
        'document' as document_type
      FROM customer_documents
      WHERE tenant_id = $1
      ORDER BY uploaded_at DESC`,
      [customerId]
    );

    // Combine and return
    return [
      ...proceduresResult.rows,
      ...documentsResult.rows
    ];
  }

  /**
   * STEP 3 Detail: Match requirements to procedures using semantic similarity
   */
  async matchRequirementsToProcedures(requirements, procedures, options = {}) {
    return await gapAnalyzer.findGaps(requirements, procedures, options);
  }

  /**
   * STEP 4 Detail: Generate clarification questions
   */
  async generateClarifications(flaggedMappings, options = {}) {
    return await clarificationEngine.generateQuestions(flaggedMappings, options);
  }

  /**
   * Categorize mappings into three groups
   */
  categorizeMappings(mappings, minConfidence, maxConfidence) {
    return {
      covered: mappings.filter(m => m.isCovered && m.confidence > maxConfidence),
      gaps: mappings.filter(m => !m.isMapping || m.confidence < minConfidence),
      flaggedForClarification: mappings.filter(m => 
        m.needsClarification && m.confidence >= minConfidence && m.confidence <= maxConfidence
      )
    };
  }

  /**
   * Store analysis result in gap_analyses table
   */
  async storeAnalysis(analysisResult) {
    try {
      // Store in CUSTOMER DATA DB
      await queryPostgres(
        `INSERT INTO gap_analyses (
          analysis_id, tenant_id, document_id, standard_code, total_requirements,
          covered_count, gap_count, gap_percentage, clarifications_needed,
          model_version_used, status, metadata, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
        )
        ON CONFLICT (analysis_id) DO UPDATE SET
          covered_count = EXCLUDED.covered_count,
          gap_count = EXCLUDED.gap_count,
          gap_percentage = EXCLUDED.gap_percentage,
          clarifications_needed = EXCLUDED.clarifications_needed,
          status = EXCLUDED.status,
          metadata = EXCLUDED.metadata`,
        [
          analysisResult.analysisId,
          analysisResult.customerId,  // tenant_id
          null,  // document_id (can be set if available)
          analysisResult.standardCode || null,  // standard_code from EDCAT AI
          analysisResult.totalRequirements,
          analysisResult.covered,
          analysisResult.gaps,
          parseFloat(analysisResult.gapPercentage),
          analysisResult.clarificationsNeeded,
          analysisResult.modelVersionUsed,
          analysisResult.status,
          JSON.stringify(analysisResult)
        ]
      );
    } catch (error) {
      console.error('[EDCAT] ❌ Error storing analysis:', error);
      throw error;
    }
  }

  /**
   * Get current active model version
   */
  async getCurrentModelVersion() {
    try {
      // Get from EDCAT AI DB
      const result = await queryEdcatAI(
        `SELECT version FROM model_versions 
         WHERE approved = true 
         ORDER BY created_at DESC 
         LIMIT 1`
      );
      return result.rows[0]?.version || '1.0.0';
    } catch (error) {
      console.warn('[EDCAT] ⚠️  Could not fetch model version, using default');
      return '1.0.0';
    }
  }

  /**
   * Calculate confidence scores for audit trail
   */
  calculateParseConfidence(requirements) {
    if (requirements.length === 0) return 0;
    const avgConfidence = requirements.reduce((sum, r) => sum + (r.confidence || 0.8), 0) / requirements.length;
    return Math.min(1.0, avgConfidence);
  }

  calculateMatchConfidence(mappings) {
    if (mappings.length === 0) return 0;
    const avgConfidence = mappings.reduce((sum, m) => sum + (m.confidence || 0), 0) / mappings.length;
    return Math.min(1.0, avgConfidence);
  }

  calculateOverallConfidence(covered, gaps, flagged) {
    const total = covered.length + gaps.length + flagged.length;
    if (total === 0) return 0;
    // Higher confidence when more items are clearly covered or clearly gaps (not ambiguous)
    const clearDecisions = covered.length + gaps.length;
    return clearDecisions / total;
  }
}

export default new EDCATOrchestrator();

