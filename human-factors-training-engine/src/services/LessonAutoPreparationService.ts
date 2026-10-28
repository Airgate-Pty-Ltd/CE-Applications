/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient, LessonLearned, MaiAuthorityProfile as AuthorityProfileRow } from '@prisma/client';
import crypto from 'crypto';
import { fromDbArray } from '@/lib/json';
import {
  AuthorityProfile,
  GovernedDecision,
  validateAuthorityProfile,
  createGovernedDecision,
} from '@/services/MaiDecisionAdapter';

/**
 * D-068 (renamed and re-scoped from D-067's LessonAutoImplementationService, per the owner's
 * human-release correction): this service PREPARES a proposed content revision autonomously -
 * it never releases one. Preparing a revision is still gated by a MaiAuthorityProfile and still
 * produces a full GovernedDecision lineage; what changed is the decisionState (PREPARE, not
 * PROCEED_AND_NOTIFY) and the artifact produced (a staged MaiContentRevisionProposal, not a
 * live LearningAtom). Release into an effective, distributed atom is LessonRevisionReleaseService's
 * job, and always requires an authorized human action.
 *
 * Authority begins strictly AFTER a LessonLearned reaches APPROVED_LEARNING_INTERVENTION_
 * REQUIRED (a human/upstream-confirmed judgment - see precondition below). Nothing here ever
 * sets CorrectiveAction.trainingClassification or authors CAR content - that stays human, always.
 */

// Reconciles HF-ENGINE's own fine-grained LessonLearned.sourceClassification down to the
// Kernel's coarser AuthorityProfile.trustedSourceClasses enum. The Kernel only ever sees the
// coarse class; LessonLearned keeps and surfaces the fine one in its own UI/audit trail.
const SOURCE_CLASS_MAP: Record<string, AuthorityProfile['trustedSourceClasses'][number]> = {
  CONFIRMED_INDUSTRY_FINDING: 'TRUSTED_CONFIRMED',
  APPROVED_HUMAN_FACTORS_LESSON: 'TRUSTED_CONFIRMED',
  VALIDATED_INTERNAL_LESSON: 'VALIDATED_INTERNAL',
  INTERNAL_UNVALIDATED: 'UNVALIDATED',
};

export type PrepareOutcome =
  | {
      decisionState: 'PREPARE';
      decisionId: string;
      proposalId: string;
      interventionId: string;
      baselineAtomId: string | null;
    }
  | { decisionState: 'ESCALATE'; decisionId: string; reason: string };

export class LessonAutoPreparationService {
  constructor(private prisma: PrismaClient, private tenantId: string) {
    if (!tenantId) throw new Error('LessonAutoPreparationService requires a tenantId.');
  }

  async prepare(lessonId: string, authorityProfileId: string): Promise<PrepareOutcome> {
    const lesson = await this.prisma.lessonLearned.findFirstOrThrow({
      where: { id: lessonId, tenantId: this.tenantId },
    });

    // Step 1: precondition, NOT a kernel decision. The confirmation judgment - is this
    // finding real, does it need a learning intervention - stays 100% human/upstream.
    // Authority begins strictly after approval, never at approval.
    if (lesson.status !== 'APPROVED_LEARNING_INTERVENTION_REQUIRED') {
      throw new Error(
        `LessonLearned ${lessonId} is not APPROVED_LEARNING_INTERVENTION_REQUIRED ` +
          `(status=${lesson.status}). Autonomous preparation only begins after human ` +
          `approval - it never performs that approval itself.`
      );
    }

    // Step 2: load + revalidate the ACTIVE authority profile (defense in depth - re-validated
    // here even though the seed already validated it, per EmergencyContentManager's own
    // "refuse to guess, fail loud" instinct - a hand-edited row must not silently be trusted).
    // D-068: findMany, not findFirst - more than one ACTIVE row for the same authorityProfileId
    // is a real data-integrity conflict that must escalate, not be silently resolved by picking
    // the highest version.
    const profileRows = await this.prisma.maiAuthorityProfile.findMany({
      where: { authorityProfileId, status: 'ACTIVE' },
      orderBy: { version: 'desc' },
    });
    if (profileRows.length === 0) {
      return this.escalate(lesson, null, `No ACTIVE MaiAuthorityProfile found for ${authorityProfileId}.`);
    }
    if (profileRows.length > 1) {
      return this.escalate(
        lesson,
        profileRows[0],
        `CONFLICTING_AUTHORITY: ${profileRows.length} ACTIVE MaiAuthorityProfile rows found for ${authorityProfileId} (versions ${profileRows.map((r) => r.version).join(', ')}) - refusing to silently pick one.`
      );
    }
    const profileRow = profileRows[0];
    const profile = this.toKernelProfile(profileRow);
    const profileErrors = validateAuthorityProfile(profile);
    if (profileErrors.length > 0) {
      return this.escalate(
        lesson,
        profileRow,
        `Authority profile ${authorityProfileId} v${profileRow.version} failed validation: ${profileErrors.join('; ')}`
      );
    }

    const kernelSourceClass = SOURCE_CLASS_MAP[lesson.sourceClassification];
    if (!kernelSourceClass || !profile.trustedSourceClasses.includes(kernelSourceClass)) {
      return this.escalate(
        lesson,
        profileRow,
        `SOURCE_CONFIDENCE_INSUFFICIENT: sourceClassification ${lesson.sourceClassification} is not within this profile's trustedSourceClasses.`
      );
    }

    // Fail-closed default (MaiAuthorityProfile.humanApprovalPerInstance defaults true in the
    // schema): a profile is only autonomous once someone explicitly flips this to false. Note
    // what "autonomous" now means post-D-068: autonomous PREPARATION only. Release is never
    // autonomous regardless of this flag - see LessonRevisionReleaseService.
    if (profile.humanApprovalPerInstance) {
      return this.escalate(
        lesson,
        profileRow,
        `Authority profile ${authorityProfileId} v${profileRow.version} has humanApprovalPerInstance=true - autonomous preparation is not permitted under this profile.`
      );
    }

    // Step 3: constraint stable-code checks. Each is a real, checkable function - no fabricated
    // logic. See file header on which codes are enforced vs merely declared.
    const constraintFailure = await this.checkConstraints(lesson, profile);
    if (constraintFailure) {
      return this.escalate(lesson, profileRow, constraintFailure);
    }

    // Step 4 (D-068: reordered ahead of the governance-rule check - the snapshot below needs
    // to read the intervention's real appropriateness review, which requires the intervention
    // to already be resolved). TARGET_CONCEPT_MATCH is a real check against existing PUBLISHED
    // interventions' atoms' applicabilityTags, not a fabricated topic-matching engine.
    const targetIntervention = await this.resolveTargetIntervention(lesson);
    if (!targetIntervention) {
      return this.escalate(lesson, profileRow, 'TARGET_CONCEPT_MATCH: lesson has no themes to map to a curriculum target.');
    }

    // D-068: the 14-rule governance check (MaiKernel.processEvent()) moved to
    // LessonRevisionReleaseService, run immediately before materialization, and does NOT run
    // here. Found by actually running this service's tests, not by reasoning about it in
    // advance: HFSRC-005 ("a publication request was made for content not in APPROVED status")
    // fired on every single preparation, because contentStatus is genuinely never 'APPROVED' at
    // prepare time - nothing is being published yet, only staged. Evaluating a publication-time
    // rule against a non-publication action is a category error, the same reasoning that moved
    // DualApprovalGate's check to release time too. The invariant this whole correction cares
    // about - content cannot become live/published without passing governance - is preserved
    // exactly, just checked at the moment that's actually true of the action being gated.

    // D-068: no atom-revision-detection exists in this codebase - resolveTargetIntervention()
    // matches to an INTERVENTION (by shared theme/tag), never to a specific existing ATOM to
    // revise. baselineAtomId is honestly null for every lesson-triggered preparation today; it
    // exists on the schema to serve the ROLLBACK trigger type (LessonRevisionReleaseService),
    // where it is genuinely populated. Do not fabricate atom-matching logic here to populate it.
    const baselineAtomId: string | null = null;

    // Step 5: build the GovernedDecision. decisionState PREPARE (not PROCEED/PROCEED_AND_NOTIFY)
    // - preparation is autonomous, release is not. humanReviewRequired: true encodes exactly
    // that distinction on the persisted record, not just in this file's comments.
    const decisionId = crypto.randomUUID();
    const decision: GovernedDecision = createGovernedDecision({
      decisionId,
      tenant: this.tenantId,
      domain: 'human-factors-training',
      authorityScope: authorityProfileId,
      ruleId: authorityProfileId,
      ruleRevision: profileRow.version,
      evidenceState: 'VERIFIED',
      confidence: 1,
      rationale: `Confirmed lesson "${lesson.title}" (${lesson.sourceClassification}) prepared as a proposed revision under Authority Profile ${authorityProfileId} v${profileRow.version}. Awaiting human release.`,
      decisionState: 'PREPARE',
      permittedHostAction: 'prepare:lesson.revision_proposal',
      humanReviewRequired: true,
      overrideAuthority: [],
      authorityProfileId,
      authorityProfileRevision: profileRow.version,
      authorityProfileHash: profileRow.profileHash,
      authorityEffectiveFrom: profileRow.effectiveDate.toISOString(),
      autonomousExecutionPermitted: true,
      immutableAuditReference: `mai_governed_decision:${decisionId}`,
      timestamp: new Date().toISOString(),
    });

    // Step 6: stage the proposal. No LearningAtom is created, nothing is distributed - this is
    // preparation only. The proposal becomes a real atom exclusively via
    // LessonRevisionReleaseService, on authorized human action. interventionId is persisted so
    // release time knows which intervention's atomIds to update without re-resolving it.
    const proposal = await this.prisma.maiContentRevisionProposal.create({
      data: {
        tenantId: this.tenantId,
        triggerType: 'LESSON_PREPARATION',
        lessonLearnedId: lesson.id,
        interventionId: targetIntervention.id,
        baselineAtomId: baselineAtomId ?? undefined,
        preparingDecisionId: decisionId,
        status: 'AWAITING_HUMAN_RELEASE',
        title: `Lesson: ${lesson.title}`,
        objective: lesson.summary,
        content: lesson.narrative || lesson.summary,
        format: 'micro_lesson',
        duration: 10,
        classification: 'INTERNAL',
        // A proposed effectiveness-measurement approach, not a fabricated evidence claim - this
        // is content the preparation step is legitimately allowed to draft (like title/content),
        // reviewable and editable by the human at release (Approve With Edits). Different from
        // competenceGapIdentified, which is a judgment ABOUT the intervention that only a human
        // appropriateness review may establish - see the release-time governance check for that.
        effectivenessMethod: 'workplace_transfer_observation',
      },
    });

    await this.prisma.maiGovernedDecision.create({
      data: this.decisionToRow(decision, lesson, profileRow, proposal.id),
    });

    return {
      decisionState: 'PREPARE',
      decisionId,
      proposalId: proposal.id,
      interventionId: targetIntervention.id,
      baselineAtomId,
    };
  }

  // Persists an ESCALATE decision (still a real GovernedDecision, per "everything persists" -
  // an escalation is not a silent failure, it's a recorded outcome awaiting human response).
  private async escalate(
    lesson: LessonLearned,
    profileRow: AuthorityProfileRow | null,
    reason: string
  ): Promise<PrepareOutcome> {
    const decisionId = crypto.randomUUID();
    const decision: GovernedDecision = createGovernedDecision({
      decisionId,
      tenant: this.tenantId,
      domain: 'human-factors-training',
      authorityScope: profileRow?.authorityProfileId ?? 'UNRESOLVED',
      ruleId: profileRow?.authorityProfileId ?? 'UNRESOLVED',
      ruleRevision: profileRow?.version ?? 1,
      evidenceState: 'PARTIAL',
      confidence: 0,
      rationale: reason,
      decisionState: 'ESCALATE',
      permittedHostAction: 'route:lesson.escalate_human_review',
      humanReviewRequired: true,
      overrideAuthority: [],
      authorityProfileId: profileRow?.authorityProfileId,
      authorityProfileRevision: profileRow?.version,
      authorityProfileHash: profileRow?.profileHash,
      autonomousExecutionPermitted: false,
      immutableAuditReference: `mai_governed_decision:${decisionId}`,
      timestamp: new Date().toISOString(),
    });

    await this.prisma.maiGovernedDecision.create({
      data: this.decisionToRow(decision, lesson, profileRow, null),
    });

    return { decisionState: 'ESCALATE', decisionId, reason };
  }

  private decisionToRow(
    decision: GovernedDecision,
    lesson: LessonLearned,
    profileRow: AuthorityProfileRow | null,
    resultingProposalId: string | null
  ) {
    return {
      decisionId: decision.decisionId,
      tenantId: decision.tenant,
      domain: decision.domain,
      authorityScope: decision.authorityScope,
      ruleId: decision.ruleId,
      ruleRevision: decision.ruleRevision,
      evidenceState: decision.evidenceState,
      confidence: decision.confidence,
      rationale: decision.rationale,
      decisionState: decision.decisionState,
      permittedHostAction: decision.permittedHostAction,
      humanReviewRequired: decision.humanReviewRequired,
      overrideAuthority: JSON.stringify(decision.overrideAuthority),
      authorityProfileRowId: profileRow?.id,
      authorityProfileId: decision.authorityProfileId,
      authorityProfileRevision: decision.authorityProfileRevision,
      authorityProfileHash: decision.authorityProfileHash,
      authorityEffectiveFrom: decision.authorityEffectiveFrom ? new Date(decision.authorityEffectiveFrom) : undefined,
      authorityEffectiveTo: decision.authorityEffectiveTo ? new Date(decision.authorityEffectiveTo) : undefined,
      autonomousExecutionPermitted: decision.autonomousExecutionPermitted,
      subjectType: 'LessonLearned',
      subjectId: lesson.id,
      lessonLearnedId: lesson.id,
      resultingProposalId: resultingProposalId ?? undefined,
      immutableAuditReference: decision.immutableAuditReference,
      timestamp: new Date(decision.timestamp),
    };
  }

  // Reconstructs a kernel AuthorityProfile from the DB row. Real, not decorative: this must
  // pass @mai/kernel's own validateAuthorityProfile() before being trusted.
  private toKernelProfile(row: AuthorityProfileRow): AuthorityProfile {
    return {
      authorityProfileId: row.authorityProfileId,
      version: row.version,
      effectiveDate: row.effectiveDate.toISOString(),
      approvedBy: row.approvedBy,
      trustedSourceClasses: JSON.parse(row.trustedSourceClasses),
      permittedBehaviors: JSON.parse(row.permittedBehaviors),
      humanApprovalPerInstance: row.humanApprovalPerInstance,
      constraints: JSON.parse(row.constraints),
      escalateWhen: JSON.parse(row.escalateWhen),
    };
  }

  // The Kernel does zero interpretation of constraints/escalateWhen strings (confirmed by
  // reading kernel/src/decision.ts - validateAuthorityProfile() only checks they're arrays).
  // Every code here has a real, honest check. REGULATORY_CONTRADICTION is declared in the
  // seeded profile but NOT checked here - no contradiction detector exists in this codebase;
  // faking one would be worse than not having it.
  private async checkConstraints(lesson: LessonLearned, profile: AuthorityProfile): Promise<string | null> {
    // SOURCE_PROVENANCE_VALID: an industry-sourced lesson must cite where it came from; an
    // internal lesson must have at least one real evidence link.
    if (profile.constraints.includes('SOURCE_PROVENANCE_VALID')) {
      const hasExternalRef = !!lesson.externalSourceRef?.trim();
      const hasEvidenceLink = hasExternalRef
        ? true
        : (await this.prisma.evidenceRelationship.count({
            where: { tenantId: this.tenantId, toEntityId: lesson.id, toEntityType: 'LessonLearned' },
          })) > 0;
      if (!hasExternalRef && !hasEvidenceLink) {
        return 'SOURCE_PROVENANCE_VALID: lesson has neither an externalSourceRef nor any linked evidence.';
      }
    }

    // NO_HIGHER_AUTHORITY_CONTRADICTION: if a human has already decided, for a linked CAR,
    // that training is inappropriate, the kernel must not autonomously prepare content anyway.
    if (profile.constraints.includes('NO_HIGHER_AUTHORITY_CONTRADICTION')) {
      const conflictingLinks = await this.prisma.carLessonLink.findMany({
        where: { tenantId: this.tenantId, lessonLearnedId: lesson.id },
        include: { car: true },
      });
      const inappropriate = conflictingLinks.find((l) => l.car.trainingClassification === 'TRAINING_INAPPROPRIATE');
      if (inappropriate) {
        return `NO_HIGHER_AUTHORITY_CONTRADICTION: linked CAR ${inappropriate.car.carNumber} classified training as inappropriate.`;
      }
    }

    if (profile.constraints.includes('TENANT_SCOPE_VALID') && lesson.tenantId !== this.tenantId) {
      return `TENANT_SCOPE_VALID: lesson.tenantId (${lesson.tenantId}) does not match the operating tenant (${this.tenantId}).`;
    }

    return null;
  }

  // TARGET_CONCEPT_MATCH: real matching against existing PUBLISHED interventions' atoms'
  // applicabilityTags, not a fabricated topic-matching engine. Falls back to creating a
  // minimal new intervention when no existing one overlaps - but only if the lesson has
  // themes to name/tag it with; a themeless lesson has nothing to match or seed, so returns
  // null (the caller treats that as a TARGET_CONCEPT_MATCH failure).
  private async resolveTargetIntervention(lesson: LessonLearned) {
    const lessonThemes = fromDbArray<string>(lesson.themes);
    if (lessonThemes.length === 0) return null;

    const candidates = await this.prisma.learningIntervention.findMany({
      where: { tenantId: this.tenantId, status: 'PUBLISHED' },
      include: { appropriatenessReview: true },
    });
    for (const candidate of candidates) {
      const atomIds = fromDbArray<string>(candidate.atomIds);
      if (atomIds.length === 0) continue;
      const atoms = await this.prisma.learningAtom.findMany({
        where: { tenantId: this.tenantId, id: { in: atomIds } },
      });
      const tags = new Set(atoms.flatMap((a) => fromDbArray<string>(a.applicabilityTags)));
      if (lessonThemes.some((t) => tags.has(t))) return candidate;
    }

    return this.prisma.learningIntervention.create({
      data: {
        tenantId: this.tenantId,
        title: `Autonomous: ${lesson.title}`,
        description: lesson.summary,
        origin: 'kernel-autonomous-lesson',
        designedBy: 'SYSTEM:kernel-autonomous',
        status: 'DRAFT',
      },
      include: { appropriatenessReview: true },
    });
  }
}

export const lessonAutoPreparationServiceSingleton = (prisma: PrismaClient, tenantId: string) =>
  new LessonAutoPreparationService(prisma, tenantId);
