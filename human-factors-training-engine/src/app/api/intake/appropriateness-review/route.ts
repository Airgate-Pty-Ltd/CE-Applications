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

/**
 * POST /api/intake/appropriateness-review — spec §2 step 3. Creates the intervention (if not
 * already created for this event) and its appropriateness review together — they are 1:1 and
 * always authored in the same step in the real workflow.
 */
export async function POST(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, TRAINING_MANAGEMENT_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const {
      eventId,
      interventionTitle,
      interventionDescription,
      competenceGapIdentified,
      trainingReducesRisk,
      engineeringAlternative,
      processingAlternative,
      toolingAlternative,
      expectedBehaviorChange,
      ineffectivenessEscalation,
    } = body;

    if (!eventId || !interventionTitle) {
      return NextResponse.json({ error: 'eventId and interventionTitle are required' }, { status: 400 });
    }

    const actor = context.user.email;
    const event = await prisma.hfEvent.findFirst({
      where: { id: eventId, tenantId: context.organizationId },
    });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    let intervention = await prisma.learningIntervention.findFirst({
      where: { eventId, tenantId: context.organizationId },
    });
    if (!intervention) {
      intervention = await prisma.learningIntervention.create({
        data: {
          tenantId: context.organizationId,
          eventId,
          title: interventionTitle,
          description: interventionDescription,
          designedBy: actor,
        },
      });

      // Real bug found via WP-3 click-through verification (RUN-JOURNAL-PHASE3.md): the
      // intervention's `eventId` FK alone is not enough — TraceabilityGraph.findAtomsForEvent()
      // (C-010 forward query) traverses the EvidenceRelationship join table, not the FK
      // directly. Without this edge, every intervention created through this route was
      // invisible to forward traceability even though the FK linkage was correct.
      await prisma.evidenceRelationship.create({
        data: {
          tenantId: context.organizationId,
          fromEntityType: 'HfEvent',
          fromEntityId: eventId,
          toEntityType: 'LearningIntervention',
          toEntityId: intervention.id,
          relationshipType: 'ADDRESSES',
          createdBy: actor,
        },
      });
    }

    const existingReview = await prisma.learningInterventionAppropriatenessReview.findUnique({
      where: { interventionId: intervention.id },
    });
    if (existingReview) {
      return NextResponse.json({ error: 'Appropriateness review already exists for this intervention' }, { status: 409 });
    }

    const review = await prisma.learningInterventionAppropriatenessReview.create({
      data: {
        interventionId: intervention.id,
        competenceGapIdentified: !!competenceGapIdentified,
        trainingReducesRisk: !!trainingReducesRisk,
        engineeringAlternative,
        processingAlternative,
        toolingAlternative,
        expectedBehaviorChange,
        ineffectivenessEscalation,
        reviewedBy: actor,
      },
    });

    return NextResponse.json({ interventionId: intervention.id, reviewId: review.id });
  } catch (error) {
    console.error('Appropriateness review error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
