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

    const { id: attemptId } = await params;

    // Fetch attempt with related data
    const attempt = await prisma.assessmentAttempt.findFirst({
      where: {
        id: attemptId,
        learnerId: context.userId,
        assessment: { lesson: { course: { organizationId: context.organizationId } } },
      },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            passingScore: true,
            lesson: {
              select: {
                course: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
        certificate: {
          select: {
            id: true,
            certificateCode: true,
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        score: attempt.score,
        passed: attempt.passed,
        submittedAt: attempt.submittedAt,
        assessment: {
          title: attempt.assessment.title,
          passingScore: attempt.assessment.passingScore,
        },
        course: {
          title: attempt.assessment.lesson.course.title,
        },
        certificate: attempt.certificate,
      },
    });
  } catch (error) {
    console.error('Error fetching attempt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
