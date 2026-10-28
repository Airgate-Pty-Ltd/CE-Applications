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

interface Disposition {
  id: string;
  learnerId: string;
  learnerName: string;
  interventionId: string;
  interventionTitle: string;
  decision: string;
  currentMinutes: number;
  incomingMinutes: number;
  projectedMinutes: number;
  capMinutes: number;
  createdAt: string;
}

export default function BurdenBudgetClient() {
  const [dispositions, setDispositions] = useState<Disposition[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);

  const load = async () => {
    const res = await fetch('/api/burden-budget', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setDispositions(data.dispositions || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const showMessage = (text: string, kind: 'success' | 'error') => {
    setMessage({ text, kind });
    setTimeout(() => setMessage(null), 6000);
  };

  const resolve = async (dispositionId: string, decision: 'APPROVED' | 'REJECTED') => {
    const rationale = decision === 'APPROVED' ? 'Approved override — training need outweighs the burden cap for this cycle.' : 'Rejected — hold until the learner is under the burden cap.';
    const res = await fetch('/api/burden-budget', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dispositionId, decision, rationale }),
    });
    const data = await res.json();
    if (res.ok) {
      showMessage(`Disposition ${decision.toLowerCase()}.`, 'success');
      load();
    } else {
      showMessage(data.error || 'Resolution failed', 'error');
    }
  };

  return (
    <div>
      <h1>Training Burden Budget</h1>
      <p style={{ color: 'var(--t2)' }}>
        Assignments that would push a learner over the rolling-window training-minute cap are
        queued here for human disposition instead of being silently assigned.
      </p>

      {message && (
        <div role="status" className="card" style={{ borderColor: message.kind === 'success' ? '#10b981' : '#ef4444', color: message.kind === 'success' ? '#10b981' : '#ef4444' }}>
          {message.text}
        </div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : dispositions.length === 0 ? (
        <p style={{ color: 'var(--t2)' }}>No pending dispositions. All caught up.</p>
      ) : (
        dispositions.map((d) => (
          <div key={d.id} className="card">
            <strong>{d.learnerName}</strong> — {d.interventionTitle}
            <p style={{ color: 'var(--t2)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Current: {d.currentMinutes}min · Incoming: {d.incomingMinutes}min · Projected: {d.projectedMinutes}min · Cap: {d.capMinutes}min
            </p>
            <div style={{ marginTop: '0.5rem' }}>
              <button onClick={() => resolve(d.id, 'APPROVED')} style={{ marginRight: '0.5rem' }}>
                Approve Override
              </button>
              <button onClick={() => resolve(d.id, 'REJECTED')}>Reject — Hold</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
