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
import { PolicyPackService } from '@/services/PolicyPackService';
import { hasAnyRole, TRAINING_MANAGEMENT_ROLES } from '@/lib/authorization';

/** GET /api/policy-packs — list all packs with their clauses (WP-4.5). */
export async function GET(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, TRAINING_MANAGEMENT_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const service = new PolicyPackService(prisma, context.organizationId);
  const packs = await service.listPacks();
  return NextResponse.json({ packs });
}

/** POST /api/policy-packs — create an EMPTY pack shell. Content is owner-supplied afterward. */
export async function POST(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, ['admin', 'qm'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { name, regulatoryFramework, regulatoryReference, recurrenceMonths } = body;
    if (!name || !regulatoryFramework) {
      return NextResponse.json({ error: 'name and regulatoryFramework are required' }, { status: 400 });
    }

    const service = new PolicyPackService(prisma, context.organizationId);
    const pack = await service.createEmptyPack({
      name,
      regulatoryFramework,
      regulatoryReference,
      recurrenceMonths: recurrenceMonths ? Number(recurrenceMonths) : undefined,
    });
    return NextResponse.json({ packId: pack.id });
  } catch (error) {
    console.error('Policy pack creation error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 400 });
  }
}
