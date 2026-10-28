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
import { sendEmail, generateOverdueReminderEmail } from '@/lib/email';

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

    // Find overdue enrollments
    const now = new Date();
    const overdueEnrollments = await prisma.courseEnrollment.findMany({
      where: {
        dueDate: {
          lt: now, // Due date is in the past
        },
        status: {
          not: 'completed', // But not completed
        },
        course: { organizationId: context.organizationId },
      },
      include: {
        learner: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
    });

    // Send emails to overdue learners
    const sentEmails = [];
    const failedEmails = [];
    for (const enrollment of overdueEnrollments) {
      if (!enrollment.dueDate) continue;
      const daysOverdue = Math.floor(
        (now.getTime() - enrollment.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const emailOptions = generateOverdueReminderEmail(
        enrollment.learner.name,
        enrollment.course.title,
        daysOverdue,
      );
      emailOptions.to = enrollment.learner.email;

      const delivered = await sendEmail(emailOptions);
      if (!delivered) {
        failedEmails.push({ learnerEmail: enrollment.learner.email, courseTitle: enrollment.course.title });
        continue;
      }
      sentEmails.push({
        learnerEmail: enrollment.learner.email,
        courseTitle: enrollment.course.title,
        daysOverdue,
      });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          organizationId: context.organizationId,
          actor: context.userId,
          action: 'overdue_reminder_sent',
          object: 'CourseEnrollment',
          objectId: enrollment.id,
          details: JSON.stringify({
            learnerId: enrollment.learnerId,
            courseId: enrollment.courseId,
            daysOverdue,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      remindersSent: sentEmails.length,
      remindersFailed: failedEmails.length,
      emails: sentEmails,
      failures: failedEmails,
      message: `Delivered ${sentEmails.length} overdue reminders; ${failedEmails.length} failed`,
    });
  } catch (error) {
    console.error('Error sending overdue reminders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
