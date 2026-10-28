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
import { DripRecurrencyService } from '@/services/DripRecurrencyService';

/** POST /api/my-training/drip-deliver — record a real shift-brief delivery (WP-4.4). */
export async function POST(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { assignmentId, atomId } = body;
    if (!assignmentId || !atomId) {
      return NextResponse.json({ error: 'assignmentId and atomId are required' }, { status: 400 });
    }

    const assignment = await prisma.trainingAssignment.findFirst({
      where: { id: assignmentId, learnerId: context.userId, tenantId: context.organizationId },
    });
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const service = new DripRecurrencyService(prisma);
    const delivery = await service.recordDelivery(assignmentId, atomId);
    return NextResponse.json({ deliveryId: delivery.id, deliveredAt: delivery.deliveredAt });
  } catch (error) {
    console.error('Drip delivery error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 400 });
  }
}
