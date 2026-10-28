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
import { AtomCompletionService } from '@/services/AtomCompletionService';
import { fromDbArray } from '@/lib/json';
import { AssignmentAssessmentService } from '@/services/AssignmentAssessmentService';

interface BaselineEntry {
  atomId: string;
  title?: string;
}

/** GET /api/my-training — learner assignment view + atom-based training player data (WP-3
 * screen 4). Always the logged-in learner's own assignments — no learnerId parameter accepted. */
export async function GET(request: NextRequest) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const completionService = new AtomCompletionService(prisma);
  const assessmentService = new AssignmentAssessmentService(prisma);

  const assignments = await prisma.trainingAssignment.findMany({
    where: { learnerId: context.userId },
    include: { manifest: true, intervention: true, assessment: { include: { attempts: true } }, certificate: true },
    orderBy: { assignedAt: 'desc' },
  });

  const result = await Promise.all(
    assignments.map(async (a) => {
      const baseline = fromDbArray<BaselineEntry>(a.manifest.baselineContent);
      const atoms = await prisma.learningAtom.findMany({ where: { id: { in: baseline.map((b) => b.atomId) } } });
      const completion = await completionService.getCompletionStatus(a.id);

      return {
        assignmentId: a.id,
        interventionTitle: a.intervention.title,
        status: a.status,
        dueDate: a.dueDate ? a.dueDate.toISOString() : null,
        manifestOutputHash: a.manifest.outputHash,
        atoms: atoms.map((atom) => ({
          id: atom.id,
          title: atom.title,
          objective: atom.objective,
          format: atom.format,
          duration: atom.duration,
          content: atom.content,
          completed: completion.completedAtomIds.includes(atom.id),
        })),
        readyForAssessment: completion.readyForAssessment && !!a.assessment,
        assessment: a.assessment ? {
          id: a.assessment.id,
          passingScore: a.assessment.passingScore,
          maxAttempts: a.assessment.maxAttempts,
          attemptsUsed: a.assessment.attempts.length,
          questions: assessmentService.publicSnapshot(a.assessment.questionSnapshot),
        } : null,
        assessmentConfigurationMissing: completion.readyForAssessment && !a.assessment,
        certificate: a.certificate ? {
          certificateCode: a.certificate.certificateCode,
          issuedAt: a.certificate.issuedAt.toISOString(),
          revokedAt: a.certificate.revokedAt?.toISOString() || null,
        } : null,
      };
    })
  );

  return NextResponse.json({ assignments: result });
}
