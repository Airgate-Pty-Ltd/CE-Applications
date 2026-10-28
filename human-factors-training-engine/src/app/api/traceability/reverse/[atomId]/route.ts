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

/** GET /api/traceability/reverse/:atomId — "what risks does this atom address?" (C-010),
 * plus which learners currently have it (C-011 recall query). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ atomId: string }> }) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { atomId } = await params;

  const atom = await prisma.learningAtom.findFirst({
    where: { id: atomId, tenantId: context.organizationId },
    select: { id: true },
  });
  if (!atom) return NextResponse.json({ error: 'Atom not found' }, { status: 404 });
  const graph = new TraceabilityGraph(prisma, context.organizationId);
  const [events, learners] = await Promise.all([
    graph.findEventsForAtom(atomId),
    graph.findLearnersWithAtom(atomId),
  ]);
  return NextResponse.json({ atomId, events, learners });
}
