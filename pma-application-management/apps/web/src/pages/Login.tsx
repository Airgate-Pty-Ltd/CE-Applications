import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/store';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', orgName: '', slug: '', fullName: '' });
  const [error, setError] = useState('');
  const setAuth = useAuth((s) => s.setAuth);
  const navigate = useNavigate();

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'register') {
        const { data } = await api.post('/api/auth/register', form);
        setAuth(data.token, null);
      } else {
        const { data } = await api.post('/api/auth/login', { email: form.email, password: form.password });
        setAuth(data.token, data.user);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'failed');
    }
  }

  return (
    <div className="center-screen">
      <form className="panel panel-hi" style={{ width: 400 }} onSubmit={submit}>
        <div className="brand" style={{ marginBottom: 4 }}>CONFORM<em>-</em>EDGE <span className="brand-tool">· PMA Autopilot</span></div>
        <p className="small muted" style={{ marginTop: 0 }}>FAA Part 21 / AC 21.303-4 PMA drafting. Drafts only — never for FAA submission.</p>

        {mode === 'register' && (
          <>
            <label className="mfi">Organization name</label>
            <input className="minp" value={form.orgName} onChange={upd('orgName')} />
            <label className="mfi">Organization slug</label>
            <input className="minp" value={form.slug} onChange={upd('slug')} placeholder="acme-aero" />
            <label className="mfi">Your full name</label>
            <input className="minp" value={form.fullName} onChange={upd('fullName')} />
          </>
        )}
        <label className="mfi">Email</label>
        <input className="minp" type="email" value={form.email} onChange={upd('email')} />
        <label className="mfi">Password</label>
        <input className="minp" type="password" value={form.password} onChange={upd('password')} />

        {error && <div className="small" style={{ color: 'var(--critical)', marginBottom: 10 }}>{error}</div>}
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} type="submit">
          {mode === 'login' ? 'Sign in' : 'Create organization'}
        </button>
        <div className="small muted" style={{ marginTop: 12, textAlign: 'center', cursor: 'pointer' }} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'New organization? Register' : 'Have an account? Sign in'}
        </div>
      </form>
    </div>
  );
}
