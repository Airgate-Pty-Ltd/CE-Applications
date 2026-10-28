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

interface Condition {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  rationale: string;
  suggestedAction: string | null;
  status: string;
  response: string | null;
  respondedBy: string | null;
  detectedAt: string;
  dimId: string;
}

interface Charter {
  dimId: string;
  dimName: string;
  ruleSet: string;
  revision: string;
  approvedBy: string;
  rules: Array<{ ruleId: string; severity: string; description: string; limitations: string[] }>;
}

export default function KernelConditionsClient() {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [charter, setCharter] = useState<Charter | null>(null);
  const [charterOpenFor, setCharterOpenFor] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    const res = await fetch('/api/kernel-conditions', { credentials: 'include' });
    if (res.ok) setConditions((await res.json()).conditions);
  };

  useEffect(() => {
    load();
  }, []);

  const respond = async (id: string, response: string) => {
    const res = await fetch(`/api/kernel-conditions/${id}/respond`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response, responseNotes: notes[id] || '' }),
    });
    if (res.ok) load();
  };

  const openCharter = async (dimId: string) => {
    if (charterOpenFor === dimId) {
      setCharterOpenFor(null);
      return;
    }
    const res = await fetch(`/api/authority-charter/${dimId}`, { credentials: 'include' });
    if (res.ok) {
      setCharter(await res.json());
      setCharterOpenFor(dimId);
    }
  };

  return (
    <div>
      <h1>Kernel System-Detected Conditions</h1>
      <p style={{ color: 'var(--t2)' }}>
        <span className="badge warning">ADVISORY ONLY</span> The kernel never has authority — every condition requires an explicit human
        disposition (Confirm / Dismiss – Incorrect / Dismiss – Not Applicable). No condition auto-resolves.
      </p>

      {conditions.length === 0 ? (
        <p style={{ color: 'var(--t2)' }}>No system-detected conditions.</p>
      ) : (
        conditions.map((c) => (
          <div key={c.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{c.ruleId}: {c.ruleName}</strong>
              <span className={`badge ${c.severity === 'major' || c.severity === 'critical' ? 'danger' : 'warning'}`}>{c.severity}</span>
            </div>
            <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>{c.rationale}</p>
            {c.suggestedAction && <p style={{ fontSize: '0.85rem', color: 'var(--t2)' }}>Suggested: {c.suggestedAction}</p>}
            <button onClick={() => openCharter(c.dimId)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--signal)', fontSize: '0.8rem' }}>
              View Authority Charter ({c.dimId})
            </button>

            {c.status === 'NEW' ? (
              <div style={{ marginTop: '0.75rem' }}>
                <input
                  placeholder="Response notes (optional)"
                  value={notes[c.id] || ''}
                  onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })}
                  style={{ width: '100%', marginBottom: '0.5rem' }}
                />
                <button onClick={() => respond(c.id, 'CONFIRM')} style={{ marginRight: '0.5rem' }}>Confirm</button>
                <button onClick={() => respond(c.id, 'DISMISS_INCORRECT')} style={{ marginRight: '0.5rem', background: 'var(--t3)' }}>Dismiss — Incorrect</button>
                <button onClick={() => respond(c.id, 'DISMISS_NOT_APPLICABLE')} style={{ background: 'var(--t3)' }}>Dismiss — Not Applicable</button>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#10b981', marginTop: '0.5rem' }}>
                ✓ {c.response} by {c.respondedBy}
              </p>
            )}
          </div>
        ))
      )}

      {charter && charterOpenFor && (
        <div className="card" style={{ borderColor: 'var(--signal)' }}>
          <h2>Authority Charter — {charter.dimName}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--t2)' }}>
            {charter.ruleSet}, Revision {charter.revision}. Approved by {charter.approvedBy}. Generated programmatically from the approved
            rule JSON — cannot drift from what is actually enforced.
          </p>
          {charter.rules.map((r) => (
            <div key={r.ruleId} style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
              <strong>{r.ruleId}</strong> ({r.severity}): {r.description}
              {r.limitations?.length > 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--t2)' }}>Limitations: {r.limitations.join('; ')}</p>
              )}
            </div>
          ))}
          <button onClick={() => setCharterOpenFor(null)} style={{ marginTop: '0.75rem' }}>Close</button>
        </div>
      )}
    </div>
  );
}
