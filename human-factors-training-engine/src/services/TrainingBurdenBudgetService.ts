/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';
import { toDb, fromDb } from '@/lib/json';

/**
 * Training Burden Budget: Phase 3 WP-4 product-core increment.
 *
 * Caps how many minutes of training a learner can be assigned within a rolling
 * window. When compiling/assigning a new intervention would push a learner over
 * the cap, the assignment is NOT silently created — it is queued as a disposition
 * (a PENDING MaiApproval, approvalType BURDEN_BUDGET_OVERRIDE) for a human (QM/
 * supervisor) to resolve: approve the override, or hold the assignment.
 *
 * DEFAULT_BUDGET_MINUTES / DEFAULT_WINDOW_DAYS are operational defaults, not a
 * regulatory requirement — configurable per call, never presented as compliance
 * content.
 */

export const DEFAULT_BUDGET_MINUTES = 240; // 4 hours
export const DEFAULT_WINDOW_DAYS = 30;

export interface BurdenCheckResult {
  learnerId: string;
  currentMinutes: number;
  incomingMinutes: number;
  projectedMinutes: number;
  capMinutes: number;
  windowDays: number;
  withinBudget: boolean;
}

export interface BurdenDisposition {
  id: string;
  learnerId: string;
  interventionId: string;
  decision: string;
  currentMinutes: number;
  incomingMinutes: number;
  projectedMinutes: number;
  capMinutes: number;
  createdAt: Date;
  decidedBy: string | null;
  decidedAt: Date | null;
}

export class TrainingBurdenBudgetService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /** Sum the duration (minutes) of every atom in every manifest assigned to this learner within the window. */
  async computeLearnerBurden(learnerId: string, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<number> {
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const assignments = await this.prisma.trainingAssignment.findMany({
      where: { learnerId, assignedAt: { gte: since } },
      include: { manifest: true },
    });

    let totalMinutes = 0;
    for (const assignment of assignments) {
      const baseline = fromDb<Array<{ atomId: string }>>(assignment.manifest.baselineContent);
      const atomIds = Array.isArray(baseline) ? baseline.map((b) => b.atomId).filter(Boolean) : [];
      if (atomIds.length === 0) continue;
      const atoms = await this.prisma.learningAtom.findMany({ where: { id: { in: atomIds } } });
      totalMinutes += atoms.reduce((sum, a) => sum + (a.duration || 0), 0);
    }
    return totalMinutes;
  }

  /** Would assigning `incomingMinutes` more push this learner over the rolling-window cap? */
  async checkBudget(
    learnerId: string,
    incomingMinutes: number,
    windowDays: number = DEFAULT_WINDOW_DAYS,
    capMinutes: number = DEFAULT_BUDGET_MINUTES
  ): Promise<BurdenCheckResult> {
    const currentMinutes = await this.computeLearnerBurden(learnerId, windowDays);
    const projectedMinutes = currentMinutes + incomingMinutes;
    return {
      learnerId,
      currentMinutes,
      incomingMinutes,
      projectedMinutes,
      capMinutes,
      windowDays,
      withinBudget: projectedMinutes <= capMinutes,
    };
  }

  /** Queue a disposition (human decision required) rather than silently over-assigning. */
  async queueDisposition(params: {
    tenantId: string;
    learnerId: string;
    interventionId: string;
    check: BurdenCheckResult;
    requestedBy: string;
    rationale?: string;
  }): Promise<string> {
    const approval = await this.prisma.maiApproval.create({
      data: {
        tenantId: params.tenantId,
        approvalType: 'BURDEN_BUDGET_OVERRIDE',
        subjectId: `${params.learnerId}:${params.interventionId}`,
        subjectType: 'TrainingBurdenDisposition',
        decision: 'PENDING',
        rationale: params.rationale || `Requested by ${params.requestedBy}: projected ${params.check.projectedMinutes}min exceeds ${params.check.capMinutes}min cap over ${params.check.windowDays}d.`,
        conditionsImposed: toDb(params.check),
      },
    });
    return approval.id;
  }

  async getPendingDispositions(tenantId: string): Promise<BurdenDisposition[]> {
    const rows = await this.prisma.maiApproval.findMany({
      where: { tenantId, approvalType: 'BURDEN_BUDGET_OVERRIDE', decision: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toDisposition(r));
  }

  async resolveDisposition(dispositionId: string, decision: 'APPROVED' | 'REJECTED', decidedBy: string, rationale?: string): Promise<BurdenDisposition> {
    const row = await this.prisma.maiApproval.update({
      where: { id: dispositionId },
      data: { decision, decidedBy, decidedAt: new Date(), rationale: rationale || undefined },
    });
    return this.toDisposition(row);
  }

  /** Has this exact learner+intervention pair already received an APPROVED override? */
  async hasApprovedOverride(learnerId: string, interventionId: string): Promise<boolean> {
    const existing = await this.prisma.maiApproval.findFirst({
      where: {
        approvalType: 'BURDEN_BUDGET_OVERRIDE',
        subjectId: `${learnerId}:${interventionId}`,
        decision: 'APPROVED',
      },
    });
    return !!existing;
  }

  private toDisposition(row: { id: string; subjectId: string; decision: string; createdAt: Date; decidedBy: string | null; decidedAt: Date | null; conditionsImposed: string | null }): BurdenDisposition {
    const [learnerId, interventionId] = row.subjectId.split(':');
    const check = fromDb<BurdenCheckResult>(row.conditionsImposed);
    return {
      id: row.id,
      learnerId,
      interventionId,
      decision: row.decision,
      currentMinutes: check.currentMinutes ?? 0,
      incomingMinutes: check.incomingMinutes ?? 0,
      projectedMinutes: check.projectedMinutes ?? 0,
      capMinutes: check.capMinutes ?? DEFAULT_BUDGET_MINUTES,
      createdAt: row.createdAt,
      decidedBy: row.decidedBy,
      decidedAt: row.decidedAt,
    };
  }
}
