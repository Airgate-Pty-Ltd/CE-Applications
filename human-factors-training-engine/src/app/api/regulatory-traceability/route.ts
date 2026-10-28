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
import { RegulatoryTraceabilityService } from '@/services/RegulatoryTraceabilityService';
import { hasAnyRole, TRAINING_MANAGEMENT_ROLES } from '@/lib/authorization';

/**
 * GET /api/regulatory-traceability — clause <-> atom <-> status <-> content-source matrix
 * for regulatory baseline training (D-058). Distinct from /api/traceability (forward/reverse
 * event<->atom tracing) - this is the regulation-coverage view, not the event-evidence view.
 */
export async function GET(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, TRAINING_MANAGEMENT_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const framework = request.nextUrl.searchParams.get('framework') ?? undefined;

  const service = new RegulatoryTraceabilityService(prisma);
  const matrix = framework ? await service.buildMatrix(framework) : await service.buildMatrix();

  return NextResponse.json({ matrix });
}
