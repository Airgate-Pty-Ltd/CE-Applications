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
import { TrainingBurdenBudgetService } from '@/services/TrainingBurdenBudgetService';
import { hasAnyRole } from '@/lib/authorization';

/** GET /api/burden-budget — pending Training Burden Budget dispositions (WP-4.3). */
export async function GET(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, ['admin', 'qm'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const service = new TrainingBurdenBudgetService(prisma);
  const pending = await service.getPendingDispositions(context.organizationId);

  const enriched = await Promise.all(
    pending.map(async (d) => {
      const learner = await prisma.user.findUnique({ where: { id: d.learnerId } });
      const intervention = await prisma.learningIntervention.findUnique({ where: { id: d.interventionId } });
      return { ...d, learnerName: learner?.name || d.learnerId, interventionTitle: intervention?.title || d.interventionId };
    })
  );

  return NextResponse.json({ dispositions: enriched });
}

/** POST /api/burden-budget — resolve a disposition (approve override or reject). */
export async function POST(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, ['admin', 'qm'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { dispositionId, decision, rationale } = body;
    if (!dispositionId || !decision) {
      return NextResponse.json({ error: 'dispositionId and decision are required' }, { status: 400 });
    }
    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      return NextResponse.json({ error: 'decision must be APPROVED or REJECTED' }, { status: 400 });
    }

    const disposition = await prisma.maiApproval.findFirst({
      where: { id: dispositionId, tenantId: context.organizationId },
      select: { id: true },
    });
    if (!disposition) return NextResponse.json({ error: 'Disposition not found' }, { status: 404 });
    const service = new TrainingBurdenBudgetService(prisma);
    const resolved = await service.resolveDisposition(dispositionId, decision, context.user.email, rationale);

    return NextResponse.json({ disposition: resolved });
  } catch (error) {
    console.error('Burden budget disposition error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 400 });
  }
}
