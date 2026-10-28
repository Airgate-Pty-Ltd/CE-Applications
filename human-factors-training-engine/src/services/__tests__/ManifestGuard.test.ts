/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { ManifestGuard } from "../ManifestGuard";

describe("ManifestGuard (real DB, real SQLite trigger) — C-013", () => {
  let prisma: PrismaClient;
  let guard: ManifestGuard;
  const testTag = `mg-test-${Date.now()}`;
  let manifestId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    guard = new ManifestGuard(prisma);

    const manifest = await prisma.trainingPackageManifest.create({
      data: {
        tenantId: 'tenant_001',
        packageId: `${testTag}-pkg`,
        curriculumRevision: "1.0",
        compilerVersion: "1.0.0",
        rulesetRevision: "1.0",
        baselineContent: JSON.stringify([{ atomId: "atom-1" }]),
        outputHash: `${testTag}-hash`,
        status: "ACTIVE",
        frozenAt: new Date(),
      },
    });
    manifestId = manifest.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { objectId: manifestId } });
    await prisma.trainingPackageManifest.deleteMany({ where: { id: manifestId } });
    await prisma.$disconnect();
  });

  test("C-013: an attempted UPDATE on a frozen (ACTIVE) manifest is rejected by the real DB trigger", async () => {
    await expect(
      guard.attemptMutation({
        manifestId,
        attemptedBy: "malicious.or.mistaken.actor@example.com",
        data: { curriculumRevision: "TAMPERED" },
      })
    ).rejects.toThrow();
  });

  test("C-013: the manifest content is provably UNCHANGED after the rejected attempt", async () => {
    const after = await prisma.trainingPackageManifest.findUnique({ where: { id: manifestId } });
    expect(after!.curriculumRevision).toBe("1.0"); // untouched
  });

  test("C-013: the rejected attempt is logged to AuditLog (surfaced for review per HFEFF-003)", async () => {
    const logs = await prisma.auditLog.findMany({
      where: { objectId: manifestId, action: "frozen_manifest_modification_attempted" },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);

    const details = JSON.parse(logs[0].details!);
    expect(details.attemptedBy).toBe("malicious.or.mistaken.actor@example.com");
    expect(details.blocked).toBe(true);
    expect(details.integrityFailure).toBeUndefined();
  });

  test("C-013 (WP-2 §3, was a documented gap — now closed): a manifest with status SUPERSEDED IS protected by the widened trigger", async () => {
    const superseded = await prisma.trainingPackageManifest.create({
      data: {
        tenantId: 'tenant_001',
        packageId: `${testTag}-superseded-pkg`,
        curriculumRevision: "old",
        compilerVersion: "1.0.0",
        rulesetRevision: "1.0",
        baselineContent: JSON.stringify([]),
        outputHash: `${testTag}-superseded-hash`,
        status: "SUPERSEDED",
      },
    });

    // Trigger condition widened 2026-08-06 to WHEN OLD.status IN ('ACTIVE', 'SUPERSEDED')
    // (prisma/manual-sql/frozen_manifest_trigger_v2_widen_superseded.sql, DECISIONS.md D-027).
    // Previously this exact case (a SUPERSEDED manifest) was a documented, un-fixed gap
    // (OPEN-QUESTIONS.md Q-003) — the update below used to succeed; it must now fail.
    await expect(
      prisma.trainingPackageManifest.update({
        where: { id: superseded.id },
        data: { curriculumRevision: "modified-superseded" },
      })
    ).rejects.toThrow();

    const after = await prisma.trainingPackageManifest.findUnique({ where: { id: superseded.id } });
    expect(after!.curriculumRevision).toBe("old"); // provably unchanged, same as the ACTIVE case above

    await prisma.trainingPackageManifest.deleteMany({ where: { id: superseded.id } });
  });

  test("driver error-text behavior, documented directly (not just referenced) and CONFIRMED to differ by provider (Phase 4 WP-1, DECISIONS.md D-016/D-041/D-043): SQLite's Prisma driver does not surface the trigger's error text; PostgreSQL's does", async () => {
    const probe = await prisma.trainingPackageManifest.create({
      data: {
        tenantId: 'tenant_001',
        packageId: `${testTag}-errortext-pkg`,
        curriculumRevision: "1.0",
        compilerVersion: "1.0.0",
        rulesetRevision: "1.0",
        baselineContent: JSON.stringify([]),
        outputHash: `${testTag}-errortext-hash`,
        status: "ACTIVE",
      },
    });

    let caught: unknown;
    try {
      await prisma.trainingPackageManifest.update({ where: { id: probe.id }, data: { curriculumRevision: "x" } });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    const message = caught instanceof Error ? caught.message : String(caught);
    // The block IS real on both providers (proven by the two tests above via re-fetch) — only
    // the specific error TEXT surfaced to the Prisma client differs, and that difference was
    // predicted in D-016 (writing SQLite's fix) and left unconfirmed until this session actually
    // ran this exact test against a live PostgreSQL instance (D-042/D-043).
    const isPostgres = (process.env.DATABASE_URL || "").startsWith("postgres");
    if (isPostgres) {
      // CONFIRMED (2026-08-06, Phase 4 WP-1, real Postgres 18.4 instance): the trigger
      // function's RAISE EXCEPTION message DOES surface through Prisma's error object here.
      expect(message).toContain("frozen_manifest_immutable_error");
    } else {
      // SQLite: Prisma's connector maps the trigger's RAISE(ABORT, msg) to a generic P2003
      // without surfacing the message text — documented limitation, not a functional gap
      // (the block itself is still real, proven above).
      expect(message).not.toContain("frozen_manifest_immutable_error");
      expect((caught as { code?: string })?.code).toBe("P2003");
    }

    await prisma.trainingPackageManifest.deleteMany({ where: { id: probe.id } });
  });
});
