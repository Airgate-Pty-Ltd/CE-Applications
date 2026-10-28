import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import { MaiService } from './mai/service';
import { createApp } from './http/app';
import { getHostPool, getKernelPool, migrate } from './db/pool';
import { RegulatorySourceService } from './host/registry';

// PMA Autopilot API entrypoint.
//
// With a DATABASE_URL present, provisions the schema (idempotent) and boots the
// full app. Without one, serves a health-only app so the process still starts.

async function main() {
  const port = Number(process.env.PORT) || 4000;

  if (!process.env.DATABASE_URL) {
    const app = express();
    app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'pma-autopilot-api', db: false }));
    app.listen(port, () => console.log(`PMA Autopilot API (health-only, no DATABASE_URL) on :${port}`));
    return;
  }

  const hostPool = getHostPool();
  const kernelPool = getKernelPool();

  // Provision host + kernel tables (idempotent). Role grants are a one-time admin
  // step: psql -f src/mai/sql/mai_kernel_role.sql (see docs/mai-kernel.md).
  await migrate(hostPool);

  const service = await MaiService.build({ hostPool, kernelPool });
  const app = createApp({ service, pool: hostPool });

  // Scheduled self-repairing regulatory-source check (weekly, Monday 06:00).
  // Deterministic, no model call; detects BROKEN/CHANGED and proposes fixes for
  // Admin approval — it never auto-replaces a URL or auto-applies a change.
  if (process.env.DISABLE_REGISTRY_CRON !== 'true') {
    const registry = new RegulatorySourceService(hostPool);
    cron.schedule('0 6 * * 1', async () => {
      try {
        const { rows } = await hostPool.query(`SELECT DISTINCT "tenantId" FROM "RegulatorySource"`);
        for (const r of rows) await registry.checkAll(r.tenantId, null);
      } catch (err) {
        console.error('registry cron failed:', err);
      }
    });
  }

  app.listen(port, () =>
    console.log(`PMA Autopilot API on :${port} (M-AI ${service.enabled ? 'active' : 'disabled'})`),
  );
}

/* istanbul ignore next */
if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
  });
}
