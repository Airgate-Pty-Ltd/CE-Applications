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
import { generateCertificatePDF, generateCertificateFileName } from '@/lib/certificate';

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

    const { id: certificateId } = await params;

    // Fetch certificate with related data
    const certificate = await prisma.certificate.findFirst({
      where: {
        id: certificateId,
        learnerId: context.userId,
        course: { organizationId: context.organizationId },
      },
      include: {
        learner: {
          select: { id: true, name: true, email: true },
        },
        course: {
          select: { id: true, title: true },
        },
        attempt: {
          select: { score: true, assessment: { select: { passingScore: true } } },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    // Generate PDF
    const pdfBuffer = generateCertificatePDF({
      learnerName: certificate.learner.name,
      courseTitle: certificate.course.title,
      score: certificate.attempt.score || 0,
      passingScore: certificate.attempt.assessment.passingScore,
      certificateCode: certificate.certificateCode,
      issuedDate: certificate.issuedAt,
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actor: context.userId,
        action: 'certificate_downloaded',
        object: 'Certificate',
        objectId: certificateId,
        details: JSON.stringify({
          courseId: certificate.courseId,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // Update downloaded timestamp
    await prisma.certificate.update({
      where: { id: certificateId },
      data: { downloadedAt: new Date() },
    });

    // Return PDF as downloadable file
    const fileName = generateCertificateFileName(
      certificate.learner.name,
      certificate.course.title,
      certificate.certificateCode,
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
