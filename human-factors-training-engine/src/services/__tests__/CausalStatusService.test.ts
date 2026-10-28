/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { CausalStatusService } from "../CausalStatusService";

describe("CausalStatusService (real DB, real service) — C-004", () => {
  let prisma: PrismaClient;
  let service: CausalStatusService;
  const testTag = `cs-test-${Date.now()}`;
  let eventId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    service = new CausalStatusService(prisma);

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
  });

  afterAll(async () => {
    await prisma.maiCausalStatus.deleteMany({ where: { eventId } });
    await prisma.hfEvent.deleteMany({ where: { id: eventId } });
    await prisma.hfEvidence.deleteMany({ where: { title: `${testTag}-evidence` } });
    await prisma.$disconnect();
  });

  test("C-004: a freshly created event has NO causal-status row (default REPORTED, never auto-promoted)", async () => {
    const status = await service.getStatus(eventId);
    expect(status).toBeNull(); // no row was ever written by anything other than an explicit promote() call
  });

  test("C-004: promotion requires a named human actor — rejects an empty promotedBy", async () => {
    await expect(
      service.promote({ tenantId: "tenant_001", eventId, toStatus: "SUSPECTED", promotedBy: "" })
    ).rejects.toThrow(/named human actor/);
  });

  test("C-004: full human-driven promotion chain REPORTED -> SUSPECTED -> UNDER_INVESTIGATION -> VERIFIED, each step actor-attributed", async () => {
    const s1 = await service.promote({
      tenantId: "tenant_001",
      eventId,
      toStatus: "SUSPECTED",
      promotedBy: "qm.olea@example.com",
      notes: "Fatigue pattern observed; candidate root cause under review",
    });
    expect(s1.status).toBe("SUSPECTED");
    expect(s1.promotedBy).toBe("qm.olea@example.com");
    expect(s1.promotedAt).not.toBeNull();

    const s2 = await service.promote({
      tenantId: "tenant_001",
      eventId,
      toStatus: "UNDER_INVESTIGATION",
      promotedBy: "qm.olea@example.com",
      notes: "Formal investigation opened",
    });
    expect(s2.status).toBe("UNDER_INVESTIGATION");

    const s3 = await service.promote({
      tenantId: "tenant_001",
      eventId,
      toStatus: "VERIFIED",
      promotedBy: "qm.olea@example.com",
      notes: "Root cause confirmed",
      verifiedRootCause: "Insufficient rest before 12-hour shift; existing training silent on fatigue",
    });
    expect(s3.status).toBe("VERIFIED");
    expect(s3.verifiedRootCause).toMatch(/Insufficient rest/);
  });

  test("C-004: an invalid transition (skipping straight from REPORTED to VERIFIED) is rejected", async () => {
    const evidence2 = await prisma.hfEvidence.create({
      data: {
        tenantId: "tenant_001",
        classification: "INTERNAL",
        source: `${testTag}-source-2`,
        sourceType: "ncr",
        title: `${testTag}-evidence-2`,
        occurredAt: new Date(),
        createdBy: "system",
      },
    });
    const event2 = await prisma.hfEvent.create({
      data: {
        tenantId: "tenant_001",
        evidenceId: evidence2.id,
        title: `${testTag}-event-2`,
        occurredAt: new Date(),
      },
    });

    await expect(
      service.promote({
        tenantId: "tenant_001",
        eventId: event2.id,
        toStatus: "VERIFIED",
        promotedBy: "qm.olea@example.com",
      })
    ).rejects.toThrow(/Invalid causal-status transition: REPORTED -> VERIFIED/);

    await prisma.hfEvent.deleteMany({ where: { id: event2.id } });
    await prisma.hfEvidence.deleteMany({ where: { id: evidence2.id } });
  });
});
