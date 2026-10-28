/**
 * Vera Debug Logger
 *
 * Logs Vera's internal issues to the vera_debug_sessions table
 * for persistent tracking and historical analysis.
 */
import type { VeraIssue } from './VeraEngineHealthService.js';
/**
 * Log a Vera issue to the database
 */
export declare function logVeraIssueToDb(issue: VeraIssue, tenantId?: string): Promise<void>;
/**
 * Fetch recent debug sessions from database
 */
export declare function fetchRecentDebugSessions(limit?: number): Promise<any[]>;
//# sourceMappingURL=VeraDebugLogger.d.ts.map