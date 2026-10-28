/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { LessonAutoPreparationService } from "../LessonAutoPreparationService";

/**
 * D-068 (renamed/re-scoped from D-067's LessonAutoImplementationService.test.ts): coverage for
 * autonomous PREPARATION only. This service never creates a live LearningAtom, never
 * distributes anything, and never touches DualApprovalGate (that's a distribution-time
 * concern, now exclusively LessonRevisionReleaseService's - see that file's test suite for the
 * DUAL_PRODUCT_SAFETY case). Real DB, real service, no mocks.
 */
describe("LessonAutoPreparationService (D-068, bounded autonomous PREPARATION only)", () => {
  let prisma: PrismaClient;
  let service: LessonAutoPreparationService;
  const testTag = `laps-test-${Date.now()}`;

  beforeAll(() => {
    prisma = new PrismaClient();
    service = new LessonAutoPreparationService(prisma, 'tenant_001');
  });

  afterAll(async () => {
    await prisma.maiGovernedDecision.deleteMany({ where: { rationale: { contains: testTag } } });
    await prisma.maiContentRevisionProposal.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.learningInterventionAppropriatenessReview.deleteMany({ where: { intervention: { title: { contains: testTag } } } });
    await prisma.learningIntervention.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.evidenceRelationship.deleteMany({ where: { fromEntityType: "LessonLearned", createdBy: "SYSTEM" } });
    await prisma.learningAtom.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.carLessonLink.deleteMany({ where: { lessonLearned: { title: { contains: testTag } } } });
    await prisma.correctiveAction.deleteMany({ where: { carNumber: { contains: testTag } } });
    await prisma.lessonLearned.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.maiAuthorityProfile.deleteMany({ where: { authorityProfileId: { contains: testTag } } });
    await prisma.$disconnect();
  });

  async function makeProfile(overrides: Partial<{ humanApprovalPerInstance: boolean; trustedSourceClasses: string[]; constraints: string[] }> = {}) {
    const id = `${testTag}-profile-${Math.random().toString(36).slice(2)}`;
    return prisma.maiAuthorityProfile.create({
      data: {
        authorityProfileId: id,
        version: 1,
        effectiveDate: new Date(),
        approvedBy: "Test Author",
        trustedSourceClasses: JSON.stringify(overrides.trustedSourceClasses ?? ["TRUSTED_CONFIRMED", "VALIDATED_INTERNAL"]),
        permittedBehaviors: JSON.stringify(["PREPARE", "ESCALATE"]),
        humanApprovalPerInstance: overrides.humanApprovalPerInstance ?? false,
        constraints: JSON.stringify(overrides.constraints ?? ["SOURCE_PROVENANCE_VALID", "TARGET_CONCEPT_MATCH", "NO_HIGHER_AUTHORITY_CONTRADICTION", "TENANT_SCOPE_VALID"]),
        escalateWhen: JSON.stringify(["SOURCE_CONFIDENCE_INSUFFICIENT", "CONFLICTING_LESSONS", "TARGET_OUTSIDE_SCOPE"]),
        status: "ACTIVE",
        profileHash: "test-hash",
      },
    });
  }

  async function makeLesson(overrides: Partial<{ status: string; sourceClassification: string; themes: string[]; externalSourceRef: string | null }> = {}) {
    return prisma.lessonLearned.create({
      data: {
        tenantId: "tenant_001",
        title: `${testTag} Confirmed fatigue finding`,
        summary: "Test summary of a confirmed industry finding.",
        narrative: "Test narrative content for the resulting atom.",
        status: overrides.status ?? "APPROVED_LEARNING_INTERVENTION_REQUIRED",
        sourceClassification: overrides.sourceClassification ?? "CONFIRMED_INDUSTRY_FINDING",
        themes: JSON.stringify(overrides.themes ?? [`${testTag}-fatigue`]),
        externalSourceRef: overrides.externalSourceRef === undefined ? "https://example.org/industry-finding" : overrides.externalSourceRef,
      },
    });
  }

  // Creates a PUBLISHED intervention with a matching-tagged atom AND a real appropriateness
  // review (competenceGapIdentified: true) - required since D-068 reads this field for real
  // instead of hardcoding it. A themed intervention with no review is a distinct, deliberately
  // tested case below (governance escalation).
  async function makeMatchingInterventionWithReview(themeTag: string) {
    const atom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag} existing atom`,
        objective: "obj",
        content: "content",
        classification: "INTERNAL",
        status: "APPROVED",
        format: "micro_lesson",
        duration: 5,
        applicabilityTags: JSON.stringify([themeTag]),
      },
    });
    const intervention = await prisma.learningIntervention.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag} target intervention`,
        status: "PUBLISHED",
        designedBy: "test",
        atomIds: JSON.stringify([atom.id]),
      },
    });
    await prisma.learningInterventionAppropriatenessReview.create({
      data: {
        interventionId: intervention.id,
        competenceGapIdentified: true,
        trainingReducesRisk: true,
        reviewedBy: "qm.demo@example.com",
      },
    });
    return intervention;
  }

  test("happy path: PREPARE stages a MaiContentRevisionProposal (AWAITING_HUMAN_RELEASE) — no LearningAtom, no EvidenceRelationship, no distribution", async () => {
    const profile = await makeProfile();
    const themeTag = `${testTag}-fatigue`;
    const intervention = await makeMatchingInterventionWithReview(themeTag);
    const lesson = await makeLesson({ themes: [themeTag] });

    const outcome = await service.prepare(lesson.id, profile.authorityProfileId);

    expect(outcome.decisionState).toBe("PREPARE");
    if (outcome.decisionState !== "PREPARE") throw new Error("unreachable");
    expect(outcome.interventionId).toBe(intervention.id);
    expect(outcome.baselineAtomId).toBeNull();

    const proposal = await prisma.maiContentRevisionProposal.findUniqueOrThrow({ where: { id: outcome.proposalId } });
    expect(proposal.status).toBe("AWAITING_HUMAN_RELEASE");
    expect(proposal.triggerType).toBe("LESSON_PREPARATION");
    expect(proposal.lessonLearnedId).toBe(lesson.id);
    expect(proposal.interventionId).toBe(intervention.id);
    expect(proposal.resultingAtomId).toBeNull();

    // Nothing is live yet - no atom, no evidence link, no distribution.
    const atoms = await prisma.learningAtom.findMany({ where: { sourceEvidenceIds: { contains: lesson.id } } });
    expect(atoms).toHaveLength(0);
    const relationship = await prisma.evidenceRelationship.findFirst({ where: { fromEntityId: lesson.id, relationshipType: "implements_lesson" } });
    expect(relationship).toBeNull();

    const decision = await prisma.maiGovernedDecision.findUniqueOrThrow({ where: { decisionId: outcome.decisionId } });
    expect(decision.decisionState).toBe("PREPARE");
    expect(decision.humanReviewRequired).toBe(true); // the one-line encoding of "prepared, not released"
    expect(decision.autonomousExecutionPermitted).toBe(true); // preparation itself is still autonomous
    expect(decision.resultingProposalId).toBe(proposal.id);
    expect(decision.resultingAtomId).toBeNull();
  });

  test("precondition: throws (not a silent no-op) if the lesson is not yet APPROVED_LEARNING_INTERVENTION_REQUIRED", async () => {
    const profile = await makeProfile();
    const lesson = await makeLesson({ status: "UNDER_REVIEW" });
    await expect(service.prepare(lesson.id, profile.authorityProfileId)).rejects.toThrow(/APPROVED_LEARNING_INTERVENTION_REQUIRED/);
  });

  test("ESCALATE: no ACTIVE authority profile found", async () => {
    const lesson = await makeLesson();
    const outcome = await service.prepare(lesson.id, `${testTag}-nonexistent-profile`);
    expect(outcome.decisionState).toBe("ESCALATE");
    if (outcome.decisionState !== "ESCALATE") throw new Error("unreachable");
    expect(outcome.reason).toMatch(/No ACTIVE MaiAuthorityProfile/);
  });

  test("ESCALATE: CONFLICTING_AUTHORITY when more than one ACTIVE profile row exists for the same authorityProfileId", async () => {
    const id = `${testTag}-profile-conflict`;
    const base = {
      authorityProfileId: id,
      approvedBy: "Test Author",
      trustedSourceClasses: JSON.stringify(["TRUSTED_CONFIRMED"]),
      permittedBehaviors: JSON.stringify(["PREPARE"]),
      humanApprovalPerInstance: false,
      constraints: JSON.stringify([]),
      escalateWhen: JSON.stringify([]),
      status: "ACTIVE",
      profileHash: "h",
    };
    await prisma.maiAuthorityProfile.create({ data: { ...base, version: 1, effectiveDate: new Date() } });
    await prisma.maiAuthorityProfile.create({ data: { ...base, version: 2, effectiveDate: new Date() } });

    const lesson = await makeLesson();
    const outcome = await service.prepare(lesson.id, id);
    expect(outcome.decisionState).toBe("ESCALATE");
    if (outcome.decisionState !== "ESCALATE") throw new Error("unreachable");
    expect(outcome.reason).toMatch(/CONFLICTING_AUTHORITY/);
  });

  test("ESCALATE: humanApprovalPerInstance=true blocks preparation even when every other check would pass", async () => {
    const profile = await makeProfile({ humanApprovalPerInstance: true });
    const lesson = await makeLesson();
    const outcome = await service.prepare(lesson.id, profile.authorityProfileId);
    expect(outcome.decisionState).toBe("ESCALATE");
    if (outcome.decisionState !== "ESCALATE") throw new Error("unreachable");
    expect(outcome.reason).toMatch(/humanApprovalPerInstance=true/);

    const proposals = await prisma.maiContentRevisionProposal.findMany({ where: { lessonLearnedId: lesson.id } });
    expect(proposals).toHaveLength(0);
  });

  test("ESCALATE: SOURCE_CONFIDENCE_INSUFFICIENT when the lesson's source classification is not in the profile's trustedSourceClasses", async () => {
    const profile = await makeProfile({ trustedSourceClasses: ["TRUSTED_CONFIRMED"] });
    const lesson = await makeLesson({ sourceClassification: "INTERNAL_UNVALIDATED" });
    const outcome = await service.prepare(lesson.id, profile.authorityProfileId);
    expect(outcome.decisionState).toBe("ESCALATE");
    if (outcome.decisionState !== "ESCALATE") throw new Error("unreachable");
    expect(outcome.reason).toMatch(/SOURCE_CONFIDENCE_INSUFFICIENT/);
  });

  test("ESCALATE: SOURCE_PROVENANCE_VALID fails when there is neither an externalSourceRef nor any linked evidence", async () => {
    const profile = await makeProfile();
    const lesson = await makeLesson({ externalSourceRef: null });
    const outcome = await service.prepare(lesson.id, profile.authorityProfileId);
    expect(outcome.decisionState).toBe("ESCALATE");
    if (outcome.decisionState !== "ESCALATE") throw new Error("unreachable");
    expect(outcome.reason).toMatch(/SOURCE_PROVENANCE_VALID/);
  });

  test("ESCALATE: TARGET_CONCEPT_MATCH fails when the lesson has no themes at all", async () => {
    const profile = await makeProfile();
    const lesson = await makeLesson({ themes: [] });
    const outcome = await service.prepare(lesson.id, profile.authorityProfileId);
    expect(outcome.decisionState).toBe("ESCALATE");
    if (outcome.decisionState !== "ESCALATE") throw new Error("unreachable");
    expect(outcome.reason).toMatch(/TARGET_CONCEPT_MATCH/);
  });

  test("ESCALATE: NO_HIGHER_AUTHORITY_CONTRADICTION fires when a linked CAR already classified training as inappropriate", async () => {
    const profile = await makeProfile();
    const lesson = await makeLesson();
    const car = await prisma.correctiveAction.create({
      data: {
        tenantId: "tenant_001",
        carNumber: `${testTag}-CAR-001`,
        title: "test CAR",
        issueStatement: "issue",
        trainingClassification: "TRAINING_INAPPROPRIATE",
      },
    });
    await prisma.carLessonLink.create({
      data: { tenantId: "tenant_001", carId: car.id, lessonLearnedId: lesson.id, createdBy: "test" },
    });

    const outcome = await service.prepare(lesson.id, profile.authorityProfileId);
    expect(outcome.decisionState).toBe("ESCALATE");
    if (outcome.decisionState !== "ESCALATE") throw new Error("unreachable");
    expect(outcome.reason).toMatch(/NO_HIGHER_AUTHORITY_CONTRADICTION/);
  });

  test("prepare() succeeds even for a themed lesson whose fallback intervention has no appropriateness review yet — D-068 moved the 14-rule governance check to release time, not prepare time (see LessonRevisionReleaseService.test.ts for the HFINT-002/no-fabricated-evidence coverage). Confirmed by running the old prepare-time check: it made HFSRC-005 fire on every single preparation, a category error (nothing is being published at prepare time) - not a real defect to work around.", async () => {
    const profile = await makeProfile();
    const lesson = await makeLesson({ themes: [`${testTag}-no-review-theme`] });
    const outcome = await service.prepare(lesson.id, profile.authorityProfileId);
    expect(outcome.decisionState).toBe("PREPARE");
    if (outcome.decisionState !== "PREPARE") throw new Error("unreachable");

    const proposal = await prisma.maiContentRevisionProposal.findUniqueOrThrow({ where: { id: outcome.proposalId } });
    const intervention = await prisma.learningIntervention.findUniqueOrThrow({
      where: { id: proposal.interventionId },
      include: { appropriatenessReview: true },
    });
    expect(intervention.appropriatenessReview).toBeNull(); // confirms this really is the no-review case
  });
});
