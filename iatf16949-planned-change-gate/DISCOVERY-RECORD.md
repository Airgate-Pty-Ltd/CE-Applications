# Discovery Record — IATF 16949 Planned Change Gate Tool

**Date:** 2026-09-07
**Build ID:** 2026-09-07-iatf16949-planned-change-gate
**Brand:** Conform-Edge
**Scan run:** opportunity-scanner-overnight 2026-09-07
**Gate decision:** BUILD AUTHORIZED

---

## Product Definition

**Name:** IATF 16949 Planned Change Gate Tool
**Type:** Self-contained HTML tool (0 external dependencies)
**Target user:** Automotive supplier quality engineers, manufacturing engineers, IATF QMS coordinators
**Market:** IATF 16949-certified and -seeking Tier 1/2/3 automotive suppliers globally

**Problem solved:** Automotive planned changes require a precise sequence of actions — design review, PPAP trigger determination, CSR check, customer notification, and internal authorization — before production. Mistakes (shipping without customer notification, missed PPAP submission, unchanged PFMEA/control plan) create customer escapes, warranty claims, and IATF audit findings under Cl. 8.2.3.1. No self-guided tool exists for this decision sequence.

**Differentiation vs. AS9100D Change Gate (09-05):** IATF-specific additions:
- PPAP trigger logic (CSR-first, then SC, then change type)
- Customer-Specific Requirements (CSR) gate
- Production permit / deviation handling (IATF Cl. 8.7.1.3)
- PPAP table with level, PSW, dimensional, capability requirements
- Automotive OEM notification distinction (notify vs. approve)

---

## Commercial Case

**Pricing:** $149–$249 one-time | Bundle: IATF 16949 Core Tools Suite + Change Gate + COPQ Intelligence ($399)
**Revenue path:** $250k+/yr — 1,000+ units/yr addressable; IATF base is ~80,000 certified organizations globally
**Startup cost:** $0 (HTML tool, no infrastructure)
**Bundle fit:** Pairs with 2026-07-06 IATF Core Tools Suite; companion to AS9100D Change Gate (cross-sell)

---

## Scope

- 14 questions across 4 gates (Change Classification, PPAP Trigger, Customer Notification, Internal Authorization)
- 5 critical questions with hard-stop logic for customer notification and CSR approval blockers
- PROCEED / HOLD / ESCALATE verdict engine
- Dynamic PPAP submission requirements table (7 elements)
- Open action list with priority icons
- Management review narrative generator
- JSON export with M-AI reserved interface
- Clauses: IATF 16949 Cl. 8.1, 8.2.3.1, 8.3.6, 8.5.1.1, 8.5.6, 8.7.1.3; AIAG PPAP 4th Ed.

---

## Verification

Build verified 2026-09-07:
- File: `iatf16949-planned-change-gate.html` — 34,361 bytes
- Engine checks: 10/10 PASS
- 14 questions confirmed | 5 critical badges | 3-verdict system | PPAP table | Hard stop | exportJSON | M-AI interface
- 0 external dependencies confirmed
