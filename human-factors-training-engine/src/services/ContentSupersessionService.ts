/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient, LearningAtom } from '@prisma/client';
import { TraceabilityGraph } from './TraceabilityGraph';

/**
 * Content Supersession: PHASE-1-SPECIFICATION.md §3 C-011 (Content Recall) +
 * Phase 2 gate ("a content replacement produces correct supersession links and
 * disposition records").
 *
 * Old content is never deleted — only marked SUPERSEDED, forward-linked to its
 * replacement, and the affected learner population is identified via the real
 * traceability graph (TraceabilityGraph.findLearnersWithAtom, D-015). A disposition
 * record is written to AuditLog so the recall itself has an audit trail.
 */
export interface SupersessionResult {
  oldAtom: LearningAtom;
  newAtom: LearningAtom;
  affectedLearners: Array<{ learnerId: string; assignmentId: string; manifestId: string; status: string }>;
}

export class ContentSupersessionService {
  private graph: TraceabilityGraph;

  constructor(private prisma: PrismaClient, private tenantId: string) {
    if (!tenantId) throw new Error('ContentSupersessionService requires a tenantId.');
    this.graph = new TraceabilityGraph(prisma, tenantId);
  }

  async supersede(params: {
    oldAtomId: string;
    newAtomData: {
      title: string;
      objective: string;
      format: string;
      duration: number;
      content: string;
      classification: string;
    };
    replacementReason: string;
    replacedBy: string;
  }): Promise<SupersessionResult> {
    const oldAtom = await this.prisma.learningAtom.findFirstOrThrow({
      where: { id: params.oldAtomId, tenantId: this.tenantId },
    });

    // Identify affected learners BEFORE the old atom's status changes, using the real
    // recall query (C-011) — this is the actual list that would need corrected training.
    const affectedLearners = await this.graph.findLearnersWithAtom(params.oldAtomId);

    const newAtom = await this.prisma.learningAtom.create({
      data: {
        tenantId: this.tenantId,
        ...params.newAtomData,
        status: 'APPROVED',
        replacedAtomId: oldAtom.id,
        replacementReason: params.replacementReason,
        approvedBy: params.replacedBy,
        approvedAt: new Date(),
      },
    });

    const supersededOld = await this.prisma.learningAtom.update({
      where: { id: oldAtom.id },
      data: {
        status: 'SUPERSEDED',
        replacementAtomId: newAtom.id,
        retiredDate: new Date(),
      },
    });

    // Disposition record: the recall event itself, audit-logged (never mutates the frozen
    // assignments/manifests that already reference the old atom — history stays as it was).
    await this.prisma.auditLog.create({
      data: {
        organizationId: this.tenantId,
        actor: null,
        action: 'content_recalled',
        object: 'LearningAtom',
        objectId: oldAtom.id,
        details: JSON.stringify({
          replacedBy: params.replacedBy,
          replacementReason: params.replacementReason,
          newAtomId: newAtom.id,
          affectedLearnerCount: affectedLearners.length,
          affectedAssignmentIds: affectedLearners.map((l) => l.assignmentId),
        }),
      },
    });

    return { oldAtom: supersededOld, newAtom, affectedLearners };
  }
}

export const contentSupersessionServiceSingleton = (prisma: PrismaClient, tenantId: string) =>
  new ContentSupersessionService(prisma, tenantId);
