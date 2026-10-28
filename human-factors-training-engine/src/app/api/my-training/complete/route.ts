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
import { AtomCompletionService } from '@/services/AtomCompletionService';

/** POST /api/my-training/complete — mark one atom complete within the caller's own assignment. */
export async function POST(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { assignmentId, atomId } = body;
    if (!assignmentId || !atomId) return NextResponse.json({ error: 'assignmentId and atomId are required' }, { status: 400 });

    const assignment = await prisma.trainingAssignment.findFirst({
      where: { id: assignmentId, learnerId: context.userId, tenantId: context.organizationId },
    });
    if (!assignment) {
      return NextResponse.json({ error: 'Not your assignment' }, { status: 403 });
    }

    const completionService = new AtomCompletionService(prisma);
    await completionService.markComplete(assignmentId, atomId);
    const status = await completionService.getCompletionStatus(assignmentId);

    // "Ready for Assessment" button appears (spec §2 step 6) — if that gate is now open and
    // status is still ASSIGNED, flip to IN_PROGRESS so the manager view can see real progress.
    if (assignment.status === 'ASSIGNED') {
      await prisma.trainingAssignment.update({ where: { id: assignmentId }, data: { status: 'IN_PROGRESS' } });
    }

    return NextResponse.json({ readyForAssessment: status.readyForAssessment, remaining: status.remainingAtomIds.length });
  } catch (error) {
    console.error('Atom completion error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
