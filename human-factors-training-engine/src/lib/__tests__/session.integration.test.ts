/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { prisma } from '@/lib/db';
import { createUserSession, resolveSessionToken, revokeSessionToken } from '@/lib/session';
import { hashSessionToken } from '@/lib/sessionToken';

describe('database-backed user sessions', () => {
  const testTag = `session-test-${Date.now()}`;
  const priorSecret = process.env.SESSION_SECRET;

  beforeAll(() => {
    process.env.SESSION_SECRET = 'test-only-session-secret-with-at-least-32-bytes';
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: testTag } } });
    if (priorSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorSecret;
  });

  test('resolves an issued token and rejects it after revocation', async () => {
    const user = await prisma.user.create({
      data: {
        email: `${testTag}@example.com`,
        passwordHash: 'test-only',
        name: 'Session Test',
        role: 'learner',
        organizationMemberships: {
          create: { organizationId: 'tenant_001', role: 'learner' },
        },
      },
    });
    const issued = await createUserSession(user.id, 'integration-test-agent');

    const active = await resolveSessionToken(issued.token);
    expect(active?.userId).toBe(user.id);
    expect(active?.organizationId).toBe('tenant_001');
    expect(active?.membership.role).toBe('learner');
    expect(active?.userAgentHash).toMatch(/^[a-f0-9]{64}$/);

    await expect(revokeSessionToken(issued.token)).resolves.toBe(user.id);
    await expect(resolveSessionToken(issued.token)).resolves.toBeNull();
  });

  test('rejects a token that has no server-side session record', async () => {
    const user = await prisma.user.findFirstOrThrow({ where: { email: `${testTag}@example.com` } });
    const issued = await createUserSession(user.id);
    await prisma.authSession.delete({ where: { tokenHash: hashSessionToken(issued.token) } });
    await expect(resolveSessionToken(issued.token)).resolves.toBeNull();
  });
});
