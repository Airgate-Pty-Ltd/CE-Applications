/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import type { AttentionItem, EmergingPatternView, AutomatedReviewView } from '@/lib/intelligence/intelligence-types';

/** Situational briefing rail — not navigation. D-069 §11. */
export function ContextRail({
  attention,
  patterns,
  review,
  userName,
  onSelectProposal,
}: {
  attention: AttentionItem[];
  patterns: EmergingPatternView[];
  review: AutomatedReviewView | null;
  userName: string;
  onSelectProposal?: (objectId: string) => void;
}) {
  const firstName = userName.split(' ')[0] ?? userName;

  return (
    <div className="hf-context-rail">
      <section className="hf-context-intro">
        <span className="hf-live-label">◆ Live System</span>
        <h1>
          Good morning,
          <br />
          {firstName}
        </h1>
        <p>Turning operational evidence into verified organizational learning and performance.</p>
      </section>

      <ContextSection title="Requires Attention" count={attention.length} tone="critical">
        {attention.length === 0 ? (
          <p className="hf-empty">No priority items.</p>
        ) : (
          attention.slice(0, 4).map((item) => (
            <button
              key={item.id}
              className="hf-attention-row"
              onClick={() => item.objectType === 'proposal' && onSelectProposal?.(item.objectId)}
              aria-label={`${item.title}: ${item.actionLabel}`}
            >
              <strong>{item.title}</strong>
              <span>{item.summary}</span>
              <em>{item.actionLabel}</em>
            </button>
          ))
        )}
      </ContextSection>

      <ContextSection title="Emerging Patterns" count={patterns.length} tone="pattern">
        {patterns.length === 0 ? (
          <p className="hf-empty">No patterns detected.</p>
        ) : (
          patterns.slice(0, 3).map((pattern) => (
            <button key={pattern.id} className="hf-pattern-row" aria-label={pattern.title}>
              <strong>{pattern.title}</strong>
              <span>{pattern.summary}</span>
              <small>
                {pattern.relatedRecordCount} related records · {pattern.siteCount} site
                {pattern.siteCount !== 1 ? 's' : ''}
              </small>
            </button>
          ))
        )}
      </ContextSection>

      <ContextSection
        title="Automated Review"
        count={review?.checks.length ?? 0}
        tone="review"
      >
        {!review ? (
          <p className="hf-empty">No current review.</p>
        ) : (
          review.checks.slice(0, 5).map((check) => (
            <div key={check.label} className="hf-review-row">
              <span>{check.label}</span>
              <strong>{formatState(check.state)}</strong>
            </div>
          ))
        )}
      </ContextSection>
    </div>
  );
}

function ContextSection({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: 'critical' | 'pattern' | 'review';
  children: React.ReactNode;
}) {
  return (
    <section className={`hf-context-section hf-context-section--${tone}`}>
      <header>
        <h2>{title}</h2>
        <span>{count}</span>
      </header>
      <div>{children}</div>
    </section>
  );
}

function formatState(value: string) {
  return value.replace(/_/g, ' ');
}
