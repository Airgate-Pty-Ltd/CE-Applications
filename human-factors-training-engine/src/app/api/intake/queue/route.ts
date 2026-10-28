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
import { CausalStatusService } from '@/services/CausalStatusService';
import { fromDbArray } from '@/lib/json';
import { hasAnyRole, TRAINING_MANAGEMENT_ROLES } from '@/lib/authorization';

/** GET /api/intake/queue — Source Intake & Review queue listing (WP-3 screen 1). */
export async function GET(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, TRAINING_MANAGEMENT_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const causalService = new CausalStatusService(prisma);

  const evidenceRows = await prisma.hfEvidence.findMany({
    where: { tenantId: context.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { events: { include: { relationships: false } } },
  });

  const items = await Promise.all(
    evidenceRows.map(async (evidence) => {
      const events = await Promise.all(
        evidence.events.map(async (event) => {
          const status = await causalService.getStatus(event.id);
          const intervention = await prisma.learningIntervention.findFirst({ where: { eventId: event.id } });
          let appropriatenessReview = null;
          if (intervention) {
            appropriatenessReview = await prisma.learningInterventionAppropriatenessReview.findUnique({
              where: { interventionId: intervention.id },
            });
          }
          return {
            eventId: event.id,
            title: event.title,
            themes: fromDbArray<string>(event.themes),
            causalStatus: status?.status ?? 'REPORTED',
            interventionId: intervention?.id ?? null,
            interventionTitle: intervention?.title ?? null,
            hasAppropriatenessReview: !!appropriatenessReview,
          };
        })
      );

      return {
        evidenceId: evidence.id,
        title: evidence.title,
        source: evidence.source,
        classification: evidence.classification,
        quarantineStatus: evidence.quarantineStatus,
        documentHash: evidence.documentHash,
        occurredAt: evidence.occurredAt.toISOString(),
        themes: fromDbArray<string>(evidence.themes),
        events,
      };
    })
  );

  return NextResponse.json({ items });
}
