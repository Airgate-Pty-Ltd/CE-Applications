/**
 * Vera Capability Profile Service
 *
 * Calculates and exposes Vera's capability profile - showing where she is
 * strong and where she is weak, so capability growth is visible and manageable.
 */
export interface CapabilityProfile {
    overall: {
        averageAnswerScore: number;
        totalInteractions: number;
        lowScoreCount: number;
        userCorrections: number;
        strongAreas: number;
        weakAreas: number;
    };
    byStandard: Array<{
        standardCode: string;
        averageScore: number;
        interactionCount: number;
        lowScoreCount: number;
        corrections: number;
        status: 'strong' | 'weak' | 'underused';
    }>;
    byIntent: Array<{
        intent: string;
        averageScore: number;
        interactionCount: number;
        lowScoreCount: number;
        status: 'strong' | 'weak' | 'underused';
    }>;
    suggestions: Array<{
        area: string;
        recommendation: string;
        priority: 'high' | 'medium' | 'low';
    }>;
}
/**
 * Calculate comprehensive capability profile
 */
export declare function calculateCapabilityProfile(params: {
    tenantId?: string;
}): Promise<CapabilityProfile>;
/**
 * Get capability summary (brief overview)
 */
export declare function getCapabilitySummary(params: {
    tenantId?: string;
}): Promise<{
    strong: string[];
    weak: string[];
    underused: string[];
    averageScore: number;
}>;
//# sourceMappingURL=VeraCapabilityProfileService.d.ts.map