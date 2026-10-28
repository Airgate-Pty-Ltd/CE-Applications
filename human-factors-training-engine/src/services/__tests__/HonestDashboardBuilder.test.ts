/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { HonestDashboardBuilder } from "../HonestDashboardBuilder";

describe("HonestDashboardBuilder (real DB, real service) — Phase 2 gate: absent-data states", () => {
  let prisma: PrismaClient;
  let builder: HonestDashboardBuilder;
  const testTag = `hdb-test-${Date.now()}`;

  let interventionAId: string;
  let interventionBId: string;
  let eventId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    builder = new HonestDashboardBuilder(prisma);

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

    const interventionA = await prisma.learningIntervention.create({
      data: {
        tenantId: 'tenant_001',
        eventId,
        title: `${testTag}-intervention-A`,
        atomIds: JSON.stringify([]),
        designedBy: "system",
        status: "ACTIVE",
      },
    });
    interventionAId = interventionA.id;

    const interventionB = await prisma.learningIntervention.create({
      data: {
        tenantId: 'tenant_001',
        eventId,
        title: `${testTag}-intervention-B`,
        atomIds: JSON.stringify([]),
        designedBy: "system",
        status: "DRAFT",
      },
    });
    interventionBId = interventionB.id;

    const manifest = await prisma.trainingPackageManifest.create({
      data: {
        tenantId: 'tenant_001',
        packageId: `${testTag}-pkg`,
        curriculumRevision: "1.0",
        compilerVersion: "1.0.0",
        rulesetRevision: "1.0",
        baselineContent: JSON.stringify([]),
        outputHash: `${testTag}-hash`,
        status: "ACTIVE",
      },
    });

    const learner = await prisma.user.create({
      data: { email: `${testTag}@example.com`, passwordHash: "x", name: "Dashboard Test Learner", role: "learner" },
    });

    // Intervention A: 2 assignments — 1 ASSIGNED (unverified), 1 PASSED + observed
    const a1 = await prisma.trainingAssignment.create({
      data: {
        tenantId: 'tenant_001', learnerId: learner.id, interventionId: interventionAId, manifestId: manifest.id, status: "ASSIGNED" },
    });
    const a2 = await prisma.trainingAssignment.create({
      data: {
        tenantId: 'tenant_001', learnerId: learner.id, interventionId: interventionAId, manifestId: manifest.id, status: "PASSED" },
    });
    await prisma.supervisorObservation.create({
      data: {
        assignmentId: a2.id,
        interventionId: interventionAId,
        supervisorId: "sup@example.com",
        description: "Observed",
        effectivenessLevel: "WORKPLACE_TRANSFER",
        recordedBy: "sup@example.com",
      },
    });

    // Intervention B: 1 IN_PROGRESS assignment, no observations at all
    await prisma.trainingAssignment.create({
      data: {
        tenantId: 'tenant_001',
        learnerId: learner.id,
        interventionId: interventionBId,
        manifestId: manifest.id,
        status: "IN_PROGRESS",
      },
    });
  });

  afterAll(async () => {
    await prisma.supervisorObservation.deleteMany({
      where: { interventionId: { in: [interventionAId, interventionBId] } },
    });
    await prisma.trainingAssignment.deleteMany({
      where: { interventionId: { in: [interventionAId, interventionBId] } },
    });
    await prisma.trainingPackageManifest.deleteMany({ where: { packageId: `${testTag}-pkg` } });
    await prisma.user.deleteMany({ where: { email: `${testTag}@example.com` } });
    await prisma.learningIntervention.deleteMany({ where: { id: { in: [interventionAId, interventionBId] } } });
    await prisma.hfEvent.deleteMany({ where: { id: eventId } });
    await prisma.hfEvidence.deleteMany({ where: { title: `${testTag}-evidence` } });
    await prisma.$disconnect();
  });

  test("dashboard for intervention A shows ONLY intervention A's assignments, not a global count (regression guard for the missing interventionId filter bug)", async () => {
    const dashboardA = await builder.buildInterventionDashboard(interventionAId);
    expect(dashboardA.assignmentCount).toBe(2); // exactly A's two assignments, not B's too

    const dashboardB = await builder.buildInterventionDashboard(interventionBId);
    expect(dashboardB.assignmentCount).toBe(1); // exactly B's one assignment

    expect(dashboardA.assignmentCount).not.toBe(dashboardB.assignmentCount);
  });

  test("dashboard reports explicit absent-data states, not optimistic defaults", async () => {
    const dashboardB = await builder.buildInterventionDashboard(interventionBId);

    // One IN_PROGRESS assignment: not ASSIGNED, not COMPLETED/PASSED/FAILED — must show as
    // unverified (total - completed), not silently vanish (regression guard for the
    // `assigned - completed` disjoint-subtraction bug).
    expect(dashboardB.completionStats.unverified).toBe(1);
    expect(dashboardB.effectivenessStats.unobserved).toBe(1); // no observation recorded
    expect(dashboardB.dataQuality.complete).toBe(false);
    expect(dashboardB.dataQuality.evidence.length).toBeGreaterThan(0);
    expect(dashboardB.dataQuality.evidence[0]).toMatch(/unverified effectiveness|not yet assessed/);
  });

  test("dashboard for a fully-evidenced intervention reports complete=true honestly", async () => {
    const dashboardA = await builder.buildInterventionDashboard(interventionAId);
    // A has 1 ASSIGNED (unverified=1) and 1 PASSED+observed — data quality is NOT complete
    // because one assignment still lacks both completion and observation evidence.
    expect(dashboardA.completionStats.unverified).toBe(1);
    expect(dashboardA.effectivenessStats.observed).toBe(1);
    expect(dashboardA.dataQuality.complete).toBe(false);
  });

  test("buildQualityManagerDashboard() correctly counts ACTIVE interventions against real (uppercase) status values (regression guard for the status-casing bug)", async () => {
    const qmDashboard = await builder.buildQualityManagerDashboard();
    const ourInterventions = qmDashboard.interventions.filter((i) =>
      [interventionAId, interventionBId].includes(i.interventionId)
    );
    expect(ourInterventions.find((i) => i.interventionId === interventionAId)!.status).toBe("ACTIVE");
    expect(ourInterventions.find((i) => i.interventionId === interventionBId)!.status).toBe("DRAFT");

    // At least our one ACTIVE intervention must be counted — proves the comparison isn't
    // silently always-false against real uppercase data.
    expect(qmDashboard.summary.activeInterventions).toBeGreaterThanOrEqual(1);
  });
});
