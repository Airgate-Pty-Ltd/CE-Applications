/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { prisma } from '@/lib/db';
import { normalizeRelativeIngestionPath, OrganizationFileIngestion } from '@/services/OrganizationFileIngestion';

describe('dual-mode organization file ingestion', () => {
  const testTag = `file-ingestion-${Date.now()}`;
  let sourceId: string;

  beforeAll(async () => {
    const source = await prisma.ingestionSource.create({
      data: {
        organizationId: 'tenant_001',
        name: testTag,
        mode: 'web_upload',
      },
    });
    sourceId = source.id;
  });

  afterAll(async () => {
    await prisma.ingestionSource.delete({ where: { id: sourceId } });
  });

  test('accepts UTF-8 organization data and deduplicates by tenant hash', async () => {
    const service = new OrganizationFileIngestion(prisma);
    const params = {
      organizationId: 'tenant_001',
      sourceId,
      relativePath: 'roster/people.csv',
      originalName: 'people.csv',
      content: Buffer.from(`employee_id,role\n${testTag},technician\n`),
      scan: { status: 'SKIPPED' as const, scanner: 'test' },
      createdBy: 'test@example.com',
      recordType: 'organizational_data' as const,
    };
    const first = await service.ingest(params);
    expect(first.file.status).toBe('ACCEPTED');
    expect(first.file.extractedText).toContain(testTag);
    expect(first.file.evidenceId).toBeNull();

    const second = await service.ingest({ ...params, relativePath: 'duplicate/people-copy.csv' });
    expect(second.duplicate).toBe(true);
    expect(second.file.id).toBe(first.file.id);
  });

  test('rejects unsafe paths and an EICAR test signature', async () => {
    expect(() => normalizeRelativeIngestionPath('../outside.csv')).toThrow('unsafe');
    const result = await new OrganizationFileIngestion(prisma).ingest({
      organizationId: 'tenant_001',
      sourceId,
      relativePath: 'quarantine/eicar.txt',
      originalName: 'eicar.txt',
      content: Buffer.from(`${testTag}-X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR`),
      scan: { status: 'SKIPPED', scanner: 'test' },
      createdBy: 'test@example.com',
    });
    expect(result.file.status).toBe('REJECTED_MALWARE');
    expect(result.file.content).toBeNull();
  });
});
