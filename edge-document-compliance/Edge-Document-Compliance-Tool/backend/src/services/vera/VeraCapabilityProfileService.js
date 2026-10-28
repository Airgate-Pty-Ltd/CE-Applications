/**
 * Vera Capability Profile Service
 *
 * Calculates and exposes Vera's capability profile - showing where she is
 * strong and where she is weak, so capability growth is visible and manageable.
 */
import { queryEdcatAI } from '../../config/databases.js';
import { getLearningStats } from './VeraLearningEventService.js';
/**
 * Calculate comprehensive capability profile
 */
export async function calculateCapabilityProfile(params) {
    try {
        const { tenantId = '00000000-0000-0000-0000-000000000000' } = params;
        // Get learning stats
        const learningStats = await getLearningStats({ tenantId });
        // Calculate by-standard metrics
        const byStandard = await calculateByStandard(tenantId);
        // Calculate by-intent metrics
        const byIntent = await calculateByIntent(tenantId, learningStats);
        // Calculate overall metrics
        const overall = calculateOverallMetrics(learningStats, byStandard, byIntent);
        // Generate suggestions
        const suggestions = generateSuggestions(byStandard, byIntent, overall);
        return {
            overall,
            byStandard,
            byIntent,
            suggestions
        };
    }
    catch (error) {
        console.error('[VeraCapability] Error calculating profile:', error.message);
        return {
            overall: {
                averageAnswerScore: 0,
                totalInteractions: 0,
                lowScoreCount: 0,
                userCorrections: 0,
                strongAreas: 0,
                weakAreas: 0
            },
            byStandard: [],
            byIntent: [],
            suggestions: []
        };
    }
}
/**
 * Calculate capability metrics by standard
 */
async function calculateByStandard(tenantId) {
    try {
        // Get learning events grouped by standard (extracted from questions)
        const result = await queryEdcatAI(`
      SELECT 
        CASE 
          WHEN user_question ILIKE '%AS9100%' OR user_question ILIKE '%AS 9100%' THEN 'AS9100D'
          WHEN user_question ILIKE '%ISO 9001%' OR user_question ILIKE '%ISO9001%' THEN 'ISO9001'
          WHEN user_question ILIKE '%ISO 13485%' OR user_question ILIKE '%ISO13485%' THEN 'ISO13485'
          WHEN user_question ILIKE '%IATF%' OR user_question ILIKE '%16949%' THEN 'IATF16949'
          WHEN user_question ILIKE '%FAA%' THEN 'FAA'
          WHEN user_question ILIKE '%EASA%' THEN 'EASA'
          WHEN user_question ILIKE '%CASA%' THEN 'CASA'
          ELSE 'OTHER'
        END as standard_code,
        AVG(confidence_score) as avg_score,
        COUNT(*) as interaction_count,
        COUNT(*) FILTER (WHERE confidence_score < 0.7) as low_score_count,
        COUNT(*) FILTER (WHERE failure_type = 'USER_CORRECTION') as corrections
      FROM edcat.ai_learning_event
      WHERE tenant_id = $1
        AND confidence_score IS NOT NULL
      GROUP BY standard_code
      HAVING COUNT(*) >= 3
      ORDER BY interaction_count DESC
    `, [tenantId]);
        return result.rows.map(row => ({
            standardCode: row.standard_code,
            averageScore: parseFloat(row.avg_score || 0),
            interactionCount: parseInt(row.interaction_count || 0),
            lowScoreCount: parseInt(row.low_score_count || 0),
            corrections: parseInt(row.corrections || 0),
            status: determineStatus(parseFloat(row.avg_score || 0), parseInt(row.interaction_count || 0), parseInt(row.low_score_count || 0))
        }));
    }
    catch (error) {
        console.error('[VeraCapability] Error calculating by standard:', error.message);
        return [];
    }
}
/**
 * Calculate capability metrics by intent
 */
async function calculateByIntent(tenantId, learningStats) {
    try {
        const intents = learningStats.intents || [];
        return intents.map((intent) => ({
            intent: intent.intent,
            averageScore: parseFloat(intent.avg_confidence || 0),
            interactionCount: parseInt(intent.count || 0),
            lowScoreCount: 0, // Would need separate query for this
            status: determineStatus(parseFloat(intent.avg_confidence || 0), parseInt(intent.count || 0), 0)
        }));
    }
    catch (error) {
        console.error('[VeraCapability] Error calculating by intent:', error.message);
        return [];
    }
}
/**
 * Determine status (strong/weak/underused)
 */
function determineStatus(avgScore, interactionCount, lowScoreCount) {
    if (interactionCount < 5) {
        return 'underused';
    }
    if (avgScore >= 0.8 && lowScoreCount / interactionCount < 0.2) {
        return 'strong';
    }
    if (avgScore < 0.6 || lowScoreCount / interactionCount > 0.4) {
        return 'weak';
    }
    return 'weak'; // Default to weak if unclear
}
/**
 * Calculate overall metrics
 */
function calculateOverallMetrics(learningStats, byStandard, byIntent) {
    const totalEvents = learningStats.totalEvents || 0;
    const failureTypes = learningStats.failureTypes || [];
    const userCorrections = failureTypes
        .find((ft) => ft.failure_type === 'USER_CORRECTION')?.count || 0;
    const avgScore = byStandard.length > 0
        ? byStandard.reduce((sum, s) => sum + s.averageScore, 0) / byStandard.length
        : 0.7; // Default if no data
    const lowScoreCount = byStandard.reduce((sum, s) => sum + s.lowScoreCount, 0);
    const strongAreas = byStandard.filter(s => s.status === 'strong').length;
    const weakAreas = byStandard.filter(s => s.status === 'weak').length;
    return {
        averageAnswerScore: avgScore,
        totalInteractions: totalEvents,
        lowScoreCount,
        userCorrections: parseInt(userCorrections),
        strongAreas,
        weakAreas
    };
}
/**
 * Generate suggestions for improvement
 */
function generateSuggestions(byStandard, byIntent, overall) {
    const suggestions = [];
    // Weak standards
    const weakStandards = byStandard.filter(s => s.status === 'weak');
    for (const standard of weakStandards) {
        suggestions.push({
            area: `${standard.standardCode} (Standard)`,
            recommendation: `Vera has low coverage and low scores on ${standard.standardCode}. Provide more procedures, examples, and training documents for this standard.`,
            priority: standard.interactionCount > 10 ? 'high' : 'medium'
        });
    }
    // Underused standards
    const underusedStandards = byStandard.filter(s => s.status === 'underused');
    for (const standard of underusedStandards) {
        suggestions.push({
            area: `${standard.standardCode} (Standard)`,
            recommendation: `Vera has limited data on ${standard.standardCode}. Consider adding more Q&A entries, examples, and learning documents to improve coverage.`,
            priority: 'low'
        });
    }
    // Weak intents
    const weakIntents = byIntent.filter(i => i.status === 'weak');
    for (const intent of weakIntents) {
        suggestions.push({
            area: `${intent.intent} (Intent)`,
            recommendation: `Vera struggles with ${intent.intent} questions. Review and improve responses for this intent type.`,
            priority: intent.interactionCount > 10 ? 'high' : 'medium'
        });
    }
    // Overall recommendations
    if (overall.averageAnswerScore < 0.7) {
        suggestions.push({
            area: 'Overall Performance',
            recommendation: 'Vera\'s overall answer quality is below target. Focus on improving high-frequency question types and adding more approved examples.',
            priority: 'high'
        });
    }
    if (overall.userCorrections > overall.totalInteractions * 0.1) {
        suggestions.push({
            area: 'User Corrections',
            recommendation: `High number of user corrections (${overall.userCorrections}). Review correction patterns and update Q&A bank accordingly.`,
            priority: 'high'
        });
    }
    return suggestions.slice(0, 10); // Limit to top 10
}
/**
 * Get capability summary (brief overview)
 */
export async function getCapabilitySummary(params) {
    try {
        const profile = await calculateCapabilityProfile(params);
        return {
            strong: profile.byStandard
                .filter(s => s.status === 'strong')
                .map(s => s.standardCode),
            weak: profile.byStandard
                .filter(s => s.status === 'weak')
                .map(s => s.standardCode),
            underused: profile.byStandard
                .filter(s => s.status === 'underused')
                .map(s => s.standardCode),
            averageScore: profile.overall.averageAnswerScore
        };
    }
    catch (error) {
        console.error('[VeraCapability] Error getting summary:', error.message);
        return {
            strong: [],
            weak: [],
            underused: [],
            averageScore: 0
        };
    }
}
//# sourceMappingURL=VeraCapabilityProfileService.js.map