/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/session';
import { AssignmentAssessmentService } from '@/services/AssignmentAssessmentService';

const ERROR_STATUS: Record<string, number> = {
  ASSIGNMENT_NOT_FOUND: 404,
  ASSESSMENT_ALREADY_PASSED: 409,
  ATOMS_INCOMPLETE: 409,
  ATTEMPTS_EXHAUSTED: 409,
  INVALID_RESPONSES: 400,
};

export async function POST(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { assignmentId, responses } = await request.json();
    if (!assignmentId || !Array.isArray(responses)) {
      return NextResponse.json({ error: 'assignmentId and responses are required.' }, { status: 400 });
    }
    const result = await new AssignmentAssessmentService(prisma).submit({
      assignmentId,
      learnerId: context.userId,
      tenantId: context.organizationId,
      responses,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Assessment submission failed.';
    return NextResponse.json({ error: message }, { status: ERROR_STATUS[message] || 500 });
  }
}
