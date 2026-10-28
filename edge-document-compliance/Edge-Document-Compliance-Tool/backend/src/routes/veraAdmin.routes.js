/**
 * Vera Admin Routes
 *
 * Internal admin endpoints for managing Vera configuration, rules, templates, and patterns.
 * These endpoints provide JSON-only responses for internal tooling.
 *
 * PURPOSE:
 * - Enable configuration management for Vera's knowledge base
 * - Support admin tools for persona, rules, boundaries, and templates
 * - Provide access to patterns discovered by Vera
 *
 * EXTENSION POINTS:
 * - Add new admin endpoints as Vera capabilities expand
 * - Integrate with admin UI for visual configuration
 */
import express from 'express';
import { queryEdcatAI } from '../config/databases.js';
const router = express.Router();
/**
 * GET /vera/admin/persona
 * Get persona configuration for a tenant
 */
router.get('/persona', async (req, res) => {
    try {
        const tenantId = req.query.tenantId || req.tenant?.id;
        if (!tenantId) {
            return res.status(400).json({ error: 'tenantId required' });
        }
        // Get base persona
        const personaResult = await queryEdcatAI(`SELECT * FROM edcat.ai_persona WHERE persona_code = $1`, ['vera']);
        // Get tenant profile
        const profileResult = await queryEdcatAI(`SELECT * FROM edcat.ai_persona_profile WHERE tenant_id = $1 AND persona_code = $2`, [tenantId, 'vera']);
        // Get policies
        const policyResult = await queryEdcatAI(`SELECT * FROM edcat.ai_policy WHERE policy_key LIKE 'vera.%' AND tenant_id = $1`, [tenantId]);
        res.json({
            basePersona: personaResult.rows[0] || null,
            tenantProfile: profileResult.rows[0] || null,
            policies: policyResult.rows || []
        });
    }
    catch (error) {
        console.error('[veraAdmin] Error fetching persona:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /vera/admin/persona
 * Update tenant persona profile
 */
router.post('/persona', async (req, res) => {
    try {
        const tenantId = req.body.tenantId || req.tenant?.id;
        const { personaCode = 'vera', profile } = req.body;
        if (!tenantId || !profile) {
            return res.status(400).json({ error: 'tenantId and profile required' });
        }
        const result = await queryEdcatAI(`INSERT INTO edcat.ai_persona_profile (tenant_id, persona_code, profile, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (tenant_id, persona_code)
       DO UPDATE SET profile = EXCLUDED.profile, updated_at = NOW()
       RETURNING *`, [tenantId, personaCode, JSON.stringify(profile)]);
        res.json({ success: true, profile: result.rows[0] });
    }
    catch (error) {
        console.error('[veraAdmin] Error updating persona:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /vera/admin/clarification-rules
 * Get all clarification rules (active and inactive)
 */
router.get('/clarification-rules', async (req, res) => {
    try {
        const activeOnly = req.query.activeOnly === 'true';
        let query = `SELECT * FROM edcat.vera_clarification_rules`;
        const params = [];
        if (activeOnly) {
            query += ` WHERE active = TRUE`;
        }
        query += ` ORDER BY priority DESC, rule_name`;
        const result = await queryEdcatAI(query, params);
        res.json({ rules: result.rows });
    }
    catch (error) {
        console.error('[veraAdmin] Error fetching clarification rules:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /vera/admin/knowledge-boundaries
 * Get all knowledge boundaries
 */
router.get('/knowledge-boundaries', async (req, res) => {
    try {
        const activeOnly = req.query.activeOnly === 'true';
        let query = `SELECT * FROM edcat.vera_knowledge_boundaries`;
        const params = [];
        if (activeOnly) {
            query += ` WHERE active = TRUE`;
        }
        query += ` ORDER BY priority DESC, boundary_name`;
        const result = await queryEdcatAI(query, params);
        res.json({ boundaries: result.rows });
    }
    catch (error) {
        console.error('[veraAdmin] Error fetching knowledge boundaries:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /vera/admin/response-templates
 * Get response templates by category
 */
router.get('/response-templates', async (req, res) => {
    try {
        const category = req.query.category;
        const activeOnly = req.query.activeOnly === 'true';
        let query = `SELECT * FROM edcat.vera_response_templates`;
        const params = [];
        const conditions = [];
        if (category) {
            conditions.push(`template_category = $${params.length + 1}`);
            params.push(category);
        }
        if (activeOnly) {
            conditions.push(`active = TRUE`);
        }
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }
        query += ` ORDER BY template_category, template_name`;
        const result = await queryEdcatAI(query, params);
        res.json({ templates: result.rows });
    }
    catch (error) {
        console.error('[veraAdmin] Error fetching response templates:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /vera/admin/patterns
 * Get patterns discovered by Vera
 */
router.get('/patterns', async (req, res) => {
    try {
        const patternType = req.query.patternType;
        const limit = parseInt(req.query.limit) || 50;
        let query = `SELECT * FROM edcat.vera_pattern_discoveries`;
        const params = [];
        if (patternType) {
            query += ` WHERE pattern_type = $${params.length + 1}`;
            params.push(patternType);
        }
        query += ` ORDER BY significance_score DESC, discovered_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);
        const result = await queryEdcatAI(query, params);
        res.json({ patterns: result.rows });
    }
    catch (error) {
        console.error('[veraAdmin] Error fetching patterns:', error);
        res.status(500).json({ error: error.message });
    }
});
export default router;
//# sourceMappingURL=veraAdmin.routes.js.map