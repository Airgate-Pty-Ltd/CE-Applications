/**
 * Vera Learning Dashboard Service
 *
 * Provides views and statistics for learning events to help owners
 * understand where Vera is weak and needs improvement.
 */
import { getLearningEvents, getLearningStats } from './VeraLearningEventService.js';
import { queryEdcatAI } from '../../config/databases.js';
/**
 * Get comprehensive learning dashboard summary
 */
export async function getLearningDashboard(params) {
    try {
        const { tenantId = '00000000-0000-0000-0000-000000000000', limit = 50 } = params;
        // Get base stats
        const stats = await getLearningStats({ tenantId });
        // Get average evaluation scores (if available)
        const evaluationStats = await getEvaluationStats(tenantId);
        // Get recent events
        const events = await getLearningEvents({ tenantId, limit });
        // Analyze top weak areas (standards/clauses with most low-confidence events)
        const weakAreas = await analyzeWeakAreas(tenantId, limit);
        return {
            totalEvents: stats.totalEvents,
            eventsByFailureType: stats.failureTypes.map((ft) => ({
                failureType: ft.failure_type,
                count: parseInt(ft.count),
                avgConfidence: parseFloat(ft.avg_confidence || 0)
            })),
            eventsByIntent: stats.intents.map((int) => ({
                intent: int.intent,
                count: parseInt(int.count),
                avgConfidence: parseFloat(int.avg_confidence || 0)
            })),
            recentTrends: stats.recentTrends.map((trend) => ({
                date: trend.date,
                eventCount: parseInt(trend.event_count),
                avgConfidence: parseFloat(trend.avg_confidence || 0)
            })),
            topWeakAreas: weakAreas,
            evaluationStats
        };
    }
    catch (error) {
        console.error('[VeraLearningDashboard] Error getting dashboard:', error.message);
        return {
            totalEvents: 0,
            eventsByFailureType: [],
            eventsByIntent: [],
            recentTrends: [],
            topWeakAreas: [],
            evaluationStats: {
                averageScore: 0,
                totalEvaluations: 0,
                lowScoreCount: 0
            }
        };
    }
}
/**
 * Get evaluation statistics
 */
async function getEvaluationStats(tenantId) {
    try {
        // Get evaluation scores from learning events with SELF_EVAL types
        const result = await queryEdcatAI(`
      SELECT 
        AVG(confidence_score) as avg_score,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE confidence_score < 0.7) as low_score_count
      FROM edcat.ai_learning_event
      WHERE tenant_id = $1
        AND failure_type IN ('SELF_EVAL_LOW', 'SELF_EVAL_ISSUES')
        AND confidence_score IS NOT NULL
    `, [tenantId]);
        if (result.rows.length > 0) {
            const row = result.rows[0];
            return {
                averageScore: parseFloat(row.avg_score || 0),
                totalEvaluations: parseInt(row.total || 0),
                lowScoreCount: parseInt(row.low_score_count || 0)
            };
        }
        return {
            averageScore: 0,
            totalEvaluations: 0,
            lowScoreCount: 0
        };
    }
    catch (error) {
        console.error('[VeraLearningDashboard] Error getting evaluation stats:', error.message);
        return {
            averageScore: 0,
            totalEvaluations: 0,
            lowScoreCount: 0
        };
    }
}
/**
 * Analyze weak areas by extracting standards/clauses from learning events
 */
async function analyzeWeakAreas(tenantId, limit) {
    try {
        // Get events with low confidence
        const events = await getLearningEvents({
            tenantId,
            limit: 100 // Get more to analyze patterns
        });
        const areaCounts = new Map();
        // Extract standard codes and clauses from questions
        for (const event of events) {
            const question = event.user_question || '';
            // Extract standard codes (AS9100, ISO 9001, etc.)
            const standardPattern = /\b(AS\d{4}[A-Z]?|ISO\s*\d{4,5}|IATF\s*\d{4,5}|FAA|EASA|CASA)\b/i;
            const standardMatch = question.match(standardPattern);
            if (standardMatch) {
                const standard = standardMatch[1].toUpperCase().replace(/\s+/g, '');
                const key = `Standard: ${standard}`;
                if (!areaCounts.has(key)) {
                    areaCounts.set(key, { count: 0, totalConfidence: 0 });
                }
                const area = areaCounts.get(key);
                area.count++;
                area.totalConfidence += event.confidence_score || 0;
            }
            // Extract clause references (8.7, 21.137(n), etc.)
            const clausePattern = /(\d+\.\d+(?:\.\d+)?(?:\([a-z]\))?)/i;
            const clauseMatch = question.match(clausePattern);
            if (clauseMatch && standardMatch) {
                const standard = standardMatch[1].toUpperCase().replace(/\s+/g, '');
                const clause = clauseMatch[1];
                const key = `${standard} Clause ${clause}`;
                if (!areaCounts.has(key)) {
                    areaCounts.set(key, { count: 0, totalConfidence: 0 });
                }
                const area = areaCounts.get(key);
                area.count++;
                area.totalConfidence += event.confidence_score || 0;
            }
        }
        // Convert to array and calculate averages
        return Array.from(areaCounts.entries())
            .map(([area, data]) => ({
            area,
            eventCount: data.count,
            avgConfidence: data.count > 0 ? data.totalConfidence / data.count : 0
        }))
            .sort((a, b) => b.eventCount - a.eventCount)
            .slice(0, limit);
    }
    catch (error) {
        console.error('[VeraLearningDashboard] Error analyzing weak areas:', error.message);
        return [];
    }
}
/**
 * Get learning events with optional filters
 */
export async function getLearningEventsForDashboard(params) {
    return await getLearningEvents(params);
}
//# sourceMappingURL=VeraLearningDashboardService.js.map