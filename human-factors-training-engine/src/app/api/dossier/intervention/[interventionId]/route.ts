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
import { DefenseDossier } from '@/services/DefenseDossier';
import { renderDossierHtml } from '@/lib/dossierHtmlRenderer';
import { hasAnyRole, OVERSIGHT_ROLES, TRAINING_MANAGEMENT_ROLES } from '@/lib/authorization';

/**
 * GET /api/dossier/intervention/:interventionId
 * GET /api/dossier/intervention/:interventionId?format=html — printable HTML (browser
 * print-to-PDF; native PDF deferred, see DECISIONS.md D-025)
 * Default: canonical JSON.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ interventionId: string }> }) {
  try {
    const context = await getRequestContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasAnyRole(context.role, [...OVERSIGHT_ROLES, ...TRAINING_MANAGEMENT_ROLES])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { interventionId } = await params;
    const dossierService = new DefenseDossier(prisma, context.organizationId);
    const output = await dossierService.buildDossier({
      type: 'intervention',
      interventionId,
    });

    await prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actor: context.userId,
        action: 'dossier_generated',
        object: 'LearningIntervention',
        objectId: interventionId,
        details: JSON.stringify({ scope: 'intervention', packageHash: output.sections.integrityAttestation.packageHash }),
      },
    });

    const format = request.nextUrl.searchParams.get('format');
    if (format === 'html') {
      return new NextResponse(renderDossierHtml(output), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return NextResponse.json(output);
  } catch (error) {
    console.error('Error generating dossier:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('No LearningIntervention found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
