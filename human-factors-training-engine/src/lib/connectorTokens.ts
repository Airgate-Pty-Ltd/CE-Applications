/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import crypto from 'node:crypto';

const PREFIX = 'hfc_';

export function createConnectorToken(): string {
  return `${PREFIX}${crypto.randomBytes(32).toString('base64url')}`;
}

export function hashConnectorToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export function isConnectorTokenShape(token: string): boolean {
  return token.startsWith(PREFIX) && token.length >= 46 && token.length <= 64;
}

export function connectorBearerToken(header: string | null): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return isConnectorTokenShape(token) ? token : null;
}
