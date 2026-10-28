/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { AtomClassificationService } from "../AtomClassificationService";

describe("AtomClassificationService (real DB, real service) — WP-2: closes C-006", () => {
  let prisma: PrismaClient;
  let service: AtomClassificationService;
  const testTag = `acs-test-${Date.now()}`;

  let burranaEvidenceId: string;
  let internalEvidenceId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    service = new AtomClassificationService(prisma);

    const burrana = await prisma.hfEvidence.create({
      data: {
        tenantId: "tenant_001",
        classification: "BURRANA_PRIVATE",
        source: `${testTag}-burrana-source`,
        sourceType: "ncr",
        title: `${testTag}-burrana-evidence`,
        occurredAt: new Date(),
        createdBy: "system",
      },
    });
    burranaEvidenceId = burrana.id;

    const internal = await prisma.hfEvidence.create({
      data: {
        tenantId: "tenant_001",
        classification: "INTERNAL",
        source: `${testTag}-internal-source`,
        sourceType: "ncr",
        title: `${testTag}-internal-evidence`,
        occurredAt: new Date(),
        createdBy: "system",
      },
    });
    internalEvidenceId = internal.id;
  });

  afterAll(async () => {
    await prisma.maiApproval.deleteMany({ where: { rationale: { contains: testTag } } });
    await prisma.learningAtom.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.hfEvidence.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.$disconnect();
  });

  test("C-006 exit-gate requirement: BURRANA_PRIVATE evidence -> atom CANNOT be created less restrictive without approval", async () => {
    await expect(
      service.createAtom({
        title: `${testTag}-should-fail`,
        objective: "test",
        format: "micro_lesson",
        tenantId: "tenant_001",
        sourceEvidenceIds: [burranaEvidenceId],
        requestedClassification: "INTERNAL", // less restrictive than BURRANA_PRIVATE — should be blocked
      })
    ).rejects.toThrow(/without an approval record/);

    const created = await prisma.learningAtom.findFirst({ where: { title: `${testTag}-should-fail` } });
    expect(created).toBeNull(); // nothing was created
  });

  test("no requestedClassification: atom automatically inherits the most restrictive source classification", async () => {
    const atom = await service.createAtom({
      title: `${testTag}-auto-inherit`,
      objective: "test",
      format: "micro_lesson",
      tenantId: "tenant_001",
      sourceEvidenceIds: [burranaEvidenceId],
    });
    expect(atom.classification).toBe("BURRANA_PRIVATE");
  });

  test("mixed sources: inherits the MOST restrictive among multiple source evidence records", async () => {
    const atom = await service.createAtom({
      title: `${testTag}-mixed-sources`,
      objective: "test",
      format: "micro_lesson",
      tenantId: "tenant_001",
      sourceEvidenceIds: [internalEvidenceId, burranaEvidenceId], // one INTERNAL, one BURRANA_PRIVATE
    });
    expect(atom.classification).toBe("BURRANA_PRIVATE"); // the more restrictive of the two
  });

  test("tightening (requesting MORE restrictive than the floor) is always allowed, no approval needed", async () => {
    const atom = await service.createAtom({
      title: `${testTag}-tightened`,
      objective: "test",
      format: "micro_lesson",
      tenantId: "tenant_001",
      sourceEvidenceIds: [internalEvidenceId], // floor is INTERNAL
      requestedClassification: "EXPORT_CONTROLLED", // MORE restrictive — should be allowed
    });
    expect(atom.classification).toBe("EXPORT_CONTROLLED");
  });

  test("loosening WITH a valid APPROVED CLASSIFICATION_LOOSENING approval succeeds", async () => {
    const approval = await prisma.maiApproval.create({
      data: {
        tenantId: "tenant_001",
        approvalType: "CLASSIFICATION_LOOSENING",
        subjectId: burranaEvidenceId,
        subjectType: "HfEvidence",
        decision: "APPROVED",
        decidedBy: "qm.olea@example.com",
        decidedAt: new Date(),
        rationale: `${testTag} — reviewed and confirmed safe to declassify for this specific atom`,
      },
    });

    const atom = await service.createAtom({
      title: `${testTag}-loosened-with-approval`,
      objective: "test",
      format: "micro_lesson",
      tenantId: "tenant_001",
      sourceEvidenceIds: [burranaEvidenceId],
      requestedClassification: "INTERNAL",
      approvalId: approval.id,
    });
    expect(atom.classification).toBe("INTERNAL");
  });

  test("loosening with an approvalId that references a REJECTED (not APPROVED) record is still blocked", async () => {
    const rejectedApproval = await prisma.maiApproval.create({
      data: {
        tenantId: "tenant_001",
        approvalType: "CLASSIFICATION_LOOSENING",
        subjectId: burranaEvidenceId,
        subjectType: "HfEvidence",
        decision: "REJECTED",
        decidedBy: "qm.olea@example.com",
        decidedAt: new Date(),
        rationale: `${testTag} — reviewer rejected the loosening request`,
      },
    });

    await expect(
      service.createAtom({
        title: `${testTag}-rejected-approval`,
        objective: "test",
        format: "micro_lesson",
        tenantId: "tenant_001",
        sourceEvidenceIds: [burranaEvidenceId],
        requestedClassification: "INTERNAL",
        approvalId: rejectedApproval.id,
      })
    ).rejects.toThrow(/does not authorize classification loosening/);
  });

  test("resolveClassification() throws on unknown source evidence id (fail loud, not silent)", async () => {
    await expect(
      service.resolveClassification({ tenantId: 'tenant_001', sourceEvidenceIds: ["nonexistent-id"] })
    ).rejects.toThrow(/Source evidence not found/);
  });
});
