/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import type { Metadata } from 'next';
import { versionStamp } from '@/lib/versionStamp';

export const metadata: Metadata = {
  title: 'Human Factors Training Platform',
  description: 'Complete Human Factors training for aerospace and manufacturing',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Set data-theme before paint to avoid a flash of the wrong theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
              var t = localStorage.getItem('theme');
              if (t === 'light' || t === 'dark') {
                document.documentElement.setAttribute('data-theme', t);
              }
            } catch (e) {}`,
          }}
        />
        {/* Raw CSS text child of <style> must go through dangerouslySetInnerHTML — a plain
            string child gets HTML-entity-escaped by React during SSR (quote characters in the
            attribute selectors below become &quot;) but not identically during client
            hydration, causing a hydration mismatch (and, worse, briefly invalid CSS in the
            server-rendered HTML before hydration corrects it). */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          html,
          html[data-theme="dark"] {
            --void: #04080F;
            --surface: #0E1624;
            --border: rgba(255, 255, 255, 0.055);
            --signal: #0EA5E9;
            --t1: #E8F0F8;
            --t2: #7A90A8;
            --t3: #3D5570;
          }

          /* Light theme (WP-3: "Keyboard accessible, light/dark, no dead ends") — toggled
             via [data-theme="light"] on <html>, set by ThemeToggle (src/components/ThemeToggle.tsx)
             and persisted in localStorage. */
          html[data-theme="light"] {
            --void: #F4F7FB;
            --surface: #FFFFFF;
            --border: rgba(15, 23, 42, 0.1);
            --signal: #0284C7;
            --t1: #0F172A;
            --t2: #475569;
            --t3: #94A3B8;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
              Cantarell, sans-serif;
            background-color: var(--void);
            color: var(--t1);
            line-height: 1.5;
          }

          a {
            color: var(--signal);
            text-decoration: none;
          }

          a:hover {
            text-decoration: underline;
          }

          button {
            font-family: inherit;
            cursor: pointer;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            background-color: var(--signal);
            color: white;
            font-weight: 500;
          }

          button:hover {
            opacity: 0.9;
          }

          input,
          textarea,
          select {
            font-family: inherit;
            padding: 0.5rem;
            border: 1px solid var(--border);
            border-radius: 4px;
            background-color: var(--surface);
            color: var(--t1);
          }

          input:focus,
          textarea:focus,
          select:focus {
            outline: none;
            border-color: var(--signal);
          }

          h1,
          h2,
          h3,
          h4,
          h5,
          h6 {
            margin-top: 1rem;
            margin-bottom: 0.5rem;
          }

          h1 {
            font-size: 2rem;
          }
          h2 {
            font-size: 1.5rem;
          }
          h3 {
            font-size: 1.25rem;
          }

          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1rem;
          }

          .card {
            background-color: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
          }

          .progress-bar {
            width: 100%;
            height: 8px;
            background-color: var(--border);
            border-radius: 4px;
            overflow: hidden;
            margin: 0.5rem 0;
          }

          .progress-bar-fill {
            height: 100%;
            background-color: var(--signal);
            transition: width 0.3s ease;
          }

          .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.875rem;
            font-weight: 500;
            margin-right: 0.5rem;
          }

          .badge.success {
            background-color: rgba(16, 185, 129, 0.2);
            color: #10b981;
          }

          .badge.danger {
            background-color: rgba(239, 68, 68, 0.2);
            color: #ef4444;
          }

          .badge.warning {
            background-color: rgba(245, 158, 11, 0.2);
            color: #f59e0b;
          }

          .app-footer {
            margin-top: 2rem;
            padding: 1rem;
            text-align: center;
            font-size: 0.75rem;
            color: var(--t3);
            border-top: 1px solid var(--border);
          }
        `,
          }}
        />
      </head>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>{children}</div>
          <footer className="app-footer">{versionStamp()}</footer>
        </div>
      </body>
    </html>
  );
}
