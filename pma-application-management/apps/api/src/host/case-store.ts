import { randomUUID } from 'crypto';
import { Pool } from 'pg';

// Host persistence for PmaCase (node-postgres) under the HOST principal.
// The M-AI emit bell is rung by the route AFTER these writes commit — never here,
// so host persistence has no dependency on the kernel (design law 12 / AT-09).

// Columns a preparer/intake may set. tenantId, id, timestamps are managed here.
export const CASE_WRITABLE_COLUMNS = [
  'articleName',
  'status',
  'approvalBasis',
  'stcNumber',
  'tcNumber',
  'tcHolder',
  'licenseAgreementPresent',
  'complianceDataPresent',
  'applicantLegalName',
  'manufacturingAddress',
  'faaSubmissionOffice',
  'qmsManualNumber',
  'qmsManualRevision',
  'qmsManualDate',
  'markingSchemeRef',
  'icaDispositionStated',
  'adImpactAddressed',
  'signatoryName',
  'signatoryTitle',
  'pmaPartNumbers',
  'oemPartNumbers',
  'letterStcNumber',
  'supplementStcNumber',
  'letterModelEligibility',
  'supplementModelEligibility',
] as const;

export type CasePatch = Partial<Record<(typeof CASE_WRITABLE_COLUMNS)[number], unknown>>;

export class CaseStore {
  constructor(private pool: Pool, private now: () => string = () => new Date().toISOString()) {}

  async create(tenantId: string, patch: CasePatch): Promise<string> {
    const id = randomUUID();
    const ts = this.now();
    const cols = ['id', 'tenantId', 'createdAt', 'updatedAt'];
    const vals: unknown[] = [id, tenantId, ts, ts];
    if (patch.articleName == null) patch = { ...patch, articleName: 'Untitled Article' };
    for (const c of CASE_WRITABLE_COLUMNS) {
      if (c in patch) {
        cols.push(c);
        vals.push(patch[c]);
      }
    }
    const placeholders = cols.map((_, i) => `$${i + 1}`);
    const quoted = cols.map((c) => `"${c}"`).join(', ');
    await this.pool.query(
      `INSERT INTO "PmaCase" (${quoted}) VALUES (${placeholders.join(', ')})`,
      vals,
    );
    return id;
  }

  async get(tenantId: string, id: string): Promise<any | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM "PmaCase" WHERE id=$1 AND "tenantId"=$2`,
      [id, tenantId],
    );
    return rows[0] ?? null;
  }

  async list(tenantId: string): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM "PmaCase" WHERE "tenantId"=$1 ORDER BY "updatedAt" DESC`,
      [tenantId],
    );
    return rows;
  }

  // Count of open BLOCKING System-Detected Conditions on a case (the gate).
  async countActiveBlocking(tenantId: string, caseId: string): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT count(*)::int AS n FROM mai_assessments
        WHERE tenant_id=$1 AND record_type='pma_case' AND record_id=$2
          AND status='active' AND severity='blocking'`,
      [tenantId, caseId],
    );
    return rows[0].n as number;
  }

  async setStatus(tenantId: string, id: string, status: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE "PmaCase" SET "status"=$3, "updatedAt"=$4 WHERE id=$1 AND "tenantId"=$2`,
      [id, tenantId, status, this.now()],
    );
    return (rowCount ?? 0) > 0;
  }

  async confirmBasis(
    tenantId: string,
    id: string,
    basis: string,
    userId: string,
  ): Promise<boolean> {
    const ts = this.now();
    const { rowCount } = await this.pool.query(
      `UPDATE "PmaCase"
          SET "approvalBasis"=$3, "basisConfirmedByUserId"=$4, "basisConfirmedAt"=$5, "updatedAt"=$5
        WHERE id=$1 AND "tenantId"=$2`,
      [id, tenantId, basis, userId, ts],
    );
    return (rowCount ?? 0) > 0;
  }

  async update(tenantId: string, id: string, patch: CasePatch): Promise<boolean> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    for (const c of CASE_WRITABLE_COLUMNS) {
      if (c in patch) {
        sets.push(`"${c}" = $${i++}`);
        vals.push(patch[c]);
      }
    }
    sets.push(`"updatedAt" = $${i++}`);
    vals.push(this.now());
    vals.push(id);
    vals.push(tenantId);
    const { rowCount } = await this.pool.query(
      `UPDATE "PmaCase" SET ${sets.join(', ')} WHERE "id" = $${i++} AND "tenantId" = $${i}`,
      vals,
    );
    return (rowCount ?? 0) > 0;
  }
}
