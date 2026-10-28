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
import { InterventionClosureService } from '@/services/InterventionClosureService';
import { hasAnyRole, OVERSIGHT_ROLES } from '@/lib/authorization';

/**
 * POST /api/manager/observations — one-tap effectiveness verification (WP-3 screen 5).
 * Records a SupervisorObservation + EffectivenessEvidence together in one call, then attempts
 * automatic closure (InterventionClosureService — real gate: target level AND atom completion,
 * per WP-2 §2). "One-tap" describes the UI interaction, not a shortcut around the real gates —
 * closure still only happens if the underlying evidence actually qualifies.
 */
export async function POST(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, OVERSIGHT_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { assignmentId, interventionId, effectivenessLevel, description, outcome } = body;
    if (!assignmentId || !interventionId || !effectivenessLevel) {
      return NextResponse.json({ error: 'assignmentId, interventionId, effectivenessLevel are required' }, { status: 400 });
    }

    const assignment = await prisma.trainingAssignment.findFirst({
      where: { id: assignmentId, interventionId, status: 'PASSED', assessment: { tenantId: context.organizationId } },
    });
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    const actor = context.user.email;

    await prisma.supervisorObservation.create({
      data: {
        assignmentId,
        interventionId,
        supervisorId: context.userId,
        supervisorRole: context.role,
        description: description || 'Observed via one-tap effectiveness verification.',
        effectivenessLevel,
        outcome: outcome || 'effective',
        recordedBy: actor,
      },
    });

    await prisma.effectivenessEvidence.create({
      data: {
        interventionId,
        assignmentId,
        level: effectivenessLevel,
        evidenceType: 'observation',
        collectedBy: actor,
        supportsClosureAtLevel: true,
      },
    });

    const closureService = new InterventionClosureService(prisma);
    const closure = await closureService.checkAndClose(interventionId);

    return NextResponse.json({ recorded: true, closedNow: closure.closedNow, closureReason: closure.reason });
  } catch (error) {
    console.error('Observation recording error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
