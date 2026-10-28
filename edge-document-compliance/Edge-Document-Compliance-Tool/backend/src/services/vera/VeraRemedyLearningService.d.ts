/**
 * Vera Remedy Learning Service
 *
 * Tracks which remedies were applied and whether they resolved issues.
 * Phase 8: Learning from fixes over time
 */
import { type VeraIssueCode } from './VeraEngineHealthService.js';
export interface RemedyApplication {
    id: string;
    issueCode: VeraIssueCode;
    remedyAction: string;
    appliedAt: Date;
    appliedBy?: string;
    resolved: boolean;
    resolutionTime?: number;
    notes?: string;
}
export interface RemedyEffectiveness {
    issueCode: VeraIssueCode;
    remedyAction: string;
    totalApplications: number;
    successfulResolutions: number;
    averageResolutionTime?: number;
    successRate: number;
    lastApplied?: Date;
}
export declare class VeraRemedyLearningService {
    /**
     * Record that a remedy was applied
     */
    static recordRemedyApplication(issueCode: VeraIssueCode, remedyAction: string, appliedBy?: string, notes?: string): Promise<void>;
    /**
     * Mark a remedy as resolved (called when issue is cleared)
     */
    static markRemedyResolved(issueCode: VeraIssueCode, remedyAction: string): Promise<void>;
    /**
     * Get remedy effectiveness statistics
     */
    static getRemedyEffectiveness(issueCode?: VeraIssueCode): Promise<RemedyEffectiveness[]>;
    /**
     * Get best remedy for an issue based on historical success
     */
    static getBestRemedyForIssue(issueCode: VeraIssueCode): Promise<string | null>;
    /**
     * Auto-detect if an issue was resolved (called periodically or after self-tests)
     */
    static checkAndRecordResolutions(): Promise<void>;
}
//# sourceMappingURL=VeraRemedyLearningService.d.ts.map