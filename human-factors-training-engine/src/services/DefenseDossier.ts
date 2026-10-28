/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { fromDbArray, fromDb } from '@/lib/json';
import { versionStampMeta } from '@/lib/versionStamp';
import { CausalStatusService } from './CausalStatusService';

/**
 * Regulatory Defense Dossier (PHASE-3-RUN-DIRECTIVE.md WP-1 — flagship deliverable).
 *
 * Rebuilt from scratch against the current schema. `_prototypes/DefenseDossierBuilder.ts`
 * is reference-only — it was written against a pre-rebuild schema shape (`manifest_id`,
 * `event.roles`, `causalStatus.narrative` — none of which exist anymore) and does not
 * compile. Nothing was rescued from it; every field reference below was checked against the
 * live `prisma/schema.prisma`, not assumed from that file.
 *
 * Every section either renders real data or an explicit, honest absent-data / owner-pending
 * state — never a fabricated or invented value. Two scope types are supported for real in
 * this pass: `intervention` (the fully-tested primary scope) and `learner` (aggregates across
 * a learner's assignments). `organization`/`site`/`date-range` scopes are NOT implemented —
 * see OPEN-QUESTIONS.md Q-005; calling `buildDossier` with those scope types throws rather
 * than silently returning an empty or wrong dossier.
 */

export type DossierScope =
  | { type: 'intervention'; interventionId: string }
  | { type: 'learner'; learnerId: string };

export interface DossierSection<T> {
  title: string;
  populated: boolean;
  data: T;
  note?: string; // set when populated=false, or when data is real but incomplete
}

export interface DefenseDossierOutput {
  title: string;
  scope: DossierScope;
  generatedAt: string;
  sections: {
    requirementMapping: DossierSection<{
      packs: Array<{
        packId: string;
        name: string;
        version: number;
        regulatoryFramework: string;
        clauses: Array<{ clauseNumber: string; clauseTitle: string | null; mappedAtomIds: string[] }>;
      }>;
    }>;
    curriculumMapping: DossierSection<{
      atoms: Array<{
        atomId: string;
        title: string;
        objective: string;
        revision: number;
        format: string;
        status: string;
      }>;
    }>;
    learnerEvidence: DossierSection<{
      learners: Array<{
        learnerId: string;
        learnerName: string;
        assignments: Array<{
          assignmentId: string;
          manifestId: string;
          manifestOutputHash: string;
          manifestFrozenAt: string | null;
          status: string;
          assignedAt: string;
          completedAt: string | null;
          passedAt: string | null;
        }>;
      }>;
    }>;
    recurrencyProof: DossierSection<{
      events: Array<{
        eventId: string;
        eventTitle: string;
        occurredAt: string;
        producedAtomIds: string[];
        approvals: Array<{ approvalType: string; decision: string; decidedBy: string | null }>;
      }>;
    }>;
    effectivenessEvidence: DossierSection<{
      records: Array<{
        level: string;
        evidenceType: string;
        outcomeLanguage: string; // honest language — never claims effectiveness beyond recorded level
        collectedBy: string;
        collectedAt: string;
      }>;
      observations: Array<{
        effectivenessLevel: string;
        outcome: string | null;
        description: string;
        recordedBy: string;
        dateObserved: string;
      }>;
    }>;
    causalStatusHistory: DossierSection<{
      events: Array<{
        eventId: string;
        eventTitle: string;
        currentStatus: string;
        history: Array<{
          fromStatus: string;
          toStatus: string;
          promotedBy: string;
          promotedAt: string;
          notes: string | null;
        }>;
      }>;
    }>;
    kernelConditions: DossierSection<{
      conditions: Array<{
        ruleId: string;
        ruleName: string;
        severity: string;
        rationale: string;
        status: string;
        response: string | null;
        respondedBy: string | null;
        respondedAt: string | null;
      }>;
    }>;
    contentBillOfMaterials: DossierSection<{
      items: Array<{
        atomId: string;
        title: string;
        revision: number;
        format: string;
        sourceEvidenceIds: string[];
        licenseClass: string | null;
        owner: string | null;
        approvedBy: string | null;
        status: string;
        replacedAtomId: string | null;
        replacementAtomId: string | null;
      }>;
      compilerVersions: string[];
      rulesetRevisions: string[];
    }>;
    gapRegister: DossierSection<{
      overdueAssignments: Array<{ assignmentId: string; learnerId: string; dueDate: string }>;
      openConditions: Array<{ conditionId: string; ruleId: string; severity: string; detectedAt: string }>;
      coverageGaps: string[]; // honest text notes, e.g. missing requirement mapping
    }>;
    integrityAttestation: {
      packageHash: string;
      auditLogChainSegment: { entryCount: number; chainHash: string };
      generatedAt: string;
      versionStamp: ReturnType<typeof versionStampMeta>;
    };
  };
}

export class DefenseDossier {
  private causalStatusService: CausalStatusService;

  constructor(private prisma: PrismaClient, private tenantId?: string) {
    this.causalStatusService = new CausalStatusService(prisma);
  }

  async buildDossier(scope: DossierScope): Promise<DefenseDossierOutput> {
    if (scope.type === 'intervention') {
      return this.buildForIntervention(scope.interventionId);
    }
    if (scope.type === 'learner') {
      return this.buildForLearner(scope.learnerId);
    }
    // Exhaustiveness guard — throws rather than silently returning a wrong/empty dossier for
    // an unsupported scope. organization/site/date-range are not implemented (OPEN-QUESTIONS Q-005).
    throw new Error(
      `Dossier scope type "${(scope as { type: string }).type}" is not implemented in this pass. ` +
        `Supported: intervention, learner. See OPEN-QUESTIONS.md Q-005.`
    );
  }

  private async buildForIntervention(interventionId: string): Promise<DefenseDossierOutput> {
    const intervention = await this.prisma.learningIntervention.findFirstOrThrow({
      where: { id: interventionId, ...(this.tenantId ? { tenantId: this.tenantId } : {}) },
    });

    const atomIds = fromDbArray<string>(intervention.atomIds);
    const atoms = await this.prisma.learningAtom.findMany({
      where: { id: { in: atomIds }, ...(this.tenantId ? { tenantId: this.tenantId } : {}) },
    });

    // D-058: eventId is null for regulatory-baseline interventions (no triggering event by
    // design - the training exists because a regulation requires it, not because an event
    // flagged something). A full baseline-specific defense exhibit is a real, separate future
    // need, not attempted here - this guard just keeps event-defense dossiers working exactly
    // as before for event-origin interventions.
    const event = intervention.eventId
      ? await this.prisma.hfEvent.findFirst({
          where: { id: intervention.eventId, ...(this.tenantId ? { tenantId: this.tenantId } : {}) },
        })
      : null;

    const assignments = await this.prisma.trainingAssignment.findMany({
      where: { interventionId, ...(this.tenantId ? { tenantId: this.tenantId } : {}) },
      include: { manifest: true, learner: true },
    });

    const effectiveness = await this.prisma.effectivenessEvidence.findMany({
      where: { interventionId },
    });
    const observations = await this.prisma.supervisorObservation.findMany({
      where: { interventionId },
    });

    const systemConditions = await this.prisma.maiSystemCondition.findMany({
      where: { linkedInterventionId: interventionId, ...(this.tenantId ? { tenantId: this.tenantId } : {}) },
    });

    // Requirement mapping: only render packs that actually map to one of THIS intervention's
    // atoms — never invent a mapping. If no PolicyPack data exists at all, or none maps to
    // these atoms, the section is explicitly marked unpopulated (never silently empty).
    const allPacks = await this.prisma.policyPack.findMany({
      where: this.tenantId ? { OR: [{ ownerTenantId: null }, { ownerTenantId: this.tenantId }] } : undefined,
      include: { clauses: true },
    });
    const relevantPacks = allPacks
      .map((pack) => ({
        packId: pack.id,
        name: pack.name,
        version: pack.version,
        regulatoryFramework: pack.regulatoryFramework,
        clauses: pack.clauses
          .map((c) => ({
            clauseNumber: c.clauseNumber,
            clauseTitle: c.clauseTitle,
            mappedAtomIds: fromDbArray<string>(c.mappedAtomIds).filter((id) => atomIds.includes(id)),
          }))
          .filter((c) => c.mappedAtomIds.length > 0),
      }))
      .filter((p) => p.clauses.length > 0);

    const requirementMapping: DefenseDossierOutput['sections']['requirementMapping'] =
      relevantPacks.length > 0
        ? { title: 'Requirement Mapping', populated: true, data: { packs: relevantPacks } }
        : {
            title: 'Requirement Mapping',
            populated: false,
            data: { packs: [] },
            note: 'Requirement mapping: awaiting owner-supplied Policy Pack. No clause data has been mapped to this intervention\'s content — this is not a coverage gap being hidden, it is the honest state of an owner-pending input (PHASE-3-RUN-DIRECTIVE.md WP-1 §1).',
          };

    const curriculumMapping: DefenseDossierOutput['sections']['curriculumMapping'] = {
      title: 'Curriculum-to-Objective Mapping',
      populated: atoms.length > 0,
      data: {
        atoms: atoms.map((a) => ({
          atomId: a.id,
          title: a.title,
          objective: a.objective,
          revision: a.revision,
          format: a.format,
          status: a.status,
        })),
      },
      note: atoms.length === 0 ? 'No atoms currently linked to this intervention.' : undefined,
    };

    const learnerEvidence: DefenseDossierOutput['sections']['learnerEvidence'] = {
      title: 'Per-Learner Frozen Manifests, Completion & Assessment Evidence',
      populated: assignments.length > 0,
      data: {
        learners: this.groupAssignmentsByLearner(assignments),
      },
      note: assignments.length === 0 ? 'No learner assignments recorded for this intervention.' : undefined,
    };

    const recurrencyProof = await this.buildRecurrencyProof(event ? [event] : []);

    const effectivenessSection: DefenseDossierOutput['sections']['effectivenessEvidence'] = {
      title: 'Effectiveness Evidence',
      populated: effectiveness.length > 0 || observations.length > 0,
      data: {
        records: effectiveness.map((e) => ({
          level: e.level,
          evidenceType: e.evidenceType,
          outcomeLanguage: this.honestOutcomeLanguage(e.level, e.supportsClosureAtLevel),
          collectedBy: e.collectedBy,
          collectedAt: e.collectedAt.toISOString(),
        })),
        observations: observations.map((o) => ({
          effectivenessLevel: o.effectivenessLevel,
          outcome: o.outcome,
          description: o.description,
          recordedBy: o.recordedBy,
          dateObserved: o.dateObserved.toISOString(),
        })),
      },
      note:
        effectiveness.length === 0 && observations.length === 0
          ? 'No effectiveness evidence recorded. Closure status: ' + intervention.closureStatus
          : undefined,
    };

    const causalStatusHistory = await this.buildCausalStatusHistory(event ? [event] : []);

    const kernelConditions: DefenseDossierOutput['sections']['kernelConditions'] = {
      title: 'Kernel System-Detected Conditions & Human Dispositions',
      populated: systemConditions.length > 0,
      data: {
        conditions: systemConditions.map((c) => ({
          ruleId: c.ruleId,
          ruleName: c.ruleName,
          severity: c.severity,
          rationale: c.rationale,
          status: c.status,
          response: c.response,
          respondedBy: c.respondedBy,
          respondedAt: c.respondedAt ? c.respondedAt.toISOString() : null,
        })),
      },
      note: systemConditions.length === 0 ? 'No kernel conditions linked to this intervention.' : undefined,
    };

    const contentBom = this.buildContentBom(atoms, assignments);

    const gapRegister = await this.buildGapRegister(assignments, systemConditions, requirementMapping.populated);

    const dossierBody = {
      title: `Defense Dossier: ${intervention.title}`,
      scope: { type: 'intervention' as const, interventionId },
      sections: {
        requirementMapping,
        curriculumMapping,
        learnerEvidence,
        recurrencyProof,
        effectivenessEvidence: effectivenessSection,
        causalStatusHistory,
        kernelConditions,
        contentBillOfMaterials: contentBom,
        gapRegister,
      },
    };

    const integrityAttestation = await this.buildIntegrityAttestation(dossierBody, [
      interventionId,
      ...atomIds,
      ...(event ? [event.id] : []),
    ]);

    return {
      ...dossierBody,
      generatedAt: new Date().toISOString(),
      sections: { ...dossierBody.sections, integrityAttestation },
    };
  }

  private async buildForLearner(learnerId: string): Promise<DefenseDossierOutput> {
    if (this.tenantId) {
      await this.prisma.organizationMember.findFirstOrThrow({
        where: { organizationId: this.tenantId, userId: learnerId, isActive: true },
      });
    }
    const learner = await this.prisma.user.findUniqueOrThrow({ where: { id: learnerId } });

    const assignments = await this.prisma.trainingAssignment.findMany({
      where: { learnerId, ...(this.tenantId ? { tenantId: this.tenantId } : {}) },
      include: { manifest: true, learner: true, intervention: true },
    });

    const interventionIds = Array.from(new Set(assignments.map((a) => a.interventionId)));
    const interventions = await this.prisma.learningIntervention.findMany({
      where: { id: { in: interventionIds }, ...(this.tenantId ? { tenantId: this.tenantId } : {}) },
    });
    const allAtomIds = Array.from(new Set(interventions.flatMap((i) => fromDbArray<string>(i.atomIds))));
    const atoms = await this.prisma.learningAtom.findMany({
      where: { id: { in: allAtomIds }, ...(this.tenantId ? { tenantId: this.tenantId } : {}) },
    });

    // D-058: filter out nulls before the query - regulatory-baseline interventions in this
    // learner's history have no event to look up, not an error condition.
    const eventIds = interventions.map((i) => i.eventId).filter((id): id is string => id !== null);
    const events = await this.prisma.hfEvent.findMany({
      where: { id: { in: eventIds }, ...(this.tenantId ? { tenantId: this.tenantId } : {}) },
    });

    const observations = await this.prisma.supervisorObservation.findMany({
      where: { assignmentId: { in: assignments.map((a) => a.id) } },
    });
    const effectiveness = await this.prisma.effectivenessEvidence.findMany({
      where: { assignmentId: { in: assignments.map((a) => a.id) } },
    });

    const allPacks = await this.prisma.policyPack.findMany({
      where: this.tenantId ? { OR: [{ ownerTenantId: null }, { ownerTenantId: this.tenantId }] } : undefined,
      include: { clauses: true },
    });
    const relevantPacks = allPacks
      .map((pack) => ({
        packId: pack.id,
        name: pack.name,
        version: pack.version,
        regulatoryFramework: pack.regulatoryFramework,
        clauses: pack.clauses
          .map((c) => ({
            clauseNumber: c.clauseNumber,
            clauseTitle: c.clauseTitle,
            mappedAtomIds: fromDbArray<string>(c.mappedAtomIds).filter((id) => allAtomIds.includes(id)),
          }))
          .filter((c) => c.mappedAtomIds.length > 0),
      }))
      .filter((p) => p.clauses.length > 0);

    const requirementMapping: DefenseDossierOutput['sections']['requirementMapping'] =
      relevantPacks.length > 0
        ? { title: 'Requirement Mapping', populated: true, data: { packs: relevantPacks } }
        : {
            title: 'Requirement Mapping',
            populated: false,
            data: { packs: [] },
            note: 'Requirement mapping: awaiting owner-supplied Policy Pack.',
          };

    const curriculumMapping: DefenseDossierOutput['sections']['curriculumMapping'] = {
      title: 'Curriculum-to-Objective Mapping',
      populated: atoms.length > 0,
      data: {
        atoms: atoms.map((a) => ({
          atomId: a.id,
          title: a.title,
          objective: a.objective,
          revision: a.revision,
          format: a.format,
          status: a.status,
        })),
      },
    };

    const learnerEvidence: DefenseDossierOutput['sections']['learnerEvidence'] = {
      title: 'Per-Learner Frozen Manifests, Completion & Assessment Evidence',
      populated: assignments.length > 0,
      data: { learners: this.groupAssignmentsByLearner(assignments) },
    };

    const recurrencyProof = await this.buildRecurrencyProof(events);

    const effectivenessSection: DefenseDossierOutput['sections']['effectivenessEvidence'] = {
      title: 'Effectiveness Evidence',
      populated: effectiveness.length > 0 || observations.length > 0,
      data: {
        records: effectiveness.map((e) => ({
          level: e.level,
          evidenceType: e.evidenceType,
          outcomeLanguage: this.honestOutcomeLanguage(e.level, e.supportsClosureAtLevel),
          collectedBy: e.collectedBy,
          collectedAt: e.collectedAt.toISOString(),
        })),
        observations: observations.map((o) => ({
          effectivenessLevel: o.effectivenessLevel,
          outcome: o.outcome,
          description: o.description,
          recordedBy: o.recordedBy,
          dateObserved: o.dateObserved.toISOString(),
        })),
      },
    };

    const causalStatusHistory = await this.buildCausalStatusHistory(events);

    const systemConditions = await this.prisma.maiSystemCondition.findMany({
      where: {
        linkedInterventionId: { in: interventionIds },
        ...(this.tenantId ? { tenantId: this.tenantId } : {}),
      },
    });
    const kernelConditions: DefenseDossierOutput['sections']['kernelConditions'] = {
      title: 'Kernel System-Detected Conditions & Human Dispositions',
      populated: systemConditions.length > 0,
      data: {
        conditions: systemConditions.map((c) => ({
          ruleId: c.ruleId,
          ruleName: c.ruleName,
          severity: c.severity,
          rationale: c.rationale,
          status: c.status,
          response: c.response,
          respondedBy: c.respondedBy,
          respondedAt: c.respondedAt ? c.respondedAt.toISOString() : null,
        })),
      },
    };

    const contentBom = this.buildContentBom(atoms, assignments);
    const gapRegister = await this.buildGapRegister(assignments, systemConditions, requirementMapping.populated);

    const dossierBody = {
      title: `Defense Dossier: Learner ${learner.name}`,
      scope: { type: 'learner' as const, learnerId },
      sections: {
        requirementMapping,
        curriculumMapping,
        learnerEvidence,
        recurrencyProof,
        effectivenessEvidence: effectivenessSection,
        causalStatusHistory,
        kernelConditions,
        contentBillOfMaterials: contentBom,
        gapRegister,
      },
    };

    const integrityAttestation = await this.buildIntegrityAttestation(dossierBody, [
      learnerId,
      ...allAtomIds,
      ...events.map((e) => e.id),
    ]);

    return {
      ...dossierBody,
      generatedAt: new Date().toISOString(),
      sections: { ...dossierBody.sections, integrityAttestation },
    };
  }

  // -------------------------------------------------------------------------------------
  // Shared section builders
  // -------------------------------------------------------------------------------------

  private groupAssignmentsByLearner(
    assignments: Array<{
      id: string;
      learnerId: string;
      manifestId: string;
      status: string;
      assignedAt: Date;
      completedAt: Date | null;
      passedAt: Date | null;
      learner: { name: string };
      manifest: { outputHash: string; frozenAt: Date | null };
    }>
  ): DefenseDossierOutput['sections']['learnerEvidence']['data']['learners'] {
    const byLearner = new Map<string, typeof assignments>();
    for (const a of assignments) {
      const list = byLearner.get(a.learnerId) ?? [];
      list.push(a);
      byLearner.set(a.learnerId, list);
    }
    return Array.from(byLearner.entries()).map(([learnerId, list]) => ({
      learnerId,
      learnerName: list[0].learner.name,
      assignments: list.map((a) => ({
        assignmentId: a.id,
        manifestId: a.manifestId,
        manifestOutputHash: a.manifest.outputHash,
        manifestFrozenAt: a.manifest.frozenAt ? a.manifest.frozenAt.toISOString() : null,
        status: a.status,
        assignedAt: a.assignedAt.toISOString(),
        completedAt: a.completedAt ? a.completedAt.toISOString() : null,
        passedAt: a.passedAt ? a.passedAt.toISOString() : null,
      })),
    }));
  }

  private async buildRecurrencyProof(
    events: Array<{ id: string; title: string; occurredAt: Date }>
  ): Promise<DefenseDossierOutput['sections']['recurrencyProof']> {
    const results: DefenseDossierOutput['sections']['recurrencyProof']['data']['events'] = [];
    for (const event of events) {
      const relationships = await this.prisma.evidenceRelationship.findMany({
        where: {
          fromEntityId: event.id,
          fromEntityType: 'HfEvent',
          ...(this.tenantId ? { tenantId: this.tenantId } : {}),
        },
      });
      const interventionIds = relationships
        .filter((r) => r.toEntityType === 'LearningIntervention')
        .map((r) => r.toEntityId);
      const atomRelationships = await this.prisma.evidenceRelationship.findMany({
        where: {
          fromEntityId: { in: interventionIds },
          fromEntityType: 'LearningIntervention',
          toEntityType: 'LearningAtom',
          ...(this.tenantId ? { tenantId: this.tenantId } : {}),
        },
      });
      const producedAtomIds = atomRelationships.map((r) => r.toEntityId);

      const approvals = await this.prisma.maiApproval.findMany({
        where: { subjectId: { in: interventionIds }, ...(this.tenantId ? { tenantId: this.tenantId } : {}) },
      });

      results.push({
        eventId: event.id,
        eventTitle: event.title,
        occurredAt: event.occurredAt.toISOString(),
        producedAtomIds,
        approvals: approvals.map((a) => ({
          approvalType: a.approvalType,
          decision: a.decision,
          decidedBy: a.decidedBy,
        })),
      });
    }

    return {
      title: 'Occurrence-Informed Recurrency Proof',
      populated: results.length > 0,
      data: { events: results },
      note: results.length === 0 ? 'No source events in scope for this dossier.' : undefined,
    };
  }

  private async buildCausalStatusHistory(
    events: Array<{ id: string; title: string }>
  ): Promise<DefenseDossierOutput['sections']['causalStatusHistory']> {
    const results: DefenseDossierOutput['sections']['causalStatusHistory']['data']['events'] = [];
    for (const event of events) {
      const current = await this.causalStatusService.getStatus(event.id);
      const history = await this.causalStatusService.getHistory(event.id, this.tenantId);
      results.push({
        eventId: event.id,
        eventTitle: event.title,
        currentStatus: current?.status ?? 'REPORTED',
        history: history.map((h) => ({
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          promotedBy: h.promotedBy,
          promotedAt: h.promotedAt.toISOString(),
          notes: h.notes,
        })),
      });
    }
    return {
      title: 'Causal-Status History',
      populated: results.some((r) => r.history.length > 0),
      data: { events: results },
      note:
        results.length > 0 && results.every((r) => r.history.length === 0)
          ? 'Events are still at their initial REPORTED status; no promotion history recorded yet.'
          : undefined,
    };
  }

  private buildContentBom(
    atoms: Array<{
      id: string;
      title: string;
      revision: number;
      format: string;
      sourceEvidenceIds: string;
      licenseClass: string | null;
      owner: string | null;
      approvedBy: string | null;
      status: string;
      replacedAtomId: string | null;
      replacementAtomId: string | null;
    }>,
    assignments: Array<{ manifest: { compilerVersion: string; rulesetRevision: string } }>
  ): DefenseDossierOutput['sections']['contentBillOfMaterials'] {
    return {
      title: 'Content Bill of Materials',
      populated: atoms.length > 0,
      data: {
        items: atoms.map((a) => ({
          atomId: a.id,
          title: a.title,
          revision: a.revision,
          format: a.format,
          sourceEvidenceIds: fromDbArray<string>(a.sourceEvidenceIds),
          licenseClass: a.licenseClass,
          owner: a.owner,
          approvedBy: a.approvedBy,
          status: a.status,
          replacedAtomId: a.replacedAtomId,
          replacementAtomId: a.replacementAtomId,
        })),
        compilerVersions: Array.from(new Set(assignments.map((a) => a.manifest.compilerVersion))),
        rulesetRevisions: Array.from(new Set(assignments.map((a) => a.manifest.rulesetRevision))),
      },
      note: atoms.length === 0 ? 'No content items in scope.' : undefined,
    };
  }

  private async buildGapRegister(
    assignments: Array<{ id: string; learnerId: string; dueDate: Date | null; status: string }>,
    systemConditions: Array<{ id: string; ruleId: string; severity: string; status: string; detectedAt: Date }>,
    requirementMappingPopulated: boolean
  ): Promise<DefenseDossierOutput['sections']['gapRegister']> {
    const now = new Date();
    const overdueAssignments = assignments
      .filter((a) => a.dueDate && a.dueDate < now && !['PASSED', 'COMPLETED'].includes(a.status))
      .map((a) => ({ assignmentId: a.id, learnerId: a.learnerId, dueDate: a.dueDate!.toISOString() }));

    const openConditions = systemConditions
      .filter((c) => c.status === 'NEW')
      .map((c) => ({ conditionId: c.id, ruleId: c.ruleId, severity: c.severity, detectedAt: c.detectedAt.toISOString() }));

    const coverageGaps: string[] = [];
    if (!requirementMappingPopulated) {
      coverageGaps.push('No Policy Pack requirement mapping available for this scope (owner-pending input).');
    }
    if (overdueAssignments.length > 0) {
      coverageGaps.push(`${overdueAssignments.length} assignment(s) past due date without completion.`);
    }
    if (openConditions.length > 0) {
      coverageGaps.push(`${openConditions.length} kernel condition(s) awaiting human disposition.`);
    }

    return {
      title: 'Gap Register',
      populated: true, // always populated — an empty gap list IS the (honest) content
      data: { overdueAssignments, openConditions, coverageGaps },
    };
  }

  /**
   * Recursively sort object keys for deterministic canonical serialization — same approach
   * as CurriculumCompiler.sortKeysDeep (D-013), reused here rather than duplicated logic
   * silently drifting between the two hash implementations.
   */
  private sortKeysDeep(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((v) => this.sortKeysDeep(v));
    if (value !== null && typeof value === 'object') {
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[key] = this.sortKeysDeep((value as Record<string, unknown>)[key]);
      }
      return sorted;
    }
    return value;
  }

  private async buildIntegrityAttestation(
    dossierBody: unknown,
    relatedObjectIds: string[]
  ): Promise<DefenseDossierOutput['sections']['integrityAttestation']> {
    const packageHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(this.sortKeysDeep(dossierBody)))
      .digest('hex');

    // Audit-log hash chain segment: every AuditLog row referencing an object in this
    // dossier's scope, chained in timestamp order (chain[i] = SHA256(chain[i-1] + row)).
    // This proves the audit trail feeding the dossier has not been reordered or edited
    // out-of-band since generation — re-running this over the same rows reproduces the
    // same chainHash; any insertion/deletion/edit of a chained row changes it.
    const relevantLogs = await this.prisma.auditLog.findMany({
      where: { objectId: { in: relatedObjectIds }, ...(this.tenantId ? { organizationId: this.tenantId } : {}) },
      orderBy: { timestamp: 'asc' },
    });

    let chainHash = '0'.repeat(64); // genesis
    for (const log of relevantLogs) {
      const canonical = JSON.stringify(
        this.sortKeysDeep({ action: log.action, object: log.object, objectId: log.objectId, details: log.details, timestamp: log.timestamp.toISOString() })
      );
      chainHash = crypto.createHash('sha256').update(chainHash + canonical).digest('hex');
    }

    return {
      packageHash,
      auditLogChainSegment: { entryCount: relevantLogs.length, chainHash },
      generatedAt: new Date().toISOString(),
      versionStamp: versionStampMeta(),
    };
  }

  private honestOutcomeLanguage(level: string, supportsClosureAtLevel: boolean): string {
    // Honest-data rule (mirrors HonestDashboardBuilder): never claim more than the recorded
    // level supports. Completion is not competence; observed is not the same as verified
    // at a higher level than what was actually recorded.
    const languageByLevel: Record<string, string> = {
      COMPLETION: 'Learner completed assigned content. This is completion evidence only — it does not demonstrate knowledge, skill, or workplace behavior change.',
      KNOWLEDGE_SKILL: 'Learner demonstrated knowledge or skill in an assessment context.',
      WORKPLACE_TRANSFER: 'Learner exhibited the trained behavior in an actual workplace observation.',
      OPERATIONAL_IMPACT: 'Evidence indicates a measurable operational outcome consistent with the training objective.',
    };
    const base = languageByLevel[level] ?? `Evidence recorded at level "${level}".`;
    return supportsClosureAtLevel ? base : `${base} (Not yet accepted as closure-supporting evidence.)`;
  }
}

export const defenseDossierSingleton = (prisma: PrismaClient) => new DefenseDossier(prisma);
