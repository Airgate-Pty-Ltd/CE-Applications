'use client';

/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

// Standalone Packaging Directive G3: the admin-only account-creation screen — closes the gap
// where, after first-run setup, there was no way to create the QM/supervisor/learner
// accounts the product's actual workflows need without a dev-only demo seed script. Minimal
// by design; visual polish is out of scope here (PHASE-UI-DESIGN-DIRECTIVE.md, a separate
// later pass per the owner's own sequencing decision).

import { FormEvent, useEffect, useState } from 'react';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const ROLES = ['qm', 'supervisor', 'learner', 'admin'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('learner');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadUsers = () => {
    fetch('/api/users', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to create user.');
        return;
      }
      setName('');
      setEmail('');
      setPassword('');
      loadUsers();
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Create user error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>User Accounts</h1>

      <form onSubmit={handleCreate} style={{ margin: '1.5rem 0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {error && <div style={{ color: '#ef4444', width: '100%' }}>{error}</div>}
        <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" minLength={12} title="At least 12 characters with uppercase, lowercase, number, and symbol" placeholder="Initial password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Name</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Email</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
