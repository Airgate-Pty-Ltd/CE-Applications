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

interface PendingItem {
  assignmentId: string;
  interventionId: string;
  interventionTitle: string;
  learnerName: string;
  passedAt: string | null;
}

export default function ManagerClient() {
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/api/manager/pending', { credentials: 'include' });
    if (res.ok) setPending((await res.json()).pending);
  };

  useEffect(() => {
    load();
  }, []);

  const verify = async (item: PendingItem, level: string) => {
    const res = await fetch('/api/manager/observations', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignmentId: item.assignmentId,
        interventionId: item.interventionId,
        effectivenessLevel: level,
        description: `${item.learnerName} observed applying training in the field.`,
        outcome: 'effective',
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(
        data.closedNow
          ? `Recorded and intervention CLOSED — effectiveness target met and all atoms complete.`
          : `Recorded. Closure not yet triggered: ${data.closureReason}`
      );
      load();
    }
  };

  return (
    <div>
      <h1>Manager — Five-Minute View</h1>
      <p style={{ color: 'var(--t2)' }}>One tap records real supervisor observation + effectiveness evidence, and checks closure.</p>

      {message && (
        <div role="status" className="card" style={{ borderColor: 'var(--signal)', color: 'var(--signal)' }}>
          {message}
        </div>
      )}

      {pending.length === 0 ? (
        <p style={{ color: 'var(--t2)' }}>No pending observations. All caught up.</p>
      ) : (
        pending.map((item) => (
          <div key={item.assignmentId} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{item.learnerName}</strong> — {item.interventionTitle}
              <p style={{ fontSize: '0.8rem', color: 'var(--t2)' }}>Passed assessment {item.passedAt ? new Date(item.passedAt).toLocaleDateString() : ''}</p>
            </div>
            <div>
              <button onClick={() => verify(item, 'WORKPLACE_TRANSFER')} style={{ marginRight: '0.5rem' }}>
                ✓ Observed effective (Workplace Transfer)
              </button>
              <button onClick={() => verify(item, 'KNOWLEDGE_SKILL')} style={{ background: 'var(--t3)' }}>
                Knowledge/Skill only
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
