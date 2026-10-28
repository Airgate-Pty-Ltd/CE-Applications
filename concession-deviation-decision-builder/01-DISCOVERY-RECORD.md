# Discovery Record — Concession & Deviation Decision Builder
**Product:** Concession & Deviation Decision Builder  
**Route:** Software / Conform-Edge  
**Build folder:** Builds/2026-08-15-concession-deviation-decision-builder  
**Discovery date:** 2026-08-16 (retroactive governance pass)  
**Authored by:** Scanner auto-authoring mode (as Brian Oleo)  
**Governor stage:** 1 — Discovery  

---

## Build Classification

| Field | Value |
|-------|-------|
| Class | Self-contained HTML decision + record-generation tool |
| Distribution | Single-file download / hosted link (no install) |
| Criticality | HIGH — guides nonconformance disposition; incorrect decisions carry quality risk |
| Route | Software / Conform-Edge |
| Qualifying software | YES — assessment/scoring engine; document generation workflow tool |

---

## Gate Decision

```
DISCOVERY GATE: BUILD AUTHORIZED (inferred, as Brian)
Production-authorized: NO — pending Stage 9 (Brian validation) and Stage 10 (Release Authorization)
```

Rationale: All sections A–F pass. Strong universal market (AS9100/ISO 9001/IATF/ISO 13485 all include 8.7/7.3 concession requirements). High buyer urgency — concessions are a recurring operational need at any manufacturing QMS org. Strong adjacency to 8D Workflow Tool in portfolio. No hard blockers.

---

## Discovery Answers

### Section A — Problem / Opportunity

| Question | Answer | Source | Confidence | Status |
|----------|--------|--------|------------|--------|
| What problem does this solve? | Quality organizations routinely generate nonconforming product and must navigate the Deviation (before production) vs. Concession (after production) decision, determine severity, identify required approvals, and generate a compliant request record. Most do this inconsistently, relying on memory or informal processes. This tool enforces the correct decision logic and generates a formatted request record. | about-me; AS9100 8.7 audit experience | HIGH | INFERRED — BRIAN CONFIRMATION REQUIRED |
| Who has this problem? | Quality engineers, quality managers at any AS9100/ISO 9001/IATF 16949/ISO 13485 manufacturing organization | about-me | HIGH | INFERRED |
| What triggers buying now? | Audit finding on 8.7 concession/deviation process; incoming surveillance audit; OEM or customer escalation on nonconforming product disposition | INFERRED | MEDIUM | INFERRED |

### Section B — Buyer & User

| Question | Answer | Source | Confidence | Status |
|----------|--------|--------|------------|--------|
| Who buys? | Quality Director / VP Quality / QA Manager | ANSWER_BANK | HIGH | CONFIRMED (bank) |
| Who uses it? | Quality engineer / production quality lead who owns nonconforming product disposition | ANSWER_BANK + INFERRED | HIGH | INFERRED |
| Market breadth | Broadest in portfolio — applies to any standard with 8.7/7.3 concession requirements (AS9100, ISO 9001, IATF 16949, ISO 13485, ISO 14001 with NCR) | about-me | HIGH | CONFIRMED (build scope) |

### Section C — Claim & Authority Basis

| Question | Answer | Source | Confidence | Status |
|----------|--------|--------|------------|--------|
| Permitted claim | Decision guidance / disposition support / record generation. "Determine the correct disposition path and generate a formatted concession or deviation request." | ANSWER_BANK | HIGH | CONFIRMED (bank) |
| Prohibited claim | "Approved / regulatory-cleared / compliant disposition" — the approving authority makes that determination, not the tool | ANSWER_BANK | HIGH | CONFIRMED (bank) |
| Authority basis | AS9100D §8.7 / ISO 9001 §8.7 / IATF 16949 §8.7 / ISO 13485 §8.3; aviation and medical overlays referenced by intent only; KC definition referenced by intent | about-me | HIGH | INFERRED — Brian to confirm authority-basis framing |

### Section D — Competitive & Market

| Question | Answer | Source | Confidence | Status |
|----------|--------|--------|------------|--------|
| Competing tool | No equivalent self-contained HTML 3-gate Concession/Deviation decision engine + record generator identified | INFERRED | MEDIUM | INFERRED — BRIAN CONFIRMATION REQUIRED |
| Competitive moat | Multi-standard coverage (AS/ISO/IATF/13485); aviation + medical overlays; generates formatted request record (not just guidance); 3-gate logic matches how MRB actually operates; Brian's 300+ audit experience | about-me | HIGH | INFERRED |
| Bundle potential | Strong — pairs with 8D Workflow Tool (root cause → concession → CAR), COPQ Quantifier (failure cost), AS9100D Self-Assessment | INFERRED | HIGH | INFERRED |

### Section E — Revenue & Commercial Model

| Question | Answer | Source | Confidence | Status |
|----------|--------|--------|------------|--------|
| Pricing | $149–$249 single license; ~$799 site license [ASSUMPTION] | ANSWER_BANK; BUILD-NOTES | MEDIUM | INFERRED — BRIAN CONFIRMATION REQUIRED |
| Path to $250k/yr | 1,000–2,000 units × $149; bundle with 8D + AS9100D tools | INFERRED | MEDIUM | INFERRED |
| Startup cost | <$1,000 — tool built; cost = hosting/landing page | BUILD-NOTES | HIGH | CONFIRMED |
| Delivery | Static file download; Conform-Edge license page | ANSWER_BANK | HIGH | CONFIRMED (bank) |

### Section F — Risks

| Question | Answer | Source | Confidence | Status |
|----------|--------|--------|------------|--------|
| Key risk | Tool generates a formatted request record; users may submit it without required approval signatures. Clear instructions and mandatory disclaimer needed. | INFERRED | HIGH | LAUNCH BLOCKER |
| Standards currency risk | 8.7 requirements stable across ISO 9001:2015 and AS9100D Rev D; IATF 16949 / ISO 13485 aligned. Low currency risk. | about-me | HIGH | INFERRED |
| Liability | Tool provides decision guidance; approval authority remains with the human MRB/DA. Standard disclaimer required. | ANSWER_BANK | HIGH | INFERRED |

---

## Product Claim Boundary

The tool determines: **disposition path (Deviation vs. Concession), severity (LOW/MEDIUM/HIGH), required approval roles, and generates a formatted request record**. It does NOT approve the concession, confirm regulatory clearance, or substitute for customer/regulatory authority review.

---

## Authority & Compliance Basis

- AS9100D §8.7: intent-based (authorized release of nonconforming output, use-as-is vs. repair vs. scrap, customer concession where applicable)
- ISO 9001:2015 §8.7: intent-based
- IATF 16949 §8.7: intent-based; customer notification requirements referenced by intent
- ISO 13485:2016 §8.3: intent-based; regulatory affairs notification referenced by intent
- Aviation KC/safety overlay: referenced by intent (Major nonconformity = customer prohibition + KC + safety = STOP)
- Medical device regulatory notification: referenced by intent (FDA/MDR reporting trigger)

No standard text reproduced; all references are clause number + intent.

---

## Decision / Scoring Logic Basis

- **Gate 1 (Hard Stops):** Customer prohibition → STOP immediately; KC + aviation + after-production (concession) → STOP, requires MRB + regulatory notification; Unknown safety + FFF not confirmed → STOP
- **Gate 2 (Departure Type):** Before production → Deviation/Production Permit; After production → Concession/Waiver
- **Gate 3 (Severity):** LOW (FFF confirmed, no KC, no aviation safety); MEDIUM (partial uncertainty); HIGH (KC, safety, multi-unit, customer escalation likely); Required approval matrix per severity
- **Record Generation:** Structured request record with all Gate 1–3 outputs, signature lines, tracking fields

---

## MVP Boundary

**In scope (built):** 3-gate engine; dual-mode (Deviation/Concession); severity classification; approval matrix; formatted record generation; print/PDF; clipboard copy; AS9100/ISO 9001/IATF/13485 coverage; aviation + medical overlays.  
**Out of scope:** Concession history tracking / repeat-concession escalation (M-AI RESERVED INTERFACE); integration with NCR system; cloud storage; MRB workflow routing.

---

## Consistency Check vs. Answer Bank

All checks PASS. No contradictions.

---

## Open Launch Blockers

| # | Blocker | Type | Owner |
|---|---------|------|-------|
| LB-1 | Confirm authority-basis framing for KC/aviation/medical overlays | LAUNCH BLOCKER | Brian |
| LB-2 | Pricing decision: $149 vs. $249; site license amount | LAUNCH BLOCKER | Brian |
| LB-3 | Disclaimer language: record generated ≠ approved disposition | LAUNCH BLOCKER | Brian confirms; Claude adds |
| LB-4 | IATF customer notification and ISO 13485 regulatory notification trigger language — confirm Brian's intent framing is correct | LAUNCH BLOCKER | Brian |
