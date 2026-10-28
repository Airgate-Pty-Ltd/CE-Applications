/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';
import { MaiKernel } from './MaiKernel';
import * as seedRules from '../../prisma/seed-kernel-rules.json';

/**
 * Kernel Self-Audit: Phase 2 governance increment
 *
 * Periodically run the REAL kernel evaluator against seeded defect snapshots to verify:
 * - Kernel is evaluating rules correctly
 * - No rule regressions
 * - No silent failures
 *
 * Fixed 2026-08-06 (see DECISIONS.md D-019): this previously never called the injected
 * MaiKernel instance at all — `actual_result` was hardcoded to equal `expected_result`
 * ("Simulate kernel evaluation... Placeholder: would come from kernel"), so every audit
 * always reported 100% pass regardless of whether the kernel actually caught anything. It
 * also logged to MaiErrorLog with eventId: '' (a required FK to MaiEvent), which always threw
 * and was silently swallowed inside the same try/catch that generated the fake finding —
 * meaning a real run produced DUPLICATE findings per defect (one fabricated "pass", one
 * caught-exception "fail"), neither of which reflected real kernel behavior.
 *
 * Records findings in AuditLog (not MaiErrorLog — same fix as AiAssist, D-017: MaiErrorLog
 * requires a real MaiEvent id, which a synthetic audit-run snapshot does not have).
 */
export interface AuditFinding {
  finding_id: string;
  severity: 'pass' | 'fail';
  rule_id: string;
  expected_result: boolean;
  actual_result: boolean;
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
}

interface SeededDefect {
  ruleId: string;
  name: string;
  snapshot: Record<string, unknown>;
  expectedViolation: boolean;
  evidence: string;
}

export class KernelSelfAudit {
  private prisma: PrismaClient;
  private kernel: MaiKernel;

  constructor(prisma: PrismaClient, kernel: MaiKernel) {
    this.prisma = prisma;
    this.kernel = kernel;
  }

  /**
   * Seeded defect test cases: known scenarios where the kernel MUST flag a rule.
   * Snapshots are constructed to actually trigger (or not trigger) each rule's real
   * condition, pulled live from prisma/seed-kernel-rules.json — not re-typed here.
   */
  private getSeededDefects(): SeededDefect[] {
    return [
      {
        ruleId: 'HFSRC-001',
        name: 'Missing source classification',
        snapshot: { confidentialityClass: null },
        expectedViolation: true,
        evidence: 'Source evidence entered review with no confidentiality classification',
      },
      {
        ruleId: 'HFINT-001',
        name: 'Training as sole control for an event',
        snapshot: { otherCorrectiveControlsCount: 0 },
        expectedViolation: true,
        evidence: 'Intervention approval requested with zero other corrective controls linked',
      },
      {
        ruleId: 'HFEFF-001',
        name: 'Closure requested on completion-only evidence for a higher-target plan',
        snapshot: { planTargetLevel: '3', highestEvidenceLevel: '1' },
        expectedViolation: true,
        evidence: 'Closure requested at WORKPLACE_TRANSFER target with only completion evidence',
      },
      // A negative control: a clean snapshot the kernel must NOT flag. Included so the audit
      // can't trivially "pass" by a kernel that fires on everything.
      {
        ruleId: 'HFSRC-001',
        name: 'Negative control: classification present',
        snapshot: { confidentialityClass: 'INTERNAL' },
        expectedViolation: false,
        evidence: 'Source evidence correctly classified before review',
      },
    ];
  }

  private getRuleCondition(ruleId: string): Record<string, unknown> {
    const rules = seedRules.rules as Array<Record<string, unknown>>;
    const rule = rules.find((r) => r.ruleId === ruleId);
    if (!rule) throw new Error(`Rule ${ruleId} not found in seed-kernel-rules.json`);
    return rule.condition as Record<string, unknown>;
  }

  /**
   * Run periodic audit: evaluate seeded defects against the REAL kernel evaluator.
   * Returns one finding per defect case, then persists a summary AuditLog entry per finding.
   */
  async runAudit(tenantId: string): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    const seededDefects = this.getSeededDefects();

    for (const defect of seededDefects) {
      const condition = this.getRuleCondition(defect.ruleId);
      const { result, confidence } = this.kernel.evaluateCondition(
        condition as never,
        defect.snapshot as never
      );

      const passed = result === defect.expectedViolation;

      const finding: AuditFinding = {
        finding_id: `audit-${defect.ruleId}-${defect.name.replace(/\s+/g, '-')}-${Date.now()}`,
        severity: passed ? 'pass' : 'fail',
        rule_id: defect.ruleId,
        expected_result: defect.expectedViolation,
        actual_result: result,
        confidence,
        evidence: defect.evidence,
      };
      findings.push(finding);

      await this.prisma.auditLog.create({
        data: {
          organizationId: tenantId,
          actor: null,
          action: 'kernel_self_audit_finding',
          object: 'MaiRuleManifest',
          objectId: defect.ruleId,
          details: JSON.stringify(finding),
        },
      });
    }

    return findings;
  }

  /**
   * Get audit health: summary of recent audit runs, read back from real persisted findings.
   */
  async getAuditHealth(
    tenantId: string,
    lookbackDays: number = 7
  ): Promise<{
    totalTests: number;
    passCount: number;
    failCount: number;
    health: 'green' | 'yellow' | 'red';
  }> {
    const cutoffDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        organizationId: tenantId,
        action: 'kernel_self_audit_finding',
        timestamp: { gte: cutoffDate },
      },
    });

    let passes = 0;
    let fails = 0;
    for (const log of logs) {
      const details = JSON.parse(log.details || '{}') as { severity?: string };
      if (details.severity === 'pass') passes++;
      else if (details.severity === 'fail') fails++;
    }
    const total = passes + fails || 1;

    const passRate = passes / total;
    const health = passRate >= 0.95 ? 'green' : passRate >= 0.8 ? 'yellow' : 'red';

    return {
      totalTests: passes + fails,
      passCount: passes,
      failCount: fails,
      health,
    };
  }
}

export const kernelSelfAuditSingleton = (prisma: PrismaClient, kernel: MaiKernel) =>
  new KernelSelfAudit(prisma, kernel);
