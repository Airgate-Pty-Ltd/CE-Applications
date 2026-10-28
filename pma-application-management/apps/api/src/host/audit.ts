import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { canonicalize, sha256Hex } from '../mai/kernel/hash';

// Append-only audit ledger. Every upload, extraction, generation, human response,
// status transition, and registry change is written here with a content hash.
// Treat as immutable — writes only, never updates or deletes.

export interface AuditEntry {
  tenantId: string;
  actorUserId: string | null;
  action: string;
  recordType: string;
  recordId: string;
  detail?: Record<string, unknown>;
}

export async function writeAudit(pool: Pool, e: AuditEntry): Promise<void> {
  const now = new Date().toISOString();
  const contentHash = sha256Hex(
    canonicalize({
      tenantId: e.tenantId,
      action: e.action,
      recordType: e.recordType,
      recordId: e.recordId,
      detail: e.detail ?? null,
      occurredAt: now,
    }),
  );
  await pool.query(
    `INSERT INTO "AuditLedger"
       ("id","tenantId","actorUserId","action","recordType","recordId","contentHash","detail","occurredAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      randomUUID(),
      e.tenantId,
      e.actorUserId,
      e.action,
      e.recordType,
      e.recordId,
      contentHash,
      e.detail ? JSON.stringify(e.detail) : null,
      now,
    ],
  );
}

export async function listAudit(
  pool: Pool,
  tenantId: string,
  limit = 100,
): Promise<any[]> {
  const { rows } = await pool.query(
    `SELECT * FROM "AuditLedger" WHERE "tenantId"=$1 ORDER BY "occurredAt" DESC LIMIT $2`,
    [tenantId, limit],
  );
  return rows;
}
