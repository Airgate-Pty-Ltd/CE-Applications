/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient, LearningAtom } from '@prisma/client';
import crypto from 'node:crypto';
import { CurriculumCompiler } from './CurriculumCompiler';
import { TrainingBurdenBudgetService } from './TrainingBurdenBudgetService';
import { fromDbArray } from '@/lib/json';

/**
 * D-067: distribution logic extracted from POST /api/atoms/compile-and-assign so that route
 * and LessonAutoImplementationService (autonomous distribution under an Authority Profile)
 * don't duplicate it. Behavior is byte-identical to what the route did inline before this
 * extraction - same budget check, same compiler call, same manifest/assignment persistence,
 * same DRAFT->PUBLISHED intervention transition. Historical frozen manifests are never
 * touched by this function; every call produces a new manifest.
 */
export interface CompileAndAssignParams {
  tenantId: string;
  interventionId: string;
  learnerId: string;
  atoms: LearningAtom[];
  requestedBy: string;
  dueDate?: Date;
}

export type CompileAndAssignResult =
  | { queued: true; dispositionId: string; reason: string }
  | { queued: false; assignmentId: string; manifestId: string; outputHash: string };

export async function compileAndAssignAtoms(
  prisma: PrismaClient,
  params: CompileAndAssignParams
): Promise<CompileAndAssignResult> {
  const intervention = await prisma.learningIntervention.findFirstOrThrow({
    where: { id: params.interventionId, tenantId: params.tenantId },
  });
  const learner = await prisma.user.findUniqueOrThrow({ where: { id: params.learnerId } });
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: params.tenantId,
        userId: params.learnerId,
      },
    },
  });
  if (!membership?.isActive) {
    throw new Error('Cannot assign training across organization boundaries.');
  }
  if (params.atoms.some((atom) => atom.tenantId !== params.tenantId)) {
    throw new Error('Cannot compile atoms from another organization.');
  }

  // WP-4.3: Training Burden Budget. Do not silently over-assign - queue a human disposition
  // instead of compiling if this would push the learner over the rolling-window cap and no
  // prior approved override exists for this exact learner+intervention pair.
  const budgetService = new TrainingBurdenBudgetService(prisma);
  const incomingMinutes = params.atoms.reduce((sum, a) => sum + (a.duration || 0), 0);
  const budgetCheck = await budgetService.checkBudget(params.learnerId, incomingMinutes);
  if (!budgetCheck.withinBudget) {
    const hasOverride = await budgetService.hasApprovedOverride(params.learnerId, params.interventionId);
    if (!hasOverride) {
      const dispositionId = await budgetService.queueDisposition({
        tenantId: params.tenantId,
        learnerId: params.learnerId,
        interventionId: params.interventionId,
        check: budgetCheck,
        requestedBy: params.requestedBy,
      });
      return {
        queued: true,
        dispositionId,
        reason: `Assigning this intervention would put ${learner.name || params.learnerId} at ${budgetCheck.projectedMinutes} minutes over the last ${budgetCheck.windowDays} days, over the ${budgetCheck.capMinutes}-minute cap. Queued for disposition — see Burden Budget.`,
      };
    }
  }

  const compiler = new CurriculumCompiler(prisma);
  const { manifest, output_hash } = await compiler.compile({
    tenantId: params.tenantId,
    approvedAtoms: params.atoms,
    learnerAttributes: { learnerId: params.learnerId, role: learner.role, site: 'Brisbane', first_time: true },
    curriculumRevision: `${intervention.title}-${Date.now()}`,
  });

  const questionRows = await prisma.atomAssessmentQuestion.findMany({
    where: {
      tenantId: params.tenantId,
      atomId: { in: params.atoms.map((atom) => atom.id) },
      status: 'APPROVED',
    },
    orderBy: [{ atomId: 'asc' }, { createdAt: 'asc' }],
  });
  const atomsWithoutQuestions = params.atoms.filter(
    (atom) => !questionRows.some((question) => question.atomId === atom.id),
  );
  if (atomsWithoutQuestions.length > 0) {
    throw new Error(`Cannot assign training: approved assessment questions are missing for ${atomsWithoutQuestions.map((atom) => atom.title).join(', ')}.`);
  }

  const questionSnapshot = questionRows.map((question) => {
    const options = fromDbArray<string>(question.options);
    const correctAnswers = fromDbArray<string>(question.correctAnswers);
    if (options.length < 2 || correctAnswers.length === 0 || correctAnswers.some((answer) => !options.includes(answer))) {
      throw new Error(`Assessment question ${question.id} has an invalid answer key.`);
    }
    const randomizedOptions = [...options].sort((left, right) => {
      const leftHash = crypto.createHash('sha256').update(`${output_hash}:${question.id}:${left}`).digest('hex');
      const rightHash = crypto.createHash('sha256').update(`${output_hash}:${question.id}:${right}`).digest('hex');
      return leftHash.localeCompare(rightHash);
    });
    return {
      questionId: question.id,
      atomId: question.atomId,
      questionText: question.questionText,
      questionType: question.questionType,
      options: randomizedOptions,
      correctAnswers,
      explanation: question.explanation,
      points: question.points,
    };
  });
  const questionSnapshotJson = JSON.stringify(questionSnapshot);
  const questionSnapshotHash = crypto.createHash('sha256').update(questionSnapshotJson).digest('hex');

  const { persistedManifest, assignment } = await prisma.$transaction(async (tx) => {
    const persistedManifest = await tx.trainingPackageManifest.create({
      data: {
        tenantId: params.tenantId,
        packageId: `${params.interventionId}-${params.learnerId}`,
        curriculumRevision: manifest.curriculum_revision,
        compilerVersion: '1.1.0',
        rulesetRevision: '1.0',
        learnerId: params.learnerId,
        learnerRole: learner.role,
        baselineContent: JSON.stringify(manifest.baseline_content),
        recurrentContent: JSON.stringify(manifest.recurrent_content),
        sourceTraceability: JSON.stringify(manifest.source_traceability),
        questionSelectionLog: JSON.stringify({ questionIds: questionSnapshot.map((question) => question.questionId), snapshotHash: questionSnapshotHash }),
        outputHash: output_hash,
        status: 'ACTIVE',
        frozenAt: new Date(),
      },
    });

    const assignment = await tx.trainingAssignment.create({
      data: {
        tenantId: params.tenantId,
        learnerId: params.learnerId,
        interventionId: params.interventionId,
        manifestId: persistedManifest.id,
        status: 'ASSIGNED',
        dueDate: params.dueDate,
        assessment: {
          create: {
            tenantId: params.tenantId,
            passingScore: 80,
            maxAttempts: 3,
            questionSnapshot: questionSnapshotJson,
            snapshotHash: questionSnapshotHash,
          },
        },
      },
    });

    if (intervention.status === 'DRAFT') {
      await tx.learningIntervention.update({
        where: { id: params.interventionId },
        data: { status: 'PUBLISHED', publishedBy: params.requestedBy, publishedAt: new Date() },
      });
    }
    return { persistedManifest, assignment };
  });

  return { queued: false, assignmentId: assignment.id, manifestId: persistedManifest.id, outputHash: output_hash };
}
