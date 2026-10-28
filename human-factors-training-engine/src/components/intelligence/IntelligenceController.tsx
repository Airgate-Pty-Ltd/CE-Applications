'use client';

/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { IntelligenceWorkspaceData, LearningStage, LearningLineageStep } from '@/lib/intelligence/intelligence-types';
import { IntelligenceWorkspace } from './IntelligenceWorkspace';
import { GlobalCommandBar } from './GlobalCommandBar';
import { ContextRail } from './ContextRail';
import { IntelligenceCanvas } from './IntelligenceCanvas';
import { ChangeProposalWorkbench } from './ChangeProposalWorkbench';
import { WorkbenchEmptyState } from './WorkbenchEmptyState';
import { LearningLineage } from './LearningLineage';

/** Client-side workspace controller. D-069 §19. */
export function IntelligenceController({ data }: { data: IntelligenceWorkspaceData }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectedStage, setSelectedStage] = useState<LearningStage | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    data.selectedProposal?.id ?? null
  );

  // Active proposal is always the default one (first AWAITING) unless user changes selection
  const activeProposal =
    selectedProposalId && data.selectedProposal?.id === selectedProposalId
      ? data.selectedProposal
      : data.selectedProposal;

  const activeDiffs = activeProposal ? data.selectedProposalDiffs : [];

  function handleSelectProposal(objectId: string) {
    setSelectedProposalId(objectId);
  }

  async function handleApprove() {
    if (!activeProposal) return;
    const res = await fetch(`/api/revision-proposals/${activeProposal.id}/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'APPROVE' }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Approve failed');
    }
    startTransition(() => router.refresh());
  }

  async function handleReturn() {
    if (!activeProposal) return;
    const res = await fetch(`/api/revision-proposals/${activeProposal.id}/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'RETURN_FOR_REWORK', reason: 'Returned from Intelligence Workspace review.' }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Return failed');
    }
    startTransition(() => router.refresh());
  }

  function handleLineageSelect(step: LearningLineageStep) {
    // Future: deep-link into the relevant view
    void step;
  }

  const initials = data.userDisplayName
    .split(' ')
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <IntelligenceWorkspace
      commandBar={
        <GlobalCommandBar
          organizationName={data.organizationName}
          userInitials={initials}
        />
      }
      contextRail={
        <ContextRail
          attention={data.attention}
          patterns={data.patterns}
          review={activeProposal?.automatedReview ?? null}
          userName={data.userDisplayName}
          onSelectProposal={handleSelectProposal}
        />
      }
      canvas={
        <IntelligenceCanvas
          stages={data.stages}
          patterns={data.patterns}
          selectedStage={selectedStage}
          onSelectStage={setSelectedStage}
          onSelectPattern={(id) => void id}
          nextCycleLabel={data.selectedProposal?.nextCycleLabel}
        />
      }
      workbench={
        activeProposal ? (
          <ChangeProposalWorkbench
            proposal={activeProposal}
            diffs={activeDiffs}
            onApprove={handleApprove}
            onReturn={handleReturn}
          />
        ) : (
          <WorkbenchEmptyState />
        )
      }
      lineage={
        <LearningLineage steps={data.lineageSteps} onSelect={handleLineageSelect} />
      }
    />
  );
}
