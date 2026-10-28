/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';
import { toDb, fromDb } from '@/lib/json';

/**
 * Dual Approval Gate: Phase 2 governance increment
 * Product-safety items require two independent approvals before training assignment.
 *
 * Classification triggers: product-safety items marked in intervention metadata
 * Approval types: technical + compliance (or two independent QM reviewers)
 * Immutable: approval records frozen after recorded
 */
export interface ApprovalRecord {
  subjectId: string;
  decidedBy: string;
  approvalType: string;
  decision: 'PENDING' | 'APPROVED' | 'REJECTED';
  rationale: string;
  decidedAt: Date;
}

export class DualApprovalGate {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Check if intervention requires dual approval (by approvalType).
   */
  async requiresDualApproval(subjectId: string, tenantId: string): Promise<boolean> {
    const approval = await this.prisma.maiApproval.findFirst({
      where: {
        subjectId,
        approvalType: 'DUAL_PRODUCT_SAFETY',
        subjectType: 'LearningIntervention'
      }
    });

    return !!approval;
  }

  /**
   * Record approval.
   */
  async recordApproval(
    tenantId: string,
    subjectId: string,
    approvalType: string,
    decidedBy: string,
    decision: 'APPROVED' | 'REJECTED',
    rationale: string,
    conditionsImposed?: Record<string, unknown>
  ): Promise<ApprovalRecord> {
    // Record approval (immutable)
    const approval = await this.prisma.maiApproval.create({
      data: {
        tenantId,
        subjectId,
        subjectType: 'LearningIntervention',
        approvalType,
        decidedBy,
        decision,
        rationale,
        conditionsImposed: conditionsImposed ? toDb(conditionsImposed) : null,
        decidedAt: new Date()
      }
    });

    return {
      subjectId: approval.subjectId,
      decidedBy: approval.decidedBy || '',
      approvalType: approval.approvalType,
      decision: (approval.decision as any) || 'PENDING',
      rationale: approval.rationale || '',
      decidedAt: approval.decidedAt || new Date()
    };
  }

  /**
   * Check if intervention has both required approvals.
   */
  async isDualApprovalComplete(tenantId: string, subjectId: string): Promise<boolean> {
    const requiresDual = await this.requiresDualApproval(subjectId, tenantId);
    if (!requiresDual) return true; // Not required

    const approvals = await this.prisma.maiApproval.findMany({
      where: {
        tenantId,
        subjectId,
        subjectType: 'LearningIntervention'
      }
    });

    // Need at least 2 approve decisions
    const approved = approvals.filter(a => a.decision === 'APPROVED');
    if (approved.length < 2) return false;

    // Check for rejection (any rejection blocks assignment)
    const rejected = approvals.filter(a => a.decision === 'REJECTED');
    if (rejected.length > 0) return false;

    return true;
  }

  /**
   * Block training assignment if dual approval incomplete.
   */
  async canAssignTraining(tenantId: string, subjectId: string): Promise<{
    canAssign: boolean;
    reason?: string;
  }> {
    const requiresDual = await this.requiresDualApproval(subjectId, tenantId);

    if (!requiresDual) {
      return { canAssign: true };
    }

    const isComplete = await this.isDualApprovalComplete(tenantId, subjectId);

    if (!isComplete) {
      const approvals = await this.prisma.maiApproval.findMany({
        where: {
          tenantId,
          subjectId,
          subjectType: 'LearningIntervention'
        }
      });

      const rejected = approvals.find(a => a.decision === 'REJECTED');
      if (rejected) {
        return {
          canAssign: false,
          reason: `Rejected by ${rejected.decidedBy}: ${rejected.rationale}`
        };
      }

      return {
        canAssign: false,
        reason: `Awaiting dual approval (${approvals.length}/2 received)`
      };
    }

    return { canAssign: true };
  }
}

export const dualApprovalGateSingleton = (prisma: PrismaClient) =>
  new DualApprovalGate(prisma);
