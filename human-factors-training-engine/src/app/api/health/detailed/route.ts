/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { KERNEL_PROVENANCE } from '@/lib/kernelProvenance';
import { getRequestContext } from '@/lib/session';
import { hasAnyRole, OVERSIGHT_ROLES } from '@/lib/authorization';

// force-dynamic required — see src/app/api/health/status/route.ts's comment and
// DECISIONS.md D-050: without it this route is statically generated at build time and
// every request returns that one frozen snapshot forever, not live data.
export const dynamic = 'force-dynamic';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database: {
    status: 'connected' | 'disconnected';
    responseTime: number;
  };
  api: {
    version: string;
    endpoints: number;
  };
  kernel: {
    package: string;
    version: string;
    sourceGitSha: string;
    packageTreeSha256: string;
    runtimeTreeSha256: string;
  };
  data: {
    users: number;
    enrollments: number;
    assessments: number;
    certificates: number;
    auditLogs: number;
  };
}

const startTime = Date.now();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, OVERSIGHT_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Check database connectivity
    const dbStart = Date.now();
    const memberIds = (await prisma.organizationMember.findMany({
      where: { organizationId: context.organizationId, isActive: true },
      select: { userId: true },
    })).map((membership) => membership.userId);
    const userCount = memberIds.length;
    const dbTime = Date.now() - dbStart;

    // Gather system stats
    const enrollmentCount = await prisma.courseEnrollment.count({
      where: { course: { organizationId: context.organizationId } },
    });
    const assessmentCount = await prisma.assessment.count({
      where: { lesson: { course: { organizationId: context.organizationId } } },
    });
    const certificateCount = await prisma.certificate.count({
      where: { course: { organizationId: context.organizationId } },
    });
    const auditLogCount = await prisma.auditLog.count({
      where: { actor: { in: memberIds } },
    });

    const uptime = Date.now() - startTime;
    const isHealthy = dbTime < 1000; // Less than 1 second response time

    const health: HealthStatus = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime,
      database: {
        status: 'connected',
        responseTime: dbTime,
      },
      api: {
        version: '1.0.0',
        endpoints: 17,
      },
      kernel: {
        package: KERNEL_PROVENANCE.packageName,
        version: KERNEL_PROVENANCE.packageVersion,
        sourceGitSha: KERNEL_PROVENANCE.sourceGitSha,
        packageTreeSha256: KERNEL_PROVENANCE.packageTreeSha256,
        runtimeTreeSha256: KERNEL_PROVENANCE.runtimeTreeSha256,
      },
      data: {
        users: userCount,
        enrollments: enrollmentCount,
        assessments: assessmentCount,
        certificates: certificateCount,
        auditLogs: auditLogCount,
      },
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error('Health check failed:', error);

    const health: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      database: {
        status: 'disconnected',
        responseTime: -1,
      },
      api: {
        version: '1.0.0',
        endpoints: 17,
      },
      kernel: {
        package: KERNEL_PROVENANCE.packageName,
        version: KERNEL_PROVENANCE.packageVersion,
        sourceGitSha: KERNEL_PROVENANCE.sourceGitSha,
        packageTreeSha256: KERNEL_PROVENANCE.packageTreeSha256,
        runtimeTreeSha256: KERNEL_PROVENANCE.runtimeTreeSha256,
      },
      data: {
        users: 0,
        enrollments: 0,
        assessments: 0,
        certificates: 0,
        auditLogs: 0,
      },
    };

    return NextResponse.json(health, { status: 503 });
  }
}
