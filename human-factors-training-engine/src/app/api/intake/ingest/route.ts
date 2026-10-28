/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { getRequestContext } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { EvidenceIngestion } from '@/services/EvidenceIngestion';
import { hasAnyRole, TRAINING_MANAGEMENT_ROLES } from '@/lib/authorization';

/** POST /api/intake/ingest — Source Intake & Review, step 1 (WP-3 screen 1). */
export async function POST(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAnyRole(context.role, TRAINING_MANAGEMENT_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { title, source, sourceType, content, classification, occurredAt, themes } = body;

    if (!title || !source || !content || !classification || !occurredAt) {
      return NextResponse.json({ error: 'title, source, content, classification, occurredAt are required' }, { status: 400 });
    }

    const ingestion = new EvidenceIngestion(prisma);
    const result = await ingestion.ingest({
      tenantId: context.organizationId,
      title,
      source,
      sourceType: sourceType || 'ncr',
      content,
      classification,
      occurredAt: new Date(occurredAt),
      createdBy: context.user.email,
      themes: Array.isArray(themes) ? themes : [],
    });

    return NextResponse.json({
      evidenceId: result.evidence.id,
      quarantineStatus: result.evidence.quarantineStatus,
      transitions: result.transitions,
      documentHash: result.documentHash,
      duplicateOfSourceId: result.duplicateOfSourceId,
    });
  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
