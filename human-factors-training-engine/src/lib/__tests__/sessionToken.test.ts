/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { createSessionToken, hashSessionToken, verifySessionTokenEnvelope } from '@/lib/sessionToken';

describe('opaque session token envelope', () => {
  const priorSecret = process.env.SESSION_SECRET;

  beforeAll(() => {
    process.env.SESSION_SECRET = 'test-only-session-secret-with-at-least-32-bytes';
  });

  afterAll(() => {
    if (priorSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorSecret;
  });

  test('creates an opaque signed token with no user identity', () => {
    const token = createSessionToken(new Date(Date.now() + 60_000));
    expect(token).not.toContain('user');
    expect(verifySessionTokenEnvelope(token)).toBe(true);
    expect(hashSessionToken(token)).toMatch(/^[a-f0-9]{64}$/);
  });

  test('rejects tampering and expiration', () => {
    const token = createSessionToken(new Date(Date.now() + 60_000));
    expect(verifySessionTokenEnvelope(`${token.slice(0, -1)}x`)).toBe(false);
    expect(verifySessionTokenEnvelope(token, new Date(Date.now() + 61_000))).toBe(false);
  });
});
