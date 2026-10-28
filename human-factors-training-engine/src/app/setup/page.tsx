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

// Standalone Packaging Directive G3: first-run admin setup, no hard-coded credentials.
export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/setup')
      .then((res) => res.json())
      .then((data) => {
        if (!data.needsSetup) {
          // Setup already completed on a prior run — nothing to do here.
          router.replace('/login');
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, organizationName, email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Setup failed.');
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Setup error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div style={styles.container}>
        <p style={{ color: 'var(--t2)' }}>Checking installation status...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h1 style={styles.title}>Welcome to HF Engine</h1>
        <p style={styles.subtitle}>Create the first administrator account to finish installation.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.formGroup}>
            <label htmlFor="organizationName" style={styles.label}>Organization Name</label>
            <input
              id="organizationName"
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              style={styles.input}
              required
              autoFocus
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="name" style={styles.label}>Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="email" style={styles.label}>Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              minLength={12}
              required
            />
            <p style={styles.hint}>At least 12 characters with uppercase, lowercase, number, and symbol.</p>
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="confirmPassword" style={styles.label}>Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Admin Account'}
          </button>
        </form>
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

  box: {
    width: '100%',
    maxWidth: '420px',
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
    marginBottom: '0',
  } as React.CSSProperties,

  formGroup: {
    marginBottom: '1.25rem',
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

  hint: {
    marginTop: '0.35rem',
    fontSize: '0.8rem',
    color: 'var(--t3)',
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
};
