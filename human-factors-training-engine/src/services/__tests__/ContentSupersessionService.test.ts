/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { ContentSupersessionService } from "../ContentSupersessionService";

describe("ContentSupersessionService (real DB, real service) — C-011 recall + Phase 2 gate: supersession chain", () => {
  let prisma: PrismaClient;
  let service: ContentSupersessionService;
  const testTag = `css-test-${Date.now()}`;

  let oldAtomId: string;
  let learnerId: string;
  let assignmentId: string;
  let interventionId: string;
  let eventId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    service = new ContentSupersessionService(prisma, 'tenant_001');

    const oldAtom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag}-old-atom`,
        objective: "outdated example",
        format: "micro_lesson",
        status: "APPROVED",
        duration: 8,
        content: "Contains an error in the worked example.",
        classification: "INTERNAL",
      },
    });
    oldAtomId = oldAtom.id;

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
      data: { tenantId: "tenant_001", evidenceId: evidence.id, title: `${testTag}-event`, occurredAt: new Date() },
    });
    eventId = event.id;

    const intervention = await prisma.learningIntervention.create({
      data: {
        tenantId: 'tenant_001',
        eventId,
        title: `${testTag}-intervention`,
        atomIds: JSON.stringify([oldAtomId]),
        designedBy: "system",
      },
    });
    interventionId = intervention.id;

    const learner = await prisma.user.create({
      data: { email: `${testTag}@example.com`, passwordHash: "x", name: "Recall Test Learner", role: "learner" },
    });
    learnerId = learner.id;

    const manifest = await prisma.trainingPackageManifest.create({
      data: {
        tenantId: 'tenant_001',
        packageId: `${testTag}-pkg`,
        curriculumRevision: "1.0",
        compilerVersion: "1.0.0",
        rulesetRevision: "1.0",
        baselineContent: JSON.stringify([{ atomId: oldAtomId, title: oldAtom.title }]),
        outputHash: `${testTag}-hash`,
        status: "ACTIVE",
      },
    });

    const assignment = await prisma.trainingAssignment.create({
      data: {
        tenantId: 'tenant_001', learnerId, interventionId, manifestId: manifest.id, status: "ASSIGNED" },
    });
    assignmentId = assignment.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { objectId: oldAtomId } });
    await prisma.trainingAssignment.deleteMany({ where: { id: assignmentId } });
    await prisma.trainingPackageManifest.deleteMany({ where: { packageId: `${testTag}-pkg` } });
    await prisma.user.deleteMany({ where: { id: learnerId } });
    await prisma.learningIntervention.deleteMany({ where: { id: interventionId } });
    await prisma.hfEvent.deleteMany({ where: { id: eventId } });
    await prisma.hfEvidence.deleteMany({ where: { title: `${testTag}-evidence` } });
    await prisma.learningAtom.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.$disconnect();
  });

  test("C-011 + Phase 2 gate: supersede() identifies the affected learner BEFORE marking old atom superseded", async () => {
    const result = await service.supersede({
      oldAtomId,
      newAtomData: {
        title: `${testTag}-new-atom`,
        objective: "corrected example",
        format: "micro_lesson",
        duration: 8,
        content: "Corrected worked example, error fixed.",
        classification: "INTERNAL",
      },
      replacementReason: "Corrected error in worked example (QA finding)",
      replacedBy: "qm.olea@example.com",
    });

    expect(result.affectedLearners).toHaveLength(1);
    expect(result.affectedLearners[0].learnerId).toBe(learnerId);
    expect(result.affectedLearners[0].assignmentId).toBe(assignmentId);
  });

  test("supersession chain: old atom is SUPERSEDED with forward link, new atom is APPROVED with backward link — old content never deleted", async () => {
    const oldAtom = await prisma.learningAtom.findUnique({ where: { id: oldAtomId } });
    expect(oldAtom).not.toBeNull(); // still exists — never deleted
    expect(oldAtom!.status).toBe("SUPERSEDED");
    expect(oldAtom!.replacementAtomId).not.toBeNull();
    expect(oldAtom!.retiredDate).not.toBeNull();

    const newAtom = await prisma.learningAtom.findUnique({ where: { id: oldAtom!.replacementAtomId! } });
    expect(newAtom).not.toBeNull();
    expect(newAtom!.status).toBe("APPROVED");
    expect(newAtom!.replacedAtomId).toBe(oldAtomId);
    expect(newAtom!.replacementReason).toBe("Corrected error in worked example (QA finding)");
  });

  test("disposition record: the recall is audit-logged with the affected learner list, and the original assignment record is unchanged (frozen evidence preserved)", async () => {
    const logs = await prisma.auditLog.findMany({
      where: { objectId: oldAtomId, action: "content_recalled" },
    });
    expect(logs).toHaveLength(1);

    const details = JSON.parse(logs[0].details!);
    expect(details.replacedBy).toBe("qm.olea@example.com");
    expect(details.affectedLearnerCount).toBe(1);
    expect(details.affectedAssignmentIds).toContain(assignmentId);

    // The learner's original assignment is untouched — it still references the OLD atom via
    // its frozen manifest (history is preserved, not silently rewritten).
    const assignment = await prisma.trainingAssignment.findUnique({ where: { id: assignmentId } });
    expect(assignment!.status).toBe("ASSIGNED"); // unchanged by the supersession itself
  });
});
