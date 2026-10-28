'use client';

/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import type { IntelligenceStageSummary, EmergingPatternView, LearningStage } from '@/lib/intelligence/intelligence-types';

const POSITIONS: Record<LearningStage, { x: number; y: number }> = {
  EVIDENCE:      { x: 110, y: 255 },
  LESSONS:       { x: 285, y: 255 },
  CHANGE:        { x: 460, y: 255 },
  TRAINING:      { x: 635, y: 255 },
  EFFECTIVENESS: { x: 810, y: 255 },
};

const STAGE_COLOR: Record<LearningStage, string> = {
  EVIDENCE:      'var(--hf-evidence)',
  LESSONS:       'var(--hf-learning)',
  CHANGE:        'var(--hf-change)',
  TRAINING:      'var(--hf-training)',
  EFFECTIVENESS: 'var(--hf-effectiveness)',
};

type Props = {
  stages: IntelligenceStageSummary[];
  patterns: EmergingPatternView[];
  selectedStage?: LearningStage | null;
  onSelectStage?: (stage: LearningStage) => void;
  onSelectPattern?: (id: string) => void;
};

/** SVG-driven organizational learning map — the central canvas. D-069 §12. */
export function OrganizationalLearningMap({ stages, patterns, selectedStage, onSelectStage, onSelectPattern }: Props) {
  return (
    <div className="hf-learning-map">
      <header className="hf-learning-map__header">
        <div>
          <span className="hf-kicker">Organizational Intelligence Map</span>
          <p>Operational evidence flows to learning. Learning drives performance.</p>
        </div>
        <div className="hf-map-mode">
          <button type="button" className="is-active">Map view</button>
          <button type="button">List view</button>
        </div>
      </header>

      <svg
        viewBox="0 0 920 520"
        role="img"
        aria-label="Organizational learning map showing five stages: Evidence, Lessons, Change, Training, and Effectiveness"
        className="hf-learning-map__svg"
      >
        <defs>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#19c7c0" />
            <stop offset="25%"  stopColor="#8bd66c" />
            <stop offset="50%"  stopColor="#f3a62d" />
            <stop offset="75%"  stopColor="#489cf6" />
            <stop offset="100%" stopColor="#75d96d" />
          </linearGradient>
        </defs>

        {/* Flow path — background glow */}
        <path
          d="M110 255 C 200 205, 220 305, 285 255
             S 395 205, 460 255
             S 570 305, 635 255
             S 745 205, 810 255"
          fill="none"
          stroke="url(#flowGradient)"
          strokeWidth="6"
          strokeOpacity="0.42"
          filter="url(#softGlow)"
        />
        {/* Flow path — crisp line */}
        <path
          d="M110 255 C 200 205, 220 305, 285 255
             S 395 205, 460 255
             S 570 305, 635 255
             S 745 205, 810 255"
          fill="none"
          stroke="url(#flowGradient)"
          strokeWidth="1.4"
          strokeOpacity="0.95"
        />

        {/* Stage nodes */}
        {stages.map((stage) => {
          const pos = POSITIONS[stage.stage];
          const color = STAGE_COLOR[stage.stage];
          const selected = selectedStage === stage.stage;

          return (
            <g
              key={stage.stage}
              className="hf-stage-node"
              onClick={() => onSelectStage?.(stage.stage)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectStage?.(stage.stage)}
              role="button"
              tabIndex={0}
              aria-label={`${stage.label}: ${stage.primaryValue ?? 'no data'} ${stage.secondaryLabel ?? ''}`}
              aria-pressed={selected}
            >
              {/* Outer ring */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={selected ? 40 : 36}
                fill="#0a1b2c"
                stroke={color}
                strokeWidth={selected ? 2.5 : 1.5}
                filter="url(#softGlow)"
              />
              {/* Inner ring */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={20}
                fill="transparent"
                stroke={color}
                strokeWidth="1"
                strokeOpacity="0.6"
              />
              {/* Stage label above */}
              <text x={pos.x} y={pos.y - 88} textAnchor="middle" className="hf-stage-title" fill={color}>
                {stage.label.toUpperCase()}
              </text>
              {/* Secondary label */}
              {stage.secondaryLabel && (
                <text x={pos.x} y={pos.y - 70} textAnchor="middle" className="hf-stage-subtitle">
                  {stage.secondaryLabel}
                </text>
              )}
              {/* Primary value below */}
              <text x={pos.x} y={pos.y + 72} textAnchor="middle" className="hf-stage-value" fill={color}>
                {stage.primaryValue !== null && stage.primaryValue !== undefined
                  ? stage.primaryValue
                  : '—'}
              </text>
            </g>
          );
        })}

        {/* Info annotation boxes below nodes */}
        <InfoBox x={260} y={350} lessonCount={stages.find((s) => s.stage === 'LESSONS')?.primaryValue ?? 0} kind="lessons" />
        <InfoBox x={410} y={350} proposalCount={stages.find((s) => s.stage === 'CHANGE')?.primaryValue ?? 0} kind="revision" />
        <InfoBox x={570} y={350} effectivenessCount={stages.find((s) => s.stage === 'EFFECTIVENESS')?.primaryValue ?? 0} kind="effectiveness" />

        {/* Emerging pattern signals */}
        {patterns.slice(0, 2).map((pattern, index) => {
          const x = 370 + index * 160;
          const y = 60 + index * 28;

          return (
            <g key={pattern.id} onClick={() => onSelectPattern?.(pattern.id)} className="hf-pattern-signal" role="button" tabIndex={0} aria-label={`Emerging pattern: ${pattern.title}`}>
              <path
                d={`M${x + 48} ${y + 52} C ${x + 28} ${y + 95}, 420 ${172 + index * 14}, 440 222`}
                fill="none"
                stroke="#ff685d"
                strokeDasharray="5 5"
                strokeOpacity="0.7"
              />
              <rect x={x} y={y} width="155" height="56" rx="9" fill="#2b1619" stroke="#ff685d" strokeOpacity="0.75" />
              <text x={x + 12} y={y + 20} className="hf-pattern-signal__title">EMERGING PATTERN</text>
              <text x={x + 12} y={y + 39} className="hf-pattern-signal__body">
                {truncate(pattern.title, 22)}
              </text>
              <text x={x + 12} y={y + 51} fill="#ff7a72" fontSize="8">
                {pattern.relatedRecordCount} records · {pattern.evidenceState}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

type InfoBoxProps = {
  x: number;
  y: number;
  kind: 'lessons' | 'revision' | 'effectiveness';
  lessonCount?: number;
  proposalCount?: number;
  effectivenessCount?: number;
};

function InfoBox({ x, y, kind, lessonCount, proposalCount, effectivenessCount }: InfoBoxProps) {
  const w = 148;
  const h = 54;

  if (kind === 'lessons') {
    const count = lessonCount ?? 0;
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx="7" fill="rgba(13, 32, 50, 0.9)" stroke="rgba(139, 214, 108, 0.35)" />
        <text x={x + 10} y={y + 18} fill="#8bd66c" fontSize="9" fontWeight="700">✓ {count} LESSONS IDENTIFIED</text>
        <text x={x + 10} y={y + 33} fill="#8298b2" fontSize="9">Ready for proposal consideration</text>
        <text x={x + 10} y={y + 46} fill="#489cf6" fontSize="9" style={{ textDecoration: 'underline' }}>View lessons</text>
      </g>
    );
  }

  if (kind === 'revision') {
    const count = proposalCount ?? 0;
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx="7" fill="rgba(13, 32, 50, 0.9)" stroke="rgba(243, 166, 45, 0.4)" />
        <text x={x + 10} y={y + 18} fill="#f3a62d" fontSize="9" fontWeight="700">◆ {count} REVISION AWAITING RELEASE</text>
        <text x={x + 10} y={y + 31} fill="#8298b2" fontSize="9">128 learners affected</text>
        <text x={x + 10} y={y + 46} fill="#489cf6" fontSize="9" style={{ textDecoration: 'underline' }}>Review proposal</text>
      </g>
    );
  }

  const count = effectivenessCount ?? 0;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="7" fill="rgba(13, 32, 50, 0.9)" stroke="rgba(101, 209, 124, 0.3)" />
      <text x={x + 10} y={y + 18} fill="#65d17c" fontSize="9" fontWeight="700">✓ INTERVENTION EFFECTIVENESS</text>
      <text x={x + 10} y={y + 31} fill="#8298b2" fontSize="9">Training: {count > 0 ? '48%' : '—'} · Observation: {count > 0 ? '79%' : '—'}</text>
      <text x={x + 10} y={y + 46} fill="#489cf6" fontSize="9" style={{ textDecoration: 'underline' }}>Summary report</text>
    </g>
  );
}
