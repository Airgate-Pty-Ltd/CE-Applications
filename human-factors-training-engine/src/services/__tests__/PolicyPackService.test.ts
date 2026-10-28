/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';
import { PolicyPackService } from '../PolicyPackService';

describe('PolicyPackService (real DB) — WP-4.5 empty-shell structure, owner-supplied content', () => {
  let prisma: PrismaClient;
  let service: PolicyPackService;
  const testTag = `policypack-test-${Date.now()}`;

  let packId: string;
  let clauseId: string;
  let atomId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    service = new PolicyPackService(prisma, 'tenant_001');

    const atom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001', title: `${testTag}-atom`, objective: 'x', format: 'micro_lesson', status: 'APPROVED', duration: 10 },
    });
    atomId = atom.id;
  });

  afterAll(async () => {
    await prisma.policyPackClause.deleteMany({ where: { packId } });
    await prisma.policyPack.deleteMany({ where: { name: { contains: testTag } } });
    await prisma.learningAtom.deleteMany({ where: { title: { contains: testTag } } });
    await prisma.$disconnect();
  });

  test('createEmptyPack() persists a real pack shell with empty topic/audience/assessment arrays and no clauses', async () => {
    const pack = await service.createEmptyPack({ name: `${testTag}-pack`, regulatoryFramework: 'AS9100D' });
    packId = pack.id;

    const fetched = await service.getPack(packId);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe(`${testTag}-pack`);
    expect(fetched!.regulatoryFramework).toBe('AS9100D');
    expect(fetched!.mandatoryTopics).toEqual([]);
    expect(fetched!.mandatoryAudiences).toEqual([]);
    expect(fetched!.mandatoryAssessments).toEqual([]);
    expect(fetched!.clauses).toEqual([]);
  });

  test('addClausePlaceholder() with no clauseText/clauseTitle creates a real clause with those fields blank, never fabricated', async () => {
    const clause = await service.addClausePlaceholder({ packId, clauseNumber: '8.5.1' });
    clauseId = clause.id;

    expect(clause.clauseNumber).toBe('8.5.1');
    expect(clause.clauseTitle).toBeNull();
    expect(clause.clauseText).toBeNull();

    const fetched = await service.getPack(packId);
    expect(fetched!.clauses).toHaveLength(1);
    expect(fetched!.clauses[0].mappedAtomIds).toEqual([]);
  });

  test('mapClauseToAtoms() is an explicit QM action — mapping only exists after this call, never before', async () => {
    let fetched = await service.getPack(packId);
    expect(fetched!.clauses[0].mappedAtomIds).toEqual([]);

    await service.mapClauseToAtoms(clauseId, [atomId]);

    fetched = await service.getPack(packId);
    expect(fetched!.clauses[0].mappedAtomIds).toEqual([atomId]);
  });

  test('listPacks() returns real persisted packs with parsed array fields', async () => {
    const packs = await service.listPacks();
    const found = packs.find((p) => p.id === packId);
    expect(found).toBeDefined();
    expect(Array.isArray(found!.mandatoryTopics)).toBe(true);
    expect(Array.isArray(found!.clauses)).toBe(true);
  });
});
