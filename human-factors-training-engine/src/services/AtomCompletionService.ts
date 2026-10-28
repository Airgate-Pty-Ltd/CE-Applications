/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient, AtomCompletion } from '@prisma/client';
import { fromDbArray } from '@/lib/json';

/**
 * Per-atom completion tracking (C-009, PHASE-3-RUN-DIRECTIVE.md WP-2 §2).
 *
 * Matches PHASE-1-SPECIFICATION.md §2 step 6: "learner completes atoms (Atom-001, Atom-002,
 * Atom-003) in order... After Atom-003: 'Ready for Assessment' button appears" — there was
 * previously no table backing this at all. `AtomCompletion` is the record of an individual
 * atom being marked done within a specific assignment; "all atoms for this assignment's
 * manifest are complete" is derived by comparing against the frozen manifest's
 * `baselineContent` atom list (never against the live LearningAtom set, which could change
 * after the manifest was frozen).
 */
export class AtomCompletionService {
  constructor(private prisma: PrismaClient) {}

  /** Idempotent — marking an already-complete atom complete again is a no-op, not an error. */
  async markComplete(assignmentId: string, atomId: string): Promise<AtomCompletion> {
    const existing = await this.prisma.atomCompletion.findUnique({
      where: { assignmentId_atomId: { assignmentId, atomId } },
    });
    if (existing) return existing;

    return this.prisma.atomCompletion.create({
      data: { assignmentId, atomId },
    });
  }

  async getCompletionStatus(assignmentId: string): Promise<{
    totalAtoms: number;
    completedAtomIds: string[];
    remainingAtomIds: string[];
    allComplete: boolean;
    readyForAssessment: boolean;
  }> {
    const assignment = await this.prisma.trainingAssignment.findUniqueOrThrow({
      where: { id: assignmentId },
      include: { manifest: true },
    });

    const expectedAtoms = fromDbArray<{ atomId: string }>(assignment.manifest.baselineContent);
    const expectedAtomIds = expectedAtoms.map((a) => a.atomId);

    const completions = await this.prisma.atomCompletion.findMany({ where: { assignmentId } });
    const completedAtomIds = completions.map((c) => c.atomId);
    const completedSet = new Set(completedAtomIds);

    const remainingAtomIds = expectedAtomIds.filter((id) => !completedSet.has(id));
    const allComplete = expectedAtomIds.length > 0 && remainingAtomIds.length === 0;

    return {
      totalAtoms: expectedAtomIds.length,
      completedAtomIds,
      remainingAtomIds,
      allComplete,
      // "Ready for Assessment" appears once every atom in the frozen manifest is complete —
      // matches the spec's exact trigger condition.
      readyForAssessment: allComplete,
    };
  }
}

export const atomCompletionServiceSingleton = (prisma: PrismaClient) => new AtomCompletionService(prisma);
