# Discovery Record — Authorized Release Document Decision Tool

**Date:** 2026-09-07
**Build ID:** 2026-09-07-authorized-release-decision-tool
**Brand:** Conform-Edge
**Scan run:** opportunity-scanner-overnight 2026-09-07
**Gate decision:** BUILD AUTHORIZED

---

## Product Definition

**Name:** Authorized Release Document Decision Tool
**Type:** Self-contained HTML tool (0 external dependencies)
**Target user:** FAA Part 145 repair station quality staff, certifying staff, operations managers; PAH production staff; aviation parts distributors
**Market:** Any US FAA-certificated repair station or PAH handling parts for domestic or bilateral (EASA/UK CAA) customers

**Problem solved:** Repair stations and distributors regularly receive requests for EASA Form 1 or 8130-3 and make wrong decisions — distributors attempting to originate 8130-3s (not permitted), repair stations issuing EASA Form 1 without bilateral approval, dual-release procedures not followed per MAG, and articles released with unresolved ADs. These errors are enforcement violations and can result in civil penalties, suspension, or revocation. The 8130-3 / Form 1 / CoC choice is a high-stakes daily decision with no self-guided tool on the market.

**Proposed in ledger:** 2026-06-29 ("8130-3 / EASA Form 1 Authorized Release Documentation Toolkit"). Never built until now.

---

## Commercial Case

**Pricing:** $149–$249 one-time | Bundle: Part 145 Compliance Suite (SMS + Evidence-Readiness + Part 120 + Release Decision) $499
**Revenue path:** $250k+/yr — ~5,000 FAA-certificated repair stations in the US; significant share have EASA bilateral; high-stakes daily use case
**Startup cost:** $0 (HTML tool, no infrastructure)
**Bundle fit:** Strongest anchor product in a "Part 145 Compliance Suite" — pairs with EASA Form 8 Self-Prep (08-18), FAA Part 145 Evidence-Readiness (08-16), FAA Part 120 D&A Tool (09-05), Part 145 Training Records Tool (08-18)

---

## Scope

- 9 questions across 4 gates (Article Origin, Customer/Authority, Eligibility, Certifying Staff)
- 3 critical questions with hard stops
- Decision matrix covering: FAA 8130-3, EASA Form 1, Dual Release (BASA), CoC, distributor pass-through, blocked states
- 7 verdict outcomes including 3 blocked states (unapproved data, unresolved AD, no authorized signatory)
- 8-row comparison table (all scenarios mapped)
- Bilateral BASA / MAG awareness built into logic
- Action requirements list per verdict
- Release record narrative auto-generated
- JSON export with M-AI reserved interface
- Regulatory refs: 14 CFR Parts 21 & 43, FAA Order 8130.21, EASA Part-145.A.50, AMC 145.A.50, BASA, MAG

---

## Verification

Build verified 2026-09-07:
- File: `authorized-release-decision-tool.html` — 34,311 bytes
- Engine checks: 12/12 PASS
- 9 questions | 3 critical badges | 4 verdict types | 3 blocked states | comparison table | BASA logic | regulatory refs | AD check | exportJSON/M-AI | 0 external deps
