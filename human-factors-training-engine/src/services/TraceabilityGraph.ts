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
 * Traceability Graph: forward and reverse queries for evidence relationships.
 *
 * Forward: Event → Intervention → Atoms (what lessons address this incident?)
 * Reverse: Atom ← Intervention ← Event (what risks does this lesson address?)
 * Recall: Atom (superseded) → Find learners with old atom (for content recall)
 */
export class TraceabilityGraph {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient, private tenantId?: string) {
    this.prisma = prisma;
  }

  /**
   * Forward query: which atoms address this event/theme?
   * Event → Intervention → Atoms
   */
  async findAtomsForEvent(eventId: string): Promise<any[]> {
    // Load event
    const event = await this.prisma.hfEvent.findFirst({
      where: { id: eventId, ...(this.tenantId ? { tenantId: this.tenantId } : {}) }
    });

    if (!event) {
      return [];
    }

    // Find interventions linked to this event
    const relationships = await this.prisma.evidenceRelationship.findMany({
      where: {
        fromEntityId: eventId,
        ...(this.tenantId ? { tenantId: this.tenantId } : {}),
        fromEntityType: 'HfEvent',
        toEntityType: 'LearningIntervention'
      }
    });

    // For each intervention, find atoms
    const atoms: any[] = [];
    for (const rel of relationships) {
      const atomRels = await this.prisma.evidenceRelationship.findMany({
        where: {
          fromEntityId: rel.toEntityId,
          ...(this.tenantId ? { tenantId: this.tenantId } : {}),
          fromEntityType: 'LearningIntervention',
          toEntityType: 'LearningAtom'
        }
      });

      for (const atomRel of atomRels) {
        const atom = await this.prisma.learningAtom.findFirst({
          where: { id: atomRel.toEntityId, ...(this.tenantId ? { tenantId: this.tenantId } : {}) }
        });
        if (atom) {
          atoms.push({
            atomId: atom.id,
            title: atom.title,
            objective: atom.objective,
            status: atom.status,
            relationshipType: atomRel.relationshipType
          });
        }
      }
    }

    return atoms;
  }

  /**
   * Reverse query: which events does this atom address?
   * Atom ← Intervention ← Event
   */
  async findEventsForAtom(atomId: string): Promise<any[]> {
    // Find interventions linked to this atom
    const atomRels = await this.prisma.evidenceRelationship.findMany({
      where: {
        toEntityId: atomId,
        ...(this.tenantId ? { tenantId: this.tenantId } : {}),
        toEntityType: 'LearningAtom',
        fromEntityType: 'LearningIntervention'
      }
    });

    const events: any[] = [];
    for (const atomRel of atomRels) {
      const eventRels = await this.prisma.evidenceRelationship.findMany({
        where: {
          toEntityId: atomRel.fromEntityId,
          ...(this.tenantId ? { tenantId: this.tenantId } : {}),
          toEntityType: 'LearningIntervention',
          fromEntityType: 'HfEvent'
        }
      });

      for (const eventRel of eventRels) {
        const event = await this.prisma.hfEvent.findFirst({
          where: { id: eventRel.fromEntityId, ...(this.tenantId ? { tenantId: this.tenantId } : {}) }
        });
        if (event) {
          events.push({
            eventId: event.id,
            title: event.title,
            themes: fromDbArray<string>(event.themes),
            occurredAt: event.occurredAt,
            relationshipType: eventRel.relationshipType
          });
        }
      }
    }

    return events;
  }

  /**
   * Find all learners with active assignments using a given atom (for recall).
   * Used when an atom is superseded and needs to notify learners.
   * Fixed 2026-08-06: previously an unconditional stub returning []. TrainingPackageManifest
   * exists in the schema (baselineContent is a JSON-string array of {atomId, ...}) — this
   * queries active assignments, parses each manifest's baselineContent, and matches atomId.
   * Caught while re-verifying C-011 (Content Recall) against the real application.
   */
  async findLearnersWithAtom(atomId: string): Promise<
    Array<{
      learnerId: string;
      assignmentId: string;
      manifestId: string;
      status: string;
    }>
  > {
    const activeAssignments = await this.prisma.trainingAssignment.findMany({
      where: {
        status: { in: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'PASSED'] },
        ...(this.tenantId ? { tenantId: this.tenantId } : {}),
      },
      include: { manifest: true },
    });

    const matches: Array<{
      learnerId: string;
      assignmentId: string;
      manifestId: string;
      status: string;
    }> = [];

    for (const assignment of activeAssignments) {
      const baseline = fromDbArray<{ atomId: string }>(assignment.manifest.baselineContent);
      if (baseline.some((entry) => entry.atomId === atomId)) {
        matches.push({
          learnerId: assignment.learnerId,
          assignmentId: assignment.id,
          manifestId: assignment.manifestId,
          status: assignment.status,
        });
      }
    }

    return matches;
  }

  /**
   * Build full audit chain for an intervention (all evidence relationships).
   * Used by Defense Dossier to show complete traceability.
   */
  async buildInterventionAuditChain(interventionId: string): Promise<{
    intervention: any;
    events: any[];
    atoms: any[];
    assignments: any[];
    observations: any[];
    relationships: any[];
  }> {
    // Load intervention
    const intervention = await this.prisma.learningIntervention.findFirst({
      where: { id: interventionId, ...(this.tenantId ? { tenantId: this.tenantId } : {}) }
    });

    if (!intervention) {
      return {
        intervention: null,
        events: [],
        atoms: [],
        assignments: [],
        observations: [],
        relationships: []
      };
    }

    // Find all relationships
    const relationships = await this.prisma.evidenceRelationship.findMany({
      where: {
        ...(this.tenantId ? { tenantId: this.tenantId } : {}),
        OR: [
          { fromEntityId: interventionId, fromEntityType: 'LearningIntervention' },
          { toEntityId: interventionId, toEntityType: 'LearningIntervention' }
        ]
      }
    });

    // Collect all linked entities
    const eventIds = new Set<string>();
    const atomIds = new Set<string>();

    for (const rel of relationships) {
      if (rel.fromEntityType === 'HfEvent' && rel.toEntityId === interventionId) {
        eventIds.add(rel.fromEntityId);
      }
      if (rel.toEntityType === 'LearningAtom' && rel.fromEntityId === interventionId) {
        atomIds.add(rel.toEntityId);
      }
    }

    // Load entities
    const events = await this.prisma.hfEvent.findMany({
      where: { id: { in: Array.from(eventIds) }, ...(this.tenantId ? { tenantId: this.tenantId } : {}) }
    });

    const atoms = await this.prisma.learningAtom.findMany({
      where: { id: { in: Array.from(atomIds) }, ...(this.tenantId ? { tenantId: this.tenantId } : {}) }
    });

    // Find assignments via intervention's event
    const assignments = await this.prisma.trainingAssignment.findMany({
      where: {
        status: { in: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] }
        ,...(this.tenantId ? { tenantId: this.tenantId } : {})
      },
      take: 100 // Limit for safety
    });

    // Find observations for assignments
    const observations = await this.prisma.supervisorObservation.findMany({
      where: {
        interventionId
      }
    });

    return {
      intervention,
      events,
      atoms,
      assignments,
      observations,
      relationships
    };
  }
}

export const traceabilityGraphSingleton = (prisma: PrismaClient) =>
  new TraceabilityGraph(prisma);
