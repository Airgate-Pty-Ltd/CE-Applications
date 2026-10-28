import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { hashSnapshot } from '../../mai/kernel/hash';
import { FIELD_REGISTRY } from '../intake/field-registry';
import { computeGaps, type GapSummary } from './gaps';
import { buildApplicationLetter, buildSupplement, buildSubmissionChecklist, buildManagementReviewPack, type DocType } from './documents';

const STORAGE_DIR = process.env.STORAGE_DIR || path.resolve(__dirname, '..', '..', '..', 'storage');
const DEFAULT_REG_REVISION = 'AC 21.303-4 (3/21/14)';

export class GenerationBlockedError extends Error {
  constructor(public gaps: GapSummary) {
    super('generation blocked by open BLOCKING conditions');
    this.name = 'GenerationBlockedError';
  }
}

export interface GenerateResult {
  id: string;
  type: DocType;
  version: number;
  submissionStatus: string;
  storageKey: string;
  dataSnapshotHash: string;
  regulatorySourceRevision: string;
}

export class GenerationService {
  constructor(private pool: Pool, private now: () => string = () => new Date().toISOString()) {}

  // Hash the case's DIM data columns as the version stamp for the generated file.
  private snapshotHash(caseRow: any): string {
    const data: Record<string, unknown> = {};
    for (const spec of Object.values(FIELD_REGISTRY)) data[spec.fieldKey] = caseRow[spec.column] ?? null;
    return hashSnapshot(data);
  }

  async generate(tenantId: string, caseRow: any, type: DocType, userId: string, org: any): Promise<GenerateResult> {
    const gaps = await computeGaps(this.pool, tenantId, caseRow.id);
    // A BLOCKING gap blocks generation (spec §12 step 10).
    if (gaps.blocking.length > 0) throw new GenerationBlockedError(gaps);

    const dataSnapshotHash = this.snapshotHash(caseRow);
    const regulatorySourceRevision = caseRow.regulatorySourceRevision || DEFAULT_REG_REVISION;
    const stamp = { submissionStatus: gaps.submissionStatus, snapshotHash: dataSnapshotHash, regulatorySourceRevision };

    let buffer: Buffer;
    switch (type) {
      case 'APPLICATION_LETTER': buffer = await buildApplicationLetter(caseRow, org, stamp); break;
      case 'PMA_SUPPLEMENT': buffer = await buildSupplement(caseRow, stamp); break;
      case 'SUBMISSION_CHECKLIST': buffer = await buildSubmissionChecklist(caseRow, gaps, stamp); break;
      case 'MANAGEMENT_REVIEW_PACK': buffer = await buildManagementReviewPack(caseRow, gaps, stamp); break;
      default: throw new Error(`unknown document type: ${type}`);
    }

    const id = randomUUID();
    const dir = path.join(STORAGE_DIR, tenantId);
    fs.mkdirSync(dir, { recursive: true });
    const storageKey = path.join(tenantId, `${id}-${type}.docx`);
    fs.writeFileSync(path.join(STORAGE_DIR, storageKey), buffer);

    const { rows } = await this.pool.query(`SELECT count(*)::int AS n FROM "GeneratedDocument" WHERE "caseId"=$1 AND "type"=$2`, [caseRow.id, type]);
    const version = (rows[0].n as number) + 1;

    await this.pool.query(
      `INSERT INTO "GeneratedDocument"
         ("id","tenantId","caseId","type","version","storageKey","dataSnapshotHash","regulatorySourceRevision","submissionStatus","generatedByUserId","createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, tenantId, caseRow.id, type, version, storageKey, dataSnapshotHash, regulatorySourceRevision, gaps.submissionStatus, userId, this.now()],
    );
    return { id, type, version, submissionStatus: gaps.submissionStatus, storageKey, dataSnapshotHash, regulatorySourceRevision };
  }

  async list(tenantId: string, caseId: string): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT id,"type","version","submissionStatus","dataSnapshotHash","regulatorySourceRevision","createdAt"
         FROM "GeneratedDocument" WHERE "tenantId"=$1 AND "caseId"=$2 ORDER BY "createdAt" DESC`,
      [tenantId, caseId],
    );
    return rows;
  }

  async getForDownload(tenantId: string, docId: string): Promise<{ storageKey: string; type: string } | null> {
    const { rows } = await this.pool.query(`SELECT "storageKey","type" FROM "GeneratedDocument" WHERE id=$1 AND "tenantId"=$2`, [docId, tenantId]);
    if (rows.length === 0) return null;
    const abs = path.join(STORAGE_DIR, rows[0].storageKey);
    if (!fs.existsSync(abs)) return null;
    return { storageKey: abs, type: rows[0].type };
  }
}
