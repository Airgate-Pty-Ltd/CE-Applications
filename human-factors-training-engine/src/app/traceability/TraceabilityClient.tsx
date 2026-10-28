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

interface Option {
  id: string;
  title: string;
}
interface ForwardAtom {
  atomId: string;
  title: string;
  status: string;
  relationshipType: string;
}
interface ReverseEvent {
  eventId: string;
  title: string;
  themes: string[];
  relationshipType: string;
}
interface ReverseLearner {
  learnerId: string;
  assignmentId: string;
  status: string;
}

export default function TraceabilityClient() {
  const [events, setEvents] = useState<Option[]>([]);
  const [atoms, setAtoms] = useState<Option[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedAtom, setSelectedAtom] = useState('');
  const [forwardResult, setForwardResult] = useState<ForwardAtom[] | null>(null);
  const [reverseResult, setReverseResult] = useState<{ events: ReverseEvent[]; learners: ReverseLearner[] } | null>(null);

  useEffect(() => {
    fetch('/api/traceability/options', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events);
        setAtoms(d.atoms);
      });
  }, []);

  const runForward = async () => {
    if (!selectedEvent) return;
    const res = await fetch(`/api/traceability/forward/${selectedEvent}`, { credentials: 'include' });
    if (res.ok) setForwardResult((await res.json()).atoms);
  };

  const runReverse = async () => {
    if (!selectedAtom) return;
    const res = await fetch(`/api/traceability/reverse/${selectedAtom}`, { credentials: 'include' });
    if (res.ok) setReverseResult(await res.json());
  };

  return (
    <div>
      <h1>Traceability</h1>
      <p style={{ color: 'var(--t2)' }}>Forward: which content addresses this event? Reverse: what risk does this content address, and who currently has it?</p>

      <div className="card">
        <h2>Forward: Event → Atoms</h2>
        <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
          <option value="">Select event…</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
        <button onClick={runForward} style={{ marginLeft: '0.5rem' }}>Trace Forward</button>

        {forwardResult && (
          <div style={{ marginTop: '0.75rem' }}>
            {forwardResult.length === 0 ? (
              <p style={{ color: 'var(--t2)', fontSize: '0.9rem' }}>No content currently addresses this event.</p>
            ) : (
              forwardResult.map((a) => (
                <div key={a.atomId} style={{ fontSize: '0.9rem', padding: '0.25rem 0' }}>
                  → {a.title} <span className="badge success" style={{ fontSize: '0.7rem' }}>{a.status}</span> ({a.relationshipType})
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Reverse: Atom → Events + Learners</h2>
        <select value={selectedAtom} onChange={(e) => setSelectedAtom(e.target.value)}>
          <option value="">Select content item…</option>
          {atoms.map((a) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
        <button onClick={runReverse} style={{ marginLeft: '0.5rem' }}>Trace Reverse</button>

        {reverseResult && (
          <div style={{ marginTop: '0.75rem' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Risks addressed:</p>
            {reverseResult.events.length === 0 ? (
              <p style={{ color: 'var(--t2)', fontSize: '0.9rem' }}>No linked event found (manually authored content).</p>
            ) : (
              reverseResult.events.map((ev) => (
                <div key={ev.eventId} style={{ fontSize: '0.9rem' }}>← {ev.title} [{ev.themes.join(', ')}]</div>
              ))
            )}
            <p style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.5rem' }}>Learners currently assigned (recall scope, C-011):</p>
            {reverseResult.learners.length === 0 ? (
              <p style={{ color: 'var(--t2)', fontSize: '0.9rem' }}>No active assignments reference this content.</p>
            ) : (
              reverseResult.learners.map((l) => (
                <div key={l.assignmentId} style={{ fontSize: '0.9rem' }}>{l.learnerId} — {l.status}</div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
