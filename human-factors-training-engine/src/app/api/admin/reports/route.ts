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

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    if (context.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get completion stats
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { course: { organizationId: context.organizationId } },
      include: {
        learner: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
    });

    const attempts = await prisma.assessmentAttempt.findMany({
      where: { assessment: { lesson: { course: { organizationId: context.organizationId } } } },
      include: {
        assessment: {
          include: {
            lesson: { select: { course: { select: { id: true } } } },
          },
        },
      },
    });

    // Calculate metrics
    const totalEnrollments = enrollments.length;
    const completedEnrollments = enrollments.filter((e) => e.status === 'completed').length;
    const completionPercent =
      totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

    // Calculate average score
    const passedAttempts = attempts.filter((a) => a.passed);
    const avgScore =
      attempts.length > 0
        ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length)
        : 0;

    // Get overdue learners
    const now = new Date();
    const overdueEnrollments = enrollments.filter(
      (e) => e.dueDate && e.dueDate < now && e.status !== 'completed',
    );

    // Course-specific stats
    const courseStats = await Promise.all(
      Array.from(new Set(enrollments.map((e) => e.courseId))).map(async (courseId) => {
        const courseEnrollments = enrollments.filter((e) => e.courseId === courseId);
        const completedCount = courseEnrollments.filter((e) => e.status === 'completed').length;
        const course = courseEnrollments[0]?.course;

        return {
          courseTitle: course?.title,
          totalLearners: courseEnrollments.length,
          completedLearners: completedCount,
          completionPercent: Math.round((completedCount / courseEnrollments.length) * 100),
        };
      }),
    );

    // Learner-specific stats
    const learnerStats = Array.from(new Set(enrollments.map((e) => e.learnerId))).map(
      (learnerId) => {
        const learnerEnrollments = enrollments.filter((e) => e.learnerId === learnerId);
        const learnerAttempts = attempts.filter((a) => a.learnerId === learnerId);
        const completedCourses = learnerEnrollments.filter((e) => e.status === 'completed').length;
        const avgAttemptScore =
          learnerAttempts.length > 0
            ? Math.round(learnerAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / learnerAttempts.length)
            : 0;

        return {
          learnerName: learnerEnrollments[0]?.learner.name,
          learnerEmail: learnerEnrollments[0]?.learner.email,
          enrolledCourses: learnerEnrollments.length,
          completedCourses,
          progressPercent: Math.round((completedCourses / learnerEnrollments.length) * 100),
          avgScore: avgAttemptScore,
          passedAssessments: learnerAttempts.filter((a) => a.passed).length,
        };
      },
    );

    return NextResponse.json({
      success: true,
      summary: {
        totalEnrollments,
        completedEnrollments,
        completionPercent,
        averageScore: avgScore,
        passedAssessments: passedAttempts.length,
        totalAssessmentAttempts: attempts.length,
        overdueCount: overdueEnrollments.length,
      },
      courseStats,
      learnerStats: learnerStats.sort((a, b) => (b.progressPercent || 0) - (a.progressPercent || 0)),
      overdueEnrollments: overdueEnrollments.map((e) => ({
        learnerName: e.learner.name,
        learnerEmail: e.learner.email,
        courseTitle: e.course.title,
        dueDate: e.dueDate,
        progressPercent: e.progressPercent,
      })),
    });
  } catch (error) {
    console.error('Error generating reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
