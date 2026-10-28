/**
 * Vera Audit Scenarios Routes
 *
 * Endpoints for managing and viewing audit scenarios
 */
import express from 'express';
import { generateAuditScenario, listSavedScenarios, getScenarioById } from '../services/vera/VeraAuditScenarioService.js';
const router = express.Router();
/**
 * GET /api/vera/audit-scenarios
 * List saved audit scenarios
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = req.query.tenantId || '00000000-0000-0000-0000-000000000000';
        const standardCode = req.query.standardCode;
        const difficulty = req.query.difficulty;
        const scenarios = await listSavedScenarios({
            tenantId,
            standardCode,
            difficulty
        });
        res.json({
            success: true,
            scenarios,
            count: scenarios.length
        });
    }
    catch (error) {
        console.error('[VeraAuditScenarios] Error listing scenarios:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
/**
 * POST /api/vera/audit-scenarios/generate
 * Generate a new audit scenario
 */
router.post('/generate', async (req, res) => {
    try {
        const { standardCode, clauses, difficulty = 'intermediate', tenantId = '00000000-0000-0000-0000-000000000000', industryContext } = req.body;
        if (!standardCode || !clauses || !Array.isArray(clauses) || clauses.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'standardCode and clauses (array) are required'
            });
        }
        const scenario = await generateAuditScenario(standardCode, clauses, {
            difficulty: difficulty,
            tenantId,
            industryContext
        });
        res.json({
            success: true,
            scenario
        });
    }
    catch (error) {
        console.error('[VeraAuditScenarios] Error generating scenario:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
/**
 * GET /api/vera/audit-scenarios/:id
 * Get a specific scenario by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const scenarioId = req.params.id;
        const scenario = await getScenarioById(scenarioId);
        if (!scenario) {
            return res.status(404).json({
                success: false,
                error: 'Scenario not found'
            });
        }
        res.json({
            success: true,
            scenario
        });
    }
    catch (error) {
        console.error('[VeraAuditScenarios] Error getting scenario:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
export default router;
//# sourceMappingURL=veraAuditScenarios.routes.js.map