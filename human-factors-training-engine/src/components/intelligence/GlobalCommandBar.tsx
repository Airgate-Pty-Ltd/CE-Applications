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
import { usePathname } from 'next/navigation';

const MODES = [
  { href: '/intelligence', label: 'Intelligence' },
  { href: '/review', label: 'Review' },
  { href: '/training', label: 'Recurrent Training' },
  { href: '/effectiveness', label: 'Effectiveness' },
  { href: '/knowledge', label: 'Knowledge' },
] as const;

/** Top command bar — primary product-mode navigation. D-069 §10. */
export function GlobalCommandBar({
  organizationName,
  userInitials,
}: {
  organizationName: string;
  userInitials: string;
}) {
  const pathname = usePathname();

  return (
    <div className="hf-commandbar">
      <div className="hf-commandbar__brand">
        <div className="hf-commandbar__mark" aria-hidden />
        <div>
          <strong>HF-ENGINE</strong>
          <span>Organizational Learning. Governed.</span>
        </div>
      </div>

      <nav className="hf-commandbar__modes" aria-label="Primary modes">
        {MODES.map((mode) => (
          <Link
            key={mode.href}
            href={mode.href}
            className={pathname.startsWith(mode.href) ? 'is-active' : undefined}
          >
            {mode.label}
          </Link>
        ))}
      </nav>

      <div className="hf-commandbar__actions">
        <span className="hf-org-name">{organizationName}</span>
        <button type="button" aria-label="Search">Search</button>
        <button type="button" aria-label="Notifications">Alerts</button>
        <button type="button" className="hf-user-chip" aria-label="User menu">
          {userInitials}
        </button>
      </div>
    </div>
  );
}
