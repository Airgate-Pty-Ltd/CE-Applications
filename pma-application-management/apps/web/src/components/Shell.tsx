import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderOpenDot, Library, ShieldAlert, Settings, LogOut } from 'lucide-react';
import { health } from '../lib/api';
import { useAuth, setFont, toggleTheme } from '../lib/store';

function Topbar() {
  const { data, isError } = useQuery({ queryKey: ['health'], queryFn: health, refetchInterval: 30_000 });
  const ok = !isError && data?.status === 'ok';
  const user = useAuth((s) => s.user);
  return (
    <header className="topbar">
      <div className="brand">CONFORM<em>-</em>EDGE <span className="brand-tool">· PMA Autopilot</span></div>
      <div className="tsep" />
      <div className="tstat">
        <div className={`tdot ${ok ? 'ok' : 'err'}`} />
        <span>{ok ? 'Online' : 'Offline'}</span>
      </div>
      <div className="tsp" />
      {user && <span className="small muted" style={{ marginRight: 10 }}>{user.fullName} · {user.role}</span>}
      <div className="tctrl">
        <button className="ib" onClick={() => setFont('compact')} title="Compact">A−</button>
        <button className="ib" onClick={() => setFont('default')} title="Default">A</button>
        <button className="ib" onClick={() => setFont('large')} title="Large">A+</button>
        <div className="tsep" />
        <button className="ib" onClick={toggleTheme} title="Toggle theme">◑</button>
      </div>
    </header>
  );
}

function Sidebar() {
  const navigate = useNavigate();
  const logout = useAuth((s) => s.logout);
  const items = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/cases', label: 'Cases', icon: FolderOpenDot },
    { to: '/library', label: 'Library', icon: Library },
    { to: '/registry', label: 'Registry', icon: ShieldAlert },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];
  return (
    <nav className="sidebar">
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <it.icon size={16} /> {it.label}
        </NavLink>
      ))}
      <div style={{ marginTop: 20 }}>
        <div className="nav-item" onClick={() => { logout(); navigate('/login'); }}>
          <LogOut size={16} /> Sign out
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 14, left: 12, right: 12 }}>
        <div className="watermark-note">Drafts only — never for FAA submission</div>
      </div>
    </nav>
  );
}

export default function Shell() {
  return (
    <>
      <Topbar />
      <div className="layout">
        <Sidebar />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </>
  );
}
