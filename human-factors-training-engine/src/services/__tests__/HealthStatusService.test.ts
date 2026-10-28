/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { HealthStatusService, DEFAULT_BACKUP_STALE_DAYS } from '../HealthStatusService';

describe('HealthStatusService (real DB) — WP-5.3 five-state health/status screen', () => {
  let prisma: PrismaClient;
  let tempDir: string;
  const originalEnv = { ...process.env };

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hf-health-test-'));
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env = { ...originalEnv };
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function freshManifestPath(ageDays: number | null) {
    const manifestPath = path.join(tempDir, 'latest.json');
    if (ageDays !== null) {
      const timestamp = new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000).toISOString();
      fs.writeFileSync(manifestPath, JSON.stringify({ timestamp, file: 'backup-x.db', sha256: 'abc', sizeBytes: 100 }));
    }
    return manifestPath;
  }

  test('real database check succeeds against the live test DB', async () => {
    const service = new HealthStatusService(prisma, { backupManifestPath: freshManifestPath(1) });
    const db = await service.checkDatabase();
    expect(db.reachable).toBe(true);
    expect(db.latencyMs).not.toBeNull();
  });

  test('LOCAL_ONLY: onprem edition, DB healthy, no AI expected, recent backup', async () => {
    process.env.DEPLOYMENT_EDITION = 'onprem';
    process.env.AI_PROVIDER_MODE = 'none';
    const service = new HealthStatusService(prisma, { backupManifestPath: freshManifestPath(1) });
    const report = await service.getHealth();
    expect(report.state).toBe('LOCAL_ONLY');
  });

  test('ONLINE: online edition, DB healthy, no AI expected, recent backup', async () => {
    process.env.DEPLOYMENT_EDITION = 'online';
    process.env.AI_PROVIDER_MODE = 'none';
    const service = new HealthStatusService(prisma, { backupManifestPath: freshManifestPath(1) });
    const report = await service.getHealth();
    expect(report.state).toBe('ONLINE');
  });

  test('BACKUP_OVERDUE: recent-enough everything else, but backup manifest missing entirely (never backed up = overdue, not silently healthy)', async () => {
    process.env.DEPLOYMENT_EDITION = 'onprem';
    process.env.AI_PROVIDER_MODE = 'none';
    const service = new HealthStatusService(prisma, { backupManifestPath: path.join(tempDir, 'does-not-exist.json') });
    const report = await service.getHealth();
    expect(report.state).toBe('BACKUP_OVERDUE');
    expect(report.backup.manifest).toBeNull();
  });

  test('BACKUP_OVERDUE: backup manifest exists but is older than the stale-days threshold', async () => {
    process.env.DEPLOYMENT_EDITION = 'onprem';
    process.env.AI_PROVIDER_MODE = 'none';
    const service = new HealthStatusService(prisma, { backupManifestPath: freshManifestPath(DEFAULT_BACKUP_STALE_DAYS + 1) });
    const report = await service.getHealth();
    expect(report.state).toBe('BACKUP_OVERDUE');
    expect(report.backup.stale).toBe(true);
  });

  test('AI_SERVICE_UNAVAILABLE: AI expected (mode=configured) but no real provider wired, takes precedence over a stale backup', async () => {
    process.env.DEPLOYMENT_EDITION = 'online';
    process.env.AI_PROVIDER_MODE = 'configured';
    delete process.env.AI_PROVIDER_API_KEY;
    delete process.env.AI_PROVIDER_ENDPOINT;
    const service = new HealthStatusService(prisma, { backupManifestPath: path.join(tempDir, 'missing.json') });
    const report = await service.getHealth();
    expect(report.state).toBe('AI_SERVICE_UNAVAILABLE');
    expect(report.ai.expected).toBe(true);
    expect(report.ai.reachable).toBe(false);
  });

  test('DEGRADED: database unreachable takes precedence over every other check', async () => {
    process.env.DEPLOYMENT_EDITION = 'onprem';
    process.env.AI_PROVIDER_MODE = 'none';
    const brokenPrisma = new PrismaClient({ datasources: { db: { url: 'file:/nonexistent/path/does-not-exist.db' } } });
    const service = new HealthStatusService(brokenPrisma, { backupManifestPath: freshManifestPath(1) });
    const report = await service.getHealth();
    expect(report.database.reachable).toBe(false);
    expect(report.state).toBe('DEGRADED');
    await brokenPrisma.$disconnect();
  });

  test('checkAi(): mode=none is never "expected" regardless of provider env vars', () => {
    const service = new HealthStatusService(prisma);
    const result = service.checkAi({ edition: 'onprem', databaseMode: 'sqlite', aiProviderMode: 'none', authMode: 'local' });
    expect(result).toEqual({ expected: false, reachable: true });
  });

  test('checkAi(): mode=configured with a real provider env var set reports reachable', () => {
    process.env.AI_PROVIDER_API_KEY = 'test-key';
    const service = new HealthStatusService(prisma);
    const result = service.checkAi({ edition: 'online', databaseMode: 'sqlite', aiProviderMode: 'configured', authMode: 'local' });
    expect(result).toEqual({ expected: true, reachable: true });
  });
});
