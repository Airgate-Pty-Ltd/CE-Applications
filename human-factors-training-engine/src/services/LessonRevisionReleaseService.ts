/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient, MaiContentRevisionProposal, User, LearningAtom } from '@prisma/client';
import { fromDbArray, toDbArray } from '@/lib/json';
import { MaiKernel } from './MaiKernel';
import { DualApprovalGate } from './DualApprovalGate';
import { ContentSupersessionService } from './ContentSupersessionService';
import { compileAndAssignAtoms } from './compileAndAssignAtoms';
import { TraceabilityGraph } from './TraceabilityGraph';

type ReleaseAssessmentQuestion = {
  questionText: string;
  options: string[];
  correctAnswers: string[];
  explanation?: string | null;
  points?: number;
};

function editedAssessmentQuestions(value: unknown): ReleaseAssessmentQuestion[] | null {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length === 0) throw new Error('Release assessmentQuestions must be a non-empty array.');
  return value.map((candidate) => {
    if (!candidate || typeof candidate !== 'object') throw new Error('Invalid assessment question.');
    const row = candidate as Record<string, unknown>;
    const options = Array.isArray(row.options) ? row.options.filter((item): item is string => typeof item === 'string') : [];
    const correctAnswers = Array.isArray(row.correctAnswers) ? row.correctAnswers.filter((item): item is string => typeof item === 'string') : [];
    if (typeof row.questionText !== 'string' || !row.questionText.trim() || options.length < 2
      || correctAnswers.length === 0 || correctAnswers.some((answer) => !options.includes(answer))) {
      throw new Error('Assessment question requires text, at least two options, and a valid answer key.');
    }
    return {
      questionText: row.questionText.trim(),
      options,
      correctAnswers,
      explanation: typeof row.explanation === 'string' ? row.explanation : null,
      points: typeof row.points === 'number' && row.points > 0 ? Math.floor(row.points) : 1,
    };
  });
}

/**
 * D-068: the human-release gate. A MaiContentRevisionProposal only ever becomes a live,
 * distributed LearningAtom through this service, and only on an authorized human action.
 * Nothing in LessonAutoPreparationService can reach this outcome on its own.
 *
 * Two checks that used to run during preparation now run here instead, both moved for the same
 * reason: they are checks about PUBLISHING/DISTRIBUTING content, and neither of those things
 * happens until release.
 * - The 14-rule Kernel governance check (MaiKernel.processEvent()) - moved because
 *   HFSRC-005 ("a publication request was made for content not in APPROVED status") is a
 *   category error against a mere preparation action; it is exactly the right check the moment
 *   content is about to become APPROVED.
 * - DualApprovalGate.canAssignTraining() - product-safety classification is never bypassed,
 *   autonomous or human-initiated; it gates ASSIGNMENT, which only happens at release/distribute.
 *
 * Materialization reuses ContentSupersessionService.supersede() whenever a proposal has a real
 * baselineAtomId (the rollback path always sets one; lesson-preparation currently never does,
 * since no atom-revision-detection exists in this codebase - see LessonAutoPreparationService).
 * For net-new content, the atom is created directly, same shape ContentSupersessionService uses
 * for its own new-atom side, minus the supersession of an old one.
 */

export type ReleaseAction = 'APPROVE' | 'APPROVE_WITH_EDITS' | 'RETURN_FOR_REWORK' | 'REJECT';

export interface RollbackImpact {
  learners: Array<{ learnerId: string; assignmentId: string; manifestId: string; status: string }>;
  derivedAtomIds: string[];
  linkedLessonIds: string[];
  linkedCarIds: string[];
  affectedPolicyPackClauseIds: string[];
  notApplicable: string[]; // honestly reported, not fabricated - see file header
}

export class LessonRevisionReleaseService {
  private kernel: MaiKernel;
  private dualApprovalGate: DualApprovalGate;
  private supersession: ContentSupersessionService;

  constructor(private prisma: PrismaClient, private tenantId: string) {
    if (!tenantId) throw new Error('LessonRevisionReleaseService requires a tenantId.');
    this.kernel = new MaiKernel(prisma);
    this.dualApprovalGate = new DualApprovalGate(prisma);
    this.supersession = new ContentSupersessionService(prisma, tenantId);
  }

  async approve(proposalId: string, actorUserId: string): Promise<{ atomId: string; assignmentsCreated: number }> {
    return this.release(proposalId, actorUserId, 'APPROVE');
  }

  async approveWithEdits(
    proposalId: string,
    actorUserId: string,
    edits: Record<string, unknown>,
    editSummary?: string
  ): Promise<{ atomId: string; assignmentsCreated: number }> {
    return this.release(proposalId, actorUserId, 'APPROVE_WITH_EDITS', edits, editSummary);
  }

  async returnForRework(proposalId: string, actorUserId: string, reason: string): Promise<void> {
    const { proposal } = await this.loadAuthorized(proposalId, actorUserId);
    await this.prisma.$transaction(async (tx) => {
      const approval = await tx.maiApproval.create({
        data: {
          tenantId: this.tenantId,
          approvalType: 'CONTENT_REVISION_RELEASE',
          subjectId: proposal.id,
          subjectType: 'MaiContentRevisionProposal',
          decision: 'RETURN_FOR_REWORK',
          decidedBy: actorUserId,
          decidedAt: new Date(),
          rationale: reason,
        },
      });
      await tx.maiContentRevisionProposal.update({
        where: { id: proposal.id },
        data: { status: 'RETURNED_FOR_REWORK', releaseApprovalId: approval.id },
      });
    });
  }

  async reject(proposalId: string, actorUserId: string, reason: string): Promise<void> {
    const { proposal } = await this.loadAuthorized(proposalId, actorUserId);
    await this.prisma.$transaction(async (tx) => {
      const approval = await tx.maiApproval.create({
        data: {
          tenantId: this.tenantId,
          approvalType: 'CONTENT_REVISION_RELEASE',
          subjectId: proposal.id,
          subjectType: 'MaiContentRevisionProposal',
          decision: 'REJECTED',
          decidedBy: actorUserId,
          decidedAt: new Date(),
          rationale: reason,
        },
      });
      await tx.maiContentRevisionProposal.update({
        where: { id: proposal.id },
        data: { status: 'REJECTED', releaseApprovalId: approval.id },
      });
    });
    // The prior effective atom (if any) is untouched by construction - reject() never writes to
    // LearningAtom at all. History and whatever is currently live both stay exactly as they were.
  }

  /**
   * Creates a NEW MaiContentRevisionProposal (triggerType ROLLBACK) copying the target
   * historical atom's content forward, with baselineAtomId set to whatever is CURRENTLY
   * effective in that atom's revision chain. This never rewrites history - it goes through the
   * identical approve()/reject() path as any other proposal, requiring the same authorized
   * human action before anything becomes live again.
   */
  async prepareRollback(targetAtomId: string, actorUserId: string, rationale: string): Promise<{ proposalId: string }> {
    await this.requireReleaseAuthority(actorUserId);

    const targetAtom = await this.prisma.learningAtom.findUniqueOrThrow({ where: { id: targetAtomId } });
    const targetAssessmentQuestions = await this.prisma.atomAssessmentQuestion.findMany({
      where: { atomId: targetAtomId, tenantId: this.tenantId, status: 'APPROVED' },
      select: { id: true },
    });
    const currentEffective = await this.findCurrentEffectiveAtom(targetAtomId);

    const intervention = await this.prisma.learningIntervention.findFirst({
      where: { atomIds: { contains: currentEffective.id } },
    });
    if (!intervention) {
      throw new Error(`No LearningIntervention currently references atom ${currentEffective.id} - cannot determine a rollback target.`);
    }

    const proposal = await this.prisma.maiContentRevisionProposal.create({
      data: {
        tenantId: this.tenantId,
        triggerType: 'ROLLBACK',
        interventionId: intervention.id,
        baselineAtomId: currentEffective.id,
        status: 'AWAITING_HUMAN_RELEASE',
        title: targetAtom.title,
        objective: targetAtom.objective,
        content: targetAtom.content,
        format: targetAtom.format,
        duration: targetAtom.duration,
        classification: targetAtom.classification,
        applicabilityTags: targetAtom.applicabilityTags,
        recurrenceRule: targetAtom.recurrenceRule,
        roleAudience: targetAtom.roleAudience,
        effectivenessMethod: targetAtom.effectivenessMethod,
        evaluationCriteria: targetAtom.evaluationCriteria,
        assessmentQuestionIds: toDbArray(targetAssessmentQuestions.map((question) => question.id)),
        editSummary: `Rollback to atom ${targetAtomId} (${targetAtom.title}): ${rationale}`,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: this.tenantId,
        actor: actorUserId,
        action: 'content_rollback_prepared',
        object: 'MaiContentRevisionProposal',
        objectId: proposal.id,
        details: JSON.stringify({ targetAtomId, currentEffectiveAtomId: currentEffective.id, rationale }),
      },
    });

    return { proposalId: proposal.id };
  }

  /**
   * Read-only. Honest accounting: dimensions that are real and checkable in this codebase are
   * computed for real; dimensions that don't exist as concepts here (future/batch curriculum
   * packages, certificates - confirmed tied to the separate Course/AssessmentAttempt pathway,
   * zero relation to LearningAtom) are reported in `notApplicable`, never faked.
   */
  async previewRollbackImpact(atomId: string): Promise<RollbackImpact> {
    const graph = new TraceabilityGraph(this.prisma, this.tenantId);
    const learners = await graph.findLearnersWithAtom(atomId);

    const derivedAtomIds: string[] = [];
    let cursor = await this.prisma.learningAtom.findUnique({ where: { id: atomId } });
    while (cursor?.replacementAtomId) {
      derivedAtomIds.push(cursor.replacementAtomId);
      cursor = await this.prisma.learningAtom.findUnique({ where: { id: cursor.replacementAtomId } });
    }

    const evidenceLinks = await this.prisma.evidenceRelationship.findMany({
      where: { toEntityId: atomId, toEntityType: 'LearningAtom', fromEntityType: 'LessonLearned' },
    });
    const linkedLessonIds = [...new Set(evidenceLinks.map((l) => l.fromEntityId))];

    const carLinks = linkedLessonIds.length
      ? await this.prisma.carLessonLink.findMany({ where: { lessonLearnedId: { in: linkedLessonIds } } })
      : [];
    const linkedCarIds = [...new Set(carLinks.map((l) => l.carId))];

    const clauses = await this.prisma.policyPackClause.findMany({ where: { mappedAtomIds: { contains: atomId } } });
    const affectedPolicyPackClauseIds = clauses.map((c) => c.id);

    return {
      learners,
      derivedAtomIds,
      linkedLessonIds,
      linkedCarIds,
      affectedPolicyPackClauseIds,
      notApplicable: [
        'Future/batch curriculum packages: not a real concept in this codebase - manifests compile synchronously per assign action, nothing scheduled (confirmed D-067).',
        'Certificates: Certificate is courseId/assessmentAttemptId-keyed (the separate Course/AssessmentAttempt LMS pathway) with zero relation to LearningAtom.',
      ],
    };
  }

  // --- internals ---

  private async release(
    proposalId: string,
    actorUserId: string,
    action: 'APPROVE' | 'APPROVE_WITH_EDITS',
    edits?: Record<string, unknown>,
    editSummary?: string
  ): Promise<{ atomId: string; assignmentsCreated: number }> {
    const { proposal } = await this.loadAuthorized(proposalId, actorUserId);

    const intervention = await this.prisma.learningIntervention.findUniqueOrThrow({
      where: { id: proposal.interventionId },
      include: { appropriatenessReview: true },
    });

    // Effective content = machine proposal, with edits applied on top for APPROVE_WITH_EDITS.
    // The machine-proposed fields on `proposal` are never mutated - edits are computed here and
    // persisted separately (humanEditedContent), never overwriting proposal's own columns.
    const effective = {
      title: (edits?.title as string | undefined) ?? proposal.title,
      objective: (edits?.objective as string | undefined) ?? proposal.objective,
      content: (edits?.content as string | undefined) ?? proposal.content ?? undefined,
      format: (edits?.format as string | undefined) ?? proposal.format,
      duration: (edits?.duration as number | undefined) ?? proposal.duration ?? undefined,
      classification: (edits?.classification as string | undefined) ?? proposal.classification,
      effectivenessMethod: (edits?.effectivenessMethod as string | undefined) ?? proposal.effectivenessMethod ?? undefined,
    };
    const editedQuestions = editedAssessmentQuestions(edits?.assessmentQuestions);
    const sourceQuestionIds = fromDbArray<string>(proposal.assessmentQuestionIds);
    const sourceQuestions = editedQuestions ? [] : await this.prisma.atomAssessmentQuestion.findMany({
      where: {
        tenantId: proposal.tenantId,
        status: 'APPROVED',
        ...(sourceQuestionIds.length > 0
          ? { id: { in: sourceQuestionIds } }
          : proposal.baselineAtomId ? { atomId: proposal.baselineAtomId } : { id: { in: [] } }),
      },
      orderBy: { createdAt: 'asc' },
    });
    const assessmentQuestions: ReleaseAssessmentQuestion[] = editedQuestions || sourceQuestions.map((question) => ({
      questionText: question.questionText,
      options: fromDbArray<string>(question.options),
      correctAnswers: fromDbArray<string>(question.correctAnswers),
      explanation: question.explanation,
      points: question.points,
    }));
    if (assessmentQuestions.length === 0) {
      throw new Error(`Release refused: proposal ${proposalId} has no approved assessment questions.`);
    }

    // Kernel governance check - moved here from preparation (see file header). contentStatus:
    // 'APPROVED' is now accurate, since this is the moment that becomes true, not an
    // aspiration. competenceGapIdentified is read from the SAME real, persisted field
    // LessonAutoPreparationService reads - never hardcoded here either.
    const ruleManifest = await this.prisma.maiRuleManifest.findFirst({
      where: { tenantId: this.tenantId, status: 'PUBLISHED' },
      orderBy: { version: 'desc' },
    });
    if (!ruleManifest) {
      throw new Error(`Release refused: no published Kernel rule manifest exists for tenant ${this.tenantId}.`);
    }
    const snapshot = {
        eventId: `revision-release-${proposalId}`,
        themes: [] as string[],
        rolesExposed: [] as string[],
        timestamp: new Date().toISOString(),
        confidentialityClass: effective.classification,
        duplicateOfSourceId: null,
        aiAssisted: false,
        sourceSpans: proposal.lessonLearnedId ?? proposal.baselineAtomId,
        contentStatus: 'APPROVED',
        approvalRecord: actorUserId,
        competenceGapIdentified: intervention.appropriatenessReview?.competenceGapIdentified,
        effectivenessMethod: effective.effectivenessMethod,
      };
    const conditions = await this.kernel.processEvent(this.tenantId, ruleManifest.id, snapshot);
    const majorFinding = conditions.find((condition) => condition.severity === 'MAJOR');
    if (majorFinding) {
      throw new Error(
        `Release refused: proposed content fails governance rule ${majorFinding.ruleId} (${majorFinding.rationale}). ` +
          `Proposal ${proposalId} remains AWAITING_HUMAN_RELEASE - use returnForRework() or reject() explicitly.`
      );
    }

    // Product-safety classification is never bypassed, autonomous or human-initiated.
    const dualApproval = await this.dualApprovalGate.canAssignTraining(this.tenantId, proposal.interventionId);
    if (!dualApproval.canAssign) {
      throw new Error(`Release refused: DUAL_PRODUCT_SAFETY - ${dualApproval.reason}. Proposal ${proposalId} remains AWAITING_HUMAN_RELEASE.`);
    }

    let atom: LearningAtom;
    if (proposal.baselineAtomId) {
      const result = await this.supersession.supersede({
        oldAtomId: proposal.baselineAtomId,
        newAtomData: {
          title: effective.title,
          objective: effective.objective,
          format: effective.format,
          duration: effective.duration ?? 10,
          content: effective.content ?? '',
          classification: effective.classification,
        },
        replacementReason: proposal.editSummary || `Released via ${action} (D-068 human release gate)`,
        replacedBy: actorUserId,
      });
      // ContentSupersessionService.supersede()'s newAtomData shape predates D-068 and doesn't
      // carry effectivenessMethod - reused as-is (not modified, per this service's own "reuse,
      // don't reimplement" design), with a small follow-up update to backfill the one field it
      // doesn't set, rather than widening a shared service's interface for one caller.
      atom = effective.effectivenessMethod
        ? await this.prisma.learningAtom.update({ where: { id: result.newAtom.id }, data: { effectivenessMethod: effective.effectivenessMethod } })
        : result.newAtom;

      const existingAtomIds = fromDbArray<string>(intervention.atomIds);
      const swappedAtomIds = existingAtomIds.map((id) => (id === proposal.baselineAtomId ? atom.id : id));
      await this.prisma.learningIntervention.update({
        where: { id: intervention.id },
        data: { atomIds: JSON.stringify(swappedAtomIds.includes(atom.id) ? swappedAtomIds : [...existingAtomIds, atom.id]) },
      });
    } else {
      atom = await this.prisma.learningAtom.create({
        data: {
          tenantId: this.tenantId,
          title: effective.title,
          objective: effective.objective,
          content: effective.content,
          classification: effective.classification,
          status: 'APPROVED',
          duration: effective.duration,
          revision: 1,
          format: effective.format,
          origin: 'kernel-autonomous-lesson',
          sourceEvidenceIds: proposal.lessonLearnedId ? JSON.stringify([proposal.lessonLearnedId]) : undefined,
          approvedBy: actorUserId,
          approvedAt: new Date(),
          effectivenessMethod: effective.effectivenessMethod,
        },
      });

      if (proposal.lessonLearnedId) {
        await this.prisma.evidenceRelationship.create({
          data: {
            tenantId: this.tenantId,
            fromEntityType: 'LessonLearned',
            fromEntityId: proposal.lessonLearnedId,
            toEntityType: 'LearningAtom',
            toEntityId: atom.id,
            relationshipType: 'implements_lesson',
            createdBy: actorUserId,
          },
        });
      }

      const existingAtomIds = fromDbArray<string>(intervention.atomIds);
      await this.prisma.learningIntervention.update({
        where: { id: intervention.id },
        data: { atomIds: JSON.stringify([...existingAtomIds, atom.id]) },
      });
    }

    await this.prisma.atomAssessmentQuestion.createMany({
      data: assessmentQuestions.map((question) => ({
        tenantId: proposal.tenantId,
        atomId: atom.id,
        questionText: question.questionText,
        options: toDbArray(question.options),
        correctAnswers: toDbArray(question.correctAnswers),
        explanation: question.explanation,
        points: question.points || 1,
        status: 'APPROVED',
        approvedBy: actorUserId,
        approvedAt: new Date(),
      })),
    });

    const approval = await this.prisma.maiApproval.create({
      data: {
        tenantId: this.tenantId,
        approvalType: 'CONTENT_REVISION_RELEASE',
        subjectId: proposal.id,
        subjectType: 'MaiContentRevisionProposal',
        decision: action,
        decidedBy: actorUserId,
        decidedAt: new Date(),
        rationale: editSummary || `Released as ${action}`,
      },
    });

    await this.prisma.maiContentRevisionProposal.update({
      where: { id: proposal.id },
      data: {
        status: 'APPROVED_EFFECTIVE',
        resultingAtomId: atom.id,
        releaseApprovalId: approval.id,
        humanEditedContent: edits ? JSON.stringify(edits) : undefined,
        editSummary: editSummary ?? undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: this.tenantId,
        actor: actorUserId,
        action: 'content_revision_released',
        object: 'LearningAtom',
        objectId: atom.id,
        details: JSON.stringify({ proposalId: proposal.id, action, interventionId: intervention.id }),
      },
    });

    // Distribution, same shared helper the original autonomous pipeline used - respects
    // TrainingBurdenBudgetService exactly as /api/atoms/compile-and-assign does. Historical
    // frozen manifests are never touched (nothing in this codebase mutates one after creation).
    const existingAssignments = await this.prisma.trainingAssignment.findMany({
      where: { interventionId: intervention.id },
      distinct: ['learnerId'],
    });
    const refreshedAtomIds = fromDbArray<string>(
      (await this.prisma.learningIntervention.findUniqueOrThrow({ where: { id: intervention.id } })).atomIds
    );
    const allAtoms = await this.prisma.learningAtom.findMany({ where: { id: { in: refreshedAtomIds } } });

    let assignmentsCreated = 0;
    for (const assignment of existingAssignments) {
      const result = await compileAndAssignAtoms(this.prisma, {
        tenantId: this.tenantId,
        interventionId: intervention.id,
        learnerId: assignment.learnerId,
        atoms: allAtoms,
        requestedBy: actorUserId,
      });
      if (!result.queued) assignmentsCreated += 1;
    }

    return { atomId: atom.id, assignmentsCreated };
  }

  private async loadAuthorized(proposalId: string, actorUserId: string): Promise<{ proposal: MaiContentRevisionProposal; actor: User }> {
    const actor = await this.requireReleaseAuthority(actorUserId);
    const proposal = await this.prisma.maiContentRevisionProposal.findFirstOrThrow({
      where: { id: proposalId, tenantId: this.tenantId },
    });
    if (proposal.status !== 'AWAITING_HUMAN_RELEASE') {
      throw new Error(`MaiContentRevisionProposal ${proposalId} is not AWAITING_HUMAN_RELEASE (status=${proposal.status}) - it cannot be released, returned, or rejected again.`);
    }
    return { proposal, actor };
  }

  // First enforcement of User.role anywhere in this codebase (confirmed by search - every prior
  // route/service only checked for a session cookie). Scoped narrowly to release/rollback
  // actions, not a general permissions system.
  //
  // Progressive Autonomy Charter §18.3: "Transition any content AWAITING_HUMAN_RELEASE ->
  // APPROVED_EFFECTIVE... is structurally forbidden to any SYSTEM: principal - enforced in the
  // release code path itself. A non-human actor attempting release is rejected and logged
  // regardless of profile." The string-prefix check is explicit and logged BEFORE the DB lookup,
  // not left to an incidental Prisma not-found error - this is a named constitutional boundary,
  // not a side effect of user-id validation.
  private async requireReleaseAuthority(actorUserId: string): Promise<User> {
    if (actorUserId.startsWith('SYSTEM:') || actorUserId === 'SYSTEM') {
      await this.prisma.auditLog.create({
        data: {
          organizationId: this.tenantId,
          actor: null,
          action: 'release_attempt_by_system_principal_rejected',
          object: 'MaiContentRevisionProposal',
          objectId: actorUserId,
          details: JSON.stringify({ attemptedActor: actorUserId }),
        },
      });
      throw new Error(
        `Release refused: '${actorUserId}' is a SYSTEM principal. Progressive Autonomy Charter §18.3 ` +
          `structurally forbids any non-human actor from transitioning content AWAITING_HUMAN_RELEASE -> ` +
          `APPROVED_EFFECTIVE, regardless of any Authority Profile flag. This is logged, not silently blocked.`
      );
    }
    const actor = await this.prisma.user.findUniqueOrThrow({ where: { id: actorUserId } });
    if (actor.role === 'learner') {
      throw new Error(`User ${actorUserId} (role=${actor.role}) is not authorized to release, return, reject, or roll back content revisions.`);
    }
    return actor;
  }

  private async findCurrentEffectiveAtom(atomId: string): Promise<LearningAtom> {
    let cursor = await this.prisma.learningAtom.findUniqueOrThrow({ where: { id: atomId } });
    while (cursor.replacementAtomId) {
      cursor = await this.prisma.learningAtom.findUniqueOrThrow({ where: { id: cursor.replacementAtomId } });
    }
    return cursor;
  }
}

export const lessonRevisionReleaseServiceSingleton = (prisma: PrismaClient, tenantId: string) =>
  new LessonRevisionReleaseService(prisma, tenantId);
