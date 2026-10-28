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
import { DriftWatchService } from '@/services/DriftWatchService';
import { hasAnyRole, TRAINING_MANAGEMENT_ROLES } from '@/lib/authorization';

/**
 * GET /api/drift-watch — advisory theme-frequency-vs-coverage report (WP-4.2).
 * NOT a kernel condition — see OPEN-QUESTIONS.md Q-007. No approved Rev-A rule
 * covers this; this route returns analytics only, never a MaiSystemCondition.
 */
export async function GET(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, TRAINING_MANAGEMENT_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const service = new DriftWatchService(prisma);
  const drift = await service.computeDrift(undefined, undefined, context.organizationId);
  return NextResponse.json({ drift });
}
