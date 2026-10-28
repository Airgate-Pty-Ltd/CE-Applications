/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { EvidenceIngestion } from "../EvidenceIngestion";
import { CausalStatusService } from "../CausalStatusService";
import { AiAssist } from "../AiAssist";
import { CurriculumCompiler } from "../CurriculumCompiler";
import { InterventionClosureService } from "../InterventionClosureService";
import { TraceabilityGraph } from "../TraceabilityGraph";
import { AtomCompletionService } from "../AtomCompletionService";

/**
 * End-to-end walk of PHASE-1-SPECIFICATION.md §2 (steps 1-9), executed against the real
 * SQLite database with real service code — no mocks. This is the master evidence trail for
 * C-006 (atom creation/approval/classification), C-007 (baseline-only compilation), and the
 * full C-009 journey (assignment -> completion -> observation -> automatic closure), tying
 * together services that are individually tested elsewhere in this directory.
 */
describe("Phase 1 end-to-end workflow (real DB, real services) — spec §2 steps 1-9", () => {
  let prisma: PrismaClient;
  const testTag = `e2e-${Date.now()}`;
  const tenantId = "tenant_001";

  let evidenceId: string;
  let eventId: string;
  let manualAtomId: string;
  let aiAtomId: string;
  let interventionId: string;
  let learnerId: string;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { objectId: { in: [interventionId, evidenceId] } } });
    await prisma.effectivenessEvidence.deleteMany({ where: { interventionId } });
    await prisma.supervisorObservation.deleteMany({ where: { interventionId } });
    await prisma.trainingAssignment.deleteMany({ where: { interventionId } });
    await prisma.trainingPackageManifest.deleteMany({ where: { packageId: `${testTag}-pkg` } });
    await prisma.evidenceRelationship.deleteMany({
      where: { OR: [{ fromEntityId: eventId }, { fromEntityId: interventionId }] },
    });
    await prisma.learningIntervention.deleteMany({ where: { id: interventionId } });
    await prisma.learningAtom.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.maiCausalStatus.deleteMany({ where: { eventId } });
    await prisma.hfEvent.deleteMany({ where: { id: eventId } });
    await prisma.evidenceClassification.deleteMany({ where: { evidenceId } });
    await prisma.hfEvidence.deleteMany({ where: { id: evidenceId } });
    await prisma.user.deleteMany({ where: { id: learnerId } });
    await prisma.$disconnect();
  });

  test("Step 1 (C-001): QM ingests NCR document -> quarantine pipeline reaches ACCEPTED", async () => {
    const ingestion = new EvidenceIngestion(prisma);
    const result = await ingestion.ingest({
      tenantId,
      title: `${testTag}-ncr`,
      source: `NCR-${testTag}`,
      sourceType: "ncr",
      content:
        "NCR: Fatigue-related error during night shift maintenance of EFX-7 power system. Technician missed a verification step after a 12-hour shift.",
      classification: "INTERNAL",
      occurredAt: new Date("2026-07-15"),
      createdBy: "qm.olea@example.com",
      themes: ["fatigue", "procedural_compliance"],
    });
    evidenceId = result.evidence.id;
    expect(result.evidence.quarantineStatus).toBe("ACCEPTED");
  });

  test("Step 2 (C-004): QM extracts event, promotes causal status REPORTED -> SUSPECTED -> UNDER_INVESTIGATION -> VERIFIED", async () => {
    const event = await prisma.hfEvent.create({
      data: {
        tenantId,
        evidenceId,
        title: `${testTag}: Night shift technician fatigue -> missed inspection step`,
        occurredAt: new Date("2026-07-15"),
        themes: JSON.stringify(["fatigue"]),
        rolesExposed: JSON.stringify(["maintenance_technician"]),
      },
    });
    eventId = event.id;

    const causal = new CausalStatusService(prisma);
    await causal.promote({ tenantId, eventId, toStatus: "SUSPECTED", promotedBy: "qm.olea@example.com" });
    await causal.promote({
      tenantId,
      eventId,
      toStatus: "UNDER_INVESTIGATION",
      promotedBy: "qm.olea@example.com",
    });
    const verified = await causal.promote({
      tenantId,
      eventId,
      toStatus: "VERIFIED",
      promotedBy: "qm.olea@example.com",
      verifiedRootCause: "Insufficient rest before 12-hour shift; existing training silent on fatigue",
    });

    expect(verified.status).toBe("VERIFIED");
  });

  test("Step 4 (C-003, C-006): design one atom via AI-assist path and one manually, both reach APPROVED with classification inherited by the caller", async () => {
    // AI path (no provider configured -> honest no-AI fallback; still exercises the real gate)
    const aiAssist = new AiAssist(prisma);
    const aiProposal = await aiAssist.proposeAtomFromEvidence(
      tenantId,
      evidenceId,
      "fatigue",
      "Recognize fatigue signs and mitigation strategies"
    );
    expect(aiProposal.canUseAi).toBe(false); // no provider configured — documented, not hidden
    expect(aiProposal.sourceSpans.length).toBeGreaterThan(0);

    const aiAtom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag}-atom-fatigue-fundamentals`,
        objective: "Recognize fatigue signs and mitigation strategies",
        format: "micro_lesson",
        status: "DRAFT",
        duration: 8,
        content: aiProposal.sourceSpans.join(" "),
        // Classification inheritance from source evidence is NOT automatic anywhere in the
        // codebase (verified by code search — only AiAssist *reads* evidence.classification
        // for its own gate, nothing copies it onto a created atom). The caller sets it
        // explicitly here, matching current real behavior. Logged as OPEN-QUESTIONS item.
        classification: "INTERNAL",
      },
    });
    const aiAtomApproved = await prisma.learningAtom.update({
      where: { id: aiAtom.id },
      data: { status: "APPROVED", approvedBy: "qm.olea@example.com", approvedAt: new Date() },
    });
    aiAtomId = aiAtomApproved.id;
    expect(aiAtomApproved.status).toBe("APPROVED");
    expect(aiAtomApproved.classification).toBe("INTERNAL");

    // Manual path — no AI involvement at all
    const manualAtom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag}-atom-case-study`,
        objective: `Apply fatigue awareness to the ${testTag} incident scenario`,
        format: "case_study",
        status: "DRAFT",
        duration: 15,
        content: "What went wrong? What should you do? [worked scenario, human-authored]",
        classification: "INTERNAL",
      },
    });
    const manualAtomApproved = await prisma.learningAtom.update({
      where: { id: manualAtom.id },
      data: { status: "APPROVED", approvedBy: "qm.olea@example.com", approvedAt: new Date() },
    });
    manualAtomId = manualAtomApproved.id;
    expect(manualAtomApproved.status).toBe("APPROVED");

    // Wire event -> intervention -> atoms for traceability (built next step, referenced here for order)
  });

  test("Step 4b: intervention created, linked to event and both atoms via EvidenceRelationship (traceability graph)", async () => {
    const intervention = await prisma.learningIntervention.create({
      data: {
        tenantId: 'tenant_001',
        eventId,
        title: `${testTag}-intervention: Fatigue Awareness Training`,
        atomIds: JSON.stringify([aiAtomId, manualAtomId]),
        effectivenessTargetLevel: "WORKPLACE_TRANSFER",
        status: "PUBLISHED",
        designedBy: "qm.olea@example.com",
        approvedBy: "qm.olea@example.com",
        approvedAt: new Date(),
      },
    });
    interventionId = intervention.id;

    await prisma.evidenceRelationship.create({
      data: {
        tenantId,
        fromEntityType: "HfEvent",
        fromEntityId: eventId,
        toEntityType: "LearningIntervention",
        toEntityId: interventionId,
        relationshipType: "ADDRESSES",
        createdBy: "qm.olea@example.com",
      },
    });
    for (const atomId of [aiAtomId, manualAtomId]) {
      await prisma.evidenceRelationship.create({
        data: {
          tenantId,
          fromEntityType: "LearningIntervention",
          fromEntityId: interventionId,
          toEntityType: "LearningAtom",
          toEntityId: atomId,
          relationshipType: "INCLUDES",
          createdBy: "qm.olea@example.com",
        },
      });
    }

    const graph = new TraceabilityGraph(prisma);
    const atomsForEvent = await graph.findAtomsForEvent(eventId);
    expect(atomsForEvent.map((a) => a.atomId).sort()).toEqual([aiAtomId, manualAtomId].sort());
  });

  test("Step 5 (C-005, C-006, C-007): compiler REJECTS a DRAFT atom, then compiles baseline manifest from the two APPROVED atoms; recurrent_content is empty (Phase 1 baseline-only)", async () => {
    const compiler = new CurriculumCompiler(prisma);
    const draftAtom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag}-draft-should-be-rejected`,
        objective: "x",
        format: "card",
        status: "DRAFT",
        duration: 1,
      },
    });

    await expect(
      compiler.compile({
        tenantId,
        approvedAtoms: [draftAtom],
        learnerAttributes: { learnerId: "x", role: "x", site: "x", first_time: true },
        curriculumRevision: `${testTag}-rejected-rev`,
      })
    ).rejects.toThrow(/not APPROVED/);
    await prisma.learningAtom.deleteMany({ where: { id: draftAtom.id } });

    const learner = await prisma.user.create({
      data: {
        email: `${testTag}@example.com`,
        passwordHash: "x",
        name: "John Doe (demo learner)",
        role: "learner",
      },
    });
    learnerId = learner.id;

    const approvedAtoms = await prisma.learningAtom.findMany({
      where: { id: { in: [aiAtomId, manualAtomId] } },
    });

    const { manifest, output_hash } = await compiler.compile({
      tenantId,
      approvedAtoms,
      learnerAttributes: {
        learnerId: learner.id,
        role: "maintenance_technician",
        site: "Brisbane",
        first_time: true,
      },
      curriculumRevision: `HF-Phase-1-Vertical-Slice-${testTag}`,
    });

    expect(manifest.baseline_content).toHaveLength(2);
    expect(manifest.recurrent_content).toEqual([]); // C-007: Phase 1 is baseline-only
    expect(manifest.status).toBe("ACTIVE");

    const persistedManifest = await prisma.trainingPackageManifest.create({
      data: {
        tenantId: 'tenant_001',
        packageId: `${testTag}-pkg`,
        curriculumRevision: manifest.curriculum_revision,
        compilerVersion: "1.0.0",
        rulesetRevision: "1.0",
        learnerId: learner.id,
        learnerRole: "maintenance_technician",
        learnerSite: "Brisbane",
        baselineContent: JSON.stringify(manifest.baseline_content),
        recurrentContent: JSON.stringify(manifest.recurrent_content),
        sourceTraceability: JSON.stringify(manifest.source_traceability),
        outputHash: output_hash,
        status: "ACTIVE",
        frozenAt: new Date(),
      },
    });

    // Step 6: assignment
    const assignment = await prisma.trainingAssignment.create({
      data: {
        tenantId: 'tenant_001',
        learnerId: learner.id,
        interventionId,
        manifestId: persistedManifest.id,
        role: "maintenance_technician",
        site: "Brisbane",
        dueDate: new Date("2026-08-15"),
        status: "ASSIGNED",
      },
    });

    // Step 7: learner completes each atom in order, then passes assessment. Per-atom
    // completion tracking (WP-2 §2, closes the C-009 gap this test used to note as missing)
    // is now real via AtomCompletionService — "Ready for Assessment" becomes true only once
    // every atom in the frozen manifest is marked complete, matching
    // PHASE-1-SPECIFICATION.md §2 step 6 exactly.
    const atomCompletionService = new AtomCompletionService(prisma);
    for (const atomId of [aiAtomId, manualAtomId]) {
      await atomCompletionService.markComplete(assignment.id, atomId);
    }
    const completionStatus = await atomCompletionService.getCompletionStatus(assignment.id);
    expect(completionStatus.allComplete).toBe(true);
    expect(completionStatus.readyForAssessment).toBe(true);

    const completed = await prisma.trainingAssignment.update({
      where: { id: assignment.id },
      data: { completedAt: new Date(), passedAt: new Date(), status: "PASSED" },
    });
    expect(completed.status).toBe("PASSED");

    // Step 8: supervisor observation
    await prisma.supervisorObservation.create({
      data: {
        assignmentId: assignment.id,
        interventionId,
        supervisorId: "supervisor.jones@example.com",
        supervisorRole: "shift_lead",
        description:
          "John recognized fatigue sign during 11-hour shift today; requested and took a 20-minute break. No errors during remainder of shift.",
        dateObserved: new Date("2026-08-22"),
        effectivenessLevel: "WORKPLACE_TRANSFER",
        outcome: "effective",
        recordedBy: "supervisor.jones@example.com",
      },
    });
    await prisma.effectivenessEvidence.create({
      data: {
        interventionId,
        assignmentId: assignment.id,
        level: "WORKPLACE_TRANSFER",
        evidenceType: "observation",
        collectedBy: "supervisor.jones@example.com",
        supportsClosureAtLevel: true,
      },
    });

    // Step 9: closure
    const closureService = new InterventionClosureService(prisma);
    const { intervention: closedIntervention, closedNow } = await closureService.checkAndClose(interventionId);
    expect(closedNow).toBe(true);
    expect(closedIntervention.closureStatus).toBe("CLOSED");
  });

  test("C-008: recompiling the SAME curriculum revision + atoms + learner produces the SAME output_hash as step 5's compile", async () => {
    const compiler = new CurriculumCompiler(prisma);
    const approvedAtoms = await prisma.learningAtom.findMany({
      where: { id: { in: [aiAtomId, manualAtomId] } },
    });
    const persisted = await prisma.trainingPackageManifest.findFirst({
      where: { packageId: `${testTag}-pkg` },
    });

    const { output_hash } = await compiler.compile({
      tenantId,
      approvedAtoms,
      learnerAttributes: {
        learnerId,
        role: "maintenance_technician",
        site: "Brisbane",
        first_time: true,
      },
      curriculumRevision: `HF-Phase-1-Vertical-Slice-${testTag}`,
    });

    expect(output_hash).toBe(persisted!.outputHash);
  });
});
