/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { cookies } from 'next/headers';
import { resolveSessionToken } from './session';
import { SESSION_COOKIE_NAME } from './sessionToken';

/** Server-component helper: resolves an active user from a signed, revocable session. */
export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = await resolveSessionToken(token);
  if (!session) return null;
  return { ...session.user, role: session.membership.role };
}
