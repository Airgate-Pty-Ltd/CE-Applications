# Build Status — EASA Part-IS Self-Assessment Tool

**Status:** VERIFIED PUBLISH READY  
**Build Date:** 2026-09-03  
**File:** `easa-part-is-self-assessment.html` (35,449 bytes)

---

## Engine Test Results (7/7 PASS)

| Test | Scenario | Expected | Result |
|------|----------|----------|--------|
| T1 | All 28 = Yes | READY 100% | PASS |
| T2 | All 28 = No | NOT_READY, critFail=[1,2,6,26] | PASS |
| T3 | Q1 (critical) = No, rest Yes | NOT_READY override | PASS |
| T4 | Q26 (critical) = Partial, rest Yes | NOT_READY override | PASS |
| T5 | Mixed — criticals Yes, non-criticals mixed | READY (82%) | PASS |
| T6 | 4 questions N/A, rest Yes | N/A excluded from denominator, pct=100 | PASS |
| T7 | ~84% score, criticals Yes | READY | PASS |

**Verification method:** JavaScript engine logic extracted from HTML and tested via `node -e` inline execution. HTML extension not checkable by Node syntax-check; engine verified separately.

---

## Launch Blockers

1. Clause accuracy review — verify IS.D.OR clause numbers against published Reg. 2022/1645
2. Phased applicability dates — confirm which org types are in scope and when
3. Disclaimer language legal review before site publication

---

## Companion

Pairs with EASA Part-IS Starter Kit (Annex Quality, 2026-08-10) for bundle pricing at $299.
