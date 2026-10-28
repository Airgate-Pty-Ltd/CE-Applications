import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { hashPassword, verifyPassword, type Role } from '../http/auth';

// Users: Preparer / Reviewer (QE) / Admin. Reviewer required to move a case out
// of Drafting; Admin required for registry and library administration.

export class UserService {
  constructor(private pool: Pool, private now: () => string = () => new Date().toISOString()) {}

  async create(input: {
    tenantId: string;
    email: string;
    password: string;
    fullName: string;
    role?: Role;
  }): Promise<string> {
    const id = randomUUID();
    const ts = this.now();
    const passwordHash = await hashPassword(input.password);
    await this.pool.query(
      `INSERT INTO "User" ("id","tenantId","email","passwordHash","fullName","role","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, input.tenantId, input.email.toLowerCase(), passwordHash, input.fullName, input.role ?? 'PREPARER', ts, ts],
    );
    return id;
  }

  async findByEmail(tenantId: string, email: string): Promise<any | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM "User" WHERE "tenantId"=$1 AND email=$2`,
      [tenantId, email.toLowerCase()],
    );
    return rows[0] ?? null;
  }

  // Cross-tenant login lookup by email (email may be unique per tenant only).
  async findByEmailGlobal(email: string): Promise<any | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM "User" WHERE email=$1 AND active=true ORDER BY "createdAt" ASC LIMIT 1`,
      [email.toLowerCase()],
    );
    return rows[0] ?? null;
  }

  async verifyLogin(user: { passwordHash: string }, password: string): Promise<boolean> {
    return verifyPassword(user.passwordHash, password);
  }
}
