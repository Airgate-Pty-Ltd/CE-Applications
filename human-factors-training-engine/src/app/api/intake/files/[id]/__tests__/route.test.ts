/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createUserSession } from '@/lib/session';
import { GET, POST } from '../route';

describe('controlled organizational-file review', () => {
  const prisma = new PrismaClient();
  const tag = `file-review-${crypto.randomUUID()}`;
  const priorSecret = process.env.SESSION_SECRET;
  let organizationId: string;
  let otherOrganizationId: string;
  let userId: string;
  let fileId: string;
  let otherFileId: string;
  let sessionToken: string;
  let evidenceId: string | null = null;

  beforeAll(async () => {
    process.env.SESSION_SECRET = 'file-review-test-session-secret-at-least-32-bytes';
    const organization = await prisma.organization.create({ data: { slug: tag, name: tag } });
    const other = await prisma.organization.create({ data: { slug: `${tag}-other`, name: `${tag}-other` } });
    organizationId = organization.id;
    otherOrganizationId = other.id;
    const user = await prisma.user.create({
      data: {
        email: `${tag}@example.com`,
        passwordHash: 'x',
        name: 'Review QM',
        role: 'qm',
        organizationMemberships: { create: { organizationId, role: 'qm' } },
      },
    });
    userId = user.id;
    const source = await prisma.ingestionSource.create({ data: { organizationId, name: tag, mode: 'web_upload' } });
    const otherSource = await prisma.ingestionSource.create({ data: { organizationId: otherOrganizationId, name: `${tag}-other`, mode: 'web_upload' } });
    const file = await prisma.ingestionFile.create({
      data: {
        organizationId,
        sourceId: source.id,
        relativePath: 'training/lesson.csv',
        originalName: 'lesson.csv',
        mediaType: 'text/csv',
        sizeBytes: 42,
        contentHash: crypto.createHash('sha256').update(tag).digest('hex'),
        extractedText: 'theme,observation\nfatigue,missed handoff',
        classification: 'INTERNAL',
        status: 'ACCEPTED',
        malwareScanStatus: 'CLEAN',
        createdBy: user.email,
      },
    });
    fileId = file.id;
    const otherFile = await prisma.ingestionFile.create({
      data: {
        organizationId: otherOrganizationId,
        sourceId: otherSource.id,
        relativePath: 'private.txt',
        originalName: 'private.txt',
        sizeBytes: 7,
        contentHash: crypto.createHash('sha256').update(`${tag}-other`).digest('hex'),
        extractedText: 'private',
        status: 'ACCEPTED',
        malwareScanStatus: 'CLEAN',
        createdBy: 'other',
      },
    });
    otherFileId = otherFile.id;
    sessionToken = (await createUserSession(userId, 'file-review-test', organizationId)).token;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { organizationId } });
    if (evidenceId) {
      await prisma.evidenceClassification.deleteMany({ where: { evidenceId } });
      await prisma.hfEvidence.deleteMany({ where: { id: evidenceId } });
    }
    await prisma.ingestionFile.deleteMany({ where: { organizationId: { in: [organizationId, otherOrganizationId] } } });
    await prisma.ingestionSource.deleteMany({ where: { organizationId: { in: [organizationId, otherOrganizationId] } } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.organization.deleteMany({ where: { id: { in: [organizationId, otherOrganizationId] } } });
    await prisma.$disconnect();
    if (priorSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorSecret;
  });

  const request = (url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) => new NextRequest(url, {
    method: init?.method,
    body: init?.body,
    headers: { cookie: `session=${sessionToken}`, ...(init?.headers || {}) },
  });

  test('returns the controlled preview for the current organization and hides another tenant', async () => {
    const own = await GET(request(`http://localhost/api/intake/files/${fileId}`), { params: Promise.resolve({ id: fileId }) });
    expect(own.status).toBe(200);
    expect((await own.json()).file.extractedText).toContain('missed handoff');

    const other = await GET(request(`http://localhost/api/intake/files/${otherFileId}`), { params: Promise.resolve({ id: otherFileId }) });
    expect(other.status).toBe(404);
  });

  test('requires a named human action to promote the staged file and remains idempotent', async () => {
    const body = { action: 'promote_to_evidence', title: `${tag} missed handoff`, occurredAt: '2026-08-13', themes: ['fatigue', 'handoff'] };
    const first = await POST(request(`http://localhost/api/intake/files/${fileId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }), { params: Promise.resolve({ id: fileId }) });
    expect(first.status).toBe(201);
    evidenceId = (await first.json()).evidenceId;
    expect((await prisma.ingestionFile.findUniqueOrThrow({ where: { id: fileId } })).evidenceId).toBe(evidenceId);
    expect((await prisma.hfEvidence.findUniqueOrThrow({ where: { id: evidenceId! } })).tenantId).toBe(organizationId);

    const second = await POST(request(`http://localhost/api/intake/files/${fileId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }), { params: Promise.resolve({ id: fileId }) });
    expect((await second.json()).evidenceId).toBe(evidenceId);
    expect(await prisma.hfEvidence.count({ where: { id: evidenceId! } })).toBe(1);
  });
});
