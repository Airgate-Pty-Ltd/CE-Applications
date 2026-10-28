/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import crypto from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { AtomCompletionService } from '@/services/AtomCompletionService';

type FrozenQuestion = {
  questionId: string;
  atomId: string;
  questionText: string;
  questionType: string;
  options: string[];
  correctAnswers: string[];
  explanation?: string | null;
  points: number;
};

type SubmittedResponse = { questionId: string; answer: string | string[] };

function parseSnapshot(value: string): FrozenQuestion[] {
  const parsed = JSON.parse(value) as FrozenQuestion[];
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Assessment has no frozen questions.');
  return parsed;
}

function normalizedAnswers(answer: string | string[]): string[] {
  return (Array.isArray(answer) ? answer : [answer]).map(String).sort();
}

export class AssignmentAssessmentService {
  constructor(private prisma: PrismaClient) {}

  publicSnapshot(questionSnapshot: string) {
    return parseSnapshot(questionSnapshot).map(({ correctAnswers: _correctAnswers, explanation: _explanation, ...question }) => question);
  }

  async submit(params: {
    assignmentId: string;
    learnerId: string;
    tenantId: string;
    responses: SubmittedResponse[];
  }) {
    const assignment = await this.prisma.trainingAssignment.findUnique({
      where: { id: params.assignmentId },
      include: { assessment: { include: { attempts: true } }, certificate: true },
    });
    if (!assignment || assignment.learnerId !== params.learnerId || assignment.assessment?.tenantId !== params.tenantId) {
      throw new Error('ASSIGNMENT_NOT_FOUND');
    }
    if (assignment.status === 'PASSED' || assignment.certificate) throw new Error('ASSESSMENT_ALREADY_PASSED');
    const completion = await new AtomCompletionService(this.prisma).getCompletionStatus(assignment.id);
    if (!completion.readyForAssessment) throw new Error('ATOMS_INCOMPLETE');
    if (assignment.assessment.attempts.length >= assignment.assessment.maxAttempts) throw new Error('ATTEMPTS_EXHAUSTED');

    const questions = parseSnapshot(assignment.assessment.questionSnapshot);
    const responseMap = new Map(params.responses.map((response) => [response.questionId, response.answer]));
    if (responseMap.size !== questions.length || params.responses.length !== questions.length
      || params.responses.some((response) => !questions.some((question) => question.questionId === response.questionId))) {
      throw new Error('INVALID_RESPONSES');
    }

    let earnedPoints = 0;
    const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);
    for (const question of questions) {
      const submitted = normalizedAnswers(responseMap.get(question.questionId)!);
      const expected = [...question.correctAnswers].sort();
      if (JSON.stringify(submitted) === JSON.stringify(expected)) earnedPoints += question.points;
    }
    const score = Math.round((earnedPoints / totalPoints) * 100);
    const passed = score >= assignment.assessment.passingScore;
    const attemptNumber = assignment.assessment.attempts.length + 1;
    const responsesJson = JSON.stringify(params.responses);
    const integrityHash = crypto.createHash('sha256').update(JSON.stringify({
      assessmentSnapshotHash: assignment.assessment.snapshotHash,
      learnerId: params.learnerId,
      attemptNumber,
      responses: params.responses,
      score,
      passed,
    })).digest('hex');

    return this.prisma.$transaction(async (tx) => {
      const attempt = await tx.assignmentAssessmentAttempt.create({
        data: {
          assessmentId: assignment.assessment!.id,
          learnerId: params.learnerId,
          attemptNumber,
          responses: responsesJson,
          score,
          passed,
          integrityHash,
        },
      });
      await tx.trainingAssignment.update({
        where: { id: assignment.id },
        data: passed
          ? { completedAt: new Date(), passedAt: new Date(), failedAt: null, status: 'PASSED' }
          : { failedAt: new Date(), status: 'ASSESSMENT_FAILED' },
      });
      const certificate = passed ? await tx.trainingCertificate.create({
        data: {
          tenantId: params.tenantId,
          assignmentId: assignment.id,
          attemptId: attempt.id,
          learnerId: params.learnerId,
          certificateCode: `HF-${crypto.randomBytes(16).toString('hex').toUpperCase()}`,
          assessmentSnapshotHash: assignment.assessment!.snapshotHash,
        },
      }) : null;
      await tx.auditLog.create({
        data: {
          organizationId: params.tenantId,
          actor: params.learnerId,
          action: 'assignment_assessment_submitted',
          object: 'AssignmentAssessment',
          objectId: assignment.assessment!.id,
          details: JSON.stringify({ assignmentId: assignment.id, attemptId: attempt.id, attemptNumber, score, passed }),
        },
      });
      return {
        score,
        passed,
        attemptNumber,
        attemptsRemaining: assignment.assessment!.maxAttempts - attemptNumber,
        certificateCode: certificate?.certificateCode ?? null,
      };
    });
  }
}
