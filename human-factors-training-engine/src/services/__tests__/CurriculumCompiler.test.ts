/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { CurriculumCompiler } from "../CurriculumCompiler";

describe("CurriculumCompiler (real DB, real service)", () => {
  let prisma: PrismaClient;
  let compiler: CurriculumCompiler;
  const testTag = `cc-test-${Date.now()}`;

  beforeAll(() => {
    prisma = new PrismaClient();
    compiler = new CurriculumCompiler(prisma);
  });

  afterAll(async () => {
    await prisma.learningAtom.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.$disconnect();
  });

  test("compile() rejects atoms that are not APPROVED (C-005 enforcement point)", async () => {
    const draftAtom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag}-draft`,
        objective: "test",
        format: "micro_lesson",
        status: "DRAFT",
        duration: 5,
      },
    });

    await expect(
      compiler.compile({
        tenantId: "tenant_001",
        approvedAtoms: [draftAtom],
        learnerAttributes: {
          learnerId: "learner-x",
          role: "maintenance_technician",
          site: "Brisbane",
          first_time: true,
        },
        curriculumRevision: `${testTag}-rev`,
      })
    ).rejects.toThrow(/not APPROVED/);
  });

  test("compile() produces a manifest from APPROVED atoms with correct baseline ordering", async () => {
    const atom1 = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag}-atom-1`,
        objective: "first",
        format: "micro_lesson",
        status: "APPROVED",
        duration: 8,
      },
    });
    const atom2 = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag}-atom-2`,
        objective: "second",
        format: "case_study",
        status: "APPROVED",
        duration: 15,
      },
    });

    const { manifest, output_hash } = await compiler.compile({
      tenantId: "tenant_001",
      approvedAtoms: [atom1, atom2],
      learnerAttributes: {
        learnerId: "learner-x",
        role: "maintenance_technician",
        site: "Brisbane",
        first_time: true,
      },
      curriculumRevision: `${testTag}-rev-ok`,
    });

    expect(manifest.baseline_content).toHaveLength(2);
    expect(manifest.baseline_content[0].atomId).toBe(atom1.id);
    expect(manifest.baseline_content[1].atomId).toBe(atom2.id);
    expect(manifest.manifest_id).toBe(output_hash);
    expect(manifest.status).toBe("ACTIVE");
    expect(output_hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
  });

  test("C-008: identical inputs produce identical output_hash across two independent compile() calls", async () => {
    const atom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag}-determinism-atom`,
        objective: "determinism check",
        format: "micro_lesson",
        status: "APPROVED",
        duration: 10,
      },
    });

    const input = {
      tenantId: "tenant_001",
      approvedAtoms: [atom],
      learnerAttributes: {
        learnerId: "learner-determinism",
        role: "maintenance_technician",
        site: "Brisbane",
        first_time: true,
      },
      curriculumRevision: `${testTag}-determinism-rev`,
    };

    const first = await compiler.compile(input);
    const second = await compiler.compile(input);

    expect(first.output_hash).toBe(second.output_hash);
    expect(first.manifest.compiled_at).toBe(second.manifest.compiled_at);
  });

  test("verifyReproducibility() returns true for identical input", async () => {
    const atom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag}-repro-atom`,
        objective: "repro check",
        format: "card",
        status: "APPROVED",
        duration: 2,
      },
    });

    const isReproducible = await compiler.verifyReproducibility({
      tenantId: "tenant_001",
      approvedAtoms: [atom],
      learnerAttributes: {
        learnerId: "learner-repro",
        role: "inspector",
        site: "Irvine",
        first_time: true,
      },
      curriculumRevision: `${testTag}-repro-rev`,
    });

    expect(isReproducible).toBe(true);
  });

  test("different learnerAttributes produce a different output_hash (hash is sensitive to real input)", async () => {
    const atom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001',
        title: `${testTag}-sensitivity-atom`,
        objective: "sensitivity check",
        format: "card",
        status: "APPROVED",
        duration: 2,
      },
    });

    const base = {
      tenantId: "tenant_001",
      approvedAtoms: [atom],
      curriculumRevision: `${testTag}-sensitivity-rev`,
    };

    const a = await compiler.compile({
      ...base,
      learnerAttributes: {
        learnerId: "learner-A",
        role: "maintenance_technician",
        site: "Brisbane",
        first_time: true,
      },
    });
    const b = await compiler.compile({
      ...base,
      learnerAttributes: {
        learnerId: "learner-B",
        role: "maintenance_technician",
        site: "Brisbane",
        first_time: true,
      },
    });

    expect(a.output_hash).not.toBe(b.output_hash);
  });
});
