// Tests for the entitlement handoff.
//
// This is the paywall. If verification is wrong, RegIntel is free for anyone
// who can craft a URL — so the cases below are all about rejection, not the
// happy path.
//
//   npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';
import {
  createHandoffToken,
  verifyHandoffToken,
  MAX_TOKEN_AGE_SECONDS,
  type HandoffPayload,
} from './handoff';

const SECRET = 'test-secret-do-not-use-in-production';
const OTHER_SECRET = 'a-different-secret';

const BASE = {
  sub: 'user-123',
  email: 'someone@example.com',
  tier: 'pro',
  status: 'active',
} as const;

function b64url(s: string): string {
  return Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Build a token with an arbitrary payload, correctly signed with `secret`. */
function forge(payload: Record<string, unknown>, secret: string): string {
  const json = JSON.stringify(payload);
  const sig = createHmac('sha256', secret)
    .update(json)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${b64url(json)}.${sig}`;
}

test('accepts a freshly minted token and returns its claims', () => {
  const token = createHandoffToken(BASE, SECRET);
  const result = verifyHandoffToken(token, SECRET);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.payload.sub, 'user-123');
  assert.equal(result.payload.tier, 'pro');
  assert.equal(result.payload.status, 'active');
  assert.ok(result.payload.jti, 'must carry a jti for single-use enforcement');
});

test('rejects a token signed with a different secret', () => {
  const token = createHandoffToken(BASE, OTHER_SECRET);
  const result = verifyHandoffToken(token, SECRET);
  assert.equal(result.ok, false);
});

test('rejects a token whose payload was tampered with after signing', () => {
  // The attack that matters: take a real basic-tier token and upgrade it.
  const real = createHandoffToken({ ...BASE, tier: 'basic' }, SECRET);
  const [, sig] = real.split('.');

  const tampered = JSON.parse(
    Buffer.from(real.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
  ) as HandoffPayload;
  tampered.tier = 'enterprise';

  const forgedToken = `${b64url(JSON.stringify(tampered))}.${sig}`;
  const result = verifyHandoffToken(forgedToken, SECRET);

  assert.equal(result.ok, false, 'tier escalation must not verify');
});

test('rejects an expired token', () => {
  const stale = forge(
    {
      ...BASE,
      iat: Math.floor(Date.now() / 1000) - (MAX_TOKEN_AGE_SECONDS + 60),
      jti: 'stale-1',
    },
    SECRET
  );
  const result = verifyHandoffToken(stale, SECRET);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /expired/);
});

test('rejects a token dated far in the future', () => {
  const future = forge(
    { ...BASE, iat: Math.floor(Date.now() / 1000) + 3600, jti: 'future-1' },
    SECRET
  );
  const result = verifyHandoffToken(future, SECRET);
  assert.equal(result.ok, false);
});

test('allows small negative clock skew', () => {
  const skewed = forge(
    { ...BASE, iat: Math.floor(Date.now() / 1000) + 5, jti: 'skew-1' },
    SECRET
  );
  const result = verifyHandoffToken(skewed, SECRET);
  assert.equal(result.ok, true, 'a few seconds of clock skew must not lock users out');
});

test('rejects malformed and empty input', () => {
  for (const bad of ['', 'nonsense', 'a.b.c', '.', 'onlyonepart']) {
    assert.equal(verifyHandoffToken(bad, SECRET).ok, false, `should reject ${JSON.stringify(bad)}`);
  }
});

test('rejects a payload missing required claims', () => {
  const incomplete = forge({ iat: Math.floor(Date.now() / 1000), jti: 'x' }, SECRET);
  assert.equal(verifyHandoffToken(incomplete, SECRET).ok, false);
});

test('refuses to verify when no secret is configured', () => {
  // Guards against an unset env var silently disabling the paywall.
  const token = createHandoffToken(BASE, SECRET);
  assert.equal(verifyHandoffToken(token, '').ok, false);
});
