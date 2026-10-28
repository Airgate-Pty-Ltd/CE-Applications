/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';

/**
 * Honest Dashboard Builder: Phase 2 governance increment
 *
 * Dashboards must explicitly show absent-data states, not assume OK.
 * A missing supervisor observation is NOT "effective"; it's "unverified".
 * A missing assessment is NOT "passed"; it's "incomplete".
 *
 * Rules: honest-data only, no inference, no defaults, no optimistic assumptions.
 */

export interface DashboardEntry {
  interventionId: string;
  title: string;
  // Real LearningIntervention.status values are uppercase (DRAFT, DESIGNED, APPROVED,
  // PUBLISHED, ACTIVE, CLOSED, RECALLED). Fixed 2026-08-06: this was previously typed as a
  // lowercase-only union ('draft'|'active'|'closed') set via `as any`, and
  // buildQualityManagerDashboard() compared it against the literal 'active' — a comparison
  // that could never be true against real data, silently reporting 0 active interventions
  // regardless of actual state. Typed as the real string set, no `any` cast.
  status: string;
  assignmentCount: number;
  completionStats: {
    assigned: number;
    completed: number;
    passed: number;
    failed: number;
    unverified: number; // Explicit absent-data state
  };
  effectivenessStats: {
    observed: number;
    unobserved: number; // Explicit absent-data state: no supervisor observation
    atTargetLevel: number;
    belowTargetLevel: number;
  };
  dataQuality: {
    complete: boolean;
    missingObservations: number;
    missingAssessments: number;
    evidence: string[];
  };
}

export class HonestDashboardBuilder {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Build dashboard for one intervention with honest data states.
   */
  async buildInterventionDashboard(interventionId: string): Promise<DashboardEntry> {
    const intervention = await this.prisma.learningIntervention.findUnique({
      where: { id: interventionId }
    });

    if (!intervention) {
      throw new Error('Intervention not found');
    }

    // Load all assignments for THIS intervention.
    // Fixed 2026-08-06: previously had no `interventionId` filter at all — every
    // intervention's dashboard was built from ALL assignments system-wide, so distinct
    // interventions would show identical (and wrong) counts. Caught writing
    // HonestDashboardBuilder.test.ts's two-intervention isolation case.
    const assignments = await this.prisma.trainingAssignment.findMany({
      where: {
        interventionId,
        status: { in: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'PASSED', 'FAILED'] }
      }
    });

    // Count by status: assigned, completed, passed, failed, unverified
    const assigned = assignments.filter(a => a.status === 'ASSIGNED').length;
    const completed = assignments.filter(a => ['COMPLETED', 'PASSED', 'FAILED'].includes(a.status || '')).length;
    const passed = assignments.filter(a => a.status === 'PASSED').length;
    const failed = assignments.filter(a => a.status === 'FAILED').length;
    // Fixed 2026-08-06: was `assigned - completed`, subtracting two DISJOINT status subsets
    // (status==='ASSIGNED' minus status-in-completed-set) — any IN_PROGRESS assignment was
    // counted in neither, silently vanishing from both counts instead of showing as
    // unverified. Total minus completed captures every non-terminal status honestly.
    const unverified = assignments.length - completed; // Not yet assessed (any non-terminal status)

    // Load effectiveness observations for this intervention
    const observations = await this.prisma.supervisorObservation.findMany({
      where: {
        interventionId
      }
    });

    const observed = observations.length;
    const unobserved = assignments.length - observed; // EXPLICIT absent-data state
    const atTargetLevel = observations.filter(o => o.effectivenessLevel === 'WORKPLACE_TRANSFER').length;
    const belowTargetLevel = observations.filter(o => o.effectivenessLevel !== 'WORKPLACE_TRANSFER').length;

    // Data quality assessment (honest)
    const evidence: string[] = [];
    const missingObservations = unobserved;
    const missingAssessments = unverified;

    if (missingObservations > 0) {
      evidence.push(`${missingObservations} assignments lack supervisor observations (unverified effectiveness)`);
    }
    if (missingAssessments > 0) {
      evidence.push(`${missingAssessments} assignments not yet assessed (completion status unknown)`);
    }
    if (failed > 0) {
      evidence.push(`${failed} learners failed assessment (retraining needed)`);
    }

    const isComplete = missingObservations === 0 && missingAssessments === 0 && failed === 0;

    return {
      interventionId,
      title: intervention.title,
      status: intervention.status,
      assignmentCount: assignments.length,
      completionStats: {
        assigned,
        completed,
        passed,
        failed,
        unverified // Explicit: not assessed yet
      },
      effectivenessStats: {
        observed,
        unobserved, // Explicit: no observation recorded
        atTargetLevel,
        belowTargetLevel
      },
      dataQuality: {
        complete: isComplete,
        missingObservations,
        missingAssessments,
        evidence
      }
    };
  }

  /**
   * Build quality manager dashboard: all interventions with honest status.
   */
  async buildQualityManagerDashboard(): Promise<{
    interventions: DashboardEntry[];
    summary: {
      totalInterventions: number;
      activeInterventions: number;
      completeData: number;
      incompleteData: number;
      healthRisk: string[]; // Interventions with missing data
    };
  }> {
    const interventions = await this.prisma.learningIntervention.findMany({
      take: 100 // Limit for safety
    });

    const dashboards = await Promise.all(
      interventions.map(int => this.buildInterventionDashboard(int.id))
    );

    const complete = dashboards.filter(d => d.dataQuality.complete).length;
    const incomplete = dashboards.filter(d => !d.dataQuality.complete).length;
    const healthRisks = dashboards
      .filter(d => !d.dataQuality.complete)
      .map(d => `${d.title}: ${d.dataQuality.evidence.join('; ')}`);

    return {
      interventions: dashboards,
      summary: {
        totalInterventions: interventions.length,
        activeInterventions: dashboards.filter(d => d.status === 'ACTIVE').length,
        completeData: complete,
        incompleteData: incomplete,
        healthRisk: healthRisks
      }
    };
  }
}

export const honestDashboardBuilderSingleton = (prisma: PrismaClient) =>
  new HonestDashboardBuilder(prisma);
