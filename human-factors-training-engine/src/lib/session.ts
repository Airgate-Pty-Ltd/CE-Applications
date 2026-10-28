/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { isSecureDeployment } from '@/lib/auth';
import {
  configuredSessionTtlSeconds,
  createSessionToken,
  hashSessionToken,
  hashUserAgent,
  SESSION_COOKIE_NAME,
  verifySessionTokenEnvelope,
} from '@/lib/sessionToken';

export async function createUserSession(
  userId: string,
  userAgent: string | null = null,
  organizationId?: string,
): Promise<{ token: string; expiresAt: Date; maxAge: number; organizationId: string }> {
  const membership = organizationId
    ? await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId } },
        include: { organization: true },
      })
    : await prisma.organizationMember.findFirst({
        where: { userId, isActive: true, organization: { isActive: true } },
        include: { organization: true },
        orderBy: { createdAt: 'asc' },
      });
  if (!membership?.isActive || !membership.organization.isActive) {
    throw new Error('User has no active organization membership.');
  }

  const maxAge = configuredSessionTtlSeconds();
  const expiresAt = new Date(Date.now() + maxAge * 1000);
  const token = createSessionToken(expiresAt);

  await prisma.authSession.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      organizationId: membership.organizationId,
      expiresAt,
      userAgentHash: hashUserAgent(userAgent),
    },
  });

  return { token, expiresAt, maxAge, organizationId: membership.organizationId };
}

export async function resolveSessionToken(token: string | undefined) {
  if (!verifySessionTokenEnvelope(token)) return null;

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token!) },
    include: { user: true, organization: true },
  });
  const now = new Date();

  if (!session || session.revokedAt || session.expiresAt <= now || !session.user.isActive || !session.organization.isActive) {
    return null;
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: session.organizationId,
        userId: session.userId,
      },
    },
  });
  if (!membership?.isActive) return null;

  if (now.getTime() - session.lastSeenAt.getTime() >= 5 * 60 * 1000) {
    await prisma.authSession.update({
      where: { id: session.id },
      data: { lastSeenAt: now },
    });
  }

  return { ...session, membership };
}

export async function getRequestSession(request: Pick<NextRequest, 'cookies'>) {
  return resolveSessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export async function getRequestUserId(request: Pick<NextRequest, 'cookies'>): Promise<string | null> {
  return (await getRequestSession(request))?.userId ?? null;
}

export async function getRequestContext(request: Pick<NextRequest, 'cookies'>) {
  const session = await getRequestSession(request);
  if (!session) return null;
  return {
    userId: session.userId,
    organizationId: session.organizationId,
    role: session.membership.role,
    user: session.user,
    organization: session.organization,
    sessionId: session.id,
  };
}

export async function revokeSessionToken(token: string | undefined): Promise<string | null> {
  if (!verifySessionTokenEnvelope(token)) return null;
  const tokenHash = hashSessionToken(token!);
  const session = await prisma.authSession.findUnique({ where: { tokenHash } });
  if (!session) return null;

  if (!session.revokedAt) {
    await prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  }
  return session.userId;
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isSecureDeployment(),
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  };
}
