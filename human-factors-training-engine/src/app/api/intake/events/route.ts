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
import { toDbArray, fromDbArray } from '@/lib/json';
import { deriveEventStructure } from '@/lib/eventStructuring';
import { hasAnyRole, TRAINING_MANAGEMENT_ROLES } from '@/lib/authorization';

/** POST /api/intake/events — QM extracts an event from evidence (spec §2 step 2). */
export async function POST(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, TRAINING_MANAGEMENT_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { evidenceId, title, description, occurredAt, themes, rolesExposed, sitesExposed } = body;

    if (!evidenceId || !title || !occurredAt) {
      return NextResponse.json({ error: 'evidenceId, title, occurredAt are required' }, { status: 400 });
    }

    const evidence = await prisma.hfEvidence.findFirst({ where: { id: evidenceId, tenantId: context.organizationId } });
    if (!evidence) return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });

    // WP-4.1: structured intake — themes default to the evidence's own themes (never
    // silently dropped when the QM doesn't retype them); roles/sites exposed are
    // QM-entered, never invented. See src/lib/eventStructuring.ts.
    const structure = deriveEventStructure({ themes: fromDbArray<string>(evidence.themes) }, { themes, rolesExposed, sitesExposed });

    const event = await prisma.hfEvent.create({
      data: {
        tenantId: evidence.tenantId,
        evidenceId,
        title,
        description,
        occurredAt: new Date(occurredAt),
        themes: toDbArray(structure.themes),
        rolesExposed: toDbArray(structure.rolesExposed),
        sitesExposed: toDbArray(structure.sitesExposed),
      },
    });

    return NextResponse.json({ eventId: event.id, themes: structure.themes, rolesExposed: structure.rolesExposed, sitesExposed: structure.sitesExposed });
  } catch (error) {
    console.error('Event creation error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
