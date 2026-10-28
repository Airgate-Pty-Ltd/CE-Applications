// Entitlement handoff — verification of tokens minted by the Conform-Edge
// website.
//
// SERVER ONLY. Never import from a 'use client' component: this reads the
// shared secret.
//
// WHY A SIGNED TOKEN AND NOT A REDIRECT
// A redirect proves nothing. `Referer` is trivially forged and absent on
// direct navigation, so "arrived from our site" is not an access control —
// anyone who learns the dashboard URL would walk straight in. The website
// therefore signs a short-lived assertion of entitlement, and RegIntel
// verifies the signature before starting a session.
//
// TOKEN FORMAT
//   base64url(payloadJson) + "." + base64url(hmacSha256(payloadJson, secret))
//
// Deliberately not a full JWT library: the payload is fixed, there is exactly
// one algorithm, and `alg: none` confusion attacks are impossible when the
// algorithm is never read from the token.

import { createHmac, timingSafeEqual, randomUUID } from 'crypto';

/** Maximum age of a handoff token. Short: it is redeemed immediately. */
export const MAX_TOKEN_AGE_SECONDS = 120;

export interface HandoffPayload {
  /** The website's user id. Stable across sessions. */
  sub: string;
  email: string;
  tier: 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'inactive';
  /** Unix seconds. */
  iat: number;
  /** Unique token id, for single-use enforcement. */
  jti: string;
}

export type VerifyResult =
  | { ok: true; payload: HandoffPayload }
  | { ok: false; reason: string };

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function sign(payloadJson: string, secret: string): string {
  return b64urlEncode(createHmac('sha256', secret).update(payloadJson).digest());
}

/**
 * Mint a token. Used by tests, and by the website if it runs Node.
 * The website may implement this in any language — the format is the contract.
 */
export function createHandoffToken(
  payload: Omit<HandoffPayload, 'iat' | 'jti'>,
  secret: string
): string {
  const full: HandoffPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    jti: randomUUID(),
  };
  const json = JSON.stringify(full);
  return `${b64urlEncode(Buffer.from(json, 'utf8'))}.${sign(json, secret)}`;
}

/**
 * Verify a token's signature and freshness.
 *
 * Does NOT enforce single use — the caller must do that, because it requires
 * durable storage. See app/enter/route.ts.
 */
export function verifyHandoffToken(token: string, secret: string): VerifyResult {
  if (!secret) return { ok: false, reason: 'handoff secret not configured' };
  if (!token || typeof token !== 'string') return { ok: false, reason: 'missing token' };

  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed token' };

  const [encodedPayload, providedSig] = parts;

  let json: string;
  try {
    json = b64urlDecode(encodedPayload).toString('utf8');
  } catch {
    return { ok: false, reason: 'undecodable payload' };
  }

  // Constant-time comparison; bail if lengths differ, since timingSafeEqual
  // throws on mismatched buffers.
  const expected = Buffer.from(sign(json, secret), 'utf8');
  const provided = Buffer.from(providedSig, 'utf8');
  if (expected.length !== provided.length) return { ok: false, reason: 'bad signature' };
  if (!timingSafeEqual(expected, provided)) return { ok: false, reason: 'bad signature' };

  let payload: HandoffPayload;
  try {
    payload = JSON.parse(json) as HandoffPayload;
  } catch {
    return { ok: false, reason: 'unparseable payload' };
  }

  if (!payload.sub || !payload.email || !payload.jti) {
    return { ok: false, reason: 'incomplete payload' };
  }

  const age = Math.floor(Date.now() / 1000) - payload.iat;
  if (!Number.isFinite(age)) return { ok: false, reason: 'invalid iat' };
  // Reject future-dated tokens beyond small clock skew.
  if (age < -30) return { ok: false, reason: 'token issued in the future' };
  if (age > MAX_TOKEN_AGE_SECONDS) return { ok: false, reason: 'token expired' };

  return { ok: true, payload };
}
