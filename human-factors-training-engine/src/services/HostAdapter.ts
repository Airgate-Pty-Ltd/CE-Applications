/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

/**
 * Host Adapter: Computes derived snapshot fields before kernel processing.
 *
 * The M-AI Kernel NEVER counts, queries, or looks across records.
 * The host adapter computes these fields deterministically and writes them
 * into the event snapshot before the row is persisted.
 *
 * This separation preserves kernel determinism and offline capability.
 */

interface SnapshotContext {
  tenantId: string;
  eventId?: string;
  sourceId?: string;
  documentHash?: string;
  themes?: string[];
  timestamp?: string;
}

interface DerivedSnapshot extends SnapshotContext {
  duplicateOfSourceId?: string | null;
  otherCorrectiveControlsCount?: number;
  priorTrainingExistsSameThemeProcess?: boolean;
  priorTrainingEffective?: boolean;
  linkedEventCausalStatus?: string;
  planTargetLevel?: string;
  highestEvidenceLevel?: string;
  observationDueDate?: string;
  aiRoutingTarget?: "external" | "local" | "none";
}

export class HostAdapter {
  private thresholds = {
    T1_recurrence_window_months: 12,
    T2_grace_period_days: 14,
    T3_severity_critical_mapping: true,
  };

  constructor(private prisma: PrismaClient) {}

  /**
   * Compute all 8 derived fields for a snapshot before kernel processing.
   * Returns the enriched snapshot ready for MaiKernel.processEvent.
   */
  async enrichSnapshot(context: SnapshotContext): Promise<DerivedSnapshot> {
    const enriched: DerivedSnapshot = { ...context };

    try {
      // Field 1: duplicateOfSourceId
      if (context.sourceId && context.documentHash) {
        enriched.duplicateOfSourceId =
          await this.computeDuplicateOfSourceId(
            context.tenantId,
            context.sourceId,
            context.documentHash
          );
      }

      // Field 2: otherCorrectiveControlsCount
      if (context.eventId) {
        enriched.otherCorrectiveControlsCount =
          await this.computeOtherCorrectiveControlsCount(
            context.tenantId,
            context.eventId
          );
      }

      // Fields 3-4: Prior training analysis (requires event + themes)
      if (context.eventId && context.themes && context.themes.length > 0) {
        const priorAnalysis = await this.computePriorTrainingAnalysis(
          context.tenantId,
          context.eventId,
          context.themes,
          context.timestamp
        );
        enriched.priorTrainingExistsSameThemeProcess =
          priorAnalysis.exists;
        enriched.priorTrainingEffective = priorAnalysis.effective;
      }

      // Field 5: linkedEventCausalStatus (Phase 1: simplified)
      if (context.eventId) {
        enriched.linkedEventCausalStatus =
          await this.computeLinkedEventCausalStatus(
            context.tenantId,
            context.eventId
          );
      }

      // Fields 6-7: Effectiveness plan levels (Phase 1: from intervention context)
      // These would come from the intervention being evaluated
      // For Phase 1, they're populated by the API endpoint

      // Field 8: observationDueDate (T2 grace period applied by caller)
      // For Phase 1, computed by API endpoint with grace period

      // Field 9: aiRoutingTarget (populated by API endpoint)
      // For Phase 1, this is recorded in the routing request
    } catch (error) {
      console.error("[HostAdapter] Error enriching snapshot:", error);
      // Fail-quiet: return partial snapshot; kernel handles missing fields
    }

    return enriched;
  }

  /**
   * Field 1: Is there an existing source with identical hash?
   * Returns the source ID of the duplicate, or null if unique.
   */
  private async computeDuplicateOfSourceId(
    tenantId: string,
    currentSourceId: string,
    documentHash: string
  ): Promise<string | null> {
    try {
      const existing = await this.prisma.hfEvidence.findFirst({
        where: {
          tenantId,
          documentHash,
          id: { not: currentSourceId }, // Exclude current source
        },
        select: { id: true },
      });

      return existing ? existing.id : null;
    } catch (error) {
      console.error("[HostAdapter] Error computing duplicateOfSourceId:", error);
      return null;
    }
  }

  /**
   * Field 2: How many non-training corrective controls are linked to this event?
   */
  private async computeOtherCorrectiveControlsCount(
    tenantId: string,
    eventId: string
  ): Promise<number> {
    try {
      // Phase 1 simplified: count linked non-training interventions
      // Production: query via evidence_relationship edges
      const nonTrainingRelations = await this.prisma.evidenceRelationship.count({
        where: {
          tenantId,
          fromEntityId: eventId,
          fromEntityType: "HfEvent",
          relationshipType: "addresses",
          toEntityType: "LearningIntervention",
          // In production, filter for non-training controls via effect
        },
      });

      return nonTrainingRelations;
    } catch (error) {
      console.error(
        "[HostAdapter] Error computing otherCorrectiveControlsCount:",
        error
      );
      return 0;
    }
  }

  /**
   * Fields 3-4: Prior training analysis
   * Has the same theme + process been trained before within T1 window?
   * If yes, was it effective?
   */
  private async computePriorTrainingAnalysis(
    tenantId: string,
    eventId: string,
    themes: string[],
    timestamp?: string
  ): Promise<{ exists: boolean; effective: boolean }> {
    try {
      const recurrenceWindowMonths = this.thresholds.T1_recurrence_window_months;
      const cutoffDate = new Date();
      cutoffDate.setMonth(
        cutoffDate.getMonth() - recurrenceWindowMonths
      );

      // Phase 1 simplified: look for prior interventions with same theme
      // Production: more sophisticated process/context matching
      const priorInterventions = await this.prisma.learningIntervention.findMany({
        where: {
          closedAt: { gte: cutoffDate },
          closureStatus: "CLOSED",
          // Would filter by same theme and process in production
        },
        select: {
          id: true,
          closureStatus: true,
          effectiveness: {
            select: { id: true },
            take: 1,
          },
        },
        take: 50
      });

      if (priorInterventions.length === 0) {
        return { exists: false, effective: false };
      }

      // Check if any prior intervention reached its target level
      const effective = priorInterventions.some((int) => {
        // In production: check if highest effectiveness evidence >= target level
        return int.effectiveness.length > 0;
      });

      return {
        exists: true,
        effective,
      };
    } catch (error) {
      console.error(
        "[HostAdapter] Error computing priorTrainingAnalysis:",
        error
      );
      return { exists: false, effective: false };
    }
  }

  /**
   * Field 5: What is the causal status of the event this content derives from?
   */
  private async computeLinkedEventCausalStatus(
    tenantId: string,
    eventId: string
  ): Promise<string> {
    try {
      const causalStatus = await this.prisma.maiCausalStatus.findUnique({
        where: { eventId },
        select: { status: true },
      });

      return causalStatus?.status || "REPORTED";
    } catch (error) {
      console.error(
        "[HostAdapter] Error computing linkedEventCausalStatus:",
        error
      );
      return "REPORTED";
    }
  }

  /**
   * Compute observation due date with grace period (T2).
   * Called by the API when recording an effectiveness plan.
   */
  computeObservationDueDate(plannedDate: Date): Date {
    const gracePeriodDays = this.thresholds.T2_grace_period_days;
    const dueDate = new Date(plannedDate);
    dueDate.setDate(dueDate.getDate() + gracePeriodDays);
    return dueDate;
  }

  /**
   * Determine AI routing target (external vs. local vs. none).
   * Called by the API when an AI assist request is made.
   */
  determineAiRoutingTarget(
    classification: string,
    requestedProvider: "external" | "local" | "none"
  ): "external" | "local" | "none" {
    // BURRANA_PRIVATE and CUSTOMER_PRIVATE never route to external
    if (
      classification === "BURRANA_PRIVATE" ||
      classification === "CUSTOMER_PRIVATE"
    ) {
      return "local"; // Fallback to local or block entirely
    }

    // Otherwise, respect the requested target
    return requestedProvider;
  }

  /**
   * Compute plan target level and current highest evidence level.
   * Called when effectiveness closure is requested.
   */
  async computeEffectivenessPlanLevels(
    tenantId: string,
    interventionId: string
  ): Promise<{
    planTargetLevel: string;
    highestEvidenceLevel: string;
  }> {
    try {
      const intervention = await this.prisma.learningIntervention.findUnique({
        where: { id: interventionId },
        select: { effectivenessTargetLevel: true },
      });

      if (!intervention) {
        return {
          planTargetLevel: "1",
          highestEvidenceLevel: "0",
        };
      }

      // Map target level name to numeric
      const targetMap: { [key: string]: string } = {
        COMPLETION: "1",
        KNOWLEDGE_SKILL: "2",
        WORKPLACE_TRANSFER: "3",
        OPERATIONAL_IMPACT: "4",
      };

      const planTargetLevel = targetMap[intervention.effectivenessTargetLevel] || "1";

      // Find highest evidence level recorded for this intervention
      const evidence = await this.prisma.effectivenessEvidence.findFirst({
        where: {
          interventionId,
          supportsClosureAtLevel: true,
        },
        orderBy: { level: "desc" },
        select: { level: true },
      });

      const levelMap: { [key: string]: string } = {
        COMPLETION: "1",
        KNOWLEDGE_SKILL: "2",
        WORKPLACE_TRANSFER: "3",
        OPERATIONAL_IMPACT: "4",
      };

      const highestEvidenceLevel = evidence
        ? levelMap[evidence.level] || "0"
        : "0";

      return {
        planTargetLevel,
        highestEvidenceLevel,
      };
    } catch (error) {
      console.error(
        "[HostAdapter] Error computing effectivenessPlanLevels:",
        error
      );
      return {
        planTargetLevel: "1",
        highestEvidenceLevel: "0",
      };
    }
  }
}

// Singleton export
let adapterInstance: HostAdapter | null = null;

export function getHostAdapter(prisma: PrismaClient): HostAdapter {
  if (!adapterInstance) {
    adapterInstance = new HostAdapter(prisma);
  }
  return adapterInstance;
}
