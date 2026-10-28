/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';
import { DriftWatchService, DEFAULT_RISING_THRESHOLD } from '../DriftWatchService';

describe('DriftWatchService (real DB) — WP-4.2 advisory analytics, no kernel authority (Q-007)', () => {
  let prisma: PrismaClient;
  let service: DriftWatchService;
  const testTag = `drift-test-${Date.now()}`;
  const tenantId = 'tenant_001';

  const uncoveredTheme = `${testTag}-uncovered-theme`;
  const coveredTheme = `${testTag}-covered-theme`;
  const rareTheme = `${testTag}-rare-theme`;

  const allEventIds: string[] = [];
  const allEvidenceIds: string[] = [];
  let interventionId: string;
  let atomId: string;

  async function makeEvidenceAndEvent(theme: string, suffix: string) {
    const evidence = await prisma.hfEvidence.create({
      data: { tenantId, classification: 'INTERNAL', source: `${testTag}-${suffix}`, sourceType: 'ncr', title: `${testTag}-${suffix}`, occurredAt: new Date(), createdBy: 'system' },
    });
    allEvidenceIds.push(evidence.id);
    const event = await prisma.hfEvent.create({
      data: { tenantId, evidenceId: evidence.id, title: `${testTag}-${suffix}-event`, occurredAt: new Date(), themes: JSON.stringify([theme]) },
    });
    allEventIds.push(event.id);
    return event.id;
  }

  beforeAll(async () => {
    prisma = new PrismaClient();
    service = new DriftWatchService(prisma);

    // Uncovered theme: 2 recent events, no intervention/atom addresses it -> RISING_UNCOVERED.
    await makeEvidenceAndEvent(uncoveredTheme, 'unc-1');
    await makeEvidenceAndEvent(uncoveredTheme, 'unc-2');

    // Rare theme: only 1 event -> BELOW_THRESHOLD (default threshold is 2).
    await makeEvidenceAndEvent(rareTheme, 'rare-1');

    // Covered theme: 2 events, one of which has a real ADDRESSES edge to an
    // intervention with an APPROVED atom -> COVERED.
    const coveredEvent1 = await makeEvidenceAndEvent(coveredTheme, 'cov-1');
    await makeEvidenceAndEvent(coveredTheme, 'cov-2');

    const atom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001', title: `${testTag}-covering-atom`, objective: 'x', format: 'micro_lesson', status: 'APPROVED', duration: 5 },
    });
    atomId = atom.id;

    const intervention = await prisma.learningIntervention.create({
      data: {
        tenantId: 'tenant_001', eventId: coveredEvent1, title: `${testTag}-intervention`, atomIds: JSON.stringify([atomId]), designedBy: 'system' },
    });
    interventionId = intervention.id;

    await prisma.evidenceRelationship.create({
      data: {
        tenantId,
        fromEntityType: 'HfEvent',
        fromEntityId: coveredEvent1,
        toEntityType: 'LearningIntervention',
        toEntityId: intervention.id,
        relationshipType: 'ADDRESSES',
        createdBy: 'system',
      },
    });
  });

  afterAll(async () => {
    await prisma.evidenceRelationship.deleteMany({ where: { fromEntityId: { in: allEventIds } } });
    await prisma.learningIntervention.deleteMany({ where: { id: interventionId } });
    await prisma.learningAtom.deleteMany({ where: { id: atomId } });
    await prisma.hfEvent.deleteMany({ where: { id: { in: allEventIds } } });
    await prisma.hfEvidence.deleteMany({ where: { id: { in: allEvidenceIds } } });
    await prisma.$disconnect();
  });

  test('rising theme with zero training coverage is flagged RISING_UNCOVERED', async () => {
    const drift = await service.computeDrift();
    const found = drift.find((d) => d.theme === uncoveredTheme);
    expect(found).toBeDefined();
    expect(found!.occurrenceCount).toBe(2);
    expect(found!.coveringAtomIds).toEqual([]);
    expect(found!.status).toBe('RISING_UNCOVERED');
  });

  test('a theme below the occurrence threshold is BELOW_THRESHOLD, not falsely flagged as uncovered', async () => {
    const drift = await service.computeDrift();
    const found = drift.find((d) => d.theme === rareTheme);
    expect(found).toBeDefined();
    expect(found!.occurrenceCount).toBe(1);
    expect(found!.occurrenceCount).toBeLessThan(DEFAULT_RISING_THRESHOLD);
    expect(found!.status).toBe('BELOW_THRESHOLD');
  });

  test('a theme with a real traced APPROVED atom is COVERED, using the real ADDRESSES-edge graph', async () => {
    const drift = await service.computeDrift();
    const found = drift.find((d) => d.theme === coveredTheme);
    expect(found).toBeDefined();
    expect(found!.occurrenceCount).toBe(2);
    expect(found!.coveringAtomIds).toContain(atomId);
    expect(found!.status).toBe('COVERED');
  });

  test('results are sorted by occurrence count, descending', async () => {
    const drift = await service.computeDrift();
    const relevant = drift.filter((d) => [uncoveredTheme, coveredTheme, rareTheme].includes(d.theme));
    for (let i = 1; i < relevant.length; i++) {
      expect(relevant[i - 1].occurrenceCount).toBeGreaterThanOrEqual(relevant[i].occurrenceCount);
    }
  });
});
