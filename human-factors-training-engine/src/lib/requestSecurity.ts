/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import type { NextRequest } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function asOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isTrustedMutationOrigin(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') return false;

  const suppliedOrigin = asOrigin(request.headers.get('origin'));
  // Non-browser integrations may omit Origin. Browsers identify cross-site requests via
  // Origin and/or Sec-Fetch-Site; rejecting an explicitly cross-site request above protects
  // cookie-authenticated mutations without breaking controlled server-to-server clients.
  if (!suppliedOrigin) return true;

  const allowed = new Set<string>([request.nextUrl.origin]);
  for (const configured of [process.env.NEXTAUTH_URL, process.env.APP_ORIGIN]) {
    const origin = asOrigin(configured);
    if (origin) allowed.add(origin);
  }

  if (process.env.TRUST_PROXY_HEADERS === 'true') {
    const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const forwardedOrigin = host && proto ? asOrigin(`${proto}://${host}`) : null;
    if (forwardedOrigin) allowed.add(forwardedOrigin);
  }

  return allowed.has(suppliedOrigin);
}
