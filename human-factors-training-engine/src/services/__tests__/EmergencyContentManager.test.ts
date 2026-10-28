/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { EmergencyContentManager, DEFAULT_EMERGENCY_DURATION_DAYS } from "../EmergencyContentManager";

describe("EmergencyContentManager (real DB, real service) — Phase 2 gate + WP-2 §4 (configurable expiry)", () => {
  let prisma: PrismaClient;
  let manager: EmergencyContentManager;
  const testTag = `ecm-test-${Date.now()}`;

  beforeAll(() => {
    prisma = new PrismaClient();
    manager = new EmergencyContentManager(prisma, 'tenant_001');
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { action: { in: ["emergency_content_created", "emergency_content_renewed"] }, details: { contains: testTag } } });
    await prisma.maiApproval.deleteMany({ where: { rationale: { contains: testTag } } });
    await prisma.learningAtom.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.$disconnect();
  });

  test("createEmergencyContent() creates an auto-approved atom with EMERGENCY_INTERIM format and a persisted emergencyExpiresAt", async () => {
    const emergency = await manager.createEmergencyContent(
      `${testTag}-fresh`,
      "Immediate fatigue-awareness bulletin content.",
      "High-risk fatigue incident requires immediate interim awareness training pending full design."
    );

    const atom = await prisma.learningAtom.findUnique({ where: { id: emergency.atomId } });
    expect(atom).not.toBeNull();
    expect(atom!.format).toBe("EMERGENCY_INTERIM");
    expect(atom!.status).toBe("APPROVED");
    expect(atom!.emergencyExpiresAt).not.toBeNull();
    expect(emergency.isEmergency).toBe(true);

    const auditLog = await prisma.auditLog.findFirst({ where: { objectId: emergency.atomId, action: "emergency_content_created" } });
    expect(auditLog).not.toBeNull();
  });

  test("mandatory expiration: durationDays <= 0 is rejected, not silently treated as 'no expiry'", async () => {
    await expect(
      manager.createEmergencyContent(`${testTag}-zero-duration`, "content", "justification", 0)
    ).rejects.toThrow(/positive, finite expiration duration/);

    await expect(
      manager.createEmergencyContent(`${testTag}-negative-duration`, "content", "justification", -5)
    ).rejects.toThrow(/positive, finite expiration duration/);

    const created = await prisma.learningAtom.findMany({ where: { title: { contains: "zero-duration" } } });
    expect(created).toHaveLength(0); // nothing was created
  });

  test("WP-2 §4 exit-gate requirement: duration is configurable AT CREATION — a 5-day item expires much sooner than the 30-day default", async () => {
    const shortLived = await manager.createEmergencyContent(
      `${testTag}-5day`,
      "content",
      "justification for a very short interim window",
      5
    );
    const countdown = await manager.getExpirationCountdown(shortLived.atomId);
    expect(countdown.daysRemaining).toBeLessThanOrEqual(5);
    expect(countdown.daysRemaining).toBeGreaterThanOrEqual(4); // allow for sub-second test execution drift

    // Default (omitted durationDays) still uses DEFAULT_EMERGENCY_DURATION_DAYS = 30
    const defaultDuration = await manager.createEmergencyContent(`${testTag}-default-duration`, "content", "justification");
    const defaultCountdown = await manager.getExpirationCountdown(defaultDuration.atomId);
    expect(defaultCountdown.daysRemaining).toBeLessThanOrEqual(DEFAULT_EMERGENCY_DURATION_DAYS);
    expect(defaultCountdown.daysRemaining).toBeGreaterThanOrEqual(DEFAULT_EMERGENCY_DURATION_DAYS - 1);
  });

  test("fresh emergency content (created now) is NOT expired and CAN be assigned", async () => {
    const emergency = await manager.createEmergencyContent(`${testTag}-not-expired`, "content", "justification");

    const expired = await manager.isExpired(emergency.atomId);
    expect(expired).toBe(false);

    const canAssign = await manager.canAssignAtom(emergency.atomId);
    expect(canAssign.canAssign).toBe(true);
  });

  test("a normal (non-emergency) APPROVED atom is never reported expired by this manager", async () => {
    const normalAtom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001', title: `${testTag}-normal-atom`, objective: "ordinary content", format: "micro_lesson", status: "APPROVED", duration: 8 },
    });

    const expired = await manager.isExpired(normalAtom.id);
    expect(expired).toBe(false); // regression guard for the isExpired() sign-inversion bug (D-014)
  });

  test("C-emergency-expiry: an item whose expiration was backdated into the past IS expired and CANNOT be assigned (real auto-expiry, driven by the persisted emergencyExpiresAt field)", async () => {
    const emergency = await manager.createEmergencyContent(`${testTag}-aged-out`, "content", "justification");

    // Backdate emergencyExpiresAt directly (the field driving expiration since WP-2 §4 —
    // previously this test backdated createdAt, which no longer has any effect on expiry
    // now that duration is configurable per item rather than derived from a shared constant).
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    await prisma.learningAtom.update({ where: { id: emergency.atomId }, data: { emergencyExpiresAt: oneDayAgo } });

    const expired = await manager.isExpired(emergency.atomId);
    expect(expired).toBe(true);

    const canAssign = await manager.canAssignAtom(emergency.atomId);
    expect(canAssign.canAssign).toBe(false);
    expect(canAssign.reason).toMatch(/expired/i);

    const countdown = await manager.getExpirationCountdown(emergency.atomId);
    expect(countdown.isExpired).toBe(true);
    expect(countdown.daysRemaining).toBe(0);
  });

  test("emergency content within the 7-day warning window is NOT expired but WARNS", async () => {
    const emergency = await manager.createEmergencyContent(`${testTag}-warning-window`, "content", "justification");
    const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    await prisma.learningAtom.update({ where: { id: emergency.atomId }, data: { emergencyExpiresAt: fiveDaysFromNow } });

    const canAssign = await manager.canAssignAtom(emergency.atomId);
    expect(canAssign.canAssign).toBe(true);
    expect(canAssign.reason).toMatch(/WARNING/);
    expect(canAssign.reason).toMatch(/5 days|4 days/); // rounds by whole-day math
  });

  test("mustReplace() is true for expired content with no replacement yet linked", async () => {
    const emergency = await manager.createEmergencyContent(`${testTag}-must-replace`, "content", "justification");
    await prisma.learningAtom.update({ where: { id: emergency.atomId }, data: { emergencyExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) } });

    const mustReplace = await manager.mustReplace(emergency.atomId);
    expect(mustReplace).toBe(true);
  });

  test("mustReplace() is false once a replacement atom links back via replacedAtomId (supersession chain, C-011 precursor)", async () => {
    const emergency = await manager.createEmergencyContent(`${testTag}-replaced`, "content", "justification");
    await prisma.learningAtom.update({ where: { id: emergency.atomId }, data: { emergencyExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) } });

    await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001', title: `${testTag}-replacement-atom`, objective: "properly designed replacement", format: "micro_lesson", status: "APPROVED", duration: 10, replacedAtomId: emergency.atomId },
    });

    const mustReplace = await manager.mustReplace(emergency.atomId);
    expect(mustReplace).toBe(false);
  });

  describe("WP-2 §4: renewal requires approval", () => {
    test("renewEmergencyContent() WITHOUT a valid approval is rejected", async () => {
      const emergency = await manager.createEmergencyContent(`${testTag}-renew-noapproval`, "content", "justification");

      await expect(
        manager.renewEmergencyContent({
          atomId: emergency.atomId,
          newDurationDays: 30,
          approvalId: "nonexistent-approval-id",
          renewedBy: "qm.olea@example.com",
        })
      ).rejects.toThrow(/does not authorize an emergency-content renewal/);
    });

    test("renewEmergencyContent() WITH a valid APPROVED EMERGENCY_CONTENT_RENEWAL approval extends expiration and audit-logs it", async () => {
      const emergency = await manager.createEmergencyContent(`${testTag}-renew-approved`, "content", "justification", 5);
      const before = await manager.getExpirationCountdown(emergency.atomId);

      const approval = await prisma.maiApproval.create({
        data: {
          tenantId: "tenant_001",
          approvalType: "EMERGENCY_CONTENT_RENEWAL",
          subjectId: emergency.atomId,
          subjectType: "LearningAtom",
          decision: "APPROVED",
          decidedBy: "qm.olea@example.com",
          decidedAt: new Date(),
          rationale: `${testTag} — reviewed and re-approved for extended interim use pending final content`,
        },
      });

      const result = await manager.renewEmergencyContent({
        atomId: emergency.atomId,
        newDurationDays: 30,
        approvalId: approval.id,
        renewedBy: "qm.olea@example.com",
      });

      const after = await manager.getExpirationCountdown(emergency.atomId);
      expect(after.expiresAt!.getTime()).toBeGreaterThan(before.expiresAt!.getTime());
      expect(result.newExpiresAt.getTime()).toBe(after.expiresAt!.getTime());

      const auditLog = await prisma.auditLog.findFirst({ where: { objectId: emergency.atomId, action: "emergency_content_renewed" } });
      expect(auditLog).not.toBeNull();
      const details = JSON.parse(auditLog!.details!);
      expect(details.approvalId).toBe(approval.id);
      expect(details.renewedBy).toBe("qm.olea@example.com");
    });

    test("renewEmergencyContent() rejects a REJECTED (not APPROVED) approval record", async () => {
      const emergency = await manager.createEmergencyContent(`${testTag}-renew-rejected-approval`, "content", "justification");
      const rejectedApproval = await prisma.maiApproval.create({
        data: {
          tenantId: "tenant_001",
          approvalType: "EMERGENCY_CONTENT_RENEWAL",
          subjectId: emergency.atomId,
          subjectType: "LearningAtom",
          decision: "REJECTED",
          decidedBy: "qm.olea@example.com",
          decidedAt: new Date(),
          rationale: `${testTag} — reviewer declined renewal, content must be replaced instead`,
        },
      });

      await expect(
        manager.renewEmergencyContent({
          atomId: emergency.atomId,
          newDurationDays: 30,
          approvalId: rejectedApproval.id,
          renewedBy: "qm.olea@example.com",
        })
      ).rejects.toThrow(/does not authorize an emergency-content renewal/);
    });

    test("renewEmergencyContent() on a non-EMERGENCY_INTERIM atom is rejected", async () => {
      const normalAtom = await prisma.learningAtom.create({
        data: {
        tenantId: 'tenant_001', title: `${testTag}-not-emergency`, objective: "x", format: "micro_lesson", status: "APPROVED", duration: 5 },
      });

      await expect(
        manager.renewEmergencyContent({ atomId: normalAtom.id, newDurationDays: 30, approvalId: "x", renewedBy: "x" })
      ).rejects.toThrow(/is not EMERGENCY_INTERIM content/);
    });
  });
});
