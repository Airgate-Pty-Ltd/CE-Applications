/**
 * Vera Learning Routes
 *
 * Endpoints for viewing learning events, statistics, and dashboard
 */
import express from 'express';
import { getLearningEvents, getLearningStats } from '../services/vera/VeraLearningEventService.js';
import { getLearningDashboard } from '../services/vera/VeraLearningDashboardService.js';
const router = express.Router();
/**
 * GET /api/vera/learning/events
 * Get recent learning events
 */
router.get('/events', async (req, res) => {
    try {
        const tenantId = req.query.tenantId || '00000000-0000-0000-0000-000000000000';
        const failureType = req.query.failureType;
        const limit = parseInt(req.query.limit || '50', 10);
        const offset = parseInt(req.query.offset || '0', 10);
        const events = await getLearningEvents({
            tenantId,
            failureType,
            limit,
            offset
        });
        res.json({
            success: true,
            events,
            count: events.length,
            limit,
            offset
        });
    }
    catch (error) {
        console.error('[VeraLearning] Error getting events:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
/**
 * GET /api/vera/learning/stats
 * Get learning statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const tenantId = req.query.tenantId || '00000000-0000-0000-0000-000000000000';
        const stats = await getLearningStats({ tenantId });
        res.json({
            success: true,
            stats
        });
    }
    catch (error) {
        console.error('[VeraLearning] Error getting stats:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
/**
 * GET /api/vera/learning/dashboard
 * Get comprehensive learning dashboard
 */
router.get('/dashboard', async (req, res) => {
    try {
        const tenantId = req.query.tenantId || '00000000-0000-0000-0000-000000000000';
        const limit = parseInt(req.query.limit || '50', 10);
        const dashboard = await getLearningDashboard({ tenantId, limit });
        res.json({
            success: true,
            dashboard
        });
    }
    catch (error) {
        console.error('[VeraLearning] Error getting dashboard:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
export default router;
//# sourceMappingURL=veraLearning.routes.js.map