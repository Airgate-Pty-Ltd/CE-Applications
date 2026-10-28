/**
 * Main App Component
 * Entry point with routing
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AuditDashboard from './pages/AuditDashboard';
import './App.css';

// Protected route wrapper
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('auth_token');
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/audits" 
          element={
            <ProtectedRoute>
              <AuditDashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/audits" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
