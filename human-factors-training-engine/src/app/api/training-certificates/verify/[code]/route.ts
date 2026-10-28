/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^HF-[A-F0-9]{32}$/.test(code)) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }
  const certificate = await prisma.trainingCertificate.findUnique({
    where: { certificateCode: code },
    include: {
      learner: { select: { name: true } },
      assignment: { include: { intervention: { select: { title: true } } } },
    },
  });
  if (!certificate) return NextResponse.json({ valid: false }, { status: 404 });
  const expired = !!certificate.expiresAt && certificate.expiresAt <= new Date();
  return NextResponse.json({
    valid: !certificate.revokedAt && !expired,
    certificateCode: certificate.certificateCode,
    learnerName: certificate.learner.name,
    trainingTitle: certificate.assignment.intervention.title,
    issuedAt: certificate.issuedAt,
    expiresAt: certificate.expiresAt,
    revoked: !!certificate.revokedAt,
  });
}
