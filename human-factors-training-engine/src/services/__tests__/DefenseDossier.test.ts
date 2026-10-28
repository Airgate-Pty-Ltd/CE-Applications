/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { DefenseDossier } from "../DefenseDossier";
import { CausalStatusService } from "../CausalStatusService";
import { ContentSupersessionService } from "../ContentSupersessionService";

describe("DefenseDossier (real DB, real service) — WP-1 flagship deliverable", () => {
  let prisma: PrismaClient;
  let dossier: DefenseDossier;
  const testTag = `dd-test-${Date.now()}`;

  let evidenceId: string;
  let eventId: string;
  let interventionId: string;
  let oldAtomId: string;
  let newAtomId: string;
  let learnerId: string;
  let assignmentId: string;
  let manifestId: string;
  let policyPackId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    dossier = new DefenseDossier(prisma);

    const evidence = await prisma.hfEvidence.create({
      data: {
        tenantId: "tenant_001",
        classification: "INTERNAL",
        source: `NCR-${testTag}`,
        sourceType: "ncr",
        title: `${testTag}-evidence`,
        occurredAt: new Date("2026-07-15"),
        createdBy: "qm.olea@example.com",
      },
    });
    evidenceId = evidence.id;

    const event = await prisma.hfEvent.create({
      data: {
        tenantId: "tenant_001",
        evidenceId,
        title: `${testTag}-event`,
        occurredAt: new Date("2026-07-15"),
        themes: JSON.stringify(["fatigue"]),
      },
    });
    eventId = event.id;

    // Multi-step causal status promotion — proves history reconstruction (WP-1 §6)
    const causalService = new CausalStatusService(prisma);
    await causalService.promote({ tenantId: "tenant_001", eventId, toStatus: "SUSPECTED", promotedBy: "qm.olea@example.com" });
    await causalService.promote({ tenantId: "tenant_001", eventId, toStatus: "UNDER_INVESTIGATION", promotedBy: "qm.olea@example.com" });
    await causalService.promote({
      tenantId: "tenant_001",
      eventId,
      toStatus: "VERIFIED",
      promotedBy: "qm.olea@example.com",
      verifiedRootCause: "Insufficient rest before 12-hour shift",
    });

    const oldAtom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag}-atom-original`,
        objective: "original objective",
        format: "micro_lesson",
        status: "APPROVED",
        duration: 8,
        classification: "INTERNAL",
        licenseClass: "proprietary",
        owner: "Conform-Edge",
        approvedBy: "qm.olea@example.com",
        approvedAt: new Date(),
      },
    });
    oldAtomId = oldAtom.id;

    const intervention = await prisma.learningIntervention.create({
      data: {
        tenantId: 'tenant_001',
        eventId,
        title: `${testTag}-intervention`,
        atomIds: JSON.stringify([oldAtomId]),
        effectivenessTargetLevel: "WORKPLACE_TRANSFER",
        status: "PUBLISHED",
        designedBy: "qm.olea@example.com",
      },
    });
    interventionId = intervention.id;

    await prisma.evidenceRelationship.create({
      data: {
        tenantId: "tenant_001",
        fromEntityType: "HfEvent",
        fromEntityId: eventId,
        toEntityType: "LearningIntervention",
        toEntityId: interventionId,
        relationshipType: "ADDRESSES",
        createdBy: "qm.olea@example.com",
      },
    });
    await prisma.evidenceRelationship.create({
      data: {
        tenantId: "tenant_001",
        fromEntityType: "LearningIntervention",
        fromEntityId: interventionId,
        toEntityType: "LearningAtom",
        toEntityId: oldAtomId,
        relationshipType: "INCLUDES",
        createdBy: "qm.olea@example.com",
      },
    });

    await prisma.maiApproval.create({
      data: {
        tenantId: "tenant_001",
        approvalType: "INTERVENTION_START",
        subjectId: interventionId,
        subjectType: "LearningIntervention",
        decision: "APPROVED",
        decidedBy: "qm.olea@example.com",
        decidedAt: new Date(),
      },
    });

    const learner = await prisma.user.create({
      data: { email: `${testTag}@example.com`, passwordHash: "x", name: "Dossier Test Learner", role: "learner" },
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
        frozenAt: new Date(),
      },
    });
    manifestId = manifest.id;

    const assignment = await prisma.trainingAssignment.create({
      data: {
        tenantId: 'tenant_001',
        learnerId,
        interventionId,
        manifestId,
        status: "PASSED",
        assignedAt: new Date("2026-07-20"),
        completedAt: new Date("2026-07-25"),
        passedAt: new Date("2026-07-25"),
      },
    });
    assignmentId = assignment.id;

    await prisma.supervisorObservation.create({
      data: {
        assignmentId,
        interventionId,
        supervisorId: "supervisor.jones@example.com",
        description: "Observed effective behavior transfer.",
        effectivenessLevel: "WORKPLACE_TRANSFER",
        outcome: "effective",
        recordedBy: "supervisor.jones@example.com",
      },
    });
    await prisma.effectivenessEvidence.create({
      data: {
        interventionId,
        assignmentId,
        level: "WORKPLACE_TRANSFER",
        evidenceType: "observation",
        collectedBy: "supervisor.jones@example.com",
        supportsClosureAtLevel: true,
      },
    });

    // Kernel system condition, with human disposition. tenantId is test-scoped (not the
    // shared "tenant_001") to avoid colliding with MaiRuleManifest's @@unique([tenantId,
    // version]) against pre-existing seed/other-test rows at version 1.
    const ruleManifest = await prisma.maiRuleManifest.create({
      data: {
        tenantId: testTag,
        version: 1,
        status: "PUBLISHED",
        rules: JSON.stringify([]),
        createdBy: "system",
      },
    });
    const maiEvent = await prisma.maiEvent.create({
      data: { tenantId: testTag, ruleManifestId: ruleManifest.id, snapshotJson: "{}", snapshotHash: `${testTag}-snap` },
    });
    await prisma.maiSystemCondition.create({
      data: {
        tenantId: "tenant_001",
        ruleManifestId: ruleManifest.id,
        eventId: maiEvent.id,
        snapshotJson: "{}",
        snapshotHash: `${testTag}-cond-snap`,
        ruleId: "HFINT-001",
        ruleName: "Training as sole control",
        severity: "major",
        rationale: "Only training control linked to this event",
        status: "REVIEWED",
        response: "CONFIRM",
        respondedBy: "qm.olea@example.com",
        respondedAt: new Date(),
        linkedInterventionId: interventionId,
      },
    });

    // Policy Pack with a clause mapped to the atom (real requirement-mapping case)
    const pack = await prisma.policyPack.create({
      data: {
        name: `${testTag} Policy Pack`,
        regulatoryFramework: "FAA",
        mandatoryTopics: JSON.stringify(["fatigue"]),
      },
    });
    policyPackId = pack.id;
    await prisma.policyPackClause.create({
      data: {
        packId: policyPackId,
        clauseNumber: "8.12.1",
        clauseTitle: "Personnel Competency",
        mappedAtomIds: JSON.stringify([oldAtomId]),
      },
    });

    // Supersede the original atom — the exit gate's specific required proof
    const supersession = new ContentSupersessionService(prisma, 'tenant_001');
    const result = await supersession.supersede({
      oldAtomId,
      newAtomData: {
        title: `${testTag}-atom-corrected`,
        objective: "corrected objective",
        format: "micro_lesson",
        duration: 8,
        content: "Corrected content.",
        classification: "INTERNAL",
      },
      replacementReason: "Corrected error found in QA review",
      replacedBy: "qm.olea@example.com",
    });
    newAtomId = result.newAtom.id;
  });

  afterAll(async () => {
    await prisma.policyPackClause.deleteMany({ where: { packId: policyPackId } });
    await prisma.policyPack.deleteMany({ where: { id: policyPackId } });
    await prisma.maiSystemCondition.deleteMany({ where: { tenantId: "tenant_001", ruleId: "HFINT-001", ruleName: "Training as sole control" } });
    await prisma.maiEvent.deleteMany({ where: { tenantId: testTag } });
    await prisma.maiRuleManifest.deleteMany({ where: { tenantId: testTag } });
    await prisma.effectivenessEvidence.deleteMany({ where: { interventionId } });
    await prisma.supervisorObservation.deleteMany({ where: { interventionId } });
    await prisma.trainingAssignment.deleteMany({ where: { id: assignmentId } });
    await prisma.trainingPackageManifest.deleteMany({ where: { id: manifestId } });
    await prisma.user.deleteMany({ where: { id: learnerId } });
    await prisma.maiApproval.deleteMany({ where: { subjectId: interventionId } });
    await prisma.evidenceRelationship.deleteMany({ where: { OR: [{ fromEntityId: eventId }, { fromEntityId: interventionId }] } });
    await prisma.auditLog.deleteMany({ where: { objectId: { in: [eventId, oldAtomId, interventionId] } } });
    await prisma.maiCausalStatus.deleteMany({ where: { eventId } });
    await prisma.learningIntervention.deleteMany({ where: { id: interventionId } });
    await prisma.learningAtom.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.hfEvent.deleteMany({ where: { id: eventId } });
    await prisma.hfEvidence.deleteMany({ where: { id: evidenceId } });
    await prisma.$disconnect();
  });

  test("intervention scope: generates all 10 sections end-to-end from real seeded lifecycle data", async () => {
    const output = await dossier.buildDossier({ type: "intervention", interventionId });

    expect(output.title).toContain(testTag);
    expect(output.sections.requirementMapping).toBeDefined();
    expect(output.sections.curriculumMapping).toBeDefined();
    expect(output.sections.learnerEvidence).toBeDefined();
    expect(output.sections.recurrencyProof).toBeDefined();
    expect(output.sections.effectivenessEvidence).toBeDefined();
    expect(output.sections.causalStatusHistory).toBeDefined();
    expect(output.sections.kernelConditions).toBeDefined();
    expect(output.sections.contentBillOfMaterials).toBeDefined();
    expect(output.sections.gapRegister).toBeDefined();
    expect(output.sections.integrityAttestation).toBeDefined();
  });

  test("WP-1 exit-gate requirement: a recalled/superseded atom appears CORRECTLY in the Content Bill of Materials", async () => {
    const output = await dossier.buildDossier({ type: "intervention", interventionId });
    const bom = output.sections.contentBillOfMaterials.data.items;

    // Note: the intervention's atomIds still references the OLD atom (supersession does not
    // rewrite frozen intervention/manifest references — that's the whole point of D-021's
    // immutability design), so the dossier's BOM (scoped to the intervention's atoms) shows
    // the OLD atom with its supersession links intact and correct.
    const oldAtomInBom = bom.find((i) => i.atomId === oldAtomId);
    expect(oldAtomInBom).toBeDefined();
    expect(oldAtomInBom!.status).toBe("SUPERSEDED");
    expect(oldAtomInBom!.replacementAtomId).toBe(newAtomId);

    // The new atom is independently verifiable as pointing back
    const newAtom = await prisma.learningAtom.findUnique({ where: { id: newAtomId } });
    expect(newAtom!.replacedAtomId).toBe(oldAtomId);
    expect(newAtom!.status).toBe("APPROVED");
  });

  test("requirement mapping: real Policy Pack clause mapped to this intervention's atom is populated, not invented", async () => {
    const output = await dossier.buildDossier({ type: "intervention", interventionId });
    const mapping = output.sections.requirementMapping;

    expect(mapping.populated).toBe(true);
    expect(mapping.data.packs).toHaveLength(1);
    expect(mapping.data.packs[0].clauses[0].clauseNumber).toBe("8.12.1");
    expect(mapping.data.packs[0].clauses[0].mappedAtomIds).toContain(oldAtomId);
  });

  test("requirement mapping renders the honest owner-pending state when no pack maps to scope (negative control)", async () => {
    // A second intervention with no policy-pack mapping at all.
    const evidence2 = await prisma.hfEvidence.create({
      data: { tenantId: "tenant_001", classification: "INTERNAL", source: `${testTag}-2`, sourceType: "ncr", title: `${testTag}-evidence-2`, occurredAt: new Date(), createdBy: "system" },
    });
    const event2 = await prisma.hfEvent.create({
      data: { tenantId: "tenant_001", evidenceId: evidence2.id, title: `${testTag}-event-2`, occurredAt: new Date() },
    });
    const intervention2 = await prisma.learningIntervention.create({
      data: {
        tenantId: 'tenant_001', eventId: event2.id, title: `${testTag}-intervention-2`, atomIds: JSON.stringify([]), designedBy: "system" },
    });

    const output = await dossier.buildDossier({ type: "intervention", interventionId: intervention2.id });
    expect(output.sections.requirementMapping.populated).toBe(false);
    expect(output.sections.requirementMapping.note).toMatch(/awaiting owner-supplied Policy Pack/);
    expect(output.sections.gapRegister.data.coverageGaps).toContain(
      "No Policy Pack requirement mapping available for this scope (owner-pending input)."
    );

    await prisma.learningIntervention.deleteMany({ where: { id: intervention2.id } });
    await prisma.hfEvent.deleteMany({ where: { id: event2.id } });
    await prisma.hfEvidence.deleteMany({ where: { id: evidence2.id } });
  });

  test("causal-status history: reconstructs the full REPORTED -> SUSPECTED -> UNDER_INVESTIGATION -> VERIFIED chain, actor-attributed", async () => {
    const output = await dossier.buildDossier({ type: "intervention", interventionId });
    const eventHistory = output.sections.causalStatusHistory.data.events.find((e) => e.eventId === eventId);

    expect(eventHistory).toBeDefined();
    expect(eventHistory!.currentStatus).toBe("VERIFIED");
    expect(eventHistory!.history).toHaveLength(3);
    expect(eventHistory!.history.map((h) => h.toStatus)).toEqual(["SUSPECTED", "UNDER_INVESTIGATION", "VERIFIED"]);
    expect(eventHistory!.history.every((h) => h.promotedBy === "qm.olea@example.com")).toBe(true);
  });

  test("effectiveness evidence uses honest outcome language, not overclaimed", async () => {
    const output = await dossier.buildDossier({ type: "intervention", interventionId });
    const record = output.sections.effectivenessEvidence.data.records[0];

    expect(record.level).toBe("WORKPLACE_TRANSFER");
    expect(record.outcomeLanguage).toMatch(/exhibited the trained behavior in an actual workplace observation/);
    expect(record.outcomeLanguage).not.toMatch(/Not yet accepted/); // supportsClosureAtLevel was true
  });

  test("kernel conditions section shows human disposition, not just the raw finding", async () => {
    const output = await dossier.buildDossier({ type: "intervention", interventionId });
    const condition = output.sections.kernelConditions.data.conditions.find((c) => c.ruleId === "HFINT-001");

    expect(condition).toBeDefined();
    expect(condition!.response).toBe("CONFIRM");
    expect(condition!.respondedBy).toBe("qm.olea@example.com");
  });

  test("gap register is always populated (an empty gap list is itself honest content) and reflects real overdue/open state", async () => {
    const output = await dossier.buildDossier({ type: "intervention", interventionId });
    expect(output.sections.gapRegister.populated).toBe(true);
    // This intervention's one assignment is PASSED with no dueDate set — no overdue gap expected.
    expect(output.sections.gapRegister.data.overdueAssignments).toEqual([]);
  });

  test("integrity attestation: packageHash is deterministic across two builds of the identical scope (no unaccounted-for data changes)", async () => {
    const output1 = await dossier.buildDossier({ type: "intervention", interventionId });
    const output2 = await dossier.buildDossier({ type: "intervention", interventionId });

    expect(output1.sections.integrityAttestation.packageHash).toBe(output2.sections.integrityAttestation.packageHash);
    expect(output1.sections.integrityAttestation.packageHash).toMatch(/^[a-f0-9]{64}$/);
  });

  test("integrity attestation: audit-log chain hash reflects real persisted AuditLog rows (non-zero entry count, deterministic chain)", async () => {
    const output = await dossier.buildDossier({ type: "intervention", interventionId });
    const attestation = output.sections.integrityAttestation;

    expect(attestation.auditLogChainSegment.entryCount).toBeGreaterThan(0); // causal promotions + supersession disposition
    expect(attestation.auditLogChainSegment.chainHash).toMatch(/^[a-f0-9]{64}$/);
    expect(attestation.versionStamp.copyrightHolder).toBe("Conform-Edge Quality Consulting LLC");
  });

  test("learner scope: aggregates the same learner's evidence across their assignments", async () => {
    const output = await dossier.buildDossier({ type: "learner", learnerId });
    expect(output.title).toContain("Dossier Test Learner");
    expect(output.sections.learnerEvidence.data.learners).toHaveLength(1);
    expect(output.sections.learnerEvidence.data.learners[0].assignments).toHaveLength(1);
    expect(output.sections.learnerEvidence.data.learners[0].assignments[0].assignmentId).toBe(assignmentId);
  });

  test("unsupported scope types throw rather than silently returning an empty/wrong dossier", async () => {
    await expect(
      dossier.buildDossier({ type: "organization" as never, organizationId: "x" } as never)
    ).rejects.toThrow(/not implemented in this pass/);
  });
});
