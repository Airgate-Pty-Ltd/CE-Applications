/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import crypto from 'node:crypto';

export const SESSION_COOKIE_NAME = 'session';
export const DEFAULT_SESSION_TTL_SECONDS = 12 * 60 * 60;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || '';
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('SESSION_SECRET (or JWT_SECRET fallback) must be at least 32 bytes.');
  }
  return secret;
}

export function configuredSessionTtlSeconds(): number {
  const configured = Number(process.env.SESSION_TTL_SECONDS || DEFAULT_SESSION_TTL_SECONDS);
  if (!Number.isSafeInteger(configured) || configured < 300 || configured > 7 * 24 * 60 * 60) {
    throw new Error('SESSION_TTL_SECONDS must be an integer between 300 and 604800 seconds.');
  }
  return configured;
}

function signature(payload: string): string {
  return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

export function createSessionToken(expiresAt: Date): string {
  const randomId = crypto.randomBytes(32).toString('base64url');
  const expires = Math.floor(expiresAt.getTime() / 1000);
  const payload = `v1.${randomId}.${expires}`;
  return `${payload}.${signature(payload)}`;
}

export function verifySessionTokenEnvelope(token: string | undefined, now = new Date()): boolean {
  if (!token || token.length > 256) return false;
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1' || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return false;

  const expires = Number(parts[2]);
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(now.getTime() / 1000)) return false;

  const expected = Buffer.from(signature(parts.slice(0, 3).join('.')), 'utf8');
  const provided = Buffer.from(parts[3], 'utf8');
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export function hashUserAgent(userAgent: string | null): string | null {
  if (!userAgent) return null;
  return crypto.createHash('sha256').update(userAgent, 'utf8').digest('hex');
}
