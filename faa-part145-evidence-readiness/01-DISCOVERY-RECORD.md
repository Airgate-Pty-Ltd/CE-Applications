# Discovery Record — FAA Part 145 Evidence-Readiness Audit Tool
**Product:** FAA Part 145 Evidence-Readiness Audit Tool  
**Route:** Software / Conform-Edge  
**Build folder:** Builds/2026-08-16-faa-part145-evidence-readiness  
**Discovery date:** 2026-08-16  
**Authored by:** Scanner auto-authoring mode (as Brian Oleo)  
**Governor stage:** 1 — Discovery  

---

## Build Classification

| Field | Value |
|-------|-------|
| Class | Self-contained HTML evidence-completeness audit tool |
| Distribution | Single-file download / hosted link |
| Criticality | HIGH — guides FAA inspection readiness; incorrect gaps can result in enforcement action |
| Route | Software / Conform-Edge |
| Qualifying software | YES — assessment/scoring engine; operational compliance tool |

---

## Gate Decision

```
DISCOVERY GATE: BUILD AUTHORIZED (inferred, as Brian)
Production-authorized: NO — pending Stages 9–10
```

Rationale: FAA Part 145 repair stations face routine surveillance from FSDO inspectors and EASA Form 8 oversight auditors. Evidence completeness (having the right records, documents, and demonstrable processes) is the primary pass/fail criterion. No self-contained HTML evidence-readiness tool covering all 10 Part 145 evidence domains exists in this portfolio or in the market. High urgency: repair stations are perpetually inspected. This is the logical companion to the AS9110C MRO Self-Assessment Tool already in the portfolio.

---

## Discovery Answers

### Section A — Problem

| Question | Answer | Confidence | Status |
|----------|--------|------------|--------|
| What problem? | Part 145 repair stations regularly face FSDO surveillance, EASA Form 8 oversight, or preparation for new/renewal certificates. The key failure mode is evidence gaps — not having the required records, documents, or demonstrable programs in place. Quality managers need to know which evidence is missing before the inspector arrives. | HIGH | INFERRED — BRIAN CONFIRMATION REQUIRED |
| Who has it? | Any FAA Part 145 Certificated Repair Station: domestic (~5,000 CRS), foreign-certificated stations, stations with EASA/UK CAA bilateral | HIGH | INFERRED |
| Trigger now? | Scheduled FSDO surveillance; renewal coming up; EASA Form 8 oversight (BASA); recent findings from another station (industry word-of-mouth); new scope of work | HIGH | INFERRED — BRIAN CONFIRMATION REQUIRED |

### Section B — Buyer & User

| Question | Answer | Confidence | Status |
|----------|--------|------------|--------|
| Buyer | Director of Maintenance / Quality Manager / Accountable Manager at a Part 145 CRS | HIGH | CONFIRMED (bank) |
| User | Quality manager / QA lead running pre-inspection readiness sweep | HIGH | INFERRED |
| Spend today | Consultant time at $150–$300/hr for pre-inspection readiness review [ASSUMPTION] | MEDIUM | INFERRED — BRIAN CONFIRMATION REQUIRED |

### Section C — Claim & Authority Basis

| Question | Answer | Confidence | Status |
|----------|--------|------------|--------|
| Permitted claim | Evidence-readiness / pre-inspection preparation / gap identification. "Know which evidence is complete, partial, or missing before your inspector arrives." | HIGH | CONFIRMED (bank) |
| Prohibited claim | "Compliant / FAA-approved / ready for certificate" — the FSDO inspector makes that determination | HIGH | CONFIRMED (bank) |
| Authority basis | 14 CFR Part 145 — by section number and intent; AC 145-9G (training program) by intent; AC 145-10 (drug/alcohol) by intent; no regulatory text reproduced | HIGH | INFERRED — BRIAN CONFIRMATION REQUIRED |

### Section D — Competitive

| Question | Answer | Confidence | Status |
|----------|--------|------------|--------|
| Competing tool | No equivalent self-contained HTML Part 145 evidence-completeness tool identified | MEDIUM | INFERRED — BRIAN CONFIRMATION REQUIRED |
| Moat | Brian's Part 145 audit expertise (lead auditor, FAA/EASA bilateral experience, mag-chg10-auditor skill); portfolio adjacency (AS9110C MRO Self-Assessment, EASA Form 8 Auditor skill) | HIGH | CONFIRMED |

### Section E — Revenue

| Question | Answer | Confidence | Status |
|----------|--------|------------|--------|
| Pricing | $199–$299 single; ~$799 site license [ASSUMPTION] | MEDIUM | INFERRED — BRIAN CONFIRMATION REQUIRED |
| Path to $250k/yr | 800–1,250 stations × $199–$299; bundle with AS9110C Self-Assessment + EASA Form 8 prep tools | MEDIUM | INFERRED |
| Startup cost | <$1,000 — HTML tool; hosting/landing page is Brian's action | HIGH | CONFIRMED |

### Section F — Risks

| Question | Answer | Confidence | Status |
|----------|--------|------------|--------|
| Regulatory currency | Part 145 regulations are stable (14 CFR), but EASA bilateral requirements (MAG CHG 10 SMS/SMSVP) add new evidence categories; tool should note MAG CHG 10 as a separate supplemental check | HIGH | LAUNCH BLOCKER |
| Tool scope | Tool covers certificate-wide evidence; does not cover ratings-specific evidence (turbine engine vs. airframe vs. avionics); note limitations clearly | HIGH | LAUNCH BLOCKER |
| Liability | Evidence guidance only; FSDO inspector's finding is authoritative | HIGH | CONFIRMED (bank) |

---

## Product Claim Boundary

Tool provides: **evidence-completeness status per section, prioritized remediation list, pre-inspection gap summary**. Does NOT: certify readiness, predict FSDO outcome, substitute for regulatory counsel, cover all ratings-specific nuances.

---

## Authority & Compliance Basis

- 14 CFR Part 145 subparts A–E: by section number and intent only
  - §145.51 (OpSpecs), §145.101–109 (Operations), §145.151–163 (Personnel/Training)
  - §145.201–221 (Housing, Equipment, Materials, Records, Inspection)
  - §145.53 / Part 120 (Drug/Alcohol program)
- AC 145-9G (training program): by intent only
- AC 145-10 (HF training): by intent only  
- MAG CHG 10 §20 (SMS/SMSVP for EASA bilateral stations): noted as supplemental check

No regulatory text reproduced.

---

## Decision / Scoring Logic Basis

- 10 evidence domains; each domain has 3–6 evidence items
- Per-item: COMPLETE / PARTIAL / MISSING / N-A
- Per-domain verdict: READY (all complete or N/A), CONDITIONAL (1+ partial, no missing critical), NOT READY (any critical item missing)
- Critical items (marked with ★): OpSpecs currency, Inspector qualifications, QC Manual, Training records, Records retention
- Overall: READY / CONDITIONAL / NOT READY based on domain count
- Priority remediation: NOT READY domains → CONDITIONAL → READY with improvements
- EASA bilateral stations get supplemental SMS/SMSVP check note

---

## MVP Boundary

**In scope:** 10 evidence domains, ~40 evidence items; per-domain verdict; overall status; prioritized remediation list; VERA design; EASA bilateral advisory note.  
**Out of scope:** Rating-specific evidence requirements; FSDO district-specific preferences; M-AI trend tracking (RESERVED INTERFACE); integration with existing record systems.

---

## Consistency Check vs. Answer Bank

All checks PASS. Claim: readiness/self-assessment. Brand: Conform-Edge software. Architecture: deterministic, no network. Visual: VERA. Commercial: one-time license.

---

## Open Launch Blockers

| # | Blocker | Owner |
|---|---------|-------|
| LB-1 | Confirm Part 145 section coverage is complete for a typical domestic CRS | Brian |
| LB-2 | Confirm EASA bilateral advisory framing (MAG CHG 10 §20 SMS note) | Brian |
| LB-3 | Rating-scope disclaimer language | Brian confirms; Claude adds |
| LB-4 | Pricing decision ($199 / $249 / $299; site license) | Brian |
