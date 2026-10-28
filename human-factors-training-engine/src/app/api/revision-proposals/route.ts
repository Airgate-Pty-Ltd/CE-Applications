/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/session';
import { hasAnyRole, TRAINING_MANAGEMENT_ROLES } from '@/lib/authorization';
import { prisma } from '@/lib/db';

/** GET /api/revision-proposals — list AWAITING_HUMAN_RELEASE proposals for this tenant. D-069. */
export async function GET(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, TRAINING_MANAGEMENT_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const proposals = await prisma.maiContentRevisionProposal.findMany({
    where: { tenantId: context.organizationId, status: 'AWAITING_HUMAN_RELEASE' },
    orderBy: { createdAt: 'asc' },
    include: { lessonLearned: { select: { title: true } } },
  });

  return NextResponse.json({ proposals });
}
