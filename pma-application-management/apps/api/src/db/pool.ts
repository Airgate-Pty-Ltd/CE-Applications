import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

// Host database access (node-postgres). The kernel keeps its own least-privilege
// pool; this is the host application principal.

let hostPool: Pool | null = null;
let kernelPool: Pool | null = null;

export function getHostPool(): Pool {
  if (!hostPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    hostPool = new Pool({ connectionString: url });
  }
  return hostPool;
}

export function getKernelPool(): Pool {
  if (!kernelPool) {
    const url = process.env.MAI_KERNEL_DATABASE_URL || process.env.DATABASE_URL;
    if (!url) throw new Error('No DB URL for kernel pool');
    kernelPool = new Pool({ connectionString: url });
  }
  return kernelPool;
}

// Apply the host schema + kernel schema (idempotent). Role grants are a one-time
// admin step (src/mai/sql/mai_kernel_role.sql).
export async function migrate(pool: Pool, distDir = __dirname): Promise<void> {
  const hostSchema = readSql(distDir, 'schema.sql', ['db']);
  const maiSchema = readSql(distDir, 'mai_schema.sql', ['mai', 'sql']);
  await pool.query(hostSchema);
  await pool.query(maiSchema);
}

function readSql(baseDir: string, file: string, subpath: string[]): string {
  // baseDir is .../src/db (tsx) or .../dist/db (built). Resolve to the api root.
  const apiRoot = path.resolve(baseDir, '..');
  const candidates = [
    path.join(apiRoot, ...subpath, file),
    path.join(apiRoot, 'src', ...subpath, file),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return fs.readFileSync(c, 'utf8');
  throw new Error(`SQL not found: ${file} (looked in ${candidates.join(', ')})`);
}
