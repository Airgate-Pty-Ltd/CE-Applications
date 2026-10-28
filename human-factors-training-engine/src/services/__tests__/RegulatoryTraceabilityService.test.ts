/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';
import { RegulatoryTraceabilityService } from '../RegulatoryTraceabilityService';

describe('RegulatoryTraceabilityService (real DB) — D-063 direct-link-primary clause<->atom<->status matrix', () => {
  let prisma: PrismaClient;
  let service: RegulatoryTraceabilityService;
  const testTag = `reg-trace-test-${Date.now()}`;
  const framework = `${testTag}-framework`;

  let packId: string;
  let sharedTopicId: string;
  let coveredClauseId: string;
  let approvalGapClauseId: string;
  let falseTopicMatchClauseId: string;
  let directOverrideClauseId: string;
  let atomDraftId: string;
  let atomApprovedId: string;
  let atomDirectId: string;
  let atomTopicOnlyId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    service = new RegulatoryTraceabilityService(prisma);

    const pack = await prisma.policyPack.create({
      data: { name: `${testTag}-pack`, regulatoryFramework: framework, recurrenceMonths: 24 },
    });
    packId = pack.id;

    // One broad spine topic shared by two very different clauses - reproduces the exact D-063
    // scenario (topic-sharing must NOT by itself imply coverage).
    const sharedTopic = await prisma.requirementSpineTopic.create({
      data: { code: `${testTag}-SP-SHARED`, title: 'Shared Broad Topic', intent: 'test', spineRevision: 1 },
    });
    sharedTopicId = sharedTopic.id;

    const approvalGapClause = await prisma.policyPackClause.create({
      data: { packId, clauseNumber: '1.1', clauseTitle: 'Directly Linked, Draft Only', section: '1', sectionLabel: 'Section 1' },
    });
    approvalGapClauseId = approvalGapClause.id;
    await prisma.clauseTopicMap.create({
      data: { clauseId: approvalGapClauseId, topicId: sharedTopicId, coverage: 'PARTIAL', mappedBy: 'test' },
    });

    const coveredClause = await prisma.policyPackClause.create({
      data: { packId, clauseNumber: '1.2', clauseTitle: 'Directly Linked, Approved', section: '1', sectionLabel: 'Section 1' },
    });
    coveredClauseId = coveredClause.id;
    await prisma.clauseTopicMap.create({
      data: { clauseId: coveredClauseId, topicId: sharedTopicId, coverage: 'FULL', mappedBy: 'test' },
    });

    // Shares the same broad topic as the two clauses above, but has NO direct mappedAtomIds
    // link of its own - must remain a real coverage gap despite the topic overlap.
    const falseTopicMatchClause = await prisma.policyPackClause.create({
      data: { packId, clauseNumber: '1.3', clauseTitle: 'Same Topic, No Real Content', section: '1', sectionLabel: 'Section 1' },
    });
    falseTopicMatchClauseId = falseTopicMatchClause.id;
    await prisma.clauseTopicMap.create({
      data: { clauseId: falseTopicMatchClauseId, topicId: sharedTopicId, coverage: 'PARTIAL', mappedBy: 'test' },
    });

    const directOverrideClause = await prisma.policyPackClause.create({
      data: { packId, clauseNumber: '2.1', clauseTitle: 'DELTA — direct override only', section: '2', sectionLabel: 'Section 2' },
    });
    directOverrideClauseId = directOverrideClause.id;
    await prisma.clauseTopicMap.create({
      data: { clauseId: directOverrideClauseId, topicId: null, coverage: 'DELTA', deltaNote: 'no spine equivalent', mappedBy: 'test' },
    });

    const draftAtom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001', title: `${testTag}-draft-atom`, objective: 'x', format: 'micro_lesson', status: 'DRAFT', origin: 'regulatory-baseline', contentSource: 'E:/fake/lesson.docx' },
    });
    atomDraftId = draftAtom.id;
    await prisma.atomTopicMap.create({ data: { atomId: atomDraftId, topicId: sharedTopicId, mappedBy: 'test' } });
    await prisma.policyPackClause.update({ where: { id: approvalGapClauseId }, data: { mappedAtomIds: JSON.stringify([atomDraftId]) } });

    const approvedAtom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001', title: `${testTag}-approved-atom`, objective: 'x', format: 'micro_lesson', status: 'APPROVED', approvedBy: 'system', approvedAt: new Date(), origin: 'regulatory-baseline', contentSource: 'E:/fake/other-lesson.docx' },
    });
    atomApprovedId = approvedAtom.id;
    await prisma.atomTopicMap.create({ data: { atomId: atomApprovedId, topicId: sharedTopicId, mappedBy: 'test' } });
    await prisma.policyPackClause.update({ where: { id: coveredClauseId }, data: { mappedAtomIds: JSON.stringify([atomApprovedId]) } });

    // Linked to the shared topic via AtomTopicMap ONLY - never added to any clause's
    // mappedAtomIds. This is the atom that must show up in falseTopicMatchClause's
    // topicRelatedAtoms but NOT in its atoms/coverage.
    const topicOnlyAtom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001', title: `${testTag}-topic-only-atom`, objective: 'x', format: 'micro_lesson', status: 'APPROVED', approvedBy: 'system', approvedAt: new Date(), origin: 'regulatory-baseline' },
    });
    atomTopicOnlyId = topicOnlyAtom.id;
    await prisma.atomTopicMap.create({ data: { atomId: atomTopicOnlyId, topicId: sharedTopicId, mappedBy: 'test' } });

    const directAtom = await prisma.learningAtom.create({
      data: {
        tenantId: 'tenant_001', title: `${testTag}-direct-atom`, objective: 'x', format: 'micro_lesson', status: 'APPROVED', approvedBy: 'system', approvedAt: new Date(), origin: 'regulatory-baseline' },
    });
    atomDirectId = directAtom.id;
    await prisma.policyPackClause.update({
      where: { id: directOverrideClauseId },
      data: { mappedAtomIds: JSON.stringify([atomDirectId]) },
    });
  });

  afterAll(async () => {
    const atomIds = [atomDraftId, atomApprovedId, atomDirectId, atomTopicOnlyId];
    await prisma.atomTopicMap.deleteMany({ where: { atomId: { in: atomIds } } });
    await prisma.learningAtom.deleteMany({ where: { id: { in: atomIds } } });
    await prisma.clauseTopicMap.deleteMany({ where: { clauseId: { in: [approvalGapClauseId, coveredClauseId, falseTopicMatchClauseId, directOverrideClauseId] } } });
    await prisma.policyPackClause.deleteMany({ where: { packId } });
    await prisma.policyPack.deleteMany({ where: { id: packId } });
    await prisma.requirementSpineTopic.deleteMany({ where: { id: sharedTopicId } });
    await prisma.$disconnect();
  });

  test('D-063: sharing a broad spine topic with a covered clause does NOT by itself make an unrelated clause covered', async () => {
    const matrix = await service.buildMatrix(framework);
    const row = matrix.rows.find((r) => r.clauseId === falseTopicMatchClauseId);
    expect(row).toBeDefined();
    expect(row!.atoms).toEqual([]);
    expect(row!.coverageGap).toBe(true);
    expect(row!.approvalGap).toBe(false);
    // The topic-only atom (and the other two clauses' atoms, all sharing this topic) show up
    // as informational context, not coverage.
    const topicRelatedIds = row!.topicRelatedAtoms.map((a) => a.atomId).sort();
    expect(topicRelatedIds).toEqual([atomApprovedId, atomDraftId, atomTopicOnlyId].sort());
  });

  test('a clause with a directly-linked DRAFT atom is covered but not approved', async () => {
    const matrix = await service.buildMatrix(framework);
    const row = matrix.rows.find((r) => r.clauseId === approvalGapClauseId);
    expect(row).toBeDefined();
    expect(row!.atoms).toHaveLength(1);
    expect(row!.atoms[0].atomId).toBe(atomDraftId);
    expect(row!.atoms[0].status).toBe('DRAFT');
    expect(row!.coverageGap).toBe(false);
    expect(row!.approvalGap).toBe(true);
  });

  test('a clause with a directly-linked APPROVED atom is fully covered, no gaps', async () => {
    const matrix = await service.buildMatrix(framework);
    const row = matrix.rows.find((r) => r.clauseId === coveredClauseId);
    expect(row).toBeDefined();
    expect(row!.atoms).toHaveLength(1);
    expect(row!.atoms[0].atomId).toBe(atomApprovedId);
    expect(row!.atoms[0].status).toBe('APPROVED');
    expect(row!.approvedAtomCount).toBe(1);
    expect(row!.coverageGap).toBe(false);
    expect(row!.approvalGap).toBe(false);
  });

  test('a whole-clause DELTA row (topicId null) is covered via the direct mappedAtomIds override', async () => {
    const matrix = await service.buildMatrix(framework);
    const row = matrix.rows.find((r) => r.clauseId === directOverrideClauseId);
    expect(row).toBeDefined();
    expect(row!.topics[0].coverage).toBe('DELTA');
    expect(row!.topics[0].code).toBe('(none — whole-clause delta)');
    expect(row!.atoms).toHaveLength(1);
    expect(row!.atoms[0].atomId).toBe(atomDirectId);
    expect(row!.coverageGap).toBe(false);
  });

  test('summary counts roll up correctly across all four clauses', async () => {
    const matrix = await service.buildMatrix(framework);
    expect(matrix.totalClauses).toBe(4);
    expect(matrix.coveredClauses).toBe(3); // approvalGap + covered + directOverride
    expect(matrix.approvedClauses).toBe(2); // covered + directOverride
    expect(matrix.coverageGapCount).toBe(1); // falseTopicMatch only
    expect(matrix.approvalGapCount).toBe(1); // approvalGap only
  });

  test('rows are ordered by section then clause number', async () => {
    const matrix = await service.buildMatrix(framework);
    expect(matrix.rows.map((r) => r.itemNumber)).toEqual(['1.1', '1.2', '1.3', '2.1']);
  });
});
