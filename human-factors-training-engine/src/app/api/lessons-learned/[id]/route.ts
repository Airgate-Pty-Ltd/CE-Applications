/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { resolveSessionToken } from '@/lib/session';
import { SESSION_COOKIE_NAME } from '@/lib/sessionToken';
import { prisma } from '@/lib/db';

// Valid forward transitions for each status
const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'DRAFT'],
  UNDER_REVIEW: [
    'APPROVED_LEARNING_INTERVENTION_REQUIRED',
    'APPROVED_NO_TRAINING_REQUIRED',
    'EVIDENCE_NEEDED',
    'REJECTED',
  ],
  EVIDENCE_NEEDED: ['UNDER_REVIEW', 'REJECTED'],
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = await resolveSessionToken(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { organizationId, membership } = session;
  if (membership.role === 'learner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const lesson = await prisma.lessonLearned.findFirst({
    where: { id, tenantId: organizationId },
    include: {
      revisionProposals: {
        select: { id: true, status: true, title: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ lesson });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = await resolveSessionToken(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { organizationId, membership, user } = session;
  if (membership.role === 'learner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const lesson = await prisma.lessonLearned.findFirst({
    where: { id, tenantId: organizationId },
  });
  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { status: newStatus, title, summary, narrative, lessonType, sourceClassification, externalSourceRef, themes, rejectionReason } = body;

  // Field-only update (no status change)
  if (!newStatus) {
    if (['DRAFT', 'EVIDENCE_NEEDED'].includes(lesson.status)) {
      const updated = await prisma.lessonLearned.update({
        where: { id },
        data: {
          ...(title != null ? { title: title.trim() } : {}),
          ...(summary != null ? { summary: summary.trim() } : {}),
          ...(narrative != null ? { narrative: narrative.trim() || null } : {}),
          ...(lessonType != null ? { lessonType } : {}),
          ...(sourceClassification != null ? { sourceClassification } : {}),
          ...(externalSourceRef != null ? { externalSourceRef: externalSourceRef.trim() || null } : {}),
          ...(themes != null ? { themes: JSON.stringify(themes) } : {}),
        },
        include: {
          revisionProposals: {
            select: { id: true, status: true, title: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
      return NextResponse.json({ lesson: updated });
    }
    return NextResponse.json({ error: 'Cannot edit a lesson in this status' }, { status: 400 });
  }

  // Status transition
  const allowed = TRANSITIONS[lesson.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${lesson.status} to ${newStatus}` },
      { status: 400 }
    );
  }

  const now = new Date();
  const statusData: Record<string, unknown> = { status: newStatus };

  if (newStatus === 'UNDER_REVIEW') {
    statusData.reviewedBy = user.email;
    statusData.reviewedAt = now;
  }
  if (newStatus === 'APPROVED_LEARNING_INTERVENTION_REQUIRED' || newStatus === 'APPROVED_NO_TRAINING_REQUIRED') {
    statusData.approvedBy = user.email;
    statusData.approvedAt = now;
  }
  if (newStatus === 'REJECTED') {
    statusData.rejectionReason = rejectionReason?.trim() || 'No reason provided';
  }

  const updated = await prisma.lessonLearned.update({
    where: { id },
    data: statusData,
    include: {
      revisionProposals: {
        select: { id: true, status: true, title: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  return NextResponse.json({ lesson: updated });
}
