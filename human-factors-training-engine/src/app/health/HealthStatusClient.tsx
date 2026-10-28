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

interface HealthReport {
  state: 'ONLINE' | 'LOCAL_ONLY' | 'DEGRADED' | 'AI_SERVICE_UNAVAILABLE' | 'BACKUP_OVERDUE';
  config: { edition: string; databaseMode: string; aiProviderMode: string; authMode: string };
  database: { reachable: boolean; latencyMs: number | null; error?: string };
  ai: { expected: boolean; reachable: boolean };
  backup: { manifest: { timestamp: string; file: string; sizeBytes: number } | null; ageDays: number | null; stale: boolean };
  checkedAt: string;
}

const STATE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  ONLINE: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Online' },
  LOCAL_ONLY: { bg: 'rgba(14,165,233,0.15)', color: 'var(--signal)', label: 'Local Only' },
  DEGRADED: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Degraded' },
  AI_SERVICE_UNAVAILABLE: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'AI Service Unavailable' },
  BACKUP_OVERDUE: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Backup Overdue' },
};

export default function HealthStatusClient() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch('/api/health/operational');
    if (res.ok || res.status === 503) setReport(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div><h1>System Health</h1><p>Loading…</p></div>;
  if (!report) return <div><h1>System Health</h1><p style={{ color: '#ef4444' }}>Unable to reach the health endpoint.</p></div>;

  const style = STATE_STYLE[report.state];

  return (
    <div>
      <h1>System Health</h1>
      <p style={{ color: 'var(--t2)' }}>Auto-refreshes every 30 seconds. Checked at {new Date(report.checkedAt).toLocaleString()}.</p>

      <div className="card">
        <span className="badge" style={{ backgroundColor: style.bg, color: style.color, fontSize: '1rem', padding: '0.5rem 1rem' }}>
          {style.label}
        </span>
        <p style={{ marginTop: '0.5rem', color: 'var(--t2)' }}>
          edition={report.config.edition} · db={report.config.databaseMode} · ai={report.config.aiProviderMode} · auth={report.config.authMode}
        </p>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1rem' }}>Database</h2>
        <p>{report.database.reachable ? `Reachable (${report.database.latencyMs}ms)` : `Unreachable: ${report.database.error}`}</p>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1rem' }}>AI Assist</h2>
        <p>{!report.ai.expected ? 'Not expected in this mode (AI_PROVIDER_MODE=none).' : report.ai.reachable ? 'Reachable.' : 'Expected but not reachable — no provider configured.'}</p>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1rem' }}>Backup</h2>
        {report.backup.manifest ? (
          <p>
            Last backup {report.backup.ageDays !== null ? `${report.backup.ageDays.toFixed(1)} days ago` : 'unknown'} ({report.backup.manifest.file}, {report.backup.manifest.sizeBytes} bytes).{' '}
            {report.backup.stale ? <strong style={{ color: '#f59e0b' }}>Stale.</strong> : <span style={{ color: '#10b981' }}>Within window.</span>}
          </p>
        ) : (
          <p style={{ color: '#f59e0b' }}>No backup manifest found — never backed up.</p>
        )}
      </div>
    </div>
  );
}
