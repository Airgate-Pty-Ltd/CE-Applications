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

/** GET /api/kernel-conditions — System-Detected Conditions, advisory only (WP-3 screen 2). */
export async function GET(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, TRAINING_MANAGEMENT_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const conditions = await prisma.maiSystemCondition.findMany({
    where: { tenantId: context.organizationId },
    orderBy: { detectedAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({
    conditions: conditions.map((c) => ({
      id: c.id,
      ruleId: c.ruleId,
      ruleName: c.ruleName,
      severity: c.severity,
      rationale: c.rationale,
      suggestedAction: c.suggestedAction,
      status: c.status,
      response: c.response,
      respondedBy: c.respondedBy,
      respondedAt: c.respondedAt ? c.respondedAt.toISOString() : null,
      responseNotes: c.responseNotes,
      detectedAt: c.detectedAt.toISOString(),
      dimId: c.ruleId.startsWith('HFSRC') ? 'dim-hf-src' : c.ruleId.startsWith('HFINT') ? 'dim-hf-int' : 'dim-hf-eff',
    })),
  });
}
