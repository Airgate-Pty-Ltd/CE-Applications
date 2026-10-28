/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestSession, revokeSessionToken, sessionCookieOptions } from '@/lib/session';
import { SESSION_COOKIE_NAME } from '@/lib/sessionToken';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const activeSession = await getRequestSession(request);
    const userId = await revokeSessionToken(token);

    if (userId) {
      // Log logout event
      await prisma.auditLog.create({
        data: {
          organizationId: activeSession?.organizationId,
          actor: userId,
          action: 'logout',
          object: 'User',
          objectId: userId,
          details: JSON.stringify({
            timestamp: new Date().toISOString(),
          }),
        },
      });
    }

    // Create response
    const response = NextResponse.json(
      { success: true },
      { status: 200 },
    );

    // Clear session cookie
    response.cookies.set(SESSION_COOKIE_NAME, '', sessionCookieOptions(0));

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200 });
}
