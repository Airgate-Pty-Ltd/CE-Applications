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
import { versionStamp } from '@/lib/versionStamp';

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

    // Fetch all enrollments with learner and course info
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { course: { organizationId: context.organizationId } },
      include: {
        learner: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    // Generate CSV
    const headers = ['Learner Name', 'Email', 'Course Title', 'Status', 'Enrolled Date', 'Completed Date', 'Progress %', 'Due Date'];
    const rows = enrollments.map((e: any) => [
      e.learner.name,
      e.learner.email,
      e.course.title,
      e.status,
      new Date(e.enrolledAt).toLocaleDateString(),
      e.completedAt ? new Date(e.completedAt).toLocaleDateString() : '',
      e.progressPercent.toString(),
      e.dueDate ? new Date(e.dueDate).toLocaleDateString() : '',
    ]);

    // Create CSV content
    const csvContent = [
      `# ${versionStamp()}`,
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    // Log audit event
    await prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actor: context.userId,
        action: 'enrollments_exported',
        object: 'CourseEnrollment',
        objectId: 'bulk',
        details: JSON.stringify({
          enrollmentCount: enrollments.length,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // Return CSV file
    const fileName = `enrollments_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error exporting enrollments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
