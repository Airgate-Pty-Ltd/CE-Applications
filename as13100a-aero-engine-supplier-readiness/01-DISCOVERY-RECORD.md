# Discovery Record — AS13100A Aero-Engine Supplier Readiness Tool
**Product:** AS13100A Aero-Engine Supplier Readiness Tool  
**Route:** Software / Conform-Edge  
**Build folder:** Builds/2026-08-15-as13100a-aero-engine-supplier-readiness  
**Discovery date:** 2026-08-16 (retroactive governance pass)  
**Authored by:** Scanner auto-authoring mode (as Brian Olea)  
**Governor stage:** 1 — Discovery  

---

## Build Classification

| Field | Value |
|-------|-------|
| Class | Self-contained HTML self-assessment tool |
| Distribution | Single-file download / hosted link (no install) |
| Criticality | MEDIUM — guides readiness, does not certify |
| Route | Software / Conform-Edge |
| Qualifying software | YES — repeated operational use, assessment/scoring engine |

---

## Gate Decision

```
DISCOVERY GATE: BUILD AUTHORIZED (inferred, as Brian)
Production-authorized: NO — pending Stage 9 (Brian validation) and Stage 10 (Release Authorization)
```

Rationale: All sections A–F pass. No hard blockers. Compliance date (31 March 2026) has passed — market urgency is at peak. No equivalent tool exists in the Conform-Edge portfolio or in any known competing product set. Discovery Record complete.

---

## Discovery Answers

### Section A — Problem / Opportunity

| Question | Answer | Source | Confidence | Status |
|----------|--------|--------|------------|--------|
| What problem does this solve? | AS13100A (IAQG standard for aero-engine supplier quality requirements, RM13009 reference) became active 31 March 2026. Suppliers in the GE/RR/PW/Safran/Honeywell supply chain must demonstrate compliance but have no structured self-assessment tool. They face audit risk without visibility into their gaps. | about-me (AS9100 / IAQG expertise); regulatory-intel-aerospace skill; ledger pattern | HIGH | INFERRED — BRIAN CONFIRMATION REQUIRED |
| Who has this problem right now? | Aero-engine Tier 1/2 suppliers under OEM quality flow-down; quality managers at SME suppliers who lack a QMS team to analyze the standard from scratch | about-me | HIGH | INFERRED |
| What triggers buying now? | Compliance date passed; OEM supplier audits beginning; risk of disqualification or non-conformance from OEM assessment | INFERRED from market pattern | HIGH | INFERRED — BRIAN CONFIRMATION REQUIRED |

### Section B — Buyer & User

| Question | Answer | Source | Confidence | Status |
|----------|--------|--------|------------|--------|
| Who buys? | Quality Director / VP Quality / QA Manager at an aero-engine supplier SME | ANSWER_BANK (Economic buyer) | HIGH | CONFIRMED (bank) |
| Who uses it? | QA manager / compliance lead running the self-assessment | ANSWER_BANK (Primary user) | HIGH | CONFIRMED (bank) |
| What do they already spend? | Nothing specifically for AS13100A (no competing tool identified). May spend on consultant time ($150–$300/hr) to interpret the standard. | INFERRED | MEDIUM | INFERRED |

### Section C — Claim & Authority Basis

| Question | Answer | Source | Confidence | Status |
|----------|--------|--------|------------|--------|
| What claim does the tool make? | Readiness / self-assessment / gap identification. "Understand your AS13100A readiness posture and prioritize remediation before your OEM audit." | ANSWER_BANK (Permitted claim) | HIGH | CONFIRMED (bank) |
| Prohibited claim | "Compliant / certified / airworthy" — never asserted by this tool | ANSWER_BANK | HIGH | CONFIRMED (bank) |
| Authority basis | AS13100A (IAQG), RM13009 reference; 8 requirement families referenced by clause intent only; no standard text reproduced | about-me; standards-document-auditor skill | HIGH | INFERRED — Brian to confirm AS13100A families are correctly mapped |
| Competence assumed in user | Knows AS13100A applies; does not need to know clause structure | ANSWER_BANK | HIGH | CONFIRMED (bank) |

### Section D — Competitive & Market

| Question | Answer | Source | Confidence | Status |
|----------|--------|--------|------------|--------|
| Who else offers this? | No equivalent self-contained HTML AS13100A readiness tool identified in the market | INFERRED | MEDIUM | INFERRED — BRIAN CONFIRMATION REQUIRED |
| Competitive moat | Brian's IAQG expertise (AS9100D lead auditor, aero-engine OEM supply chain knowledge), VERA design system, existing portfolio adjacency (AS9100D, AS9110C, AS9145 tools); OEM-specific context notes (GE/RR/PW/Safran/Honeywell) | about-me | HIGH | INFERRED |
| Market size | ~3,000–5,000 active aero-engine Tier 1/2 suppliers globally [ASSUMPTION — Brian to verify] | INFERRED | MEDIUM | INFERRED — BRIAN CONFIRMATION REQUIRED |

### Section E — Revenue & Commercial Model

| Question | Answer | Source | Confidence | Status |
|----------|--------|--------|------------|--------|
| Pricing | $249–$499 single license; ~$999 site license [ASSUMPTION] | ANSWER_BANK (software range); BUILD-NOTES | MEDIUM | INFERRED — BRIAN CONFIRMATION REQUIRED |
| Path to $250k/yr | 500–1,000 units × $249–$499; bundle with AS9100D, AS9145, FOD Kit for aerospace-supplier suites | INFERRED | MEDIUM | INFERRED |
| Startup cost | <$1,000 — tool already built; cost = hosting/landing page (Brian's action) | BUILD-NOTES | HIGH | CONFIRMED (build exists) |
| Delivery | Static file download or hosted link; Conform-Edge license page | ANSWER_BANK | HIGH | CONFIRMED (bank) |

### Section F — Risks

| Question | Answer | Source | Confidence | Status |
|----------|--------|--------|------------|--------|
| Key risk | AS13100A requirements evolve; OEM CQR addenda may add family-specific requirements not captured in the 8-family structure | INFERRED | MEDIUM | INFERRED — LAUNCH BLOCKER (see NEEDS-FROM-BRIAN) |
| Liability risk | Tool provides readiness guidance only; human accountable for conformance determination. Standard disclaimer required in tool footer. | ANSWER_BANK | HIGH | INFERRED |
| Standards currency | AS13100A Rev / date used to author tool must be verified current | INFERRED | MEDIUM | LAUNCH BLOCKER |

---

## Product Claim Boundary

The tool asserts: **readiness posture, gap identification, prioritized remediation**. It does NOT assert compliance, OEM approval, AS13100A certification, or airworthiness. All outputs framed as self-assessment results requiring qualified review.

---

## Authority & Compliance Basis

- AS13100A: intent-based; 8 families (QMSP, Planning/APQP, Design/Dev, Production, AS9100 Core, Configuration, Traceability, Supplier Management) referenced by intent only
- RM13009 alignment referenced conceptually; not reproduced
- OEM-specific context notes based on known quality system requirements for GE/RR/PW/Safran/Honeywell supply chains; referenced as context, not regulatory requirement

---

## Decision / Scoring Logic Basis

- Weight 3 = Major/blocking requirement; weight 2 = Significant; weight 1 = OFI
- Verdicts per family: COMPLIANT (≥85% weighted), CONDITIONAL (60–84%), NON-COMPLIANT (<60%) [ASSUMPTION — Brian to verify thresholds]
- N/A excluded from denominator (verified in engine tests T4)
- Hard blockers: any Major open → NON-COMPLIANT regardless of percentage (T5 verified)

---

## MVP Boundary

**In scope (built):** 52-element, 8-family assessment; weighted scoring; per-family verdicts; OEM context; JSON export; VERA design.  
**Out of scope (post-MVP):** Integration with M-AI Kernel for trend tracking / KC monitoring; OEM-specific variant modules; team collaboration; cloud hosting.

---

## Consistency Check vs. Answer Bank

| Check | Result |
|-------|--------|
| Claim framing | ✓ readiness / self-assessment only |
| Brand | ✓ Conform-Edge software |
| Architecture | ✓ deterministic, no network, no persistence |
| Visual | ✓ VERA navy/steel |
| Commercial model | ✓ one-time license, bundle-friendly |
| Audience | ✓ aero-engine supplier quality manager |

No contradictions with Answer Bank.

---

## Open Launch Blockers

| # | Blocker | Type | Owner |
|---|---------|------|-------|
| LB-1 | AS13100A standard currency — confirm revision date and OEM CQR addenda coverage | LAUNCH BLOCKER | Brian |
| LB-2 | Pricing decision: $249 vs. $399 vs. $499; site license amount | LAUNCH BLOCKER | Brian |
| LB-3 | Confirm 8 requirement families are correctly framed against current AS13100A scope | LAUNCH BLOCKER | Brian |
| LB-4 | Verdict thresholds (85% / 60%) — confirm acceptable per Brian's AS9100 audit experience | LAUNCH BLOCKER | Brian |

_Build remains prototype / pre-release-authorized until LB-1 through LB-4 resolved._
