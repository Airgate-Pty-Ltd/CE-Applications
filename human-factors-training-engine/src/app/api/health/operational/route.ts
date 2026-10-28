/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/session';
import { hasAnyRole, OVERSIGHT_ROLES } from '@/lib/authorization';
import { HealthStatusService } from '@/services/HealthStatusService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, OVERSIGHT_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const report = await new HealthStatusService(prisma).getHealth();
  return NextResponse.json(report, { status: report.state === 'DEGRADED' ? 503 : 200 });
}
