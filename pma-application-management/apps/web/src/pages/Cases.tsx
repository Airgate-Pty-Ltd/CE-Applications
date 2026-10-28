import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Modal from '../components/Modal';

export default function Cases() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [articleName, setArticleName] = useState('');
  const { data } = useQuery({ queryKey: ['cases'], queryFn: async () => (await api.get('/api/cases')).data.cases });

  async function create() {
    const { data: res } = await api.post('/api/cases', { articleName: articleName || 'Untitled Article' });
    setOpen(false);
    setArticleName('');
    qc.invalidateQueries({ queryKey: ['cases'] });
    navigate(`/cases/${res.id}`);
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>PMA Cases</h1>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>＋ New case</button>
      </div>

      <div className="panel" style={{ padding: 0 }}>
        <table className="grid">
          <thead><tr><th>Article</th><th>Status</th><th>Basis</th><th>Updated</th></tr></thead>
          <tbody>
            {data?.map((c: any) => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/cases/${c.id}`)}>
                <td>{c.articleName}</td>
                <td><span className="stag signal">{c.status.replace(/_/g, ' ')}</span></td>
                <td className="muted">{c.approvalBasis ? c.approvalBasis.replace(/_/g, ' ') : '—'}</td>
                <td className="muted small">{new Date(c.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
            {data && data.length === 0 && <tr><td colSpan={4} className="muted">No cases yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal
          title="New PMA Case"
          onClose={() => setOpen(false)}
          footer={<>
            <button className="btn btn-cancel" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={create}>Create</button>
          </>}
        >
          <label className="mfi">Article name</label>
          <input className="minp" value={articleName} onChange={(e) => setArticleName(e.target.value)} placeholder="e.g. Hydraulic Bracket Assembly" autoFocus />
          <div className="small muted">The approval basis and article data are captured during intake — never typed from memory.</div>
        </Modal>
      )}
    </div>
  );
}
