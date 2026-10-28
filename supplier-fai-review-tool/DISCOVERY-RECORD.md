# DISCOVERY RECORD — Supplier FAI Submission Review Tool
**Build slug:** 2026-09-21-supplier-fai-review-tool
**Date:** 2026-09-21
**Gate Decision:** BUILD AUTHORIZED (inferred, auto-authoring mode)
**Production-Authorized:** NO — launch blockers pending Brian confirmation (see NEEDS-FROM-BRIAN.md)

---

## Build Classification
- **Class:** Software — self-contained single-file HTML tool
- **Distribution:** Static file, hosted on Conform-Edge license page / Gumroad
- **Criticality:** Moderate — advisory FAIR review tool; human authority owns acceptance determination
- **Route:** Software / Conform-Edge

---

## Discovery Snapshot
OEMs and prime contractors receiving incoming First Article Inspection Reports (FAIRs) from suppliers need a structured, checklist-driven review tool to verify AS9102B completeness before accepting or rejecting the package. The existing FAI Self-Scoring Toolkit (08-29) addresses the **supplier's side** (are we ready to submit?). This tool addresses the **OEM's side** (is what the supplier submitted complete and acceptable?). These are distinct use cases with different decision logic, audiences, and authority. No low-cost OEM-side FAIR review tool exists in the market. Natural companion to the as9102b-fai-advisor skill.

---

## Gate 0-5 Questions (Answered as Brian, auto-authoring mode)

### A. Market & Buyer
| Q | Answer | Source | Status | Confidence |
|---|--------|--------|--------|------------|
| Who buys this? | Quality Engineer or Supplier Quality Engineer at an AS9100D-registered OEM / Tier 1 prime receiving a FAIR from a sub-tier supplier. Economic buyer is the Quality Director. | ANSWER_BANK (buyer defaults) + ledger FAI pattern | INFERRED — Brian confirmation required | HIGH |
| Market size? | All AS9100D-registered manufacturers and MROs who buy parts from suppliers (effectively every aerospace manufacturer). Top 5 audit finding: poor supplier FAIR review / acceptance process. | about-me, ledger | INFERRED | HIGH |
| Urgency? | Moderate-high. CB auditors sample FAIR acceptance records; gap = NCR. Supplier quality teams review FAIRs regularly with no standard tool. | INFERRED | HIGH |

### B. Product Claim & Scope
| Q | Answer | Source | Status |
|---|--------|--------|--------|
| Claim permitted? | Readiness / completeness assessment / review checklist. NOT a pass/fail determination by the tool — reviewing engineer owns the determination. | ANSWER_BANK | CONFIRMED-by-design |
| Standards cited? | AS9102B clause numbers and intent only. No standard text reproduced. | ANSWER_BANK | CONFIRMED-by-design |
| Scope boundary? | OEM-side FAIR package review (Forms 1-5, materials, specials, KCs, traceability, production representativeness). Not a FAIR form generator or dimensional recorder. Distinct from 08-29 supplier-side tool. | INFERRED | HIGH |

### C. Authority & Compliance Basis
- AS9102B §3-§4: First Article Inspection form structure, 100% characteristic accountability, KC data requirements
- AS9102B §4.1: Part Number Accountability (Form 1)
- AS9102B §4.2: Design Documentation Accountability (Form 2)
- AS9102B §4.3: Materials/process/test requirements (Form 3)
- AS9102B §4.4: Characteristic Accountability and measurement (Form 4)
- AS9102B §4.5: FAI Disposition and Conformance Statement (Form 5)
- Intent-based evaluation only; no standard text reproduced; clause numbers used for reference.

### D. MVP Boundary
- 25 questions covering Forms 1-5, material traceability, special process qualification, KC evidence, production representativeness, supplier status
- 3 FAIR types: Full / Partial / Delta
- 7 critical items drive REJECTED verdict on any fail
- 3-tier verdict: FAIR ACCEPTABLE / CONDITIONAL / REJECTED
- JSON export + copy-to-clipboard review record narrative
- M-AI ARCHITECTURE DEFINED signal
- Single self-contained HTML file, no dependencies

### E. Commercial Model
- Price: $149–$199 one-time individual / $499 site license
- Bundle: as9102b-fai-advisor skill bundle $299; AS9102B Suite (supplier + OEM) $249
- Revenue path: ~$250k/yr on volume (ANSWER_BANK default)
- Distribution: static file, Conform-Edge license page (Brian's action to publish)

### F. Scoring/Decision Logic Basis
- Critical items: Q1 (part no. match), Q6 (ballooned drawing), Q9 (material CoCs), Q10 (special process quals), Q13 (100% characteristic accountability), Q15 (KC data), Q18 (Form 5 disposition)
- Any critical item = NO or unanswered → FAIR REJECTED (override)
- ≥90% overall → FAIR ACCEPTABLE
- 75–89% overall → FAIR CONDITIONAL
- <75% overall → FAIR REJECTED
- N/A answers excluded from score; unanswered = gap

---

## Open Launch Blockers
1. AS9102B currency: Rev B assumed current — Brian to confirm no pending revision.
2. Pricing model: $149–$199 range, $499 site — INFERRED. Brian to confirm.
3. Bundle strategy with 08-29 FAI Self-Scoring Toolkit — Brian to confirm bundle pricing.
4. Behavioral verification beyond code inspection (Brian to open HTML in browser and execute a test run).
