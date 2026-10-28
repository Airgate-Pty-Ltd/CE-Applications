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
import { hasAnyRole, OVERSIGHT_ROLES } from '@/lib/authorization';

/** GET /api/manager/pending — assignments that have PASSED assessment but have no supervisor
 * observation yet (WP-3 screen 5: "Manager five-minute view — pending observations"). */
export async function GET(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, OVERSIGHT_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const passedAssignments = await prisma.trainingAssignment.findMany({
    where: { status: 'PASSED', assessment: { tenantId: context.organizationId } },
    include: { learner: true, intervention: true, observations: true },
    orderBy: { passedAt: 'desc' },
  });

  const pending = passedAssignments.filter((a) => a.observations.length === 0);

  return NextResponse.json({
    pending: pending.map((a) => ({
      assignmentId: a.id,
      interventionId: a.interventionId,
      interventionTitle: a.intervention.title,
      learnerName: a.learner.name,
      passedAt: a.passedAt ? a.passedAt.toISOString() : null,
    })),
  });
}
