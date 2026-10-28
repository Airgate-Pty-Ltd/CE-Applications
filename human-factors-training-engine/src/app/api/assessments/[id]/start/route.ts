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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Validate session
    const context = await getRequestContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: assessmentId } = await params;

    // Fetch assessment with questions
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        lesson: { course: { organizationId: context.organizationId } },
      },
      include: {
        lesson: {
          select: { id: true, title: true, courseId: true },
        },
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            questionText: true,
            questionType: true,
            options: true,
            points: true,
            explanation: true,
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Verify learner is enrolled in the course
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: {
        learnerId: context.userId,
        courseId: assessment.lesson.courseId,
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 },
      );
    }

    // Verify all lessons are completed (for this MVP)
    const totalLessons = await prisma.lesson.count({
      where: { courseId: assessment.lesson.courseId },
    });

    const completedLessons = await prisma.lessonCompletion.count({
      where: {
        learnerId: context.userId,
        courseId: assessment.lesson.courseId,
      },
    });

    if (completedLessons < totalLessons) {
      return NextResponse.json(
        { error: 'All lessons must be completed before taking the assessment' },
        { status: 403 },
      );
    }

    // Create assessment attempt record
    const attempt = await prisma.assessmentAttempt.create({
      data: {
        learnerId: context.userId,
        assessmentId,
      },
    });

    // Shuffle questions (but keep same order for each learner per attempt)
    const shuffledQuestions = [...assessment.questions].sort(
      () => Math.random() - 0.5,
    );

    return NextResponse.json({
      success: true,
      assessment: {
        id: assessment.id,
        title: assessment.title,
        passingScore: assessment.passingScore,
        timeLimit: assessment.timeLimit,
        questionCount: assessment.questions.length,
      },
      attemptId: attempt.id,
      questions: shuffledQuestions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        points: q.points,
      })),
    });
  } catch (error) {
    console.error('Error starting assessment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
