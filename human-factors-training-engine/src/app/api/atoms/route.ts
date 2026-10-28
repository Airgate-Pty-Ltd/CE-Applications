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
import { AtomClassificationService } from '@/services/AtomClassificationService';
import { fromDbArray, toDbArray } from '@/lib/json';
import { hasAnyRole, TRAINING_MANAGEMENT_ROLES } from '@/lib/authorization';

/** GET /api/atoms — Content Authoring/Approval queue, optionally scoped to an intervention. */
export async function GET(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, TRAINING_MANAGEMENT_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const interventionId = request.nextUrl.searchParams.get('interventionId');

  const interventions = await prisma.learningIntervention.findMany({
    where: {
      ...(interventionId ? { id: interventionId } : { title: { not: '' } }),
      OR: [
        { event: { tenantId: context.organizationId } },
        { eventId: null, origin: 'regulatory-baseline' },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const result = await Promise.all(
    interventions.map(async (intervention) => {
      const atomIds = fromDbArray<string>(intervention.atomIds);
      const atoms = await prisma.learningAtom.findMany({
        where: { id: { in: atomIds } },
        include: { assessmentQuestions: { select: { id: true } } },
      });
      // D-058: eventId is null for regulatory-baseline interventions - no triggering event, so
      // no source evidence chain to look up (they trace through the PolicyPack/spine chain
      // instead - see D-060 and RegulatoryTraceabilityService.ts).
      const evidence = intervention.eventId
        ? await prisma.hfEvent
            .findUnique({ where: { id: intervention.eventId } })
            .then((e) => (e ? prisma.hfEvidence.findMany({ where: { id: e.evidenceId } }) : []))
        : [];

      return {
        interventionId: intervention.id,
        interventionTitle: intervention.title,
        eventId: intervention.eventId,
        status: intervention.status,
        sourceEvidence: evidence.map((e) => ({ id: e.id, title: e.title, classification: e.classification, source: e.source, description: e.description })),
        atoms: atoms.map((a) => ({
          id: a.id,
          title: a.title,
          objective: a.objective,
          format: a.format,
          status: a.status,
          classification: a.classification,
          content: a.content,
          assessmentQuestionCount: a.assessmentQuestions.length,
        })),
      };
    })
  );

  return NextResponse.json({ interventions: result });
}

/** POST /api/atoms — create an atom (manual or from an AI draft), classification-inherited. */
export async function POST(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, TRAINING_MANAGEMENT_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const {
      interventionId,
      title,
      objective,
      format,
      duration,
      content,
      sourceEvidenceIds,
      assessmentQuestion,
      correctAnswer,
      distractors,
      assessmentExplanation,
    } = body;
    if (!interventionId || !title || !objective || !format || !assessmentQuestion || !correctAnswer) {
      return NextResponse.json({ error: 'interventionId, title, objective, format, assessmentQuestion, and correctAnswer are required' }, { status: 400 });
    }
    const distractorList = Array.isArray(distractors)
      ? distractors.filter((value: unknown) => typeof value === 'string' && value.trim()).map((value: string) => value.trim())
      : [];
    const options = [String(correctAnswer).trim(), ...distractorList];
    if (options.length < 2 || new Set(options).size !== options.length) {
      return NextResponse.json({ error: 'Assessment requires a correct answer and at least one unique distractor.' }, { status: 400 });
    }

    const intervention = await prisma.learningIntervention.findUnique({ where: { id: interventionId } });
    if (!intervention) return NextResponse.json({ error: 'Intervention not found' }, { status: 404 });
    if (intervention.eventId) {
      const event = await prisma.hfEvent.findFirst({ where: { id: intervention.eventId, tenantId: context.organizationId } });
      if (!event) return NextResponse.json({ error: 'Intervention not found' }, { status: 404 });
    }

    const classificationService = new AtomClassificationService(prisma);
    const atom = await classificationService.createAtom({
      title,
      objective,
      format,
      duration,
      content,
      sourceEvidenceIds: Array.isArray(sourceEvidenceIds) ? sourceEvidenceIds : [],
      tenantId: context.organizationId,
      assessmentQuestion: {
        questionText: String(assessmentQuestion).trim(),
        options,
        correctAnswers: [String(correctAnswer).trim()],
        explanation: assessmentExplanation ? String(assessmentExplanation) : undefined,
      },
    });

    // Link atom to intervention
    const currentAtomIds = fromDbArray<string>(intervention.atomIds);
    await prisma.learningIntervention.update({
      where: { id: interventionId },
      data: { atomIds: toDbArray([...currentAtomIds, atom.id]) },
    });
    await prisma.evidenceRelationship.create({
      data: {
        tenantId: context.organizationId,
        fromEntityType: 'LearningIntervention',
        fromEntityId: interventionId,
        toEntityType: 'LearningAtom',
        toEntityId: atom.id,
        relationshipType: 'INCLUDES',
        createdBy: context.userId,
      },
    });

    return NextResponse.json({ atomId: atom.id, classification: atom.classification, status: atom.status });
  } catch (error) {
    console.error('Atom creation error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 400 });
  }
}
