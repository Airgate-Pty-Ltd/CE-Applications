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
          select: { id: true, name: true },
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

    return NextResponse.json({
      success: true,
      certificate: {
        id: certificate.id,
        learnerName: certificate.learner.name,
        courseTitle: certificate.course.title,
        score: certificate.attempt.score,
        passingScore: certificate.attempt.assessment.passingScore,
        certificateCode: certificate.certificateCode,
        issuedAt: certificate.issuedAt,
        publicUrl: certificate.publicUrl,
      },
    });
  } catch (error) {
    console.error('Error fetching certificate info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
