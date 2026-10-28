/**
 * Vera Engine Health Service
 *
 * Tracks active issues and health status of Vera's internal systems.
 * Allows Vera to self-diagnose and report issues when asked.
 */
import { logVeraIssueToDb } from './VeraDebugLogger.js';
export class VeraEngineHealthService {
    constructor() {
        this.issues = new Map();
    }
    /**
     * Compute priority score for an issue
     * Higher score = more important to fix first
     */
    computePriority(code, severity) {
        switch (code) {
            case 'DB_SCHEMA_MISMATCH':
                return 100; // breaks core abilities
            case 'CONVERSATION_MEMORY_ERROR':
                return 90; // severely hurts contextual reasoning
            case 'SEMANTIC_SEARCH_DISABLED':
                return 70; // still usable, but less intelligent
            case 'CORRECTION_PROCESSOR_ERROR':
                return 60; // hurts learning over time
            case 'RESPONSE_LOOP_DETECTED':
                return 50; // bad UX, but often a symptom
            case 'CONFIG_WARNING':
                return 40;
            case 'UNKNOWN':
            default:
                return severity === 'error' ? 80 :
                    severity === 'warning' ? 50 : 20;
        }
    }
    /**
     * Generate remedy suggestions for an issue
     */
    generateRemedies(code, details) {
        const actions = [];
        let rootCause = '';
        switch (code) {
            case 'DB_SCHEMA_MISMATCH':
                rootCause = 'Database schema is missing required columns or tables. This typically happens when migrations have not been applied or were partially applied.';
                const missingColumn = details?.column || details?.rawError?.match(/column "([^"]+)" .* does not exist/i)?.[1];
                const missingTable = details?.table || details?.rawError?.match(/relation "([^"]+)" .* does not exist/i)?.[1];
                if (missingColumn) {
                    actions.push(`Run the appropriate migration to add the missing column "${missingColumn}" to the ${details?.table || 'affected'} table.`);
                    actions.push(`Check migrations folder for files that add "${missingColumn}" (e.g., 041_fix_vera_schema_columns.sql, 042_fix_vera_memory_schema.sql).`);
                }
                else if (missingTable) {
                    actions.push(`Run the appropriate migration to create the missing table "${missingTable}".`);
                    actions.push(`Check migrations folder for files that create "${missingTable}" (e.g., 042_create_learning_documents_table.sql).`);
                }
                else {
                    actions.push('Run all pending migrations on the EDCAT AI database: `npm run migrate` or manually execute SQL files in the migrations folder.');
                    actions.push('Verify that the `edcat` schema exists and has all required tables.');
                }
                actions.push('After running migrations, restart the application to clear cached schema assumptions.');
                break;
            case 'CONVERSATION_MEMORY_ERROR':
                rootCause = 'Conversation memory table is missing required columns or the database connection is failing.';
                actions.push('Check that `edcat.conversation_memory` table exists and has columns: `message_text`, `question_text`, `role`.');
                actions.push('Run migration `041_fix_vera_schema_columns.sql` to add missing columns.');
                actions.push('Verify EDCAT_AI_DATABASE_URL connection string is correct and the database is accessible.');
                actions.push('Check database logs for connection errors or permission issues.');
                break;
            case 'SEMANTIC_SEARCH_DISABLED':
                rootCause = 'pgvector extension is not installed or not enabled on the PostgreSQL database.';
                actions.push('Install pgvector extension on your PostgreSQL database: `CREATE EXTENSION IF NOT EXISTS vector;`');
                actions.push('Verify pgvector is enabled: `SELECT * FROM pg_extension WHERE extname = \'vector\';`');
                actions.push('If using Railway, check if pgvector is available in your PostgreSQL plan (some plans require manual installation).');
                actions.push('If pgvector cannot be installed, Vera will fall back to keyword search, which is slower but functional.');
                break;
            case 'CORRECTION_PROCESSOR_ERROR':
                rootCause = 'Correction processor cannot access the correction tables or has schema mismatches.';
                actions.push('Verify `edcat.vera_learned_corrections` and `edcat.vera_query_response_bank` tables exist.');
                actions.push('Check that `question_text` column exists in both tables (run migration `041_fix_vera_schema_columns.sql`).');
                actions.push('Verify database permissions allow SELECT/INSERT/UPDATE on correction tables.');
                break;
            case 'RESPONSE_LOOP_DETECTED':
                rootCause = 'Vera is repeating the same response, often due to missing context, misconfigured intent routing, or insufficient data in knowledge base.';
                actions.push('Check if the question requires specific standard/clause context that is missing from the knowledge base.');
                actions.push('Review intent classification logs to see if the question is being misrouted (e.g., CQE questions going to Six Sigma).');
                actions.push('Ingest more relevant documents for the topic being asked about: `npm run ingest:requirements`.');
                actions.push('Check if loop avoidance service is working correctly - review `VeraLoopAvoidanceService` logs.');
                break;
            case 'CONFIG_WARNING':
                rootCause = 'Configuration issue detected, such as missing environment variables or incorrect settings.';
                const configKey = details?.configKey || details?.rawError?.match(/environment variable "([^"]+)" is not set/i)?.[1];
                if (configKey) {
                    actions.push(`Set the ${configKey} environment variable in your Railway/Deployment environment.`);
                    actions.push(`Check your .env file or Railway environment variables for ${configKey}.`);
                }
                else {
                    actions.push('Review environment variables and configuration settings.');
                    actions.push('Check application logs for specific configuration errors.');
                }
                break;
            case 'UNKNOWN':
            default:
                rootCause = 'An unknown error occurred. Review error details for specific information.';
                actions.push('Check application logs for detailed error messages.');
                actions.push('Review the `details` field in the health endpoint response for more context.');
                if (details?.rawError) {
                    actions.push(`Error message: ${details.rawError.substring(0, 200)}`);
                }
                break;
        }
        return { recommendedActions: actions, likelyRootCause: rootCause };
    }
    /**
     * Record an issue
     */
    recordIssue(code, message, severity = 'warning', details) {
        const now = new Date();
        const existing = this.issues.get(code);
        const priorityScore = this.computePriority(code, severity);
        const { recommendedActions, likelyRootCause } = this.generateRemedies(code, details);
        const wasNew = !existing;
        const severityEscalated = existing && this.severityRank(severity) > this.severityRank(existing.severity);
        if (existing) {
            existing.lastSeen = now;
            existing.occurrences += 1;
            // Update message/details with most recent
            existing.message = message;
            existing.details = details;
            existing.priorityScore = priorityScore;
            // Update remedies if this is a new occurrence or severity escalated
            if (wasNew || severityEscalated || !existing.recommendedActions) {
                existing.recommendedActions = recommendedActions;
                existing.likelyRootCause = likelyRootCause;
            }
            // Upgrade severity if needed
            if (severityEscalated) {
                existing.severity = severity;
                existing.priorityScore = priorityScore; // Recompute if severity changed
            }
        }
        else {
            this.issues.set(code, {
                code,
                message,
                severity,
                details,
                firstSeen: now,
                lastSeen: now,
                occurrences: 1,
                priorityScore,
                recommendedActions,
                likelyRootCause
            });
        }
        // Log to database if this is a new issue or severity escalated
        if (wasNew || severityEscalated) {
            const issueToLog = existing || this.issues.get(code);
            if (issueToLog) {
                // Log asynchronously - don't block
                logVeraIssueToDb(issueToLog).catch(() => {
                    // Already logged error in logVeraIssueToDb
                });
            }
        }
    }
    /**
     * Clear a specific issue
     * Also checks if any remedies should be marked as resolved
     */
    clearIssue(code) {
        this.issues.delete(code);
        // Check if any remedies should be marked as resolved (async, non-blocking)
        import('./VeraRemedyLearningService.js').then(({ VeraRemedyLearningService }) => {
            // Get the issue that was just cleared to find its remedies
            // Since we already deleted it, we'll check all recent remedies for this code
            VeraRemedyLearningService.checkAndRecordResolutions().catch(() => {
                // Non-fatal
            });
        }).catch(() => {
            // Non-fatal if import fails
        });
    }
    /**
     * Get all current issues, sorted by priority score (highest first), then severity, then code
     */
    getCurrentIssues() {
        return Array.from(this.issues.values()).sort((a, b) => {
            const pa = a.priorityScore ?? this.computePriority(a.code, a.severity);
            const pb = b.priorityScore ?? this.computePriority(b.code, b.severity);
            if (pa !== pb) {
                return pb - pa; // higher priority first
            }
            const severityDiff = this.severityRank(b.severity) - this.severityRank(a.severity);
            if (severityDiff !== 0) {
                return severityDiff;
            }
            return a.code.localeCompare(b.code);
        });
    }
    /**
     * Check if there are any active issues
     */
    hasIssues() {
        return this.issues.size > 0;
    }
    /**
     * Get issues by severity
     */
    getIssuesBySeverity(severity) {
        return this.getCurrentIssues().filter(issue => issue.severity === severity);
    }
    /**
     * Clear all issues (useful for testing or after fixes)
     */
    clearAllIssues() {
        this.issues.clear();
    }
    /**
     * Get severity rank for sorting (higher = more severe)
     */
    severityRank(severity) {
        switch (severity) {
            case 'error': return 3;
            case 'warning': return 2;
            case 'info': return 1;
            default: return 0;
        }
    }
}
// Export a singleton instance
export const veraEngineHealth = new VeraEngineHealthService();
//# sourceMappingURL=VeraEngineHealthService.js.map