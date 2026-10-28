/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import type { IntelligenceStageSummary, EmergingPatternView, LearningStage } from '@/lib/intelligence/intelligence-types';
import { OrganizationalLearningMap } from './OrganizationalLearningMap';

type Props = {
  stages: IntelligenceStageSummary[];
  patterns: EmergingPatternView[];
  selectedStage?: LearningStage | null;
  onSelectStage: (stage: LearningStage) => void;
  onSelectPattern: (id: string) => void;
  nextCycleLabel?: string | null;
};

/** Canvas composition — metric strip + organizational learning map. D-069 §13. */
export function IntelligenceCanvas({ stages, patterns, selectedStage, onSelectStage, onSelectPattern, nextCycleLabel }: Props) {
  const lessonCount = stages.find((s) => s.stage === 'LESSONS')?.primaryValue ?? 0;
  const revisionCount = stages.find((s) => s.stage === 'CHANGE')?.primaryValue ?? 0;

  return (
    <div className="hf-intelligence-canvas">
      <div className="hf-intelligence-strip" role="list" aria-label="Intelligence KPI metrics">
        <button
          type="button"
          role="listitem"
          className="hf-intelligence-strip__item hf-intelligence-strip__item--lessons"
          onClick={() => onSelectStage('LESSONS')}
          aria-label={`Lessons Identified: ${lessonCount}`}
          aria-pressed={selectedStage === 'LESSONS'}
        >
          <strong>{lessonCount}</strong>
          <span>Lessons Identified</span>
        </button>
        <button
          type="button"
          role="listitem"
          className="hf-intelligence-strip__item hf-intelligence-strip__item--revision"
          onClick={() => onSelectStage('CHANGE')}
          aria-label={`Revision Awaiting: ${revisionCount}`}
          aria-pressed={selectedStage === 'CHANGE'}
        >
          <strong>{revisionCount}</strong>
          <span>Revision Awaiting</span>
        </button>
        <button
          type="button"
          role="listitem"
          className="hf-intelligence-strip__item hf-intelligence-strip__item--patterns"
          aria-label={`Emerging Patterns: ${patterns.length}`}
        >
          <strong>{patterns.length}</strong>
          <span>Emerging Patterns</span>
        </button>
        <button
          type="button"
          role="listitem"
          className="hf-intelligence-strip__item hf-intelligence-strip__item--cycle"
          onClick={() => onSelectStage('TRAINING')}
          aria-label={`Cycle: ${nextCycleLabel ?? '—'}`}
        >
          <strong>{nextCycleLabel ?? '—'}</strong>
          <span>Cycle Will Use Rev B</span>
        </button>
        <button
          type="button"
          role="listitem"
          className="hf-intelligence-strip__item hf-intelligence-strip__item--action"
          aria-label="View all metrics"
        >
          <strong>&#9654;</strong>
          <span>&nbsp;</span>
        </button>
      </div>

      <OrganizationalLearningMap
        stages={stages}
        patterns={patterns}
        selectedStage={selectedStage}
        onSelectStage={onSelectStage}
        onSelectPattern={onSelectPattern}
      />
    </div>
  );
}
