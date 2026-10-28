/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { InterventionClosureService } from "../InterventionClosureService";
import { AtomCompletionService } from "../AtomCompletionService";

describe("InterventionClosureService (real DB, real service) — C-009 closure step", () => {
  let prisma: PrismaClient;
  let closureService: InterventionClosureService;
  const testTag = `ics-test-${Date.now()}`;
  let interventionId: string;
  let eventId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    closureService = new InterventionClosureService(prisma);

    const evidence = await prisma.hfEvidence.create({
      data: {
        tenantId: "tenant_001",
        classification: "INTERNAL",
        source: `${testTag}-source`,
        sourceType: "ncr",
        title: `${testTag}-evidence`,
        occurredAt: new Date(),
        createdBy: "system",
      },
    });
    const event = await prisma.hfEvent.create({
      data: {
        tenantId: "tenant_001",
        evidenceId: evidence.id,
        title: `${testTag}-event`,
        occurredAt: new Date(),
      },
    });
    eventId = event.id;

    const intervention = await prisma.learningIntervention.create({
      data: {
        tenantId: 'tenant_001',
        eventId,
        title: `${testTag}-intervention`,
        atomIds: JSON.stringify([]),
        effectivenessTargetLevel: "WORKPLACE_TRANSFER",
        designedBy: "system",
        closureStatus: "OPEN",
      },
    });
    interventionId = intervention.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { objectId: interventionId } });
    await prisma.effectivenessEvidence.deleteMany({ where: { interventionId } });
    await prisma.learningIntervention.deleteMany({ where: { id: interventionId } });
    await prisma.hfEvent.deleteMany({ where: { id: eventId } });
    await prisma.hfEvidence.deleteMany({ where: { title: `${testTag}-evidence` } });
    await prisma.$disconnect();
  });

  test("C-009: does NOT close when only COMPLETION-level evidence exists but target is WORKPLACE_TRANSFER", async () => {
    await prisma.effectivenessEvidence.create({
      data: {
        interventionId,
        level: "COMPLETION",
        evidenceType: "assessment_score",
        collectedBy: "system",
        supportsClosureAtLevel: true,
      },
    });

    const { intervention, closedNow, reason } = await closureService.checkAndClose(interventionId);
    expect(closedNow).toBe(false);
    expect(intervention.closureStatus).toBe("OPEN");
    expect(reason).toMatch(/below target/);
  });

  test("C-009: closes automatically once evidence at the target level (WORKPLACE_TRANSFER) is recorded, and audit-logs the closure", async () => {
    await prisma.effectivenessEvidence.create({
      data: {
        interventionId,
        level: "WORKPLACE_TRANSFER",
        evidenceType: "observation",
        collectedBy: "supervisor.jones@example.com",
        supportsClosureAtLevel: true,
        data: JSON.stringify({
          narrative: "Learner recognized fatigue sign during 11-hour shift; requested break.",
        }),
      },
    });

    const { intervention, closedNow, reason } = await closureService.checkAndClose(interventionId);
    expect(closedNow).toBe(true);
    expect(intervention.closureStatus).toBe("CLOSED");
    expect(intervention.closedAt).not.toBeNull();
    expect(reason).toBe("effectiveness_target_level_met");

    const logs = await prisma.auditLog.findMany({
      where: { objectId: interventionId, action: "intervention_closed" },
    });
    expect(logs.length).toBe(1);
    const details = JSON.parse(logs[0].details!);
    expect(details.reason).toBe("effectiveness_target_level_met");
  });

  test("C-009: re-running checkAndClose() on an already-closed intervention is a no-op (idempotent, no duplicate audit entries)", async () => {
    const { closedNow, reason } = await closureService.checkAndClose(interventionId);
    expect(closedNow).toBe(false);
    expect(reason).toBe("Already closed");

    const logs = await prisma.auditLog.findMany({
      where: { objectId: interventionId, action: "intervention_closed" },
    });
    expect(logs.length).toBe(1); // still exactly one — not duplicated
  });

  describe("C-009 (WP-2): atom-completion gate — closure requires completed atoms, not evidence alone", () => {
    let gatedInterventionId: string;
    let gatedEventId: string;
    let gatedAssignmentId: string;
    let atomAId: string;
    let atomBId: string;

    beforeAll(async () => {
      const [atomA, atomB] = await Promise.all([
        prisma.learningAtom.create({ data: {
        tenantId: 'tenant_001', title: `${testTag}-gate-atom-a`, objective: "x", format: "micro_lesson", status: "APPROVED", duration: 5 } }),
        prisma.learningAtom.create({ data: {
        tenantId: 'tenant_001', title: `${testTag}-gate-atom-b`, objective: "x", format: "micro_lesson", status: "APPROVED", duration: 5 } }),
      ]);
      atomAId = atomA.id;
      atomBId = atomB.id;

      const evidence = await prisma.hfEvidence.create({
        data: { tenantId: "tenant_001", classification: "INTERNAL", source: `${testTag}-gate-src`, sourceType: "ncr", title: `${testTag}-gate-evidence`, occurredAt: new Date(), createdBy: "system" },
      });
      const event = await prisma.hfEvent.create({
        data: { tenantId: "tenant_001", evidenceId: evidence.id, title: `${testTag}-gate-event`, occurredAt: new Date() },
      });
      gatedEventId = event.id;

      const intervention = await prisma.learningIntervention.create({
        data: {
        tenantId: 'tenant_001', eventId: event.id, title: `${testTag}-gate-intervention`, atomIds: JSON.stringify([atomAId, atomBId]), effectivenessTargetLevel: "WORKPLACE_TRANSFER", designedBy: "system" },
      });
      gatedInterventionId = intervention.id;

      const learner = await prisma.user.create({
        data: { email: `${testTag}-gate@example.com`, passwordHash: "x", name: "Gate Test Learner", role: "learner" },
      });
      const manifest = await prisma.trainingPackageManifest.create({
        data: {
        tenantId: 'tenant_001',
          packageId: `${testTag}-gate-pkg`,
          curriculumRevision: "1.0",
          compilerVersion: "1.0.0",
          rulesetRevision: "1.0",
          baselineContent: JSON.stringify([{ atomId: atomAId }, { atomId: atomBId }]),
          outputHash: `${testTag}-gate-hash`,
          status: "ACTIVE",
        },
      });
      const assignment = await prisma.trainingAssignment.create({
        data: {
        tenantId: 'tenant_001', learnerId: learner.id, interventionId: gatedInterventionId, manifestId: manifest.id, status: "ASSIGNED" },
      });
      gatedAssignmentId = assignment.id;

      // Effectiveness evidence at target level exists — but atoms are NOT marked complete.
      await prisma.effectivenessEvidence.create({
        data: { interventionId: gatedInterventionId, assignmentId: gatedAssignmentId, level: "WORKPLACE_TRANSFER", evidenceType: "observation", collectedBy: "supervisor.jones@example.com", supportsClosureAtLevel: true },
      });
    });

    afterAll(async () => {
      await prisma.auditLog.deleteMany({ where: { objectId: gatedInterventionId } });
      await prisma.effectivenessEvidence.deleteMany({ where: { interventionId: gatedInterventionId } });
      await prisma.trainingAssignment.deleteMany({ where: { id: gatedAssignmentId } });
      await prisma.learningIntervention.deleteMany({ where: { id: gatedInterventionId } });
      await prisma.hfEvent.deleteMany({ where: { id: gatedEventId } });
      await prisma.learningAtom.deleteMany({ where: { id: { in: [atomAId, atomBId] } } });
    });

    test("closure is BLOCKED when qualifying evidence exists but atoms are incomplete — evidence alone is not enough", async () => {
      const { closedNow, reason } = await closureService.checkAndClose(gatedInterventionId);
      expect(closedNow).toBe(false);
      expect(reason).toMatch(/incomplete atom/);
    });

    test("closure PROCEEDS once all atoms are marked complete — the exact same evidence now qualifies", async () => {
      const atomCompletionService = new AtomCompletionService(prisma);
      await atomCompletionService.markComplete(gatedAssignmentId, atomAId);
      await atomCompletionService.markComplete(gatedAssignmentId, atomBId);

      const { closedNow, intervention } = await closureService.checkAndClose(gatedInterventionId);
      expect(closedNow).toBe(true);
      expect(intervention.closureStatus).toBe("CLOSED");
    });
  });
});
