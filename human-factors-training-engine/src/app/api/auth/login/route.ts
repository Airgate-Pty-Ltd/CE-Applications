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
import { comparePasswords, validateEmail } from '@/lib/auth';
import { createUserSession, sessionCookieOptions } from '@/lib/session';
import { SESSION_COOKIE_NAME } from '@/lib/sessionToken';
import {
  clearAccountLoginThrottle,
  loginRetryAfterSeconds,
  recordLoginFailure,
} from '@/lib/loginThrottle';

const DUMMY_PASSWORD_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 },
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!validateEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 },
      );
    }

    const retryAfter = await loginRetryAfterSeconds(normalizedEmail, request);
    if (retryAfter) {
      return NextResponse.json(
        { error: 'Too many login attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      await comparePasswords(password, DUMMY_PASSWORD_HASH);
      await recordLoginFailure(normalizedEmail, request);
      // Don't reveal whether email exists (security best practice)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    // Check if user is active
    if (!user.isActive) {
      await recordLoginFailure(normalizedEmail, request);
      return NextResponse.json(
        { error: 'Account is inactive' },
        { status: 403 },
      );
    }

    const loginMembership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, isActive: true, organization: { isActive: true } },
      orderBy: { createdAt: 'asc' },
      select: { organizationId: true },
    });

    // Compare passwords
    const passwordValid = await comparePasswords(password, user.passwordHash);

    if (!passwordValid) {
      await recordLoginFailure(normalizedEmail, request);
      // Log failed attempt (for security monitoring)
      await prisma.auditLog.create({
        data: {
          organizationId: loginMembership?.organizationId,
          actor: null,
          action: 'login_failed',
          object: 'User',
          objectId: user.id,
          details: JSON.stringify({
            email: normalizedEmail,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    await clearAccountLoginThrottle(normalizedEmail);

    const session = await createUserSession(user.id, request.headers.get('user-agent'));

    // Log successful login
    await prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        actor: user.id,
        action: 'login',
        object: 'User',
        objectId: user.id,
        details: JSON.stringify({
          email: normalizedEmail,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // Create response with session cookie
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 },
    );

    response.cookies.set(SESSION_COOKIE_NAME, session.token, sessionCookieOptions(session.maxAge));

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200 });
}
