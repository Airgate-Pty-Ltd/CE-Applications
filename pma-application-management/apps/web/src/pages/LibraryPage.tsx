import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const BASES = ['', 'STC_IDENTICALITY', 'TC_LICENSED', 'IDENTICALITY_NO_LICENSE', 'TEST_AND_COMPUTATION'];

export default function LibraryPage() {
  const [basis, setBasis] = useState('');
  const [q, setQ] = useState('');
  const { data } = useQuery({
    queryKey: ['library', basis, q],
    queryFn: async () => (await api.get('/api/library', { params: { basis: basis || undefined, q: q || undefined } })).data.entries,
  });
  return (
    <div>
      <h1>Approved Document Library</h1>
      <p className="muted small" style={{ marginTop: -6 }}>Precedent from your org's own approved packages. Promoted only by explicit human action.</p>
      <div className="panel">
        <div className="row">
          <select className="minp" style={{ maxWidth: 240, marginBottom: 0 }} value={basis} onChange={(e) => setBasis(e.target.value)}>
            {BASES.map((b) => <option key={b} value={b}>{b ? b.replace(/_/g, ' ') : 'All bases'}</option>)}
          </select>
          <input className="minp" style={{ maxWidth: 260, marginBottom: 0 }} placeholder="Search article name" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="panel" style={{ padding: 0 }}>
        <table className="grid">
          <thead><tr><th>Article</th><th>Basis</th><th>Summary</th><th>Added</th></tr></thead>
          <tbody>
            {data?.map((e: any) => (
              <tr key={e.id}><td>{e.articleName}</td><td><span className="stag info">{e.approvalBasis.replace(/_/g, ' ')}</span></td><td className="muted small">{e.summary || '—'}</td><td className="muted small">{new Date(e.createdAt).toLocaleDateString()}</td></tr>
            ))}
            {data && data.length === 0 && <tr><td colSpan={4} className="muted">No library entries.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
