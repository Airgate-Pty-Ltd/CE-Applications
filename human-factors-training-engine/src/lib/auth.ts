/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

/**
 * Hash password for storage
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Compare plaintext password with hash
 */
export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * Requirements: min 12 chars with upper/lowercase, number, and symbol.
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one symbol');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate secure random token (for session, password reset, etc.)
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Validate session cookie
 */
export function validateSessionCookie(cookie: string | undefined): boolean {
  return typeof cookie === 'string' && cookie.length >= 80 && cookie.length <= 256;
}

/**
 * Whether the session cookie should be marked `Secure` (browsers refuse to store or send a
 * `Secure` cookie over a plain HTTP connection - it isn't just a hardening nicety, it's a hard
 * requirement or the cookie silently never persists at all).
 *
 * Found live during Standalone Packaging G5's own install-guide walk-through, using a real
 * browser rather than curl (DECISIONS.md D-053): the prior `secure: process.env.NODE_ENV ===
 * 'production'` conflated "production build mode" with "served over HTTPS" - two different
 * things for this product. The packaged standalone/onprem edition (and the Docker onprem/
 * online profiles) always run NODE_ENV=production but have never had any TLS termination
 * anywhere in their design (plain HTTP on a LAN, per DEPENDENCY-FOOTPRINT.md) - so every
 * browser login in the actual packaged product silently failed to stay logged in beyond the
 * immediate response. curl-based testing never caught this because curl does not enforce the
 * Secure-requires-HTTPS browser policy the way a real browser does.
 *
 * NEXTAUTH_URL already encodes the real answer: it's set to the actual URL the app is
 * reachable at (http://... today; a future TLS-terminated deployment would set an https://
 * URL), so this reuses it rather than introducing a new env var.
 */
export function isSecureDeployment(): boolean {
  return (process.env.NEXTAUTH_URL || '').startsWith('https://');
}
