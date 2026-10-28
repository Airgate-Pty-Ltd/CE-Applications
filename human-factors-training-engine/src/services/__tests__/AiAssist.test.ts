/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { AiAssist } from "../AiAssist";

describe("AiAssist (real DB, real service) — C-002 confidentiality block, C-003 dual paths", () => {
  let prisma: PrismaClient;
  const testTag = `aia-test-${Date.now()}`;
  let burranaEvidenceId: string;
  let internalEvidenceId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const burrana = await prisma.hfEvidence.create({
      data: {
        tenantId: "tenant_001",
        classification: "BURRANA_PRIVATE",
        source: "Confidential Burrana-only incident report text used for AI-block testing.",
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
        source: "Night shift technician missed an inspection step after a 12-hour shift.",
        sourceType: "ncr",
        title: `${testTag}-internal-evidence`,
        occurredAt: new Date(),
        createdBy: "system",
      },
    });
    internalEvidenceId = internal.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { action: { in: ["AI_ASSIST_REJECTED", "AI_ASSIST_ATOM_PROPOSAL"] } },
    });
    await prisma.hfEvidence.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.$disconnect();
  });

  test("C-002: BURRANA_PRIVATE evidence is BLOCKED from AI Assist — no provider call, audit-logged", async () => {
    // No LLM provider configured — this test asserts the block fires on classification
    // BEFORE any provider would even be consulted (canUseAi is false either way, but the
    // returned `reason` text must specifically name the confidentiality block, not a generic
    // "no provider" message, proving the classification gate fires first).
    const aiAssist = new AiAssist(prisma); // no provider — worst case, still must block correctly

    const result = await aiAssist.proposeAtomFromEvidence(
      "tenant_001",
      burranaEvidenceId,
      "fatigue",
      "Test objective"
    );

    expect(result.canUseAi).toBe(false);
    expect(result.reason).toMatch(/BURRANA_PRIVATE/);
    expect(result.reason).toMatch(/Manual authoring required/);
    expect(result.aiDraft).toBeUndefined();

    const rejectionLog = await prisma.auditLog.findFirst({
      where: { action: "AI_ASSIST_REJECTED", objectId: burranaEvidenceId },
    });
    expect(rejectionLog).not.toBeNull();
    expect(rejectionLog!.details).toMatch(/BURRANA_PRIVATE/);
  });

  test("C-002: isAiAvailable() reports false for BURRANA_PRIVATE regardless of provider state", async () => {
    const aiAssist = new AiAssist(prisma);
    expect(await aiAssist.isAiAvailable("BURRANA_PRIVATE")).toBe(false);
  });

  test("C-003: no-AI manual fallback path — INTERNAL evidence with NO provider configured still returns usable source spans, canUseAi=false, and does not throw", async () => {
    const aiAssist = new AiAssist(prisma); // no provider configured at all

    const result = await aiAssist.proposeAtomFromEvidence(
      "tenant_001",
      internalEvidenceId,
      "fatigue",
      "Recognize fatigue signs"
    );

    expect(result.canUseAi).toBe(false);
    expect(result.reason).toMatch(/No LLM provider configured/);
    expect(result.sourceSpans.length).toBeGreaterThan(0); // source spans still extracted for manual authoring
  });

  test("C-003: manual atom authoring path (bypassing AiAssist entirely) still produces an APPROVABLE atom", async () => {
    // The "manual" path per spec is simply: QM writes the atom directly, no AI involved at all.
    const atom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag}-manual-atom`,
        objective: "Manually authored, no AI involvement",
        format: "micro_lesson",
        status: "DRAFT",
        duration: 8,
        content: "Written entirely by a human reviewer, no LLM call made.",
      },
    });
    expect(atom.status).toBe("DRAFT");

    const approved = await prisma.learningAtom.update({
      where: { id: atom.id },
      data: { status: "APPROVED", approvedBy: "qm.reviewer@example.com", approvedAt: new Date() },
    });
    expect(approved.status).toBe("APPROVED");

    await prisma.learningAtom.deleteMany({ where: { id: atom.id } });
  });

  test("C-003: AI path with a provider configured returns a draft AND source spans, logged as a successful call", async () => {
    const stubProvider = {
      generateAtomText: async () => "AI-drafted micro-lesson text grounded in the source evidence.",
      allowsClassification: () => true,
    };
    const aiAssist = new AiAssist(prisma, stubProvider);

    const result = await aiAssist.proposeAtomFromEvidence(
      "tenant_001",
      internalEvidenceId,
      "fatigue",
      "Recognize fatigue signs"
    );

    expect(result.canUseAi).toBe(true);
    expect(result.aiDraft).toMatch(/AI-drafted/);
    expect(result.sourceSpans.length).toBeGreaterThan(0);

    const successLog = await prisma.auditLog.findFirst({
      where: { action: "AI_ASSIST_ATOM_PROPOSAL", objectId: internalEvidenceId },
    });
    expect(successLog).not.toBeNull();
    expect(successLog!.details).toMatch(/success/);
  });
});
