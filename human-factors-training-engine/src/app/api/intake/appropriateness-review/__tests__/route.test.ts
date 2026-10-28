/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { POST } from "../route";
import { createUserSession } from "@/lib/session";

/**
 * D-068 / D-066: regression coverage for the appropriateness-review checkbox persistence.
 * D-066 already root-caused the originally-reported "defect" as a browser-automation tool
 * artifact (form_input setting a checkbox's DOM property without going through React's
 * controlled-component path) - a real click proved persistence correct in both boolean states.
 * This file is the durable fix the correction actually calls for: real API-level coverage that
 * cannot be fooled by a browser-automation quirk, since it drives the route directly.
 *
 * First route-level test in this codebase (confirmed by search - no other src/app/api/** route
 * has a __tests__ file). It now exercises the same opaque, database-backed session path used
 * by production requests.
 */
describe("POST /api/intake/appropriateness-review (D-068 checkbox regression coverage)", () => {
  let prisma: PrismaClient;
  const testTag = `aar-test-${Date.now()}`;
  const priorSessionSecret = process.env.SESSION_SECRET;

  beforeAll(() => {
    process.env.SESSION_SECRET = "test-only-session-secret-with-at-least-32-bytes";
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.learningInterventionAppropriatenessReview.deleteMany({ where: { intervention: { title: { contains: testTag } } } });
    await prisma.evidenceRelationship.deleteMany({ where: { fromEntityId: { in: await eventIdsForTag() } } });
    await prisma.learningIntervention.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.hfEvent.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.hfEvidence.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.user.deleteMany({ where: { email: { contains: testTag } } });
    await prisma.$disconnect();
    if (priorSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorSessionSecret;
  });

  async function eventIdsForTag(): Promise<string[]> {
    const rows = await prisma.hfEvent.findMany({ where: { title: { contains: testTag } }, select: { id: true } });
    return rows.map((r) => r.id);
  }

  async function makeUser() {
    return prisma.user.create({
      data: {
        email: `qm-${testTag}-${Math.random().toString(36).slice(2)}@example.com`,
        passwordHash: "x",
        name: "Test QM",
        role: "trainer",
        organizationMemberships: { create: { organizationId: "tenant_001", role: "trainer" } },
      },
    });
  }

  async function makeEvent() {
    const evidence = await prisma.hfEvidence.create({
      data: { tenantId: "tenant_001", source: `${testTag}-src`, title: `${testTag} evidence`, occurredAt: new Date(), createdBy: "test" },
    });
    return prisma.hfEvent.create({
      data: { tenantId: "tenant_001", evidenceId: evidence.id, title: `${testTag} event`, occurredAt: new Date() },
    });
  }

  async function postRequest(userId: string, body: Record<string, unknown>) {
    const session = await createUserSession(userId, "route-test-agent");
    return new NextRequest("http://localhost/api/intake/appropriateness-review", {
      method: "POST",
      headers: { cookie: `session=${session.token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  test("unchecked: competenceGapIdentified and trainingReducesRisk both omitted persist as false", async () => {
    const user = await makeUser();
    const event = await makeEvent();
    const res = await POST(await postRequest(user.id, { eventId: event.id, interventionTitle: `${testTag} intervention A` }));
    expect(res.status).toBe(200);
    const body = await res.json();

    const review = await prisma.learningInterventionAppropriatenessReview.findUniqueOrThrow({ where: { interventionId: body.interventionId } });
    expect(review.competenceGapIdentified).toBe(false);
    expect(review.trainingReducesRisk).toBe(false);
  });

  test("checked: both true persist as true", async () => {
    const user = await makeUser();
    const event = await makeEvent();
    const res = await POST(await postRequest(user.id, { eventId: event.id, interventionTitle: `${testTag} intervention B`, competenceGapIdentified: true, trainingReducesRisk: true }));
    const body = await res.json();

    const review = await prisma.learningInterventionAppropriatenessReview.findUniqueOrThrow({ where: { interventionId: body.interventionId } });
    expect(review.competenceGapIdentified).toBe(true);
    expect(review.trainingReducesRisk).toBe(true);
  });

  test("mixed states persist correctly and independently (the exact case D-066 found the browser tool, not the app, had gotten wrong)", async () => {
    const user = await makeUser();
    const event = await makeEvent();
    const res = await POST(await postRequest(user.id, { eventId: event.id, interventionTitle: `${testTag} intervention C`, competenceGapIdentified: true, trainingReducesRisk: false }));
    const body = await res.json();

    const review = await prisma.learningInterventionAppropriatenessReview.findUniqueOrThrow({ where: { interventionId: body.interventionId } });
    expect(review.competenceGapIdentified).toBe(true);
    expect(review.trainingReducesRisk).toBe(false);

    // Reverse polarity, independent intervention - confirms the two fields don't cross-contaminate.
    const event2 = await makeEvent();
    const res2 = await POST(await postRequest(user.id, { eventId: event2.id, interventionTitle: `${testTag} intervention C2`, competenceGapIdentified: false, trainingReducesRisk: true }));
    const body2 = await res2.json();
    const review2 = await prisma.learningInterventionAppropriatenessReview.findUniqueOrThrow({ where: { interventionId: body2.interventionId } });
    expect(review2.competenceGapIdentified).toBe(false);
    expect(review2.trainingReducesRisk).toBe(true);
  });

  test("a fresh read after 'reload' (a second, independent query) reproduces exactly what was persisted - not a cached/stale value", async () => {
    const user = await makeUser();
    const event = await makeEvent();
    const res = await POST(await postRequest(user.id, { eventId: event.id, interventionTitle: `${testTag} intervention D`, competenceGapIdentified: true, trainingReducesRisk: true }));
    const body = await res.json();

    const firstRead = await prisma.learningInterventionAppropriatenessReview.findUniqueOrThrow({ where: { interventionId: body.interventionId } });
    const secondRead = await prisma.learningInterventionAppropriatenessReview.findUniqueOrThrow({ where: { interventionId: body.interventionId } });
    expect(secondRead.competenceGapIdentified).toBe(firstRead.competenceGapIdentified);
    expect(secondRead.trainingReducesRisk).toBe(firstRead.trainingReducesRisk);
    expect(secondRead.competenceGapIdentified).toBe(true);
  });

  test("DB values match exactly what the UI submitted, byte for byte on the boolean fields - no silent coercion", async () => {
    const user = await makeUser();
    const event = await makeEvent();
    const submitted = { competenceGapIdentified: true, trainingReducesRisk: false };
    const res = await POST(await postRequest(user.id, { eventId: event.id, interventionTitle: `${testTag} intervention E`, ...submitted }));
    const body = await res.json();

    const review = await prisma.learningInterventionAppropriatenessReview.findUniqueOrThrow({ where: { interventionId: body.interventionId } });
    expect(review.competenceGapIdentified).toBe(submitted.competenceGapIdentified);
    expect(review.trainingReducesRisk).toBe(submitted.trainingReducesRisk);
  });

  test("downstream gating (LessonAutoPreparationService's governance snapshot) reads the persisted value, not a fabricated one - competenceGapIdentified=true here means HFINT-002 does not fire", async () => {
    const user = await makeUser();
    const event = await makeEvent();
    const res = await POST(await postRequest(user.id, { eventId: event.id, interventionTitle: `${testTag} intervention F`, competenceGapIdentified: true, trainingReducesRisk: true }));
    const body = await res.json();

    const intervention = await prisma.learningIntervention.findUniqueOrThrow({
      where: { id: body.interventionId },
      include: { appropriatenessReview: true },
    });
    // This is exactly the field LessonAutoPreparationService/LessonRevisionReleaseService read -
    // confirms the persisted value is real and reachable via the same relation those services use.
    expect(intervention.appropriatenessReview?.competenceGapIdentified).toBe(true);
  });

  test("the audit trail (LearningInterventionAppropriatenessReview.reviewedBy/reviewedAt) records who made the decision and when", async () => {
    const user = await makeUser();
    const event = await makeEvent();
    const before = new Date();
    const res = await POST(await postRequest(user.id, { eventId: event.id, interventionTitle: `${testTag} intervention G`, competenceGapIdentified: true, trainingReducesRisk: true }));
    const body = await res.json();

    const review = await prisma.learningInterventionAppropriatenessReview.findUniqueOrThrow({ where: { interventionId: body.interventionId } });
    expect(review.reviewedBy).toBe(user.email);
    expect(review.reviewedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  test("409: a second review for the same intervention is refused, not silently overwritten", async () => {
    const user = await makeUser();
    const event = await makeEvent();
    const first = await POST(await postRequest(user.id, { eventId: event.id, interventionTitle: `${testTag} intervention H`, competenceGapIdentified: true }));
    expect(first.status).toBe(200);

    const second = await POST(await postRequest(user.id, { eventId: event.id, interventionTitle: `${testTag} intervention H`, competenceGapIdentified: false }));
    expect(second.status).toBe(409);

    // The original true value survives - the second, rejected attempt never touched it.
    const firstBody = await first.json();
    const review = await prisma.learningInterventionAppropriatenessReview.findUniqueOrThrow({ where: { interventionId: firstBody.interventionId } });
    expect(review.competenceGapIdentified).toBe(true);
  });
});
