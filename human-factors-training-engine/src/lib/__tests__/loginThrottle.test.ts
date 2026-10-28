/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import { prisma } from '@/lib/db';
import {
  clearAccountLoginThrottle,
  loginRetryAfterSeconds,
  recordLoginFailure,
} from '@/lib/loginThrottle';

function requestWithHeaders(values: Record<string, string> = {}) {
  return { headers: new Headers(values) };
}

describe('persistent login throttling', () => {
  const tag = `throttle-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const originalTrustProxy = process.env.TRUST_PROXY_HEADERS;
  let existingIds: string[] = [];
  let existingNetworkCount = 0;

  beforeAll(async () => {
    existingIds = (await prisma.loginThrottle.findMany({ select: { id: true } })).map((row) => row.id);
    existingNetworkCount = await prisma.loginThrottle.count({ where: { scope: 'network' } });
  });

  afterAll(async () => {
    process.env.TRUST_PROXY_HEADERS = originalTrustProxy;
    await prisma.loginThrottle.deleteMany({ where: { id: { notIn: existingIds } } });
  });

  test('blocks the normalized account after five failures and returns Retry-After', async () => {
    process.env.TRUST_PROXY_HEADERS = 'false';
    const request = requestWithHeaders({ 'x-forwarded-for': '203.0.113.10' });
    const now = new Date('2026-08-14T12:00:00.000Z');
    const email = `${tag}@example.com`;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await recordLoginFailure(attempt % 2 ? email.toUpperCase() : ` ${email} `, request, now);
    }

    expect(await loginRetryAfterSeconds(email, request, now)).toBe(15 * 60);
    await clearAccountLoginThrottle(email.toUpperCase());
    expect(await loginRetryAfterSeconds(email, request, now)).toBeNull();
  });

  test('does not trust spoofable forwarded addresses unless proxy trust is enabled', async () => {
    const now = new Date('2026-08-14T13:00:00.000Z');
    const request = requestWithHeaders({ 'x-real-ip': '203.0.113.44' });

    process.env.TRUST_PROXY_HEADERS = 'false';
    await recordLoginFailure(`${tag}-no-proxy@example.com`, request, now);
    expect(await prisma.loginThrottle.count({ where: { scope: 'network' } })).toBe(existingNetworkCount);

    process.env.TRUST_PROXY_HEADERS = 'true';
    await recordLoginFailure(`${tag}-trusted-proxy@example.com`, request, now);
    expect(await prisma.loginThrottle.count({ where: { scope: 'network' } })).toBe(existingNetworkCount + 1);
  });

  test('starts a fresh attempt window after the prior window expires', async () => {
    process.env.TRUST_PROXY_HEADERS = 'false';
    const request = requestWithHeaders();
    const email = `${tag}-window@example.com`;
    const firstWindow = new Date('2026-08-14T14:00:00.000Z');

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await recordLoginFailure(email, request, firstWindow);
    }
    await recordLoginFailure(email, request, new Date(firstWindow.getTime() + 16 * 60 * 1000));

    expect(await loginRetryAfterSeconds(email, request, new Date(firstWindow.getTime() + 16 * 60 * 1000))).toBeNull();
  });
});
