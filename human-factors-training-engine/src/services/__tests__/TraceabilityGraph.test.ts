/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { TraceabilityGraph } from "../TraceabilityGraph";

describe("TraceabilityGraph (real DB, real service) — C-010 forward/reverse, C-011 recall", () => {
  let prisma: PrismaClient;
  let graph: TraceabilityGraph;
  const testTag = `tg-test-${Date.now()}`;

  let eventId: string;
  let interventionId: string;
  let atomId: string;
  let learnerId: string;
  let manifestId: string;
  let assignmentId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    graph = new TraceabilityGraph(prisma);

    // Build a small, real evidence -> event -> intervention -> atom chain, independent of
    // the Phase 1 vertical-slice seed data, so this test is self-contained and repeatable.
    const evidence = await prisma.hfEvidence.create({
      data: {
        tenantId: "tenant_001",
        classification: "INTERNAL",
        source: `${testTag}-NCR`,
        sourceType: "ncr",
        title: `${testTag} evidence`,
        occurredAt: new Date("2026-07-01"),
        themes: JSON.stringify(["communication"]),
        severity: "medium",
        createdBy: "system",
      },
    });

    const event = await prisma.hfEvent.create({
      data: {
        tenantId: "tenant_001",
        evidenceId: evidence.id,
        title: `${testTag} event`,
        occurredAt: new Date("2026-07-01"),
        themes: JSON.stringify(["communication"]),
        rolesExposed: JSON.stringify(["maintenance_technician"]),
        sitesExposed: JSON.stringify(["Brisbane"]),
      },
    });
    eventId = event.id;

    const intervention = await prisma.learningIntervention.create({
      data: {
        tenantId: 'tenant_001',
        eventId: event.id,
        title: `${testTag} intervention`,
        atomIds: JSON.stringify([]),
        designedBy: "system",
      },
    });
    interventionId = intervention.id;

    const atom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag} atom`,
        objective: "traceability test",
        format: "micro_lesson",
        status: "APPROVED",
        duration: 8,
      },
    });
    atomId = atom.id;

    // Wire the graph: event -> intervention -> atom (matches TraceabilityGraph's expected edges)
    await prisma.evidenceRelationship.create({
      data: {
        tenantId: "tenant_001",
        fromEntityType: "HfEvent",
        fromEntityId: event.id,
        toEntityType: "LearningIntervention",
        toEntityId: intervention.id,
        relationshipType: "ADDRESSES",
        createdBy: "system",
      },
    });
    await prisma.evidenceRelationship.create({
      data: {
        tenantId: "tenant_001",
        fromEntityType: "LearningIntervention",
        fromEntityId: intervention.id,
        toEntityType: "LearningAtom",
        toEntityId: atom.id,
        relationshipType: "INCLUDES",
        createdBy: "system",
      },
    });

    // A learner + frozen manifest + active assignment referencing this atom (for recall query)
    const learner = await prisma.user.create({
      data: {
        email: `${testTag}@example.com`,
        passwordHash: "x",
        name: "Traceability Test Learner",
        role: "learner",
      },
    });
    learnerId = learner.id;

    const manifest = await prisma.trainingPackageManifest.create({
      data: {
        tenantId: 'tenant_001',
        packageId: `${testTag}-pkg`,
        curriculumRevision: "1.0",
        compilerVersion: "1.0.0",
        rulesetRevision: "1.0",
        baselineContent: JSON.stringify([{ atomId: atom.id, title: atom.title }]),
        outputHash: `${testTag}-hash`,
        status: "ACTIVE",
      },
    });
    manifestId = manifest.id;

    const assignment = await prisma.trainingAssignment.create({
      data: {
        tenantId: 'tenant_001',
        learnerId: learner.id,
        interventionId: intervention.id,
        manifestId: manifest.id,
        status: "ASSIGNED",
      },
    });
    assignmentId = assignment.id;
  });

  afterAll(async () => {
    await prisma.trainingAssignment.deleteMany({ where: { id: assignmentId } });
    await prisma.trainingPackageManifest.deleteMany({ where: { id: manifestId } });
    await prisma.user.deleteMany({ where: { id: learnerId } });
    await prisma.evidenceRelationship.deleteMany({
      where: { OR: [{ fromEntityId: eventId }, { fromEntityId: interventionId }] },
    });
    await prisma.learningAtom.deleteMany({ where: { id: atomId } });
    await prisma.learningIntervention.deleteMany({ where: { id: interventionId } });
    await prisma.hfEvent.deleteMany({ where: { id: eventId } });
    await prisma.hfEvidence.deleteMany({ where: { title: `${testTag} evidence` } });
    await prisma.$disconnect();
  });

  test("C-010 forward: findAtomsForEvent() traverses Event -> Intervention -> Atom", async () => {
    const atoms = await graph.findAtomsForEvent(eventId);
    expect(atoms).toHaveLength(1);
    expect(atoms[0].atomId).toBe(atomId);
    expect(atoms[0].status).toBe("APPROVED");
  });

  test("C-010 reverse: findEventsForAtom() traverses Atom <- Intervention <- Event", async () => {
    const events = await graph.findEventsForAtom(atomId);
    expect(events).toHaveLength(1);
    expect(events[0].eventId).toBe(eventId);
    expect(events[0].themes).toContain("communication");
  });

  test("findAtomsForEvent() returns [] for an event with no linked interventions", async () => {
    const orphanEvent = await prisma.hfEvent.create({
      data: {
        tenantId: "tenant_001",
        evidenceId: (
          await prisma.hfEvidence.create({
            data: {
              tenantId: "tenant_001",
              classification: "INTERNAL",
              source: `${testTag}-orphan`,
              sourceType: "ncr",
              title: `${testTag}-orphan-evidence`,
              occurredAt: new Date(),
              createdBy: "system",
            },
          })
        ).id,
        title: `${testTag}-orphan-event`,
        occurredAt: new Date(),
      },
    });

    const atoms = await graph.findAtomsForEvent(orphanEvent.id);
    expect(atoms).toEqual([]);

    await prisma.hfEvent.deleteMany({ where: { id: orphanEvent.id } });
  });

  test("C-011 recall: findLearnersWithAtom() identifies the learner+assignment referencing the atom", async () => {
    const learners = await graph.findLearnersWithAtom(atomId);
    expect(learners).toHaveLength(1);
    expect(learners[0].learnerId).toBe(learnerId);
    expect(learners[0].assignmentId).toBe(assignmentId);
    expect(learners[0].manifestId).toBe(manifestId);
    expect(learners[0].status).toBe("ASSIGNED");
  });

  test("C-011 recall: findLearnersWithAtom() returns [] for an atom no manifest references", async () => {
    const unreferencedAtom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag}-unreferenced`,
        objective: "not in any manifest",
        format: "card",
        status: "APPROVED",
        duration: 2,
      },
    });

    const learners = await graph.findLearnersWithAtom(unreferencedAtom.id);
    expect(learners).toEqual([]);

    await prisma.learningAtom.deleteMany({ where: { id: unreferencedAtom.id } });
  });

  test("buildInterventionAuditChain() assembles intervention + linked events + atoms + observations", async () => {
    const chain = await graph.buildInterventionAuditChain(interventionId);
    expect(chain.intervention).not.toBeNull();
    expect(chain.intervention!.id).toBe(interventionId);
    expect(chain.events.map((e: { id: string }) => e.id)).toContain(eventId);
    expect(chain.atoms.map((a: { id: string }) => a.id)).toContain(atomId);
  });
});
