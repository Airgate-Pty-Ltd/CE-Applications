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
import { TraceabilityGraph } from '@/services/TraceabilityGraph';

/** GET /api/traceability/forward/:eventId — "which atoms address this event?" (C-010). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { eventId } = await params;

  const graph = new TraceabilityGraph(prisma, context.organizationId);
  const atoms = await graph.findAtomsForEvent(eventId);
  return NextResponse.json({ eventId, atoms });
}
