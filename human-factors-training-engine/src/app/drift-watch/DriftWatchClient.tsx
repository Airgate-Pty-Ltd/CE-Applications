'use client';

/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { useEffect, useState } from 'react';

interface ThemeDrift {
  theme: string;
  occurrenceCount: number;
  eventIds: string[];
  coveringAtomIds: string[];
  status: 'RISING_UNCOVERED' | 'COVERED' | 'BELOW_THRESHOLD';
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  RISING_UNCOVERED: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  COVERED: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  BELOW_THRESHOLD: { bg: 'rgba(148,163,184,0.15)', color: 'var(--t2)' },
};

export default function DriftWatchClient() {
  const [drift, setDrift] = useState<ThemeDrift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/drift-watch', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setDrift(data.drift || []);
        setLoading(false);
      });
  }, []);

  const risingCount = drift.filter((d) => d.status === 'RISING_UNCOVERED').length;

  return (
    <div>
      <h1>Drift Watch</h1>
      <p style={{ color: 'var(--t2)' }}>
        Theme frequency vs. training coverage, last 6 months. <strong>Advisory only</strong> — this is
        not a kernel-detected condition. No approved rule currently backs this analysis (see
        Open Questions Q-007); it is a report for QM review, not a system authority.
      </p>

      {loading ? (
        <p>Loading…</p>
      ) : drift.length === 0 ? (
        <p style={{ color: 'var(--t2)' }}>No themed events in the analysis window.</p>
      ) : (
        <div className="card">
          {risingCount > 0 && (
            <p style={{ color: '#ef4444', fontWeight: 600 }}>
              {risingCount} theme{risingCount === 1 ? '' : 's'} rising with no current training coverage.
            </p>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.5rem' }}>Theme</th>
                <th style={{ padding: '0.5rem' }}>Occurrences</th>
                <th style={{ padding: '0.5rem' }}>Covering Atoms</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {drift.map((d) => (
                <tr key={d.theme} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem' }}>{d.theme}</td>
                  <td style={{ padding: '0.5rem' }}>{d.occurrenceCount}</td>
                  <td style={{ padding: '0.5rem' }}>{d.coveringAtomIds.length}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span className="badge" style={{ backgroundColor: STATUS_STYLE[d.status].bg, color: STATUS_STYLE[d.status].color }}>
                      {d.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
