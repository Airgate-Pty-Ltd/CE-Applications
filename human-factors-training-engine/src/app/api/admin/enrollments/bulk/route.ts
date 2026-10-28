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
import { validateEmail } from '@/lib/auth';
import { parseCsv } from '@/lib/csv';

interface CSVRow {
  email?: string;
  courseTitle?: string;
  dueDate?: string;
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

    const body = await request.json();
    const { csvData } = body; // CSV data as string

    if (!csvData) {
      return NextResponse.json({ error: 'Missing csvData' }, { status: 400 });
    }

    if (typeof csvData !== 'string' || Buffer.byteLength(csvData, 'utf8') > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'CSV must be text no larger than 5 MiB.' }, { status: 413 });
    }
    let rows: string[][];
    try {
      rows = parseCsv(csvData, { maxRows: 10_001, maxColumns: 50 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid CSV.' }, { status: 400 });
    }
    if (rows.length < 2) return NextResponse.json({ error: 'CSV must contain a header and at least one data row.' }, { status: 400 });
    const headers = rows[0].map((header) => header.toLowerCase().replace(/[^a-z0-9]/g, ''));

    const emailIndex = headers.indexOf('email');
    const courseTitleIndex = headers.indexOf('coursetitle');
    const dueDateIndex = headers.indexOf('duedate');

    if (emailIndex === -1 || courseTitleIndex === -1) {
      return NextResponse.json(
        { error: 'CSV must have email and courseTitle columns' },
        { status: 400 },
      );
    }

    const enrollments = [];
    const errors = [];

    // Process each row
    for (let i = 1; i < rows.length; i++) {
      try {
        const values = rows[i];
        const email = values[emailIndex]?.toLowerCase();
        const courseTitle = values[courseTitleIndex];
        const dueDate = dueDateIndex >= 0 ? values[dueDateIndex] : null;

        if (!email || !courseTitle) {
          errors.push({ row: i + 1, error: 'Missing email or courseTitle' });
          continue;
        }
        if (!validateEmail(email)) {
          errors.push({ row: i + 1, error: `Invalid email address: ${email}` });
          continue;
        }
        if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
          errors.push({ row: i + 1, error: 'dueDate must use YYYY-MM-DD.' });
          continue;
        }

        // Find learner by email
        const membership = await prisma.organizationMember.findFirst({
          where: {
            organizationId: context.organizationId,
            isActive: true,
            user: { email },
          },
          include: { user: true },
        });

        if (!membership) {
          errors.push({ row: i + 1, error: `Learner with email ${email} not found` });
          continue;
        }

        // Find course by title
        const course = await prisma.course.findFirst({
          where: { title: courseTitle, organizationId: context.organizationId },
        });

        if (!course) {
          errors.push({ row: i + 1, error: `Course with title ${courseTitle} not found` });
          continue;
        }

        // Check for existing enrollment
        const existing = await prisma.courseEnrollment.findFirst({
          where: { learnerId: membership.userId, courseId: course.id },
        });

        if (existing) {
          errors.push({
            row: i + 1,
            error: `Learner already enrolled in ${courseTitle}`,
          });
          continue;
        }

        // Create enrollment
        const enrollment = await prisma.courseEnrollment.create({
          data: {
            learnerId: membership.userId,
            courseId: course.id,
            dueDate: dueDate ? new Date(dueDate) : null,
          },
        });

        // Send enrollment email to learner
        const emailOptions = generateEnrollmentEmail(
          membership.user.name,
          course.title,
          dueDate ? new Date(dueDate).toLocaleDateString() : undefined,
        );
        emailOptions.to = email;
        const notificationDelivered = await sendEmail(emailOptions);
        enrollments.push({
          learnerEmail: email,
          courseTitle,
          status: 'success',
          notificationDelivered,
        });

        // Log audit event
        await prisma.auditLog.create({
          data: {
            organizationId: context.organizationId,
            actor: context.userId,
            action: 'enrollment_created_bulk',
            object: 'CourseEnrollment',
            objectId: enrollment.id,
            details: JSON.stringify({
              learnerId: membership.userId,
              courseId: course.id,
              notificationDelivered,
              timestamp: new Date().toISOString(),
            }),
          },
        });
      } catch (err) {
        errors.push({ row: i + 1, error: String(err) });
      }
    }

    return NextResponse.json({
      success: true,
      enrollmentsCreated: enrollments.length,
      enrollments,
      errors,
    });
  } catch (error) {
    console.error('Error processing bulk enrollments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
