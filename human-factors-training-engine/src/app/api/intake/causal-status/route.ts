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
import { CausalStatusService } from '@/services/CausalStatusService';
import { hasAnyRole, TRAINING_MANAGEMENT_ROLES } from '@/lib/authorization';

/** POST /api/intake/causal-status — human-only promotion (C-004), never auto-promoted. */
export async function POST(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, TRAINING_MANAGEMENT_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { eventId, toStatus, notes, verifiedRootCause } = body;
    if (!eventId || !toStatus) {
      return NextResponse.json({ error: 'eventId and toStatus are required' }, { status: 400 });
    }

    const event = await prisma.hfEvent.findFirst({ where: { id: eventId, tenantId: context.organizationId } });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    const service = new CausalStatusService(prisma);
    const result = await service.promote({
      tenantId: context.organizationId,
      eventId,
      toStatus,
      promotedBy: context.user.email,
      notes,
      verifiedRootCause,
    });

    return NextResponse.json({ status: result.status, promotedBy: result.promotedBy, promotedAt: result.promotedAt });
  } catch (error) {
    console.error('Causal status promotion error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 400 });
  }
}
