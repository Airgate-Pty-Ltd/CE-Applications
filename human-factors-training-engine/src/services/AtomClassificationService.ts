/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient, LearningAtom } from '@prisma/client';
import { mostRestrictive, isLessRestrictive } from '@/lib/classificationRank';
import { toDbArray } from '@/lib/json';

/**
 * Classification inheritance for content derived from evidence (C-006,
 * PHASE-3-RUN-DIRECTIVE.md WP-2 §1).
 *
 * Atoms derived from evidence inherit the most restrictive classification of their sources
 * automatically. Manual loosening (creating an atom LESS restrictive than its most-restrictive
 * source) requires a linked, APPROVED MaiApproval record — without one, creation is rejected.
 */
export class AtomClassificationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Resolve the classification an atom derived from the given evidence should carry.
   * - No requestedClassification: inherits the most restrictive source classification.
   * - requestedClassification at or above (more/equally restrictive than) the inherited floor:
   *   allowed, no approval needed.
   * - requestedClassification below the inherited floor (a deliberate loosening): requires
   *   approvalId to reference an existing MaiApproval row with decision APPROVED and
   *   approvalType 'CLASSIFICATION_LOOSENING' for a matching subject — otherwise throws.
   */
  async resolveClassification(params: {
    tenantId: string;
    sourceEvidenceIds: string[];
    requestedClassification?: string;
    approvalId?: string;
  }): Promise<{ classification: string; inheritedFloor: string; wasLoosened: boolean }> {
    if (params.sourceEvidenceIds.length === 0) {
      // No source evidence — nothing to inherit from; caller's requested classification (or
      // the schema default) stands as-is. This is content authored without evidence grounding
      // (e.g. a manually-written atom with no linked source), a legitimate case.
      return {
        classification: params.requestedClassification ?? 'INTERNAL',
        inheritedFloor: 'INTERNAL',
        wasLoosened: false,
      };
    }

    const sources = await this.prisma.hfEvidence.findMany({
      where: { tenantId: params.tenantId, id: { in: params.sourceEvidenceIds } },
      select: { id: true, classification: true },
    });
    if (sources.length !== params.sourceEvidenceIds.length) {
      const foundIds = new Set(sources.map((s) => s.id));
      const missing = params.sourceEvidenceIds.filter((id) => !foundIds.has(id));
      throw new Error(`Source evidence not found: ${missing.join(', ')}`);
    }

    const inheritedFloor = mostRestrictive(sources.map((s) => s.classification));

    if (!params.requestedClassification || params.requestedClassification === inheritedFloor) {
      return { classification: inheritedFloor, inheritedFloor, wasLoosened: false };
    }

    if (!isLessRestrictive(params.requestedClassification, inheritedFloor)) {
      // Requested classification is EQUAL OR MORE restrictive than the floor — always allowed,
      // no approval needed (tightening never needs permission).
      return { classification: params.requestedClassification, inheritedFloor, wasLoosened: false };
    }

    // Deliberate loosening — requires an approved, linked approval record.
    if (!params.approvalId) {
      throw new Error(
        `Cannot create content classified "${params.requestedClassification}" from evidence whose ` +
          `most restrictive source is "${inheritedFloor}" without an approval record. ` +
          `Manual loosening requires an APPROVED MaiApproval (approvalType: CLASSIFICATION_LOOSENING).`
      );
    }

    const approval = await this.prisma.maiApproval.findFirst({
      where: { id: params.approvalId, tenantId: params.tenantId },
    });
    if (
      !approval ||
      approval.approvalType !== 'CLASSIFICATION_LOOSENING' ||
      approval.decision !== 'APPROVED'
    ) {
      throw new Error(
        `Approval ${params.approvalId} does not authorize classification loosening ` +
          `(must exist, approvalType='CLASSIFICATION_LOOSENING', decision='APPROVED').`
      );
    }

    return { classification: params.requestedClassification, inheritedFloor, wasLoosened: true };
  }

  /**
   * Create a LearningAtom with classification resolved/enforced per resolveClassification()
   * above. This is the enforcement point — atoms created through this method cannot bypass
   * the inheritance rule; atoms created via a raw prisma.learningAtom.create() call elsewhere
   * in the codebase (pre-existing call sites, seed data, other services) are NOT retrofitted
   * by this change (see DECISIONS.md D-026 for scope).
   */
  async createAtom(params: {
    title: string;
    objective: string;
    format: string;
    duration?: number;
    content?: string;
    sourceEvidenceIds: string[];
    requestedClassification?: string;
    approvalId?: string;
    tenantId: string;
    assessmentQuestion?: {
      questionText: string;
      options: string[];
      correctAnswers: string[];
      explanation?: string;
    };
  }): Promise<LearningAtom> {
    const { classification } = await this.resolveClassification({
      tenantId: params.tenantId,
      sourceEvidenceIds: params.sourceEvidenceIds,
      requestedClassification: params.requestedClassification,
      approvalId: params.approvalId,
    });

    return this.prisma.learningAtom.create({
      data: {
        tenantId: params.tenantId,
        title: params.title,
        objective: params.objective,
        format: params.format,
        duration: params.duration,
        content: params.content,
        classification,
        sourceEvidenceIds: toDbArray(params.sourceEvidenceIds),
        status: 'DRAFT',
        assessmentQuestions: params.assessmentQuestion ? {
          create: {
            tenantId: params.tenantId,
            questionText: params.assessmentQuestion.questionText,
            options: toDbArray(params.assessmentQuestion.options),
            correctAnswers: toDbArray(params.assessmentQuestion.correctAnswers),
            explanation: params.assessmentQuestion.explanation,
          },
        } : undefined,
      },
    });
  }
}

export const atomClassificationServiceSingleton = (prisma: PrismaClient) =>
  new AtomClassificationService(prisma);
