/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/session';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (context.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const changed = await prisma.connectorDevice.updateMany({
    where: { id, organizationId: context.organizationId, isActive: true },
    data: { isActive: false, revokedAt: new Date() },
  });
  if (changed.count !== 1) return NextResponse.json({ error: 'Active connector not found.' }, { status: 404 });
  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      actor: context.userId,
      action: 'hosted_connector_revoked',
      object: 'ConnectorDevice',
      objectId: id,
      details: JSON.stringify({ organizationId: context.organizationId }),
    },
  });
  return NextResponse.json({ success: true });
}
