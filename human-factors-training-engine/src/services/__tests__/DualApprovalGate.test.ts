/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { DualApprovalGate } from "../DualApprovalGate";

describe("DualApprovalGate (real DB, real service) — Phase 2 gate", () => {
  let prisma: PrismaClient;
  let gate: DualApprovalGate;
  const tenantId = "tenant_001";
  const testTag = `dag-test-${Date.now()}`;

  beforeAll(() => {
    prisma = new PrismaClient();
    gate = new DualApprovalGate(prisma);
  });

  afterAll(async () => {
    await prisma.maiApproval.deleteMany({ where: { subjectId: { contains: testTag } } });
    await prisma.$disconnect();
  });

  test("intervention with no DUAL_PRODUCT_SAFETY marker does not require dual approval and can assign immediately", async () => {
    const subjectId = `${testTag}-no-marker`;
    const result = await gate.canAssignTraining(tenantId, subjectId);
    expect(result.canAssign).toBe(true);
  });

  test("product-safety intervention is BLOCKED before any approvals are recorded", async () => {
    const subjectId = `${testTag}-blocked`;

    // Mark this intervention as requiring dual approval (product-safety classification)
    await gate.recordApproval(
      tenantId,
      subjectId,
      "DUAL_PRODUCT_SAFETY",
      "system",
      "APPROVED",
      "Marker: this intervention touches product-safety procedures"
    );

    const requiresDual = await gate.requiresDualApproval(subjectId, tenantId);
    expect(requiresDual).toBe(true);

    const beforeSecondApproval = await gate.canAssignTraining(tenantId, subjectId);
    // Only 1 approval recorded so far (the marker itself counts as approval #1)
    expect(beforeSecondApproval.canAssign).toBe(false);
    expect(beforeSecondApproval.reason).toMatch(/Awaiting dual approval/);
  });

  test("product-safety intervention is ENFORCED enabled only after a SECOND independent approval", async () => {
    const subjectId = `${testTag}-two-approvals`;

    await gate.recordApproval(
      tenantId,
      subjectId,
      "DUAL_PRODUCT_SAFETY",
      "reviewer.one@example.com",
      "APPROVED",
      "First independent reviewer: technical review passed"
    );

    const afterFirst = await gate.canAssignTraining(tenantId, subjectId);
    expect(afterFirst.canAssign).toBe(false);
    expect(afterFirst.reason).toMatch(/1\/2/);

    await gate.recordApproval(
      tenantId,
      subjectId,
      "SECOND_REVIEW",
      "reviewer.two@example.com",
      "APPROVED",
      "Second independent reviewer: compliance review passed"
    );

    const afterSecond = await gate.canAssignTraining(tenantId, subjectId);
    expect(afterSecond.canAssign).toBe(true);
  });

  test("a REJECTED decision from either reviewer blocks assignment even with a prior APPROVED", async () => {
    const subjectId = `${testTag}-rejected`;

    await gate.recordApproval(
      tenantId,
      subjectId,
      "DUAL_PRODUCT_SAFETY",
      "reviewer.one@example.com",
      "APPROVED",
      "First reviewer approved"
    );
    await gate.recordApproval(
      tenantId,
      subjectId,
      "SECOND_REVIEW",
      "reviewer.two@example.com",
      "REJECTED",
      "Second reviewer found a compliance gap"
    );

    const result = await gate.canAssignTraining(tenantId, subjectId);
    expect(result.canAssign).toBe(false);
    expect(result.reason).toMatch(/Rejected by reviewer.two@example.com/);
  });

  test("approval records are immutable rows (no update path exists on MaiApproval in this service)", async () => {
    const subjectId = `${testTag}-immutability`;

    const first = await gate.recordApproval(
      tenantId,
      subjectId,
      "DUAL_PRODUCT_SAFETY",
      "reviewer.one@example.com",
      "APPROVED",
      "Original rationale"
    );

    // The service exposes no update/edit method for approvals — only recordApproval (insert).
    // Verify a second call creates a NEW row rather than mutating the first.
    await gate.recordApproval(
      tenantId,
      subjectId,
      "SECOND_REVIEW",
      "reviewer.two@example.com",
      "APPROVED",
      "Second rationale"
    );

    const allApprovals = await prisma.maiApproval.findMany({
      where: { tenantId, subjectId },
      orderBy: { createdAt: "asc" },
    });

    expect(allApprovals).toHaveLength(2);
    expect(allApprovals[0].rationale).toBe("Original rationale"); // untouched by the second call
    expect(allApprovals[0].decidedBy).toBe("reviewer.one@example.com");
    expect(first.rationale).toBe("Original rationale");
  });
});
