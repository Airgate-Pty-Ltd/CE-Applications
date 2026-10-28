/**
 * Vera Health API Route
 *
 * Provides a JSON endpoint for checking Vera's internal health status.
 * Used for automated tests and quick diagnostics.
 */
import express from 'express';
import { veraEngineHealth } from '../services/vera/VeraEngineHealthService.js';
const router = express.Router();
/**
 * GET /api/vera/health
 * Returns current health status and active issues
 */
router.get('/health', async (req, res) => {
    try {
        const issues = veraEngineHealth.getCurrentIssues();
        if (issues.length === 0) {
            return res.json({
                status: 'OK',
                issueCount: 0,
                issues: []
            });
        }
        res.json({
            status: 'DEGRADED',
            issueCount: issues.length,
            issues: issues.map(i => ({
                code: i.code,
                severity: i.severity,
                message: i.message,
                priorityScore: i.priorityScore,
                occurrences: i.occurrences,
                firstSeen: i.firstSeen,
                lastSeen: i.lastSeen
            }))
        });
    }
    catch (err) {
        res.status(500).json({
            status: 'ERROR',
            error: err?.message || String(err)
        });
    }
});
export default router;
//# sourceMappingURL=veraHealth.js.map