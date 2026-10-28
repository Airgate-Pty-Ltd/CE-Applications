/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';
import { toDbArray, fromDbArray } from '@/lib/json';

/**
 * Policy Pack structure: Phase 3 WP-4 product-core increment.
 *
 * The PolicyPack/PolicyPackClause schema already existed (referenced read-only by
 * DefenseDossier's requirement-mapping section — see OPEN-QUESTIONS.md Q-002) but
 * nothing could create one. This service ships packs and clauses as EMPTY SHELLS:
 * a QM names the pack and its regulatory framework, but clause text, topic lists,
 * and atom-to-clause mappings are owner-supplied — never invented, never
 * pre-filled with plausible-sounding defaults. A pack with zero clauses and empty
 * mandatory-topic arrays is the correct, honest starting state.
 */

export interface EmptyPackInput {
  name: string;
  regulatoryFramework: string;
  regulatoryReference?: string;
  effectiveDate?: Date;
  expiryDate?: Date;
  recurrenceMonths?: number;
}

export interface ClausePlaceholderInput {
  packId: string;
  clauseNumber: string;
  clauseTitle?: string;
  clauseText?: string;
}

export class PolicyPackService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient, private tenantId: string) {
    if (!tenantId) throw new Error('PolicyPackService requires a tenantId.');
    this.prisma = prisma;
  }

  /** Create a pack shell — no clauses, no mandatory-topic content. Owner fills these in later. */
  async createEmptyPack(input: EmptyPackInput) {
    return this.prisma.policyPack.create({
      data: {
        ownerTenantId: this.tenantId,
        name: input.name,
        regulatoryFramework: input.regulatoryFramework,
        regulatoryReference: input.regulatoryReference,
        effectiveDate: input.effectiveDate ?? new Date(),
        expiryDate: input.expiryDate,
        recurrenceMonths: input.recurrenceMonths,
        mandatoryTopics: toDbArray([]),
        mandatoryAudiences: toDbArray([]),
        mandatoryAssessments: toDbArray([]),
      },
    });
  }

  /** Add a clause placeholder. clauseTitle/clauseText left blank if not supplied — never fabricated. */
  async addClausePlaceholder(input: ClausePlaceholderInput) {
    const pack = await this.prisma.policyPack.findFirst({
      where: { id: input.packId, ownerTenantId: this.tenantId },
      select: { id: true },
    });
    if (!pack) throw new Error('Tenant-owned policy pack not found. Global packs are read-only.');
    return this.prisma.policyPackClause.create({
      data: {
        packId: input.packId,
        clauseNumber: input.clauseNumber,
        clauseTitle: input.clauseTitle,
        clauseText: input.clauseText,
        mappedAtomIds: toDbArray([]),
      },
    });
  }

  /** Explicit QM-driven mapping of a clause to specific approved atoms — never inferred. */
  async mapClauseToAtoms(clauseId: string, atomIds: string[]) {
    const clause = await this.prisma.policyPackClause.findFirst({
      where: { id: clauseId, pack: { ownerTenantId: this.tenantId } },
      select: { id: true },
    });
    if (!clause) throw new Error('Tenant-owned policy pack clause not found. Global packs are read-only.');
    const approvedAtomCount = await this.prisma.learningAtom.count({
      where: { id: { in: atomIds }, tenantId: this.tenantId, status: 'APPROVED' },
    });
    if (approvedAtomCount !== new Set(atomIds).size) {
      throw new Error('Every mapped atom must be approved and owned by the active tenant.');
    }
    return this.prisma.policyPackClause.update({
      where: { id: clauseId },
      data: { mappedAtomIds: toDbArray(atomIds) },
    });
  }

  async listPacks() {
    const packs = await this.prisma.policyPack.findMany({
      where: { OR: [{ ownerTenantId: null }, { ownerTenantId: this.tenantId }] },
      include: { clauses: true },
      orderBy: { createdAt: 'desc' },
    });
    return packs.map((p) => ({
      ...p,
      mandatoryTopics: fromDbArray<string>(p.mandatoryTopics),
      mandatoryAudiences: fromDbArray<string>(p.mandatoryAudiences),
      mandatoryAssessments: fromDbArray<string>(p.mandatoryAssessments),
      clauses: p.clauses.map((c) => ({ ...c, mappedAtomIds: fromDbArray<string>(c.mappedAtomIds) })),
    }));
  }

  async getPack(id: string) {
    const pack = await this.prisma.policyPack.findFirst({
      where: { id, OR: [{ ownerTenantId: null }, { ownerTenantId: this.tenantId }] },
      include: { clauses: true },
    });
    if (!pack) return null;
    return {
      ...pack,
      mandatoryTopics: fromDbArray<string>(pack.mandatoryTopics),
      mandatoryAudiences: fromDbArray<string>(pack.mandatoryAudiences),
      mandatoryAssessments: fromDbArray<string>(pack.mandatoryAssessments),
      clauses: pack.clauses.map((c) => ({ ...c, mappedAtomIds: fromDbArray<string>(c.mappedAtomIds) })),
    };
  }
}
