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

export async function GET(req: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = await resolveSessionToken(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { organizationId, membership } = session;
  if (membership.role === 'learner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const lessons = await prisma.lessonLearned.findMany({
    where: {
      tenantId: organizationId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      summary: true,
      lessonType: true,
      status: true,
      sourceClassification: true,
      themes: true,
      approvedBy: true,
      approvedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ lessons });
}

export async function POST(req: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = await resolveSessionToken(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { organizationId, membership, user } = session;
  if (membership.role === 'learner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { title, summary, narrative, lessonType, sourceClassification, externalSourceRef, themes } = body;

  if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!summary?.trim()) return NextResponse.json({ error: 'summary is required' }, { status: 400 });

  const lesson = await prisma.lessonLearned.create({
    data: {
      tenantId: organizationId,
      title: title.trim(),
      summary: summary.trim(),
      narrative: narrative?.trim() || null,
      lessonType: lessonType || 'NEGATIVE',
      sourceClassification: sourceClassification || 'INTERNAL_UNVALIDATED',
      externalSourceRef: externalSourceRef?.trim() || null,
      themes: themes ? JSON.stringify(themes) : '[]',
      status: 'DRAFT',
      submittedBy: user.email,
      submittedAt: new Date(),
    },
  });

  return NextResponse.json({ lesson }, { status: 201 });
}
