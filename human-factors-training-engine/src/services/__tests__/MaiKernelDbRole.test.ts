/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';

/**
 * Phase 4 WP-2: proves the least-privilege `mai_kernel` PostgreSQL role
 * (prisma/postgresql/manual-sql/mai_kernel_role.sql) per MAI-ARCH-001 §6
 * (docs/01-directives/HF-ENGINE-BUILD-PROMPT-v3.md §5.1 item 12): "kernel connects under
 * least-privilege role (SELECT host tables, INSERT mai_*, no UPDATE on host tables)."
 *
 * PostgreSQL-only: roles are a real, connection-level security principal only on Postgres —
 * SQLite has no equivalent (any process with file access has full read/write), so this suite
 * skips itself when DATABASE_URL isn't a postgres:// URL, rather than failing or faking a
 * result. This mirrors the same provider-detection pattern used in ManifestGuard.test.ts.
 */

const isPostgres = (process.env.DATABASE_URL || '').startsWith('postgres') && !!process.env.MAI_KERNEL_PASSWORD;
const describeIfPostgres = isPostgres ? describe : describe.skip;

describeIfPostgres('mai_kernel PostgreSQL role — Phase 4 WP-2 least-privilege grant model (MAI-ARCH-001 §6)', () => {
  let hostPrisma: PrismaClient; // regular app connection, for setup/verification
  let kernelPrisma: PrismaClient; // connects AS the mai_kernel role — this is what's under test

  const kernelUrl = (process.env.DATABASE_URL || '').replace(/postgresql:\/\/[^@]*@/, `postgresql://mai_kernel:${encodeURIComponent(process.env.MAI_KERNEL_PASSWORD!)}@`);

  beforeAll(() => {
    hostPrisma = new PrismaClient();
    kernelPrisma = new PrismaClient({ datasources: { db: { url: kernelUrl } } });
  });

  afterAll(async () => {
    await hostPrisma.$disconnect();
    await kernelPrisma.$disconnect();
  });

  test('mai_kernel CAN connect and SELECT from a host table (hf_event)', async () => {
    await expect(kernelPrisma.hfEvent.findMany({ take: 1 })).resolves.toBeDefined();
  });

  test('mai_kernel CANNOT UPDATE a host table — the exit-gate requirement, proven by a real denied write', async () => {
    // A real row must exist for UPDATE to even attempt to touch something (an UPDATE matching
    // zero rows can succeed trivially without exercising the permission check on some engines).
    const evidence = await hostPrisma.hfEvidence.create({
      data: { tenantId: 'tenant_001', classification: 'INTERNAL', source: 'mai-kernel-role-test', sourceType: 'ncr', title: 'role-test-evidence', occurredAt: new Date(), createdBy: 'system' },
    });
    const event = await hostPrisma.hfEvent.create({
      data: { tenantId: 'tenant_001', evidenceId: evidence.id, title: 'role-test-event', occurredAt: new Date() },
    });

    await expect(kernelPrisma.hfEvent.update({ where: { id: event.id }, data: { title: 'hacked-by-kernel' } })).rejects.toThrow(/permission denied/i);

    // Provably unchanged, same pattern used for the frozen-manifest immutability tests.
    const after = await hostPrisma.hfEvent.findUnique({ where: { id: event.id } });
    expect(after!.title).toBe('role-test-event');

    await hostPrisma.hfEvent.deleteMany({ where: { id: event.id } });
    await hostPrisma.hfEvidence.deleteMany({ where: { id: evidence.id } });
  });

  test('mai_kernel CAN INSERT into a mai_* table (mai_approval)', async () => {
    const created = await kernelPrisma.maiApproval.create({
      data: { tenantId: 'tenant_001', approvalType: 'ROLE_TEST_PROBE', subjectId: 'role-test-subject', subjectType: 'RoleTestType' },
    });
    expect(created.id).toBeDefined();

    // Verified under the host principal, not the kernel connection — proves the row is real,
    // not just an artifact of the kernel connection's own (possibly-broken) read path.
    const found = await hostPrisma.maiApproval.findUnique({ where: { id: created.id } });
    expect(found?.approvalType).toBe('ROLE_TEST_PROBE');

    await hostPrisma.maiApproval.deleteMany({ where: { id: created.id } });
  });

  test('mai_kernel CANNOT UPDATE a mai_* table either — the kernel never mutates its own history, only appends', async () => {
    const created = await hostPrisma.maiApproval.create({
      data: { tenantId: 'tenant_001', approvalType: 'ROLE_TEST_PROBE_2', subjectId: 'role-test-subject-2', subjectType: 'RoleTestType' },
    });

    await expect(kernelPrisma.maiApproval.update({ where: { id: created.id }, data: { approvalType: 'TAMPERED' } })).rejects.toThrow(/permission denied/i);

    const after = await hostPrisma.maiApproval.findUnique({ where: { id: created.id } });
    expect(after!.approvalType).toBe('ROLE_TEST_PROBE_2');

    await hostPrisma.maiApproval.deleteMany({ where: { id: created.id } });
  });

  test('mai_kernel CANNOT DELETE from a host table', async () => {
    const evidence = await hostPrisma.hfEvidence.create({
      data: { tenantId: 'tenant_001', classification: 'INTERNAL', source: 'mai-kernel-role-test-2', sourceType: 'ncr', title: 'role-test-evidence-2', occurredAt: new Date(), createdBy: 'system' },
    });

    await expect(kernelPrisma.hfEvidence.delete({ where: { id: evidence.id } })).rejects.toThrow(/permission denied/i);

    const stillThere = await hostPrisma.hfEvidence.findUnique({ where: { id: evidence.id } });
    expect(stillThere).not.toBeNull();

    await hostPrisma.hfEvidence.deleteMany({ where: { id: evidence.id } });
  });
});

describe('mai_kernel role test suite self-check', () => {
  test('documents whether the above suite actually ran or was skipped, so a green run can never silently mean "never executed"', () => {
    if (!isPostgres) {
      console.warn('mai_kernel role tests SKIPPED — a PostgreSQL DATABASE_URL and MAI_KERNEL_PASSWORD are both required. This must NOT be mistaken for the grant model having been verified.');
    }
    expect(true).toBe(true);
  });
});
