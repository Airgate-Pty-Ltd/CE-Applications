import { randomUUID, createHash } from 'crypto';
import { Pool } from 'pg';
import { writeAudit } from './audit';

// Self-repairing Regulatory Source Registry (spec §5). Deterministic — no model
// call. The system detects and PROPOSES a fix; a human (Admin) approves what gets
// trusted. Nothing about the regulation is ever inferred.

export type SourceFetcher = (url: string) => Promise<{ reachable: boolean; content?: string }>;
export type FallbackResolver = (source: RegSourceRow) => string | null;

export interface RegSourceRow {
  id: string;
  tenantId: string;
  title: string;
  canonicalUrl: string;
  category: 'AC' | 'CFR_SECTION' | 'FAA_FORM';
  currentRevision: string | null;
  lastKnownHash: string | null;
  status: 'OK' | 'BROKEN' | 'CHANGED';
  frozen: boolean;
  proposedUrl: string | null;
}

// Default fallback: construct a canonical search URL for the same document by
// title/number on the authoritative site for its category. Proposed, never applied.
const defaultResolver: FallbackResolver = (s) => {
  const query = encodeURIComponent(s.title);
  switch (s.category) {
    case 'CFR_SECTION':
      return `https://www.ecfr.gov/search?search[query]=${query}`;
    case 'AC':
      return `https://www.faa.gov/regulations_policies/advisory_circulars/?search=${query}`;
    case 'FAA_FORM':
      return `https://www.faa.gov/forms/index.cfm?search=${query}`;
    default:
      return null;
  }
};

const defaultFetcher: SourceFetcher = async (url) => {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return { reachable: false };
    return { reachable: true, content: await res.text() };
  } catch {
    return { reachable: false };
  }
};

export class RegulatorySourceService {
  private fetcher: SourceFetcher;
  private resolver: FallbackResolver;
  private now: () => string;

  constructor(
    private pool: Pool,
    opts: { fetcher?: SourceFetcher; resolver?: FallbackResolver; now?: () => string } = {},
  ) {
    this.fetcher = opts.fetcher ?? defaultFetcher;
    this.resolver = opts.resolver ?? defaultResolver;
    this.now = opts.now ?? (() => new Date().toISOString());
  }

  async create(tenantId: string, input: { title: string; canonicalUrl: string; category: string; currentRevision?: string }): Promise<string> {
    const id = randomUUID();
    const ts = this.now();
    await this.pool.query(
      `INSERT INTO "RegulatorySource" ("id","tenantId","title","canonicalUrl","category","currentRevision","status","frozen","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,'OK',false,$7,$7)`,
      [id, tenantId, input.title, input.canonicalUrl, input.category, input.currentRevision ?? null, ts],
    );
    return id;
  }

  async list(tenantId: string): Promise<RegSourceRow[]> {
    const { rows } = await this.pool.query(`SELECT * FROM "RegulatorySource" WHERE "tenantId"=$1 ORDER BY "title"`, [tenantId]);
    return rows as RegSourceRow[];
  }

  async get(tenantId: string, id: string): Promise<RegSourceRow | null> {
    const { rows } = await this.pool.query(`SELECT * FROM "RegulatorySource" WHERE id=$1 AND "tenantId"=$2`, [id, tenantId]);
    return (rows[0] as RegSourceRow) ?? null;
  }

  async hasFrozen(tenantId: string): Promise<number> {
    const { rows } = await this.pool.query(`SELECT count(*)::int AS n FROM "RegulatorySource" WHERE "tenantId"=$1 AND frozen=true`, [tenantId]);
    return rows[0].n as number;
  }

  // Check one source. Deterministic classification: BROKEN / CHANGED / OK.
  async checkSource(source: RegSourceRow, actor: string | null): Promise<'OK' | 'BROKEN' | 'CHANGED'> {
    const ts = this.now();
    const result = await this.fetcher(source.canonicalUrl);

    if (!result.reachable) {
      const proposed = this.resolver(source);
      await this.pool.query(
        `UPDATE "RegulatorySource" SET status='BROKEN', "proposedUrl"=$2, "lastCheckedAt"=$3, "updatedAt"=$3 WHERE id=$1`,
        [source.id, proposed, ts],
      );
      await writeAudit(this.pool, { tenantId: source.tenantId, actorUserId: actor, action: 'reg_source_broken', recordType: 'regulatory_source', recordId: source.id, detail: { proposedUrl: proposed } });
      return 'BROKEN';
    }

    const hash = createHash('sha256').update(result.content ?? '').digest('hex');
    if (source.lastKnownHash == null) {
      // First successful check — record the baseline hash.
      await this.pool.query(`UPDATE "RegulatorySource" SET status='OK', "lastKnownHash"=$2, "lastCheckedAt"=$3, "updatedAt"=$3 WHERE id=$1`, [source.id, hash, ts]);
      return 'OK';
    }
    if (hash !== source.lastKnownHash) {
      // Content changed → freeze from new drafts until an Admin reviews. The
      // baseline hash is intentionally NOT overwritten here (Admin decides).
      await this.pool.query(`UPDATE "RegulatorySource" SET status='CHANGED', frozen=true, "lastCheckedAt"=$2, "updatedAt"=$2 WHERE id=$1`, [source.id, ts]);
      await writeAudit(this.pool, { tenantId: source.tenantId, actorUserId: actor, action: 'reg_source_changed', recordType: 'regulatory_source', recordId: source.id, detail: { previousHash: source.lastKnownHash, newHash: hash } });
      return 'CHANGED';
    }
    await this.pool.query(`UPDATE "RegulatorySource" SET status='OK', "lastCheckedAt"=$2, "updatedAt"=$2 WHERE id=$1`, [source.id, ts]);
    return 'OK';
  }

  async checkAll(tenantId: string, actor: string | null): Promise<{ id: string; result: string }[]> {
    const out: { id: string; result: string }[] = [];
    for (const s of await this.list(tenantId)) out.push({ id: s.id, result: await this.checkSource(s, actor) });
    return out;
  }

  // Admin approves the proposed fallback URL for a BROKEN source (never auto-applied).
  async approveProposedUrl(tenantId: string, id: string, actor: string): Promise<boolean> {
    const source = await this.get(tenantId, id);
    if (!source || source.status !== 'BROKEN' || !source.proposedUrl) return false;
    const ts = this.now();
    // Re-fetch the approved URL to establish a fresh baseline hash.
    const result = await this.fetcher(source.proposedUrl);
    const hash = result.reachable ? createHash('sha256').update(result.content ?? '').digest('hex') : null;
    await this.pool.query(
      `UPDATE "RegulatorySource" SET "canonicalUrl"=$2, status='OK', "proposedUrl"=NULL, "lastKnownHash"=$3, "lastCheckedAt"=$4, "updatedAt"=$4 WHERE id=$1`,
      [id, source.proposedUrl, hash, ts],
    );
    await writeAudit(this.pool, { tenantId, actorUserId: actor, action: 'reg_source_repaired', recordType: 'regulatory_source', recordId: id, detail: { newUrl: source.proposedUrl } });
    return true;
  }

  // Admin reviews a CHANGED source: accept the new content as the baseline + unfreeze.
  async acceptChange(tenantId: string, id: string, actor: string): Promise<boolean> {
    const source = await this.get(tenantId, id);
    if (!source || source.status !== 'CHANGED') return false;
    const ts = this.now();
    const result = await this.fetcher(source.canonicalUrl);
    const hash = result.reachable ? createHash('sha256').update(result.content ?? '').digest('hex') : source.lastKnownHash;
    await this.pool.query(`UPDATE "RegulatorySource" SET status='OK', frozen=false, "lastKnownHash"=$2, "lastCheckedAt"=$3, "updatedAt"=$3 WHERE id=$1`, [id, hash, ts]);
    await writeAudit(this.pool, { tenantId, actorUserId: actor, action: 'reg_source_change_accepted', recordType: 'regulatory_source', recordId: id });
    return true;
  }
}
