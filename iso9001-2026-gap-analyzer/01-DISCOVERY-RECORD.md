# Discovery Record — ISO 9001:2026 Transition Readiness Assessor
**Date:** 2026-08-23 (retroactive governance)
**Route:** Software / Conform-Edge
**Gate Decision:** BUILD AUTHORIZED (inferred as Brian — retroactive)
**Production-authorized:** NO — NEEDS-FROM-BRIAN blockers remain

---

## Build Classification
- **Class:** Single-file HTML self-assessment tool
- **Distribution:** Static file download; no server; no data leaves browser
- **Criticality:** Low (self-assessment only; no compliance certification asserted)

---

## Discovery Answers

**A. What is it?**
Answer: Self-contained HTML transition readiness assessor for organizations migrating from ISO 9001:2015 to ISO 9001:2026. 27 scored questions covering the delta clauses, weighted scoring engine, READY / CONDITIONAL / NOT READY verdict, gap narrative for management review.
Source: Artifact inspection (2026-08-23). Status: CONFIRMED by artifact.

**B. Who buys it / who uses it?**
Answer: Quality managers / QA engineers at ISO 9001-registered SMEs who need to assess their readiness for the 2026 revision before their certification body audit. Economic buyer = Quality Director / VP Quality / owner-operator.
Source: ANSWER_BANK portfolio defaults. Status: INFERRED — BRIAN CONFIRMATION REQUIRED.

**C. What problem does it solve?**
Answer: ISO 9001:2026 introduced structural and clause-level changes vs 2015. Most QMS practitioners lack a structured gap-check tool. This provides a scored, audit-prep-framed readiness check before the CB surveillance or recertification visit.
Source: Market context (ISO 9001:2026 FDIS published; publication September 2026). Status: INFERRED.

**D. Claim boundary?**
Answer: Readiness / gap-identification framing only. Never asserts "compliant / certified / approved." Standards referenced by clause number and intent only — no standard text reproduced.
Source: ANSWER_BANK claim framing. Status: CONFIRMED-by-design.

**E. Authority and compliance basis?**
Answer: ISO 9001:2026 clause structure and published FDIS delta analysis. Brian's CB-auditor knowledge of clause intent. No regulatory body involvement — voluntary standard.
Source: Brian's ISO 9001 lead-auditor credential; FDIS public information. Status: INFERRED.

**F. Commercial model?**
Answer: One-time download $149–$249 (individual); site license ~$999. Bundle candidate with ISO 9001:2015 → 9001:2026 transition training course (AQ). First-mover advantage while FDIS / final publication window is open.
Source: ANSWER_BANK commercial defaults. Status: INFERRED — BRIAN CONFIRMATION REQUIRED.

**Scoring / Decision Logic:**
Answer: Weighted question scoring; critical-item override (missing fundamentals = NOT READY regardless of %). Verdict thresholds inferred from artifact patterns (≥80% = READY, ≥60% = CONDITIONAL, <60% = NOT READY — thresholds to be confirmed by Brian).
Source: Artifact inspection. Status: INFERRED — BRIAN CONFIRMATION REQUIRED (thresholds).

**MVP Boundary:**
Answer: Single HTML file; browser-side only; 27 questions; scored report; JSON export. No login, no persistence.
Source: Artifact. Status: CONFIRMED by artifact.

---

## Product Claim Boundary
Self-assessment / transition readiness only. The tool cannot determine whether an organization will pass a CB audit or whether its QMS meets the revised standard. That determination belongs to the CB auditor.

## Authority & Compliance Basis
ISO 9001:2026 (clause number and intent only). No standard text reproduced.

## Decision Logic Basis
Weighted scoring engine; hard-stop critical items; N/A exclusion; unanswered = gap.

## Consistency Check vs. Answer Bank
✅ Audience, claim framing, commercial model, architecture all consistent with ANSWER_BANK defaults.

## Open Launch Blockers
1. Brian to confirm scoring thresholds (≥80%/≥60%) — LAUNCH BLOCKER
2. Brian to confirm price point and bundle strategy — LAUNCH BLOCKER
3. Verify question coverage matches final published ISO 9001:2026 (publication Sept 2026) — LAUNCH BLOCKER until standard is final
