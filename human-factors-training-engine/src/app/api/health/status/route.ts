/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/health/status — five-state health/status report (WP-5.3).
 * Deliberately PUBLIC/unauthenticated: the Docker Compose healthcheck (docker-compose.yml)
 * calls this with a plain fetch, no session cookie available. Standard practice for
 * infrastructure liveness/readiness probes (same reasoning as /api/health/detailed).
 *
 * `force-dynamic` is required, not optional: this handler has no dynamic API usage Next.js
 * can detect (no cookies()/headers()/params), so without this it gets statically generated
 * at `next build` time and every request forever after returns that one build-time snapshot
 * — found live during Standalone Packaging G1/G2 testing (DECISIONS.md D-050): the same
 * checkedAt/latencyMs came back across separate server processes and real time passing.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok' });
  } catch {
    // Public probes intentionally disclose no database errors, deployment configuration,
    // backup paths, hashes, record counts, or component versions.
    return NextResponse.json({ status: 'unavailable' }, { status: 503 });
  }
}
