/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';
import { fromDbArray } from '@/lib/json';

/**
 * Regulatory baseline training (D-058, folded into the PolicyPack/Requirement-Spine
 * architecture by D-060 — see DECISIONS.md for both entries): the clause <-> atom <-> status
 * traceability matrix — "what an auditor gets shown when asked how initial training covers
 * the requirement" (the owner's own framing).
 *
 * Coverage (`atoms`, `coverageGap`, `approvalGap`) is determined from PolicyPackClause.
 * mappedAtomIds ONLY — a direct, precise clause -> atom link, populated at import/authoring
 * time for exactly the clauses an atom was written to cover.
 *
 * D-063 (see DECISIONS.md): an earlier version of this service also unioned in every atom
 * reachable via ClauseTopicMap -> RequirementSpineTopic -> AtomTopicMap ("topic indirection").
 * That's a real defect for THIS use, caught only by actually running the matrix against
 * imported content: GM1's 66 items share just 15 spine topics, so one atom about "violations"
 * (mapped to SP-07 Error-Models) made an unrelated clause like "claustrophobia" (also SP-07)
 * falsely show as covered. Topic indirection is real, valuable infrastructure for future
 * cross-pack reuse (the whole point of the spine) - it's just not a reliable per-clause
 * coverage signal within a single pack whose clauses are far more numerous than its topics.
 * Topic-derived atoms are still surfaced, in `topicRelatedAtoms`, clearly separated from the
 * coverage-determining `atoms` list, so that information isn't lost - just not miscounted.
 *
 * Read-only. Does not create, approve, or modify anything — the approval gate for baseline
 * atoms stays exactly where it already is (the existing atom-approval workflow), same as
 * every other atom in this system.
 */

export interface MatrixAtomRow {
  atomId: string;
  title: string;
  status: string;
  contentSource: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface MatrixClauseRow {
  clauseId: string;
  framework: string;
  section: string | null;
  sectionLabel: string | null;
  itemNumber: string;
  itemLabel: string | null;
  intentSummary: string | null;
  topics: { code: string; title: string; coverage: string; deltaNote: string | null }[];
  atoms: MatrixAtomRow[];
  topicRelatedAtoms: MatrixAtomRow[]; // reachable via a shared spine topic, NOT counted toward coverage - informational only
  approvedAtomCount: number;
  coverageGap: boolean; // true when this clause has zero directly-linked atoms
  approvalGap: boolean; // true when it has directly-linked atoms, but none are APPROVED yet
}

export interface RegulatoryMatrixSummary {
  framework: string;
  totalClauses: number;
  coveredClauses: number; // at least one directly-linked atom, regardless of approval status
  approvedClauses: number; // at least one directly-linked, APPROVED atom
  coverageGapCount: number;
  approvalGapCount: number;
  rows: MatrixClauseRow[];
}

export class RegulatoryTraceabilityService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /** Builds the full clause <-> atom <-> status <-> content-source matrix for one framework. */
  async buildMatrix(framework: string = 'GM1 145.A.30(e)'): Promise<RegulatoryMatrixSummary> {
    const clauses = await this.prisma.policyPackClause.findMany({
      where: { pack: { regulatoryFramework: framework } },
      include: {
        topicMaps: { include: { topic: true } },
      },
      orderBy: [{ section: 'asc' }, { clauseNumber: 'asc' }],
    });

    let coveredClauses = 0;
    let approvedClauses = 0;
    let coverageGapCount = 0;
    let approvalGapCount = 0;

    const rows: MatrixClauseRow[] = [];
    for (const clause of clauses) {
      const directAtomIds = fromDbArray<string>(clause.mappedAtomIds);
      const atomRecords = directAtomIds.length > 0
        ? await this.prisma.learningAtom.findMany({ where: { id: { in: directAtomIds } } })
        : [];

      const atoms: MatrixAtomRow[] = atomRecords.map((atom) => ({
        atomId: atom.id,
        title: atom.title,
        status: atom.status,
        contentSource: atom.contentSource,
        approvedBy: atom.approvedBy,
        approvedAt: atom.approvedAt ? atom.approvedAt.toISOString() : null,
      }));

      const topicIds = clause.topicMaps.map((tm) => tm.topicId).filter((id): id is string => id !== null);
      let topicRelatedAtoms: MatrixAtomRow[] = [];
      if (topicIds.length > 0) {
        const atomTopicMaps = await this.prisma.atomTopicMap.findMany({ where: { topicId: { in: topicIds } } });
        const topicAtomIds = Array.from(new Set(atomTopicMaps.map((atm) => atm.atomId))).filter((id) => !directAtomIds.includes(id));
        if (topicAtomIds.length > 0) {
          const topicAtomRecords = await this.prisma.learningAtom.findMany({ where: { id: { in: topicAtomIds } } });
          topicRelatedAtoms = topicAtomRecords.map((atom) => ({
            atomId: atom.id,
            title: atom.title,
            status: atom.status,
            contentSource: atom.contentSource,
            approvedBy: atom.approvedBy,
            approvedAt: atom.approvedAt ? atom.approvedAt.toISOString() : null,
          }));
        }
      }

      const approvedAtomCount = atoms.filter((a) => a.status === 'APPROVED').length;
      const coverageGap = atoms.length === 0;
      const approvalGap = !coverageGap && approvedAtomCount === 0;

      if (!coverageGap) coveredClauses++;
      if (approvedAtomCount > 0) approvedClauses++;
      if (coverageGap) coverageGapCount++;
      if (approvalGap) approvalGapCount++;

      rows.push({
        clauseId: clause.id,
        framework,
        section: clause.section,
        sectionLabel: clause.sectionLabel,
        itemNumber: clause.clauseNumber,
        itemLabel: clause.clauseTitle,
        intentSummary: clause.clauseText,
        topics: clause.topicMaps.map((tm) => ({
          code: tm.topic?.code ?? '(none — whole-clause delta)',
          title: tm.topic?.title ?? '',
          coverage: tm.coverage,
          deltaNote: tm.deltaNote,
        })),
        atoms,
        topicRelatedAtoms,
        approvedAtomCount,
        coverageGap,
        approvalGap,
      });
    }

    return {
      framework,
      totalClauses: clauses.length,
      coveredClauses,
      approvedClauses,
      coverageGapCount,
      approvalGapCount,
      rows,
    };
  }
}
