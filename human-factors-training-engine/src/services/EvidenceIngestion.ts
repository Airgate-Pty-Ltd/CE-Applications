/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient, HfEvidence, Prisma } from '@prisma/client';
import crypto from 'crypto';
import { toDbArray } from '@/lib/json';

/**
 * Evidence Ingestion: source quarantine pipeline (PHASE-1-SPECIFICATION.md §2 step 1, C-001).
 *
 * State machine: NEW -> INTEGRITY_VERIFIED -> EXTRACTED -> CLASSIFICATION_CONFIRMED -> ACCEPTED
 * Each transition is a separate, persisted write so the sequence is independently observable
 * (not just a final status jump). A hash is computed for integrity + duplicate detection.
 *
 * Malware scan: Phase 1 uses a dummy scanner (per spec §2 step 1: "dummy scanner for MVP") —
 * a deterministic content check, not a real AV engine. Documented, not hidden, as a limitation.
 */
export const QUARANTINE_STATES = [
  'NEW',
  'INTEGRITY_VERIFIED',
  'EXTRACTED',
  'CLASSIFICATION_CONFIRMED',
  'ACCEPTED',
] as const;
export type QuarantineState = (typeof QUARANTINE_STATES)[number];

export interface IngestResult {
  evidence: HfEvidence;
  transitions: Array<{ state: QuarantineState; at: string }>;
  documentHash: string;
  duplicateOfSourceId: string | null;
}

export class EvidenceIngestion {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  /**
   * Dummy malware scan (Phase 1 MVP per spec): rejects content containing an EICAR-style
   * test marker. Deterministic, no external engine — documented limitation, not a real scan.
   */
  private dummyMalwareScan(content: string): { clean: boolean; reason?: string } {
    const EICAR_MARKER = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR';
    if (content.includes(EICAR_MARKER)) {
      return { clean: false, reason: 'Dummy scanner matched EICAR test marker' };
    }
    return { clean: true };
  }

  async ingest(params: {
    tenantId: string;
    title: string;
    source: string;
    sourceType: string;
    content: string;
    classification: string;
    occurredAt: Date;
    createdBy: string;
    themes?: string[];
  }): Promise<IngestResult> {
    const transitions: Array<{ state: QuarantineState; at: string }> = [];
    const recordTransition = (state: QuarantineState) => {
      transitions.push({ state, at: new Date().toISOString() });
    };

    // State: NEW — create the row first so every subsequent transition is a real persisted write
    recordTransition('NEW');
    let evidence = await this.prisma.hfEvidence.create({
      data: {
        tenantId: params.tenantId,
        classification: params.classification,
        source: params.source,
        sourceType: params.sourceType,
        title: params.title,
        occurredAt: params.occurredAt,
        themes: toDbArray(params.themes || []),
        createdBy: params.createdBy,
        quarantineStatus: 'NEW',
      },
    });

    // State: malware scan gate (blocks before INTEGRITY_VERIFIED if dirty)
    const scan = this.dummyMalwareScan(params.content);
    if (!scan.clean) {
      evidence = await this.prisma.hfEvidence.update({
        where: { id: evidence.id },
        data: { quarantineStatus: 'REJECTED_MALWARE' },
      });
      throw new Error(`Ingestion rejected: ${scan.reason}`);
    }

    // State: INTEGRITY_VERIFIED — compute SHA-256 hash of content
    const documentHash = crypto.createHash('sha256').update(params.content).digest('hex');
    recordTransition('INTEGRITY_VERIFIED');
    evidence = await this.prisma.hfEvidence.update({
      where: { id: evidence.id },
      data: { documentHash, quarantineStatus: 'INTEGRITY_VERIFIED' },
    });

    // Duplicate detection (HFSRC-003 derived field): identical hash, different source id
    const duplicate = await this.prisma.hfEvidence.findFirst({
      where: {
        tenantId: params.tenantId,
        documentHash,
        id: { not: evidence.id },
      },
      select: { id: true },
    });

    // State: EXTRACTED — text extraction (Phase 1: content IS the extracted text; no OCR/parse step)
    recordTransition('EXTRACTED');
    evidence = await this.prisma.hfEvidence.update({
      where: { id: evidence.id },
      data: { description: params.content, quarantineStatus: 'EXTRACTED' },
    });

    // State: CLASSIFICATION_CONFIRMED — classification was supplied by the uploader (HFSRC-001
    // requires it to be non-null; this pipeline requires it as a required param, so it is
    // always present by construction here — confirmed, not inferred).
    recordTransition('CLASSIFICATION_CONFIRMED');
    evidence = await this.prisma.hfEvidence.update({
      where: { id: evidence.id },
      data: { quarantineStatus: 'CLASSIFICATION_CONFIRMED' },
    });
    await this.prisma.evidenceClassification.create({
      data: {
        tenantId: params.tenantId,
        evidenceId: evidence.id,
        classification: params.classification,
        classifiedBy: params.createdBy,
      },
    });

    // State: ACCEPTED — final state
    recordTransition('ACCEPTED');
    evidence = await this.prisma.hfEvidence.update({
      where: { id: evidence.id },
      data: { quarantineStatus: 'ACCEPTED' },
    });

    return {
      evidence,
      transitions,
      documentHash,
      duplicateOfSourceId: duplicate?.id ?? null,
    };
  }
}

export const evidenceIngestionSingleton = (prisma: PrismaClient) => new EvidenceIngestion(prisma);
