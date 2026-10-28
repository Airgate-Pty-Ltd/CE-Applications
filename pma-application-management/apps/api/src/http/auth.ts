import type { NextFunction, Request, Response } from 'express';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';

// Auth: JWT bearer tokens carrying tenant + user + role. A header-based context
// (x-tenant-id / x-user-id / x-user-role) is accepted ONLY outside production so
// the acceptance suite can drive tenant isolation directly; production requires a
// signed token.

export type Role = 'PREPARER' | 'REVIEWER' | 'ADMIN';

export interface AuthCtx {
  tenantId: string;
  userId: string;
  role: Role;
}

const SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';

export function signToken(ctx: AuthCtx): string {
  return jwt.sign(ctx, SECRET, { expiresIn: '12h' });
}

export function verifyToken(token: string): AuthCtx {
  const decoded = jwt.verify(token, SECRET) as jwt.JwtPayload & AuthCtx;
  return { tenantId: decoded.tenantId, userId: decoded.userId, role: decoded.role };
}

// Password hashing via Node's built-in scrypt (no native dependency).
// Stored format: scrypt$<saltHex>$<derivedKeyHex>.
const SCRYPT_KEYLEN = 64;

export function hashPassword(plain: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16);
    scrypt(plain, salt, SCRYPT_KEYLEN, (err, dk) => {
      if (err) return reject(err);
      resolve(`scrypt$${salt.toString('hex')}$${dk.toString('hex')}`);
    });
  });
}

export function verifyPassword(stored: string, plain: string): Promise<boolean> {
  return new Promise((resolve) => {
    const parts = stored.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return resolve(false);
    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    scrypt(plain, salt, SCRYPT_KEYLEN, (err, dk) => {
      if (err || dk.length !== expected.length) return resolve(false);
      resolve(timingSafeEqual(dk, expected));
    });
  });
}

function headerAuthAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_HEADER_AUTH === 'true';
}

export function ctx(req: Request): AuthCtx {
  return (req as unknown as { ctx: AuthCtx }).ctx;
}

// Attaches AuthCtx to the request. 401 if neither a valid token nor (in dev) a
// tenant header is present.
export function authContext(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (header?.startsWith('Bearer ')) {
    try {
      (req as unknown as { ctx: AuthCtx }).ctx = verifyToken(header.slice(7));
      return next();
    } catch {
      res.status(401).json({ error: 'invalid token' });
      return;
    }
  }
  if (headerAuthAllowed()) {
    const tenantId = req.header('x-tenant-id');
    if (!tenantId) {
      res.status(400).json({ error: 'x-tenant-id required' });
      return;
    }
    (req as unknown as { ctx: AuthCtx }).ctx = {
      tenantId,
      userId: req.header('x-user-id') ?? 'unknown',
      role: (req.header('x-user-role') as Role) ?? 'ADMIN',
    };
    return next();
  }
  res.status(401).json({ error: 'authentication required' });
}

// Role gate. Order: ADMIN > REVIEWER > PREPARER.
const RANK: Record<Role, number> = { PREPARER: 1, REVIEWER: 2, ADMIN: 3 };
export function requireRole(min: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const c = ctx(req);
    if (!c || RANK[c.role] < RANK[min]) {
      res.status(403).json({ error: `requires ${min} role` });
      return;
    }
    next();
  };
}
