# Discovery Record — AS9102B First Article Inspection Self-Scoring Toolkit

**Build folder:** `Builds/2026-08-29-as9102b-fai-self-scoring-toolkit/`
**Date:** 2026-08-29
**Route:** Software (Conform-Edge)

---

## Build Classification

| Field | Value |
|-------|-------|
| Class | Software — HTML self-assessment / scoring tool |
| Distribution | Static single-file HTML; no server; no external dependencies |
| Criticality | FAI completeness readiness only; the accountable engineer owns the final FAI determination |
| Route | Software (Conform-Edge) |
| Production-authorized | NO — launch blockers in NEEDS-FROM-BRIAN |

---

## Gate Decision

**BUILD AUTHORIZED** — inferred as Brian. Strong buyer urgency (every AS9100D-registered manufacturer must conduct FAI per AS9102B; CB auditors check FAI documentation completeness at every surveillance audit). No equivalent low-cost self-scoring tool exists. Consistent with Answer Bank and with the existing as9102-fai-advisor skill.

---

## Discovery Answers

### A. Problem & Buyer

**Q: What problem does this solve?**
Answer: AS9100D §8.1.3 and AS9102B require First Article Inspection documentation for all new part numbers and specified change triggers. Manufacturers routinely submit incomplete FAIRs — missing material certifications, undocumented design change applicability, absent performance test results, unsigned FAI Reports. CB auditors frequently write FAI-documentation NCs. There is no self-scoring tool a quality team can run before submitting a FAIR to catch these gaps.
Source: as9102-fai-advisor skill; AS9100D §8.1.3 intent; CB audit NC pattern knowledge
Status: INFERRED — consistent with Brian's CB audit experience
Confidence: High

**Q: Who is the primary buyer?**
Answer: Quality Director or Quality Engineer at an AS9100D-registered aerospace manufacturer (Tier 1 or 2 supplier), responsible for FAI programs.
Source: Answer Bank (Economic buyer default); AS9102B scope
Status: INFERRED
Confidence: High

**Q: Who is the primary user?**
Answer: Quality Engineer or Manufacturing Engineer completing the FAIR documentation package before submission to the customer or DER.
Source: Answer Bank
Status: INFERRED

---

### B. Product Claim Boundary

**Permitted claim:** AS9102B FAI documentation completeness self-assessment — scores the FAIR package against the required documentation elements and identifies gaps before customer/CB review.
**Prohibited claim:** "AS9102B compliant / FAI approved / airworthy." The accountable engineer and customer DER own the FAI acceptance determination.
Source: Answer Bank
Status: CONFIRMED-by-design

---

### C. Authority & Compliance Basis

| Authority | Basis |
|-----------|-------|
| AS9102B | First Article Inspection Requirements, Rev B (IAQG) — all documentation sections referenced by section number and intent |
| AS9100D §8.1.3 | Production process verification requirement |
| Customer flow-down | Buyer-specific FAI requirements (addressed via generic "customer-specific" flag in tool) |

Referenced by section number and intent; no AS9102B text reproduced.
Status: INFERRED — Brian to confirm AS9102B currency (no Rev C anticipated, but check) [LAUNCH BLOCKER]

---

### D. Decision Logic

**FAI completeness scoring:**
- ~14 documentation elements across the key FAI sections (design docs, material certs, dimensional results, functional test, FAI Report sign-off, appearance, special processes, subsystem/component FAI delegation)
- Critical items: Dimensional Results (100% completion required), FAI Report (signed), Material/Raw Material Certifications
- Critical-zero override: any critical item unanswered/absent → FAI-DOCUMENTATION-INCOMPLETE regardless of aggregate score
- Delta/Partial FAI trigger: separate 8-question analysis (design change, drawing revision, process change, facility change, etc.) determining whether a new full FAI vs. partial FAI is required
- Verdict: FAI-DOCUMENTATION-COMPLETE / FAI-DOCUMENTATION-GAPS / FAI-DOCUMENTATION-INCOMPLETE

Source: as9102-fai-advisor skill; AS9102B section intent (Sections 4–5)
Status: INFERRED — element list and threshold calibration needs Brian review [LAUNCH BLOCKER]

---

### E. MVP Boundary

In scope: FAI documentation completeness self-scoring (14 elements), Delta/Partial FAI trigger analysis (8 questions), prioritized gap table, customer-submission readiness indicator, JSON export.
Out of scope: dimensional data entry, ballooned drawing upload, FAIR form generation, supplier sub-tier FAI tracking (future roadmap).
Status: INFERRED — consistent with as9102-fai-advisor skill scope

---

### F. Commercial Model

- One-time: $149 individual / $499 site license
- Bundle: with as9100d-self-assessment tool and 8D workflow tool (AS9100D audit prep bundle)
- Path to $250k/yr: 1,680 individual licenses or 500 site licenses
Source: Answer Bank (software pricing defaults — adjusted slightly lower for narrower scope)
Status: INFERRED — pricing confirmation required [LAUNCH BLOCKER]

---

## Consistency Check vs. Answer Bank

| Item | Consistent? |
|------|-------------|
| Claim framing (readiness/completeness only) | ✓ |
| Static HTML, no external deps | ✓ |
| Buyer persona (QE/QD at AS9100D org) | ✓ |
| Pricing range | ✓ |
| Brand: Conform-Edge | ✓ |
| Deterministic rules, no LLM | ✓ |

---

## Open Launch Blockers

1. **AS9102B Rev B currency** — confirm no Rev C published or anticipated; confirm tool elements cover the current Rev B section structure.
2. **Element list and threshold calibration** — Brian to review the 14 documentation elements and COMPLETE/GAPS/INCOMPLETE thresholds.
3. **Pricing decision** — confirm $149/$499 or revise; confirm bundle strategy.
