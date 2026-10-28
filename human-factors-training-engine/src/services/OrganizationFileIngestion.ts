/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import crypto from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { EvidenceIngestion } from '@/services/EvidenceIngestion';
import type { MalwareScanResult } from '@/services/MalwareScanner';
import { extractDocumentText } from '@/services/DocumentTextExtractor';
const VALID_CLASSIFICATIONS = new Set([
  'PUBLIC',
  'INTERNAL',
  'CONFIDENTIAL',
  'RESTRICTED',
  'SYSTEM_PROPRIETARY',
  'ANNEX_QUALITY_IP',
  'CUSTOMER_CONFIDENTIAL',
  'EXPORT_CONTROLLED',
  'BURRANA_PRIVATE',
]);
const EICAR_MARKER = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR';

export function maximumIngestionBytes(): number {
  const configured = Number(process.env.HF_MAX_INGEST_BYTES || 20 * 1024 * 1024);
  if (!Number.isSafeInteger(configured) || configured < 1024 || configured > 100 * 1024 * 1024) {
    throw new Error('HF_MAX_INGEST_BYTES must be an integer between 1024 and 104857600.');
  }
  return configured;
}

export function normalizeRelativeIngestionPath(value: string): string {
  const normalized = value.split('\\').join('/').replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
    throw new Error('Ingestion path must be relative.');
  }
  const segments = normalized.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('Ingestion path contains an unsafe segment.');
  }
  return segments.join('/');
}

export class OrganizationFileIngestion {
  constructor(private prisma: PrismaClient) {}

  async ingest(params: {
    organizationId: string;
    sourceId: string;
    relativePath: string;
    originalName: string;
    mediaType?: string | null;
    content: Buffer;
    scan: MalwareScanResult;
    createdBy: string;
    actorUserId?: string;
    recordType?: 'organizational_data' | 'evidence';
    classification?: string;
    sourceFileModifiedAt?: Date;
  }) {
    const relativePath = normalizeRelativeIngestionPath(params.relativePath);
    if (params.content.byteLength > maximumIngestionBytes()) {
      throw new Error(`File exceeds the ${maximumIngestionBytes()} byte ingestion limit.`);
    }
    const classification = params.classification || 'INTERNAL';
    if (!VALID_CLASSIFICATIONS.has(classification)) throw new Error('Invalid classification.');
    const source = await this.prisma.ingestionSource.findFirst({
      where: { id: params.sourceId, organizationId: params.organizationId, isEnabled: true },
    });
    if (!source) throw new Error('Ingestion source not found or disabled.');

    const contentHash = crypto.createHash('sha256').update(params.content).digest('hex');
    const duplicate = await this.prisma.ingestionFile.findUnique({
      where: { organizationId_contentHash: { organizationId: params.organizationId, contentHash } },
    });
    if (duplicate) return { file: duplicate, duplicate: true };

    const signatureDetected = params.content.includes(Buffer.from(EICAR_MARKER, 'utf8'));
    const rejected = signatureDetected || params.scan.status === 'INFECTED' || params.scan.status === 'ERROR';
    let file = await this.prisma.ingestionFile.create({
      data: {
        organizationId: params.organizationId,
        sourceId: params.sourceId,
        relativePath,
        originalName: params.originalName,
        mediaType: params.mediaType,
        sizeBytes: params.content.byteLength,
        contentHash,
        content: rejected ? null : params.content,
        recordType: params.recordType || 'organizational_data',
        classification,
        status: rejected ? (signatureDetected || params.scan.status === 'INFECTED' ? 'REJECTED_MALWARE' : 'REJECTED_SCAN_ERROR') : 'SCANNED',
        malwareScanStatus: signatureDetected ? 'INFECTED' : params.scan.status,
        malwareScanner: signatureDetected ? 'built-in-eicar-gate' : params.scan.scanner,
        failureReason: rejected ? (signatureDetected ? 'EICAR test signature detected.' : params.scan.detail || 'Malware scan failed.') : null,
        sourceFileModifiedAt: params.sourceFileModifiedAt,
        createdBy: params.createdBy,
        processedAt: rejected ? new Date() : null,
      },
    });
    if (rejected) return { file, duplicate: false };

    try {
      const extraction = await extractDocumentText(params.originalName, params.content);
      const extractedText = extraction.text;
      let evidenceId: string | null = null;
      if ((params.recordType || 'organizational_data') === 'evidence') {
        const evidence = await new EvidenceIngestion(this.prisma).ingest({
          tenantId: params.organizationId,
          title: params.originalName,
          source: `${source.name}:${relativePath}`,
          sourceType: 'training_department_file',
          content: extractedText,
          classification,
          occurredAt: params.sourceFileModifiedAt || new Date(),
          createdBy: params.createdBy,
        });
        evidenceId = evidence.evidence.id;
      }
      file = await this.prisma.ingestionFile.update({
        where: { id: file.id },
        data: { extractedText, mediaType: extraction.mediaType, evidenceId, status: 'ACCEPTED', processedAt: new Date() },
      });
      await this.prisma.auditLog.create({
        data: {
          organizationId: params.organizationId,
          actor: params.actorUserId || null,
          action: 'organization_file_ingested',
          object: 'IngestionFile',
          objectId: file.id,
          details: JSON.stringify({ organizationId: params.organizationId, relativePath, contentHash, recordType: file.recordType }),
        },
      });
      return { file, duplicate: false };
    } catch (error) {
      file = await this.prisma.ingestionFile.update({
        where: { id: file.id },
        data: {
          status: 'REJECTED_EXTRACTION',
          failureReason: error instanceof Error ? error.message : 'Extraction failed.',
          processedAt: new Date(),
        },
      });
      return { file, duplicate: false };
    }
  }
}
