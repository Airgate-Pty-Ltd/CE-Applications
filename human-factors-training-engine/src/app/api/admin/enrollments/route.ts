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
import { sendEmail, generateEnrollmentEmail } from '@/lib/email';

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

    // Fetch all enrollments with learner and course info
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { course: { organizationId: context.organizationId } },
      include: {
        learner: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      enrollments: enrollments.map((e) => ({
        id: e.id,
        learnerName: e.learner.name,
        learnerEmail: e.learner.email,
        courseTitle: e.course.title,
        status: e.status,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
        progressPercent: e.progressPercent,
        dueDate: e.dueDate,
      })),
    });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    if (context.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { learnerId, courseId, dueDate } = await request.json();

    if (!learnerId || !courseId) {
      return NextResponse.json(
        { error: 'Missing learnerId or courseId' },
        { status: 400 },
      );
    }

    // Verify learner and course exist
    const [learnerMembership, course] = await Promise.all([
      prisma.organizationMember.findFirst({
        where: { organizationId: context.organizationId, userId: learnerId, isActive: true },
        include: { user: true },
      }),
      prisma.course.findFirst({ where: { id: courseId, organizationId: context.organizationId } }),
    ]);

    if (!learnerMembership || !course) {
      return NextResponse.json(
        { error: 'Learner or course not found' },
        { status: 404 },
      );
    }

    // Check for existing enrollment
    const existing = await prisma.courseEnrollment.findFirst({
      where: { learnerId, courseId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Learner already enrolled in this course' },
        { status: 409 },
      );
    }

    // Create enrollment
    const enrollment = await prisma.courseEnrollment.create({
      data: {
        learnerId,
        courseId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        learner: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
    });

    // Send enrollment email
    const emailOptions = generateEnrollmentEmail(
      enrollment.learner.name,
      enrollment.course.title,
      dueDate ? new Date(dueDate).toLocaleDateString() : undefined,
    );
    emailOptions.to = enrollment.learner.email;
    const notificationDelivered = await sendEmail(emailOptions);

    // Log audit event
    await prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actor: context.userId,
        action: 'enrollment_created',
        object: 'CourseEnrollment',
        objectId: enrollment.id,
        details: JSON.stringify({
          learnerId,
          courseId,
          dueDate: dueDate || null,
          notificationDelivered,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      enrollment: {
        id: enrollment.id,
        learnerName: enrollment.learner.name,
        courseTitle: enrollment.course.title,
        status: 'in-progress',
        notificationDelivered,
      },
    });
  } catch (error) {
    console.error('Error creating enrollment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
