/**
 * Vera Remedy Learning Service
 *
 * Tracks which remedies were applied and whether they resolved issues.
 * Phase 8: Learning from fixes over time
 */
import { queryEdcatAI } from '../../config/databases.js';
import { veraEngineHealth } from './VeraEngineHealthService.js';
export class VeraRemedyLearningService {
    /**
     * Record that a remedy was applied
     */
    static async recordRemedyApplication(issueCode, remedyAction, appliedBy, notes) {
        try {
            await queryEdcatAI(`
        INSERT INTO edcat.vera_remedy_applications
          (id, issue_code, remedy_action, applied_at, applied_by, resolved, notes)
        VALUES
          (gen_random_uuid(), $1, $2, NOW(), $3, false, $4)
        `, [issueCode, remedyAction, appliedBy || null, notes || null]);
            console.log(`[VeraRemedyLearning] ✅ Recorded remedy application for ${issueCode}`);
        }
        catch (err) {
            console.error('[VeraRemedyLearning] Failed to record remedy application:', err.message);
            // Non-fatal - continue even if logging fails
        }
    }
    /**
     * Mark a remedy as resolved (called when issue is cleared)
     */
    static async markRemedyResolved(issueCode, remedyAction) {
        try {
            // Find the most recent unresolved application for this issue/remedy
            const result = await queryEdcatAI(`
        UPDATE edcat.vera_remedy_applications
        SET 
          resolved = true,
          resolved_at = NOW(),
          resolution_time_ms = EXTRACT(EPOCH FROM (NOW() - applied_at)) * 1000
        WHERE 
          issue_code = $1
          AND remedy_action = $2
          AND resolved = false
        ORDER BY applied_at DESC
        LIMIT 1
        RETURNING id
        `, [issueCode, remedyAction]);
            if (result.rows.length > 0) {
                console.log(`[VeraRemedyLearning] ✅ Marked remedy as resolved for ${issueCode}`);
            }
        }
        catch (err) {
            console.error('[VeraRemedyLearning] Failed to mark remedy resolved:', err.message);
            // Non-fatal
        }
    }
    /**
     * Get remedy effectiveness statistics
     */
    static async getRemedyEffectiveness(issueCode) {
        try {
            let query = `
        SELECT 
          issue_code,
          remedy_action,
          COUNT(*) as total_applications,
          COUNT(*) FILTER (WHERE resolved = true) as successful_resolutions,
          AVG(resolution_time_ms) FILTER (WHERE resolved = true) as avg_resolution_time,
          MAX(applied_at) as last_applied
        FROM edcat.vera_remedy_applications
      `;
            const params = [];
            if (issueCode) {
                query += ` WHERE issue_code = $1`;
                params.push(issueCode);
            }
            query += `
        GROUP BY issue_code, remedy_action
        ORDER BY total_applications DESC, successful_resolutions DESC
      `;
            const result = await queryEdcatAI(query, params);
            return result.rows.map((row) => ({
                issueCode: row.issue_code,
                remedyAction: row.remedy_action,
                totalApplications: parseInt(row.total_applications || '0', 10),
                successfulResolutions: parseInt(row.successful_resolutions || '0', 10),
                averageResolutionTime: row.avg_resolution_time ? Math.round(row.avg_resolution_time) : undefined,
                successRate: row.total_applications > 0
                    ? parseInt(row.successful_resolutions || '0', 10) / parseInt(row.total_applications || '1', 10)
                    : 0,
                lastApplied: row.last_applied ? new Date(row.last_applied) : undefined
            }));
        }
        catch (err) {
            console.error('[VeraRemedyLearning] Failed to get remedy effectiveness:', err.message);
            return [];
        }
    }
    /**
     * Get best remedy for an issue based on historical success
     */
    static async getBestRemedyForIssue(issueCode) {
        try {
            const effectiveness = await this.getRemedyEffectiveness(issueCode);
            if (effectiveness.length === 0) {
                return null;
            }
            // Sort by success rate (descending), then by total applications (descending)
            const sorted = effectiveness.sort((a, b) => {
                if (a.successRate !== b.successRate) {
                    return b.successRate - a.successRate;
                }
                return b.totalApplications - a.totalApplications;
            });
            // Return the most successful remedy
            return sorted[0].remedyAction;
        }
        catch (err) {
            console.error('[VeraRemedyLearning] Failed to get best remedy:', err.message);
            return null;
        }
    }
    /**
     * Auto-detect if an issue was resolved (called periodically or after self-tests)
     */
    static async checkAndRecordResolutions() {
        try {
            const currentIssues = veraEngineHealth.getCurrentIssues();
            const currentIssueCodes = new Set(currentIssues.map(i => i.code));
            // Get recent unresolved remedy applications
            const result = await queryEdcatAI(`
        SELECT DISTINCT issue_code, remedy_action
        FROM edcat.vera_remedy_applications
        WHERE resolved = false
          AND applied_at > NOW() - INTERVAL '24 hours'
        ORDER BY applied_at DESC
        `, []);
            // For each remedy that was applied, check if the issue is now resolved
            for (const row of result.rows) {
                const issueCode = row.issue_code;
                // If issue is no longer in current issues, mark remedy as resolved
                if (!currentIssueCodes.has(issueCode)) {
                    await this.markRemedyResolved(issueCode, row.remedy_action);
                }
            }
        }
        catch (err) {
            console.error('[VeraRemedyLearning] Failed to check resolutions:', err.message);
            // Non-fatal
        }
    }
}
//# sourceMappingURL=VeraRemedyLearningService.js.map