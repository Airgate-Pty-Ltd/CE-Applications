# Discovery Record — COPQ Intelligence System
**Stage:** 1 — Discovery Gate  
**Date:** 2026-08-18  
**Initiated by:** Automated overnight build (redesign of BLOCKED 2026-08-15-copq-quantifier)  
**Authorized by:** Brian Olea (FSA FAIL determination, 2026-08-15; redesign spec confirmed 2026-08-16)

---

## Product Definition

**Name:** COPQ Intelligence System  
**Brand:** Conform-Edge Quality Consulting  
**Type:** Software — single-file HTML web application  
**Market:** Quality managers at ISO 9001 / AS9100 / ISO 13485 / IATF 16949 organizations  
**Primary use case:** Import COPQ data from operational systems (ERP scrap, rework logs, warranty registers, NCR systems), compute the PAF breakdown automatically, generate management-review-ready insights and narrative

---

## Why the Prior COPQ Quantifier Was Blocked

The prior build (2026-08-15) was a manual 35-field data-entry PAF calculator. FSA Section 12 gate confirmed it was an anti-pattern: it created work rather than eliminating it. COPQ data already exists in operational systems.

**Brian's determination (2026-08-15):** "COPQ Quantifier is the Section 12 FSA FAIL example (manual entry calculator; required product is COPQ Intelligence System)." This governs the redesign.

---

## The Redesigned Product

| Element | Capability |
|---------|-----------|
| Data input | CSV import from NCR system, ERP scrap report, rework log, warranty register — NOT manual entry |
| Column mapping | User maps imported columns to PAF categories (cost code, amount, type) — one-time per import |
| PAF engine | Deterministic Prevention/Appraisal/Internal-failure/External-failure calculation from actual records |
| Trend analysis | Optional prior-period file for delta comparison |
| Insight engine | 3 deterministic observations from data (escape rate, prevention ratio, warranty signal) |
| MRA integration | JSON export for Management Review Autopilot |
| M-AI interface | Reserved DIM for future trend monitoring and MR alert triggering |

---

## Target Revenue

- **Pricing:** $249–$399/yr standalone; MRA bundle add-on path
- **Year 1 path:** MRA user base upgrade → $175k–$280k/yr
- **Startup cost:** $0

---

## Discovery Gate Decision

```
DISCOVERY GATE: BUILD AUTHORIZED
Product type: Software (HTML import tool)
FSA gate: Required next
M-AI gate: Required next
```

---

## Source Material

- `2026-08-15-copq-quantifier/02-FSA-DESIGN-NOTES.md` — redesign spec governs this build
- `2026-08-15-copq-quantifier/copq-quantifier.html` — reuse PAF logic, insight engine, VERA design
- `2026-07-08-management-review-autopilot` — MRA JSON import schema reference
