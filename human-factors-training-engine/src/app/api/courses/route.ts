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
    // Get session from cookie
    const context = await getRequestContext(request);

    if (!context) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Get user from session ID (session cookie contains user ID)
    const user = context.user;

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    // Get user's course enrollments
    const enrollments = await prisma.courseEnrollment.findMany({
      where: {
        learnerId: user.id,
        course: { organizationId: context.organizationId },
      },
      include: {
        course: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });

    // Format response
    const courses = enrollments.map((enrollment) => ({
      id: enrollment.course.id,
      title: enrollment.course.title,
      description: enrollment.course.description,
      progressPercent: enrollment.progressPercent,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      dueDate: enrollment.dueDate,
    }));

    return NextResponse.json({
      success: true,
      userName: user.name,
      courses,
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
