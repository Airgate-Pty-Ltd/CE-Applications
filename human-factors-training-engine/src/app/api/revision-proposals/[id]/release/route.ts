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
import { getReleaseService } from '@/lib/intelligence/intelligence-adapter';

/** POST /api/revision-proposals/[id]/release — approve, return for rework, or reject. D-069. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, TRAINING_MANAGEMENT_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: proposalId } = await params;

  let body: { action: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { action, reason } = body;
  if (!action) return NextResponse.json({ error: 'action is required' }, { status: 400 });

  const releaseService = getReleaseService(context.organizationId);

  try {
    if (action === 'APPROVE') {
      const result = await releaseService.approve(proposalId, context.userId);
      return NextResponse.json({ ok: true, atomId: result.atomId, assignmentsCreated: result.assignmentsCreated });
    }

    if (action === 'RETURN_FOR_REWORK') {
      if (!reason) return NextResponse.json({ error: 'reason is required for RETURN_FOR_REWORK' }, { status: 400 });
      await releaseService.returnForRework(proposalId, context.userId, reason);
      return NextResponse.json({ ok: true });
    }

    if (action === 'REJECT') {
      if (!reason) return NextResponse.json({ error: 'reason is required for REJECT' }, { status: 400 });
      await releaseService.reject(proposalId, context.userId, reason);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Release failed';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
