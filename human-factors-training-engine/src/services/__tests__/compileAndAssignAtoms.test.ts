/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { prisma } from '@/lib/db';
import { compileAndAssignAtoms } from '@/services/compileAndAssignAtoms';

describe('compile and assign assessment gate', () => {
  const tag = `compile-assessment-${Date.now()}`;
  let learnerId: string;
  let interventionId: string;
  const atomIds: string[] = [];

  beforeAll(async () => {
    learnerId = (await prisma.user.create({
      data: { email: `${tag}@example.com`, passwordHash: 'x', name: tag, role: 'learner' },
    })).id;
    await prisma.organizationMember.create({
      data: { organizationId: 'tenant_001', userId: learnerId, role: 'learner' },
    });
    interventionId = (await prisma.learningIntervention.create({
      data: {
        tenantId: 'tenant_001', title: tag, designedBy: 'test' },
    })).id;
  });

  afterAll(async () => {
    await prisma.trainingAssignment.deleteMany({ where: { learnerId } });
    await prisma.trainingPackageManifest.deleteMany({ where: { learnerId } });
    await prisma.learningIntervention.delete({ where: { id: interventionId } });
    await prisma.learningAtom.deleteMany({ where: { id: { in: atomIds } } });
    await prisma.user.delete({ where: { id: learnerId } });
  });

  test('refuses an approved atom with no approved assessment question', async () => {
    const atom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001', title: `${tag}-missing`, objective: 'x', format: 'micro_lesson', status: 'APPROVED' },
    });
    atomIds.push(atom.id);
    await expect(compileAndAssignAtoms(prisma, {
      tenantId: 'tenant_001',
      interventionId,
      learnerId,
      atoms: [atom],
      requestedBy: 'test',
    })).rejects.toThrow('assessment questions are missing');
  });

  test('freezes approved questions into the assignment assessment', async () => {
    const atom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${tag}-ready`,
        objective: 'x',
        format: 'micro_lesson',
        status: 'APPROVED',
        assessmentQuestions: {
          create: {
            tenantId: 'tenant_001',
            questionText: 'Select the controlled choice.',
            options: JSON.stringify(['Controlled', 'Uncontrolled']),
            correctAnswers: JSON.stringify(['Controlled']),
            status: 'APPROVED',
          },
        },
      },
    });
    atomIds.push(atom.id);
    const result = await compileAndAssignAtoms(prisma, {
      tenantId: 'tenant_001',
      interventionId,
      learnerId,
      atoms: [atom],
      requestedBy: 'test',
    });
    expect(result.queued).toBe(false);
    if (result.queued) throw new Error('Unexpected burden-budget queue.');
    const assessment = await prisma.assignmentAssessment.findUniqueOrThrow({
      where: { assignmentId: result.assignmentId },
    });
    expect(JSON.parse(assessment.questionSnapshot)).toHaveLength(1);
    expect(assessment.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
