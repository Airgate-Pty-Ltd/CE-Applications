/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/session';
import { EvidenceIngestion } from '@/services/EvidenceIngestion';

export const dynamic = 'force-dynamic';
const REVIEW_ROLES = new Set(['admin', 'trainer', 'qm']);
const PROMOTION_ROLES = new Set(['admin', 'qm']);
const PREVIEW_LIMIT = 100_000;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!REVIEW_ROLES.has(context.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const file = await prisma.ingestionFile.findFirst({
    where: { id, organizationId: context.organizationId },
    select: {
      id: true,
      originalName: true,
      relativePath: true,
      mediaType: true,
      sizeBytes: true,
      contentHash: true,
      classification: true,
      recordType: true,
      status: true,
      malwareScanStatus: true,
      failureReason: true,
      extractedText: true,
      evidenceId: true,
      sourceFileModifiedAt: true,
      createdAt: true,
      source: { select: { name: true, mode: true } },
    },
  });
  if (!file) return NextResponse.json({ error: 'File not found.' }, { status: 404 });
  const extractedText = file.extractedText || '';
  return NextResponse.json({
    file: {
      ...file,
      extractedText: extractedText.slice(0, PREVIEW_LIMIT),
      extractedTextTruncated: extractedText.length > PREVIEW_LIMIT,
      extractedCharacterCount: extractedText.length,
    },
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!PROMOTION_ROLES.has(context.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const body = await request.json();
  if (body.action !== 'promote_to_evidence') return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const themes = Array.isArray(body.themes) ? body.themes.filter((value: unknown): value is string => typeof value === 'string').map((value: string) => value.trim()).filter(Boolean).slice(0, 30) : [];
  if (!title || title.length > 300) return NextResponse.json({ error: 'Evidence title must be between 1 and 300 characters.' }, { status: 400 });
  const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date();
  if (Number.isNaN(occurredAt.getTime())) return NextResponse.json({ error: 'occurredAt must be a valid date.' }, { status: 400 });

  try {
    const evidence = await prisma.$transaction(async (tx) => {
      const file = await tx.ingestionFile.findFirst({
        where: { id, organizationId: context.organizationId },
        include: { source: { select: { name: true } } },
      });
      if (!file) throw new Error('FILE_NOT_FOUND');
      if (file.evidenceId) return tx.hfEvidence.findFirstOrThrow({ where: { id: file.evidenceId, tenantId: context.organizationId } });
      if (file.status !== 'ACCEPTED' || !file.extractedText) throw new Error('FILE_NOT_REVIEWABLE');

      const result = await new EvidenceIngestion(tx).ingest({
        tenantId: context.organizationId,
        title,
        source: `${file.source.name}:${file.relativePath}`,
        sourceType: 'training_department_file',
        content: file.extractedText,
        classification: file.classification,
        occurredAt: body.occurredAt ? occurredAt : file.sourceFileModifiedAt || file.createdAt,
        createdBy: context.user.email,
        themes,
      });
      await tx.ingestionFile.update({ where: { id: file.id }, data: { recordType: 'evidence', evidenceId: result.evidence.id } });
      await tx.auditLog.create({
        data: {
          organizationId: context.organizationId,
          actor: context.userId,
          action: 'organizational_file_promoted_to_evidence',
          object: 'IngestionFile',
          objectId: file.id,
          details: JSON.stringify({ evidenceId: result.evidence.id, title, themes }),
        },
      });
      return result.evidence;
    });
    return NextResponse.json({ evidenceId: evidence.id, quarantineStatus: evidence.quarantineStatus }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'FILE_NOT_FOUND') return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    if (error instanceof Error && error.message === 'FILE_NOT_REVIEWABLE') return NextResponse.json({ error: 'Only accepted files with extracted text can be promoted.' }, { status: 409 });
    console.error('Organizational file promotion failed:', error);
    return NextResponse.json({ error: 'Evidence promotion failed.' }, { status: 400 });
  }
}
