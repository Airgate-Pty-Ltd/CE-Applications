# DISCOVERY RECORD — CMMC 2.0 Level 1/2 Readiness Self-Assessment
**Build slug:** 2026-09-21-cmmc-level1-2-readiness-tool
**Date written:** 2026-09-21 (auto-authoring mode, overnight opportunity scan)
**Gate Decision:** BUILD AUTHORIZED (inferred, auto-authoring mode)
**Production-Authorized:** NO — launch blockers outstanding; M-AI Profile required

---

## Build Classification
- **Class:** Software — self-contained single-file HTML assessment tool
- **Distribution:** Static file, licensed via Conform-Edge product page
- **Criticality:** Moderate-High — advisory self-assessment; SPRS score filing and DoD certification decisions rest with the organization and qualified assessors
- **Route:** Software / Conform-Edge

---

## Discovery Snapshot

The Cybersecurity Maturity Model Certification (CMMC) 2.0 is a DoD requirement (32 CFR Part 170, DFARS 252.204-7019/7021) mandating that all DoD contractors and subcontractors handling Federal Contract Information (FCI) or Controlled Unclassified Information (CUI) demonstrate compliance with NIST SP 800-171 Rev 2. CMMC 2.0 became a contract requirement under DFARS clause 252.204-7021 beginning in 2025, and will flow down to subtier suppliers through prime contracts.

**Level 1 (17 practices)** applies to all contractors handling FCI — annual self-assessment required, score submitted to SPRS (Supplier Performance Risk System).
**Level 2 (110 practices)** applies to contractors handling CUI — annual self-assessment OR triennial C3PAO assessment depending on program criticality.

**Problem sharpness:** There are 300,000+ DoD contractors and subtier suppliers. Every one handling FCI must comply with Level 1. Level 1 self-assessment requirement (DFARS 252.204-7019) is immediate and self-attestable. The SPRS score system creates urgency — a missing or low SPRS score is visible to prime contractors and DOD and can disqualify a supplier. No low-cost structured Level 1 self-assessment tool is commercially available.

**Addressable market:** ~300,000 DoD contractors and subtier suppliers. Even 0.5% adoption at $149 = $224,000/yr revenue. CMMC is the single largest cybersecurity compliance mandate ever imposed on the defense supply chain.

---

## Gate 0–5 (Inferred as Brian, Auto-Authoring Mode)

### A. Buyer
- **Primary user:** IT Manager, Quality Manager, Compliance Officer, or owner-operator at a DoD contractor or subtier supplier
- **Economic buyer:** VP Operations, CFO, or owner-operator — CMMC compliance is a contract requirement, not optional
- **Urgency:** VERY HIGH — CMMC 2.0 is active in DoD contracts; SPRS score absence or low score creates supply chain risk; primes are beginning to screen suppliers
- **Organization profile:** 10–500 employee defense contractor or subtier supplier; CAGE code holder; may have limited IT/cybersecurity staff
- **Status:** INFERRED — Brian confirmation required

### B. Product Claim Boundary
- Permitted: Level 1 readiness self-assessment / gap identification / SPRS preparation (awareness only) / internal compliance program review
- Prohibited: "CMMC certified / CMMC compliant / SPRS score calculator" — this tool does not produce an official SPRS score; SPRS filing is the organization's responsibility; Level 2 C3PAO assessment is separate
- Disclosure language in UI: Tool footer notes that Level 2 and 3 require C3PAO; SPRS filing is the organization's responsibility
- Standards cited: NIST SP 800-171 Rev 2 §3.x.x by section reference and intent; FAR 52.204-21 by paragraph; DFARS by clause number — no standard text reproduced verbatim

### C. Authority & Compliance Basis
- CMMC 2.0 Final Rule: 32 CFR Part 170 (effective December 16, 2024)
- DFARS 252.204-7019 (NIST SP 800-171 DoD Assessment Requirements — Level 1 annual self-assessment)
- DFARS 252.204-7020 (NIST SP 800-171 DoD Assessment Requirements — submission to SPRS)
- DFARS 252.204-7021 (CMMC Requirements — contractor must achieve CMMC Level)
- FAR 52.204-21 (Basic Safeguarding of Covered Contractor Information Systems)
- NIST SP 800-171 Rev 2: 14 requirement families, 110 practices (Level 1 covers 17 practices across 6 families)
- NIST SP 800-172 (enhanced requirements for Critical Programs — not in scope for this tool)

### D. MVP Boundary
- **Level 1 assessment:** All 17 practices across 6 domains (AC, IA, MP, PE, SC, SI) — fully implemented
- **Level 2 preview:** Information panel explaining Level 2 scope, C3PAO requirement, SPRS calculation — awareness only; Level 2 full assessment is a future build
- 3 critical items (AC.L1-3.1.1, IA.L1-3.5.2, SI.L1-3.14.2)
- 3-tier verdict: CMMC LEVEL 1 READY (100%) / NEAR READY—CLOSE GAPS (82–99%, no critical fail) / CMMC LEVEL 1 NOT READY (<82% or critical fail)
- Domain-level scoring summary
- JSON export with CMMC level, org, assessor, info type metadata, M-AI metadata
- Single self-contained HTML file; no network calls; no LLM

### E. Commercial Model
- **Price:** $149 individual; $399 site license (INFERRED — within ANSWER_BANK default range; CMMC Level 1 is foundational/lower barrier to entry)
- **Revenue path:** $250k/yr on volume; CMMC market is exceptionally large (300,000+ addressable organizations)
- **Bundle candidate:** "Defense Compliance Suite" — ITAR/EAR Export Control + CMMC 2.0 Readiness, two-tool bundle at $299–$349
- **Future build:** CMMC Level 2 full 110-practice assessment — significant extension; separate SKU at $299–$399

### F. Consistency Check vs. Answer Bank
- Buyer: consistent (quality/compliance/IT manager at defense contractor SME) ✓
- Claim: consistent (readiness / self-assessment / gap identification) ✓
- Architecture: deterministic, no LLM, self-contained HTML — consistent ✓
- Commercial model: within ANSWER_BANK default ($149 individual, $399 site) ✓

---

## Open Launch Blockers

| # | Item | Why it blocks | Source |
|---|------|---------------|--------|
| 1 | **Pricing confirmation** — $149/$399 proposed within ANSWER_BANK range; Brian to confirm or adjust | Launch dependency | INFERRED |
| 2 | **Defense Compliance Suite bundle** — confirm pairing with ITAR/EAR tool at $299–$349 | Affects product page structure | INFERRED |
| 3 | **Verdict threshold calibration** — "NEAR READY" threshold set at 82% (14/17 practices). Confirm this is the right split — NIST SP 800-171 does not define a passing threshold; threshold is Brian's product design decision | Product design | INFERRED |
| 4 | **Behavioral verification** — Brian to open `cmmc-readiness-tool.html`, run test: (a) answer AC.L1-3.1.1 = No (critical) → confirm NOT READY fires; (b) all = Yes → confirm LEVEL 1 READY; (c) test JSON export and narrative | Automated inspection PASS ≠ live browser test | Required |
| 5 | **Level 2 preview panel accuracy** — confirm SPRS score description and C3PAO disclosure language is correct as of current CMMC 2.0 Final Rule (32 CFR Part 170, December 2024) | Product accuracy / regulatory currency | INFERRED |

---

## M-AI Integration Note
Qualifying software requiring M-AI-PRODUCT-INTEGRATION-PROFILE.md. Profile written alongside this record. Domain: `cmmc-level1-readiness`. Gate status: ARCHITECTURE DEFINED — Reserved Kernel Interface.
