'use client';

/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { useMemo, useState } from 'react';
import type { ChangeProposalView, RevisionSectionDiff } from '@/lib/intelligence/intelligence-types';
import { RevisionDiff } from './RevisionDiff';
import { ReleaseReadiness } from './ReleaseReadiness';
import { ImpactSummary } from './ImpactSummary';

type Tab = 'summary' | 'track-changes' | 'impact' | 'reviews' | 'history';

/** Right-side change proposal workbench. D-069 §14. */
export function ChangeProposalWorkbench({
  proposal,
  diffs,
  onApprove,
  onReturn,
}: {
  proposal: ChangeProposalView;
  diffs: RevisionSectionDiff[];
  onApprove: () => Promise<void> | void;
  onReturn: () => Promise<void> | void;
}) {
  const [tab, setTab] = useState<Tab>('track-changes');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const tabs: Array<{ id: Tab; label: string }> = useMemo(
    () => [
      { id: 'summary', label: 'Summary' },
      { id: 'track-changes', label: 'Track Changes' },
      { id: 'impact', label: 'Impact' },
      { id: 'reviews', label: 'Reviews' },
      { id: 'history', label: 'History' },
    ],
    []
  );

  async function handleApprove() {
    setBusy(true);
    setFeedback(null);
    try {
      await onApprove();
    } catch {
      setFeedback('Release failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReturn() {
    setBusy(true);
    setFeedback(null);
    try {
      await onReturn();
    } catch {
      setFeedback('Could not return proposal. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="hf-workbench-panel" aria-label="Change proposal review">
      <header className="hf-workbench-panel__header">
        <div>
          <span>Change Proposal Review</span>
          <h2>{proposal.lessonTitle}</h2>
          <p>
            {proposal.currentRevision} → {proposal.proposedRevision}
          </p>
          <p style={{ fontSize: '0.9rem', color: '#f5b84d', margin: '2px 0 0', fontWeight: 500 }}>
            Major Revision
          </p>
          <span className="hf-status-chip hf-status-chip--waiting" style={{ display: 'inline-block', marginTop: '8px' }}>
            Awaiting Human Release
          </span>
        </div>
      </header>

      <div className="hf-workbench-tabs" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'is-active' : undefined}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="hf-workbench-panel__body" role="tabpanel">
        {tab === 'track-changes' && <RevisionDiff diffs={diffs} />}

        {tab === 'impact' && <ImpactSummary proposal={proposal} />}

        {tab === 'reviews' && <ReleaseReadiness review={proposal.automatedReview} />}

        {tab === 'summary' && (
          <div className="hf-summary-block">
            <h3>Change Basis</h3>
            {proposal.triggerReferences.length > 0 ? (
              <p>Triggered by {proposal.triggerReferences.join(', ')}</p>
            ) : (
              <p>No trigger references recorded.</p>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="hf-summary-block">
            <p>Controlled revision history — not yet implemented.</p>
          </div>
        )}
      </div>

      {/* Compact readiness + impact always visible */}
      <ReleaseReadiness review={proposal.automatedReview} compact />
      <ImpactSummary proposal={proposal} compact />

      {feedback && (
        <p role="alert" style={{ fontSize: '0.76rem', color: 'var(--hf-critical)', margin: '0' }}>
          {feedback}
        </p>
      )}

      <footer className="hf-workbench-actions">
        <button
          type="button"
          className="hf-btn hf-btn--secondary"
          onClick={handleReturn}
          disabled={busy}
        >
          Send Back for Edits
        </button>
        <button
          type="button"
          className="hf-btn hf-btn--release"
          onClick={handleApprove}
          disabled={busy}
        >
          {busy ? 'Processing…' : 'Approve for Release'}
        </button>
      </footer>
    </section>
  );
}
