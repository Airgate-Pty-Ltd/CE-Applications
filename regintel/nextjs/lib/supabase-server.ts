// Server-side Supabase clients.
//
// SERVER ONLY. Importing this from a 'use client' component breaks the build
// (next/headers is server-only) and would risk leaking the service-role key.
// Browser helpers live in ./supabase-client.

import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Next.js patches global fetch and adds its own caching layer. Auth traffic must
// NEVER go through it: a cached /admin/generate_link response hands back a
// one-time token that has already been spent, and the subsequent verify fails
// with "One-time token not found" — so the first login of a deployment works
// and every one after it is rejected. Opt every Supabase call out explicitly.
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' });

// Request-scoped client that respects RLS and the signed-in user's session.
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: noStoreFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Safe to ignore when middleware refreshes the session.
          }
        },
      },
    }
  );
}

// Service-role client — bypasses RLS. Never import into browser code.
export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: noStoreFetch } }
  );
}

export type { Profile, Finding, Report } from './types';
