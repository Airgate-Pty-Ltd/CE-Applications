/**
 * Vera Learning Dashboard Service
 *
 * Provides views and statistics for learning events to help owners
 * understand where Vera is weak and needs improvement.
 */
export interface LearningDashboardSummary {
    totalEvents: number;
    eventsByFailureType: Array<{
        failureType: string;
        count: number;
        avgConfidence: number;
    }>;
    eventsByIntent: Array<{
        intent: string;
        count: number;
        avgConfidence: number;
    }>;
    recentTrends: Array<{
        date: string;
        eventCount: number;
        avgConfidence: number;
    }>;
    topWeakAreas: Array<{
        area: string;
        eventCount: number;
        avgConfidence: number;
    }>;
    evaluationStats?: {
        averageScore: number;
        totalEvaluations: number;
        lowScoreCount: number;
    };
}
/**
 * Get comprehensive learning dashboard summary
 */
export declare function getLearningDashboard(params: {
    tenantId?: string;
    limit?: number;
}): Promise<LearningDashboardSummary>;
/**
 * Get learning events with optional filters
 */
export declare function getLearningEventsForDashboard(params: {
    tenantId?: string;
    failureType?: string;
    intent?: string;
    limit?: number;
    offset?: number;
}): Promise<any[]>;
//# sourceMappingURL=VeraLearningDashboardService.d.ts.map