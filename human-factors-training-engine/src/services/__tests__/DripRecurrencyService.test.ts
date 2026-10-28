/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';
import { DripRecurrencyService, CADENCE_DAYS } from '../DripRecurrencyService';

describe('DripRecurrencyService (real DB) — WP-4.4 shift-brief cadence atoms', () => {
  let prisma: PrismaClient;
  let service: DripRecurrencyService;
  const testTag = `drip-test-${Date.now()}`;

  let learnerId: string;
  let assignmentId: string;
  let dripAtomId: string;
  let oneTimeAtomId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    service = new DripRecurrencyService(prisma);

    const learner = await prisma.user.create({
      data: { email: `${testTag}@example.com`, passwordHash: 'x', name: 'Drip Test Learner', role: 'learner' },
    });
    learnerId = learner.id;

    const dripAtom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001', title: `${testTag}-shift-brief`, objective: 'x', format: 'reminder', status: 'APPROVED', duration: 3, recurrenceRule: 'WEEKLY' },
    });
    dripAtomId = dripAtom.id;

    const oneTimeAtom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001', title: `${testTag}-once`, objective: 'x', format: 'micro_lesson', status: 'APPROVED', duration: 15 },
    });
    oneTimeAtomId = oneTimeAtom.id;

    const evidence = await prisma.hfEvidence.create({
      data: { tenantId: 'tenant_001', classification: 'INTERNAL', source: `${testTag}-src`, sourceType: 'ncr', title: `${testTag}-evidence`, occurredAt: new Date(), createdBy: 'system' },
    });
    const event = await prisma.hfEvent.create({
      data: { tenantId: 'tenant_001', evidenceId: evidence.id, title: `${testTag}-event`, occurredAt: new Date() },
    });
    const intervention = await prisma.learningIntervention.create({
      data: {
        tenantId: 'tenant_001', eventId: event.id, title: `${testTag}-intervention`, atomIds: JSON.stringify([dripAtomId, oneTimeAtomId]), designedBy: 'system' },
    });
    const manifest = await prisma.trainingPackageManifest.create({
      data: {
        tenantId: 'tenant_001',
        packageId: `${testTag}-pkg`,
        curriculumRevision: '1.0',
        compilerVersion: '1.0.0',
        rulesetRevision: '1.0',
        baselineContent: JSON.stringify([{ atomId: dripAtomId }, { atomId: oneTimeAtomId }]),
        outputHash: `${testTag}-hash`,
        status: 'ACTIVE',
      },
    });
    const assignment = await prisma.trainingAssignment.create({
      data: {
        tenantId: 'tenant_001', learnerId, interventionId: intervention.id, manifestId: manifest.id, status: 'ASSIGNED' },
    });
    assignmentId = assignment.id;
  });

  afterAll(async () => {
    await prisma.dripDelivery.deleteMany({ where: { assignmentId } });
    await prisma.trainingAssignment.deleteMany({ where: { id: assignmentId } });
    await prisma.learningAtom.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.learningIntervention.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.hfEvent.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.hfEvidence.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.user.delete({ where: { id: learnerId } });
    await prisma.$disconnect();
  });

  test('isDripAtom() distinguishes recurring atoms from one-time atoms by recurrenceRule', () => {
    expect(service.isDripAtom('WEEKLY')).toBe(true);
    expect(service.isDripAtom(null)).toBe(false);
    expect(service.isDripAtom(undefined)).toBe(false);
    expect(service.isDripAtom('NOT_A_REAL_CADENCE')).toBe(false);
  });

  test('a drip atom never delivered is due immediately; a one-time atom never appears in due list', async () => {
    const due = await service.getDueDripDeliveries(learnerId);
    expect(due).toHaveLength(1);
    expect(due[0].atomId).toBe(dripAtomId);
    expect(due[0].lastDeliveredAt).toBeNull();
    expect(due[0].isDue).toBe(true);
  });

  test('recording a real delivery today makes the atom NOT due until the cadence window elapses', async () => {
    await service.recordDelivery(assignmentId, dripAtomId);
    const due = await service.getDueDripDeliveries(learnerId);
    const item = due.find((d) => d.atomId === dripAtomId);
    expect(item).toBeDefined();
    expect(item!.lastDeliveredAt).not.toBeNull();
    expect(item!.isDue).toBe(false);
  });

  test('computeNextDueAt() adds the correct cadence-day offset', () => {
    const deliveredAt = new Date('2026-01-01T00:00:00.000Z');
    const next = service.computeNextDueAt('WEEKLY', deliveredAt);
    expect(next.getTime() - deliveredAt.getTime()).toBe(CADENCE_DAYS.WEEKLY * 24 * 60 * 60 * 1000);
  });

  test('a delivery from 8 days ago (past the 7-day WEEKLY window) is due again — checked with a real "now" 8 days later', async () => {
    const lastDelivered = await service.getLastDelivery(assignmentId, dripAtomId);
    const eightDaysLater = new Date(lastDelivered!.getTime() + 8 * 24 * 60 * 60 * 1000);
    const due = await service.getDueDripDeliveries(learnerId, eightDaysLater);
    const item = due.find((d) => d.atomId === dripAtomId);
    expect(item!.isDue).toBe(true);
  });

  test('multiple deliveries create multiple real DripDelivery rows (repeatable, unlike AtomCompletion)', async () => {
    const before = await prisma.dripDelivery.count({ where: { assignmentId, atomId: dripAtomId } });
    await service.recordDelivery(assignmentId, dripAtomId);
    const after = await prisma.dripDelivery.count({ where: { assignmentId, atomId: dripAtomId } });
    expect(after).toBe(before + 1);
  });
});
