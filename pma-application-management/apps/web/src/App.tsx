import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Shell from './components/Shell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import CaseWorkspace from './pages/CaseWorkspace';
import LibraryPage from './pages/LibraryPage';
import Registry from './pages/Registry';
import SettingsPage from './pages/SettingsPage';
import { useAuth, applySettings } from './lib/store';

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAuth((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  useEffect(() => { applySettings(); }, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth><Shell /></RequireAuth>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/cases/:id" element={<CaseWorkspace />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/registry" element={<Registry />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
