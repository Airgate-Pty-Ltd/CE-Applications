/**
 * Vera Engine Health Service
 *
 * Tracks active issues and health status of Vera's internal systems.
 * Allows Vera to self-diagnose and report issues when asked.
 */
export type VeraIssueCode = 'DB_SCHEMA_MISMATCH' | 'SEMANTIC_SEARCH_DISABLED' | 'CONVERSATION_MEMORY_ERROR' | 'CORRECTION_PROCESSOR_ERROR' | 'RESPONSE_LOOP_DETECTED' | 'CONFIG_WARNING' | 'UNKNOWN';
export interface VeraIssue {
    code: VeraIssueCode;
    severity: 'info' | 'warning' | 'error';
    message: string;
    details?: any;
    firstSeen: Date;
    lastSeen: Date;
    occurrences: number;
    priorityScore?: number;
    recommendedActions?: string[];
    likelyRootCause?: string;
}
export declare class VeraEngineHealthService {
    private issues;
    /**
     * Compute priority score for an issue
     * Higher score = more important to fix first
     */
    private computePriority;
    /**
     * Generate remedy suggestions for an issue
     */
    private generateRemedies;
    /**
     * Record an issue
     */
    recordIssue(code: VeraIssueCode, message: string, severity?: 'info' | 'warning' | 'error', details?: any): void;
    /**
     * Clear a specific issue
     * Also checks if any remedies should be marked as resolved
     */
    clearIssue(code: VeraIssueCode): void;
    /**
     * Get all current issues, sorted by priority score (highest first), then severity, then code
     */
    getCurrentIssues(): VeraIssue[];
    /**
     * Check if there are any active issues
     */
    hasIssues(): boolean;
    /**
     * Get issues by severity
     */
    getIssuesBySeverity(severity: 'info' | 'warning' | 'error'): VeraIssue[];
    /**
     * Clear all issues (useful for testing or after fixes)
     */
    clearAllIssues(): void;
    /**
     * Get severity rank for sorting (higher = more severe)
     */
    private severityRank;
}
export declare const veraEngineHealth: VeraEngineHealthService;
//# sourceMappingURL=VeraEngineHealthService.d.ts.map