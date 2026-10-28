/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import crypto from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/session';
import { OrganizationFileIngestion, maximumIngestionBytes } from '@/services/OrganizationFileIngestion';
import { scanFileForMalware } from '@/services/MalwareScanner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INGESTION_ROLES = new Set(['admin', 'trainer', 'qm']);

export async function GET(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const files = await prisma.ingestionFile.findMany({
    where: { organizationId: context.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      relativePath: true,
      originalName: true,
      mediaType: true,
      sizeBytes: true,
      contentHash: true,
      recordType: true,
      classification: true,
      status: true,
      malwareScanStatus: true,
      failureReason: true,
      evidenceId: true,
      createdAt: true,
      processedAt: true,
    },
  });
  return NextResponse.json({ files });
}

export async function POST(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!INGESTION_ROLES.has(context.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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

    const bytes = Buffer.from(await upload.arrayBuffer());
    const quarantineDir = path.join(os.tmpdir(), 'hf-engine-quarantine');
    await mkdir(quarantineDir, { recursive: true });
    temporaryPath = path.join(quarantineDir, crypto.randomUUID());
    await writeFile(temporaryPath, bytes, { flag: 'wx', mode: 0o600 });
    const scan = await scanFileForMalware(temporaryPath);

    const source = await prisma.ingestionSource.upsert({
      where: {
        organizationId_name: { organizationId: context.organizationId, name: 'web-upload' },
      },
      create: {
        organizationId: context.organizationId,
        name: 'web-upload',
        mode: 'web_upload',
      },
      update: { isEnabled: true },
    });
    const result = await new OrganizationFileIngestion(prisma).ingest({
      organizationId: context.organizationId,
      sourceId: source.id,
      relativePath: String(form.get('relativePath') || upload.name),
      originalName: upload.name,
      mediaType: upload.type || null,
      content: bytes,
      scan,
      createdBy: context.user.email,
      actorUserId: context.userId,
      recordType: form.get('recordType') === 'evidence' ? 'evidence' : 'organizational_data',
      classification: String(form.get('classification') || 'INTERNAL'),
    });
    const status = result.file.status.startsWith('REJECTED_') ? 422 : result.duplicate ? 200 : 201;
    return NextResponse.json({
      fileId: result.file.id,
      status: result.file.status,
      malwareScanStatus: result.file.malwareScanStatus,
      duplicate: result.duplicate,
      evidenceId: result.file.evidenceId,
      failureReason: result.file.failureReason,
    }, { status });
  } catch (error) {
    console.error('File ingestion error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'File ingestion failed.' }, { status: 400 });
  } finally {
    if (temporaryPath) await unlink(temporaryPath).catch(() => undefined);
  }
}
