'use client';

/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';

type Device = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
};

export default function HostedConnectorsClient() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [name, setName] = useState('');
  const [oneTimeToken, setOneTimeToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/connectors', { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load connectors.');
    setDevices(data.devices || []);
    setOrganizationId(data.organizationId || '');
  }, []);

  useEffect(() => {
    load().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to load connectors.'));
  }, [load]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setOneTimeToken('');
    setBusy(true);
    try {
      const response = await fetch('/api/connectors', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create connector.');
      setOneTimeToken(data.token);
      setName('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create connector.');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (device: Device) => {
    if (!window.confirm(`Revoke connector "${device.name}"? It will no longer be able to upload files.`)) return;
    setError('');
    const response = await fetch(`/api/connectors/${encodeURIComponent(device.id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Unable to revoke connector.');
      return;
    }
    await load();
  };

  return (
    <main style={{ maxWidth: 950, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Hosted Folder Connectors</h1>
          <p style={{ color: 'var(--t2)', marginTop: 0 }}>Organization: <code>{organizationId || 'loading'}</code></p>
        </div>
        <Link href="/admin/dashboard">Back to Admin</Link>
      </div>

      <section style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1rem', margin: '1rem 0' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>Create a connector credential</h2>
        <form onSubmit={create} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 300px' }}>
            <span style={{ display: 'block', marginBottom: '0.35rem' }}>Connector name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required placeholder="Training Department Server" style={{ width: '100%' }} />
          </label>
          <button type="submit" disabled={busy} style={{ alignSelf: 'end' }}>{busy ? 'Creating…' : 'Create token'}</button>
        </form>
        {error && <p role="alert" style={{ color: '#ef4444' }}>{error}</p>}
        {oneTimeToken && (
          <div role="status" style={{ marginTop: '1rem', padding: '1rem', border: '2px solid #f59e0b', borderRadius: 6 }}>
            <strong>Copy this token now. It cannot be displayed again.</strong>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <code style={{ overflowWrap: 'anywhere', flex: 1 }}>{oneTimeToken}</code>
              <button type="button" onClick={() => navigator.clipboard.writeText(oneTimeToken)}>Copy</button>
            </div>
          </div>
        )}
      </section>

      <section style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>Connector devices</h2>
        {devices.length === 0 ? <p>No connectors have been created.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={header}>Name</th><th style={header}>Status</th><th style={header}>Created</th><th style={header}>Last upload</th><th style={header}>Action</th></tr></thead>
              <tbody>{devices.map((device) => (
                <tr key={device.id}>
                  <td style={cell}>{device.name}</td>
                  <td style={cell}>{device.isActive ? 'Active' : 'Revoked'}</td>
                  <td style={cell}>{new Date(device.createdAt).toLocaleString()}</td>
                  <td style={cell}>{device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never'}</td>
                  <td style={cell}>{device.isActive ? <button type="button" onClick={() => revoke(device)}>Revoke</button> : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

const header: React.CSSProperties = { textAlign: 'left', padding: '0.6rem', borderBottom: '1px solid var(--border)' };
const cell: React.CSSProperties = { padding: '0.6rem', borderBottom: '1px solid var(--border)' };
