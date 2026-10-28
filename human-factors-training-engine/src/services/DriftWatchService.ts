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
 * Drift Watch: Phase 3 WP-4 product-core increment.
 *
 * Advisory analytics only — NOT a kernel condition. No approved Rev-A rule covers
 * "rising theme with no training coverage" (see OPEN-QUESTIONS.md Q-007); this
 * service therefore carries no MaiKernel authority and never creates a
 * MaiSystemCondition. It reports theme frequency vs. training coverage so a QM
 * can decide whether to act — the decision, and any resulting intervention, stays
 * entirely human-initiated, consistent with every other human-authority workflow
 * in this system.
 */

export const DEFAULT_WINDOW_MONTHS = 6;
export const DEFAULT_RISING_THRESHOLD = 2; // >= this many events with the theme in-window

export type ThemeCoverageStatus = 'RISING_UNCOVERED' | 'COVERED' | 'BELOW_THRESHOLD';

export interface ThemeDrift {
  theme: string;
  occurrenceCount: number;
  eventIds: string[];
  coveringAtomIds: string[];
  status: ThemeCoverageStatus;
}

export class DriftWatchService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * For every theme appearing on an HfEvent within the window, count occurrences
   * and determine whether any APPROVED LearningAtom traces back to an event
   * carrying that theme (via EvidenceRelationship ADDRESSES edges, the same graph
   * TraceabilityGraph.findAtomsForEvent() walks — never a shortcut through a
   * denormalized field).
   */
  async computeDrift(
    windowMonths: number = DEFAULT_WINDOW_MONTHS,
    risingThreshold: number = DEFAULT_RISING_THRESHOLD,
    tenantId?: string,
  ): Promise<ThemeDrift[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - windowMonths);

    const events = await this.prisma.hfEvent.findMany({
      where: { occurredAt: { gte: since }, ...(tenantId ? { tenantId } : {}) },
    });

    const byTheme = new Map<string, string[]>();
    for (const event of events) {
      const themes = fromDbArray<string>(event.themes);
      for (const theme of themes) {
        const list = byTheme.get(theme) || [];
        list.push(event.id);
        byTheme.set(theme, list);
      }
    }

    const results: ThemeDrift[] = [];
    for (const [theme, eventIds] of byTheme.entries()) {
      const coveringAtomIds = await this.findCoveringAtoms(eventIds, tenantId);
      const occurrenceCount = eventIds.length;
      let status: ThemeCoverageStatus;
      if (occurrenceCount < risingThreshold) {
        status = 'BELOW_THRESHOLD';
      } else if (coveringAtomIds.length === 0) {
        status = 'RISING_UNCOVERED';
      } else {
        status = 'COVERED';
      }
      results.push({ theme, occurrenceCount, eventIds, coveringAtomIds, status });
    }

    return results.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
  }

  /** Real ADDRESSES-edge traversal — same graph TraceabilityGraph uses, not a shortcut. */
  private async findCoveringAtoms(eventIds: string[], tenantId?: string): Promise<string[]> {
    if (eventIds.length === 0) return [];

    const relationships = await this.prisma.evidenceRelationship.findMany({
      where: { fromEntityType: 'HfEvent', fromEntityId: { in: eventIds }, toEntityType: 'LearningIntervention', relationshipType: 'ADDRESSES', ...(tenantId ? { tenantId } : {}) },
    });
    const interventionIds = [...new Set(relationships.map((r) => r.toEntityId))];
    if (interventionIds.length === 0) return [];

    const interventions = await this.prisma.learningIntervention.findMany({
      where: { id: { in: interventionIds } },
    });

    const atomIds = new Set<string>();
    for (const intervention of interventions) {
      for (const atomId of fromDbArray<string>(intervention.atomIds)) atomIds.add(atomId);
    }
    if (atomIds.size === 0) return [];

    const approvedAtoms = await this.prisma.learningAtom.findMany({
      where: { id: { in: [...atomIds] }, status: 'APPROVED' },
    });
    return approvedAtoms.map((a) => a.id);
  }
}
