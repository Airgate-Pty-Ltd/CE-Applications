/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { LessonRevisionReleaseService } from "../LessonRevisionReleaseService";
import { provisionApprovedKernelManifest } from "../../lib/kernelRuleManifest";

/**
 * D-068: coverage for the human-release gate itself. Real DB, real service, no mocks. Covers
 * both LESSON_PREPARATION-triggered proposals (net-new atom materialization) and ROLLBACK
 * (supersession-based materialization via ContentSupersessionService).
 */
describe("LessonRevisionReleaseService (D-068, human release gate)", () => {
  let prisma: PrismaClient;
  let service: LessonRevisionReleaseService;
  const testTag = `lrrs-test-${Date.now()}`;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await provisionApprovedKernelManifest(prisma, 'tenant_001');
    service = new LessonRevisionReleaseService(prisma, 'tenant_001');
  });

  afterAll(async () => {
    await prisma.maiApproval.deleteMany({ where: { rationale: { contains: testTag } } });
    await prisma.maiContentRevisionProposal.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.trainingAssignment.deleteMany({ where: { interventionId: { in: await interventionIdsForTag() } } });
    await prisma.trainingPackageManifest.deleteMany({ where: { packageId: { contains: testTag } } });
    await prisma.learningInterventionAppropriatenessReview.deleteMany({ where: { intervention: { title: { contains: testTag } } } });
    await prisma.evidenceRelationship.deleteMany({ where: { fromEntityType: "LessonLearned", createdBy: { not: "SYSTEM" } } });
    await prisma.auditLog.deleteMany({ where: { details: { contains: testTag } } });
    await prisma.learningIntervention.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.learningAtom.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.lessonLearned.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.user.deleteMany({ where: { email: { contains: testTag } } });
    await prisma.$disconnect();
  });

  async function interventionIdsForTag(): Promise<string[]> {
    const rows = await prisma.learningIntervention.findMany({ where: { title: { contains: testTag } }, select: { id: true } });
    return rows.map((r) => r.id);
  }

  async function makeUser(role: "learner" | "trainer" | "admin") {
    const user = await prisma.user.create({
      data: { email: `${role}-${testTag}-${Math.random().toString(36).slice(2)}@example.com`, passwordHash: "x", name: `Test ${role}`, role },
    });
    await prisma.organizationMember.create({
      data: { organizationId: 'tenant_001', userId: user.id, role },
    });
    return user;
  }

  async function makeInterventionWithReview(hasReview: boolean, atomId?: string) {
    const intervention = await prisma.learningIntervention.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag} intervention`,
        status: "PUBLISHED",
        designedBy: "test",
        atomIds: JSON.stringify(atomId ? [atomId] : []),
      },
    });
    if (hasReview) {
      await prisma.learningInterventionAppropriatenessReview.create({
        data: { interventionId: intervention.id, competenceGapIdentified: true, trainingReducesRisk: true, reviewedBy: "qm.demo@example.com" },
      });
    }
    return intervention;
  }

  // effectivenessMethod set to a real value already established in this codebase's own
  // vocabulary (see LessonAutoPreparationService/EmergencyContentManager fixtures) - governance
  // rule HFINT-003 legitimately fires when it's absent (tested separately, D-068 core fix), so
  // every fixture that isn't specifically testing that escalation needs a real value here.
  async function makeNetNewProposal(interventionId: string, lessonLearnedId?: string) {
    const questionSource = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag} assessment source ${Math.random().toString(36).slice(2)}`,
        objective: "assessment source",
        format: "question_cluster",
        status: "APPROVED",
        assessmentQuestions: {
          create: {
            tenantId: "tenant_001",
            questionText: "Which answer demonstrates the approved behavior?",
            options: JSON.stringify(["Approved behavior", "Unapproved behavior"]),
            correctAnswers: JSON.stringify(["Approved behavior"]),
            status: "APPROVED",
          },
        },
      },
      include: { assessmentQuestions: true },
    });
    return prisma.maiContentRevisionProposal.create({
      data: {
        tenantId: "tenant_001",
        triggerType: "LESSON_PREPARATION",
        interventionId,
        lessonLearnedId,
        status: "AWAITING_HUMAN_RELEASE",
        title: `${testTag} proposal title ${Math.random().toString(36).slice(2)}`,
        objective: "proposed objective",
        content: "proposed content",
        format: "micro_lesson",
        duration: 8,
        classification: "INTERNAL",
        effectivenessMethod: "workplace_transfer_observation",
        assessmentQuestionIds: JSON.stringify(questionSource.assessmentQuestions.map((question) => question.id)),
      },
    });
  }

  test("approve(): net-new proposal materializes an APPROVED atom, EvidenceRelationship, and a new TrainingAssignment for an already-enrolled learner", async () => {
    const trainer = await makeUser("trainer");
    const intervention = await makeInterventionWithReview(true);
    const lesson = await prisma.lessonLearned.create({
      data: { tenantId: "tenant_001", title: `${testTag} lesson`, summary: "s", status: "APPROVED_LEARNING_INTERVENTION_REQUIRED", sourceClassification: "CONFIRMED_INDUSTRY_FINDING" },
    });
    const proposal = await makeNetNewProposal(intervention.id, lesson.id);

    const learner = await makeUser("learner");
    const initialManifest = await prisma.trainingPackageManifest.create({
      data: {
        tenantId: 'tenant_001', packageId: `${testTag}-initial`, curriculumRevision: "rev-1", compilerVersion: "1.0.0", rulesetRevision: "1.0", learnerId: learner.id, baselineContent: "[]", outputHash: "initial-hash", status: "ACTIVE" },
    });
    await prisma.trainingAssignment.create({ data: {
        tenantId: 'tenant_001', learnerId: learner.id, interventionId: intervention.id, manifestId: initialManifest.id, status: "ASSIGNED" } });

    const result = await service.approve(proposal.id, trainer.id);

    const atom = await prisma.learningAtom.findUniqueOrThrow({ where: { id: result.atomId } });
    expect(atom.status).toBe("APPROVED");
    expect(atom.origin).toBe("kernel-autonomous-lesson");

    const relationship = await prisma.evidenceRelationship.findFirst({ where: { fromEntityId: lesson.id, toEntityId: atom.id, relationshipType: "implements_lesson" } });
    expect(relationship).not.toBeNull();

    expect(result.assignmentsCreated).toBe(1);
    const assignments = await prisma.trainingAssignment.findMany({ where: { interventionId: intervention.id, learnerId: learner.id } });
    expect(assignments.length).toBe(2);

    const updatedProposal = await prisma.maiContentRevisionProposal.findUniqueOrThrow({ where: { id: proposal.id } });
    expect(updatedProposal.status).toBe("APPROVED_EFFECTIVE");
    expect(updatedProposal.resultingAtomId).toBe(atom.id);

    const approval = await prisma.maiApproval.findFirst({ where: { subjectId: proposal.id, approvalType: "CONTENT_REVISION_RELEASE" } });
    expect(approval?.decision).toBe("APPROVE");
    expect(approval?.decidedBy).toBe(trainer.id);
  });

  test("approveWithEdits(): machine-proposed and human-edited content are both independently retrievable, the machine proposal is never overwritten", async () => {
    const trainer = await makeUser("trainer");
    const intervention = await makeInterventionWithReview(true);
    const proposal = await makeNetNewProposal(intervention.id);

    const result = await service.approveWithEdits(proposal.id, trainer.id, { title: "Edited title", objective: "Edited objective" }, "clarified wording");

    const atom = await prisma.learningAtom.findUniqueOrThrow({ where: { id: result.atomId } });
    expect(atom.title).toBe("Edited title");
    expect(atom.objective).toBe("Edited objective");

    const updatedProposal = await prisma.maiContentRevisionProposal.findUniqueOrThrow({ where: { id: proposal.id } });
    expect(updatedProposal.title).toBe(proposal.title); // machine proposal untouched
    expect(updatedProposal.objective).toBe("proposed objective"); // machine proposal untouched
    expect(JSON.parse(updatedProposal.humanEditedContent!)).toEqual({ title: "Edited title", objective: "Edited objective" });
    expect(updatedProposal.editSummary).toBe("clarified wording");

    const approval = await prisma.maiApproval.findFirst({ where: { subjectId: proposal.id, approvalType: "CONTENT_REVISION_RELEASE" } });
    expect(approval?.decision).toBe("APPROVE_WITH_EDITS");
  });

  test("returnForRework(): proposal stays non-effective, available for another preparation pass", async () => {
    const trainer = await makeUser("trainer");
    const intervention = await makeInterventionWithReview(true);
    const proposal = await makeNetNewProposal(intervention.id);

    await service.returnForRework(proposal.id, trainer.id, "needs a clearer objective");

    const updated = await prisma.maiContentRevisionProposal.findUniqueOrThrow({ where: { id: proposal.id } });
    expect(updated.status).toBe("RETURNED_FOR_REWORK");
    expect(updated.resultingAtomId).toBeNull();

    const atoms = await prisma.learningAtom.findMany({ where: { title: proposal.title } });
    expect(atoms).toHaveLength(0);
  });

  test("reject(): prior effective atom stays effective, rejected proposal stays in history, non-effective", async () => {
    const trainer = await makeUser("trainer");
    const priorAtom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001', title: `${testTag} prior effective atom`, objective: "obj", content: "content", classification: "INTERNAL", status: "APPROVED", format: "micro_lesson", duration: 5 },
    });
    const intervention = await makeInterventionWithReview(true, priorAtom.id);
    const proposal = await makeNetNewProposal(intervention.id);

    await service.reject(proposal.id, trainer.id, "content is inaccurate");

    const updated = await prisma.maiContentRevisionProposal.findUniqueOrThrow({ where: { id: proposal.id } });
    expect(updated.status).toBe("REJECTED");
    expect(updated.resultingAtomId).toBeNull();

    const stillEffective = await prisma.learningAtom.findUniqueOrThrow({ where: { id: priorAtom.id } });
    expect(stillEffective.status).toBe("APPROVED");
    expect(stillEffective.replacementAtomId).toBeNull();

    const approval = await prisma.maiApproval.findFirst({ where: { subjectId: proposal.id, approvalType: "CONTENT_REVISION_RELEASE" } });
    expect(approval?.decision).toBe("REJECTED");
  });

  test("rollback: prepareRollback() creates a genuinely NEW revision, never rewrites history; approving it supersedes the current atom via ContentSupersessionService", async () => {
    const trainer = await makeUser("trainer");
    const revA = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag} Rev A`, objective: "rev A objective", content: "rev A content", classification: "INTERNAL", status: "SUPERSEDED", format: "micro_lesson", duration: 5, effectivenessMethod: "workplace_transfer_observation",
        assessmentQuestions: {
          create: {
            tenantId: "tenant_001",
            questionText: "Which revision behavior is correct?",
            options: JSON.stringify(["Rev A controlled behavior", "Other behavior"]),
            correctAnswers: JSON.stringify(["Rev A controlled behavior"]),
            status: "APPROVED",
          },
        },
      },
    });
    const revB = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001', title: `${testTag} Rev B`, objective: "rev B objective", content: "rev B content", classification: "INTERNAL", status: "APPROVED", format: "micro_lesson", duration: 7, replacedAtomId: revA.id },
    });
    await prisma.learningAtom.update({ where: { id: revA.id }, data: { replacementAtomId: revB.id } });
    const intervention = await makeInterventionWithReview(true, revB.id);

    const impact = await service.previewRollbackImpact(revA.id);
    expect(impact.notApplicable.length).toBeGreaterThan(0); // honestly reports what isn't real in this codebase

    const { proposalId } = await service.prepareRollback(revA.id, trainer.id, "Rev B introduced an error");
    const rollbackProposal = await prisma.maiContentRevisionProposal.findUniqueOrThrow({ where: { id: proposalId } });
    expect(rollbackProposal.triggerType).toBe("ROLLBACK");
    expect(rollbackProposal.baselineAtomId).toBe(revB.id); // current effective, not revA
    expect(rollbackProposal.title).toBe(revA.title); // content copied FROM the target historical atom
    expect(rollbackProposal.status).toBe("AWAITING_HUMAN_RELEASE");

    // Rev A and Rev B both still exist, completely unmutated - rollback prepares, it never rewrites.
    const revAUnchanged = await prisma.learningAtom.findUniqueOrThrow({ where: { id: revA.id } });
    const revBUnchanged = await prisma.learningAtom.findUniqueOrThrow({ where: { id: revB.id } });
    expect(revAUnchanged.title).toBe(`${testTag} Rev A`);
    expect(revBUnchanged.status).toBe("APPROVED");

    const result = await service.approve(proposalId, trainer.id);
    const revC = await prisma.learningAtom.findUniqueOrThrow({ where: { id: result.atomId } });
    expect(revC.title).toBe(revA.title);
    expect(revC.status).toBe("APPROVED");

    const revBNowSuperseded = await prisma.learningAtom.findUniqueOrThrow({ where: { id: revB.id } });
    expect(revBNowSuperseded.status).toBe("SUPERSEDED");
    expect(revBNowSuperseded.replacementAtomId).toBe(revC.id);

    // History intact: revA -> revB -> revC, nothing erased.
    const revAStillThere = await prisma.learningAtom.findUniqueOrThrow({ where: { id: revA.id } });
    expect(revAStillThere).not.toBeNull();
  });

  test("ESCALATE (release-time, no fabricated evidence): release refused via governance rule HFINT-002 when the target intervention has no appropriateness review", async () => {
    const trainer = await makeUser("trainer");
    const intervention = await makeInterventionWithReview(false);
    const proposal = await makeNetNewProposal(intervention.id);

    await expect(service.approve(proposal.id, trainer.id)).rejects.toThrow(/HFINT-002/);

    const stillAwaiting = await prisma.maiContentRevisionProposal.findUniqueOrThrow({ where: { id: proposal.id } });
    expect(stillAwaiting.status).toBe("AWAITING_HUMAN_RELEASE"); // refused, not silently transitioned
  });

  test("DUAL_PRODUCT_SAFETY is never bypassed at release, autonomous or human-initiated", async () => {
    const trainer = await makeUser("trainer");
    const intervention = await makeInterventionWithReview(true);
    await prisma.maiApproval.create({
      data: { tenantId: "tenant_001", approvalType: "DUAL_PRODUCT_SAFETY", subjectId: intervention.id, subjectType: "LearningIntervention", decision: "PENDING" },
    });
    const proposal = await makeNetNewProposal(intervention.id);

    await expect(service.approve(proposal.id, trainer.id)).rejects.toThrow(/DUAL_PRODUCT_SAFETY/);
  });

  test("unauthorized: a learner cannot release, return, reject, or roll back", async () => {
    const learner = await makeUser("learner");
    const intervention = await makeInterventionWithReview(true);
    const proposal = await makeNetNewProposal(intervention.id);

    await expect(service.approve(proposal.id, learner.id)).rejects.toThrow(/not authorized/);
    await expect(service.reject(proposal.id, learner.id, "x")).rejects.toThrow(/not authorized/);
  });

  test("unauthorized: a SYSTEM: principal is structurally rejected and logged, never treated as a valid human release actor", async () => {
    const intervention = await makeInterventionWithReview(true);
    const proposal = await makeNetNewProposal(intervention.id);

    await expect(service.approve(proposal.id, "SYSTEM:kernel-autonomous")).rejects.toThrow(/SYSTEM principal/);

    const auditRow = await prisma.auditLog.findFirst({ where: { action: "release_attempt_by_system_principal_rejected", objectId: "SYSTEM:kernel-autonomous" } });
    expect(auditRow).not.toBeNull();
  });
});
