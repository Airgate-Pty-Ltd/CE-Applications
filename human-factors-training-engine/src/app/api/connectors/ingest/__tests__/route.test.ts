/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createConnectorToken, hashConnectorToken } from '@/lib/connectorTokens';
import { POST } from '../route';

describe('hosted outbound connector ingestion', () => {
  const tag = `hosted-connector-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let organizationId: string;
  let deviceId: string;
  let token: string;

  beforeAll(async () => {
    const organization = await prisma.organization.create({ data: { slug: tag, name: tag, deploymentMode: 'online' } });
    organizationId = organization.id;
    token = createConnectorToken();
    const device = await prisma.connectorDevice.create({
      data: { organizationId, name: 'Training share agent', tokenHash: hashConnectorToken(token), createdBy: 'test' },
    });
    deviceId = device.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { objectId: deviceId } });
    await prisma.organization.delete({ where: { id: organizationId } });
  });

  function request(contents: string, suppliedToken = token) {
    const form = new FormData();
    form.set('file', new Blob([contents], { type: 'text/csv' }), 'roster.csv');
    form.set('relativePath', 'training/roster.csv');
    form.set('sourceFileModifiedAt', '2026-08-14T12:00:00.000Z');
    return new NextRequest('http://localhost/api/connectors/ingest', {
      method: 'POST',
      headers: { authorization: `Bearer ${suppliedToken}` },
      body: form,
    });
  }

  test('accepts a scanned file under the device organization and records last-seen', async () => {
    const response = await POST(request(`employee_id,role\n${tag},technician\n`));
    expect(response.status).toBe(201);
    const body = await response.json();
    const file = await prisma.ingestionFile.findUniqueOrThrow({ where: { id: body.fileId } });
    expect(file.organizationId).toBe(organizationId);
    expect(file.createdBy).toBe(`CONNECTOR:${deviceId}`);
    expect(file.status).toBe('ACCEPTED');
    expect((await prisma.connectorDevice.findUniqueOrThrow({ where: { id: deviceId } })).lastSeenAt).not.toBeNull();
  });

  test('rejects the credential immediately after revocation', async () => {
    await prisma.connectorDevice.update({ where: { id: deviceId }, data: { isActive: false, revokedAt: new Date() } });
    const response = await POST(request('employee_id,role\nsecond,inspector\n'));
    expect(response.status).toBe(401);
  });

  test('rejects malformed bearer tokens without querying tenant data', async () => {
    const response = await POST(request('employee_id,role\nthird,qm\n', 'not-a-connector-token'));
    expect(response.status).toBe(401);
  });
});
