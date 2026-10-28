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

/**
 * D-067: direct unit tests for all 13 leaf operators, independent of the 42 seeded-rule
 * POS/NEG/MISSING cases (which only exercise the operators as used by the 14 approved rules -
 * e.g. `ne` and `length_lt` on an array are never hit by that suite). Hand-authored conditions,
 * not pulled from seed-kernel-rules.json.
 *
 * `cond()`/`snap()` mirror MaiKernel.rules.test.ts's own `as never` casts - RuleCondition's
 * exported `operator: string` field is unused by evaluateCondition() (which reads `.op`), and
 * EventSnapshot's required eventId/themes/rolesExposed/timestamp fields are irrelevant to leaf
 * evaluation itself, which only reads the fields each condition actually names.
 */
function cond(o: Record<string, unknown>) {
  return o as never;
}
function snap(o: Record<string, unknown>) {
  return o as never;
}

describe("MaiKernel in-house leaf evaluator (D-067) — direct operator coverage", () => {
  let kernel: MaiKernel;

  beforeAll(() => {
    kernel = new MaiKernel(new PrismaClient());
  });

  test("eq / ne", () => {
    expect(kernel.evaluateCondition(cond({ field: "x", op: "eq", value: 5 }), snap({ x: 5 })).result).toBe(true);
    expect(kernel.evaluateCondition(cond({ field: "x", op: "eq", value: 5 }), snap({ x: 6 })).result).toBe(false);
    expect(kernel.evaluateCondition(cond({ field: "x", op: "ne", value: 5 }), snap({ x: 6 })).result).toBe(true);
    expect(kernel.evaluateCondition(cond({ field: "x", op: "ne", value: 5 }), snap({ x: 5 })).result).toBe(false);
  });

  test("in", () => {
    expect(kernel.evaluateCondition(cond({ field: "x", op: "in", value: ["A", "B"] }), snap({ x: "A" })).result).toBe(true);
    expect(kernel.evaluateCondition(cond({ field: "x", op: "in", value: ["A", "B"] }), snap({ x: "C" })).result).toBe(false);
  });

  test("length_gte / length_lt on strings", () => {
    expect(kernel.evaluateCondition(cond({ field: "x", op: "length_gte", value: 3 }), snap({ x: "abc" })).result).toBe(true);
    expect(kernel.evaluateCondition(cond({ field: "x", op: "length_gte", value: 4 }), snap({ x: "abc" })).result).toBe(false);
    expect(kernel.evaluateCondition(cond({ field: "x", op: "length_lt", value: 4 }), snap({ x: "abc" })).result).toBe(true);
    expect(kernel.evaluateCondition(cond({ field: "x", op: "length_lt", value: 3 }), snap({ x: "abc" })).result).toBe(false);
  });

  test("length_gte / length_lt on arrays", () => {
    expect(kernel.evaluateCondition(cond({ field: "x", op: "length_gte", value: 2 }), snap({ x: ["a", "b"] })).result).toBe(true);
    expect(kernel.evaluateCondition(cond({ field: "x", op: "length_lt", value: 2 }), snap({ x: ["a"] })).result).toBe(true);
  });

  test("length_lt on a missing field is true (nothing is 'less than' undefined by omission - matches the seeded-rule convention)", () => {
    expect(kernel.evaluateCondition(cond({ field: "x", op: "length_lt", value: 3 }), snap({})).result).toBe(true);
  });

  test("is_empty / not_empty on strings and arrays", () => {
    expect(kernel.evaluateCondition(cond({ field: "x", op: "is_empty" }), snap({ x: "" })).result).toBe(true);
    expect(kernel.evaluateCondition(cond({ field: "x", op: "is_empty" }), snap({ x: "  " })).result).toBe(true); // trimmed
    expect(kernel.evaluateCondition(cond({ field: "x", op: "is_empty" }), snap({ x: "a" })).result).toBe(false);
    expect(kernel.evaluateCondition(cond({ field: "x", op: "is_empty" }), snap({ x: [] })).result).toBe(true);
    expect(kernel.evaluateCondition(cond({ field: "x", op: "not_empty" }), snap({ x: [1] })).result).toBe(true);
    expect(kernel.evaluateCondition(cond({ field: "x", op: "not_empty" }), snap({ x: [] })).result).toBe(false);
  });

  test("linked_record_exists / linked_record_missing use `link`, not `field`, as the snapshot key", () => {
    expect(kernel.evaluateCondition(cond({ link: "approval", op: "linked_record_exists" }), snap({ approval: "id-1" })).result).toBe(true);
    expect(kernel.evaluateCondition(cond({ link: "approval", op: "linked_record_exists" }), snap({ approval: null })).result).toBe(false);
    expect(kernel.evaluateCondition(cond({ link: "approval", op: "linked_record_missing" }), snap({})).result).toBe(true);
  });

  test("date_before_today / date_after_today use the injected Clock, not ambient new Date()", () => {
    const fixed = new Date("2026-06-15T00:00:00Z");
    const fixedClock = { now: () => fixed };
    const clockedKernel = new MaiKernel(new PrismaClient(), fixedClock as never);

    expect(clockedKernel.evaluateCondition(cond({ field: "d", op: "date_before_today", value: null }), snap({ d: "2020-01-01" })).result).toBe(true);
    expect(clockedKernel.evaluateCondition(cond({ field: "d", op: "date_before_today", value: null }), snap({ d: "2099-01-01" })).result).toBe(false);
    expect(clockedKernel.evaluateCondition(cond({ field: "d", op: "date_after_today", value: null }), snap({ d: "2099-01-01" })).result).toBe(true);
  });

  test("date_before_today on an invalid date string is false, not a thrown exception", () => {
    const r = kernel.evaluateCondition(cond({ field: "d", op: "date_before_today", value: null }), snap({ d: "not-a-date" }));
    expect(r.result).toBe(false);
  });

  test("unknown operator fails quiet: false result, low confidence, no throw", () => {
    const r = kernel.evaluateCondition(cond({ field: "x", op: "nonsense_operator" }), snap({ x: 1 }));
    expect(r.result).toBe(false);
  });
});
