/**
 * Debug Comparison Route
 * Compares V1 (current) vs V2 (new) Vera responses
 */
import express from 'express';
import VeraCoreEngineV2 from '../services/vera/VeraCoreEngineV2.js';
const router = express.Router();
/**
 * GET /api/vera/debug/compare?query=<query>
 *
 * Compares V1 response vs V2 response
 */
router.get('/debug/compare', async (req, res) => {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'query parameter required' });
    }
    const v2Engine = new VeraCoreEngineV2();
    try {
        const v2Response = await v2Engine.generateVeraResponse(query, 'debug-session', { conversationHistory: [] });
        res.json({
            query,
            v2_response: v2Response,
            v2_message: v2Response.message || v2Response.answer || 'No message',
            v2_type: v2Response.type || 'unknown'
        });
    }
    catch (error) {
        console.error('[VeraDebugComparison] Error:', error);
        res.status(500).json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
/**
 * POST /api/vera/debug/compare
 *
 * Compare with full context
 */
router.post('/debug/compare', async (req, res) => {
    const { query, sessionId, conversationHistory } = req.body;
    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'query field required' });
    }
    const v2Engine = new VeraCoreEngineV2();
    try {
        const v2Response = await v2Engine.generateVeraResponse(query, sessionId || 'debug-session', { conversationHistory: conversationHistory || [] });
        res.json({
            query,
            v2_response: v2Response,
            v2_message: v2Response.message || v2Response.answer || 'No message',
            v2_type: v2Response.type || 'unknown'
        });
    }
    catch (error) {
        console.error('[VeraDebugComparison] Error:', error);
        res.status(500).json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
export default router;
//# sourceMappingURL=veraDebugComparison.routes.js.map