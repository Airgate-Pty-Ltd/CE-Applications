import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { FIELD_REGISTRY, coerce } from './intake/field-registry';

// Data_Field write path. Every field written here is CONFIRMED — there is no
// LIKELY state (spec §6). A value came from a structured form-field read, a
// pattern match against a known FAA format, or a human transcribing it off the
// source document. Writing a field updates BOTH the provenance row and the
// materialized "PmaCase" column the kernel snapshots.

export type WriteMethod = 'form_field_read' | 'pattern_match' | 'preparer_transcribed';

export interface FieldWrite {
  fieldKey: string;
  value: unknown;
  method: WriteMethod;
  sourceEvidenceId?: string | null;
  citation?: string | null;
}

export class DataFieldService {
  constructor(private pool: Pool, private now: () => string = () => new Date().toISOString()) {}

  // Write one field (upsert). Returns false if the fieldKey is unknown.
  async write(tenantId: string, caseId: string, w: FieldWrite): Promise<boolean> {
    const spec = FIELD_REGISTRY[w.fieldKey];
    if (!spec) return false;
    const coerced = coerce(spec.kind, w.value);
    const ts = this.now();

    // Provenance row (value stored as display text).
    const displayValue =
      coerced == null ? null : Array.isArray(coerced) ? JSON.stringify(coerced) : String(coerced);
    await this.pool.query(
      `INSERT INTO "DataField"
         ("id","tenantId","caseId","fieldKey","value","state","method","sourceEvidenceId","sourceCitation","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,'CONFIRMED',$6,$7,$8,$9,$9)
       ON CONFLICT ("caseId","fieldKey") DO UPDATE
         SET "value"=EXCLUDED."value", "state"='CONFIRMED', "method"=EXCLUDED."method",
             "sourceEvidenceId"=EXCLUDED."sourceEvidenceId", "sourceCitation"=EXCLUDED."sourceCitation",
             "updatedAt"=EXCLUDED."updatedAt"`,
      [randomUUID(), tenantId, caseId, w.fieldKey, displayValue, w.method, w.sourceEvidenceId ?? null, w.citation ?? null, ts],
    );

    // Materialize onto the case column the kernel snapshots.
    await this.pool.query(
      `UPDATE "PmaCase" SET "${spec.column}"=$1, "updatedAt"=$2 WHERE id=$3 AND "tenantId"=$4`,
      [coerced as any, ts, caseId, tenantId],
    );
    return true;
  }

  async writeMany(tenantId: string, caseId: string, writes: FieldWrite[]): Promise<number> {
    let n = 0;
    for (const w of writes) if (await this.write(tenantId, caseId, w)) n += 1;
    return n;
  }

  async list(tenantId: string, caseId: string): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT "fieldKey","value","state","method","sourceEvidenceId","sourceCitation","updatedAt"
         FROM "DataField" WHERE "tenantId"=$1 AND "caseId"=$2 ORDER BY "fieldKey" ASC`,
      [tenantId, caseId],
    );
    return rows;
  }

  // Intake status: which registry fields are CONFIRMED vs still MISSING.
  async status(tenantId: string, caseId: string): Promise<{ confirmed: string[]; missing: string[] }> {
    const confirmed = new Set(
      (await this.list(tenantId, caseId)).filter((r) => r.state === 'CONFIRMED').map((r) => r.fieldKey),
    );
    const all = Object.keys(FIELD_REGISTRY);
    return {
      confirmed: all.filter((k) => confirmed.has(k)),
      missing: all.filter((k) => !confirmed.has(k)),
    };
  }
}
