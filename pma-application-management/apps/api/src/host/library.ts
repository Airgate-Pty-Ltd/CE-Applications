import { randomUUID } from 'crypto';
import { Pool } from 'pg';

// Approved Document Library (spec §8, VERA "Decisions → Improvement"). An org's own
// past PMA packages, promoted into a searchable precedent library ONLY by explicit
// human action. Used to pattern-match new cases of the same basis/article type —
// never auto-copied into a new case.

function keywordsFrom(articleName: string): string[] {
  return [...new Set(articleName.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3))];
}

export class LibraryService {
  constructor(private pool: Pool, private now: () => string = () => new Date().toISOString()) {}

  // Promote a case to the library (explicit human action). Requires a confirmed basis.
  async promote(tenantId: string, caseRow: any, userId: string, summary?: string): Promise<string> {
    const id = randomUUID();
    await this.pool.query(
      `INSERT INTO "ApprovedLibraryEntry"
         ("id","tenantId","sourceCaseId","articleName","approvalBasis","summary","keywords","promotedByUserId","createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, tenantId, caseRow.id, caseRow.articleName, caseRow.approvalBasis, summary ?? null, keywordsFrom(caseRow.articleName), userId, this.now()],
    );
    return id;
  }

  async search(tenantId: string, filter: { basis?: string; q?: string }): Promise<any[]> {
    const clauses = ['"tenantId"=$1'];
    const params: unknown[] = [tenantId];
    if (filter.basis) {
      params.push(filter.basis);
      clauses.push(`"approvalBasis"=$${params.length}`);
    }
    if (filter.q) {
      params.push(`%${filter.q.toLowerCase()}%`);
      clauses.push(`lower("articleName") LIKE $${params.length}`);
    }
    const { rows } = await this.pool.query(
      `SELECT * FROM "ApprovedLibraryEntry" WHERE ${clauses.join(' AND ')} ORDER BY "createdAt" DESC`,
      params,
    );
    return rows;
  }

  // Precedent suggestions for a case: same basis and/or overlapping article keywords.
  // Read-only — the preparer selects; nothing is copied automatically.
  async precedents(tenantId: string, caseRow: any): Promise<any[]> {
    const kws = keywordsFrom(caseRow.articleName);
    const { rows } = await this.pool.query(
      `SELECT *,
              (CASE WHEN "approvalBasis"=$2 THEN 1 ELSE 0 END) AS basis_match,
              (SELECT count(*) FROM unnest("keywords") k WHERE k = ANY($3::text[])) AS keyword_overlap
         FROM "ApprovedLibraryEntry"
        WHERE "tenantId"=$1 AND ("sourceCaseId" IS DISTINCT FROM $4)
        ORDER BY basis_match DESC, keyword_overlap DESC, "createdAt" DESC
        LIMIT 10`,
      [tenantId, caseRow.approvalBasis ?? '', kws, caseRow.id],
    );
    return rows.filter((r) => r.basis_match === 1 || Number(r.keyword_overlap) > 0);
  }
}
