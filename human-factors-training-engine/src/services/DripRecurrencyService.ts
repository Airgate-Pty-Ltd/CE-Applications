/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';
import { fromDbArray } from '@/lib/json';

/**
 * Drip Recurrency: Phase 3 WP-4 product-core increment.
 *
 * Some atoms (short-form, shift-brief-cadence scenario content) are meant to be
 * re-delivered repeatedly rather than completed once — LearningAtom.recurrenceRule
 * (an existing, previously-unused schema field) names the cadence. Each delivery
 * is its own DripDelivery row (see prisma/schema.prisma), distinct from
 * AtomCompletion's once-only per-assignment-per-atom record.
 *
 * CADENCE_DAYS values are operational scheduling defaults, not regulatory content.
 */
export const CADENCE_DAYS: Record<string, number> = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 30,
};

export interface DripDueItem {
  assignmentId: string;
  atomId: string;
  atomTitle: string;
  cadence: string;
  lastDeliveredAt: Date | null;
  nextDueAt: Date;
  isDue: boolean;
}

export class DripRecurrencyService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  isDripAtom(recurrenceRule: string | null | undefined): boolean {
    return !!recurrenceRule && recurrenceRule in CADENCE_DAYS;
  }

  async getLastDelivery(assignmentId: string, atomId: string): Promise<Date | null> {
    const last = await this.prisma.dripDelivery.findFirst({
      where: { assignmentId, atomId },
      orderBy: { deliveredAt: 'desc' },
    });
    return last?.deliveredAt ?? null;
  }

  /** Record a real delivery — never inferred, only written when the learner actually received it. */
  async recordDelivery(assignmentId: string, atomId: string): Promise<{ id: string; deliveredAt: Date }> {
    const delivery = await this.prisma.dripDelivery.create({ data: { assignmentId, atomId } });
    return { id: delivery.id, deliveredAt: delivery.deliveredAt };
  }

  computeNextDueAt(cadence: string, lastDeliveredAt: Date | null): Date {
    if (!lastDeliveredAt) return new Date(0); // never delivered -> due immediately
    const days = CADENCE_DAYS[cadence];
    return new Date(lastDeliveredAt.getTime() + days * 24 * 60 * 60 * 1000);
  }

  /** For every drip atom in a learner's active assignments, is a redelivery due now? */
  async getDueDripDeliveries(
    learnerId: string,
    now: Date = new Date(),
    tenantId?: string,
  ): Promise<DripDueItem[]> {
    const assignments = await this.prisma.trainingAssignment.findMany({
      where: {
        learnerId,
        ...(tenantId ? { tenantId } : {}),
        status: { in: ['ASSIGNED', 'IN_PROGRESS', 'PASSED'] },
      },
      include: { manifest: true },
    });

    const results: DripDueItem[] = [];
    for (const assignment of assignments) {
      const baseline = fromDbArray<{ atomId: string }>(assignment.manifest.baselineContent);
      const atomIds = baseline.map((b) => b.atomId).filter(Boolean);
      if (atomIds.length === 0) continue;

      const atoms = await this.prisma.learningAtom.findMany({
        where: { id: { in: atomIds }, ...(tenantId ? { tenantId } : {}) },
      });
      for (const atom of atoms) {
        if (!this.isDripAtom(atom.recurrenceRule)) continue;

        const lastDeliveredAt = await this.getLastDelivery(assignment.id, atom.id);
        const nextDueAt = this.computeNextDueAt(atom.recurrenceRule as string, lastDeliveredAt);
        results.push({
          assignmentId: assignment.id,
          atomId: atom.id,
          atomTitle: atom.title,
          cadence: atom.recurrenceRule as string,
          lastDeliveredAt,
          nextDueAt,
          isDue: nextDueAt.getTime() <= now.getTime(),
        });
      }
    }
    return results;
  }
}
