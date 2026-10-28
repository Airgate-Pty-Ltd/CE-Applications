/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/session';
import { createConnectorToken, hashConnectorToken } from '@/lib/connectorTokens';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (context.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const devices = await prisma.connectorDevice.findMany({
    where: { organizationId: context.organizationId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, isActive: true, createdAt: true, lastSeenAt: true, revokedAt: true },
  });
  return NextResponse.json({ organizationId: context.organizationId, devices });
}

export async function POST(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (context.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 100) {
    return NextResponse.json({ error: 'Connector name must be between 1 and 100 characters.' }, { status: 400 });
  }

  const token = createConnectorToken();
  try {
    const device = await prisma.connectorDevice.create({
      data: {
        organizationId: context.organizationId,
        name,
        tokenHash: hashConnectorToken(token),
        createdBy: context.userId,
      },
      select: { id: true, name: true, createdAt: true },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actor: context.userId,
        action: 'hosted_connector_created',
        object: 'ConnectorDevice',
        objectId: device.id,
        details: JSON.stringify({ organizationId: context.organizationId, name }),
      },
    });
    // The raw token is returned once and never stored. Rotation creates a new device/token
    // and revokes the old one; it is not recoverable from the database.
    return NextResponse.json({ device, token }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A connector with this name already exists.' }, { status: 409 });
    }
    throw error;
  }
}
