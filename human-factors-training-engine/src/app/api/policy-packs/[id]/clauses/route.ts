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

/** POST /api/policy-packs/[id]/clauses — add a clause placeholder (WP-4.5). Title/text optional, never invented. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, ['admin', 'qm'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { clauseNumber, clauseTitle, clauseText } = body;
    if (!clauseNumber) {
      return NextResponse.json({ error: 'clauseNumber is required' }, { status: 400 });
    }

    const service = new PolicyPackService(prisma, context.organizationId);
    const clause = await service.addClausePlaceholder({ packId: id, clauseNumber, clauseTitle, clauseText });
    return NextResponse.json({ clauseId: clause.id });
  } catch (error) {
    console.error('Policy pack clause creation error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 400 });
  }
}
