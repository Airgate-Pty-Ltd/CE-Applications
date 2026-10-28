import fs from 'fs';
import path from 'path';
import { randomUUID, createHash } from 'crypto';
import { Pool } from 'pg';

// Evidence documents: uploaded source files, versioned, content-hashed, stored on
// disk (or a configured STORAGE_DIR). The kernel never reads these — only the host.

const STORAGE_DIR = process.env.STORAGE_DIR || path.resolve(__dirname, '..', '..', 'storage');

export class EvidenceService {
  constructor(private pool: Pool, private now: () => string = () => new Date().toISOString()) {}

  async store(input: {
    tenantId: string;
    caseId: string;
    type: string;
    fileName: string;
    buffer: Buffer;
    uploadedByUserId?: string;
  }): Promise<{ id: string; contentHash: string; storageKey: string }> {
    const id = randomUUID();
    const contentHash = createHash('sha256').update(input.buffer).digest('hex');
    const dir = path.join(STORAGE_DIR, input.tenantId);
    fs.mkdirSync(dir, { recursive: true });
    const storageKey = path.join(input.tenantId, `${id}-${sanitize(input.fileName)}`);
    fs.writeFileSync(path.join(STORAGE_DIR, storageKey), input.buffer);

    // version = existing docs of this type on the case + 1.
    const { rows } = await this.pool.query(
      `SELECT count(*)::int AS n FROM "EvidenceDocument" WHERE "caseId"=$1 AND "type"=$2`,
      [input.caseId, input.type],
    );
    const version = (rows[0].n as number) + 1;

    await this.pool.query(
      `INSERT INTO "EvidenceDocument"
         ("id","tenantId","caseId","type","fileName","storageKey","contentHash","version","uploadedByUserId","createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, input.tenantId, input.caseId, input.type, input.fileName, storageKey, contentHash, version, input.uploadedByUserId ?? null, this.now()],
    );
    return { id, contentHash, storageKey };
  }

  async list(tenantId: string, caseId: string): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT id,"type","fileName","contentHash","version","createdAt"
         FROM "EvidenceDocument" WHERE "tenantId"=$1 AND "caseId"=$2 ORDER BY "createdAt" ASC`,
      [tenantId, caseId],
    );
    return rows;
  }
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}
