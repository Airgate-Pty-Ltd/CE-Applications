/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { NextRequest } from 'next/server';
import { isTrustedMutationOrigin } from '@/lib/requestSecurity';

describe('mutation origin protection', () => {
  test('accepts same-origin and rejects cross-origin browser mutations', () => {
    const same = new NextRequest('https://training.example/api/users', {
      method: 'POST',
      headers: { origin: 'https://training.example', 'sec-fetch-site': 'same-origin' },
    });
    const cross = new NextRequest('https://training.example/api/users', {
      method: 'POST',
      headers: { origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' },
    });
    expect(isTrustedMutationOrigin(same)).toBe(true);
    expect(isTrustedMutationOrigin(cross)).toBe(false);
  });

  test('allows safe methods and non-browser clients without Origin', () => {
    expect(isTrustedMutationOrigin(new NextRequest('http://localhost/api/health/status'))).toBe(true);
    expect(isTrustedMutationOrigin(new NextRequest('http://localhost/api/intake/ingest', { method: 'POST' }))).toBe(true);
  });
});
