import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import Modal from '../components/Modal';
import { useAuth } from '../lib/store';

export default function Registry() {
  const qc = useQueryClient();
  const role = useAuth((s) => s.user?.role);
  const isAdmin = role === 'ADMIN';
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', canonicalUrl: '', category: 'AC' });
  const { data } = useQuery({ queryKey: ['registry'], queryFn: async () => (await api.get('/api/registry')).data.sources });
  const refresh = () => qc.invalidateQueries({ queryKey: ['registry'] });

  async function create() { await api.post('/api/registry', form); setOpen(false); setForm({ title: '', canonicalUrl: '', category: 'AC' }); refresh(); }
  async function check() { await api.post('/api/registry/check'); refresh(); }
  async function approveUrl(id: string) { await api.post(`/api/registry/${id}/approve-url`); refresh(); }
  async function acceptChange(id: string) { await api.post(`/api/registry/${id}/accept-change`); refresh(); }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Regulatory Source Registry</h1>
        {isAdmin && <div className="row"><button className="btn btn-ghost" onClick={check}>Run check now</button><button className="btn btn-primary" onClick={() => setOpen(true)}>＋ Add source</button></div>}
      </div>
      <p className="muted small" style={{ marginTop: -6 }}>The system detects and proposes fixes on a schedule; an Admin approves what gets trusted. No URL is ever auto-replaced.</p>

      <div className="panel" style={{ padding: 0 }}>
        <table className="grid">
          <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>URL</th><th></th></tr></thead>
          <tbody>
            {data?.map((s: any) => (
              <tr key={s.id}>
                <td>{s.title}</td>
                <td className="muted">{s.category}</td>
                <td><span className={`stag ${s.status === 'OK' ? 'ok' : s.status === 'CHANGED' ? 'warning' : 'blocking'}`}>{s.status}</span>{s.frozen && <span className="stag blocking" style={{ marginLeft: 6 }}>frozen</span>}</td>
                <td className="muted small">{s.proposedUrl ? <>proposed: {s.proposedUrl}</> : s.canonicalUrl}</td>
                <td>
                  {isAdmin && s.status === 'BROKEN' && s.proposedUrl && <button className="btn btn-ghost" onClick={() => approveUrl(s.id)}>Approve URL</button>}
                  {isAdmin && s.status === 'CHANGED' && <button className="btn btn-ghost" onClick={() => acceptChange(s.id)}>Accept change</button>}
                </td>
              </tr>
            ))}
            {data && data.length === 0 && <tr><td colSpan={5} className="muted">No sources registered.</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title="Add regulatory source" onClose={() => setOpen(false)} footer={<>
          <button className="btn btn-cancel" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={create}>Add</button>
        </>}>
          <label className="mfi">Title</label>
          <input className="minp" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="AC 21.303-4" />
          <label className="mfi">Canonical URL</label>
          <input className="minp" value={form.canonicalUrl} onChange={(e) => setForm({ ...form, canonicalUrl: e.target.value })} />
          <label className="mfi">Category</label>
          <select className="minp" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {['AC', 'CFR_SECTION', 'FAA_FORM'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Modal>
      )}
    </div>
  );
}
