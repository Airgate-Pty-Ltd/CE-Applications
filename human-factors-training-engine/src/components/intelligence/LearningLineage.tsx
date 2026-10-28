'use client';

/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import type { LearningLineageStep } from '@/lib/intelligence/intelligence-types';

/** Persistent learning lineage strip — traceability and navigation. D-069 §18. */
export function LearningLineage({
  steps,
  onSelect,
}: {
  steps: LearningLineageStep[];
  onSelect?: (step: LearningLineageStep) => void;
}) {
  return (
    <section className="hf-lineage">
      <header>
        <span>Learning Lineage</span>
        <button type="button">View full lineage</button>
      </header>

      <ol aria-label="Learning lineage steps">
        {steps.map((step, index) => (
          <li key={step.id} className={`hf-lineage__step hf-lineage__step--${step.status}`}>
            <button
              type="button"
              onClick={() => onSelect?.(step)}
              aria-label={`${step.label}${step.countLabel ? ': ' + step.countLabel : ''}`}
              aria-current={step.status === 'active' ? 'step' : undefined}
            >
              <span className="hf-lineage__node" aria-hidden />
              <strong>{step.label}</strong>
              {step.countLabel && <small>{step.countLabel}</small>}
            </button>
            {index < steps.length - 1 && <span className="hf-lineage__connector" aria-hidden />}
          </li>
        ))}
      </ol>
    </section>
  );
}
