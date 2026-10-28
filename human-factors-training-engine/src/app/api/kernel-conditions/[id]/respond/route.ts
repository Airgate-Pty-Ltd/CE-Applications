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
import { hasAnyRole, TRAINING_MANAGEMENT_ROLES } from '@/lib/authorization';

const VALID_RESPONSES = ['CONFIRM', 'DISMISS_INCORRECT', 'DISMISS_NOT_APPLICABLE'];

/**
 * POST /api/kernel-conditions/:id/respond — the three-response contract (WP-3 screen 2).
 * A kernel condition is advisory only; a human must respond with exactly one of the three
 * options before it leaves NEW status. There is no fourth option and no auto-response path.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, TRAINING_MANAGEMENT_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;

  try {
    const body = await request.json();
    const { response, responseNotes } = body;
    if (!VALID_RESPONSES.includes(response)) {
      return NextResponse.json({ error: `response must be one of: ${VALID_RESPONSES.join(', ')}` }, { status: 400 });
    }

    const condition = await prisma.maiSystemCondition.findFirst({ where: { id, tenantId: context.organizationId } });
    if (!condition) return NextResponse.json({ error: 'Condition not found' }, { status: 404 });
    const updated = await prisma.maiSystemCondition.update({
      where: { id: condition.id },
      data: {
        response,
        responseNotes,
        respondedBy: context.user.email,
        respondedAt: new Date(),
        status: 'REVIEWED',
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actor: context.userId,
        action: 'kernel_condition_disposed',
        object: 'MaiSystemCondition',
        objectId: id,
        details: JSON.stringify({ response, responseNotes, ruleId: updated.ruleId }),
      },
    });

    return NextResponse.json({ id: updated.id, status: updated.status, response: updated.response });
  } catch (error) {
    console.error('Kernel condition response error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
