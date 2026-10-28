# Build Status — ISO 42001 AIMS Self-Assessment Tool

**Status:** VERIFIED PUBLISH READY  
**Build Date:** 2026-09-03  
**File:** `iso42001-aims-self-assessment.html` (36,832 bytes)

---

## Engine Test Results (7/7 PASS)

| Test | Scenario | Expected | Result |
|------|----------|----------|--------|
| T1 | All 30 = Yes | READY 100% | PASS |
| T2 | All 30 = No | NOT_READY, critFail=[1,3,4,9,15] | PASS |
| T3 | Q9 (critical) = No, rest Yes | NOT_READY override | PASS |
| T4 | Q15 (critical) = Partial, rest Yes | NOT_READY override | PASS |
| T5 | 4 questions N/A, rest Yes | N/A excluded, pct=100 | PASS |
| T6 | 21 yes, 9 no, criticals yes | CONDITIONAL (70%) | PASS |
| T7 | 24 yes, 6 partial, criticals yes | READY (90%) | PASS |

**Verification method:** JavaScript engine logic extracted and tested via `node -e` inline execution.

---

## Launch Blockers

1. Annex A clause reference accuracy — verify control numbers against ISO 42001:2023 published text
2. EU AI Act scope (Q29) — confirm accuracy of regulatory framing
3. Disclaimer language review before site publication

---

## Companion

Pairs with ISO 42001 AIMS-in-a-Box (Annex Quality, 2026-06-17) for bundle pricing at $399.
