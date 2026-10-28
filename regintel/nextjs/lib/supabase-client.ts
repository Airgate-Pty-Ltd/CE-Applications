// Browser-side Supabase client.
//
// Safe to import from 'use client' components. Must NOT import anything
// server-only (e.g. next/headers). RegIntel is a static export, so this is the
// ONLY Supabase client — every read/write goes browser → Supabase, gated by RLS.
//
// SHARED SESSION ACROSS SUBDOMAINS
// RegIntel (regintel.conform-edge.com) and the Conform-Edge website
// (conform-edge.com) are sibling static sites on one Supabase project. Setting
// the auth cookie's domain to the shared parent — `.conform-edge.com` — makes a
// single Supabase session visible to both, so logging in on the website logs
// you into RegIntel with no handoff token. Both apps must use the SAME Supabase
// project, anon key, and NEXT_PUBLIC_COOKIE_DOMAIN.
//
// Leave NEXT_PUBLIC_COOKIE_DOMAIN unset for local dev and preview deploys, where
// the session cookie should stay scoped to the current host (localhost, *.vercel.app).

import { createBrowserClient } from '@supabase/ssr';

const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    COOKIE_DOMAIN
      ? {
          cookieOptions: {
            domain: COOKIE_DOMAIN,   // e.g. ".conform-edge.com"
            path: '/',
            sameSite: 'lax',
            secure: true,            // HTTPS only; both subdomains are HTTPS
            maxAge: 60 * 60 * 24 * 7, // 7 days; Supabase refreshes before it lapses
          },
        }
      : undefined,
  );
}

export type { Profile, Finding, Report } from './types';
