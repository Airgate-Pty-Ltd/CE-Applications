/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

/** Customer-facing view model for the Intelligence Workspace. D-069. */

export type LearningStage =
  | 'EVIDENCE'
  | 'LESSONS'
  | 'CHANGE'
  | 'TRAINING'
  | 'EFFECTIVENESS';

export type ReadinessState =
  | 'READY'
  | 'WAITING'
  | 'BLOCKED'
  | 'NOT_APPLICABLE'
  | 'UNKNOWN'
  | 'PENDING';

export interface IntelligenceStageSummary {
  stage: LearningStage;
  label: string;
  primaryValue: number | null;
  secondaryLabel?: string;
  status?: 'normal' | 'warning' | 'critical' | 'positive';
}

export interface AttentionItem {
  id: string;
  type:
    | 'REPEAT_ISSUE'
    | 'RELEASE_WAITING'
    | 'EFFECTIVENESS_DUE'
    | 'EVIDENCE_REQUIRED'
    | 'OTHER';
  title: string;
  summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionLabel: string;
  objectType: string;
  objectId: string;
}

export interface EmergingPatternView {
  id: string;
  title: string;
  summary: string;
  relatedRecordCount: number;
  siteCount: number;
  evidenceState: 'developing' | 'supported' | 'confirmed';
  theme?: string;
}

export interface AutomatedReviewCheck {
  label: string;
  state: ReadinessState;
  detail?: string;
}

export interface AutomatedReviewView {
  id: string;
  overall: 'READY' | 'ACTION_REQUIRED' | 'BLOCKED' | 'WAITING';
  checks: AutomatedReviewCheck[];
  customerMessage?: string;
  recommendedAction?: string;
}

export interface ChangeProposalView {
  id: string;
  lessonId: string | null;
  lessonTitle: string;
  currentRevision: string;
  proposedRevision: string;
  status: string;
  triggerReferences: string[];
  affectedLearners: number | null;
  affectedSites: number | null;
  nextCycleLabel?: string;
  automatedReview: AutomatedReviewView;
}

export type DiffSegmentType = 'unchanged' | 'added' | 'removed' | 'modified';

export interface DiffSegment {
  type: DiffSegmentType;
  text: string;
}

export interface RevisionSectionDiff {
  key: string;
  title: string;
  beforeText?: string;
  afterText?: string;
  inlineSegments?: DiffSegment[];
}

export interface LearningLineageStep {
  id: string;
  label: string;
  objectType: string;
  objectId?: string;
  status: 'complete' | 'active' | 'pending' | 'blocked';
  countLabel?: string;
}

export interface IntelligenceWorkspaceData {
  organizationName: string;
  userDisplayName: string;
  stages: IntelligenceStageSummary[];
  attention: AttentionItem[];
  patterns: EmergingPatternView[];
  selectedProposal: ChangeProposalView | null;
  selectedProposalDiffs: RevisionSectionDiff[];
  lineageSteps: LearningLineageStep[];
}

export interface CustomerReviewCondition {
  id: string;
  title: string;
  severity: 'info' | 'warning' | 'blocking';
  customerExplanation: string;
  recommendedAction?: string;
  sourceReferences?: string[];
}
