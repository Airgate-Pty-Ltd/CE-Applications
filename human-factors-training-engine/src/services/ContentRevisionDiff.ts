/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { LearningAtom, MaiContentRevisionProposal } from '@prisma/client';
import { diffWords, Change } from 'diff';
import { fromDbArray } from '@/lib/json';

/**
 * D-068 / Progressive Autonomy Charter §19 (Track-Changes Release Control): a real, computed
 * comparison between the current approved revision (baselineAtom, if any) and a proposed
 * revision (MaiContentRevisionProposal), for the human release review screen. Computed on
 * demand, never persisted - both source rows are immutable once created, so recomputation is
 * always correct and cheap.
 *
 * Word-level diffing (via `diff`, jsdiff) is used only for genuine prose fields (title,
 * objective, content) - real correctness edge cases (tokenization, whitespace) aren't worth
 * re-deriving by hand. Everything else is a plain before/after comparison; no diff algorithm
 * makes sense for a scalar or a small tag set.
 *
 * Honest reporting, not implied capability: `assessmentQuestionIds` has zero application-code
 * readers anywhere else in this codebase - there is no atom-scoped question-text model to
 * resolve the ids into, so its diff can only ever be an id-set diff (added/removed ids), never
 * a prose diff of question text. `AI Assist contribution` (Charter §19) is reported as
 * `aiAssisted: false` for every revision this pipeline produces - content here is always the
 * lesson's own text, never an AI draft (see LessonAutoPreparationService) - not fabricated as
 * absent-but-unlabelled.
 */

export interface ProseFieldDiff {
  field: string;
  before: string;
  after: string;
  changes: Change[]; // jsdiff word-level added/removed/unchanged segments
  changed: boolean;
}

export interface ScalarFieldDiff {
  field: string;
  before: unknown;
  after: unknown;
  changed: boolean;
}

export interface SetFieldDiff {
  field: string;
  added: string[];
  removed: string[];
  unchanged: string[];
  changed: boolean;
}

export interface ContentRevisionDiffResult {
  isNetNew: boolean; // no baseline atom - nothing to compare against, every field is "new"
  proseDiffs: ProseFieldDiff[];
  scalarDiffs: ScalarFieldDiff[];
  setDiffs: SetFieldDiff[];
  durationImpactMinutes: number | null; // proposed - baseline, null if baseline unknown
  aiAssisted: false; // always - see file header
}

function diffProse(field: string, before: string | null, after: string | null): ProseFieldDiff {
  const b = before ?? '';
  const a = after ?? '';
  return { field, before: b, after: a, changes: diffWords(b, a), changed: b !== a };
}

function diffScalar(field: string, before: unknown, after: unknown): ScalarFieldDiff {
  return { field, before, after, changed: before !== after };
}

function diffSet(field: string, before: string[], after: string[]): SetFieldDiff {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const added = after.filter((x) => !beforeSet.has(x));
  const removed = before.filter((x) => !afterSet.has(x));
  const unchanged = before.filter((x) => afterSet.has(x));
  return { field, added, removed, unchanged, changed: added.length > 0 || removed.length > 0 };
}

export function computeContentRevisionDiff(
  proposal: MaiContentRevisionProposal,
  baselineAtom: LearningAtom | null
): ContentRevisionDiffResult {
  const durationImpactMinutes =
    baselineAtom && proposal.duration != null && baselineAtom.duration != null
      ? proposal.duration - baselineAtom.duration
      : null;

  return {
    isNetNew: baselineAtom === null,
    aiAssisted: false,
    durationImpactMinutes,
    proseDiffs: [
      diffProse('title', baselineAtom?.title ?? null, proposal.title),
      diffProse('objective', baselineAtom?.objective ?? null, proposal.objective),
      diffProse('content', baselineAtom?.content ?? null, proposal.content),
    ],
    scalarDiffs: [
      diffScalar('format', baselineAtom?.format ?? null, proposal.format),
      diffScalar('duration', baselineAtom?.duration ?? null, proposal.duration),
      diffScalar('classification', baselineAtom?.classification ?? null, proposal.classification),
      diffScalar('recurrenceRule', baselineAtom?.recurrenceRule ?? null, proposal.recurrenceRule),
      diffScalar('effectivenessMethod', baselineAtom?.effectivenessMethod ?? null, proposal.effectivenessMethod),
      diffScalar('evaluationCriteria', baselineAtom?.evaluationCriteria ?? null, proposal.evaluationCriteria),
    ],
    setDiffs: [
      diffSet(
        'applicabilityTags',
        fromDbArray<string>(baselineAtom?.applicabilityTags ?? '[]'),
        fromDbArray<string>(proposal.applicabilityTags)
      ),
      diffSet('roleAudience', fromDbArray<string>(baselineAtom?.roleAudience ?? '[]'), fromDbArray<string>(proposal.roleAudience)),
      diffSet(
        // Honest per file header: an id-set diff only, never question-text prose - no
        // atom-scoped question-text model exists anywhere in this codebase to resolve into.
        'assessmentQuestionIds (id-set only, no question-text model exists in this codebase)',
        fromDbArray<string>(baselineAtom?.assessmentQuestionIds ?? '[]'),
        fromDbArray<string>(proposal.assessmentQuestionIds)
      ),
    ],
  };
}
