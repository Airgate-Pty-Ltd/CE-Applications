import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/store';

export default function SettingsPage() {
  const role = useAuth((s) => s.user?.role);
  const isAdmin = role === 'ADMIN';
  const { data } = useQuery({ queryKey: ['org'], queryFn: async () => (await api.get('/api/org')).data });
  const [form, setForm] = useState({ submissionOfficeName: '', submissionOfficeAddress: '', submissionOfficeContact: '', submissionMethod: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm({
      submissionOfficeName: data.submissionOfficeName || '',
      submissionOfficeAddress: data.submissionOfficeAddress || '',
      submissionOfficeContact: data.submissionOfficeContact || '',
      submissionMethod: data.submissionMethod || '',
    });
  }, [data]);

  async function save() { await api.patch('/api/org/submission-office', form); setSaved(true); }

  return (
    <div>
      <h1>Organization Settings</h1>
      <div className="panel">
        <div className="label">Submission Office Profile</div>
        <p className="small muted">Tenant-specific. Never defaulted from another organization, and never auto-assumed on a case.</p>
        {(['submissionOfficeName', 'submissionOfficeAddress', 'submissionOfficeContact', 'submissionMethod'] as const).map((k) => (
          <div key={k}>
            <label className="mfi">{k.replace(/([A-Z])/g, ' $1').replace('submission Office', 'FAA office').replace('submission Method', 'submission method')}</label>
            <input className="minp" disabled={!isAdmin} value={form[k]} onChange={(e) => { setSaved(false); setForm({ ...form, [k]: e.target.value }); }} />
          </div>
        ))}
        {isAdmin ? <button className="btn btn-primary" onClick={save}>Save</button> : <div className="small muted">Only an Admin can edit the submission office profile.</div>}
        {saved && <span className="small" style={{ color: 'var(--positive)', marginLeft: 12 }}>Saved.</span>}
      </div>
    </div>
  );
}
