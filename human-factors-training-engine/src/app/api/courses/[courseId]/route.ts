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
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    // Validate session
    const context = await getRequestContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId } = await params;

    // Get course
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: {
        learnerId: context.userId,
        courseId,
        course: { organizationId: context.organizationId },
      },
      include: { course: true },
    });
    const course = enrollment?.course;

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Get lessons for this course
    const lessons = await prisma.lesson.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        order: true,
      },
    });

    // Get first assessment (for now, use first lesson's assessment)
    let assessmentId = '';
    if (lessons.length > 0) {
      const firstLesson = await prisma.lesson.findUnique({
        where: { id: lessons[0].id },
        include: {
          assessments: {
            select: { id: true },
            take: 1,
          },
        },
      });
      if (firstLesson?.assessments[0]) {
        assessmentId = firstLesson.assessments[0].id;
      }
    }

    // Get completion status for each lesson
    const lessonsWithCompletion = await Promise.all(
      lessons.map(async (lesson) => {
        const completion = await prisma.lessonCompletion.findFirst({
          where: {
            learnerId: context.userId,
            lessonId: lesson.id,
          },
        });

        return {
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          completed: !!completion,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        version: course.version,
      },
      assessmentId,
      lessons: lessonsWithCompletion,
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
