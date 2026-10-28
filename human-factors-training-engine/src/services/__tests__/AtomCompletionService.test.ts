/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { AtomCompletionService } from "../AtomCompletionService";

describe("AtomCompletionService (real DB, real service) — WP-2: closes C-009", () => {
  let prisma: PrismaClient;
  let service: AtomCompletionService;
  const testTag = `acs2-test-${Date.now()}`;

  let assignmentId: string;
  let atom1Id: string;
  let atom2Id: string;
  let atom3Id: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    service = new AtomCompletionService(prisma);

    const atoms = await Promise.all(
      ["atom-1", "atom-2", "atom-3"].map((suffix) =>
        prisma.learningAtom.create({
          data: {
        tenantId: 'tenant_001', title: `${testTag}-${suffix}`, objective: "x", format: "micro_lesson", status: "APPROVED", duration: 5 },
        })
      )
    );
    [atom1Id, atom2Id, atom3Id] = atoms.map((a) => a.id);

    const learner = await prisma.user.create({
      data: { email: `${testTag}@example.com`, passwordHash: "x", name: "Completion Test Learner", role: "learner" },
    });

    const evidence = await prisma.hfEvidence.create({
      data: { tenantId: "tenant_001", classification: "INTERNAL", source: `${testTag}-src`, sourceType: "ncr", title: `${testTag}-evidence`, occurredAt: new Date(), createdBy: "system" },
    });
    const event = await prisma.hfEvent.create({
      data: { tenantId: "tenant_001", evidenceId: evidence.id, title: `${testTag}-event`, occurredAt: new Date() },
    });
    const intervention = await prisma.learningIntervention.create({
      data: {
        tenantId: 'tenant_001', eventId: event.id, title: `${testTag}-intervention`, atomIds: JSON.stringify([atom1Id, atom2Id, atom3Id]), designedBy: "system" },
    });

    const manifest = await prisma.trainingPackageManifest.create({
      data: {
        tenantId: 'tenant_001',
        packageId: `${testTag}-pkg`,
        curriculumRevision: "1.0",
        compilerVersion: "1.0.0",
        rulesetRevision: "1.0",
        baselineContent: JSON.stringify([{ atomId: atom1Id }, { atomId: atom2Id }, { atomId: atom3Id }]),
        outputHash: `${testTag}-hash`,
        status: "ACTIVE",
      },
    });

    const assignment = await prisma.trainingAssignment.create({
      data: {
        tenantId: 'tenant_001', learnerId: learner.id, interventionId: intervention.id, manifestId: manifest.id, status: "ASSIGNED" },
    });
    assignmentId = assignment.id;
  });

  afterAll(async () => {
    await prisma.trainingAssignment.deleteMany({ where: { id: assignmentId } }); // cascades AtomCompletion
    await prisma.learningAtom.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.$disconnect();
  });

  test("getCompletionStatus() on a fresh assignment: zero atoms complete, not ready for assessment", async () => {
    const status = await service.getCompletionStatus(assignmentId);
    expect(status.totalAtoms).toBe(3);
    expect(status.completedAtomIds).toEqual([]);
    expect(status.remainingAtomIds).toHaveLength(3);
    expect(status.allComplete).toBe(false);
    expect(status.readyForAssessment).toBe(false);
  });

  test("marking atoms complete one at a time updates remaining/complete counts correctly", async () => {
    await service.markComplete(assignmentId, atom1Id);
    let status = await service.getCompletionStatus(assignmentId);
    expect(status.completedAtomIds).toEqual([atom1Id]);
    expect(status.remainingAtomIds).toHaveLength(2);
    expect(status.allComplete).toBe(false);

    await service.markComplete(assignmentId, atom2Id);
    status = await service.getCompletionStatus(assignmentId);
    expect(status.remainingAtomIds).toEqual([atom3Id]);
    expect(status.allComplete).toBe(false);
  });

  test("C-009 exit-gate requirement: 'Ready for Assessment' becomes true only after the LAST atom is complete", async () => {
    // atom1 and atom2 already marked complete by the previous test.
    let status = await service.getCompletionStatus(assignmentId);
    expect(status.readyForAssessment).toBe(false);

    await service.markComplete(assignmentId, atom3Id);
    status = await service.getCompletionStatus(assignmentId);
    expect(status.allComplete).toBe(true);
    expect(status.readyForAssessment).toBe(true);
    expect(status.remainingAtomIds).toEqual([]);
  });

  test("markComplete() is idempotent — marking an already-complete atom again does not error or duplicate", async () => {
    const before = await prisma.atomCompletion.count({ where: { assignmentId } });
    await service.markComplete(assignmentId, atom1Id); // already complete from earlier test
    const after = await prisma.atomCompletion.count({ where: { assignmentId } });
    expect(after).toBe(before); // no new row created
  });
});
