/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { EvidenceIngestion, QUARANTINE_STATES } from "../EvidenceIngestion";
import crypto from "crypto";

describe("EvidenceIngestion (real DB, real service) — C-001, C-002 support", () => {
  let prisma: PrismaClient;
  let ingestion: EvidenceIngestion;
  const testTag = `ei-test-${Date.now()}`;

  beforeAll(() => {
    prisma = new PrismaClient();
    ingestion = new EvidenceIngestion(prisma);
  });

  afterAll(async () => {
    await prisma.evidenceClassification.deleteMany({
      where: { evidence: { title: { contains: testTag } } },
    });
    await prisma.hfEvidence.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.$disconnect();
  });

  test("C-001: full ingestion transitions through NEW -> INTEGRITY_VERIFIED -> EXTRACTED -> CLASSIFICATION_CONFIRMED -> ACCEPTED, hash stored", async () => {
    const content = `NCR-${testTag}: Fatigue-related error during night shift maintenance.`;

    const result = await ingestion.ingest({
      tenantId: "tenant_001",
      title: `${testTag}-ncr`,
      source: `NCR-${testTag}`,
      sourceType: "ncr",
      content,
      classification: "INTERNAL",
      occurredAt: new Date("2026-07-15"),
      createdBy: "qm.tester@example.com",
    });

    // Every state in the spec's sequence was visited, in order
    expect(result.transitions.map((t) => t.state)).toEqual([...QUARANTINE_STATES]);

    // Hash matches an independently computed SHA-256 of the same content
    const expectedHash = crypto.createHash("sha256").update(content).digest("hex");
    expect(result.documentHash).toBe(expectedHash);

    // Final persisted state is ACCEPTED
    const persisted = await prisma.hfEvidence.findUnique({ where: { id: result.evidence.id } });
    expect(persisted!.quarantineStatus).toBe("ACCEPTED");
    expect(persisted!.documentHash).toBe(expectedHash);

    // A classification record exists (C-001 checkpoint: classification confirmed & stored)
    const classification = await prisma.evidenceClassification.findUnique({
      where: { tenantId_evidenceId: { tenantId: "tenant_001", evidenceId: result.evidence.id } },
    });
    expect(classification).not.toBeNull();
    expect(classification!.classification).toBe("INTERNAL");
  });

  test("C-001: dummy malware scan rejects EICAR-marked content and halts ingestion before hashing", async () => {
    const dirtyContent =
      "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

    await expect(
      ingestion.ingest({
        tenantId: "tenant_001",
        title: `${testTag}-dirty`,
        source: `NCR-${testTag}-dirty`,
        sourceType: "ncr",
        content: dirtyContent,
        classification: "INTERNAL",
        occurredAt: new Date(),
        createdBy: "qm.tester@example.com",
      })
    ).rejects.toThrow(/Dummy scanner matched EICAR/);

    const rejected = await prisma.hfEvidence.findFirst({
      where: { title: `${testTag}-dirty` },
    });
    expect(rejected!.quarantineStatus).toBe("REJECTED_MALWARE");
    expect(rejected!.documentHash).toBeNull(); // never reached the hashing stage
  });

  test("HFSRC-003 support: a second ingestion of byte-identical content is flagged as duplicateOfSourceId", async () => {
    const content = `Duplicate-content test ${testTag}`;

    const first = await ingestion.ingest({
      tenantId: "tenant_001",
      title: `${testTag}-dup-1`,
      source: `NCR-${testTag}-dup-1`,
      sourceType: "ncr",
      content,
      classification: "INTERNAL",
      occurredAt: new Date(),
      createdBy: "qm.tester@example.com",
    });

    const second = await ingestion.ingest({
      tenantId: "tenant_001",
      title: `${testTag}-dup-2`,
      source: `NCR-${testTag}-dup-2`,
      sourceType: "ncr",
      content, // identical bytes
      classification: "INTERNAL",
      occurredAt: new Date(),
      createdBy: "qm.tester@example.com",
    });

    expect(second.duplicateOfSourceId).toBe(first.evidence.id);
    expect(first.duplicateOfSourceId).toBeNull();
  });

  test("C-002 support: HfEvidence.classification is persisted exactly as supplied (BURRANA_PRIVATE ingestible, gating happens downstream in AiAssist)", async () => {
    const result = await ingestion.ingest({
      tenantId: "tenant_001",
      title: `${testTag}-burrana`,
      source: `NCR-${testTag}-burrana`,
      sourceType: "ncr",
      content: "Restricted content for confidentiality gate testing.",
      classification: "BURRANA_PRIVATE",
      occurredAt: new Date(),
      createdBy: "qm.tester@example.com",
    });

    expect(result.evidence.classification).toBe("BURRANA_PRIVATE");
    expect(result.evidence.quarantineStatus).toBe("ACCEPTED");
  });
});
