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
import { hasAnyRole } from '@/lib/authorization';

/** POST /api/policy-packs/clauses/[clauseId]/map — explicit QM mapping of a clause to approved atoms (WP-4.5). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ clauseId: string }> }) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, ['admin', 'qm'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { clauseId } = await params;
    const body = await request.json();
    const { atomIds } = body;
    if (!Array.isArray(atomIds)) {
      return NextResponse.json({ error: 'atomIds must be an array' }, { status: 400 });
    }

    const service = new PolicyPackService(prisma, context.organizationId);
    await service.mapClauseToAtoms(clauseId, atomIds);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Policy pack clause mapping error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 400 });
  }
}
