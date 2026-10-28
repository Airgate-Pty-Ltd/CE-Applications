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

    // Fetch data for export
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
    const completionPercent = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;
    const avgScore = attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length) : 0;
    const passedAttempts = attempts.filter((a) => a.passed).length;

    // Course stats
    const courseStats = Array.from(new Set(enrollments.map((e) => e.courseId))).map((courseId) => {
      const courseEnrollments = enrollments.filter((e) => e.courseId === courseId);
      const completedCount = courseEnrollments.filter((e) => e.status === 'completed').length;
      const course = courseEnrollments[0]?.course;

      return {
        courseTitle: course?.title,
        totalLearners: courseEnrollments.length,
        completedLearners: completedCount,
        completionPercent: Math.round((completedCount / courseEnrollments.length) * 100),
      };
    });

    // Learner stats
    const learnerStats = Array.from(new Set(enrollments.map((e) => e.learnerId))).map((learnerId) => {
      const learnerEnrollments = enrollments.filter((e) => e.learnerId === learnerId);
      const learnerAttempts = attempts.filter((a) => a.learnerId === learnerId);
      const completedCourses = learnerEnrollments.filter((e) => e.status === 'completed').length;
      const avgAttemptScore = learnerAttempts.length > 0 ? Math.round(learnerAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / learnerAttempts.length) : 0;

      return {
        learnerName: learnerEnrollments[0]?.learner.name,
        learnerEmail: learnerEnrollments[0]?.learner.email,
        enrolledCourses: learnerEnrollments.length,
        completedCourses,
        progressPercent: Math.round((completedCourses / learnerEnrollments.length) * 100),
        avgScore: avgAttemptScore,
        passedAssessments: learnerAttempts.filter((a) => a.passed).length,
      };
    });

    // Generate CSV (summary + course stats + learner stats sections)
    const now = new Date().toLocaleDateString();
    const csvSections = [];

    // Section 1: Summary
    csvSections.push('SUMMARY REPORT');
    csvSections.push(`Generated: ${now}`);
    csvSections.push(versionStamp());
    csvSections.push('');
    csvSections.push('Metric,Value');
    csvSections.push(`Total Enrollments,${totalEnrollments}`);
    csvSections.push(`Completed Enrollments,${completedEnrollments}`);
    csvSections.push(`Completion Percent,${completionPercent}%`);
    csvSections.push(`Average Score,${avgScore}%`);
    csvSections.push(`Passed Assessments,${passedAttempts}`);
    csvSections.push(`Total Assessment Attempts,${attempts.length}`);
    csvSections.push('');

    // Section 2: Course Stats
    csvSections.push('COURSE STATISTICS');
    csvSections.push('Course Title,Total Learners,Completed Learners,Completion Percent');
    courseStats.forEach((stat) => {
      csvSections.push(
        `"${stat.courseTitle}",${stat.totalLearners},${stat.completedLearners},${stat.completionPercent}%`
      );
    });
    csvSections.push('');

    // Section 3: Learner Stats
    csvSections.push('LEARNER STATISTICS');
    csvSections.push(
      'Learner Name,Email,Enrolled Courses,Completed Courses,Progress Percent,Average Score,Passed Assessments'
    );
    learnerStats.forEach((stat) => {
      csvSections.push(
        `"${stat.learnerName}","${stat.learnerEmail}",${stat.enrolledCourses},${stat.completedCourses},${stat.progressPercent}%,${stat.avgScore}%,${stat.passedAssessments}`
      );
    });

    const csvContent = csvSections.join('\n');

    // Log audit event
    await prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actor: context.userId,
        action: 'reports_exported',
        object: 'Report',
        objectId: 'comprehensive',
        details: JSON.stringify({
          enrollmentCount: totalEnrollments,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // Return CSV file
    const fileName = `reports_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error exporting reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
