import { Pool } from 'pg';

// Gap summary for a case, derived from the ACTIVE System-Detected Conditions.
// Drives the submission status the generated documents may state (spec §7) and
// the generation gate (a BLOCKING gap blocks generation — spec §12 step 10).

export interface Gap {
  ruleId: string;
  severity: 'blocking' | 'warning' | 'info';
  findingText: string;
  resolutionHint: string | null;
  clauseRefs: string[];
}

export interface GapSummary {
  blocking: Gap[];
  warning: Gap[];
  info: Gap[];
  submissionStatus: 'DRAFTED' | 'DRAFTED_WITH_GAPS' | 'BLOCKED';
}

export async function computeGaps(pool: Pool, tenantId: string, caseId: string): Promise<GapSummary> {
  const { rows } = await pool.query(
    `SELECT rule_id, severity, finding_text, resolution_hint, clause_refs
       FROM mai_assessments
      WHERE tenant_id=$1 AND record_type='pma_case' AND record_id=$2 AND status='active'
      ORDER BY severity, rule_id`,
    [tenantId, caseId],
  );
  const gaps: Gap[] = rows.map((r) => ({
    ruleId: r.rule_id,
    severity: r.severity,
    findingText: r.finding_text,
    resolutionHint: r.resolution_hint,
    clauseRefs: normalizeArr(r.clause_refs),
  }));
  const blocking = gaps.filter((g) => g.severity === 'blocking');
  const warning = gaps.filter((g) => g.severity === 'warning');
  const info = gaps.filter((g) => g.severity === 'info');
  const submissionStatus = blocking.length ? 'BLOCKED' : warning.length ? 'DRAFTED_WITH_GAPS' : 'DRAFTED';
  return { blocking, warning, info, submissionStatus };
}

function normalizeArr(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}
