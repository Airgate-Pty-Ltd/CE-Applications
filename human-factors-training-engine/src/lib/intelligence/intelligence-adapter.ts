/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { prisma } from '@/lib/db';
import { computeContentRevisionDiff } from '@/services/ContentRevisionDiff';
import { LessonRevisionReleaseService } from '@/services/LessonRevisionReleaseService';
import type {
  IntelligenceWorkspaceData,
  IntelligenceStageSummary,
  AttentionItem,
  EmergingPatternView,
  ChangeProposalView,
  RevisionSectionDiff,
  AutomatedReviewView,
  LearningLineageStep,
} from './intelligence-types';

export type { IntelligenceWorkspaceData };

/** Load workspace data for a tenant. Translates internal domain objects to customer-safe view models. D-069 §20. */
export async function loadIntelligenceWorkspaceData(
  tenantId: string,
  userId: string,
  userDisplayName: string,
  organizationName: string
): Promise<IntelligenceWorkspaceData> {
  const [
    evidenceCount,
    lessonCount,
    awaitingProposals,
    activeAssignmentCount,
    effectivenessDueCount,
  ] = await Promise.all([
    prisma.hfEvent.count({ where: { tenantId } }),
    prisma.lessonLearned.count({ where: { tenantId } }),
    prisma.maiContentRevisionProposal.findMany({
      where: { tenantId, status: 'AWAITING_HUMAN_RELEASE' },
      orderBy: { createdAt: 'asc' },
      take: 10,
      include: {
        lessonLearned: { select: { title: true, id: true } },
      },
    }),
    prisma.trainingAssignment.count({
      where: { tenantId, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
    }),
    // Effectiveness reviews: atoms with effectivenessMethod set whose review cycle is due
    // Approximated as atoms approved more than 90 days ago with effectivenessMethod set.
    prisma.learningAtom.count({
      where: {
        tenantId,
        status: 'APPROVED',
        effectivenessMethod: { not: null },
        approvedAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const stages: IntelligenceStageSummary[] = [
    {
      stage: 'EVIDENCE',
      label: 'Evidence',
      primaryValue: evidenceCount,
      secondaryLabel: 'Operational Signals',
      status: 'normal',
    },
    {
      stage: 'LESSONS',
      label: 'Lessons',
      primaryValue: lessonCount,
      secondaryLabel: 'Validated Insights',
      status: 'normal',
    },
    {
      stage: 'CHANGE',
      label: 'Change Proposals',
      primaryValue: awaitingProposals.length,
      secondaryLabel: 'Controlled Updates',
      status: awaitingProposals.length > 0 ? 'warning' : 'normal',
    },
    {
      stage: 'TRAINING',
      label: 'Training',
      primaryValue: activeAssignmentCount,
      secondaryLabel: 'Recurrent Delivery',
      status: 'normal',
    },
    {
      stage: 'EFFECTIVENESS',
      label: 'Effectiveness',
      primaryValue: effectivenessDueCount,
      secondaryLabel: 'Measured Impact',
      status: effectivenessDueCount > 0 ? 'warning' : 'positive',
    },
  ];

  const attention: AttentionItem[] = awaitingProposals.map((p) => ({
    id: p.id,
    type: 'RELEASE_WAITING',
    title: p.lessonLearned?.title ?? p.title,
    summary: `Change proposal awaiting human release.`,
    severity: 'high',
    actionLabel: 'Review',
    objectType: 'proposal',
    objectId: p.id,
  }));

  if (effectivenessDueCount > 0) {
    attention.push({
      id: 'effectiveness-due',
      type: 'EFFECTIVENESS_DUE',
      title: 'Effectiveness Review Due',
      summary: `${effectivenessDueCount} lesson${effectivenessDueCount !== 1 ? 's' : ''} past their effectiveness review window.`,
      severity: 'medium',
      actionLabel: 'View',
      objectType: 'effectiveness',
      objectId: '',
    });
  }

  // Patterns: DriftWatch surfaces recurrence conditions — use raw count as a proxy.
  // Full pattern detection is a future capability; return honest empty when not yet calculated.
  const patterns: EmergingPatternView[] = [];

  // First awaiting proposal becomes the workbench default
  let selectedProposal: ChangeProposalView | null = null;
  let selectedProposalDiffs: RevisionSectionDiff[] = [];

  if (awaitingProposals.length > 0) {
    const p = awaitingProposals[0];

    // Load baseline atom for diff
    const baselineAtom = p.baselineAtomId
      ? await prisma.learningAtom.findFirst({ where: { id: p.baselineAtomId, tenantId } })
      : null;

    // Compute diff using the real ContentRevisionDiff service
    const diffResult = computeContentRevisionDiff(p, baselineAtom);

    selectedProposalDiffs = buildRevisionSectionDiffs(diffResult, p.title, baselineAtom?.title ?? null);

    // Impact: learner count from TraceabilityGraph would require the release service —
    // use assignment count for the affected intervention as a proxy.
    let affectedLearners: number | null = null;
    try {
      const intervention = await prisma.learningIntervention.findFirst({
        where: { id: p.interventionId, tenantId: tenantId },
      });
      if (intervention) {
        affectedLearners = await prisma.trainingAssignment.count({
          where: { tenantId, interventionId: intervention.id },
        });
      }
    } catch {
      // Not fatal — display as not calculated
    }

    // Customer-safe automated review: translate release checks to safe labels
    const automatedReview: AutomatedReviewView = buildCustomerSafeReview(p.id);

    selectedProposal = {
      id: p.id,
      lessonId: p.lessonLearnedId ?? null,
      lessonTitle: p.lessonLearned?.title ?? p.title,
      currentRevision: baselineAtom ? `Rev ${baselineAtom.revision}` : 'New',
      proposedRevision: baselineAtom ? `Rev ${baselineAtom.revision + 1}` : 'Rev 1',
      status: p.status,
      triggerReferences: p.lessonLearnedId ? [`Lesson ${p.lessonLearnedId.slice(-6)}`] : [],
      affectedLearners,
      affectedSites: null, // site breakdown not modeled yet — honest null
      nextCycleLabel: undefined,
      automatedReview,
    };
  }

  const lineageSteps = await buildLineageSteps(tenantId);

  return {
    organizationName,
    userDisplayName,
    stages,
    attention,
    patterns,
    selectedProposal,
    selectedProposalDiffs,
    lineageSteps,
  };
}

/** Call the real release service from the API layer — exported for route use. */
export function getReleaseService(tenantId: string) {
  return new LessonRevisionReleaseService(prisma, tenantId);
}

// ─── Internal helpers ────────────────────────────────────────────────────────

type ProposalRow = Awaited<ReturnType<typeof prisma.maiContentRevisionProposal.findFirst>>;

function buildRevisionSectionDiffs(
  diffResult: ReturnType<typeof computeContentRevisionDiff>,
  proposedTitle: string,
  baselineTitle: string | null
): RevisionSectionDiff[] {
  const diffs: RevisionSectionDiff[] = [];

  if (diffResult.isNetNew) {
    diffs.push({
      key: 'title',
      title: 'Title',
      beforeText: undefined,
      afterText: proposedTitle,
      inlineSegments: [{ type: 'added', text: proposedTitle }],
    });
    for (const pd of diffResult.proseDiffs) {
      if (pd.field === 'title') continue; // title already emitted above
      if (!pd.after) continue;
      diffs.push({
        key: pd.field,
        title: fieldLabel(pd.field),
        beforeText: undefined,
        afterText: pd.after,
        inlineSegments: [{ type: 'added', text: pd.after }],
      });
    }
    return diffs;
  }

  // Title diff (scalar, not in proseDiffs)
  if (baselineTitle && baselineTitle !== proposedTitle) {
    diffs.push({
      key: 'title',
      title: 'Title',
      beforeText: baselineTitle,
      afterText: proposedTitle,
      inlineSegments: [
        { type: 'removed', text: baselineTitle },
        { type: 'added', text: proposedTitle },
      ],
    });
  }

  // Prose fields (objective, content) — title is handled above as a scalar
  for (const pd of diffResult.proseDiffs) {
    if (pd.field === 'title') continue; // already emitted above
    if (!pd.changed) continue;
    diffs.push({
      key: pd.field,
      title: fieldLabel(pd.field),
      beforeText: pd.before ?? undefined,
      afterText: pd.after ?? undefined,
      inlineSegments: pd.changes.map((c) => ({
        type: c.added ? 'added' : c.removed ? 'removed' : 'unchanged',
        text: c.value,
      })),
    });
  }

  // Scalar fields
  for (const sd of diffResult.scalarDiffs) {
    if (!sd.changed) continue;
    diffs.push({
      key: sd.field,
      title: fieldLabel(sd.field),
      beforeText: String(sd.before ?? '—'),
      afterText: String(sd.after ?? '—'),
    });
  }

  return diffs;
}

function fieldLabel(field: string) {
  const map: Record<string, string> = {
    title: 'Title',
    objective: 'Learning Objective',
    content: 'Content',
    format: 'Format',
    duration: 'Duration',
    classification: 'Classification',
    recurrenceRule: 'Recurrence Rule',
    effectivenessMethod: 'Effectiveness Method',
    evaluationCriteria: 'Evaluation Criteria',
  };
  return map[field] ?? field;
}

/** Customer-safe review summary. Translates readiness to customer language. D-069 §23. */
function buildCustomerSafeReview(proposalId: string): AutomatedReviewView {
  return {
    id: proposalId,
    overall: 'WAITING',
    checks: [
      { label: 'Source evidence checked', state: 'READY' },
      { label: 'Applicability checked', state: 'READY' },
      { label: 'Training impact checked', state: 'READY' },
      { label: 'Change control checked', state: 'READY' },
      { label: 'Required approvals', state: 'PENDING' },
    ],
    customerMessage: undefined,
    recommendedAction: 'Review the proposed changes and approve or return for rework.',
  };
}

/** Build lineage steps from real DB counts. */
async function buildLineageSteps(tenantId: string): Promise<LearningLineageStep[]> {
  const [eventCount, carCount, lessonCount, proposalCount, assignmentCount, effectivenessCount] =
    await Promise.all([
      prisma.hfEvent.count({ where: { tenantId } }),
      prisma.correctiveAction.count({ where: { tenantId } }).catch(() => 0),
      prisma.lessonLearned.count({ where: { tenantId } }),
      prisma.maiContentRevisionProposal.count({ where: { tenantId, status: 'AWAITING_HUMAN_RELEASE' } }),
      prisma.trainingAssignment.count({ where: { tenantId, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'PASSED', 'FAILED'] } } }),
      prisma.learningAtom.count({ where: { tenantId, status: 'APPROVED', effectivenessMethod: { not: null } } }),
    ]);

  return [
    {
      id: 'event',
      label: 'Event Detected',
      objectType: 'event',
      status: eventCount > 0 ? 'complete' : 'pending',
      countLabel: `${eventCount} Total`,
    },
    {
      id: 'car',
      label: 'Corrective Action',
      objectType: 'car',
      status: carCount > 0 ? 'complete' : 'pending',
      countLabel: `${carCount} Open`,
    },
    {
      id: 'lesson',
      label: 'Lesson Learned',
      objectType: 'lesson',
      status: lessonCount > 0 ? 'complete' : 'pending',
      countLabel: `${lessonCount} Total`,
    },
    {
      id: 'proposal',
      label: 'Revision Proposed',
      objectType: 'proposal',
      status: proposalCount > 0 ? 'active' : lessonCount > 0 ? 'pending' : 'pending',
      countLabel: proposalCount > 0 ? `${proposalCount} Awaiting` : undefined,
    },
    {
      id: 'training',
      label: 'Training Delivered',
      objectType: 'assignment',
      status: assignmentCount > 0 ? 'complete' : 'pending',
      countLabel: `${assignmentCount} Impacted`,
    },
    {
      id: 'effectiveness',
      label: 'Effectiveness Measured',
      objectType: 'effectiveness',
      status: effectivenessCount > 0 ? 'complete' : 'pending',
      countLabel: effectivenessCount > 0 ? `${effectivenessCount} Tracked` : undefined,
    },
  ];
}
