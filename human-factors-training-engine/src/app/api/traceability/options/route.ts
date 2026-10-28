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

/** GET /api/traceability/options — events and atoms for the traceability picker UI. */
export async function GET(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [events, atoms] = await Promise.all([
    prisma.hfEvent.findMany({ where: { tenantId: context.organizationId }, select: { id: true, title: true }, orderBy: { occurredAt: 'desc' }, take: 50 }),
    prisma.learningAtom.findMany({ where: { tenantId: context.organizationId }, select: { id: true, title: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);

  return NextResponse.json({ events, atoms });
}
