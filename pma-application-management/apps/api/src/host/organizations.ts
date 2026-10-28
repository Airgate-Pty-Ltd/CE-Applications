import { randomUUID } from 'crypto';
import { Pool } from 'pg';

// Organization = the tenant. Holds its OWN Submission Office Profile, which must
// never be defaulted from another org (spec §3, §11).

export interface SubmissionOfficeProfile {
  submissionOfficeName?: string | null;
  submissionOfficeAddress?: string | null;
  submissionOfficeContact?: string | null;
  submissionMethod?: string | null;
}

export class OrganizationService {
  constructor(private pool: Pool, private now: () => string = () => new Date().toISOString()) {}

  async create(input: { name: string; slug: string; legalName?: string }): Promise<string> {
    const id = randomUUID();
    const ts = this.now();
    await this.pool.query(
      `INSERT INTO "Organization" ("id","name","slug","legalName","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, input.name, input.slug, input.legalName ?? null, ts, ts],
    );
    return id;
  }

  async get(id: string): Promise<any | null> {
    const { rows } = await this.pool.query(`SELECT * FROM "Organization" WHERE id=$1`, [id]);
    return rows[0] ?? null;
  }

  async findBySlug(slug: string): Promise<any | null> {
    const { rows } = await this.pool.query(`SELECT * FROM "Organization" WHERE slug=$1`, [slug]);
    return rows[0] ?? null;
  }

  // Submission Office Profile is scoped to this tenant only.
  async setSubmissionOffice(id: string, profile: SubmissionOfficeProfile): Promise<void> {
    await this.pool.query(
      `UPDATE "Organization"
          SET "submissionOfficeName"=$2, "submissionOfficeAddress"=$3,
              "submissionOfficeContact"=$4, "submissionMethod"=$5, "updatedAt"=$6
        WHERE id=$1`,
      [
        id,
        profile.submissionOfficeName ?? null,
        profile.submissionOfficeAddress ?? null,
        profile.submissionOfficeContact ?? null,
        profile.submissionMethod ?? null,
        this.now(),
      ],
    );
  }
}
