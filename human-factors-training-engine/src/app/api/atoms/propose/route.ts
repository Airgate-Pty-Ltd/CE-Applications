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
import { AiAssist } from '@/services/AiAssist';
import { hasAnyRole, TRAINING_MANAGEMENT_ROLES } from '@/lib/authorization';

/**
 * POST /api/atoms/propose — draft-beside-source (WP-3 screen 3): returns an AI draft (if
 * available) alongside the real source spans, for side-by-side QM review. Does not write to
 * the database — this is a preview; POST /api/atoms creates the actual atom afterward.
 */
export async function POST(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, TRAINING_MANAGEMENT_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { evidenceId, theme, objective } = body;
    if (!evidenceId || !theme || !objective) {
      return NextResponse.json({ error: 'evidenceId, theme, objective are required' }, { status: 400 });
    }

    const aiAssist = new AiAssist(prisma); // no provider configured — real, honest no-AI fallback path
    const evidence = await prisma.hfEvidence.findFirst({
      where: { id: evidenceId, tenantId: context.organizationId },
      select: { id: true },
    });
    if (!evidence) return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    const proposal = await aiAssist.proposeAtomFromEvidence(context.organizationId, evidenceId, theme, objective);

    return NextResponse.json(proposal);
  } catch (error) {
    console.error('Atom proposal error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
