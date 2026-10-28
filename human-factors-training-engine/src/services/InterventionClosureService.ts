/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient, LearningIntervention } from '@prisma/client';
import { AtomCompletionService } from './AtomCompletionService';

/**
 * Intervention Closure: PHASE-1-SPECIFICATION.md §2 step 9 (C-009 final step).
 *
 * Closure is a system-computed consequence of recorded evidence meeting the plan's target
 * level — never journaling completion alone. Level ordering: COMPLETION(1) < KNOWLEDGE_SKILL(2)
 * < WORKPLACE_TRANSFER(3) < OPERATIONAL_IMPACT(4). `actor: null` on the audit row is
 * intentional (AuditLog.actor is a FK to User; there is no human actor for a system-computed
 * closure — "system" is recorded in the action/details text, not fabricated as a user id).
 *
 * Updated 2026-08-06 (WP-2 §2, closes C-009): closure now ALSO requires that the assignment
 * backing the qualifying effectiveness evidence has every atom in its frozen manifest marked
 * complete (AtomCompletionService). Effectiveness evidence recorded against an assignment
 * whose atoms were never marked done is a data-integrity anomaly, not a legitimate closure —
 * this is a governance-strengthening change, not a relaxation. Evidence with no linked
 * assignmentId cannot be checked this way (nothing to check completion against) and is
 * accepted as before, unchanged.
 */
const LEVEL_RANK: Record<string, number> = {
  COMPLETION: 1,
  KNOWLEDGE_SKILL: 2,
  WORKPLACE_TRANSFER: 3,
  OPERATIONAL_IMPACT: 4,
};

export class InterventionClosureService {
  private atomCompletionService: AtomCompletionService;

  constructor(private prisma: PrismaClient) {
    this.atomCompletionService = new AtomCompletionService(prisma);
  }

  /**
   * Check whether any recorded effectiveness evidence meets or exceeds the intervention's
   * target level; if so, close it. Idempotent — re-running on an already-closed intervention
   * is a no-op. Returns the intervention (updated if closure occurred) and whether closure
   * happened on THIS call.
   */
  async checkAndClose(interventionId: string): Promise<{
    intervention: LearningIntervention;
    closedNow: boolean;
    reason: string;
  }> {
    const intervention = await this.prisma.learningIntervention.findUniqueOrThrow({
      where: { id: interventionId },
    });

    if (intervention.closureStatus === 'CLOSED') {
      return { intervention, closedNow: false, reason: 'Already closed' };
    }

    const targetRank = LEVEL_RANK[intervention.effectivenessTargetLevel] ?? 1;

    const evidenceRows = await this.prisma.effectivenessEvidence.findMany({
      where: { interventionId, supportsClosureAtLevel: true },
    });

    const highestRank = evidenceRows.reduce((max, e) => {
      const rank = LEVEL_RANK[e.level] ?? 0;
      return rank > max ? rank : max;
    }, 0);

    if (highestRank < targetRank) {
      return {
        intervention,
        closedNow: false,
        reason: `Highest recorded evidence level (rank ${highestRank}) below target (rank ${targetRank}: ${intervention.effectivenessTargetLevel})`,
      };
    }

    // Atom-completion gate (C-009): the qualifying evidence row must be backed by an
    // assignment whose atoms are all marked complete.
    const qualifyingEvidence = evidenceRows.find((e) => (LEVEL_RANK[e.level] ?? 0) >= targetRank);
    if (qualifyingEvidence?.assignmentId) {
      const completion = await this.atomCompletionService.getCompletionStatus(qualifyingEvidence.assignmentId);
      if (!completion.allComplete) {
        return {
          intervention,
          closedNow: false,
          reason: `Effectiveness evidence meets target level, but assignment ${qualifyingEvidence.assignmentId} has ${completion.remainingAtomIds.length} incomplete atom(s) — closure requires full atom completion, not evidence alone.`,
        };
      }
    }

    const closed = await this.prisma.learningIntervention.update({
      where: { id: interventionId },
      data: { closureStatus: 'CLOSED', closedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: intervention.tenantId,
        actor: null,
        action: 'intervention_closed',
        object: 'LearningIntervention',
        objectId: interventionId,
        details: JSON.stringify({
          reason: 'effectiveness_target_level_met',
          targetLevel: intervention.effectivenessTargetLevel,
          highestEvidenceRank: highestRank,
          system: true,
        }),
      },
    });

    return { intervention: closed, closedNow: true, reason: 'effectiveness_target_level_met' };
  }
}

export const interventionClosureServiceSingleton = (prisma: PrismaClient) =>
  new InterventionClosureService(prisma);
