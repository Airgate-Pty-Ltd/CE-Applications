/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import crypto from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { connectorBearerToken, hashConnectorToken } from '@/lib/connectorTokens';
import { maximumIngestionBytes, OrganizationFileIngestion } from '@/services/OrganizationFileIngestion';
import { scanFileForMalware } from '@/services/MalwareScanner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = connectorBearerToken(request.headers.get('authorization'));
  if (!token) return NextResponse.json({ error: 'Invalid connector credential.' }, { status: 401 });
  const device = await prisma.connectorDevice.findFirst({
    where: { tokenHash: hashConnectorToken(token), isActive: true, revokedAt: null, organization: { isActive: true } },
  });
  if (!device) return NextResponse.json({ error: 'Invalid connector credential.' }, { status: 401 });

  let temporaryPath: string | null = null;
  try {
    const form = await request.formData();
    const upload = form.get('file');
    if (!(upload instanceof File)) {
      return NextResponse.json({ error: 'A multipart file field named file is required.' }, { status: 400 });
    }
    if (upload.size <= 0 || upload.size > maximumIngestionBytes()) {
      return NextResponse.json({ error: `File must be between 1 and ${maximumIngestionBytes()} bytes.` }, { status: 413 });
    }
    const relativePath = String(form.get('relativePath') || upload.name);
    const bytes = Buffer.from(await upload.arrayBuffer());
    const quarantineDir = path.join(os.tmpdir(), 'hf-engine-connector-quarantine');
    await mkdir(quarantineDir, { recursive: true });
    temporaryPath = path.join(quarantineDir, crypto.randomUUID());
    await writeFile(temporaryPath, bytes, { flag: 'wx', mode: 0o600 });
    const scan = await scanFileForMalware(temporaryPath);

    const sourceName = `hosted-connector:${device.id}`;
    const source = await prisma.ingestionSource.upsert({
      where: { organizationId_name: { organizationId: device.organizationId, name: sourceName } },
      create: { organizationId: device.organizationId, name: sourceName, mode: 'hosted_connector' },
      update: { isEnabled: true, mode: 'hosted_connector' },
    });
    const modifiedAtValue = form.get('sourceFileModifiedAt');
    const sourceFileModifiedAt = modifiedAtValue ? new Date(String(modifiedAtValue)) : undefined;
    if (sourceFileModifiedAt && Number.isNaN(sourceFileModifiedAt.getTime())) {
      return NextResponse.json({ error: 'sourceFileModifiedAt must be an ISO date.' }, { status: 400 });
    }
    const result = await new OrganizationFileIngestion(prisma).ingest({
      organizationId: device.organizationId,
      sourceId: source.id,
      relativePath,
      originalName: upload.name,
      mediaType: upload.type || null,
      content: bytes,
      scan,
      createdBy: `CONNECTOR:${device.id}`,
      recordType: form.get('recordType') === 'evidence' ? 'evidence' : 'organizational_data',
      classification: String(form.get('classification') || 'INTERNAL'),
      sourceFileModifiedAt,
    });
    await prisma.connectorDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } });
    const status = result.file.status.startsWith('REJECTED_') ? 422 : result.duplicate ? 200 : 201;
    return NextResponse.json({
      fileId: result.file.id,
      status: result.file.status,
      duplicate: result.duplicate,
      malwareScanStatus: result.file.malwareScanStatus,
      failureReason: result.file.failureReason,
    }, { status });
  } catch (error) {
    console.error('Hosted connector ingestion error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Connector ingestion failed.' }, { status: 400 });
  } finally {
    if (temporaryPath) await unlink(temporaryPath).catch(() => undefined);
  }
}
