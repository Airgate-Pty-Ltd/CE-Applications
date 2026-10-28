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

/**
 * POST /api/atoms/:id/approve — publication gate (C-005): DRAFT -> APPROVED only.
 * D-060: accepts an optional `topicIds` body field — spine topics (RequirementSpineTopic ids)
 * this atom covers, set at approval time per the Requirement Spine spec. Approval itself is
 * never blocked by a missing mapping; a kernel rule to flag unmapped published atoms is
 * deferred future work (see DECISIONS.md D-060), not enforced here.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'trainer', 'qm'].includes(context.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;

  const atom = await prisma.learningAtom.findUnique({
    where: { id },
    include: {
      assessmentQuestions: {
        where: { tenantId: context.organizationId, status: 'DRAFT' },
        select: { id: true },
      },
    },
  });
  if (!atom) return NextResponse.json({ error: 'Atom not found' }, { status: 404 });
  if (atom.status !== 'DRAFT') {
    return NextResponse.json({ error: `Cannot approve atom in status ${atom.status}` }, { status: 409 });
  }
  if (atom.assessmentQuestions.length === 0) {
    return NextResponse.json({ error: 'At least one assessment question is required before approval.' }, { status: 409 });
  }

  let topicIds: string[] = [];
  try {
    const body = await request.json();
    if (Array.isArray(body?.topicIds)) topicIds = body.topicIds.filter((t: unknown) => typeof t === 'string');
  } catch {
    // no body / not JSON — topicIds stays empty, approval proceeds unmapped
  }

  const approvedBy = context.user.email;
  const approvedAt = new Date();

  const [updated] = await prisma.$transaction([
    prisma.learningAtom.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy, approvedAt },
    }),
    prisma.atomAssessmentQuestion.updateMany({
      where: { atomId: id, tenantId: context.organizationId, status: 'DRAFT' },
      data: { status: 'APPROVED', approvedBy, approvedAt },
    }),
  ]);

  if (topicIds.length > 0) {
    await Promise.all(
      topicIds.map((topicId) =>
        prisma.atomTopicMap.upsert({
          where: { atomId_topicId: { atomId: updated.id, topicId } },
          update: {},
          create: { atomId: updated.id, topicId, mappedBy: approvedBy, approvedAt },
        })
      )
    );
  }

  return NextResponse.json({ id: updated.id, status: updated.status, topicIds });
}
