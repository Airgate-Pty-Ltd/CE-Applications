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

interface InterventionOption {
  interventionId: string;
  interventionTitle: string;
}

export default function DossierClient() {
  const [interventions, setInterventions] = useState<InterventionOption[]>([]);
  const [selected, setSelected] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dossier, setDossier] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/atoms', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setInterventions(d.interventions.map((i: InterventionOption) => ({ interventionId: i.interventionId, interventionTitle: i.interventionTitle }))));
  }, []);

  const generate = async () => {
    setError('');
    setDossier(null);
    if (!selected) return;
    const res = await fetch(`/api/dossier/intervention/${selected}`, { credentials: 'include' });
    const data = await res.json();
    if (res.ok) {
      setDossier(data);
    } else {
      setError(data.error || 'Dossier generation failed');
    }
  };

  return (
    <div>
      <h1>Regulatory Defense Dossier</h1>
      <p style={{ color: 'var(--t2)' }}>Assembles requirement mapping, curriculum, learner evidence, causal history, kernel dispositions, content BOM, gaps, and an integrity attestation for a selected intervention.</p>

      <div className="card">
        <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ minWidth: '250px' }}>
          <option value="">Select intervention…</option>
          {interventions.map((i) => (
            <option key={i.interventionId} value={i.interventionId}>{i.interventionTitle}</option>
          ))}
        </select>
        <button onClick={generate} style={{ marginLeft: '0.5rem' }}>Generate Dossier (JSON)</button>
        {selected && (
          <a href={`/api/dossier/intervention/${selected}?format=html`} target="_blank" rel="noreferrer" style={{ marginLeft: '0.5rem' }}>
            <button type="button">Open Printable HTML</button>
          </a>
        )}
      </div>

      {error && <div className="card" style={{ borderColor: '#ef4444', color: '#ef4444' }}>{error}</div>}

      {dossier && (
        <div className="card">
          <h2>{dossier.title}</h2>
          {Object.entries(dossier.sections).map(([key, section]: [string, any]) => {
            if (key === 'integrityAttestation') {
              return (
                <div key={key} style={{ marginTop: '0.75rem', fontFamily: 'monospace', fontSize: '0.75rem', background: 'var(--void)', padding: '0.5rem' }}>
                  <strong>Integrity Attestation</strong>
                  <div>Package Hash: {section.packageHash}</div>
                  <div>Audit-Log Chain: {section.auditLogChainSegment.entryCount} entries, {section.auditLogChainSegment.chainHash}</div>
                </div>
              );
            }
            return (
              <div key={key} style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <strong>{section.title}</strong>{' '}
                <span className={`badge ${section.populated ? 'success' : 'warning'}`}>{section.populated ? 'Populated' : 'Owner-Pending / Not Populated'}</span>
                {section.note && <p style={{ fontSize: '0.8rem', color: 'var(--t2)' }}>{section.note}</p>}
                <pre style={{ fontSize: '0.75rem', overflowX: 'auto', background: 'var(--void)', padding: '0.5rem' }}>{JSON.stringify(section.data, null, 2)}</pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
