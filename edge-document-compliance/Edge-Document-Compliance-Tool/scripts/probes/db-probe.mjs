/**
 * Database Connectivity Probe
 * Verifies DATABASE_URL connectivity without blocking server startup
 */

import pg from 'pg';
const { Client } = pg;

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!url) {
  console.error('[db-probe] No DATABASE_URL/POSTGRES_URL set');
  process.exit(2);
}

const sslConfig = process.env.NODE_ENV === 'production' 
  ? { rejectUnauthorized: false }
  : false;

const client = new Client({ 
  connectionString: url,
  ssl: sslConfig,
  connectionTimeoutMillis: 5000
});

try {
  await client.connect();
  const { rows } = await client.query('SELECT version()');
  console.log('[db-probe] ✅ Connected:', rows[0].version.split(' ')[0] + ' ' + rows[0].version.split(' ')[1]);
  process.exit(0);
} catch (e) {
  console.error('[db-probe] ❌ Failed:', e?.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}

