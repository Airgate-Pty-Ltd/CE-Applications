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
import { fromDbArray } from '@/lib/json';
import { compileAndAssignAtoms } from '@/services/compileAndAssignAtoms';
import { hasAnyRole, TRAINING_MANAGEMENT_ROLES } from '@/lib/authorization';

/**
 * POST /api/atoms/compile-and-assign — compiles the intervention's APPROVED atoms into a
 * frozen manifest and assigns it to a learner (spec §2 steps 5-6). Rejects if any linked atom
 * is not yet APPROVED (C-005 publication gate, enforced again here at the compiler level).
 *
 * D-067: the actual compile/budget-check/persist/assign logic now lives in
 * compileAndAssignAtoms() (src/services/compileAndAssignAtoms.ts), shared with
 * LessonAutoImplementationService's autonomous distribution path — this route is a thin HTTP
 * wrapper, behavior unchanged.
 */
export async function POST(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, TRAINING_MANAGEMENT_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { interventionId, learnerId, dueDate } = body;
    if (!interventionId || !learnerId) {
      return NextResponse.json({ error: 'interventionId and learnerId are required' }, { status: 400 });
    }

    const intervention = await prisma.learningIntervention.findUnique({ where: { id: interventionId } });
    if (!intervention) return NextResponse.json({ error: 'Intervention not found' }, { status: 404 });
    if (intervention.eventId) {
      const event = await prisma.hfEvent.findFirst({ where: { id: intervention.eventId, tenantId: context.organizationId } });
      if (!event) return NextResponse.json({ error: 'Intervention not found' }, { status: 404 });
    }

    const atomIds = fromDbArray<string>(intervention.atomIds);
    const atoms = await prisma.learningAtom.findMany({ where: { id: { in: atomIds } } });
    if (atoms.length === 0) {
      return NextResponse.json({ error: 'Intervention has no linked atoms to compile' }, { status: 400 });
    }

    const learner = await prisma.user.findFirst({
      where: {
        id: learnerId,
        organizationMemberships: { some: { organizationId: context.organizationId, isActive: true } },
      },
    });
    if (!learner) return NextResponse.json({ error: 'Learner not found' }, { status: 404 });

    const result = await compileAndAssignAtoms(prisma, {
      tenantId: context.organizationId,
      interventionId,
      learnerId,
      atoms,
      requestedBy: context.userId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    if (result.queued) {
      return NextResponse.json({ queued: true, dispositionId: result.dispositionId, reason: result.reason });
    }
    return NextResponse.json({ assignmentId: result.assignmentId, manifestId: result.manifestId, outputHash: result.outputHash });
  } catch (error) {
    console.error('Compile-and-assign error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 400 });
  }
}
