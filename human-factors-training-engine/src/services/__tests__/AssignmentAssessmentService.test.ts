/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import crypto from 'node:crypto';
import { prisma } from '@/lib/db';
import { AssignmentAssessmentService } from '@/services/AssignmentAssessmentService';

describe('scored assignment assessment and controlled certificate', () => {
  const tag = `assignment-assessment-${Date.now()}`;
  let learnerId: string;
  let atomId: string;
  let interventionId: string;
  let manifestId: string;
  let assignmentId: string;
  const questionId = `${tag}-question`;
  const snapshot = JSON.stringify([{
    questionId,
    atomId: 'set-during-setup',
    questionText: 'Which response is controlled?',
    questionType: 'multiChoice',
    options: ['The approved response', 'Any response'],
    correctAnswers: ['The approved response'],
    explanation: 'Only the approved response is controlled.',
    points: 1,
  }]);

  beforeAll(async () => {
    const learner = await prisma.user.create({
      data: { email: `${tag}@example.com`, passwordHash: 'x', name: tag, role: 'learner' },
    });
    learnerId = learner.id;
    const atom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001', title: tag, objective: tag, format: 'micro_lesson', status: 'APPROVED' },
    });
    atomId = atom.id;
    const intervention = await prisma.learningIntervention.create({
      data: {
        tenantId: 'tenant_001', title: tag, designedBy: 'test' },
    });
    interventionId = intervention.id;
    const manifest = await prisma.trainingPackageManifest.create({
      data: {
        tenantId: 'tenant_001',
        packageId: tag,
        curriculumRevision: tag,
        compilerVersion: 'test',
        rulesetRevision: 'test',
        baselineContent: JSON.stringify([{ atomId, atomTitle: tag }]),
        outputHash: crypto.createHash('sha256').update(tag).digest('hex'),
      },
    });
    manifestId = manifest.id;
    const resolvedSnapshot = snapshot.replace('set-during-setup', atomId);
    const assignment = await prisma.trainingAssignment.create({
      data: {
        tenantId: 'tenant_001',
        learnerId,
        interventionId,
        manifestId,
        assessment: {
          create: {
            tenantId: 'tenant_001',
            passingScore: 80,
            maxAttempts: 3,
            questionSnapshot: resolvedSnapshot,
            snapshotHash: crypto.createHash('sha256').update(resolvedSnapshot).digest('hex'),
          },
        },
      },
    });
    assignmentId = assignment.id;
    await prisma.atomCompletion.create({ data: { assignmentId, atomId } });
  });

  afterAll(async () => {
    await prisma.trainingCertificate.deleteMany({ where: { learnerId } });
    await prisma.trainingAssignment.delete({ where: { id: assignmentId } });
    await prisma.trainingPackageManifest.delete({ where: { id: manifestId } });
    await prisma.learningIntervention.delete({ where: { id: interventionId } });
    await prisma.learningAtom.delete({ where: { id: atomId } });
    await prisma.user.delete({ where: { id: learnerId } });
  });

  test('scores a failure without a certificate, then issues one only after a real pass', async () => {
    const service = new AssignmentAssessmentService(prisma);
    const failed = await service.submit({
      assignmentId,
      learnerId,
      tenantId: 'tenant_001',
      responses: [{ questionId, answer: 'Any response' }],
    });
    expect(failed).toMatchObject({ score: 0, passed: false, attemptNumber: 1, certificateCode: null });
    await expect(prisma.trainingCertificate.findUnique({ where: { assignmentId } })).resolves.toBeNull();

    const passed = await service.submit({
      assignmentId,
      learnerId,
      tenantId: 'tenant_001',
      responses: [{ questionId, answer: 'The approved response' }],
    });
    expect(passed.score).toBe(100);
    expect(passed.passed).toBe(true);
    expect(passed.certificateCode).toMatch(/^HF-[A-F0-9]{32}$/);

    const assignment = await prisma.trainingAssignment.findUniqueOrThrow({ where: { id: assignmentId } });
    expect(assignment.status).toBe('PASSED');
    expect(assignment.passedAt).not.toBeNull();
  });
});
