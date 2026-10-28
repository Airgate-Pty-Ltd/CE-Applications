/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { getRequestContext } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateScore, determinePassed } from '@/lib/scoring';
import { sendEmail, generateAssessmentPassedEmail, generateAssessmentFailedEmail } from '@/lib/email';
import { toDbArray } from '@/lib/json';
import crypto from 'node:crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Validate session
    const context = await getRequestContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { attemptId, responses } = await request.json();
    const { id: assessmentId } = await params;

    if (!attemptId || !responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: 'Missing or invalid attemptId or responses' },
        { status: 400 },
      );
    }

    // Fetch attempt
    const attempt = await prisma.assessmentAttempt.findFirst({
      where: {
        id: attemptId,
        learnerId: context.userId,
        assessmentId,
        assessment: { lesson: { course: { organizationId: context.organizationId } } },
      },
      include: {
        assessment: {
          include: {
            questions: true,
            lesson: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Assessment attempt not found' }, { status: 404 });
    }

    // Prevent duplicate submission
    if (attempt.submittedAt) {
      return NextResponse.json(
        { error: 'Assessment already submitted' },
        { status: 400 },
      );
    }

    // Calculate score
    const score = calculateScore(responses, attempt.assessment.questions as any);
    const passed = determinePassed(score, attempt.assessment.passingScore);

    // Update attempt with score and result
    const updatedAttempt = await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        submittedAt: new Date(),
        score: Math.round(score),
        passed,
        responses: toDbArray(responses),
      },
    });

    // If passed, create certificate
    let certificate = null;
    if (passed) {
      const certificateCode = crypto.randomBytes(16).toString('hex');
      certificate = await prisma.certificate.create({
        data: {
          learnerId: attempt.learnerId,
          courseId: attempt.assessment.lesson.courseId,
          assessmentAttemptId: attemptId,
          certificateCode,
        },
      });

      // Update course enrollment status to completed
      await prisma.courseEnrollment.updateMany({
        where: {
          learnerId: attempt.learnerId,
          courseId: attempt.assessment.lesson.courseId,
          course: { organizationId: context.organizationId },
        },
        data: {
          status: 'completed',
          completedAt: new Date(),
          progressPercent: 100,
        },
      });
    }

    // Load learner for email
    const learner = await prisma.user.findUnique({
      where: { id: attempt.learnerId }
    });

    let notificationDelivered: boolean | null = null;
    if (learner) {
      // Send email notification
      const emailOptions = passed
        ? generateAssessmentPassedEmail(
            learner.name || 'Learner',
            attempt.assessment.lesson.course.title,
            Math.round(score),
          )
        : generateAssessmentFailedEmail(
            learner.name || 'Learner',
            attempt.assessment.lesson.course.title,
            Math.round(score),
            attempt.assessment.passingScore,
          );

      emailOptions.to = learner.email || '';
      notificationDelivered = await sendEmail(emailOptions);
    }

    // Log audit event
    await prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actor: context.userId,
        action: 'assessment_submitted',
        object: 'Assessment',
        objectId: attempt.assessmentId,
        details: JSON.stringify({
          attemptId,
          score: Math.round(score),
          passed,
          courseId: attempt.assessment.lesson.courseId,
          notificationDelivered,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      attempt: {
        id: updatedAttempt.id,
        score: updatedAttempt.score,
        passed: updatedAttempt.passed,
      },
      certificate: certificate
        ? {
            id: certificate.id,
            certificateCode: certificate.certificateCode,
          }
        : null,
      notificationDelivered,
      message: passed
        ? 'Assessment passed! Certificate generated.'
        : 'Assessment did not meet passing score.',
    });
  } catch (error) {
    console.error('Error submitting assessment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
