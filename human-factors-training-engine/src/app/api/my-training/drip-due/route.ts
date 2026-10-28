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
import { DripRecurrencyService } from '@/services/DripRecurrencyService';

/** GET /api/my-training/drip-due — this learner's due shift-brief-cadence deliveries (WP-4.4). */
export async function GET(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = new DripRecurrencyService(prisma);
  const due = await service.getDueDripDeliveries(context.userId, new Date(), context.organizationId);
  return NextResponse.json({ due: due.filter((d) => d.isDue) });
}
