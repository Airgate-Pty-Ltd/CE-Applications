/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { MaiKernel } from "../MaiKernel";
import { PrismaClient } from "@prisma/client";
import * as seedRules from "../../../prisma/seed-kernel-rules.json";

/**
 * Per-rule POS / NEG / MISSING-DATA test cases, executed against the real
 * MaiKernel.evaluateCondition() — the same evaluator processEvent() uses in
 * production. Conditions are pulled live from prisma/seed-kernel-rules.json
 * (the approved Rev-A rule set), not re-typed in this file, so the tests
 * also catch drift between the approved rules and what ships.
 *
 * Convention (documented in RUN-JOURNAL, D-012):
 *   POS     = condition evaluates true with all referenced fields present (confidence "high")
 *   NEG     = condition evaluates false with all referenced fields present (confidence "high")
 *   MISSING = referenced field(s) absent from the snapshot entirely (not merely null),
 *             exercising the confidence downgrade to "medium" that data_confidence requires.
 */

type Condition = Record<string, unknown>;
type Snapshot = Record<string, unknown>;

interface RuleFixture {
  ruleId: string;
  condition: Condition;
}

function getRule(ruleId: string): RuleFixture {
  const rules = seedRules.rules as Array<Record<string, unknown>>;
  const rule = rules.find((r) => r.ruleId === ruleId);
  if (!rule) throw new Error(`Rule ${ruleId} not found in seed-kernel-rules.json`);
  return { ruleId, condition: rule.condition as Condition };
}

describe("MaiKernel Per-Rule Evaluation (42 cases: 14 rules x POS/NEG/MISSING)", () => {
  let prisma: PrismaClient;
  let kernel: MaiKernel;

  beforeAll(() => {
    prisma = new PrismaClient();
    kernel = new MaiKernel(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function evaluate(ruleId: string, snapshot: Snapshot) {
    const { condition } = getRule(ruleId);
    return kernel.evaluateCondition(condition as never, snapshot as never);
  }

  // ---------------------------------------------------------------------
  // HFSRC-001 — Source missing confidentiality classification
  // condition: { field: confidentialityClass, op: is_null }
  // ---------------------------------------------------------------------
  describe("HFSRC-001", () => {
    test("POS: confidentialityClass explicitly null -> fires, high confidence", () => {
      const r = evaluate("HFSRC-001", { confidentialityClass: null });
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("high");
    });
    test("NEG: confidentialityClass set -> does not fire, high confidence", () => {
      const r = evaluate("HFSRC-001", { confidentialityClass: "INTERNAL" });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("high");
    });
    test("MISSING: confidentialityClass key absent -> fires, medium confidence", () => {
      const r = evaluate("HFSRC-001", {});
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("medium");
    });
  });

  // ---------------------------------------------------------------------
  // HFSRC-002 — Restricted content routed toward external AI
  // condition: all[ confidentialityClass in [BURRANA_PRIVATE,CUSTOMER_PRIVATE], aiRoutingTarget eq external ]
  // ---------------------------------------------------------------------
  describe("HFSRC-002", () => {
    test("POS: restricted class routed external -> fires, high confidence", () => {
      const r = evaluate("HFSRC-002", {
        confidentialityClass: "BURRANA_PRIVATE",
        aiRoutingTarget: "external",
      });
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("high");
    });
    test("NEG: INTERNAL class routed external -> does not fire, high confidence", () => {
      const r = evaluate("HFSRC-002", {
        confidentialityClass: "INTERNAL",
        aiRoutingTarget: "external",
      });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("high");
    });
    test("MISSING: aiRoutingTarget absent -> does not fire, medium confidence", () => {
      const r = evaluate("HFSRC-002", { confidentialityClass: "BURRANA_PRIVATE" });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("medium");
    });
  });

  // ---------------------------------------------------------------------
  // HFSRC-003 — Duplicate source detected
  // condition: { field: duplicateOfSourceId, op: not_null }
  // ---------------------------------------------------------------------
  describe("HFSRC-003", () => {
    test("POS: duplicateOfSourceId set -> fires, high confidence", () => {
      const r = evaluate("HFSRC-003", { duplicateOfSourceId: "evidence-existing-001" });
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("high");
    });
    test("NEG: duplicateOfSourceId explicitly null -> does not fire, high confidence", () => {
      const r = evaluate("HFSRC-003", { duplicateOfSourceId: null });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("high");
    });
    test("MISSING: duplicateOfSourceId key absent -> does not fire, medium confidence", () => {
      const r = evaluate("HFSRC-003", {});
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("medium");
    });
  });

  // ---------------------------------------------------------------------
  // HFSRC-004 — AI-drafted content without source spans
  // condition: all[ aiAssisted eq true, link sourceSpans linked_record_missing ]
  // ---------------------------------------------------------------------
  describe("HFSRC-004", () => {
    test("POS: AI-assisted with no source spans -> fires, high confidence", () => {
      const r = evaluate("HFSRC-004", { aiAssisted: true, sourceSpans: null });
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("high");
    });
    test("NEG: AI-assisted with source spans linked -> does not fire, high confidence", () => {
      const r = evaluate("HFSRC-004", { aiAssisted: true, sourceSpans: "span-abc-001" });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("high");
    });
    test("MISSING: sourceSpans key absent -> fires, medium confidence", () => {
      const r = evaluate("HFSRC-004", { aiAssisted: true });
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("medium");
    });
  });

  // ---------------------------------------------------------------------
  // HFSRC-005 — Publication requested for unapproved content
  // condition: not{ field: contentStatus, op: in, value: [APPROVED] }
  // ---------------------------------------------------------------------
  describe("HFSRC-005", () => {
    test("POS: contentStatus DRAFT -> fires (blocked), high confidence", () => {
      const r = evaluate("HFSRC-005", { contentStatus: "DRAFT" });
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("high");
    });
    test("NEG: contentStatus APPROVED -> does not fire, high confidence", () => {
      const r = evaluate("HFSRC-005", { contentStatus: "APPROVED" });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("high");
    });
    test("MISSING: contentStatus key absent -> fires, medium confidence", () => {
      const r = evaluate("HFSRC-005", {});
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("medium");
    });
  });

  // ---------------------------------------------------------------------
  // HFSRC-006 — Mandatory assignment without approval record
  // condition: all[ assignmentType eq MANDATORY, link approvalRecord linked_record_missing ]
  // ---------------------------------------------------------------------
  describe("HFSRC-006", () => {
    test("POS: mandatory assignment with no approval -> fires, high confidence", () => {
      const r = evaluate("HFSRC-006", { assignmentType: "MANDATORY", approvalRecord: null });
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("high");
    });
    test("NEG: mandatory assignment with approval linked -> does not fire, high confidence", () => {
      const r = evaluate("HFSRC-006", {
        assignmentType: "MANDATORY",
        approvalRecord: "approval-001",
      });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("high");
    });
    test("MISSING: approvalRecord key absent -> fires, medium confidence", () => {
      const r = evaluate("HFSRC-006", { assignmentType: "MANDATORY" });
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("medium");
    });
  });

  // ---------------------------------------------------------------------
  // HFINT-001 — Training is the sole corrective action
  // condition: { field: otherCorrectiveControlsCount, op: eq, value: 0 }
  // ---------------------------------------------------------------------
  describe("HFINT-001", () => {
    test("POS: zero other corrective controls -> fires, high confidence", () => {
      const r = evaluate("HFINT-001", { otherCorrectiveControlsCount: 0 });
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("high");
    });
    test("NEG: other controls exist -> does not fire, high confidence", () => {
      const r = evaluate("HFINT-001", { otherCorrectiveControlsCount: 2 });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("high");
    });
    test("MISSING: field absent -> does not fire, medium confidence", () => {
      const r = evaluate("HFINT-001", {});
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("medium");
    });
  });

  // ---------------------------------------------------------------------
  // HFINT-002 — No documented competence gap
  // condition: any[ competenceGapIdentified is_null, competenceGapIdentified eq false ]
  // ---------------------------------------------------------------------
  describe("HFINT-002", () => {
    test("POS: competenceGapIdentified false -> fires, high confidence", () => {
      const r = evaluate("HFINT-002", { competenceGapIdentified: false });
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("high");
    });
    test("NEG: competenceGapIdentified true -> does not fire, high confidence", () => {
      const r = evaluate("HFINT-002", { competenceGapIdentified: true });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("high");
    });
    test("MISSING: field absent -> fires (is_null branch), medium confidence", () => {
      const r = evaluate("HFINT-002", {});
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("medium");
    });
  });

  // ---------------------------------------------------------------------
  // HFINT-003 — No effectiveness method defined
  // condition: any[ effectivenessMethod is_null, effectivenessMethod is_empty ]
  // ---------------------------------------------------------------------
  describe("HFINT-003", () => {
    test("POS: effectivenessMethod explicitly null -> fires, high confidence", () => {
      const r = evaluate("HFINT-003", { effectivenessMethod: null });
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("high");
    });
    test("NEG: effectivenessMethod set -> does not fire, high confidence", () => {
      const r = evaluate("HFINT-003", { effectivenessMethod: "workplace_transfer_observation" });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("high");
    });
    test("MISSING: field absent -> fires (is_null branch), medium confidence", () => {
      const r = evaluate("HFINT-003", {});
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("medium");
    });
  });

  // ---------------------------------------------------------------------
  // HFINT-004 — Same issue previously trained without improvement
  // condition: all[ priorTrainingExistsSameThemeProcess eq true, priorTrainingEffective eq false ]
  // ---------------------------------------------------------------------
  describe("HFINT-004", () => {
    test("POS: prior training existed and was ineffective -> fires, high confidence", () => {
      const r = evaluate("HFINT-004", {
        priorTrainingExistsSameThemeProcess: true,
        priorTrainingEffective: false,
      });
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("high");
    });
    test("NEG: no prior training on this theme/process -> does not fire, high confidence", () => {
      const r = evaluate("HFINT-004", {
        priorTrainingExistsSameThemeProcess: false,
        priorTrainingEffective: false,
      });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("high");
    });
    test("MISSING: priorTrainingEffective absent -> does not fire, medium confidence", () => {
      const r = evaluate("HFINT-004", { priorTrainingExistsSameThemeProcess: true });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("medium");
    });
  });

  // ---------------------------------------------------------------------
  // HFINT-005 — Content cites unverified cause without interim label
  // condition: all[ linkedEventCausalStatus in [...unverified states], interimAwarenessLabel eq false ]
  // ---------------------------------------------------------------------
  describe("HFINT-005", () => {
    test("POS: unverified causal status + no interim label -> fires, high confidence", () => {
      const r = evaluate("HFINT-005", {
        linkedEventCausalStatus: "SUSPECTED",
        interimAwarenessLabel: false,
      });
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("high");
    });
    test("NEG: VERIFIED causal status -> does not fire, high confidence", () => {
      const r = evaluate("HFINT-005", {
        linkedEventCausalStatus: "VERIFIED",
        interimAwarenessLabel: false,
      });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("high");
    });
    test("MISSING: interimAwarenessLabel absent -> does not fire, medium confidence", () => {
      const r = evaluate("HFINT-005", { linkedEventCausalStatus: "SUSPECTED" });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("medium");
    });
  });

  // ---------------------------------------------------------------------
  // HFEFF-001 — Closure requested on completion-only evidence
  // condition: all[ planTargetLevel in ["2","3","4"], highestEvidenceLevel eq "1" ]
  // ---------------------------------------------------------------------
  describe("HFEFF-001", () => {
    test("POS: target level 2+ with only completion evidence -> fires, high confidence", () => {
      const r = evaluate("HFEFF-001", { planTargetLevel: "2", highestEvidenceLevel: "1" });
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("high");
    });
    test("NEG: evidence matches target level -> does not fire, high confidence", () => {
      const r = evaluate("HFEFF-001", { planTargetLevel: "2", highestEvidenceLevel: "2" });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("high");
    });
    test("MISSING: highestEvidenceLevel absent -> does not fire, medium confidence", () => {
      const r = evaluate("HFEFF-001", { planTargetLevel: "2" });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("medium");
    });
  });

  // ---------------------------------------------------------------------
  // HFEFF-002 — Supervisor observation overdue
  // condition: all[ observationStatus eq OPEN, observationDueDate date_before_today ]
  // ---------------------------------------------------------------------
  describe("HFEFF-002", () => {
    test("POS: open observation past due date -> fires, high confidence", () => {
      const r = evaluate("HFEFF-002", {
        observationStatus: "OPEN",
        observationDueDate: "2020-01-01",
      });
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("high");
    });
    test("NEG: open observation due in the future -> does not fire, high confidence", () => {
      const r = evaluate("HFEFF-002", {
        observationStatus: "OPEN",
        observationDueDate: "2099-01-01",
      });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("high");
    });
    test("MISSING: observationDueDate absent -> does not fire, medium confidence", () => {
      const r = evaluate("HFEFF-002", { observationStatus: "OPEN" });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("medium");
    });
  });

  // ---------------------------------------------------------------------
  // HFEFF-003 — Frozen manifest modification attempted
  // condition: { field: manifestId, op: not_null }
  // ---------------------------------------------------------------------
  describe("HFEFF-003", () => {
    test("POS: manifestId present on modification-attempt event -> fires, high confidence", () => {
      const r = evaluate("HFEFF-003", { manifestId: "manifest-abc-001" });
      expect(r.result).toBe(true);
      expect(r.confidence).toBe("high");
    });
    test("NEG: manifestId explicitly null -> does not fire, high confidence", () => {
      const r = evaluate("HFEFF-003", { manifestId: null });
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("high");
    });
    test("MISSING: manifestId key absent -> does not fire, medium confidence", () => {
      const r = evaluate("HFEFF-003", {});
      expect(r.result).toBe(false);
      expect(r.confidence).toBe("medium");
    });
  });

  // ---------------------------------------------------------------------
  test("Sanity: exactly 14 rules covered, 42 cases total", () => {
    const rules = seedRules.rules as Array<Record<string, unknown>>;
    expect(rules).toHaveLength(14);
    const coveredRuleIds = [
      "HFSRC-001", "HFSRC-002", "HFSRC-003", "HFSRC-004", "HFSRC-005", "HFSRC-006",
      "HFINT-001", "HFINT-002", "HFINT-003", "HFINT-004", "HFINT-005",
      "HFEFF-001", "HFEFF-002", "HFEFF-003",
    ];
    expect(coveredRuleIds).toHaveLength(14);
    for (const id of coveredRuleIds) {
      expect(rules.some((r) => r.ruleId === id)).toBe(true);
    }
  });
});
