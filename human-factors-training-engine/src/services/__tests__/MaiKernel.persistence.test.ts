/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { MaiKernel } from '../MaiKernel';

describe('MaiKernel persisted snapshot integrity', () => {
  const prisma = new PrismaClient();
  const tenantId = `kernel-persistence-${crypto.randomUUID()}`;
  const rule = {
    id: 'TEST-ALWAYS',
    name: 'Event identifier exists',
    conditions: [{ field: 'eventId', op: 'not_null' }],
    actions: [{ operator: 'surface_system_condition', severity: 'INFO', rationale: 'test' }],
    severity: 'INFO',
    approvedBy: 'test',
    approvedAt: new Date().toISOString(),
  };

  afterAll(async () => {
    await prisma.maiSystemCondition.deleteMany({ where: { tenantId } });
    await prisma.maiErrorLog.deleteMany({ where: { tenantId } });
    await prisma.maiEvent.deleteMany({ where: { tenantId } });
    await prisma.maiRuleManifest.deleteMany({ where: { tenantId } });
    await prisma.$disconnect();
  });

  test('uses a canonical content hash and permits deliberate re-evaluation under a new manifest', async () => {
    const firstManifest = await prisma.maiRuleManifest.create({
      data: { tenantId, version: 1, status: 'PUBLISHED', rules: JSON.stringify([rule]), createdBy: 'test' },
    });
    const secondManifest = await prisma.maiRuleManifest.create({
      data: { tenantId, version: 2, status: 'PUBLISHED', rules: JSON.stringify([rule]), createdBy: 'test' },
    });
    const kernel = new MaiKernel(prisma);
    const firstOrder = { eventId: 'event-1', themes: ['fatigue'], rolesExposed: ['maintainer'], timestamp: '2026-08-14T00:00:00.000Z', nested: { b: 2, a: 1 } };
    const differentPropertyOrder = { nested: { a: 1, b: 2 }, timestamp: '2026-08-14T00:00:00.000Z', rolesExposed: ['maintainer'], themes: ['fatigue'], eventId: 'event-1' };

    await expect(kernel.processEvent(tenantId, firstManifest.id, firstOrder)).resolves.toHaveLength(1);
    await expect(kernel.processEvent(tenantId, firstManifest.id, differentPropertyOrder)).resolves.toHaveLength(1);
    expect(await prisma.maiEvent.count({ where: { tenantId, ruleManifestId: firstManifest.id } })).toBe(1);

    await expect(kernel.processEvent(tenantId, secondManifest.id, differentPropertyOrder)).resolves.toHaveLength(1);
    const events = await prisma.maiEvent.findMany({ where: { tenantId }, orderBy: { processedAt: 'asc' } });
    const conditions = await prisma.maiSystemCondition.findMany({ where: { tenantId } });
    expect(events).toHaveLength(2);
    expect(conditions).toHaveLength(2);
    expect(new Set(events.map((event) => event.snapshotHash)).size).toBe(1);
    expect(events[0].snapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(new Set(events.map((event) => event.ruleManifestId))).toEqual(new Set([firstManifest.id, secondManifest.id]));
    expect(conditions.every((condition) => condition.snapshotHash === events[0].snapshotHash)).toBe(true);
    expect(JSON.parse(conditions[0].snapshotJson)).toMatchObject({ eventId: 'event-1', data_confidence: 'high' });
  });
});
