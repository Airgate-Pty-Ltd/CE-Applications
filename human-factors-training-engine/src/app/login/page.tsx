'use client';

/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Standalone Packaging Directive G3: a genuinely fresh install (zero users) sends the
  // visitor to first-run admin setup instead of a login form with nothing to log into.
  useEffect(() => {
    fetch('/api/setup')
      .then((res) => res.json())
      .then((data) => {
        if (data.needsSetup) router.replace('/setup');
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Route by role — WP-3 screens are role-specific, not everyone lands on the
      // learner-focused /dashboard.
      const role = data.user?.role;
      if (role === 'qm') router.push('/intake');
      else if (role === 'supervisor') router.push('/manager');
      else if (role === 'learner') router.push('/my-training');
      else router.push('/dashboard');
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h1 style={styles.title}>Human Factors Training Platform</h1>
        <p style={styles.subtitle}>Sign in to continue</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.formGroup}>
            <label htmlFor="email" style={styles.label}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={styles.input}
              required
              autoFocus
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.demoBox}>
          <p style={styles.demoTitle}>WP-3 Demo Credentials (Phase 1 lifecycle walkthrough)</p>
          <p style={styles.demoText}>
            <strong>QM:</strong> qm.demo@example.com / DemoPass123
          </p>
          <p style={styles.demoText}>
            <strong>Supervisor:</strong> supervisor.demo@example.com / DemoPass123
          </p>
          <p style={styles.demoText}>
            <strong>Learner:</strong> learner.demo@example.com / DemoPass123
          </p>
        </div>

        <footer style={styles.footer}>
          <p>© 2026 Conform-Edge Quality Consulting</p>
          <p>Phase 1 MVP — Web Training Platform</p>
        </footer>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '1rem',
  } as React.CSSProperties,

  loginBox: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
  } as React.CSSProperties,

  title: {
    fontSize: '1.5rem',
    marginBottom: '0.5rem',
    textAlign: 'center',
    color: 'var(--t1)',
  } as React.CSSProperties,

  subtitle: {
    textAlign: 'center',
    color: 'var(--t2)',
    marginBottom: '2rem',
    fontSize: '0.9rem',
  } as React.CSSProperties,

  form: {
    marginBottom: '2rem',
  } as React.CSSProperties,

  formGroup: {
    marginBottom: '1.5rem',
  } as React.CSSProperties,

  label: {
    display: 'block',
    marginBottom: '0.5rem',
    color: 'var(--t1)',
    fontSize: '0.9rem',
    fontWeight: '500',
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--void)',
    color: 'var(--t1)',
    fontSize: '1rem',
    boxSizing: 'border-box',
  } as React.CSSProperties,

  button: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: 'var(--signal)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  } as React.CSSProperties,

  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.9rem',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  } as React.CSSProperties,

  demoBox: {
    backgroundColor: 'rgba(14, 165, 233, 0.05)',
    border: '1px solid rgba(14, 165, 233, 0.2)',
    borderRadius: '4px',
    padding: '1rem',
    marginBottom: '1.5rem',
    fontSize: '0.85rem',
  } as React.CSSProperties,

  demoTitle: {
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    color: 'var(--signal)',
  } as React.CSSProperties,

  demoText: {
    color: 'var(--t2)',
    marginBottom: '0.25rem',
  } as React.CSSProperties,

  footer: {
    textAlign: 'center',
    borderTop: '1px solid var(--border)',
    paddingTop: '1rem',
    fontSize: '0.8rem',
    color: 'var(--t3)',
  } as React.CSSProperties,
};
