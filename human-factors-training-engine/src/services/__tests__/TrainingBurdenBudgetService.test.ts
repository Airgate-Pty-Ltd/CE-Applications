/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';
import { TrainingBurdenBudgetService, DEFAULT_BUDGET_MINUTES, DEFAULT_WINDOW_DAYS } from '../TrainingBurdenBudgetService';

describe('TrainingBurdenBudgetService (real DB) — WP-4 product core increment', () => {
  let prisma: PrismaClient;
  let service: TrainingBurdenBudgetService;
  const testTag = `burden-test-${Date.now()}`;
  const tenantId = 'tenant_001';

  let learnerId: string;
  let existingAtomId: string;
  let incomingAtomId: string;
  let interventionId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    service = new TrainingBurdenBudgetService(prisma);

    const learner = await prisma.user.create({
      data: { email: `${testTag}@example.com`, passwordHash: 'x', name: 'Burden Test Learner', role: 'learner' },
    });
    learnerId = learner.id;

    const existingAtom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001', title: `${testTag}-existing`, objective: 'x', format: 'micro_lesson', status: 'APPROVED', duration: 200 },
    });
    existingAtomId = existingAtom.id;

    const incomingAtom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001', title: `${testTag}-incoming`, objective: 'x', format: 'micro_lesson', status: 'APPROVED', duration: 100 },
    });
    incomingAtomId = incomingAtom.id;

    const evidence = await prisma.hfEvidence.create({
      data: { tenantId, classification: 'INTERNAL', source: `${testTag}-src`, sourceType: 'ncr', title: `${testTag}-evidence`, occurredAt: new Date(), createdBy: 'system' },
    });
    const event = await prisma.hfEvent.create({
      data: { tenantId, evidenceId: evidence.id, title: `${testTag}-event`, occurredAt: new Date() },
    });
    const intervention = await prisma.learningIntervention.create({
      data: {
        tenantId: 'tenant_001', eventId: event.id, title: `${testTag}-intervention`, atomIds: JSON.stringify([existingAtomId]), designedBy: 'system' },
    });
    interventionId = intervention.id;

    const manifest = await prisma.trainingPackageManifest.create({
      data: {
        tenantId: 'tenant_001',
        packageId: `${testTag}-pkg`,
        curriculumRevision: '1.0',
        compilerVersion: '1.0.0',
        rulesetRevision: '1.0',
        baselineContent: JSON.stringify([{ atomId: existingAtomId }]),
        outputHash: `${testTag}-hash`,
        status: 'ACTIVE',
      },
    });

    // Existing assignment: 200 minutes, assigned "now" (inside any reasonable window).
    await prisma.trainingAssignment.create({
      data: {
        tenantId: 'tenant_001', learnerId, interventionId, manifestId: manifest.id, status: 'ASSIGNED' },
    });
  });

  afterAll(async () => {
    await prisma.maiApproval.deleteMany({ where: { subjectId: { contains: learnerId } } });
    await prisma.trainingAssignment.deleteMany({ where: { learnerId } });
    await prisma.learningIntervention.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.hfEvent.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.hfEvidence.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.learningAtom.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.user.delete({ where: { id: learnerId } });
    await prisma.$disconnect();
  });

  test('computeLearnerBurden() sums real assigned-atom durations within the window', async () => {
    const minutes = await service.computeLearnerBurden(learnerId, DEFAULT_WINDOW_DAYS);
    expect(minutes).toBe(200);
  });

  test('checkBudget(): 200 existing + 100 incoming = 300 > 240 default cap -> NOT within budget', async () => {
    const result = await service.checkBudget(learnerId, 100);
    expect(result.currentMinutes).toBe(200);
    expect(result.projectedMinutes).toBe(300);
    expect(result.capMinutes).toBe(DEFAULT_BUDGET_MINUTES);
    expect(result.withinBudget).toBe(false);
  });

  test('checkBudget(): 200 existing + 30 incoming = 230 <= 240 default cap -> within budget', async () => {
    const result = await service.checkBudget(learnerId, 30);
    expect(result.projectedMinutes).toBe(230);
    expect(result.withinBudget).toBe(true);
  });

  test('over-budget request queues a real PENDING disposition, not a silent assignment', async () => {
    const check = await service.checkBudget(learnerId, 100);
    const dispositionId = await service.queueDisposition({
      tenantId,
      learnerId,
      interventionId,
      check,
      requestedBy: 'qm-test',
    });

    const pending = await service.getPendingDispositions(tenantId);
    const found = pending.find((d) => d.id === dispositionId);
    expect(found).toBeDefined();
    expect(found!.decision).toBe('PENDING');
    expect(found!.projectedMinutes).toBe(300);
    expect(found!.capMinutes).toBe(240);

    const hasOverride = await service.hasApprovedOverride(learnerId, interventionId);
    expect(hasOverride).toBe(false);
  });

  test('resolving a disposition as APPROVED persists the decision and unblocks hasApprovedOverride()', async () => {
    const check = await service.checkBudget(learnerId, 100);
    const dispositionId = await service.queueDisposition({
      tenantId,
      learnerId,
      interventionId,
      check,
      requestedBy: 'qm-test-2',
    });

    await service.resolveDisposition(dispositionId, 'APPROVED', 'qm-approver', 'Approved: critical safety refresher.');

    const hasOverride = await service.hasApprovedOverride(learnerId, interventionId);
    expect(hasOverride).toBe(true);

    const pending = await service.getPendingDispositions(tenantId);
    expect(pending.find((d) => d.id === dispositionId)).toBeUndefined();
  });
});
