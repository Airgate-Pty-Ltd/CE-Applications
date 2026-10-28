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
import seedRules from '../../../../../prisma/seed-kernel-rules.json';

/**
 * GET /api/authority-charter/:dimId — a DIM's Authority Charter, generated programmatically
 * from the approved rule JSON (prisma/seed-kernel-rules.json) rather than hand-authored prose,
 * per HF-ENGINE-PHASE1-KERNEL-RULES-Rev-A.md's closing instruction: "each DIM's Authority
 * Charter is generated programmatically from these rule JSONs so it cannot drift." Linked from
 * the Kernel Conditions panel (WP-3 screen 2).
 */
const DIM_NAMES: Record<string, string> = {
  'dim-hf-src': 'Source & Content Governance',
  'dim-hf-int': 'Intervention Appropriateness & Causal Control',
  'dim-hf-eff': 'Effectiveness & Closure Control',
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ dimId: string }> }) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { dimId } = await params;

  const allRules = seedRules.rules as Array<Record<string, unknown>>;
  const dimRules = allRules.filter((r) => r.dimId === dimId);

  if (dimRules.length === 0) {
    return NextResponse.json({ error: `Unknown or empty DIM: ${dimId}` }, { status: 404 });
  }

  return NextResponse.json({
    dimId,
    dimName: DIM_NAMES[dimId] || dimId,
    ruleSet: seedRules.ruleSet,
    revision: seedRules.revision,
    approvedBy: seedRules.approvedBy,
    approvalRef: seedRules.approvalRef,
    effectiveDate: seedRules.effectiveDate,
    rules: dimRules.map((r) => ({
      ruleId: r.ruleId,
      severity: r.severity,
      category: r.category,
      riskClass: r.riskClass,
      description: r.description,
      findingText: r.findingText,
      resolutionHint: r.resolutionHint,
      limitations: r.limitations,
    })),
  });
}
