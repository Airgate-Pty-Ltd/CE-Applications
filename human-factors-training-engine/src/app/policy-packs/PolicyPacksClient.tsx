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

interface Clause {
  id: string;
  clauseNumber: string;
  clauseTitle: string | null;
  clauseText: string | null;
  mappedAtomIds: string[];
}
interface Pack {
  id: string;
  name: string;
  regulatoryFramework: string;
  regulatoryReference: string | null;
  mandatoryTopics: string[];
  clauses: Clause[];
}

export default function PolicyPacksClient() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [packForm, setPackForm] = useState({ name: '', regulatoryFramework: '', regulatoryReference: '' });
  const [clauseForms, setClauseForms] = useState<Record<string, { clauseNumber: string; clauseTitle: string; clauseText: string }>>({});

  const load = async () => {
    const res = await fetch('/api/policy-packs', { credentials: 'include' });
    if (res.ok) setPacks((await res.json()).packs);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const showMessage = (text: string, kind: 'success' | 'error') => {
    setMessage({ text, kind });
    setTimeout(() => setMessage(null), 6000);
  };

  const createPack = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/policy-packs', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packForm),
    });
    const data = await res.json();
    if (res.ok) {
      showMessage('Empty pack shell created — clauses and topics are owner-supplied next.', 'success');
      setPackForm({ name: '', regulatoryFramework: '', regulatoryReference: '' });
      load();
    } else {
      showMessage(data.error || 'Pack creation failed', 'error');
    }
  };

  const addClause = async (packId: string) => {
    const f = clauseForms[packId] || { clauseNumber: '', clauseTitle: '', clauseText: '' };
    if (!f.clauseNumber) {
      showMessage('Clause number is required', 'error');
      return;
    }
    const res = await fetch(`/api/policy-packs/${packId}/clauses`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clauseNumber: f.clauseNumber, clauseTitle: f.clauseTitle || undefined, clauseText: f.clauseText || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      showMessage('Clause placeholder added.', 'success');
      setClauseForms({ ...clauseForms, [packId]: { clauseNumber: '', clauseTitle: '', clauseText: '' } });
      load();
    } else {
      showMessage(data.error || 'Clause creation failed', 'error');
    }
  };

  return (
    <div>
      <h1>Policy Packs</h1>
      <p style={{ color: 'var(--t2)' }}>
        Packs ship as EMPTY shells — a name and regulatory framework only. Clause text, mandatory
        topics, and atom mappings are owner-supplied here, never invented or pre-filled.
      </p>

      {message && (
        <div role="status" className="card" style={{ borderColor: message.kind === 'success' ? '#10b981' : '#ef4444', color: message.kind === 'success' ? '#10b981' : '#ef4444' }}>
          {message.text}
        </div>
      )}

      <form onSubmit={createPack} className="card" aria-label="Create empty policy pack">
        <h2>Create Empty Pack</h2>
        <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: '1fr 1fr 1fr' }}>
          <input required placeholder="Pack name" value={packForm.name} onChange={(e) => setPackForm({ ...packForm, name: e.target.value })} />
          <input required placeholder="Regulatory framework (e.g. AS9100D)" value={packForm.regulatoryFramework} onChange={(e) => setPackForm({ ...packForm, regulatoryFramework: e.target.value })} />
          <input placeholder="Regulatory reference (optional)" value={packForm.regulatoryReference} onChange={(e) => setPackForm({ ...packForm, regulatoryReference: e.target.value })} />
        </div>
        <button type="submit" style={{ marginTop: '0.5rem' }}>Create Pack Shell</button>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : packs.length === 0 ? (
        <p style={{ color: 'var(--t2)' }}>No policy packs yet.</p>
      ) : (
        packs.map((pack) => (
          <div key={pack.id} className="card">
            <strong>{pack.name}</strong> <span className="badge">{pack.regulatoryFramework}</span>
            {pack.regulatoryReference && <p style={{ fontSize: '0.85rem', color: 'var(--t2)' }}>{pack.regulatoryReference}</p>}
            <p style={{ fontSize: '0.85rem', color: 'var(--t2)' }}>
              Mandatory topics: {pack.mandatoryTopics.length === 0 ? 'Owner-Pending / Not Populated' : pack.mandatoryTopics.join(', ')}
            </p>

            <h3 style={{ fontSize: '0.9rem', marginTop: '0.75rem' }}>Clauses ({pack.clauses.length})</h3>
            {pack.clauses.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--t2)' }}>No clauses yet — owner-supplied.</p>
            ) : (
              pack.clauses.map((c) => (
                <div key={c.id} style={{ fontSize: '0.85rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border)', marginTop: '0.4rem' }}>
                  <strong>{c.clauseNumber}</strong> {c.clauseTitle || <em style={{ color: 'var(--t2)' }}>(untitled — owner-pending)</em>}
                  <p style={{ color: 'var(--t2)' }}>{c.clauseText || '(no clause text yet — owner-pending)'}</p>
                  <p style={{ color: 'var(--t2)' }}>Mapped atoms: {c.mappedAtomIds.length === 0 ? 'none yet' : c.mappedAtomIds.length}</p>
                </div>
              ))
            )}

            <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.4rem', gridTemplateColumns: '1fr 1fr 2fr auto' }}>
              <input
                placeholder="Clause # (e.g. 8.5.1)"
                value={clauseForms[pack.id]?.clauseNumber || ''}
                onChange={(e) => setClauseForms({ ...clauseForms, [pack.id]: { ...(clauseForms[pack.id] || { clauseTitle: '', clauseText: '' }), clauseNumber: e.target.value } })}
              />
              <input
                placeholder="Title (optional)"
                value={clauseForms[pack.id]?.clauseTitle || ''}
                onChange={(e) => setClauseForms({ ...clauseForms, [pack.id]: { ...(clauseForms[pack.id] || { clauseNumber: '', clauseText: '' }), clauseTitle: e.target.value } })}
              />
              <input
                placeholder="Clause text (optional — owner-supplied)"
                value={clauseForms[pack.id]?.clauseText || ''}
                onChange={(e) => setClauseForms({ ...clauseForms, [pack.id]: { ...(clauseForms[pack.id] || { clauseNumber: '', clauseTitle: '' }), clauseText: e.target.value } })}
              />
              <button onClick={() => addClause(pack.id)}>Add Clause Placeholder</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
