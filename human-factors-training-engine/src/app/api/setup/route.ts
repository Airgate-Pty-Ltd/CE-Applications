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
import { hashPassword, validateEmail, validatePasswordStrength } from '@/lib/auth';
import { createUserSession, sessionCookieOptions } from '@/lib/session';
import { SESSION_COOKIE_NAME } from '@/lib/sessionToken';
import { provisionApprovedKernelManifest } from '@/lib/kernelRuleManifest';
import { provisionLessonAuthorityProfile } from '@/lib/authorityProfile';
import crypto from 'node:crypto';

// force-dynamic — same reasoning as src/app/api/health/status/route.ts (DECISIONS.md D-050):
// this has no Next.js-detectable dynamic API usage, so without this it would be statically
// generated at build time and every request would see the build-time (always empty) user
// count, permanently reporting needsSetup:true even after the real admin is created.
export const dynamic = 'force-dynamic';

/**
 * GET /api/setup — reports whether first-run admin setup is still needed.
 * Standalone Packaging Directive G3: "creates an initial admin per a setup step (no
 * hard-coded credentials)". Public/unauthenticated by design (see middleware.ts) — a fresh
 * install has no session to check against yet.
 */
export async function GET() {
  const state = await prisma.installationState.findUnique({ where: { id: 'singleton' } });
  return NextResponse.json({ needsSetup: !state?.setupCompleted });
}

/**
 * POST /api/setup — creates the first admin account. Only succeeds when the database has
 * zero users; once any user exists, this route always refuses (409), so it cannot be reused
 * to mint a second admin after the fact. This is the ONLY path that creates an admin without
 * an existing admin's action — deliberately narrow.
 */
export async function POST(request: NextRequest) {
  try {
    const existingCount = await prisma.user.count();
    if (existingCount > 0) {
      return NextResponse.json(
        { error: 'Setup has already been completed for this installation.' },
        { status: 409 },
      );
    }

    const body = await request.json();
    const { email, password, name, organizationName } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Name, email, and password are required.' },
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
    const passwordHash = await hashPassword(password);
    const { admin, organization } = await prisma.$transaction(async (tx) => {
      const claimed = await tx.installationState.updateMany({
        where: { id: 'singleton', setupCompleted: false },
        data: { setupCompleted: true },
      });
      if (claimed.count !== 1) throw new Error('SETUP_ALREADY_COMPLETED');
      const existingOrganization = await tx.organization.findFirst({ orderBy: { createdAt: 'asc' } });
      const organization = existingOrganization
        ? await tx.organization.update({
            where: { id: existingOrganization.id },
            data: organizationName?.trim() ? { name: organizationName.trim() } : {},
          })
        : await tx.organization.create({
            data: {
              slug: `organization-${crypto.randomUUID()}`,
              name: organizationName?.trim() || 'Default Organization',
              deploymentMode: process.env.DEPLOYMENT_EDITION || 'onprem',
            },
          });
      const admin = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name,
          role: 'admin',
          organizationMemberships: {
            create: { organizationId: organization.id, role: 'admin' },
          },
        },
      });
      await provisionApprovedKernelManifest(tx, organization.id);
      await provisionLessonAuthorityProfile(tx);
      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          actor: admin.id,
          action: 'initial_admin_created',
          object: 'User',
          objectId: admin.id,
          details: JSON.stringify({
            email: normalizedEmail,
            organizationId: organization.id,
            timestamp: new Date().toISOString(),
          }),
        },
      });
      await tx.installationState.update({
        where: { id: 'singleton' },
        data: { initialAdminUserId: admin.id },
      });
      return { admin, organization };
    });

    const response = NextResponse.json(
      { success: true, user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } },
      { status: 201 },
    );
    const session = await createUserSession(admin.id, request.headers.get('user-agent'), organization.id);
    response.cookies.set(SESSION_COOKIE_NAME, session.token, sessionCookieOptions(session.maxAge));
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'SETUP_ALREADY_COMPLETED') {
      return NextResponse.json({ error: 'Setup has already been completed for this installation.' }, { status: 409 });
    }
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
