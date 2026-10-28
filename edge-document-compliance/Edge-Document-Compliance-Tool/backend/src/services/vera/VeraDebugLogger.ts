/**
 * Vera Debug Logger
 * 
 * Logs Vera's internal issues to the vera_debug_sessions table
 * for persistent tracking and historical analysis.
 */

import { queryEdcatAI } from '../../config/databases.js';
import type { VeraIssue } from './VeraEngineHealthService.js';

/**
 * Log a Vera issue to the database
 */
export async function logVeraIssueToDb(issue: VeraIssue, tenantId?: string): Promise<void> {
  try {
    // NOTE: vera_debug_sessions requires tenant_id (NOT NULL constraint)
    // Use default tenant if not provided
    const effectiveTenantId = tenantId || '00000000-0000-0000-0000-000000000000';
    
    await queryEdcatAI(
      `
      INSERT INTO edcat.vera_debug_sessions
        (id, tenant_id, issue_code, severity, message, details, first_seen, last_seen, occurrences)
      VALUES
        (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        effectiveTenantId,
        issue.code,
        issue.severity,
        issue.message,
        issue.details ? JSON.stringify(issue.details) : null,
        issue.firstSeen,
        issue.lastSeen,
        issue.occurrences
      ]
    );
    console.log(`[VeraDebugLogger] ✅ Logged issue ${issue.code} to debug sessions`);
  } catch (err: any) {
    console.error('[VeraDebugLogger] Failed to log issue to database:', err.message);
    // Non-fatal - continue even if logging fails
  }
}

/**
 * Fetch recent debug sessions from database
 */
export async function fetchRecentDebugSessions(limit: number = 5): Promise<any[]> {
  try {
    const result = await queryEdcatAI(
      `
      SELECT 
        issue_code,
        severity,
        message,
        details,
        first_seen,
        last_seen,
        occurrences
      FROM edcat.vera_debug_sessions
      ORDER BY last_seen DESC
      LIMIT $1
      `,
      [limit]
    );
    return result.rows || [];
  } catch (err: any) {
    console.error('[VeraDebugLogger] Failed to fetch debug sessions:', err.message);
    return [];
  }
}

