/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { toDb, fromDb, toDbArray, fromDbArray } from '@/lib/json';

// D-067: leaf-condition evaluation used to delegate to @mai/kernel's evaluate(). The Kernel-
// MASTER repo was reconstructed from scratch (old source lost, Milestone 1 rebuilt it
// differently) and no longer exposes a standalone evaluator - condition evaluation now lives
// in the new kernel's RulesEngine, which is (a) not part of its public exports/barrel and (b)
// not actually viable for this file's use even if it were: RulesEngine's linked_record_* ops
// require a live-DB MAIHostAdapter.listLinkedRecords() call scoped to RecordType 'ncr'|'car',
// whereas this file's `link` conditions are plain snapshot-field presence checks, no DB, no
// adapter, no record-type concept. Rather than depend on internals of a repo this project
// doesn't own that have already changed shape once, the 13-operator/3-composite grammar is
// now evaluated fully in-house (evaluateLeaf() below) - small, self-contained, and matches
// exactly what MaiKernel.rules.test.ts's 42 cases already require. A minimal local Clock
// replaces @mai/kernel's SystemClock so date_before_today/date_after_today still use an
// injected clock rather than ambient new Date() (the real bug D-065 fixed - that fix is kept,
// just no longer borrowed from an external package).
interface Clock {
  now(): Date;
}

class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

interface RuleCondition {
  operator: string;
  [key: string]: unknown;
}

interface RuleAction {
  operator: string;
  [key: string]: unknown;
}

interface Rule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  severity: string;
  approvedBy: string;
  approvedAt: string;
}

interface RuleManifest {
  id: string;
  version: number;
  rules: Rule[];
  effectiveDate: string;
}

interface EventSnapshot {
  eventId: string;
  themes: string[];
  rolesExposed: string[];
  timestamp: string;
  [key: string]: unknown;
}

interface SystemCondition {
  ruleId: string;
  ruleName: string;
  severity: string;
  rationale: string;
  suggestedAction?: string;
}

// M-AI Kernel: Deterministic, rules-only, no network, immutable snapshots
// DESIGN LAWS:
// 1. Rules-before-models: kernel is rules-only, no LLM, no randomness
// 2. No ungoverned authority (MAI-ARCH-003, supersedes MAI-ARCH-001 law 2's "every condition
//    surfaces for human decision"): this file's 14 seeded rules remain human-responded system-
//    detected conditions (unchanged by MAI-ARCH-003 - see D-067), but autonomous execution
//    elsewhere in this codebase (LessonAutoImplementationService) is now permitted within an
//    explicitly granted, versioned Authority Profile, without per-instance approval.
// 3. Fail-quiet: kernel errors disable kernel, not host app
// 4. Everything persists: all processing logged, all decisions immutable

export class MaiKernel {
  private clock: Clock;

  // D-065: clock is optional and defaults to SystemClock so every existing call site
  // (`new MaiKernel(prisma)`) keeps working unchanged. Tests needing deterministic
  // date-operator behavior can inject a FixedClock from '@mai/kernel'.
  constructor(private prisma: PrismaClient, clock?: Clock) {
    this.clock = clock ?? new SystemClock();
  }

  // Process a frozen event snapshot against rule manifest
  // Returns: array of system-detected conditions (advisory, not authoritative)
  async processEvent(
    tenantId: string,
    ruleManifestId: string,
    eventSnapshot: EventSnapshot
  ): Promise<SystemCondition[]> {
    let maiEventId: string | null = null;
    try {
      // Step 1: Compute snapshot hash (immutability proof)
      const snapshotHash = this.hashSnapshot(eventSnapshot);

      // Step 2: Resolve the governed rule version before recording the immutable event.
      // A snapshot may be intentionally re-evaluated under a newer published manifest.
      const ruleManifest = await this.prisma.maiRuleManifest.findFirst({
        where: {
          id: ruleManifestId,
          tenantId,
          status: "PUBLISHED",
          effectiveDate: { lte: new Date() },
          OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
        },
      });

      if (!ruleManifest) {
        throw new Error(`No active rule manifest found: ${ruleManifestId}`);
      }

      // Step 3: Check idempotency for this exact snapshot + manifest version.
      const existingMaiEvent = await this.prisma.maiEvent.findUnique({
        where: {
          tenantId_ruleManifestId_snapshotHash: {
            tenantId,
            ruleManifestId,
            snapshotHash,
          },
        },
      });

      if (existingMaiEvent) {
        // Already processed; return existing conditions
        return await this.getSystemConditions(tenantId, existingMaiEvent.id);
      }

      // Step 4: Create immutable mai_event snapshot
      const maiEvent = await this.prisma.maiEvent.create({
        data: {
          tenantId,
          ruleManifestId,
          snapshotJson: toDb(eventSnapshot),
          snapshotHash,
          processedAt: new Date(),
        },
      });
      maiEventId = maiEvent.id;

      // Step 5: Evaluate each rule (JSON-based, no executable strings)
      const conditions: SystemCondition[] = [];
      const rules = fromDbArray<Rule>(ruleManifest.rules);

      for (const rule of rules) {
        try {
          const { result: matches, confidence } = this.evaluateConditions(
            rule.conditions,
            eventSnapshot
          );

          if (matches) {
            // Rule fired: execute actions
            for (const action of rule.actions) {
              const actionOp = (action as Record<string, unknown>).operator as string;
              if (actionOp === "surface_system_condition") {
                const condition = await this.executeAction(
                  action,
                  rule,
                  tenantId,
                  ruleManifestId,
                  maiEvent.id,
                  eventSnapshot,
                  snapshotHash,
                  confidence
                );
                if (condition) {
                  conditions.push(condition);
                }
              }
            }
          }
        } catch (error) {
          // Log rule error but don't block kernel
          await this.prisma.maiErrorLog.create({
            data: {
              tenantId,
              eventId: maiEvent.id,
              ruleId: rule.id,
              errorType: "rule_eval_error",
              errorMessage: `Rule evaluation failed: ${String(error)}`,
            },
          });
        }
      }

      return conditions;
    } catch (error) {
      // Kernel-level error: disable kernel, log, fail-quiet
      console.error("[MaiKernel] Fatal error:", error);
      if (maiEventId) {
        await this.prisma.maiErrorLog.create({
          data: {
            tenantId,
            eventId: maiEventId,
            ruleId: null,
            errorType: "system_error",
            errorMessage: `Kernel fatal error: ${String(error)}`,
          },
        }).catch((logError) => console.error("[MaiKernel] Fatal-error audit failed:", logError));
      }
      return [];
    }
  }

  // Evaluate rule conditions against event snapshot (closed operator grammar only)
  private evaluateConditions(
    conditions: RuleCondition[],
    snapshot: EventSnapshot
  ): { result: boolean; confidence: "high" | "medium" | "low" } {
    // All conditions must be true (AND logic)
    let minConfidence: "high" | "medium" | "low" = "high";

    for (const condition of conditions) {
      const { result, confidence } = this.evaluateOperator(condition, snapshot);
      if (!result) {
        return { result: false, confidence };
      }
      // Track minimum confidence across all conditions
      if (confidence === "low") minConfidence = "low";
      else if (confidence === "medium" && minConfidence === "high") minConfidence = "medium";
    }

    return { result: true, confidence: minConfidence };
  }

  // Public wrapper for direct rule-condition testing. Pure function, no DB access,
  // no side effects — exposes the same evaluator processEvent() uses internally so
  // registry tests can execute real rule conditions against real snapshots.
  evaluateCondition(
    condition: RuleCondition,
    snapshot: EventSnapshot
  ): { result: boolean; confidence: "high" | "medium" | "low" } {
    return this.evaluateOperator(condition, snapshot);
  }

  // D-065: composite operators (all/any/not) stay handled locally, exactly as before this
  // migration - only LEAF operators delegate to @mai/kernel's evaluate(). This is deliberate,
  // not a half-migration: @mai/kernel's own `not` propagates INDETERMINATE/ERROR through
  // negation unchanged (never inverts them - by its own design, negating "unknown" isn't
  // "known"), whereas this file's `not` has always done a clean boolean invert regardless of
  // confidence. That difference is not cosmetic - HFSRC-005 ("no content may publish unless
  // APPROVED") relies on exactly the old behavior: a missing contentStatus field defaults to
  // "not approved" (false on the leaf `in` check), and `not` inverts that to "fires" (blocks
  // publication) - a fail-closed reading appropriate for a publication gate. Delegating `not`
  // itself to @mai/kernel would silently change that to "indeterminate, does not fire" for a
  // missing field, which is a real behavior regression on an approved governance rule, caught
  // by MaiKernel.rules.test.ts's own HFSRC-005 MISSING case - not by reasoning about it, by
  // running it.
  private evaluateOperator(
    condition: RuleCondition,
    snapshot: EventSnapshot
  ): { result: boolean; confidence: "high" | "medium" | "low" } {
    if ("all" in condition) {
      const conditions = condition.all as RuleCondition[];
      if (!Array.isArray(conditions)) return { result: false, confidence: "low" };

      let minConfidence: "high" | "medium" | "low" = "high";
      for (const subcond of conditions) {
        const { result, confidence } = this.evaluateOperator(subcond, snapshot);
        if (!result) return { result: false, confidence };
        if (confidence === "low") minConfidence = "low";
        else if (confidence === "medium" && minConfidence === "high") minConfidence = "medium";
      }
      return { result: true, confidence: minConfidence };
    }

    if ("any" in condition) {
      const conditions = condition.any as RuleCondition[];
      if (!Array.isArray(conditions)) return { result: false, confidence: "low" };

      let maxConfidence: "high" | "medium" | "low" = "low";
      for (const subcond of conditions) {
        const { result, confidence } = this.evaluateOperator(subcond, snapshot);
        if (result) return { result: true, confidence };
        if (confidence === "high") maxConfidence = "high";
        else if (confidence === "medium" && maxConfidence === "low") maxConfidence = "medium";
      }
      return { result: false, confidence: maxConfidence };
    }

    if ("not" in condition) {
      const inner = condition.not as RuleCondition;
      if (!inner) return { result: false, confidence: "low" };
      const { result, confidence } = this.evaluateOperator(inner, snapshot);
      return { result: !result, confidence };
    }

    // Leaf operator: evaluated in-house (D-067 - see file header for why this is no longer
    // delegated to @mai/kernel). Confidence is always computed the same way regardless of the
    // operator's outcome - high if the referenced field/link key is present in the snapshot,
    // medium otherwise - which already reproduces the old delegated evaluator's "INDETERMINATE
    // -> medium, false" behavior for every one of the 14 seeded rules: presence-check operators
    // (is_null/not_null/is_empty/not_empty/linked_record_*) treat a missing key identically to
    // an explicit null, and the value-comparison operators (eq/ne/in/length_*/date_*) evaluate
    // naturally-false against `undefined` for every case the seeded rules actually exercise.
    // Verified case-by-case against MaiKernel.rules.test.ts's 42 cases before writing this.
    try {
      const result = this.evaluateLeaf(condition, snapshot);
      return { result, confidence: this.checkConditionConfidence(condition, snapshot) };
    } catch (error) {
      console.error(`[MaiKernel] Evaluation error:`, error);
      return { result: false, confidence: "low" };
    }
  }

  // The 13-operator leaf grammar, evaluated directly against HF-ENGINE's own flat
  // EventSnapshot shape (field/link names are top-level snapshot keys - no adapter, no DB,
  // no linked-record query; `link` conditions are plain presence checks on a snapshot key,
  // same as `field` conditions, just named differently for readability in seed-kernel-rules.json).
  private evaluateLeaf(condition: RuleCondition, snapshot: EventSnapshot): boolean {
    const op = condition.op as string;
    const field = condition.field as string | undefined;
    const link = condition.link as string | undefined;
    const value = condition.value;
    const key = field ?? link;
    const v = key !== undefined ? snapshot[key] : undefined;

    switch (op) {
      case "is_null":
      case "linked_record_missing":
        return v === null || v === undefined;
      case "not_null":
      case "linked_record_exists":
        return v !== null && v !== undefined;
      case "is_empty":
        if (v === null || v === undefined) return true;
        if (typeof v === "string") return v.trim().length === 0;
        if (Array.isArray(v)) return v.length === 0;
        return false;
      case "not_empty":
        if (v === null || v === undefined) return false;
        if (typeof v === "string") return v.trim().length > 0;
        if (Array.isArray(v)) return v.length > 0;
        return true;
      case "eq":
        return v === value;
      case "ne":
        return v !== value;
      case "in":
        return Array.isArray(value) && (value as unknown[]).includes(v);
      case "length_gte":
        if (typeof v === "string" || Array.isArray(v)) return (v as string | unknown[]).length >= (value as number);
        return false;
      case "length_lt":
        if (v === null || v === undefined) return true;
        if (typeof v === "string" || Array.isArray(v)) return (v as string | unknown[]).length < (value as number);
        return false;
      case "date_before_today": {
        if (!v) return false;
        const d = new Date(v as string);
        if (isNaN(d.getTime())) return false;
        const today = this.clock.now();
        today.setHours(0, 0, 0, 0);
        return d < today;
      }
      case "date_after_today": {
        if (!v) return false;
        const d = new Date(v as string);
        if (isNaN(d.getTime())) return false;
        const today = this.clock.now();
        today.setHours(23, 59, 59, 999);
        return d > today;
      }
      default:
        console.error(`[MaiKernel] Unknown operator: ${op}`);
        return false;
    }
  }

  // Check leaf-condition confidence: high if the referenced field/link exists, medium
  // otherwise. Unchanged from this file's pre-D-065 checkFieldConfidence/checkLinkConfidence,
  // merged into one method since every leaf condition has exactly one of field/link.
  private checkConditionConfidence(condition: RuleCondition, snapshot: EventSnapshot): "high" | "medium" {
    const link = condition.link as string | undefined;
    if (link) return link in snapshot ? "high" : "medium";
    const field = condition.field as string | undefined;
    if (field) return field in snapshot ? "high" : "medium";
    return "high";
  }

  // Execute action: surface_system_condition
  private async executeAction(
    action: RuleAction,
    rule: Rule,
    tenantId: string,
    ruleManifestId: string,
    maiEventId: string,
    eventSnapshot: EventSnapshot,
    snapshotHash: string,
    dataConfidence: "high" | "medium" | "low"
  ): Promise<SystemCondition | null> {
    try {
      const severity = (action as unknown as { severity?: string }).severity || "INFO";
      const rationale = (action as unknown as { rationale?: string }).rationale || "";

      // Store the exact frozen input and its content-derived hash on every condition.
      await this.prisma.maiSystemCondition.create({
        data: {
          tenantId,
          ruleManifestId,
          eventId: maiEventId,
          snapshotJson: toDb({ ...eventSnapshot, data_confidence: dataConfidence }),
          snapshotHash,
          ruleId: rule.id,
          ruleName: rule.name,
          severity,
          rationale,
          suggestedAction: action.suggestedAction as string | undefined,
          status: "NEW",
          detectedAt: new Date(),
        },
      });

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        severity,
        rationale,
        suggestedAction: action.suggestedAction as string | undefined,
      };
    } catch (error) {
      console.error("[MaiKernel] Action execution failed:", error);
      return null;
    }
  }

  // Retrieve system conditions for a mai_event
  private async getSystemConditions(
    tenantId: string,
    maiEventId: string
  ): Promise<SystemCondition[]> {
    const conditions = await this.prisma.maiSystemCondition.findMany({
      where: {
        tenantId,
        eventId: maiEventId,
      },
    });

    return conditions.map((c) => ({
      ruleId: c.ruleId,
      ruleName: c.ruleName,
      severity: c.severity,
      rationale: c.rationale,
      suggestedAction: c.suggestedAction || undefined,
    }));
  }

  // Compute SHA-256 hash of snapshot (integrity verification)
  private hashSnapshot(snapshot: EventSnapshot): string {
    const canonicalize = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(canonicalize);
      if (value !== null && typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, nested]) => [key, canonicalize(nested)])
        );
      }
      return value;
    };
    const json = JSON.stringify(canonicalize(snapshot));
    return crypto.createHash("sha256").update(json).digest("hex");
  }
}

// Singleton export
let kernelInstance: MaiKernel | null = null;

export function getMaiKernel(prisma: PrismaClient): MaiKernel {
  if (!kernelInstance) {
    kernelInstance = new MaiKernel(prisma);
  }
  return kernelInstance;
}
