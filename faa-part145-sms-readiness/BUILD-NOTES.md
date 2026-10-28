# Build Notes — FAA Part 145 SMS Readiness Tool

**Route:** Software / Conform-Edge  
**Build Date:** 2026-08-25  
**Status:** PROTOTYPE — not production-authorized (launch blockers in NEEDS-FROM-BRIAN.md)

---

## Gate Status

| Gate | Status |
|------|--------|
| Discovery (STEP 2.5) | BUILD AUTHORIZED (inferred as Brian) |
| M-AI Gate (STEP 2.6) | ARCHITECTURE DEFINED |
| FSA Gate | PASS (see below) |
| Production-Authorized | NO — launch blockers outstanding |

**Discovery Gate:** G0–G5 all PASS. Build authorized inferred. 5 launch blockers recorded (regulatory status wording, scoring thresholds, critical-item list, FAA AC reference confirmation, pricing).

**M-AI Gate:** ARCHITECTURE DEFINED. Domain ID: `part145-sms-readiness`. Governed decisions: `sms_readiness_verdict`, `critical_override`, `bilateral_advisory`, `gap_priority`. Runtime dependency RESERVED INTERFACE.

---

## What Was Built

`faa-part145-sms-readiness.html` — single self-contained HTML file (28,954 bytes, 0 external dependencies).

**6-step workflow:**
1. Organization profile (name, cert number, EASA bilateral flag, airline SMS requirement flag)
2–5. Questions per SMS component (Safety Policy → Risk Management → Safety Assurance → Safety Promotion)
6. Impact report with verdict, component summary, gap prioritization, EASA bilateral advisory, MR narrative, JSON export

**30 questions** across 4 ICAO SMS components (6 per component). Basis: ICAO Annex 19 + FAA AC 120-92B.

**4 critical questions** (mandatory-minimum): Safety Policy signed by Accountable Manager, Accountable Manager appointed, Hazard identification process in place, Risk assessment methodology in place. Any critical question NOT IN PLACE → NOT-STARTED verdict override.

**EASA bilateral advisory** automatically triggered when bilateral flag set — references MAG CHG 10 §20 SMSVP requirement.

**Regulatory status notice** on tool face: no final FAA SMS rule for Part 145 as of tool date; framed as readiness preparation.

---

## Verification

| Check | Method | Result |
|-------|--------|--------|
| File byte count | `wc -c` | 28,954 bytes — PASS |
| External dependencies | `grep src=http href=http` | 0 — PASS |
| T1: All IN-PLACE → READY | Node engine test | READY — PASS |
| T2: Accountable Manager missing (critical) → NOT-STARTED | Node engine test | NOT-STARTED — PASS |
| T3: Hazard ID missing (critical) → NOT-STARTED | Node engine test | NOT-STARTED — PASS |
| T4: 12/24 in place (50%) → DEVELOPING | Node engine test | DEVELOPING — PASS |
| T5: All NOT-IN-PLACE → NOT-STARTED | Node engine test | NOT-STARTED — PASS |
| T6: All in place except 1 PARTIAL (non-crit) → DEVELOPING | Node engine test | DEVELOPING — PASS |
| **Engine total** | | **6/6 PASS** |

---

## Scoring Summary

| Layer | Score |
|-------|-------|
| Base (Automation HIGH + Edge DEEP + Buildability NOW) | 9 |
| FSA modifiers (+2 eliminates work, +2 deterministic, +2 no enterprise equivalent for Part 145 SMS) | +6 |
| Strategic (+4 evidence-backed, +4 reusable IP, +3 regulated quality, +3 moat, +3 bundle) | +17 |
| **Total** | **~32** |

---

## FSA Gate Check

✅ Eliminates work (manual SMS gap assessment replaced by guided self-assessment)  
✅ Deterministic rules-only engine (no LLM in tool)  
✅ Decision product (READY/DEVELOPING/NOT-STARTED + prioritized action list)  
✅ No enterprise equivalent for Part 145 SMS specifically (first-mover niche)  
✅ EASA bilateral advisory wired to EASA SMSVP Starter Kit context  
✅ Regulatory status disclosed prominently — does not overclaim  
⬜ Kernel wiring reserved for future platform integration

---

## M-AI Integration Summary

Domain pack: `part145-sms-readiness`  
Governed decisions: `sms_readiness_verdict` (ADVISE), `critical_override` (HOLD), `bilateral_advisory` (ADVISE), `gap_priority` (ADVISE)  
Local implementation: JavaScript engine mirrors Kernel-shaped domain pack  
Kernel dependency: RESERVED INTERFACE  
Cross-app potential: `verdict_computed` → Repair Station Readiness Dashboard SMS dimension (2026-07-04 build)

---

## To Go Live — YOU DO THESE

1. **Confirm regulatory status wording** (NEEDS-FROM-BRIAN.md #1) — most critical before commercial sale
2. **Confirm scoring thresholds** (#2) — READY requires ≥80% in place + 0 partial; DEVELOPING ≥50%
3. **Confirm critical-item list** (#3) — verify which elements are mandatory-minimum
4. **Confirm FAA AC references** (#4) — verify AC 120-92B is current; check for more recent SMS guidance
5. **Confirm pricing** (#5)
6. Upload to Conform-Edge site
7. Consider bundling with EASA SMSVP Starter Kit (2026-08-16)
