/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import type { ChangeProposalView } from '@/lib/intelligence/intelligence-types';

/** Impact summary panel. D-069 §17. */
export function ImpactSummary({
  proposal,
  compact = false,
}: {
  proposal: ChangeProposalView;
  compact?: boolean;
}) {
  return (
    <section className={`hf-impact-summary${compact ? ' hf-impact-summary--compact' : ''}`}>
      <h3>Impact Summary</h3>
      <dl>
        <div>
          <dt>Learners affected</dt>
          <dd>{displayNumber(proposal.affectedLearners)}</dd>
        </div>
        <div>
          <dt>Sites affected</dt>
          <dd>{displayNumber(proposal.affectedSites)}</dd>
        </div>
        <div>
          <dt>Next cycle</dt>
          <dd>{proposal.nextCycleLabel ?? 'Not calculated'}</dd>
        </div>
      </dl>
    </section>
  );
}

function displayNumber(value: number | null) {
  if (value === null) return 'Not calculated';
  return String(value);
}
