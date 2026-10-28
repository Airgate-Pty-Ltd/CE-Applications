/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionTokenEnvelope } from '@/lib/sessionToken';
import { isTrustedMutationOrigin } from '@/lib/requestSecurity';

// Routes that don't require authentication
// '/api/health/status' (WP-5.3) must stay public: it's the Docker Compose healthcheck target
// (docker-compose.yml), which cannot send a session cookie. The '/health' UI page is also
// listed here for the same historical reason, but its own page component still calls
// getCurrentUser() and redirects unauthenticated users to /login — see src/app/health/page.tsx.
const publicRoutes = ['/login', '/setup', '/api/auth/login', '/api/setup', '/health', '/api/health/status', '/api/training-certificates/verify', '/api/connectors/ingest'];

function isPublicPath(pathname: string): boolean {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

// Routes that require specific roles
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/') && !isTrustedMutationOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin mutation refused' }, { status: 403 });
  }

  // Allow public routes
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!verifySessionTokenEnvelope(sessionCookie)) {
    // Redirect to login if no session
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Database-backed revocation, active-user, tenant, and role checks occur in route/page
  // handlers. The edge proxy rejects absent, malformed, forged, and expired envelopes.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
