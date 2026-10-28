/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { getRequestContext } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, validateEmail, validatePasswordStrength } from '@/lib/auth';

// force-dynamic — same reasoning as src/app/api/health/status/route.ts (DECISIONS.md D-050):
// neither handler has Next.js-detectable dynamic API usage (cookies() is read via
// request.cookies, not the cookies() import, so Next doesn't see it), so without this both
// would be statically generated at build time.
export const dynamic = 'force-dynamic';

const CREATABLE_ROLES = ['admin', 'qm', 'supervisor', 'learner'];

/** GET /api/users?role=learner — minimal user lookup for assignment/observation pickers. */
export async function GET(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = request.nextUrl.searchParams.get('role');
  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      organizationMemberships: {
        some: { organizationId: context.organizationId, isActive: true },
      },
    },
    select: { id: true, name: true, email: true, role: true },
    take: 50,
  });

  return NextResponse.json({ users });
}

/**
 * POST /api/users — admin-only account creation (Standalone Packaging Directive G3: after
 * first-run setup creates one admin, there was previously no path to create the QM/
 * supervisor/learner accounts the product's actual workflows need — the only prior options
 * were a dev-only demo seed script with a hard-coded password, or nothing. No hard-coded
 * credentials: the admin sets each account's initial password directly.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (context.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, email, password, role } = await request.json();
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'name, email, password, and role are required.' },
        { status: 400 },
      );
    }
    if (!CREATABLE_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `role must be one of: ${CREATABLE_ROLES.join(', ')}` },
        { status: 400 },
      );
    }
    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return NextResponse.json({ error: strength.errors.join(' ') }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const created = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role,
        organizationMemberships: {
          create: { organizationId: context.organizationId, role },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actor: context.userId,
        action: 'user_created',
        object: 'User',
        objectId: created.id,
        details: JSON.stringify({
          email: normalizedEmail,
          role,
          organizationId: context.organizationId,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json(
      { success: true, user: { id: created.id, name: created.name, email: created.email, role: created.role } },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
