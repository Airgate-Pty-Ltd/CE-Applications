/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import type { AutomatedReviewView } from '@/lib/intelligence/intelligence-types';

/** Customer-safe release readiness panel. Never exposes M-AI internals. D-069 §16 & §23. */
export function ReleaseReadiness({
  review,
  compact = false,
}: {
  review: AutomatedReviewView;
  compact?: boolean;
}) {
  return (
    <section className={`hf-readiness${compact ? ' hf-readiness--compact' : ''}`}>
      <h3>Release Readiness</h3>

      <div className="hf-readiness__checks">
        {review.checks.map((check) => (
          <div key={check.label}>
            <span>{check.label}</span>
            <strong
              className={`hf-readiness-state hf-readiness-state--${check.state.toLowerCase()}`}
              aria-label={`${check.label}: ${formatState(check.state)}`}
            >
              {formatState(check.state)}
            </strong>
          </div>
        ))}
      </div>

      <div className="hf-readiness__overall">
        <small>Overall Status</small>
        <strong>{formatOverall(review.overall)}</strong>
      </div>

      {review.customerMessage && (
        <p className="hf-readiness__message" role="alert">
          {review.customerMessage}
        </p>
      )}
    </section>
  );
}

function formatState(value: string) {
  return value.replace(/_/g, ' ');
}

function formatOverall(value: string) {
  const map: Record<string, string> = {
    READY: 'Ready for Release',
    ACTION_REQUIRED: 'Action Required',
    BLOCKED: 'Blocked',
    WAITING: 'Awaiting Human Release',
  };
  return map[value] ?? value.replace(/_/g, ' ');
}
