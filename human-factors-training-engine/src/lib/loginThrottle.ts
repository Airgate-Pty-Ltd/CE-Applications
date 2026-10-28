/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const ACCOUNT_LIMIT = 5;
const NETWORK_LIMIT = 20;

type ThrottleKey = { keyHash: string; scope: 'account' | 'network'; limit: number };

function digest(scope: string, value: string): string {
  return crypto.createHash('sha256').update(`${scope}\0${value}`, 'utf8').digest('hex');
}

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}

function throttleKeys(email: string, request: Pick<NextRequest, 'headers'>): ThrottleKey[] {
  const keys: ThrottleKey[] = [
    { keyHash: digest('account', normalizedEmail(email)), scope: 'account', limit: ACCOUNT_LIMIT },
  ];

  // Forwarded address headers are security inputs only when deployment explicitly trusts
  // its reverse proxy to replace them. Direct/on-prem installs still receive account-level
  // throttling without treating spoofable headers as an IP address.
  if (process.env.TRUST_PROXY_HEADERS === 'true') {
    const address = request.headers.get('x-real-ip')
      || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (address) {
      keys.push({ keyHash: digest('network', address), scope: 'network', limit: NETWORK_LIMIT });
    }
  }
  return keys;
}

export async function loginRetryAfterSeconds(
  email: string,
  request: Pick<NextRequest, 'headers'>,
  now = new Date(),
): Promise<number | null> {
  const keys = throttleKeys(email, request);
  const rows = await prisma.loginThrottle.findMany({
    where: { keyHash: { in: keys.map((key) => key.keyHash) }, blockedUntil: { gt: now } },
    select: { blockedUntil: true },
  });
  if (rows.length === 0) return null;
  return Math.max(1, ...rows.map((row) => Math.ceil((row.blockedUntil!.getTime() - now.getTime()) / 1000)));
}

export async function recordLoginFailure(
  email: string,
  request: Pick<NextRequest, 'headers'>,
  now = new Date(),
): Promise<void> {
  const keys = throttleKeys(email, request);
  await prisma.$transaction(async (tx) => {
    for (const key of keys) {
      const existing = await tx.loginThrottle.findUnique({ where: { keyHash: key.keyHash } });
      const windowExpired = !existing || now.getTime() - existing.windowStartedAt.getTime() >= WINDOW_MS;
      const attempts = windowExpired ? 1 : existing.attempts + 1;
      const blockedUntil = attempts >= key.limit ? new Date(now.getTime() + BLOCK_MS) : null;
      await tx.loginThrottle.upsert({
        where: { keyHash: key.keyHash },
        create: {
          keyHash: key.keyHash,
          scope: key.scope,
          attempts,
          windowStartedAt: now,
          blockedUntil,
        },
        update: {
          attempts,
          windowStartedAt: windowExpired ? now : existing!.windowStartedAt,
          blockedUntil,
        },
      });
    }
  });
}

export async function clearAccountLoginThrottle(email: string): Promise<void> {
  await prisma.loginThrottle.deleteMany({
    where: { keyHash: digest('account', normalizedEmail(email)) },
  });
}
