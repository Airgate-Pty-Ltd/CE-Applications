/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import type { Prisma, PrismaClient } from '@prisma/client';
import seedRules from '../../prisma/seed-kernel-rules.json';

type ManifestClient = PrismaClient | Prisma.TransactionClient;

interface SeedRule {
  ruleId: string;
  severity: string;
  description: string;
  findingText: string;
  resolutionHint: string;
  condition: Record<string, unknown>;
  approvedBy: string;
  effectiveDate: string;
}

export const APPROVED_KERNEL_RULE_VERSION = seedRules.version;

export const APPROVED_KERNEL_RULES = (seedRules.rules as SeedRule[]).map((rule) => ({
  id: rule.ruleId,
  name: rule.description,
  conditions: [rule.condition],
  actions: [{
    operator: 'surface_system_condition',
    severity: rule.severity.toUpperCase(),
    rationale: rule.findingText,
    suggestedAction: rule.resolutionHint,
  }],
  severity: rule.severity,
  approvedBy: rule.approvedBy,
  approvedAt: rule.effectiveDate,
}));

/** Provision the approved manifest for one explicit organization. Safe to rerun. */
export async function provisionApprovedKernelManifest(client: ManifestClient, tenantId: string) {
  if (!tenantId) throw new Error('A tenantId is required to provision the kernel rule manifest.');
  return client.maiRuleManifest.upsert({
    where: { tenantId_version: { tenantId, version: APPROVED_KERNEL_RULE_VERSION } },
    update: {
      status: 'PUBLISHED',
      rules: JSON.stringify(APPROVED_KERNEL_RULES),
      publishedBy: seedRules.approvedBy,
      publishedAt: new Date(seedRules.effectiveDate),
    },
    create: {
      tenantId,
      version: APPROVED_KERNEL_RULE_VERSION,
      status: 'PUBLISHED',
      effectiveDate: new Date(seedRules.effectiveDate),
      rules: JSON.stringify(APPROVED_KERNEL_RULES),
      createdBy: seedRules.approvedBy,
      publishedBy: seedRules.approvedBy,
      publishedAt: new Date(seedRules.effectiveDate),
    },
  });
}
