# Build Notes — Regulatory Change Impact Analyzer

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

**Discovery Gate:** G0–G5 all PASS. Build authorized inferred. 4 launch blockers recorded (taxonomy confirmation, urgency tier criteria, scope mapping review, pricing).

**M-AI Gate:** ARCHITECTURE DEFINED. Domain ID: `regulatory-change-impact`. Governed decisions: impact_scope, action_urgency, safety_override, action_plan. Runtime dependency RESERVED INTERFACE — static HTML, Kernel wiring pending platform host.

---

## What Was Built

`regulatory-change-impact-analyzer.html` — single self-contained HTML file (32,169 bytes, 0 external dependencies).

**3-step workflow:**
1. Change intake (authority, change type, title, effective date, safety flag, summary)
2. Scope selection (15 certification/approval types across AS/ISO/FAA/EASA/IATF/FDA/CAAC/UK CAA)
3. Impact report with urgency determination, scope intersection, affected clause areas, document types, prioritized action plan, MR narrative, JSON export

**Impact taxonomy covers:** FAA (final-rule, amendment, AC, NPRM, AD, SAFO, bilateral); EASA (final-rule, NPRM, bilateral, AC); ISO (standard-revision); IAQG (standard-revision); IATF (standard-revision); FDA (final-rule, AC); CAAC; UK CAA; Other (fallback)

**Safety override engine:** Safety-of-flight or production-approval flag, or AD change type → forces IMMEDIATE urgency regardless of base tier.

**NPRM guard:** Proposed rules force MONITOR tier + advisory notice that rule is not yet effective.

---

## Verification

| Check | Method | Result |
|-------|--------|--------|
| File byte count | `wc -c` | 32,169 bytes — PASS |
| External dependencies | `grep src=http href=http` | 0 — PASS (self-contained) |
| Urgency engine T1 (FAA final-rule) | Node inline test | SHORT-TERM — PASS |
| Urgency engine T2 (FAA NPRM) | Node inline test | MONITOR — PASS |
| Urgency engine T3 (FAA AD) | Node inline test | IMMEDIATE — PASS |
| Urgency engine T4 (safety flag override) | Node inline test | IMMEDIATE — PASS |
| Urgency engine T5 (ISO standard-revision) | Node inline test | SHORT-TERM — PASS |
| Urgency engine T6 (OTHER fallback) | Node inline test | SHORT-TERM — PASS |
| **Engine total** | | **6/6 PASS** |

---

## Scoring Summary

| Layer | Score |
|-------|-------|
| Base (Automation HIGH + Edge DEEP + Buildability NOW) | 9 |
| FSA modifiers (+2 eliminates work, +2 deterministic rules, +1 knowledge-graph node) | +5 |
| Strategic (+5 data→decision, +4 evidence-backed, +4 reusable IP, +3 moat, +3 regulated QMS, +3 exec decision support, +4 recurring bundle) | +26 |
| **Total** | **~40** |

---

## FSA Gate Check (Future Systems Architect)

✅ Eliminates human work (manual impact mapping replaced by deterministic taxonomy)  
✅ Rules-based deterministic engine (no LLM in tool)  
✅ Decision product (outputs urgency tier + action plan, not just information)  
✅ Reusable IP (taxonomy reusable across MRO Intel Digest integration, MRA action register)  
✅ No external dependencies; fully offline  
✅ Executive decision support (MR narrative, JSON export)  
⬜ Could be enhanced with context-aware learning (future M-AI integration)

---

## M-AI Integration Summary

Domain pack: `regulatory-change-impact`  
Governed decisions: `impact_scope` (ADVISE), `action_urgency` (ADVISE), `safety_override` (HOLD → IMMEDIATE), `action_plan` (PREPARE)  
Local implementation: JavaScript taxonomy engine mirrors Kernel-shaped domain pack  
Kernel dependency: RESERVED INTERFACE  
Cross-app potential: MRO Intel Digest → this tool intake; `action_item` → MRA action register

---

## To Go Live — YOU DO THESE

1. **Confirm taxonomy completeness** (NEEDS-FROM-BRIAN.md #1) — add any authority/change-type combinations not yet covered
2. **Confirm urgency tier criteria** (#2) — validate IMMEDIATE/SHORT-TERM/MONITOR thresholds
3. **Confirm scope mapping** (#3) — validate clause-family → document-type accuracy per standard
4. **Confirm pricing** (#4)
5. Upload to Conform-Edge site or license page
6. Write product page copy (reference PRODUCT-BRIEF.md)
7. Set up payment link
