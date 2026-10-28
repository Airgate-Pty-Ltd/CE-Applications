'use client';

/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { useState } from 'react';
import type { RevisionSectionDiff, DiffSegment } from '@/lib/intelligence/intelligence-types';

type Mode = 'inline' | 'side-by-side' | 'final';

/** Track-changes viewer with inline/side-by-side/final modes. D-069 §15. */
export function RevisionDiff({ diffs }: { diffs: RevisionSectionDiff[] }) {
  const [mode, setMode] = useState<Mode>('side-by-side');

  if (diffs.length === 0) {
    return <p style={{ fontSize: '0.8rem', color: 'var(--hf-text-muted)', margin: 0 }}>No diff data available.</p>;
  }

  return (
    <div className="hf-revision-diff">
      <div className="hf-diff-mode" role="group" aria-label="Diff display mode">
        {(['inline', 'side-by-side', 'final'] as Mode[]).map((m) => (
          <button
            key={m}
            className={mode === m ? 'is-active' : undefined}
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
          >
            {m === 'inline' ? 'Inline Changes' : m === 'side-by-side' ? 'Side-by-Side' : 'Final Preview'}
          </button>
        ))}
      </div>

      {diffs.map((diff) => (
        <section key={diff.key} className="hf-diff-section">
          <h3>{diff.title}</h3>

          {mode === 'side-by-side' && (
            <div className="hf-diff-grid">
              <article>
                <header>Current</header>
                <p>{diff.beforeText || '—'}</p>
              </article>
              <article>
                <header>Proposed</header>
                <p>{diff.afterText || '—'}</p>
              </article>
            </div>
          )}

          {mode === 'inline' && (
            <p className="hf-inline-diff">
              {(diff.inlineSegments ?? buildFallbackSegments(diff)).map((seg, i) => (
                <DiffSpan key={i} segment={seg} />
              ))}
            </p>
          )}

          {mode === 'final' && (
            <p className="hf-final-text">{diff.afterText || '—'}</p>
          )}
        </section>
      ))}
    </div>
  );
}

function DiffSpan({ segment }: { segment: DiffSegment }) {
  if (segment.type === 'added')    return <ins>{segment.text}</ins>;
  if (segment.type === 'removed')  return <del>{segment.text}</del>;
  if (segment.type === 'modified') return <mark>{segment.text}</mark>;
  return <span>{segment.text}</span>;
}

/** Fallback: treat full afterText as a single added segment when no inline segments exist. */
function buildFallbackSegments(diff: RevisionSectionDiff): DiffSegment[] {
  const segments: DiffSegment[] = [];
  if (diff.beforeText) segments.push({ type: 'removed', text: diff.beforeText });
  if (diff.afterText)  segments.push({ type: 'added',   text: diff.afterText });
  if (segments.length === 0) segments.push({ type: 'unchanged', text: '—' });
  return segments;
}
