/**
 * Vera Diagnostics Routes
 *
 * Diagnostic endpoints for monitoring Vera's health, reasoning, and performance.
 * These endpoints provide internal observability and debugging capabilities.
 *
 * PURPOSE:
 * - Health checks for Vera's database connections and data integrity
 * - Reasoning trace summaries for debugging analysis issues
 * - Concept coverage analysis for understanding Vera's reasoning depth
 *
 * EXTENSION POINTS:
 * - Add performance metrics endpoints
 * - Add reasoning quality metrics
 * - Add learning effectiveness tracking
 */
import express from 'express';
import { queryPostgres, queryEdcatAI, checkConnections } from '../config/databases.js';
const router = express.Router();
/**
 * GET /vera/diagnostics/health
 * Comprehensive health check for Vera system
 */
router.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            databases: {
                postgres: 'unknown',
                edcat: 'unknown'
            },
            tables: {},
            errors: []
        };
        // Check database connections
        try {
            const connections = await checkConnections();
            health.databases.postgres = connections.postgres;
            health.databases.edcat = connections.edcatAI;
            if (connections.postgres !== 'connected' || connections.edcatAI !== 'connected') {
                health.status = 'degraded';
            }
        }
        catch (err) {
            health.status = 'error';
            health.errors.push(`Database connection: ${err.message}`);
        }
        // Check key tables with existence and row counts
        try {
            const criticalTables = [
                'terms_and_definitions',
                'vera_query_response_bank',
                'document_content_for_learning',
                'example_documents',
                'ai_conversation_history',
                'ai_conversation_state',
                'vera_memory',
                'knowledge_embeddings',
                'ai_learning_event',
                'vera_audit_scenarios',
                'quality_concepts',
                'cross_domain_mappings',
                'vera_gap_rules',
                'vera_training_questions',
                'vera_knowledge_graph_concepts',
                'vera_standard_profiles',
                'vera_clarification_rules',
                'vera_response_templates'
            ];
            const tableDetails = {};
            for (const table of criticalTables) {
                try {
                    // Check existence
                    const existsResult = await queryEdcatAI(`SELECT EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'edcat' AND table_name = $1
            ) as exists`, [table]);
                    const exists = existsResult.rows[0]?.exists || false;
                    let rowCount = 0;
                    if (exists) {
                        try {
                            const countResult = await queryEdcatAI(`SELECT COUNT(*) as count FROM edcat.${table}`);
                            rowCount = parseInt(countResult.rows[0]?.count || '0', 10);
                        }
                        catch (countError) {
                            // Table exists but count failed - non-fatal
                        }
                    }
                    tableDetails[table] = { exists, rowCount };
                }
                catch (tableError) {
                    tableDetails[table] = { exists: false, rowCount: 0 };
                }
            }
            // Add to health object
            health.tables = tableDetails;
            // Check if any critical tables are missing
            const missingTables = Object.entries(tableDetails)
                .filter(([_, status]) => !status.exists)
                .map(([table, _]) => table);
            if (missingTables.length > 0) {
                health.status = health.status === 'ok' ? 'degraded' : health.status;
                health.errors.push(`Missing tables: ${missingTables.join(', ')}`);
            }
        }
        catch (err) {
            health.status = health.status === 'ok' ? 'degraded' : health.status;
            health.errors.push(`Table checks: ${err.message}`);
        }
        const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 500;
        res.status(statusCode).json(health);
    }
    catch (error) {
        console.error('[veraDiagnostics] Health check error:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
});
/**
 * GET /vera/diagnostics/reasoning-summary
 * Get reasoning summary for a specific analysis
 */
router.get('/reasoning-summary', async (req, res) => {
    try {
        const analysisId = req.query.analysisId;
        if (!analysisId) {
            return res.status(400).json({ error: 'analysisId required' });
        }
        // Get reasoning chains for this analysis
        const reasoningResult = await queryEdcatAI(`SELECT * FROM edcat.vera_requirement_reasoning_chains 
       WHERE mapping_id IN (
         SELECT mapping_id FROM edcat.requirement_mappings WHERE analysis_id = $1
       )
       ORDER BY reasoning_confidence DESC`, [analysisId]);
        // Calculate summary statistics
        const chains = reasoningResult.rows || [];
        const summary = {
            analysisId,
            totalReasoningChains: chains.length,
            averageConfidence: chains.length > 0
                ? chains.reduce((sum, c) => sum + parseFloat(c.reasoning_confidence || 0), 0) / chains.length
                : 0,
            reasoningTypes: {},
            gapBreakdown: {
                covered: 0,
                partial: 0,
                gap: 0
            }
        };
        chains.forEach(chain => {
            const type = chain.reasoning_type || 'unknown';
            summary.reasoningTypes[type] = (summary.reasoningTypes[type] || 0) + 1;
            const confidence = parseFloat(chain.reasoning_confidence || 0);
            if (confidence >= 0.70)
                summary.gapBreakdown.covered++;
            else if (confidence >= 0.40)
                summary.gapBreakdown.partial++;
            else
                summary.gapBreakdown.gap++;
        });
        res.json({ summary, chains: chains.slice(0, 20) }); // Limit chains returned
    }
    catch (error) {
        console.error('[veraDiagnostics] Reasoning summary error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /vera/diagnostics/concept-coverage
 * Show which concepts and procedures were considered for a requirement/document pair
 */
router.get('/concept-coverage', async (req, res) => {
    try {
        const requirementId = req.query.requirementId;
        const documentId = req.query.documentId;
        if (!requirementId || !documentId) {
            return res.status(400).json({ error: 'requirementId and documentId required' });
        }
        // Get concepts related to this requirement
        const conceptsResult = await queryEdcatAI(`SELECT c.* FROM edcat.vera_knowledge_graph_concepts c
       WHERE c.requirement_ids @> ARRAY[$1::uuid]::uuid[]
       OR $1::uuid = ANY(c.requirement_ids)`, [requirementId]);
        // Get procedures from document
        const proceduresResult = await queryPostgres(`SELECT id, procedure_text FROM public.customer_procedures 
       WHERE document_id = $1`, [documentId]);
        // Get reasoning chains
        const reasoningResult = await queryEdcatAI(`SELECT * FROM edcat.vera_requirement_reasoning_chains
       WHERE requirement_id = $1
       AND procedure_id = ANY($2::uuid[])`, [requirementId, (proceduresResult.rows || []).map((p) => p.id)]);
        res.json({
            requirementId,
            documentId,
            conceptsConsidered: conceptsResult.rows || [],
            proceduresExamined: (proceduresResult.rows || []).map((p) => ({
                id: p.id,
                textLength: p.procedure_text?.length || 0
            })),
            reasoningChains: reasoningResult.rows || []
        });
    }
    catch (error) {
        console.error('[veraDiagnostics] Concept coverage error:', error);
        res.status(500).json({ error: error.message });
    }
});
export default router;
//# sourceMappingURL=veraDiagnostics.routes.js.map