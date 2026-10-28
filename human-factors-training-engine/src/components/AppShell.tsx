'use client';

/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const NAV_ITEMS = [
  { href: '/lessons-learned', label: 'Lessons Learned', roles: ['qm'] },
  { href: '/intake', label: 'Source Intake', roles: ['qm'] },
  { href: '/kernel-conditions', label: 'Kernel Conditions', roles: ['qm'] },
  { href: '/content-authoring', label: 'Content Authoring', roles: ['qm'] },
  { href: '/traceability', label: 'Traceability', roles: ['qm'] },
  { href: '/dossier', label: 'Defense Dossier', roles: ['qm'] },
  { href: '/drift-watch', label: 'Drift Watch', roles: ['qm'] },
  { href: '/burden-budget', label: 'Burden Budget', roles: ['qm', 'supervisor'] },
  { href: '/policy-packs', label: 'Policy Packs', roles: ['qm'] },
  { href: '/manager', label: 'Manager View', roles: ['supervisor', 'qm'] },
  { href: '/my-training', label: 'My Training', roles: ['learner'] },
  { href: '/health', label: 'System Health', roles: ['qm', 'supervisor', 'learner'] },
];

/** Shared shell (nav + theme toggle + logout) for all WP-3 screens. Keyboard-accessible: all
 * nav items are real <a> elements via next/link, reachable and activatable by Tab/Enter. */
export default function AppShell({
  role,
  userName,
  children,
}: {
  role: string;
  userName: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          padding: '0.75rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <nav aria-label="Primary" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  color: pathname === item.href ? 'var(--signal)' : 'var(--t2)',
                  fontWeight: pathname === item.href ? 600 : 400,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: 'var(--t2)', fontSize: '0.85rem' }}>
              {userName} ({role})
            </span>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              style={{ background: 'transparent', border: '1px solid var(--signal)', color: 'var(--signal)', fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
            >
              Log Out
            </button>
          </div>
        </div>
      </header>
      <main style={{ flex: 1, maxWidth: '1100px', margin: '0 auto', width: '100%', padding: '1.5rem 1rem' }}>{children}</main>
    </div>
  );
}
