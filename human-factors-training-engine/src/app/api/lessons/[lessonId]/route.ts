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
  { params }: { params: Promise<{ lessonId: string }> },
) {
  try {
    // Validate session
    const context = await getRequestContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonId } = await params;

    // Get lesson
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, course: { organizationId: context.organizationId } },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: { learnerId: context.userId, courseId: lesson.courseId },
    });
    if (!enrollment) return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });

    // Check if lesson is completed by learner
    const completion = await prisma.lessonCompletion.findFirst({
      where: {
        learnerId: context.userId,
        lessonId,
      },
    });

    return NextResponse.json({
      success: true,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        content: lesson.content,
        completed: !!completion,
        courseId: lesson.courseId,
        courseName: lesson.course.title,
      },
    });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  try {
    // Validate session
    const context = await getRequestContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonId } = await params;

    // Get lesson
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, course: { organizationId: context.organizationId } },
      select: {
        courseId: true,
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Check if already completed
    const existing = await prisma.lessonCompletion.findFirst({
      where: {
        learnerId: context.userId,
        lessonId,
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Lesson already marked complete',
      });
    }

    // Get enrollment
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: {
        learnerId: context.userId,
        courseId: lesson.courseId,
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 },
      );
    }

    // Mark lesson complete
    await prisma.lessonCompletion.create({
      data: {
        learnerId: context.userId,
        lessonId,
        courseId: lesson.courseId,
        enrollmentId: enrollment.id,
      },
    });

    // Update enrollment progress
    const totalLessons = await prisma.lesson.count({
      where: { courseId: lesson.courseId },
    });

    const completedLessons = await prisma.lessonCompletion.count({
      where: {
        learnerId: context.userId,
        courseId: lesson.courseId,
      },
    });

    const progressPercent = Math.round((completedLessons / totalLessons) * 100);

    await prisma.courseEnrollment.update({
      where: { id: enrollment.id },
      data: {
        progressPercent,
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actor: context.userId,
        action: 'lesson_completed',
        object: 'Lesson',
        objectId: lessonId,
        details: JSON.stringify({
          courseId: lesson.courseId,
          progressPercent,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Lesson marked complete',
      progressPercent,
    });
  } catch (error) {
    console.error('Error marking lesson complete:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
